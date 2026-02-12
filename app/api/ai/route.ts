/**
 * POST /api/ai
 * Natural language to SQL over Postgres. Role-based scoping. SELECT only.
 * Uses AI_DATABASE_URL, OPENAI_API_KEY. Optional XLSX export.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { Pool } from 'pg';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';

export const maxDuration = 30;

const MAX_ROWS = 500;
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
  /\b;\s*SELECT\b/i, // multiple statements
];

const SELECT_ONLY_PATTERN = /^\s*WITH\s+.+\s+SELECT\s+|^\s*SELECT\s+/i;

function getSupabaseAdmin() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error('Missing Supabase env');
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

/** Returns true if SQL is allowed (SELECT-only, no destructive). */
function isSqlAllowed(sql: string): boolean {
  const trimmed = sql.trim();
  if (!SELECT_ONLY_PATTERN.test(trimmed) && !trimmed.toUpperCase().startsWith('SELECT ')) {
    return false;
  }
  for (const re of DESTRUCTIVE_PATTERNS) {
    if (re.test(trimmed)) return false;
  }
  return true;
}

/** Ensure query has a limit and cap at MAX_ROWS. */
function applyLimit(sql: string): string {
  const upper = sql.toUpperCase().trim();
  const hasLimit = /\bLIMIT\s+\d+/i.test(upper);
  if (hasLimit) {
    return sql.replace(/\bLIMIT\s+\d+/i, (m) => {
      const num = parseInt(m.replace(/\D/g, ''), 10);
      const capped = Math.min(num, MAX_ROWS);
      return `LIMIT ${capped}`;
    });
  }
  return sql.trimEnd().replace(/;?\s*$/, '') + ` LIMIT ${MAX_ROWS}`;
}

const SCHEMA_CONTEXT = `
Public schema tables (PostgreSQL):

- profiles: id (uuid), email, full_name, role, is_admin (boolean), is_active, created_at, updated_at
- tickets: id, ticket_number, user_id, client, status, severity, issue, resolution, response_time_minutes, created_at, closed_at, created_by, assigned_to_array (uuid[]), ticket_type, estate_or_building, cml_location, site_name, target_date, location
- travel_logs: id, user_id, reason, start_address, end_address, distance_travelled, is_return_trip, created_at, comments
- notifications: id, user_id, type, ticket_id, read, created_at, title, message, image_url, deleted_at

Generate a single SELECT (or WITH ... SELECT). No semicolons or multiple statements. Use double quotes for identifiers if needed.
`;

function buildSystemPrompt(isAdmin: boolean, userId: string): string {
  const base = `You are a SQL expert. ${SCHEMA_CONTEXT} Reply with ONLY the SQL, no markdown or explanation.`;
  if (isAdmin) return base;
  return `${base}

CRITICAL: The user is a non-admin member. Restrict data as follows:
- For table "tickets": the query MUST include in the WHERE clause: (created_by = '${userId}' OR user_id = '${userId}' OR '${userId}' = ANY(assigned_to_array))
- For table "travel_logs": the query MUST include: user_id = '${userId}'
- For table "notifications": the query MUST include: user_id = '${userId}'
Do not return data from these tables without these filters.`;
}

/** Loose check that member-scoped tables in the query have user filter. */
function memberScopeCheck(sql: string, userId: string): boolean {
  const upper = sql.toUpperCase();
  const hasUserId = sql.includes(userId);
  if (upper.includes('FROM TICKETS') || upper.includes('JOIN TICKETS')) {
    if (!hasUserId) return false;
  }
  if (upper.includes('FROM TRAVEL_LOGS') || upper.includes('JOIN TRAVEL_LOGS')) {
    if (!hasUserId) return false;
  }
  if (upper.includes('FROM NOTIFICATIONS') || upper.includes('JOIN NOTIFICATIONS')) {
    if (!hasUserId) return false;
  }
  return true;
}

export interface AIRequestBody {
  messages?: { role: 'user' | 'assistant' | 'system'; content: string }[];
  responseFormat?: 'json' | 'xlsx';
  accessToken?: string;
}

export type AIResponseSuccess = {
  success: true;
  sql: string;
  rows: Record<string, unknown>[];
  rowCount: number;
};

export type AIResponseError = {
  success: false;
  error: string;
};

export type AIResponse = AIResponseSuccess | AIResponseError;

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    const isAdmin = profile?.is_admin === true;

    const dbUrl = process.env.AI_DATABASE_URL;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!dbUrl?.trim()) return NextResponse.json({ success: false, error: 'AI database not configured' }, { status: 503 });
    if (!openaiKey?.trim()) return NextResponse.json({ success: false, error: 'OpenAI not configured' }, { status: 503 });

    const body: AIRequestBody = await request.json().catch(() => ({}));
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = Array.isArray(body.messages) ? body.messages : [];
    const responseFormat = body.responseFormat === 'xlsx' ? 'xlsx' : 'json';
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : undefined;

    if (accessToken) {
      const u = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const authClient = createClient(u, anon, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
      const { data: { user } } = await authClient.auth.getUser();
      if (!user || user.id !== currentUser.id) {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      }
    }

    const openai = new OpenAI({ apiKey: openaiKey });
    const systemPrompt = buildSystemPrompt(isAdmin, currentUser.id);
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      temperature: 0.1,
      max_tokens: 1024,
    });
    const rawSql = completion.choices[0]?.message?.content?.trim() ?? '';
    const sql = rawSql.replace(/^```\w*\n?|```\s*$/g, '').trim();
    if (!sql) return NextResponse.json({ success: false, error: 'No SQL generated' }, { status: 400 });
    if (!isSqlAllowed(sql)) return NextResponse.json({ success: false, error: 'Only SELECT queries are allowed' }, { status: 400 });
    if (!isAdmin && !memberScopeCheck(sql, currentUser.id)) {
      return NextResponse.json({ success: false, error: 'Query must respect member data scope' }, { status: 403 });
    }
    const safeSql = applyLimit(sql);

    pool = new Pool({ connectionString: dbUrl, max: 1 });
    const client = await pool.connect();
    try {
      await client.query('SET statement_timeout = ' + String(QUERY_TIMEOUT_MS));
      const result = await client.query(safeSql);
      const rows = (result.rows ?? []) as Record<string, unknown>[];
      const rowCount = rows.length;

      if (responseFormat === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
        XLSX.utils.book_append_sheet(wb, ws, 'Data');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `AI-Export-${new Date().toISOString().slice(0, 10)}.xlsx`;
        return new NextResponse(buf, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
            'Cache-Control': 'private, no-cache',
          },
        });
      }

      const payload: AIResponseSuccess = { success: true, sql: safeSql, rows, rowCount };
      return NextResponse.json(payload);
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logSafeError('POST /api/ai', err);
    const msg = err instanceof Error ? err.message : getSafeErrorMessage(err);
    const timeout = typeof msg === 'string' && (msg.includes('timeout') || msg.includes('canceling statement'));
    return NextResponse.json(
      { success: false, error: timeout ? 'Query timed out' : getSafeErrorMessage(err) },
      { status: 500 }
    );
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
}
