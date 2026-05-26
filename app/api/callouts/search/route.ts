import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const contractorId = searchParams.get('contractorId');
  const mode = searchParams.get('mode') || 'keyword';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  const admin = getCalloutServiceClient();

  if (!q) {
    return NextResponse.json({ records: [], mode: 'empty' });
  }

  if (mode === 'semantic' && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: q.slice(0, 8000),
      });
      const vector = emb.data[0]?.embedding;
      if (vector) {
        const { data, error } = await admin.rpc('search_callout_records_semantic', {
          query_embedding: vector,
          match_count: limit,
          contractor_filter: contractorId || null,
        });

        if (!error && data) {
          return NextResponse.json({ records: data, mode: 'semantic' });
        }
      }
    } catch (err) {
      logSafeError('semantic search fallback', err);
    }
  }

  let query = admin
    .from('callout_records')
    .select('*, contractors(name, code)')
    .or(`primary_job_card_number.ilike.%${q}%,primary_site_name.ilike.%${q}%,ai_summary.ilike.%${q}%`)
    .limit(limit);

  if (contractorId) query = query.eq('contractor_id', contractorId);

  const { data, error } = await query;
  if (error) {
    logSafeError('callout search', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }

  const { data: chunks } = await admin
    .from('callout_search_chunks')
    .select('callout_record_id, chunk_text')
    .ilike('chunk_text', `%${q}%`)
    .limit(limit);

  const chunkRecordIds = [...new Set((chunks ?? []).map((c) => c.callout_record_id))];
  let extra: unknown[] = [];
  if (chunkRecordIds.length) {
    const { data: extraRecords } = await admin
      .from('callout_records')
      .select('*, contractors(name, code)')
      .in('id', chunkRecordIds);
    extra = extraRecords ?? [];
  }

  const merged = [...(data ?? [])];
  const ids = new Set(merged.map((r) => r.id));
  for (const r of extra as { id: string }[]) {
    if (!ids.has(r.id)) merged.push(r as (typeof merged)[0]);
  }

  return NextResponse.json({ records: merged, mode: 'keyword' });
}
