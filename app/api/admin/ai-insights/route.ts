/**
 * POST /api/admin/ai-insights
 * Admin-only, read-only. Fetches tickets + travel, computes metrics, calls AI with metrics only.
 * Vercel serverless compatible.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';
import { computeMetrics } from '@/app/lib/ai-insights-analytics';
import { getSystemPrompt, buildUserPrompt } from '@/app/lib/ai-insights-prompts';
import type { AIInsightsRequest, AIInsightsResponse, AIInsightsFilters } from '@/app/lib/ai-insights-types';

export const maxDuration = 30;

async function ensureAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return { ok: false as const, status: 403, error: 'Admin only' };
  }
  return { ok: true as const, supabase };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabase } = auth;

    const body: AIInsightsRequest = await request.json();
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const filters: AIInsightsFilters = body.filters || {};

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
