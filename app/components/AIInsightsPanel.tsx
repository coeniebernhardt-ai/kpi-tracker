'use client';

/**
 * Admin-only AI Insights panel. Read-only: asks questions and displays AI-generated
 * explanations from pre-computed metrics. Supports download as CSV and PDF.
 */

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import type { AIInsightsResponse, AIInsightsFilters } from '@/app/lib/ai-insights-types';
import { downloadInsightCsv, downloadInsightPdf, downloadFullSnapshotCsv } from '@/app/lib/ai-insights-export';

export interface AIInsightsPanelProps {
  /** Optional filters to apply to the data (e.g. date range, user). */
  filters?: AIInsightsFilters;
}

export default function AIInsightsPanel({ filters = {} }: AIInsightsPanelProps) {
  const { session } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AIInsightsResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const payload: { question: string; filters: AIInsightsFilters; accessToken?: string } = {
        question: q,
        filters,
      };
      if (session?.access_token) {
        payload.accessToken = session.access_token;
      }
      const res = await fetch('/api/admin/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        return;
      }
      setResponse(data as AIInsightsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Ask questions about tickets and travel. Answers are based on pre-computed metrics only (read-only).
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-slate-300">Question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What are the main risks? Where should we focus? How is travel distributed?"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-blue-500 resize-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Getting insights…' : 'Get insights'}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {response && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Answer</h3>
            <div className="text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">
              {response.answer}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Generated at {new Date(response.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadFullSnapshotCsv(response)}
              className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600"
              title="All dimensions, Excel-ready, matches what the AI sees"
            >
              Export full snapshot (CSV)
            </button>
            <button
              type="button"
              onClick={() => downloadInsightCsv(response)}
              className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600"
            >
              Download summary CSV
            </button>
            <button
              type="button"
              onClick={() => downloadInsightPdf(response)}
              className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600"
            >
              Download PDF (print)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
