'use client';

/**
 * Ask – premium intelligence assistant. Natural language → insights.
 * No SQL or technical details exposed. Download: Excel, CSV, or PDF.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Download, User, Bot } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Logo from './Logo';

export interface AIInsightsPanelProps {
  filters?: Record<string, unknown>;
}

type AIMessage = { role: 'user' | 'assistant'; content: string };
type AIResult = { rows: Record<string, unknown>[]; rowCount: number; showStructuredTable?: boolean };

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
  if (rowCount === 0) return "Nothing came up for that. Rephrase or broaden the question and I’ll try again.";
  if (/\bhow many\b/.test(q) || /\bcount\b/.test(q)) {
    if (/\bopen\b.*\bticket|ticket.*\bopen\b/.test(q)) return `You have ${rowCount} open ticket${rowCount !== 1 ? 's' : ''} right now.`;
    if (/\bclosed\b.*\bticket|ticket.*\bclosed\b/.test(q)) return `There ${rowCount === 1 ? 'is' : 'are'} ${rowCount} closed ticket${rowCount !== 1 ? 's' : ''} in the backlog.`;
    return `That comes to ${rowCount} in total.`;
  }
  if (/\bopen\b.*\bticket|ticket.*\bopen\b/.test(q)) return `You have ${rowCount} open ticket${rowCount !== 1 ? 's' : ''} at the moment.`;
  if (/\bclosed\b.*\bticket|ticket.*\bclosed\b/.test(q)) return `${rowCount} closed ticket${rowCount !== 1 ? 's' : ''} in the backlog.`;
  return `I’ve what I found—the summary.`;
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
          const showStructuredTable = data.showStructuredTable === true && rows.length > 0;
          setLastResult({ rows, rowCount, showStructuredTable });
          const content = typeof data.message === 'string' && data.message.trim()
            ? data.message
            : toConversationalSummary(rowCount, q);
          setMessages((prev) => [...prev, { role: 'assistant', content }]);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.error ?? "I wasn’t able to answer that. Try rephrasing or a different question." }]);
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
      const contentType = res.headers.get('Content-Type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message ?? 'There’s no data to export for that question.' }]);
        setDownloadOpen(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      a.download = `Think-Q-Export-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      const fileMessage = res.headers.get('X-Think-Q-Message');
      if (fileMessage) {
        setMessages((prev) => [...prev, { role: 'assistant', content: fileMessage }]);
      }
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
      <header className="flex items-center gap-[5px]">
        <span className="text-white font-medium text-[1.125rem] leading-none flex items-center h-[18px]">Ask</span>
        <Logo variant="team" className="h-[18px] w-auto" width={72} height={18} />
      </header>

      {(messages.length > 0 || loading) && (
      <div className="space-y-3 max-h-[400px] overflow-y-auto rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-800 text-gray-200 border-l-[3px] border-cyan-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {m.role === 'user' ? (
                  <>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                      <User className="w-4 h-4" />
                    </span>
                    <span className="font-medium text-white">You</span>
                  </>
                ) : (
                  <>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 border-2 border-cyan-400/80 text-cyan-300">
                      <Bot className="w-4 h-4" />
                    </span>
                    <span className="font-medium text-gray-200">Think-Q</span>
                  </>
                )}
              </div>
              <div className="whitespace-pre-wrap pl-9">{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 text-sm max-w-[85%] bg-slate-800 text-gray-200 border-l-[3px] border-cyan-400 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 border-2 border-cyan-400/80 text-cyan-300">
                  <Bot className="w-4 h-4" />
                </span>
                <span className="font-medium text-gray-200">Think-Q</span>
              </div>
              <div className="pl-9 text-gray-400">Looking that up…</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      )}

      {lastResult && lastResult.showStructuredTable && lastResult.rows.length > 0 && (
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
          placeholder="Type here"
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-blue-500"
          disabled={loading}
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
