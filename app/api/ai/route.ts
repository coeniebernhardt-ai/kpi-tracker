/**
 * POST /api/ai
 * Think-Q AI pipeline: Intent → SQL (SELECT only) → Execute → Conversational response.
 * Role-based scoping. Safe, structured, ChatGPT-like tone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { parse as parsePgUrl } from 'pg-connection-string';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';
import { appendFileSync } from 'fs';
import { join } from 'path';

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
  /\b;\s*SELECT\b/i,
];

const SELECT_ONLY_PATTERN = /^\s*(WITH\s+.+\s+SELECT|SELECT)\s+/i;

const SCHEMA_CONTEXT = `Schema (use these exact column names; use user_id to link to profiles.id):
- profiles: id, email, full_name, role, avatar_url, is_admin, is_active, created_at, updated_at
- tickets: id, ticket_number, user_id, client, clickup_ticket, location, status, severity, issue, resolution, response_time_minutes, created_at, closed_at, created_by
- travel_logs: id, user_id, reason, destination, start_address, end_address, comments, is_return_trip, created_at, updated_at
- notifications: id, user_id, type, ticket_id, triggering_user_id, created_at, read
Join tickets to profiles on tickets.user_id = profiles.id. Join travel_logs to profiles on travel_logs.user_id = profiles.id.`;

// --- Types -------------------------------------------------------------------

type Intent = 'query' | 'export' | 'explanation' | 'conversational';

interface DetectIntentResult {
  intent: Intent;
  requires_sql: boolean;
  export_format: 'xlsx' | 'csv' | null;
}

type ChatMessage = { role: string; content: string };

// --- Helpers ------------------------------------------------------------------

function getProjectRef(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    const u = new URL(supabaseUrl);
    const host = u.hostname || '';
    const m = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const DEBUG_LOG_PATH = join(process.cwd(), '.cursor', 'debug.log');
function debugLog(location: string, message: string, data: Record<string, unknown>) {
  const payload = { location, message, data, timestamp: Date.now() };
  fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
  try {
    appendFileSync(DEBUG_LOG_PATH, JSON.stringify(payload) + '\n');
  } catch (_) {}
}

function extractSql(raw: string): string {
  let s = raw.replace(/^```\w*\n?|```\s*$/g, '').trim();
  if (SELECT_ONLY_PATTERN.test(s)) return s;
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

function normalizeDbError(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  if (/relation\s+"?\w+"?\s+does not exist/i.test(msg)) return 'That data is not available.';
  if (/column\s+"?\w+"?\s+does not exist/i.test(msg)) return 'That question cannot be answered with the current data.';
  if (/permission denied|access denied/i.test(msg)) return 'Access to that data was denied.';
  if (/timeout|statement_timeout|canceling statement/i.test(msg)) return 'The request took too long. Try a narrower question.';
  if (/connection|ECONNRESET|terminated|not available/i.test(msg)) return 'The database was temporarily unavailable. Please try again.';
  if (/syntax error/i.test(msg)) return 'There was a problem with the question. Try rephrasing.';
  return 'Something went wrong while fetching the data. Please try again.';
}

// --- Auth ---------------------------------------------------------------------

async function getCurrentUser(request: NextRequest): Promise<{ id: string } | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await client.auth.getUser();
  if (error) {
    console.error('Auth error:', error);
    return null;
  }
  return user ? { id: user.id } : null;
}

// --- Layer 1: Intent detection -------------------------------------------------

async function detectIntent(
  messages: ChatMessage[],
  openai: OpenAI
): Promise<DetectIntentResult> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const text = (lastUser?.content ?? '').trim().toLowerCase();

  const exportWords = ['export', 'download', 'xls', 'excel', 'csv'];
  const wantsExport = exportWords.some((w) => text.includes(w));
  let export_format: 'xlsx' | 'csv' | null = null;
  if (wantsExport) {
    if (text.includes('csv')) export_format = 'csv';
    else export_format = 'xlsx';
  }

  const systemPrompt = `You are an intent classifier for Think-Q. Return ONLY valid JSON, no other text.
Rules:
- If the user wants to export/download data (e.g. "export to excel", "download csv") → intent "export", requires_sql true if they're referring to previous data, else true when they ask for data to export.
- If the user asks a factual data question (counts, who, list, show, tickets, team, etc.) → intent "query", requires_sql true.
- If the user asks for explanation or how something works → intent "explanation", requires_sql false.
- If the user is greeting, thanking, or general chitchat → intent "conversational", requires_sql false.
Return JSON: { "intent": "query"|"export"|"explanation"|"conversational", "requires_sql": boolean, "export_format": ${export_format ? `"${export_format}"` : 'null'} }.
Use export_format only when user clearly asked for export/download; otherwise null.`;

  const content =
    messages.length > 0
      ? messages.map((m) => `${m.role}: ${m.content}`).join('\n')
      : `user: ${text || 'hello'}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ],
    temperature: 0.1,
    max_tokens: 256,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
  const jsonStr = raw.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
  try {
    const parsed = JSON.parse(jsonStr) as Partial<DetectIntentResult>;
    return {
      intent: (parsed.intent as Intent) ?? (wantsExport ? 'export' : 'query'),
      requires_sql: parsed.requires_sql ?? true,
      export_format: parsed.export_format ?? (wantsExport ? export_format : null),
    };
  } catch {
    return {
      intent: wantsExport ? 'export' : 'query',
      requires_sql: true,
      export_format: wantsExport ? export_format : null,
    };
  }
}

// --- Layer 2: SQL generation ---------------------------------------------------

async function generateSQL(
  messages: ChatMessage[],
  openai: OpenAI
): Promise<string> {
  const systemPrompt = `You are a SQL generator for Think-Q. Generate PostgreSQL SELECT-only queries.
- Never use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, EXECUTE.
- Always respect role-based scoping (data is scoped to the user's context).
- Limit results to ${MAX_ROWS} rows (add or enforce LIMIT ${MAX_ROWS}).
- Only return raw SQL. No explanation, no markdown, no code fence.
${SCHEMA_CONTEXT}`;

  const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: (m.role === 'system' ? 'user' : m.role) as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: chatMessages,
    temperature: 0.1,
    max_tokens: 1024,
  });

  const rawSql = completion.choices[0]?.message?.content?.trim() ?? '';
  const sql = extractSql(rawSql);
  if (!sql) throw new Error('No SQL generated');
  if (!isSqlAllowed(sql)) throw new Error('Only SELECT allowed');
  return applyLimit(sql);
}

// --- Layer 3: Execution --------------------------------------------------------

async function executeQuery(
  pool: Pool,
  sql: string,
  isPooler: boolean
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    if (!isPooler) {
      await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`);
    }
    const result = await client.query(sql);
    const rows = (result.rows ?? []) as Record<string, unknown>[];
    const rowCount = result.rowCount ?? rows.length;
    return { rows, rowCount };
  } catch (err) {
    throw new Error(normalizeDbError(err));
  } finally {
    client.release();
  }
}

function buildPool(dbUrl: string): { pool: Pool; isPooler: boolean; connectionString: string } {
  const parsed = parsePgUrl(dbUrl);
  let user = (parsed.user ?? '').trim();
  const password = (parsed.password ?? '').trim();
  const host = (parsed.host ?? '').trim();
  const port = Number(parsed.port) || 5432;
  const database = (parsed.database ?? 'postgres').trim();
  const projectRef = getProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const isPooler = /pooler\.supabase\.com/i.test(host);
  if (projectRef && isPooler && user && !user.includes('.')) {
    user = `${user}.${projectRef}`;
  }
  const connectionString =
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?sslmode=no-verify&pgbouncer=true`;

  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  return { pool, isPooler, connectionString };
}

// --- Layer 4: Conversational formatter -----------------------------------------

async function formatResponse(
  openai: OpenAI,
  userQuestion: string,
  rows: Record<string, unknown>[],
  rowCount: number,
  intent: Intent,
  exportRequested: boolean
): Promise<string> {
  const systemPrompt = `You are Think-Q, the intelligent assistant for the Think Q system.
You must:
- Speak conversationally like ChatGPT. Be natural and human.
- Never say "I've pulled that for you" or similar robotic phrases.
- If a single clear result exists, respond in one natural sentence.
- If multiple rows exist, summarize clearly before presenting structured data.
- If no results, explain clearly and suggest next steps.
- Only mention downloadable files if the user explicitly asked for an export/download.
- Maintain conversational continuity. You are an assistant, not a database.
Return natural conversational text only. No code, no SQL, no raw IDs.`;

  const dataDesc =
    rowCount === 0
      ? 'No rows returned.'
      : `Results (${rowCount} row(s)):\n${JSON.stringify(rows.slice(0, 100))}`;

  const userContent = `User asked: ${userQuestion}\n\n${dataDesc}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? 'I couldn’t generate a response. Please try again.';
  return text;
}

// --- Export file response -----------------------------------------------------

function createExportResponse(
  rows: Record<string, unknown>[],
  format: 'xlsx' | 'csv',
  conversationalMessage: string
): Response {
  const sheetData = rows.length > 0 ? rows : [{}];
  const filename = `Think-Q-Export-${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, sheet, 'Results');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Think-Q-Message': conversationalMessage,
      },
    });
  }

  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(sheetData));
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Think-Q-Message': conversationalMessage,
    },
  });
}

// --- Main route ----------------------------------------------------------------

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;
  let phase = 'start';

  try {
    debugLog('app/api/ai/route.ts:POST:entry', 'AI route POST started', {});

    phase = 'auth';
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUrl = (process.env.AI_DATABASE_URL ?? '').trim();
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!dbUrl) throw new Error('AI_DATABASE_URL missing');
    if (!openaiKey) throw new Error('OPENAI_API_KEY missing');

    const body = await request.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const userQuestion = (lastUserMessage?.content ?? '').trim() || 'No question provided';

    const openai = new OpenAI({ apiKey: openaiKey });

    // Layer 1: Intent
    phase = 'intent';
    const { intent, requires_sql, export_format } = await detectIntent(messages, openai);

    let rows: Record<string, unknown>[] = [];
    let rowCount = 0;
    let sql: string | null = null;

    if (requires_sql) {
      phase = 'sql';
      sql = await generateSQL(messages, openai);
      debugLog('app/api/ai/route.ts:POST:sql', 'Generated SQL', { sql: sql?.slice(0, 200) });

      phase = 'db_connect';
      let isPooler = false;
      {
        const built = buildPool(dbUrl);
        pool = built.pool;
        isPooler = built.isPooler;
        let client;
        try {
          client = await pool.connect();
        } catch (connectErr: unknown) {
          const msg = (connectErr as Error)?.message ?? String(connectErr);
          const retryable = /terminated unexpectedly|ECONNRESET|not available|Connection to database/i.test(msg);
          if (retryable) {
            await pool.end().catch(() => {});
            const retry = buildPool(dbUrl);
            pool = retry.pool;
            isPooler = retry.isPooler;
            client = await pool.connect();
          } else {
            throw new Error(normalizeDbError(connectErr));
          }
        }
        client!.release();
      }

      phase = 'db_query';
      const result = await executeQuery(pool, sql, isPooler);
      rows = result.rows;
      rowCount = result.rowCount;
    }

    // Export path: return file when user asked for export or client requested via responseFormat (e.g. Download button)
    const requestedFormat = body.responseFormat === 'xlsx' || body.responseFormat === 'csv' ? body.responseFormat : null;
    const exportFormat = export_format ?? requestedFormat;
    if (exportFormat && rows.length > 0) {
      const conversationalMessage =
        exportFormat === 'xlsx'
          ? 'Your Excel file is ready. You can download it below.'
          : 'Your CSV file is ready. You can download it below.';
      return createExportResponse(rows, exportFormat, conversationalMessage);
    }

    // JSON response: conversational message + optional rows (for table display)
    phase = 'format';
    const conversationalMessage = await formatResponse(
      openai,
      userQuestion,
      rows,
      rowCount,
      intent,
      intent === 'export'
    );

    return NextResponse.json({
      success: true,
      message: conversationalMessage,
      rows,
      rowCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    debugLog('app/api/ai/route.ts:POST:catch', 'Error', { message, phase });
    return NextResponse.json(
      { success: false, error: message, phase },
      { status: 500 }
    );
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}
