'use client';

export async function scFetch(
  path: string,
  options: RequestInit & { accessToken?: string | null } = {}
) {
  const { accessToken, ...init } = options;
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, { ...init, credentials: 'include', headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`) as Error & {
      data?: unknown;
      status?: number;
    };
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}
