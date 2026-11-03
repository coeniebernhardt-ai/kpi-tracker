import { NextRequest, NextResponse } from 'next/server';
import {
  actorRole,
  authenticateManager,
  cleanStr,
  dbError,
  handleRouteError,
  jsonError,
  readJson,
} from '@/app/lib/support-calls/server';

/** GET /api/support-calls/partners?active=1&q=term — managers only (partner directory). */
export async function GET(request: NextRequest) {
  try {
    const a = await authenticateManager(request);
    if (!a.ok) return a.response;
    const sp = request.nextUrl.searchParams;
    let query = a.auth.supabase.from('support_partners').select('*').order('company_name', { ascending: true });
    if (sp.get('active') === '1') query = query.eq('is_active', true);
    const q = (sp.get('q') || '').trim().replace(/[%,()]/g, ' ');
    if (q) query = query.or(`company_name.ilike.%${q}%,contact_person.ilike.%${q}%,category.ilike.%${q}%`);
    const { data, error } = await query.limit(500);
    if (error) return dbError('partners.list', error);
    return NextResponse.json({ partners: data || [] });
  } catch (e) {
    return handleRouteError('GET /support-calls/partners', e);
  }
}

/** POST /api/support-calls/partners — managers only. Adds a partner to the directory. */
export async function POST(request: NextRequest) {
  try {
    const a = await authenticateManager(request);
    if (!a.ok) return a.response;
    const { auth } = a;
    const body = await readJson(request);

    const company_name = cleanStr(body.company_name, 200);
    if (!company_name) return jsonError('company_name is required', 400);

    const { data: dup } = await auth.supabase
      .from('support_partners')
      .select('id')
      .ilike('company_name', company_name.replace(/[%_]/g, ''))
      .maybeSingle();
    if (dup) return jsonError('A partner with this company name already exists', 409, { code: 'DUPLICATE' });

    const { data, error } = await auth.supabase
      .from('support_partners')
      .insert({
        company_name,
        contact_person: cleanStr(body.contact_person, 200),
        email: cleanStr(body.email, 200),
        telephone: cleanStr(body.telephone, 50),
        category: cleanStr(body.category, 100),
        notes: cleanStr(body.notes, 2000),
        is_active: body.is_active !== false,
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select('*')
      .single();
    if (error) return dbError('partners.create', error);

    // Directory entries are not tied to a support call, so the audit goes to the server log only.
    console.info('[support-calls] partner created', data.id, actorRole(auth));
    return NextResponse.json({ partner: data }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/partners', e);
  }
}
