/**
 * POST /api/admin/ai-insights
 * Admin-only, read-only. Fetches tickets + travel, computes metrics, calls AI with metrics only.
 * Vercel serverless compatible. Supports cookie auth or accessToken in body (for preview URLs where cookies may not be sent).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';
import { computeMetrics } from '@/app/lib/ai-insights-analytics';
import { getSystemPrompt, buildUserPrompt } from '@/app/lib/ai-insights-prompts';
import type { AIInsightsRequest, AIInsightsResponse, AIInsightsFilters } from '@/app/lib/ai-insights-types';

export const maxDuration = 30;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server env');
  return createClient(url, key);
}

/** Auth from cookies (server session). */
async function ensureAdminFromCookies(): Promise<
  { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> } | { ok: false; status: 401 | 403; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();
  if (!profile?.is_admin) {
    return { ok: false, status: 403, error: 'Admin only' };
  }
  return { ok: true, supabase };
}

/** Auth from JWT in body (for preview deployments where cookies are not sent). */
async function ensureAdminFromToken(accessToken: string): Promise<
  { ok: true; supabase: ReturnType<typeof getSupabaseAdmin> } | { ok: false; status: 401 | 403; error: string }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { ok: false, status: 401, error: 'Unauthorized' };
  const authClient = createClient(url, anonKey);
  const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return { ok: false, status: 403, error: 'Admin only' };
  }
  return { ok: true, supabase: admin };
}

export async function POST(request: NextRequest) {
  try {
    const body: AIInsightsRequest = await request.json();
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : undefined;

    const auth = accessToken
      ? await ensureAdminFromToken(accessToken)
      : await ensureAdminFromCookies();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabase } = auth;
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const filters: AIInsightsFilters = body.filters ?? {};

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    // Read-only fetch: only the columns needed for analytics
    const [ticketsRes, travelRes] = await Promise.all([
      supabase
        .from('tickets')
        .select('status, created_at, closed_at, response_time_minutes, has_dependencies, ticket_type, client, user_id'),
      supabase
        .from('travel_logs')
        .select('created_at, user_id, end_address, start_address, distance_travelled'),
    ]);

    const tickets = ticketsRes.data || [];
    const travelLogs = travelRes.data || [];

    const metrics = computeMetrics(tickets, travelLogs, filters);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI insights not configured (OPENAI_API_KEY missing)' },
        { status: 503 }
      );
    }

    const systemPrompt = getSystemPrompt();
    const userPrompt = buildUserPrompt(question, metrics, filters);

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!completion.ok) {
      const err = await completion.text();
      console.error('OpenAI error:', completion.status, err);
      return NextResponse.json(
        { error: 'AI service error', details: completion.status },
        { status: 502 }
      );
    }

    const data = await completion.json();
    const answer =
      data.choices?.[0]?.message?.content?.trim() || 'No response generated.';

    const response: AIInsightsResponse = {
      question,
      filters,
      metrics,
      answer,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('ai-insights API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
