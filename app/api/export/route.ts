import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { getSafeErrorMessage, logSafeError } from '../../lib/safe-api-error';
import * as XLSX from 'xlsx';

const MAX_RANGE_DAYS = 365 * 2; // 2 years

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

function formatResolutionDuration(createdAt: string, closedAt?: string | null, responseTimeMinutes?: number | null): string {
  if (responseTimeMinutes != null && responseTimeMinutes >= 0) {
    if (responseTimeMinutes < 60) return `${responseTimeMinutes} min`;
    const h = Math.floor(responseTimeMinutes / 60);
    const m = responseTimeMinutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (closedAt) {
    const a = new Date(createdAt).getTime();
    const b = new Date(closedAt).getTime();
    const days = Math.round((b - a) / (24 * 60 * 60 * 1000));
    if (days === 0) return '< 1 day';
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  return '';
}

function typeIcon(ticketType?: string | null): string {
  if (ticketType === 'Hardware') return '🔧 ';
  if (ticketType === 'Software') return '💻 ';
  if (ticketType === 'New Site') return '🏗 ';
  return '';
}

/**
 * GET /api/export?type=all|tickets|new-sites|travel-logs&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Role-based: Admin = full dataset in range; Member = own/assigned only.
 * Returns XLSX. Max range 2 years. 400 if invalid dates, 403 if unauthorized.
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    const isAdmin = profile?.is_admin === true;

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const validTypes = ['all', 'tickets', 'new-sites', 'travel-logs'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    if (start > end) {
      return NextResponse.json({ error: 'startDate must be before or equal to endDate' }, { status: 400 });
    }
    const rangeDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json({ error: 'Date range cannot exceed 2 years' }, { status: 400 });
    }

    const startISO = start.toISOString().slice(0, 10) + 'T00:00:00.000Z';
    const endISO = end.toISOString().slice(0, 10) + 'T23:59:59.999Z';
    const userId = currentUser.id;

    type TicketRow = {
      ticket_number: string;
      type: string;
      team_member: string;
      client: string;
      status: string;
      issue: string;
      resolution: string;
      resolution_duration: string;
      created_at: string;
      closed_at: string;
      location: string;
      estate_or_building: string;
      cml_location: string;
      severity: string;
      has_dependencies: string;
      dependency_name: string;
    };
    type TravelRow = {
      user_name: string;
      reason: string;
      start_address: string;
      end_address: string;
      distance_travelled: string;
      is_return_trip: string;
      created_at: string;
    };

    const fetchTickets = async (): Promise<TicketRow[]> => {
      let q = supabase
        .from('tickets')
        .select('ticket_number, ticket_type, user_id, client, status, issue, resolution, response_time_minutes, created_at, closed_at, location, estate_or_building, cml_location, severity, has_dependencies, dependency_name')
        .gte('created_at', startISO)
        .lte('created_at', endISO);
      if (!isAdmin) {
        q = q.or(`user_id.eq.${userId},created_by.eq.${userId},assigned_to_array.cs.{${userId}}`);
      }
      const { data: rows, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      const profiles = await supabase.from('profiles').select('id, full_name');
      const profileMap = new Map((profiles.data || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || '']));
      return (rows || []).map((t: Record<string, unknown>) => ({
        ticket_number: `${typeIcon(t.ticket_type as string)}${String(t.ticket_number || '')}`,
        type: String(t.ticket_type || ''),
        team_member: profileMap.get(t.user_id as string) || String(t.user_id),
        client: String(t.client || ''),
        status: String(t.status || ''),
        issue: String(t.issue || ''),
        resolution: String(t.resolution || ''),
        resolution_duration: formatResolutionDuration(
          t.created_at as string,
          t.closed_at as string | null,
          t.response_time_minutes as number | null
        ),
        created_at: t.created_at ? new Date(t.created_at as string).toLocaleString('en-ZA') : '',
        closed_at: t.closed_at ? new Date(t.closed_at as string).toLocaleString('en-ZA') : '',
        location: String(t.location || ''),
        estate_or_building: String(t.estate_or_building || ''),
        cml_location: String(t.cml_location || ''),
        severity: String(t.severity || ''),
        has_dependencies: (t.has_dependencies as boolean) ? 'Yes' : 'No',
        dependency_name: String(t.dependency_name || ''),
      }));
    };

    const fetchTravelLogs = async (): Promise<TravelRow[]> => {
      let q = supabase
        .from('travel_logs')
        .select('user_id, reason, start_address, end_address, distance_travelled, is_return_trip, created_at')
        .gte('created_at', startISO)
        .lte('created_at', endISO);
      if (!isAdmin) q = q.eq('user_id', userId);
      const { data: rows, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      const profiles = await supabase.from('profiles').select('id, full_name');
      const profileMap = new Map((profiles.data || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || '']));
      return (rows || []).map((r: Record<string, unknown>) => ({
        user_name: profileMap.get(r.user_id as string) || String(r.user_id),
        reason: String(r.reason || ''),
        start_address: String(r.start_address || ''),
        end_address: String(r.end_address || ''),
        distance_travelled: r.distance_travelled != null ? String(r.distance_travelled) : '',
        is_return_trip: (r.is_return_trip as boolean) ? 'Yes' : 'No',
        created_at: r.created_at ? new Date(r.created_at as string).toLocaleString('en-ZA') : '',
      }));
    };

    let tickets: TicketRow[] = [];
    let travelLogs: TravelRow[] = [];

    if (type === 'all' || type === 'tickets' || type === 'new-sites') {
      tickets = await fetchTickets();
      if (type === 'new-sites') tickets = tickets.filter((t) => t.type === 'New Site');
    }
    if (type === 'all' || type === 'travel-logs') {
      travelLogs = await fetchTravelLogs();
    }

    const wb = XLSX.utils.book_new();
    const ticketCols = [
      { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 30 }, { wch: 30 }, { wch: 14 },
      { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 16 },
    ];
    const travelCols = [{ wch: 20 }, { wch: 24 }, { wch: 28 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];

    if (type === 'all') {
      const ticketSheet = XLSX.utils.json_to_sheet(tickets.length ? tickets : [{}]);
      ticketSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
      ticketSheet['!cols'] = ticketCols;
      XLSX.utils.book_append_sheet(wb, ticketSheet, 'Tickets');
      const newSites = tickets.filter((t) => t.type === 'New Site');
      const newSitesSheet = XLSX.utils.json_to_sheet(newSites.length ? newSites : [{}]);
      newSitesSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
      newSitesSheet['!cols'] = ticketCols;
      XLSX.utils.book_append_sheet(wb, newSitesSheet, 'New Sites');
      const travelSheet = XLSX.utils.json_to_sheet(travelLogs.length ? travelLogs : [{}]);
      travelSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
      travelSheet['!cols'] = travelCols;
      XLSX.utils.book_append_sheet(wb, travelSheet, 'Travel Logs');
    } else {
      if (type === 'tickets' || type === 'new-sites') {
        const data = type === 'new-sites' ? tickets.filter((t) => t.type === 'New Site') : tickets;
        const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{}]);
        sheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
        sheet['!cols'] = ticketCols;
        XLSX.utils.book_append_sheet(wb, sheet, type === 'new-sites' ? 'New Sites' : 'Tickets');
      }
      if (type === 'travel-logs') {
        const travelSheet = XLSX.utils.json_to_sheet(travelLogs.length ? travelLogs : [{}]);
        travelSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
        travelSheet['!cols'] = travelCols;
        XLSX.utils.book_append_sheet(wb, travelSheet, 'Travel Logs');
      }
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `KPI-Export-${startDate}_to_${endDate}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (err: unknown) {
    logSafeError('GET /api/export', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
