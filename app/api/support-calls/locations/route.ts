import { NextRequest, NextResponse } from 'next/server';
import {
  authenticate,
  authenticateManager,
  cleanStr,
  dbError,
  handleRouteError,
  isUuid,
  jsonError,
  readJson,
} from '@/app/lib/support-calls/server';

/**
 * GET /api/support-calls/locations
 * Query: kind=clients|estates|cml|onsite
 *        client_id= (estates) estate_id= (cml/onsite) cml_location_id= (optional filter for onsite)
 *        active=1
 */
export async function GET(request: NextRequest) {
  try {
    const a = await authenticate(request);
    if (!a.ok) return a.response;
    const sp = request.nextUrl.searchParams;
    const kind = sp.get('kind') || 'clients';
    const activeOnly = sp.get('active') !== '0';
    const supabase = a.auth.supabase;

    if (kind === 'clients') {
      let q = supabase.from('support_clients').select('*').order('name', { ascending: true });
      if (activeOnly) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) return dbError('locations.clients', error);
      return NextResponse.json({ clients: data || [] });
    }

    if (kind === 'estates') {
      const clientId = sp.get('client_id');
      if (!isUuid(clientId)) return jsonError('client_id is required', 400);
      let q = supabase
        .from('support_estates')
        .select('*')
        .eq('client_id', clientId)
        .order('name', { ascending: true });
      if (activeOnly) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) return dbError('locations.estates', error);
      return NextResponse.json({ estates: data || [] });
    }

    if (kind === 'cml') {
      const estateId = sp.get('estate_id');
      if (!isUuid(estateId)) return jsonError('estate_id is required', 400);
      let q = supabase
        .from('support_cml_locations')
        .select('*')
        .eq('estate_id', estateId)
        .order('name', { ascending: true });
      if (activeOnly) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) return dbError('locations.cml', error);
      return NextResponse.json({ cml_locations: data || [] });
    }

    if (kind === 'onsite') {
      const estateId = sp.get('estate_id');
      if (!isUuid(estateId)) return jsonError('estate_id is required', 400);
      let q = supabase
        .from('support_onsite_locations')
        .select('*')
        .eq('estate_id', estateId)
        .order('name', { ascending: true });
      if (activeOnly) q = q.eq('active', true);
      const cmlId = sp.get('cml_location_id');
      if (isUuid(cmlId)) q = q.or(`cml_location_id.eq.${cmlId},cml_location_id.is.null`);
      const { data, error } = await q;
      if (error) return dbError('locations.onsite', error);
      return NextResponse.json({ onsite_locations: data || [] });
    }

    return jsonError('kind must be clients, estates, cml or onsite', 400);
  } catch (e) {
    return handleRouteError('GET /support-calls/locations', e);
  }
}

/**
 * POST /api/support-calls/locations
 * Body: { kind, name, client_id?, estate_id?, cml_location_id? }
 */
export async function POST(request: NextRequest) {
  try {
    const a = await authenticateManager(request);
    if (!a.ok) return a.response;
    const { auth } = a;
    const body = await readJson(request);
    const kind = String(body.kind || '');
    const name = cleanStr(body.name, 300);
    if (!name) return jsonError('name is required', 400);

    if (kind === 'clients') {
      const { data, error } = await auth.supabase
        .from('support_clients')
        .insert({ name, created_by: auth.userId })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') return jsonError('Client already exists', 409, { code: 'DUPLICATE' });
        return dbError('locations.clients.create', error);
      }
      return NextResponse.json({ client: data }, { status: 201 });
    }

    if (kind === 'estates') {
      if (!isUuid(body.client_id)) return jsonError('client_id is required', 400);
      const { data, error } = await auth.supabase
        .from('support_estates')
        .insert({ client_id: body.client_id, name, created_by: auth.userId })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') return jsonError('Estate already exists for this client', 409, { code: 'DUPLICATE' });
        return dbError('locations.estates.create', error);
      }
      return NextResponse.json({ estate: data }, { status: 201 });
    }

    if (kind === 'cml') {
      if (!isUuid(body.estate_id)) return jsonError('estate_id is required', 400);
      const { data, error } = await auth.supabase
        .from('support_cml_locations')
        .insert({ estate_id: body.estate_id, name, created_by: auth.userId })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') return jsonError('CML location already exists for this estate', 409, { code: 'DUPLICATE' });
        return dbError('locations.cml.create', error);
      }
      return NextResponse.json({ cml_location: data }, { status: 201 });
    }

    if (kind === 'onsite') {
      if (!isUuid(body.estate_id)) return jsonError('estate_id is required', 400);
      const { data, error } = await auth.supabase
        .from('support_onsite_locations')
        .insert({
          estate_id: body.estate_id,
          cml_location_id: isUuid(body.cml_location_id) ? body.cml_location_id : null,
          name,
          created_by: auth.userId,
        })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') return jsonError('On-site location already exists for this estate', 409, { code: 'DUPLICATE' });
        return dbError('locations.onsite.create', error);
      }
      return NextResponse.json({ onsite_location: data }, { status: 201 });
    }

    return jsonError('kind must be clients, estates, cml or onsite', 400);
  } catch (e) {
    return handleRouteError('POST /support-calls/locations', e);
  }
}
