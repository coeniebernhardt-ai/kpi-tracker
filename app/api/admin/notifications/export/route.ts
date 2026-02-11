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

    const scope = request.nextUrl.searchParams.get('scope') || 'broadcasts';
    const exportAll = scope === 'all';

    const { data: rows } = await supabase
      .from('notifications')
      .select('id, broadcast_group_id, title, message, image_url, triggering_user_id, created_at, read, read_at, user_id, type')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const allRows = (rows || []) as Array<{ id: string; broadcast_group_id: string | null; title?: string | null; message?: string | null; image_url?: string | null; created_at: string; read?: boolean; read_at?: string | null; user_id: string; type?: string; triggering_user_id?: string | null }>;

    const allNotificationIds = allRows.map((r) => r.id);
    const { data: reactionRows } = await supabase
      .from('notification_reactions')
      .select('notification_id, user_id, reaction_type')
      .in('notification_id', allNotificationIds);
    const reactionList = (reactionRows || []) as { notification_id: string; user_id: string; reaction_type: string }[];
    const validReactionTypes = ['LIKE', 'MUSCLE', 'LAUGH', 'COPY_THAT'];

    // Section 9: Export ALL notifications (one row per record) when scope=all
    if (exportAll) {
      const senderIds = [...new Set(allRows.map((n) => n.triggering_user_id).filter(Boolean))] as string[];
      const recipientIds = [...new Set(allRows.map((n) => n.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', [...senderIds, ...recipientIds]);
      const nameMap = new Map((profiles || []).map((p: { id: string; full_name?: string }) => [p.id, p.full_name ?? '']));
      const reactionCountByNotif = new Map<string, { LIKE: number; MUSCLE: number; LAUGH: number; COPY_THAT: number }>();
      for (const x of reactionList) {
        const key = x.notification_id;
        if (!reactionCountByNotif.has(key)) reactionCountByNotif.set(key, { LIKE: 0, MUSCLE: 0, LAUGH: 0, COPY_THAT: 0 });
        const s = reactionCountByNotif.get(key)!;
        if (validReactionTypes.includes(x.reaction_type)) s[x.reaction_type as keyof typeof s]++;
      }
      const allHeader = 'Notification ID,BroadcastGroupId,Title,Message,AttachmentCount,Total Like,Total StrongArm,Total Laugh,Total CopyThat,Sender,Recipient,CreatedAt,ReadAt,Read Status\n';
      const allLines = [allHeader];
      for (const n of allRows) {
        const react = reactionCountByNotif.get(n.id) ?? { LIKE: 0, MUSCLE: 0, LAUGH: 0, COPY_THAT: 0 };
        const attachmentCount = n.image_url?.trim() ? 1 : 0;
        allLines.push([
          n.id,
          n.broadcast_group_id ?? '',
          n.title ?? '',
          n.message ?? '',
          attachmentCount,
          react.LIKE,
          react.MUSCLE,
          react.LAUGH,
          react.COPY_THAT,
          (n.triggering_user_id && nameMap.get(n.triggering_user_id)) ?? '',
          nameMap.get(n.user_id) ?? '',
          n.created_at,
          n.read_at ?? '',
          n.read ? 'Yes' : 'No',
        ].map(escapeCsvCell).join(',') + '\n');
      }
      return new NextResponse(allLines.join(''), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="notification-history-all.csv"',
        },
      });
    }

    const byGroup = new Map<string, { title: string | null; message: string; image_url: string | null; createdAt: string; recipients: { userId: string; read: boolean; readAt: string | null; notificationId: string }[] }>();
    for (const r of allRows) {
      if (r.type !== 'admin_broadcast' || !r.broadcast_group_id) continue;
      const n = r;
      const gid = n.broadcast_group_id as string;
      if (!byGroup.has(gid)) {
        byGroup.set(gid, {
          title: n.title ?? null,
          message: n.message ?? '',
          image_url: n.image_url ?? null,
          createdAt: n.created_at,
          recipients: [],
        });
      }
      byGroup.get(gid)!.recipients.push({ userId: n.user_id, read: !!n.read, readAt: n.read_at ?? null, notificationId: n.id });
    }

    const reactionByNotification = new Map<string, string>();
    for (const x of reactionList) {
      reactionByNotification.set(x.notification_id, x.reaction_type);
    }
    const sumReactions = (notificationIds: string[]) => {
      const s = { LIKE: 0, MUSCLE: 0, LAUGH: 0, COPY_THAT: 0 };
      for (const nid of notificationIds) {
        const t = reactionByNotification.get(nid);
        if (t && validReactionTypes.includes(t)) s[t as keyof typeof s]++;
      }
      return s;
    };

    const recipientType = (g: { recipients: { length: number } }, totalMembers: number) =>
      g.recipients.length >= totalMembers ? 'All Members' : 'Selected Members';

    let totalMembers = 0;
    if (expanded) {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', false);
      totalMembers = count ?? 0;
    }

    const header = expanded
      ? 'Broadcast ID,Title,Message,Image URL,Date Sent,Recipient Type,Total Recipients,Total Read,Total Unread,Read %,Total Like,Total StrongArm,Total Laugh,Total CopyThat,Recipient Name,Recipient Email,Recipient Role,Read Status,Read Timestamp,Reaction\n'
      : 'Broadcast ID,Title,Message,Image URL,Date Sent,Recipient Type,Total Recipients,Total Read,Total Unread,Read %,Total Like,Total StrongArm,Total Laugh,Total CopyThat\n';

    const lines: string[] = [header];

    for (const [gid, g] of byGroup) {
      const total = g.recipients.length;
      const totalRead = g.recipients.filter((x) => x.read).length;
      const totalUnread = total - totalRead;
      const readPct = total ? Math.round((totalRead / total) * 100) : 0;
      const recType = recipientType(g, totalMembers);
      const notifIds = g.recipients.map((x) => x.notificationId);
      const reactSum = sumReactions(notifIds);

      const base = [gid, g.title ?? '', g.message, g.image_url ?? '', g.createdAt, recType, total, totalRead, totalUnread, readPct, reactSum.LIKE, reactSum.MUSCLE, reactSum.LAUGH, reactSum.COPY_THAT];

      if (expanded) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, role').in('id', g.recipients.map((x) => x.userId));
        const pm = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));
        for (const rec of g.recipients) {
          const p = pm.get(rec.userId) as { full_name?: string; email?: string; role?: string } | undefined;
          const reaction = reactionByNotification.get(rec.notificationId) ?? '';
          const reactionLabel = reaction === 'LIKE' ? 'Like' : reaction === 'MUSCLE' ? 'Strong Arm' : reaction === 'LAUGH' ? 'Laugh' : reaction === 'COPY_THAT' ? 'Copy That' : reaction;
          lines.push([...base, p?.full_name ?? '', p?.email ?? '', p?.role ?? '', rec.read ? 'Yes' : 'No', rec.readAt ?? '', reactionLabel].map(escapeCsvCell).join(',') + '\n');
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
