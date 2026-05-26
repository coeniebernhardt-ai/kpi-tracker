'use client';

import { useCallback, useEffect, useState } from 'react';
import CalloutsNav from '../CalloutsNav';
import { useAuth } from '@/app/context/AuthContext';
import { useCalloutsApi } from '@/app/lib/callouts/client';

type Contractor = { id: string; name: string; code: string };

export default function CalloutsUploadPage() {
  const { loading: authLoading } = useAuth();
  const calloutsApi = useCalloutsApi();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorId, setContractorId] = useState('');
  const [docType, setDocType] = useState<'job_card' | 'invoice'>('job_card');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchName, setBatchName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    calloutsApi.contractors().then((r) => {
      setContractors(r.contractors ?? []);
      if (r.contractors?.[0]) setContractorId(r.contractors[0].id);
    }).catch(() => setStatus('Failed to load contractors'));
  }, [authLoading, calloutsApi]);

  const startBatch = async () => {
    if (!batchName.trim() || !contractorId) return;
    const { batch } = await calloutsApi.createBatch({ name: batchName, contractorId });
    setBatchId(batch.id);
    setStatus(`Batch created: ${batch.name}`);
  };

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || !contractorId) return;
      setUploading(true);
      setStatus(null);
      let ok = 0;
      let fail = 0;
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('contractorId', contractorId);
        fd.append('docType', docType);
        fd.append('source', batchId ? 'bulk_import' : 'manual');
        if (batchId) fd.append('batchId', batchId);
        try {
          await calloutsApi.upload(fd);
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      setStatus(`Uploaded ${ok} file(s)${fail ? `, ${fail} failed` : ''}. Processing queued.`);
      setUploading(false);
    },
    [contractorId, docType, batchId],
  );

  return (
    <div>
      <CalloutsNav />
      <h1 className="mb-6 text-2xl font-bold text-white">Upload PDFs</h1>

      <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-400">
            Contractor
            <select
              value={contractorId}
              onChange={(e) => setContractorId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-400">
            Document type
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as 'job_card' | 'invoice')}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="job_card">Job card</option>
              <option value="invoice">Invoice</option>
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-dashed border-slate-600 p-8 text-center">
          <input
            type="file"
            accept="application/pdf"
            multiple
            disabled={uploading || !contractorId}
            onChange={(e) => void onFiles(e.target.files)}
            className="text-sm text-slate-400"
          />
          <p className="mt-2 text-xs text-slate-500">
            PDF only, max 25MB. Select <strong className="text-slate-300">Invoice</strong> for invoice PDFs and{' '}
            <strong className="text-slate-300">Job card</strong> for job cards — matching uses the document type.
          </p>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <p className="text-sm font-medium text-slate-300">Bulk historical import</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Batch name"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => void startBatch()}
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
            >
              Create batch
            </button>
            {batchId && <span className="text-xs text-cyan-400">Active batch: {batchId.slice(0, 8)}…</span>}
          </div>
        </div>

        {status && <p className="text-sm text-cyan-300">{status}</p>}
      </div>
    </div>
  );
}
