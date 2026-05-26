'use client';

import { useEffect, useState } from 'react';
import CalloutsNav from '../CalloutsNav';
import { useAuth } from '@/app/context/AuthContext';
import { useCalloutsApi } from '@/app/lib/callouts/client';

export default function CalloutsDocumentsPage() {
  const { loading: authLoading } = useAuth();
  const calloutsApi = useCalloutsApi();
  const [tab, setTab] = useState<'unlinked' | 'failed'>('unlinked');
  const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const refresh = () => {
    const q = tab === 'unlinked' ? 'unlinked=true' : 'failed=true';
    return calloutsApi.documents(q).then((r) => setDocuments(r.documents ?? []));
  };

  useEffect(() => {
    if (authLoading) return;
    if (authLoading) return;
    void refresh();
  }, [tab, authLoading, calloutsApi]);

  return (
    <div>
      <CalloutsNav />
      <h1 className="mb-6 text-2xl font-bold text-white">Documents</h1>
      <p className="mb-4 text-sm text-slate-400">
        Status <span className="text-amber-300">queued</span> means not processed yet — click Reprocess. Uploads are
        processed automatically on the server (no Python worker required for text-based PDFs).
      </p>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('unlinked')}
          className={`rounded-xl px-4 py-2 text-sm ${tab === 'unlinked' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}
        >
          Unlinked
        </button>
        <button
          type="button"
          onClick={() => setTab('failed')}
          className={`rounded-xl px-4 py-2 text-sm ${tab === 'failed' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'}`}
        >
          Failed
        </button>
      </div>
      <ul className="space-y-2">
        {documents.map((d) => (
          <li
            key={d.id as string}
            className="flex flex-wrap items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm"
          >
            <span className="text-slate-300">
              {String(d.file_name)} · {String(d.doc_type)} · {String(d.processing_status)}
            </span>
            <button
              type="button"
              disabled={processingId === d.id}
              onClick={() => {
                setProcessingId(d.id as string);
                void calloutsApi
                  .reprocess(d.id as string)
                  .then(() => refresh())
                  .finally(() => setProcessingId(null));
              }}
              className="text-cyan-400 hover:underline disabled:opacity-50"
            >
              {processingId === d.id ? 'Processing…' : 'Reprocess'}
            </button>
          </li>
        ))}
        {!documents.length && <p className="text-slate-500">None in this queue.</p>}
      </ul>
    </div>
  );
}
