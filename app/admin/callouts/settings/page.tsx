'use client';

import { useEffect, useState } from 'react';
import CalloutsNav from '../CalloutsNav';
import { calloutsApi } from '@/app/lib/callouts/client';

export default function CalloutsSettingsPage() {
  const [contractors, setContractors] = useState<
    { id: string; name: string; code: string; contractor_extraction_templates?: { doc_type: string; version: string }[] }[]
  >([]);

  useEffect(() => {
    calloutsApi.contractors().then((r) => setContractors(r.contractors ?? []));
  }, []);

  return (
    <div>
      <CalloutsNav />
      <h1 className="mb-6 text-2xl font-bold text-white">Contractors & templates</h1>
      <p className="mb-4 text-sm text-slate-400">
        Five contractors seeded with versioned extraction templates. Template JSON is stored in{' '}
        <code className="text-cyan-400">contractor_extraction_templates</code> and loaded by the Python worker.
      </p>
      <ul className="space-y-4">
        {contractors.map((c) => (
          <li key={c.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="font-medium text-white">{c.name}</p>
            <p className="text-xs text-slate-500">{c.code}</p>
            <ul className="mt-2 text-sm text-slate-400">
              {(c.contractor_extraction_templates ?? []).map((t, i) => (
                <li key={i}>
                  {t.doc_type} — v{t.version}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
