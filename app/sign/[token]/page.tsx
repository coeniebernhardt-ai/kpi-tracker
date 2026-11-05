'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { scFetch, type ScFetchError } from '../../lib/support-calls/client';

type SignData = {
  job_card: { version: number };
  support_call: {
    support_call_number: string;
    client: string | null;
    site_name: string | null;
    estate_or_building: string | null;
    location: string | null;
    original_description: string;
    reported_at: string | null;
    responsible_name: string | null;
    responsible_position: string | null;
    responsible_organisation: string | null;
  };
  visits: {
    visit_number: number;
    party_type: string;
    visit_date: string | null;
    arrived_at: string | null;
    departed_at: string | null;
    labour: string | null;
    diagnosis: string | null;
    work_performed: string | null;
    test_results: string | null;
    incomplete: boolean;
    technician: string | null;
  }[];
  hardware: {
    description: string;
    make_model: string | null;
    quantity: number | null;
    old_equipment: string | null;
    new_equipment: string | null;
    serial_number: string | null;
  }[];
  pdf_url: string | null;
  expires_at: string;
};

const fmt = (v: string | null | undefined) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-600';

export default function PublicSignPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [data, setData] = useState<SignData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'done'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    scFetch(`/api/sign/${token}`)
      .then((d: SignData) => {
        if (cancelled) return;
        setData(d);
        setName(d.support_call.responsible_name ?? '');
        setPosition(d.support_call.responsible_position ?? '');
        setCompany(d.support_call.responsible_organisation ?? d.support_call.client ?? '');
        setState('ready');
      })
      .catch((e: ScFetchError) => {
        if (cancelled) return;
        setMessage(e.message || 'This link is not valid.');
        setState('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !last.current) return;
    const p = point(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasInk(true);
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = useCallback(() => {
    const c = canvasRef.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  }, []);

  const submit = async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    setError(null);
    try {
      await scFetch(`/api/sign/${token}`, {
        method: 'POST',
        body: JSON.stringify({
          signer_name: name,
          signer_position: position,
          signer_company: company,
          signature_data: canvasRef.current.toDataURL('image/png'),
          confirmed,
        }),
      });
      setState('done');
    } catch (e) {
      const err = e as ScFetchError;
      if (err.status === 410 || err.status === 404) {
        setMessage(err.message);
        setState('invalid');
      } else {
        setError(err.message || 'Could not submit your signature.');
      }
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/think-digital-logo.png"
            alt="Think Digital"
            className="mx-auto h-12 w-auto object-contain"
          />
          <h1 className="mt-3 text-xl font-semibold text-slate-900">Job card review & sign-off</h1>
          <p className="mt-1 text-sm text-slate-500">Official Think Digital service document</p>
        </header>
        {children}
      </div>
    </div>
  );

  if (state === 'loading') return shell(<p className="text-center text-slate-500">Loading job card…</p>);

  if (state === 'invalid') {
    return shell(
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-medium text-slate-900">This link cannot be used</p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <p className="mt-4 text-xs text-slate-500">Please contact your Think Digital representative for a new link.</p>
      </div>
    );
  }

  if (state === 'done') {
    return shell(
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="mt-2 text-lg font-medium text-emerald-800">Thank you — job card signed</p>
        <p className="mt-2 text-sm text-slate-600">Your signature has been recorded. You can close this page.</p>
      </div>
    );
  }

  if (!data) return null;
  const sc = data.support_call;

  return shell(
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-cyan-800">{sc.support_call_number}</p>
        <p className="mt-1 text-sm text-slate-600">{[sc.client, sc.site_name, sc.estate_or_building].filter(Boolean).join(' · ')}</p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">Reported issue ({fmt(sc.reported_at)})</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{sc.original_description}</p>
        {data.pdf_url && (
          <a href={data.pdf_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-cyan-700 underline">
            Open full job card PDF
          </a>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Work carried out</h2>
        {data.visits.length === 0 && <p className="text-sm text-slate-500">No visits recorded.</p>}
        <div className="space-y-3">
          {data.visits.map((v) => (
            <div key={v.visit_number} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">
                Visit {v.visit_number}
                {v.technician ? ` · ${v.technician}` : ''}
              </p>
              <p className="text-xs text-slate-500">
                {fmt(v.arrived_at)} → {fmt(v.departed_at)}
                {v.labour ? ` · ${v.labour}` : ''}
              </p>
              {v.diagnosis && <p className="mt-1 text-slate-700"><span className="text-slate-500">Diagnosis: </span>{v.diagnosis}</p>}
              {v.work_performed && <p className="text-slate-700"><span className="text-slate-500">Work: </span>{v.work_performed}</p>}
              {v.test_results && <p className="text-slate-700"><span className="text-slate-500">Tests: </span>{v.test_results}</p>}
              {v.incomplete && <p className="text-amber-700">Work not yet complete</p>}
            </div>
          ))}
        </div>
        {data.hardware.length > 0 && (
          <>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-slate-900">Hardware</h3>
            <ul className="space-y-1 text-sm text-slate-700">
              {data.hardware.map((h, i) => (
                <li key={i}>
                  {h.quantity ?? 1} × {h.description}
                  {h.make_model ? ` (${h.make_model})` : ''}
                  {h.serial_number ? ` · S/N ${h.serial_number}` : ''}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-cyan-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Your signature</h2>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Full name *</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Position</span>
            <input className={inputCls} value={position} onChange={(e) => setPosition(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Company</span>
            <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
          </label>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Sign below *</span>
            <button type="button" onClick={clear} className="text-xs text-cyan-300">Clear</button>
          </div>
          <canvas
            ref={canvasRef}
            width={640}
            height={220}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={end}
            className="w-full rounded-2xl border border-slate-600 bg-white"
            style={{ touchAction: 'none', aspectRatio: '640 / 220' }}
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I confirm the work described above was carried out and I accept this job card.
        </label>

        {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !name.trim() || !hasInk || !confirmed}
          className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Sign job card'}
        </button>
        <p className="text-center text-[11px] text-slate-500">Link valid until {fmt(data.expires_at)}</p>
      </section>
    </>
  );
}
