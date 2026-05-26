'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import CalloutsNav from '../../CalloutsNav';
import { useAuth } from '@/app/context/AuthContext';
import { useCalloutsApi } from '@/app/lib/callouts/client';

export default function CalloutRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { loading: authLoading } = useAuth();
  const calloutsApi = useCalloutsApi();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [editField, setEditField] = useState({ docId: '', key: '', value: '' });

  const load = () => {
    if (!id) return;
    calloutsApi.record(id).then(setData).catch(console.error);
  };

  useEffect(() => {
    if (authLoading || !id) return;
    load();
  }, [id, authLoading, calloutsApi]);

  const record = data?.record as Record<string, unknown> | undefined;
  const documents = (data?.documents ?? []) as Record<string, unknown>[];
  const flags = (data?.flags ?? []) as Record<string, unknown>[];
  const audit = (data?.audit ?? []) as Record<string, unknown>[];
  const fieldValues = (data?.fieldValues ?? []) as Record<string, unknown>[];
  const suggestions = (data?.linkSuggestions ?? []) as Record<string, unknown>[];

  const viewPdf = async (docId: string) => {
    const { url } = await calloutsApi.pdfUrl(docId);
    setPdfUrl(url);
  };

  const saveField = async () => {
    if (!editField.docId || !editField.key) return;
    await calloutsApi.patchField(editField.docId, {
      fieldKey: editField.key,
      value: editField.value,
      reason: 'Manual review correction',
    });
    setEditField({ docId: '', key: '', value: '' });
    load();
  };

  const reviewFlag = async (flagId: string, status: string) => {
    await calloutsApi.patchFlag(flagId, { status, reviewNote: 'Reviewed in UI' });
    load();
  };

  const approveRecord = async () => {
    await calloutsApi.patchRecord(id!, { status: 'approved' });
    load();
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    await calloutsApi.comment(id!, comment);
    setComment('');
    load();
  };

  return (
    <div>
      <CalloutsNav />
      {!record ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <>
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {String(record.primary_job_card_number ?? 'Callout record')}
              </h1>
              <p className="text-sm text-slate-400">
                {String(record.status)} · Compliance {String(record.compliance_score ?? '—')}
              </p>
              {typeof record.ai_summary === 'string' && record.ai_summary.length > 0 && (
                <p className="mt-2 max-w-2xl text-sm text-slate-300">{record.ai_summary}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void approveRecord()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
            >
              Approve record
            </button>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h2 className="mb-3 text-sm font-medium uppercase text-slate-400">Documents</h2>
              <ul className="space-y-2">
                {documents.map((d) => (
                  <li key={d.id as string} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      {String(d.doc_type)} — {String(d.file_name)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void viewPdf(d.id as string)}
                      className="text-cyan-400 hover:underline"
                    >
                      PDF
                    </button>
                  </li>
                ))}
              </ul>
              {pdfUrl && (
                <iframe title="PDF preview" src={pdfUrl} className="mt-4 h-96 w-full rounded-lg border border-slate-700" />
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h2 className="mb-3 text-sm font-medium uppercase text-slate-400">Open flags</h2>
              <ul className="space-y-3">
                {flags.filter((f) => f.status === 'open').map((f) => (
                  <li key={f.id as string} className="rounded-xl bg-slate-950 p-3 text-sm">
                    <p className="font-medium text-white">{String(f.title)}</p>
                    <p className="text-xs text-slate-500">{String(f.flag_type)} · {String(f.severity)}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void reviewFlag(f.id as string, 'false_positive')}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewFlag(f.id as string, 'approved')}
                        className="text-xs text-cyan-400"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </li>
                ))}
                {!flags.filter((f) => f.status === 'open').length && (
                  <p className="text-slate-500">No open flags</p>
                )}
              </ul>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-sm font-medium uppercase text-slate-400">Extracted fields (correctable)</h2>
            <div className="space-y-2 text-sm">
              {fieldValues.map((fv) => (
                <div key={fv.id as string} className="flex flex-wrap gap-2 text-slate-300">
                  <span className="text-slate-500">{String(fv.field_key)}:</span>
                  <span>{String(fv.value_text ?? fv.value_numeric ?? '')}</span>
                  <button
                    type="button"
                    className="text-xs text-cyan-400"
                    onClick={() =>
                      setEditField({
                        docId: String(fv.document_id),
                        key: String(fv.field_key),
                        value: String(fv.value_text ?? ''),
                      })
                    }
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
            {editField.docId && (
              <div className="mt-4 flex gap-2">
                <input
                  value={editField.value}
                  onChange={(e) => setEditField({ ...editField, value: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <button type="button" onClick={() => void saveField()} className="rounded-lg bg-cyan-600 px-3 py-2 text-white">
                  Save
                </button>
              </div>
            )}
          </section>

          {suggestions.length > 0 && (
            <section className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h2 className="mb-3 text-sm font-medium text-amber-300">Link suggestions (manual accept only)</h2>
              {suggestions.map((s) => (
                <div key={s.id as string} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Confidence {(Number(s.confidence) * 100).toFixed(0)}%</span>
                  <button
                    type="button"
                    onClick={() => void calloutsApi.acceptSuggestion(s.id as string).then(load)}
                    className="text-cyan-400"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </section>
          )}

          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-sm font-medium uppercase text-slate-400">Audit timeline</h2>
            <ul className="max-h-64 space-y-2 overflow-y-auto text-xs text-slate-400">
              {audit.map((a) => (
                <li key={a.id as string}>
                  <span className="text-slate-500">{new Date(String(a.created_at)).toLocaleString()}</span>
                  {' — '}
                  <span className="text-slate-300">{String(a.action)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-sm font-medium uppercase text-slate-400">Internal notes</h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"
              rows={2}
            />
            <button
              type="button"
              onClick={() => void addComment()}
              className="mt-2 rounded-xl bg-slate-700 px-4 py-2 text-sm text-white"
            >
              Add comment
            </button>
          </section>
        </>
      )}
    </div>
  );
}
