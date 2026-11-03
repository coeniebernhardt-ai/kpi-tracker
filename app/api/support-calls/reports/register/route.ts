import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { requireSupportCallUser } from '@/app/lib/support-calls/auth';
import { writeSupportCallAudit } from '@/app/lib/support-calls/audit';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSupportCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!auth.canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const htoOwnerId = searchParams.get('hto_owner_id');
    const q = searchParams.get('q')?.trim();

    let query = auth.supabase
      .from('support_calls')
      .select(
        'id, support_call_number, ticket_id, hto_owner_id, priority, overall_status, workflow_stage, client, site_name, original_description, reported_at, created_at, closed_at, cancelled_at, cancel_reason, initial_notification_status, eta_notification_status'
      )
      .order('created_at', { ascending: false })
      .limit(2000);

    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`);
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`);
    if (status) query = query.eq('overall_status', status);
    if (priority) query = query.eq('priority', priority);
    if (htoOwnerId) query = query.eq('hto_owner_id', htoOwnerId);
    if (q) {
      query = query.or(
        `support_call_number.ilike.%${q}%,client.ilike.%${q}%,site_name.ilike.%${q}%,original_description.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const ticketIds = [...new Set(rows.map((r) => r.ticket_id).filter(Boolean))];
    const ownerIds = [...new Set(rows.map((r) => r.hto_owner_id).filter(Boolean))];
    const scIds = rows.map((r) => r.id);

    const [{ data: tickets }, { data: profiles }, { data: assignments }, { data: partners }] =
      await Promise.all([
        ticketIds.length
          ? auth.supabase.from('tickets').select('id, ticket_number').in('id', ticketIds)
          : Promise.resolve({ data: [] as { id: string; ticket_number: string }[] }),
        ownerIds.length
          ? auth.supabase.from('profiles').select('id, full_name').in('id', ownerIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
        scIds.length
          ? auth.supabase
              .from('support_call_assignments')
              .select('support_call_id, member_id, is_lead, profiles:member_id(full_name)')
              .in('support_call_id', scIds)
          : Promise.resolve({ data: [] as Record<string, unknown>[] }),
        scIds.length
          ? auth.supabase
              .from('support_call_partners')
              .select('support_call_id, company_name')
              .in('support_call_id', scIds)
          : Promise.resolve({ data: [] as { support_call_id: string; company_name: string }[] }),
      ]);

    const ticketMap = new Map((tickets || []).map((t) => [t.id, t.ticket_number]));
    const ownerMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
    const assignBySc = new Map<string, { names: string[]; lead?: string }>();
    for (const a of (assignments || []) as Array<{
      support_call_id: string;
      is_lead: boolean;
      profiles?: { full_name?: string } | { full_name?: string }[] | null;
    }>) {
      const name = Array.isArray(a.profiles)
        ? a.profiles[0]?.full_name
        : a.profiles?.full_name;
      const cur = assignBySc.get(a.support_call_id) || { names: [] };
      if (name) cur.names.push(name);
      if (a.is_lead && name) cur.lead = name;
      assignBySc.set(a.support_call_id, cur);
    }
    const partnerBySc = new Map<string, string[]>();
    for (const p of partners || []) {
      const list = partnerBySc.get(p.support_call_id) || [];
      list.push(p.company_name);
      partnerBySc.set(p.support_call_id, list);
    }

    const exportRows = rows.map((r) => {
      const asn = assignBySc.get(r.id);
      return {
        support_call_number: r.support_call_number,
        ticket_number: ticketMap.get(r.ticket_id) || '',
        created_at: r.created_at ? new Date(r.created_at).toLocaleString('en-ZA') : '',
        reported_at: r.reported_at ? new Date(r.reported_at).toLocaleString('en-ZA') : '',
        client: r.client || '',
        site_name: r.site_name || '',
        priority: r.priority,
        original_description: r.original_description || '',
        hto_owner: ownerMap.get(r.hto_owner_id) || '',
        assigned_technicians: asn?.names.join(', ') || '',
        lead_technician: asn?.lead || '',
        external_partners: (partnerBySc.get(r.id) || []).join(', '),
        overall_status: r.overall_status,
        workflow_stage: r.workflow_stage,
        initial_notification_status: r.initial_notification_status,
        eta_notification_status: r.eta_notification_status,
        closed_at: r.closed_at ? new Date(r.closed_at).toLocaleString('en-ZA') : '',
        cancelled_at: r.cancelled_at ? new Date(r.cancelled_at).toLocaleString('en-ZA') : '',
        cancel_reason: r.cancel_reason || '',
      };
    });

    if (rows[0]?.id) {
      await writeSupportCallAudit(auth.supabase, {
        support_call_id: rows[0].id,
        actor_id: auth.userId,
        actor_role: auth.isAdmin ? 'admin' : 'hto',
        event_type: 'register_exported',
        new_value: { count: rows.length, format },
        source: 'api',
      });
    }

    if (format === 'csv') {
      const sheet = XLSX.utils.json_to_sheet(exportRows.length ? exportRows : [{}]);
      const csv = XLSX.utils.sheet_to_csv(sheet);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="Support-Calls-Register.csv"',
        },
      });
    }

    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(exportRows.length ? exportRows : [{}]);
    XLSX.utils.book_append_sheet(wb, sheet, 'Support Calls');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Support-Calls-Register.xlsx"',
      },
    });
  } catch (err) {
    logSafeError('GET support-calls register', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
