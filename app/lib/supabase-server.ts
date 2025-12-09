import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Server-side Supabase client with enhanced security
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = cookies();
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Server-side doesn't persist
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => {
          return cookieStore.get(key)?.value ?? null;
        },
        setItem: (key: string, value: string) => {
          cookieStore.set(key, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });
        },
        removeItem: (key: string) => {
          cookieStore.delete(key);
        },
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'kpi-tracker-server',
      },
    },
  });
}

// Validate request origin for server-side operations
export function validateRequestOrigin(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = [
    'https://kpi-tracker-six.vercel.app',
    'https://kpi-tracker.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  return allowedOrigins.includes(origin);
}

// Validate request payload
export function validateRequestPayload(payload: unknown): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload format' };
  }

  // Check for suspicious patterns
  const payloadStr = JSON.stringify(payload);
  
  // Prevent SQL injection patterns
  if (/['";\\]/.test(payloadStr) && /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i.test(payloadStr)) {
    return { valid: false, error: 'Invalid characters detected' };
  }

  // Prevent XSS patterns
  if (/<script|javascript:|onerror=|onload=/i.test(payloadStr)) {
    return { valid: false, error: 'Invalid content detected' };
  }

  // Check payload size (max 1MB)
  if (payloadStr.length > 1024 * 1024) {
    return { valid: false, error: 'Payload too large' };
  }

  return { valid: true };
}
