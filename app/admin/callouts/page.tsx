'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CalloutsNav from './CalloutsNav';
import { calloutsApi } from '@/app/lib/callouts/client';

export default function CalloutsDashboardPage() {
  const [analytics, setAnalytics] = useState<{
    totals?: { records: number; openFlags: number; documents: number; needsReview: number; failedDocuments: number };
  } | null>(null);
  const [monitoring, setMonitoring] = useState<{ jobs?: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([calloutsApi.analytics(), calloutsApi.monitoring()])
      .then(([a, m]) => {
        setAnalytics(a);
        setMonitoring(m);
      })
      .catch((e) => setError(e.message));
  }, []);

  const t = analytics?.totals;

  return (
    <div>
      <CalloutsNav />
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Contractor Callout Intelligence</h1>
        <p className="mt-1 text-sm text-slate-400">
          Job cards, invoices, compliance scoring, and operational flags. Internal use only — not an accounting system.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error} — run SQL migrations in Supabase if tables are missing.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Callout records', value: t?.records ?? '—', href: '/admin/callouts/records' },
          { label: 'Open flags', value: t?.openFlags ?? '—', href: '/admin/callouts/review' },
          { label: 'Documents', value: t?.documents ?? '—', href: '/admin/callouts/documents' },
          { label: 'Needs review', value: t?.needsReview ?? '—', href: '/admin/callouts/records?status=needs_review' },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-cyan-500/30"
          >
            <p className="text-xs uppercase tracking-wider text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
          </Link>
        ))}
      </div>

      {monitoring?.jobs && (
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400">Processing queue</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {Object.entries(monitoring.jobs).map(([k, v]) => (
              <span key={k} className="text-slate-300">
                <span className="text-slate-500">{k}:</span> {v}
              </span>
            ))}
          </div>
          {'workerNote' in (monitoring as object) && (
            <p className="mt-2 text-xs text-slate-500">{(monitoring as { workerNote?: string }).workerNote}</p>
          )}
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/callouts/upload"
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
        >
          Upload PDFs
        </Link>
        <Link
          href="/admin/callouts/analytics"
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          View analytics
        </Link>
      </div>
    </div>
  );
}
