import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { requireServiceCallUser } from '@/app/lib/service-calls/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const q = request.nextUrl.searchParams.get('q')?.trim() || '';
    if (q.length < 2) return NextResponse.json({ tickets: [] });

    const { data, error } = await auth.supabase
      .from('tickets')
      .select(
        'id, ticket_number, client, issue, status, created_at, estate_or_building, cml_location, user_id, created_by, assigned_to_array'
      )
      .or(`ticket_number.ilike.%${q}%,client.ilike.%${q}%,issue.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let tickets = data ?? [];
    if (!auth.isAdmin) {
      tickets = tickets.filter(
        (t: { user_id?: string; created_by?: string; assigned_to_array?: string[] }) =>
          t.user_id === auth.userId ||
          t.created_by === auth.userId ||
          (Array.isArray(t.assigned_to_array) && t.assigned_to_array.includes(auth.userId))
      );
    }

    return NextResponse.json({ tickets: tickets.slice(0, 20) });
  } catch (err) {
    logSafeError('GET search-tickets', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
