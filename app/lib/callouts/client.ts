'use client';

async function calloutFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api/callouts${path}`, {
    ...init,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const calloutsApi = {
  contractors: () => calloutFetch('/contractors'),
  records: (params?: string) => calloutFetch(`/records${params ? `?${params}` : ''}`),
  record: (id: string) => calloutFetch(`/records/${id}`),
  patchRecord: (id: string, body: object) =>
    calloutFetch(`/records/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  flags: (params?: string) => calloutFetch(`/flags${params ? `?${params}` : ''}`),
  patchFlag: (id: string, body: object) =>
    calloutFetch(`/flags/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  documents: (params?: string) => calloutFetch(`/documents/list${params ? `?${params}` : ''}`),
  upload: (formData: FormData) => calloutFetch('/documents', { method: 'POST', body: formData }),
  createBatch: (body: object) =>
    calloutFetch('/batches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
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
    return `/api/callouts/export?${p}`;
  },
  acceptSuggestion: (id: string) => calloutFetch(`/link-suggestions/${id}/accept`, { method: 'POST' }),
  reprocess: (id: string) => calloutFetch(`/documents/${id}/reprocess`, { method: 'POST' }),
};
