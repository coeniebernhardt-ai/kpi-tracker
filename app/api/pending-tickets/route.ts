/**
 * GET /api/pending-tickets
 * Returns pending tickets (status = 'pending'), total count, and unviewed count for the current user.
 * Used by team member dashboard for Pending queue and badge.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';

function getSupabaseAdmin() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error('Missing SUPABASE env vars');
  return createClient(u, k);
}

async function getCurrentUser(request: NextRequest): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { id: user.id };
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(u, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user: tokenUser } } = await client.auth.getUser();
  return tokenUser ? { id: tokenUser.id } : null;
}

const TICKET_LIST_COLUMNS = 'id, ticket_number, display_id, user_id, client, client_email, ticket_mailbox, issue, status, created_at';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: tickets, error: ticketsError } = await admin
      .from('tickets')
      .select(TICKET_LIST_COLUMNS)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (ticketsError) {
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }

    const list = tickets ?? [];
    if (list.length === 0) {
      return NextResponse.json({ tickets: [], totalCount: 0, unviewedCount: 0 }, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=0' },
      });
    }

    const ticketIds = list.map((t: { id: string }) => t.id);
    const { data: views } = await admin
      .from('ticket_pending_views')
      .select('ticket_id')
      .eq('user_id', currentUser.id)
      .in('ticket_id', ticketIds);

    const viewedSet = new Set((views ?? []).map((v: { ticket_id: string }) => v.ticket_id));
    const unviewedCount = list.length - viewedSet.size;

    return NextResponse.json(
      { tickets: list, totalCount: list.length, unviewedCount },
      { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=0' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/pending-tickets
 * Body: { ticketIds: string[] }
 * Marks the given pending tickets as "viewed" for the current user (for badge count).
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const ticketIds = Array.isArray(body.ticketIds) ? body.ticketIds.filter((id: unknown) => typeof id === 'string') : [];
    if (ticketIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    const admin = getSupabaseAdmin();
    const rows = ticketIds.map((ticket_id: string) => ({
      user_id: currentUser.id,
      ticket_id,
    }));
    await admin.from('ticket_pending_views').upsert(rows, {
      onConflict: 'user_id,ticket_id',
      ignoreDuplicates: true,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
