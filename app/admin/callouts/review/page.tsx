'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CalloutsNav from '../CalloutsNav';
import { useAuth } from '@/app/context/AuthContext';
import { useCalloutsApi } from '@/app/lib/callouts/client';

export default function CalloutsReviewPage() {
  const { loading: authLoading } = useAuth();
  const calloutsApi = useCalloutsApi();
  const [flags, setFlags] = useState<Record<string, unknown>[]>([]);

  const load = () => calloutsApi.flags('status=open').then((r) => setFlags(r.flags ?? []));

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, calloutsApi]);

  const review = async (id: string, status: string) => {
    await calloutsApi.patchFlag(id, { status, reviewNote: 'Review queue' });
    load();
  };

  return (
    <div>
      <CalloutsNav />
      <h1 className="mb-6 text-2xl font-bold text-white">Review queue</h1>
      <div className="space-y-3">
        {flags.map((f) => {
          const rec = f.callout_records as Record<string, unknown> | undefined;
          const contractors = rec?.contractors as { name?: string } | undefined;
          return (
            <div key={f.id as string} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{String(f.title)}</p>
                  <p className="text-xs text-slate-500">
                    {String(f.severity)} · {String(f.flag_type)}
                    {contractors?.name ? ` · ${contractors.name}` : ''}
                  </p>
                </div>
                {typeof rec?.id === 'string' && (
                  <Link href={`/admin/callouts/records/${rec.id}`} className="text-sm text-cyan-400">
                    Open record
                  </Link>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void review(f.id as string, 'false_positive')}
                  className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-300"
                >
                  False positive
                </button>
                <button
                  type="button"
                  onClick={() => void review(f.id as string, 'approved')}
                  className="rounded-lg bg-cyan-600/20 px-3 py-1 text-xs text-cyan-300"
                >
                  Acknowledge
                </button>
                <button
                  type="button"
                  onClick={() => void review(f.id as string, 'rejected')}
                  className="rounded-lg bg-rose-600/20 px-3 py-1 text-xs text-rose-300"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
        {!flags.length && <p className="text-slate-500">No open flags.</p>}
      </div>
    </div>
  );
}
