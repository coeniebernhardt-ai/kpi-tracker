import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { fetchAllSupabaseRows } from '../../lib/supabase';
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

/** Export resolution duration as numeric minutes only (for Excel conditional formatting). */
function formatResolutionDuration(createdAt: string, closedAt?: string | null, responseTimeMinutes?: number | null): number | '' {
  if (responseTimeMinutes != null && responseTimeMinutes >= 0) {
    return Math.round(responseTimeMinutes);
  }
  if (closedAt) {
    const a = new Date(createdAt).getTime();
    const b = new Date(closedAt).getTime();
    return Math.round((b - a) / (60 * 1000));
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
 * GET /api/export?type=all|tickets|new-sites|travel-logs&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&memberId=uuid (admin only)
 * Role-based: Admin = full dataset in range (or single member if memberId set); Member = own/assigned only.
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
    const memberId = searchParams.get('memberId') || '';
    if (memberId && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
      resolution_duration: number | '';
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

    /** New Site Requests sheet: dedicated schema (no ticket-only columns). */
    type NewSiteRow = {
      'Request ID': string;
      'Site Name': string;
      'Address': string;
      'GPS': string;
      'Contact Person': string;
      'Contact Email': string;
      'Scope': string;
      'Infrastructure Requirements': string;
      'Budget': string;
      'Target Go-Live Date': string;
      'Attachments': string;
      'Status': string;
      'Created By': string;
      'Created At': string;
      'Closed At': string;
      'Resolution Duration': number | '';
    };

    function buildNewSiteRows(rawTickets: Record<string, unknown>[], profileMap: Map<string, string>): NewSiteRow[] {
      return rawTickets
        .filter((t) => (t.ticket_type as string) === 'New Site')
        .map((t) => {
          const address = [String(t.estate_or_building || ''), String(t.cml_location || '')].filter(Boolean).join(', ') || '';
          const siteFiles = (t.site_files as { name?: string }[] | null) || [];
          const attachments = siteFiles.map((f) => f.name || '').filter(Boolean).join('; ');
          return {
            'Request ID': String(t.ticket_number || ''),
            'Site Name': String(t.site_name || ''),
            'Address': address,
            'GPS': '',
            'Contact Person': String(t.client || ''),
            'Contact Email': '',
            'Scope': String(t.issue || ''),
            'Infrastructure Requirements': '',
            'Budget': '',
            'Target Go-Live Date': t.target_date ? new Date(t.target_date as string).toLocaleDateString('en-ZA') : '',
            'Attachments': attachments,
            'Status': String(t.status || ''),
            'Created By': profileMap.get((t.created_by as string) || (t.user_id as string)) || String(t.created_by || t.user_id || ''),
            'Created At': t.created_at ? new Date(t.created_at as string).toLocaleString('en-ZA') : '',
            'Closed At': t.closed_at ? new Date(t.closed_at as string).toLocaleString('en-ZA') : '',
            'Resolution Duration': formatResolutionDuration(
              t.created_at as string,
              t.closed_at as string | null,
              t.response_time_minutes as number | null
            ),
          };
        });
    }

    const fetchTickets = async (): Promise<{ ticketRows: TicketRow[]; rawRows: Record<string, unknown>[]; profileMap: Map<string, string> }> => {
      const selectFields = 'ticket_number, ticket_type, user_id, client, status, issue, resolution, response_time_minutes, created_at, closed_at, location, estate_or_building, cml_location, severity, has_dependencies, dependency_name, created_by, site_name, target_date, site_files';
      const buildTicketsQuery = () => {
        let q = supabase
          .from('tickets')
          .select(selectFields)
          .gte('created_at', startISO)
          .lte('created_at', endISO);
        if (!isAdmin) {
          q = q.or(`user_id.eq.${userId},created_by.eq.${userId},assigned_to_array.cs.{${userId}}`);
        } else if (memberId) {
          q = q.or(`created_by.eq.${memberId},user_id.eq.${memberId},assigned_to_array.cs.{${memberId}}`);
        }
        return q.order('created_at', { ascending: false });
      };
      const { data: rows, error } = await fetchAllSupabaseRows<Record<string, unknown>>((from, to) =>
        buildTicketsQuery().range(from, to)
      );
      if (error) throw error;
      const profiles = await supabase.from('profiles').select('id, full_name');
      const profileMap = new Map((profiles.data || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || '']));
      const ticketRows: TicketRow[] = (rows || []).map((t: Record<string, unknown>) => ({
        ticket_number: `${typeIcon(t.ticket_type as string)}${String(t.ticket_number || '')}`,
        type: `${typeIcon(t.ticket_type as string)}${String(t.ticket_type || '')}`,
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
      return { ticketRows, rawRows: (rows || []) as Record<string, unknown>[], profileMap };
    };

    const fetchTravelLogs = async (): Promise<TravelRow[]> => {
      const buildTravelQuery = () => {
        let q = supabase
          .from('travel_logs')
          .select('user_id, reason, start_address, end_address, distance_travelled, is_return_trip, created_at')
          .gte('created_at', startISO)
          .lte('created_at', endISO);
        if (!isAdmin) q = q.eq('user_id', userId);
        else if (memberId) q = q.eq('user_id', memberId);
        return q.order('created_at', { ascending: false });
      };
      const { data: rows, error } = await fetchAllSupabaseRows<Record<string, unknown>>((from, to) =>
        buildTravelQuery().range(from, to)
      );
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
    let rawTicketRows: Record<string, unknown>[] = [];
    let profileMap = new Map<string, string>();
    let travelLogs: TravelRow[] = [];

    if (type === 'all' || type === 'tickets' || type === 'new-sites') {
      const out = await fetchTickets();
      tickets = out.ticketRows;
      rawTicketRows = out.rawRows;
      profileMap = out.profileMap;
      if (type === 'new-sites') tickets = tickets.filter((t) => t.type?.includes('New Site'));
    }
    if (type === 'all' || type === 'travel-logs') {
      travelLogs = await fetchTravelLogs();
    }

    const wb = XLSX.utils.book_new();
    const ticketCols = [
      { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 30 }, { wch: 30 }, { wch: 14 },
      { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 16 },
    ];
    const newSiteCols = [
      { wch: 18 }, { wch: 20 }, { wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 24 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
    ];
    const travelCols = [{ wch: 20 }, { wch: 24 }, { wch: 28 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];

    if (type === 'all') {
      const ticketSheet = XLSX.utils.json_to_sheet(tickets.length ? tickets : [{}]);
      ticketSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
      ticketSheet['!cols'] = ticketCols;
      XLSX.utils.book_append_sheet(wb, ticketSheet, 'Tickets');
      const newSiteRows = buildNewSiteRows(rawTicketRows, profileMap);
      const newSitesSheet = XLSX.utils.json_to_sheet(newSiteRows.length ? newSiteRows : [{}]);
      newSitesSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
      newSitesSheet['!cols'] = newSiteCols;
      XLSX.utils.book_append_sheet(wb, newSitesSheet, 'New Site Requests');
      const travelSheet = XLSX.utils.json_to_sheet(travelLogs.length ? travelLogs : [{}]);
      travelSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
      travelSheet['!cols'] = travelCols;
      XLSX.utils.book_append_sheet(wb, travelSheet, 'Travel Logs');
    } else {
      if (type === 'tickets') {
        const sheet = XLSX.utils.json_to_sheet(tickets.length ? tickets : [{}]);
        sheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
        sheet['!cols'] = ticketCols;
        XLSX.utils.book_append_sheet(wb, sheet, 'Tickets');
      }
      if (type === 'new-sites') {
        const newSiteRows = buildNewSiteRows(rawTicketRows, profileMap);
        const sheet = XLSX.utils.json_to_sheet(newSiteRows.length ? newSiteRows : [{}]);
        sheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', state: 'frozen' };
        sheet['!cols'] = newSiteCols;
        XLSX.utils.book_append_sheet(wb, sheet, 'New Site Requests');
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
