'use client';

import { useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';

function buildCalloutsApi(accessToken?: string | null) {
  async function calloutFetch(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    const res = await fetch(`/api/callouts${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  return {
    contractors: () => calloutFetch('/contractors'),
    records: (params?: string) => calloutFetch(`/records${params ? `?${params}` : ''}`),
    record: (id: string) => calloutFetch(`/records/${id}`),
    patchRecord: (id: string, body: object) =>
      calloutFetch(`/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    flags: (params?: string) => calloutFetch(`/flags${params ? `?${params}` : ''}`),
    patchFlag: (id: string, body: object) =>
      calloutFetch(`/flags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    documents: (params?: string) => calloutFetch(`/documents/list${params ? `?${params}` : ''}`),
    upload: (formData: FormData) => calloutFetch('/documents', { method: 'POST', body: formData }),
    createBatch: (body: object) =>
      calloutFetch('/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    batch: (id: string) => calloutFetch(`/batches/${id}`),
    pdfUrl: (id: string) => calloutFetch(`/documents/${id}/pdf`),
    patchField: (docId: string, body: object) =>
      calloutFetch(`/documents/${docId}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    comment: (recordId: string, body: string) =>
      calloutFetch(`/records/${recordId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      }),
    search: (q: string, mode = 'keyword', contractorId?: string) => {
      const p = new URLSearchParams({ q, mode });
      if (contractorId) p.set('contractorId', contractorId);
      return calloutFetch(`/search?${p}`);
    },
    analytics: (contractorId?: string) => {
      const p = contractorId ? `?contractorId=${contractorId}` : '';
      return calloutFetch(`/analytics/overview${p}`);
    },
    monitoring: () => calloutFetch('/monitoring'),
    exportUrl: (format: string, contractorId?: string) => {
      const p = new URLSearchParams({ format });
      if (contractorId) p.set('contractorId', contractorId);
      const tokenParam = accessToken ? `&access_token=${encodeURIComponent(accessToken)}` : '';
      return `/api/callouts/export?${p}${tokenParam}`;
    },
    acceptSuggestion: (id: string) => calloutFetch(`/link-suggestions/${id}/accept`, { method: 'POST' }),
    reprocess: (id: string) => calloutFetch(`/documents/${id}/reprocess`, { method: 'POST' }),
  };
}

/** Callouts API with Bearer auth (required on Vercel preview). */
export function useCalloutsApi() {
  const { session } = useAuth();
  return useMemo(() => buildCalloutsApi(session?.access_token), [session?.access_token]);
}

/** @deprecated Use useCalloutsApi() in client components */
export const calloutsApi = buildCalloutsApi();
