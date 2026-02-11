import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

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

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Part 5: Export notification history to CSV. Admin-only; server-side; Excel-compatible. */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const expanded = request.nextUrl.searchParams.get('expanded') === '1';

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: rows } = await supabase
      .from('notifications')
      .select('id, broadcast_group_id, title, message, image_url, triggering_user_id, created_at, read, read_at, user_id')
      .eq('type', 'admin_broadcast')
      .not('broadcast_group_id', 'is', null)
      .order('created_at', { ascending: false });

    const byGroup = new Map<string, { title: string | null; message: string; image_url: string | null; createdAt: string; recipients: { userId: string; read: boolean; readAt: string | null }[] }>();
    for (const r of rows || []) {
      const n = r as { broadcast_group_id: string; title?: string | null; message?: string | null; image_url?: string | null; created_at: string; read?: boolean; read_at?: string | null; user_id: string };
      const gid = n.broadcast_group_id;
      if (!byGroup.has(gid)) {
        byGroup.set(gid, {
          title: n.title ?? null,
          message: n.message ?? '',
          image_url: n.image_url ?? null,
          createdAt: n.created_at,
          recipients: [],
        });
      }
      byGroup.get(gid)!.recipients.push({ userId: n.user_id, read: !!n.read, readAt: n.read_at ?? null });
    }

    const recipientType = (g: { recipients: { length: number } }, totalMembers: number) =>
      g.recipients.length >= totalMembers ? 'All Members' : 'Selected Members';

    let totalMembers = 0;
    if (expanded) {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', false);
      totalMembers = count ?? 0;
    }

    const header = expanded
      ? 'Broadcast ID,Title,Message,Image URL,Date Sent,Recipient Type,Total Recipients,Total Read,Total Unread,Read %,Recipient Name,Recipient Email,Read Status,Read Timestamp\n'
      : 'Broadcast ID,Title,Message,Image URL,Date Sent,Recipient Type,Total Recipients,Total Read,Total Unread,Read %\n';

    const lines: string[] = [header];

    for (const [gid, g] of byGroup) {
      const total = g.recipients.length;
      const totalRead = g.recipients.filter((x) => x.read).length;
      const totalUnread = total - totalRead;
      const readPct = total ? Math.round((totalRead / total) * 100) : 0;
      const recType = recipientType(g, totalMembers);

      const base = [gid, g.title ?? '', g.message, g.image_url ?? '', g.createdAt, recType, total, totalRead, totalUnread, readPct];

      if (expanded) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', g.recipients.map((x) => x.userId));
        const pm = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));
        for (const rec of g.recipients) {
          const p = pm.get(rec.userId) as { full_name?: string; email?: string } | undefined;
          lines.push([...base, p?.full_name ?? '', p?.email ?? '', rec.read ? 'Yes' : 'No', rec.readAt ?? ''].map(escapeCsvCell).join(',') + '\n');
        }
      } else {
        lines.push(base.map(escapeCsvCell).join(',') + '\n');
      }
    }

    const csv = lines.join('');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="notification-history.csv"',
      },
    });
  } catch (err: unknown) {
    console.error('GET /api/admin/notifications/export:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
