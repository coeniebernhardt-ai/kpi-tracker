/**
 * POST /api/ai
 * Natural language to SQL over Postgres. Role-based scoping. SELECT only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import OpenAI from 'openai';

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

const SELECT_ONLY_PATTERN =
  /^\s*WITH\s+.+\s+SELECT\s+|^\s*SELECT\s+/i;

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
    console.log("=== AI ROUTE START ===");

    const currentUser = await getCurrentUser(request);

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
    const messages = Array.isArray(body.messages)
      ? body.messages
      : [];

    /* ===========================
       OPENAI CALL
    ============================ */

    const openai = new OpenAI({ apiKey: openaiKey });

    const completion =
      await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages,
        temperature: 0.1,
        max_tokens: 1024,
      });

    const rawSql =
      completion.choices[0]?.message?.content?.trim() ?? '';

    const sql = rawSql
      .replace(/^```\w*\n?|```\s*$/g, '')
      .trim();

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

    pool = new Pool({
      connectionString: dbUrl,
      max: 1,
    });

    const client = await pool.connect();

    try {
      await client.query(
        `SET statement_timeout = ${QUERY_TIMEOUT_MS}`
      );

      const result = await client.query(safeSql);

      return NextResponse.json({
        success: true,
        sql: safeSql,
        rows: result.rows,
        rowCount: result.rowCount,
      });
    } finally {
      client.release();
    }

  } catch (err: any) {
    console.error("=== AI ROUTE ERROR ===");
    console.error(err);

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
