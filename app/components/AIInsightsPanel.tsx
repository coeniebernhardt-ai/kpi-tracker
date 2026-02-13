'use client';

/**
 * Ask – premium intelligence assistant. Natural language → insights.
 * No SQL or technical details exposed. Download: Excel, CSV, or PDF.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AIInsightsPanelProps {
  filters?: Record<string, unknown>;
}

type AIMessage = { role: 'user' | 'assistant'; content: string };
type AIResult = { rows: Record<string, unknown>[]; rowCount: number };

const INTERNAL_COLUMNS = new Set([
  'id', 'user_id', 'ticket_id', 'created_by', 'triggering_user_id', 'profile_id',
]);

function getDisplayColumns(row: Record<string, unknown>): string[] {
  return Object.keys(row).filter((k) => !INTERNAL_COLUMNS.has(k));
}

function friendlyColumnName(key: string): string {
  const map: Record<string, string> = {
    full_name: 'Name',
    ticket_number: 'Ticket',
    client: 'Client',
    status: 'Status',
    severity: 'Priority',
    issue: 'Issue',
    resolution: 'Resolution',
    response_time_minutes: 'Response (min)',
    created_at: 'Date',
    closed_at: 'Closed',
    reason: 'Reason',
    destination: 'Destination',
    type: 'Type',
    read: 'Read',
  };
  return map[key] ?? key.replace(/_/g, ' ');
}

function toConversationalSummary(rowCount: number, question: string): string {
  const q = question.toLowerCase();
  if (rowCount === 0) return "Nothing came up for that. Try asking in a different way or broadening the question—happy to try again.";
  if (/\bhow many\b/.test(q) || /\bcount\b/.test(q)) {
    return `That’s ${rowCount} ${rowCount === 1 ? 'result' : 'results'} in total.`;
  }
  if (/\bopen\b.*\bticket/.test(q)) return `Right now there ${rowCount === 1 ? 'is' : 'are'} ${rowCount} open ticket${rowCount !== 1 ? 's' : ''}.`;
  if (/\bclosed\b.*\bticket/.test(q)) return `There ${rowCount === 1 ? 'is' : 'are'} ${rowCount} closed ticket${rowCount !== 1 ? 's' : ''} in the data.`;
  return `Here are ${rowCount} ${rowCount === 1 ? 'result' : 'results'} that match.`;
}

export default function AIInsightsPanel({ filters = {} }: AIInsightsPanelProps) {
  const { session } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [lastResult, setLastResult] = useState<AIResult | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, lastResult]);

  useEffect(() => {
    function closeDropdown(e: MouseEvent) {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) setDownloadOpen(false);
    }
    if (downloadOpen) {
      document.addEventListener('click', closeDropdown);
      return () => document.removeEventListener('click', closeDropdown);
    }
  }, [downloadOpen]);

  const getAuthHeaders = (): HeadersInit => {
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      (h as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`;
    }
    return h;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLastResult(null);

    try {
      const nextMessages = [...messages, { role: 'user' as const, content: q }];
      const res = await fetch('/api/ai', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          responseFormat: 'json',
          accessToken: session?.access_token ?? undefined,
        }),
      });

      const contentType = res.headers.get('Content-Type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong on our side. Please try again in a moment.");
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        if (data.success && data.rows !== undefined) {
          const rows = data.rows ?? [];
          const rowCount = data.rowCount ?? rows.length;
          setLastResult({ rows, rowCount });
          const summary = toConversationalSummary(rowCount, q);
          const followUp = rowCount > 0
            ? '\n\nIf it helps, you can ask to break it down by team member or to see the most recent ones.'
            : '';
          setMessages((prev) => [...prev, { role: 'assistant', content: summary + followUp }]);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.error ?? "I couldn’t get that one—mind rephrasing or asking something slightly different?" }]);
        }
      } else {
        setError("Something went wrong. Give it another try when you’re ready.");
        setMessages((prev) => prev.slice(0, -1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (messages.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          responseFormat: format,
          accessToken: session?.access_token ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Download failed.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      a.download = `AI-Export-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (!lastResult || lastResult.rows.length === 0) return;
    const cols = getDisplayColumns(lastResult.rows[0]);
    const headers = cols.map((k) => friendlyColumnName(k));
    const body = lastResult.rows.map((row) =>
      cols.map((k) => row[k] != null ? String(row[k]) : '')
    );
    const doc = new jsPDF();
    autoTable(doc, { head: [headers], body, styles: { fontSize: 9 } });
    doc.save(`AI-Export-${new Date().toISOString().slice(0, 10)}.pdf`);
    setDownloadOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-[400px] overflow-y-auto rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              m.role === 'user' ? 'bg-blue-500/10 text-blue-100 ml-4' : 'bg-slate-700/50 text-slate-200 mr-4'
            }`}
          >
            <span className="font-medium text-slate-400">{m.role === 'user' ? 'You' : 'Think-Q'}: </span>
            <span className="whitespace-pre-wrap">{m.content}</span>
          </div>
        ))}
        {loading && (
          <div className="rounded-lg px-3 py-2 text-sm bg-slate-700/50 text-slate-400">
            Looking that up…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {lastResult && lastResult.rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-700">
                {getDisplayColumns(lastResult.rows[0]).map((key) => (
                  <th key={key} className="px-3 py-2 font-medium text-slate-300 whitespace-nowrap">
                    {friendlyColumnName(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lastResult.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-slate-700/50 last:border-0">
                  {getDisplayColumns(lastResult.rows[0]).map((key) => (
                    <td key={key} className="px-3 py-2 text-slate-200">
                      {row[key] != null ? String(row[key]) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder=""
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-blue-500"
          disabled={loading}
          aria-label="Ask a question"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>

      {messages.length > 0 && (
        <div className="relative" ref={downloadRef}>
          <button
            type="button"
            onClick={() => setDownloadOpen((o) => !o)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          {downloadOpen && (
            <div className="absolute left-0 top-full mt-1 py-1 rounded-lg bg-slate-800 border border-slate-700 shadow-xl z-10 min-w-[160px]">
              <button
                type="button"
                onClick={() => handleExport('xlsx')}
                className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
              >
                CSV (.csv)
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!lastResult || lastResult.rows.length === 0}
                className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                PDF (.pdf)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
