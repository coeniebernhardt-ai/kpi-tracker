/**
 * POST /api/admin/ticket-comment
 * Add an admin comment to a ticket and, if the ticket has client_email + ticket_mailbox, send reply email to the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTicketReplyEmail } from '../../../lib/email-to-ticket';

function getSupabaseAdmin() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error('Missing SUPABASE env vars');
  return createClient(u, k);
}

async function addAdminComment(supabase: ReturnType<typeof getSupabaseAdmin>, ticketId: string, text: string, authorId: string): Promise<{ error: Error | null }> {
  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('updates')
    .eq('id', ticketId)
    .single();
  if (fetchErr || !ticket) return { error: fetchErr || new Error('Ticket not found') };
  const existingUpdates = Array.isArray((ticket as { updates?: unknown[] }).updates) ? (ticket as { updates: unknown[] }).updates : [];
  const newEntry = {
    text: text.trim(),
    timestamp: new Date().toISOString(),
    authorRole: 'admin' as const,
    authorId,
  };
  const { error: updateErr } = await supabase
    .from('tickets')
    .update({ updates: [...existingUpdates, newEntry] })
    .eq('id', ticketId);
  return { error: updateErr || null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ticketId, text, userId } = body as { ticketId?: string; text?: string; userId?: string };
    if (!ticketId || !text || !userId) {
      return NextResponse.json({ error: 'ticketId, text, and userId are required' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { error: commentError } = await addAdminComment(supabase, ticketId, text, userId);
    if (commentError) {
      return NextResponse.json({ error: commentError.message }, { status: 500 });
    }
    // Notify involved members (creator + assignees) except the commenting admin
    const { data: ticketRow } = await supabase
      .from('tickets')
      .select('user_id, assigned_to_array')
      .eq('id', ticketId)
      .single();
    if (ticketRow) {
      const creatorId = (ticketRow as { user_id?: string }).user_id;
      const assignees: string[] = Array.isArray((ticketRow as { assigned_to_array?: string[] }).assigned_to_array)
        ? (ticketRow as { assigned_to_array: string[] }).assigned_to_array
        : [];
      const involved = [...new Set([creatorId, ...assignees].filter(Boolean))];
      for (const uid of involved) {
        if (uid === userId) continue;
        await supabase.from('notifications').insert({
          user_id: uid,
          type: 'admin_comment',
          ticket_id: ticketId,
          triggering_user_role: 'admin',
          triggering_user_id: userId,
          read: false,
        });
      }
    }
    const { sent, error: sendError } = await sendTicketReplyEmail(ticketId, text, supabase);
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
