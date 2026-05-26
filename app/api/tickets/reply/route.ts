import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';
import { sendTicketReplyEmail } from '@/app/lib/email-to-ticket';

function getSupabaseAdmin() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error('Missing SUPABASE env vars');
  return createClient(u, k);
}

async function getCurrentUser(request: NextRequest): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { id: user.id };

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const u = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(u, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user: tokenUser },
  } = await client.auth.getUser();
  return tokenUser ? { id: tokenUser.id } : null;
}

function mergeDependencies(existing: string | null | undefined, nextValue: string) {
  const current = (existing ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const trimmed = nextValue.trim();
  if (!trimmed) return current.join(', ');
  if (current.some((value) => value.toLowerCase() === trimmed.toLowerCase())) {
    return current.join(', ');
  }
  return [...current, trimmed].join(', ');
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      ticketId,
      text,
      attachments,
      dependencyName,
      clickUpTicket,
    } = body as {
      ticketId?: string;
      text?: string;
      attachments?: Array<{ url: string; name: string; type: string }>;
      dependencyName?: string;
      clickUpTicket?: string;
    };

    if (!ticketId || !text?.trim()) {
      return NextResponse.json({ error: 'ticketId and text are required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, is_admin')
      .eq('id', currentUser.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: ticket, error: fetchError } = await admin
      .from('tickets')
      .select('id, user_id, assigned_to_array, created_at, updates, time_logs, total_time_minutes, dependency_name, client_email, ticket_mailbox')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return NextResponse.json({ error: fetchError?.message || 'Ticket not found' }, { status: 404 });
    }

    const assignedArray = Array.isArray((ticket as { assigned_to_array?: string[] }).assigned_to_array)
      ? (ticket as { assigned_to_array: string[] }).assigned_to_array
      : [];
    const isAllowed =
      profile.is_admin ||
      (ticket as { user_id?: string | null }).user_id === currentUser.id ||
      assignedArray.includes(currentUser.id);

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const existingUpdates = Array.isArray((ticket as { updates?: unknown[] }).updates)
      ? ((ticket as { updates: unknown[] }).updates as Array<Record<string, unknown>>)
      : [];
    const existingLogs = Array.isArray((ticket as { time_logs?: unknown[] }).time_logs)
      ? ((ticket as { time_logs: unknown[] }).time_logs as Array<Record<string, unknown>>)
      : [];

    const newUpdate: Record<string, unknown> = {
      text: text.trim(),
      timestamp: now.toISOString(),
      authorRole: profile.is_admin ? 'admin' : 'member',
      authorId: currentUser.id,
      authorName: profile.full_name,
    };
    if (attachments?.length) {
      newUpdate.attachments = attachments;
    }

    let timeMinutes = 0;
    const createdAt = new Date((ticket as { created_at: string }).created_at);
    if (existingUpdates.length > 0) {
      const lastUpdate = existingUpdates[existingUpdates.length - 1];
      const lastUpdateTime = new Date(String(lastUpdate.timestamp));
      timeMinutes = Math.round((now.getTime() - lastUpdateTime.getTime()) / (1000 * 60));
    } else {
      timeMinutes = Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60));
    }

    let updatedLogs = existingLogs;
    if (existingUpdates.length === 0 && existingLogs.length > 0 && Number(existingLogs[0].minutes ?? 0) === 0) {
      updatedLogs = [
        {
          ...existingLogs[0],
          minutes: timeMinutes,
          description: 'Time from ticket creation to first update',
        },
      ];
    } else if (timeMinutes > 0) {
      updatedLogs = [
        ...existingLogs,
        {
          minutes: timeMinutes,
          description: `Time tracked for update: "${text.trim().slice(0, 50)}${text.trim().length > 50 ? '...' : ''}"`,
          timestamp: now.toISOString(),
          logged_by: profile.full_name || 'System',
        },
      ];
    }

    const totalTime = updatedLogs.reduce((sum, log) => sum + Number(log.minutes ?? 0), 0);
    const updatePayload: Record<string, unknown> = {
      updates: [...existingUpdates, newUpdate],
      time_logs: updatedLogs,
      total_time_minutes: totalTime,
    };

    if (dependencyName?.trim()) {
      updatePayload.has_dependencies = true;
      updatePayload.dependency_name = mergeDependencies(
        (ticket as { dependency_name?: string | null }).dependency_name,
        dependencyName
      );
    }

    if (clickUpTicket?.trim()) {
      updatePayload.clickup_ticket = clickUpTicket.trim();
    }

    const { error: updateError } = await admin
      .from('tickets')
      .update(updatePayload)
      .eq('id', ticketId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    let sent = false;
    let sendError: string | undefined;
    if ((ticket as { client_email?: string | null }).client_email && (ticket as { ticket_mailbox?: string | null }).ticket_mailbox) {
      const emailResult = await sendTicketReplyEmail(ticketId, text.trim(), admin);
      sent = emailResult.sent;
      sendError = emailResult.error;
    }

    return NextResponse.json({
      success: true,
      emailSent: sent,
      emailError: sendError || undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
