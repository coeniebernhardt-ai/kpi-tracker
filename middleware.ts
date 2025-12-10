import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins - add your production domain
const ALLOWED_ORIGINS = [
  'https://kpi-tracker-six.vercel.app',
  'https://kpi-tracker.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // Max requests per window
};

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
              request.headers.get('x-real-ip') || 
              request.headers.get('cf-connecting-ip') ||
              'unknown';
  return `rate_limit_${ip}`;
}

function checkRateLimit(request: NextRequest): boolean {
  const key = getRateLimitKey(request);
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT.windowMs);

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Allow same-origin requests (no origin header)
  if (!origin) {
    return true;
  }

  // Check against allowed origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (ALLOWED_ORIGINS.includes(refererOrigin)) {
        return true;
      }
    } catch {
      // Invalid referer URL
    }
  }

  return false;
}

function validateRequest(request: NextRequest): boolean {
  // Check for suspicious headers
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    return false;
  }

  // Check content-type for POST/PUT requests
  const method = request.method;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Allow form-data and other valid types
      if (!contentType?.includes('multipart/form-data') && 
          !contentType?.includes('application/x-www-form-urlencoded')) {
        return false;
      }
    }
  }

  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api/health') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Rate limiting
  if (!checkRateLimit(request)) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900', // 15 minutes
        },
      }
    );
  }

  // Origin validation for API-like routes
  if (pathname.startsWith('/api') || pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!validateOrigin(request)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid origin',
          code: 'INVALID_ORIGIN'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Request validation
  if (!validateRequest(request)) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Invalid request',
        code: 'INVALID_REQUEST'
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Security headers
  const response = NextResponse.next();
  
  // CORS headers (only for allowed origins)
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  // Check for authentication on protected routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get('sb-access-token') || 
                          request.cookies.get('sb-refresh-token') ||
                          request.cookies.get('supabase-auth-token');
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};


