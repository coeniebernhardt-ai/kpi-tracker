/**
 * POST /api/admin/ai-insights
 * AI-INSIGHTS ONLY. Admin-only, read-only.
 * Uses the SAME live data layer as the rest of the app (getAllTicketsForAnalytics / getAllTravelLogsForAnalytics from supabase.ts).
 * Data is fetched READ-ONLY; analytics computed in code; AI grounded ONLY in computed metrics.
 * Disabled unless ENABLE_AI_INSIGHTS=true and OPENAI_API_KEY is set.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';
import { getAllTicketsForAnalytics, getAllTravelLogsForAnalytics, getProfilesForAnalytics } from '@/app/lib/supabase';
import { computeUniversalSnapshot, snapshotToLegacyMetrics } from '@/app/lib/ai-insights-analytics';
import { getSystemPrompt, buildUserPrompt } from '@/app/lib/ai-insights-prompts';
import type { AIInsightsRequest, AIInsightsResponse, AIInsightsFilters } from '@/app/lib/ai-insights-types';

export const maxDuration = 30;

/** AI-INSIGHTS ONLY: feature gate. When false, API returns 503. */
function isAiInsightsEnabled(): boolean {
  return process.env.ENABLE_AI_INSIGHTS === 'true' && !!process.env.OPENAI_API_KEY?.trim();
}

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

    // AI-INSIGHTS ONLY: use same live data layer as app (read-only)
    if (!isAiInsightsEnabled()) {
      return NextResponse.json(
        { error: 'AI insights disabled. Set ENABLE_AI_INSIGHTS=true and OPENAI_API_KEY to enable.' },
        { status: 503 }
      );
    }

    const [ticketsRaw, travelLogsRaw, profilesRaw] = await Promise.all([
      getAllTicketsForAnalytics(supabase),
      getAllTravelLogsForAnalytics(supabase),
      getProfilesForAnalytics(supabase),
    ]);

    // Defensive: cap row counts to avoid OOM / huge payloads (read-only; no write)
    const MAX_TICKETS = 15_000;
    const MAX_TRAVEL_LOGS = 10_000;
    const MAX_PROFILES = 2_000;
    const tickets = ticketsRaw.slice(0, MAX_TICKETS);
    const travelLogs = travelLogsRaw.slice(0, MAX_TRAVEL_LOGS);
    const profiles = profilesRaw.slice(0, MAX_PROFILES);

    const generatedAt = new Date().toISOString();
    const snapshot = computeUniversalSnapshot(tickets, travelLogs, profiles, filters, generatedAt);
    const metrics = snapshotToLegacyMetrics(snapshot);

    const apiKey = process.env.OPENAI_API_KEY!.trim();

    const systemPrompt = getSystemPrompt();
    const userPrompt = buildUserPrompt(question, snapshot, filters);

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
      snapshot,
      metrics,
      answer,
      generatedAt,
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
