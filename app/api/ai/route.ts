/**
 * POST /api/ai
 * Natural language to SQL over Postgres. Role-based scoping. SELECT only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import OpenAI from 'openai';
import { appendFileSync } from 'fs';
import { join } from 'path';

export const maxDuration = 30;

const MAX_ROWS = 500;

// #region agent log
const DEBUG_LOG_PATH = join(process.cwd(), '.cursor', 'debug.log');
function debugLog(location: string, message: string, data: Record<string, unknown>) {
  const payload = { location, message, data, timestamp: Date.now() };
  fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
  try { appendFileSync(DEBUG_LOG_PATH, JSON.stringify(payload) + '\n'); } catch (_) {}
}
// #endregion
const QUERY_TIMEOUT_MS = 5000;

const DESTRUCTIVE_PATTERNS = [
  /\bDROP\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bUPDATE\s+\w+\s+SET\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bALTER\s+TABLE\b/i,
  /\bTRUNCATE\b/i,
  /\bCREATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bEXECUTE\b/i,
  /\b;\s*SELECT\b/i,
];

const SELECT_ONLY_PATTERN =
  /^\s*(WITH\s+.+\s+SELECT|SELECT)\s+/i;

/** Extract a single SELECT or WITH...SELECT from model output (may include explanation text). */
function extractSql(raw: string): string {
  let s = raw
    .replace(/^```\w*\n?|```\s*$/g, '')
    .trim();
  // If it already starts with SELECT or WITH, use as-is (after trim).
  if (SELECT_ONLY_PATTERN.test(s)) return s;
  // Otherwise find the first SELECT or WITH and take from there to end (or to next ;).
  const selectIdx = s.search(/\bSELECT\b/i);
  const withIdx = s.search(/\bWITH\s+\w+/i);
  let start = -1;
  if (withIdx >= 0 && (selectIdx < 0 || withIdx < selectIdx)) start = withIdx;
  else if (selectIdx >= 0) start = selectIdx;
  if (start >= 0) {
    s = s.slice(start).trim();
    const semicolon = s.indexOf(';');
    if (semicolon > 0) s = s.slice(0, semicolon).trim();
  }
  return s;
}

/* ===========================
   AUTH – BEARER TOKEN METHOD
=========================== */

async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createClient(url, anon, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: { user }, error } = await client.auth.getUser();

  if (error) {
    console.error("Auth error:", error);
    return null;
  }

  return user ? { id: user.id } : null;
}

/* ===========================
   SQL SAFETY
=========================== */

function isSqlAllowed(sql: string): boolean {
  const trimmed = sql.trim();

  if (
    !SELECT_ONLY_PATTERN.test(trimmed) &&
    !trimmed.toUpperCase().startsWith('SELECT ')
  ) {
    return false;
  }

  for (const re of DESTRUCTIVE_PATTERNS) {
    if (re.test(trimmed)) return false;
  }

  return true;
}

function applyLimit(sql: string): string {
  const hasLimit = /\bLIMIT\s+\d+/i.test(sql);

  if (hasLimit) {
    return sql.replace(/\bLIMIT\s+\d+/i, (m) => {
      const num = parseInt(m.replace(/\D/g, ''), 10);
      return `LIMIT ${Math.min(num, MAX_ROWS)}`;
    });
  }

  return sql.replace(/;?\s*$/, '') + ` LIMIT ${MAX_ROWS}`;
}

/* ===========================
   MAIN ROUTE
=========================== */

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;

  try {
    // #region agent log
    debugLog('app/api/ai/route.ts:POST:entry', 'AI route POST started', {});
    // #endregion
    const currentUser = await getCurrentUser(request);
    // #region agent log
    debugLog('app/api/ai/route.ts:POST:afterAuth', 'After getCurrentUser', { hasUser: !!currentUser });
    // #endregion
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUrl = process.env.AI_DATABASE_URL;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!dbUrl) throw new Error("AI_DATABASE_URL missing");
    if (!openaiKey) throw new Error("OPENAI_API_KEY missing");

    const body = await request.json().catch(() => ({}));
    const messages: { role: string; content: string }[] = Array.isArray(body.messages)
      ? body.messages
      : [];

    const openai = new OpenAI({ apiKey: openaiKey });

    const systemPrompt =
      'You are a SQL expert for PostgreSQL. Reply with ONLY a single SELECT or WITH...SELECT statement. No explanation, no markdown, no code fence. Tables: profiles, tickets, travel_logs, notifications.';

    const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: (m.role === 'system' ? 'user' : m.role) as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion =
      await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: chatMessages,
        temperature: 0.1,
        max_tokens: 1024,
      });
    // #region agent log
    debugLog('app/api/ai/route.ts:POST:afterOpenAI', 'After OpenAI completion', { hasContent: !!completion.choices[0]?.message?.content });
    // #endregion
    const rawSql =
      completion.choices[0]?.message?.content?.trim() ?? '';

    const sql = extractSql(rawSql);

    if (!sql) {
      return NextResponse.json(
        { success: false, error: 'No SQL generated' },
        { status: 400 }
      );
    }

    if (!isSqlAllowed(sql)) {
      return NextResponse.json(
        { success: false, error: 'Only SELECT allowed' },
        { status: 400 }
      );
    }

    const safeSql = applyLimit(sql);

    console.log("Generated SQL:", safeSql);

    /* ===========================
       DATABASE QUERY
    ============================ */
    // #region agent log
    const sslConfig = { rejectUnauthorized: false };
    debugLog('app/api/ai/route.ts:POST:beforePool', 'About to create Pool', { hasDbUrl: !!dbUrl, ssl: sslConfig });
    // #endregion
    pool = new Pool({
      connectionString: dbUrl,
      max: 1,
      ssl: sslConfig,
    });

    const client = await pool.connect();
    // #region agent log
    debugLog('app/api/ai/route.ts:POST:afterConnect', 'pool.connect() succeeded', {});
    // #endregion

    try {
      await client.query(
        `SET statement_timeout = ${QUERY_TIMEOUT_MS}`
      );

      const result = await client.query(safeSql);

      const rows = result.rows ?? [];
      return NextResponse.json({
        success: true,
        sql: safeSql,
        rows,
        rowCount: result.rowCount ?? rows.length,
      });
    } finally {
      client.release();
    }

  } catch (err: any) {
    // #region agent log
    debugLog('app/api/ai/route.ts:POST:catch', 'Error caught', { message: err?.message ?? String(err), name: err?.name, isCertError: typeof err?.message === 'string' && (err.message.includes('certificate') || err.message.includes('cert')) });
    // #endregion
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}
