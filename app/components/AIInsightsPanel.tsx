'use client';

/**
 * AI Insights panel: natural language → SQL via /api/ai.
 * Conversation style, collapsible SQL debug, optional XLS export.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

export interface AIInsightsPanelProps {
  filters?: Record<string, unknown>;
}

type AIMessage = { role: 'user' | 'assistant'; content: string };
type AIResult = { sql: string; rows: Record<string, unknown>[]; rowCount: number };

export default function AIInsightsPanel({ filters = {} }: AIInsightsPanelProps) {
  const { session } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [lastResult, setLastResult] = useState<AIResult | null>(null);
  const [sqlOpen, setSqlOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, lastResult]);

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
          setError([data.error ?? `Error ${res.status}`, data.phase ? `(phase: ${data.phase})` : ''].filter(Boolean).join(' '));
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        if (data.success && data.sql !== undefined) {
          setLastResult({ sql: data.sql, rows: data.rows ?? [], rowCount: data.rowCount ?? 0 });
          const summary =
            data.rowCount === 0
              ? 'No rows returned.'
              : `${data.rowCount} row${data.rowCount !== 1 ? 's' : ''} returned.`;
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: summary + (data.rowCount > 0 ? '\n\nUse "Export to XLS" to download the data.' : '') },
          ]);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.error ?? 'No data.' }]);
        }
      } else {
        setError('Unexpected response format');
        setMessages((prev) => prev.slice(0, -1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleExportXlsx = async () => {
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
          responseFormat: 'xlsx',
          accessToken: session?.access_token ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Export failed ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI-Export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Ask questions in plain language. Queries run as read-only SQL (SELECT only). Follow-up questions keep conversation context.
      </p>

      <div className="space-y-3 max-h-[400px] overflow-y-auto rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-slate-500">e.g. How many open tickets? Show travel logs from last month. Export to XLS to download results.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              m.role === 'user' ? 'bg-blue-500/10 text-blue-100 ml-4' : 'bg-slate-700/50 text-slate-200 mr-4'
            }`}
          >
            <span className="font-medium text-slate-400">{m.role === 'user' ? 'You' : 'AI'}: </span>
            <span className="whitespace-pre-wrap">{m.content}</span>
          </div>
        ))}
        {loading && (
          <div className="rounded-lg px-3 py-2 text-sm bg-slate-700/50 text-slate-400">
            Running query…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {lastResult && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setSqlOpen((o) => !o)}
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-300"
          >
            {sqlOpen ? '▼' : '▶'} SQL used (debug)
          </button>
          {sqlOpen && (
            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs overflow-x-auto whitespace-pre-wrap">
              {lastResult.sql}
            </pre>
          )}
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
          placeholder="Follow-up or new question…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-blue-500"
          disabled={loading}
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
          >
            Export to XLS
          </button>
        </div>
      )}
    </div>
  );
}
