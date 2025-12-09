import { NextResponse } from 'next/server';

/**
 * Health check endpoint (excluded from security middleware)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

