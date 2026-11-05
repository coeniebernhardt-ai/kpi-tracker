'use client';

import { useCallback, useEffect, useState } from 'react';
import { scFetch } from '../../lib/support-calls/client';
import { Field, btnGhost, inputCls } from './sc-ui';

export type LocationSelection = {
  client_id: string;
  estate_id: string;
  cml_location_id: string;
  onsite_location_id: string;
  client: string;
  estate_or_building: string;
  cml_location: string;
  onsite_location: string;
  site_name: string;
};

type Row = { id: string; name: string };

type Props = {
  token: string | null;
  value: LocationSelection;
  onChange: (next: LocationSelection) => void;
  disabled?: boolean;
  requireOnsite?: boolean;
};

const empty = (): LocationSelection => ({
  client_id: '',
  estate_id: '',
  cml_location_id: '',
  onsite_location_id: '',
  client: '',
  estate_or_building: '',
  cml_location: '',
  onsite_location: '',
  site_name: '',
});

export function emptyLocationSelection(): LocationSelection {
  return empty();
}

export default function LocationCascade({ token, value, onChange, disabled, requireOnsite }: Props) {
  const [clients, setClients] = useState<Row[]>([]);
  const [estates, setEstates] = useState<Row[]>([]);
  const [cmls, setCmls] = useState<Row[]>([]);
  const [onsites, setOnsites] = useState<Row[]>([]);
  const [adding, setAdding] = useState<'clients' | 'estates' | 'cml' | 'onsite' | null>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    if (!token) return;
    const data = await scFetch('/api/support-calls/locations?kind=clients&active=1', { accessToken: token });
    setClients((data.clients || []).map((c: Row) => ({ id: c.id, name: c.name })));
  }, [token]);

  useEffect(() => {
    void loadClients().catch(() => undefined);
  }, [loadClients]);

  useEffect(() => {
    if (!token || !value.client_id) {
      setEstates([]);
      return;
    }
    void scFetch(`/api/support-calls/locations?kind=estates&client_id=${value.client_id}&active=1`, { accessToken: token })
      .then((data) => setEstates((data.estates || []).map((e: Row) => ({ id: e.id, name: e.name }))))
      .catch(() => setEstates([]));
  }, [token, value.client_id]);

  useEffect(() => {
    if (!token || !value.estate_id) {
      setCmls([]);
      setOnsites([]);
      return;
    }
    void scFetch(`/api/support-calls/locations?kind=cml&estate_id=${value.estate_id}&active=1`, { accessToken: token })
      .then((data) => setCmls((data.cml_locations || []).map((e: Row) => ({ id: e.id, name: e.name }))))
      .catch(() => setCmls([]));
    const cmlQ = value.cml_location_id ? `&cml_location_id=${value.cml_location_id}` : '';
    void scFetch(`/api/support-calls/locations?kind=onsite&estate_id=${value.estate_id}&active=1${cmlQ}`, { accessToken: token })
      .then((data) => setOnsites((data.onsite_locations || []).map((e: Row) => ({ id: e.id, name: e.name }))))
      .catch(() => setOnsites([]));
  }, [token, value.estate_id, value.cml_location_id]);

  const setClient = (id: string) => {
    const row = clients.find((c) => c.id === id);
    onChange({
      ...empty(),
      client_id: id,
      client: row?.name ?? '',
    });
  };

  const setEstate = (id: string) => {
    const row = estates.find((c) => c.id === id);
    onChange({
      ...value,
      estate_id: id,
      estate_or_building: row?.name ?? '',
      cml_location_id: '',
      cml_location: '',
      onsite_location_id: '',
      onsite_location: '',
      site_name: '',
    });
  };

  const setCml = (id: string) => {
    const row = cmls.find((c) => c.id === id);
    onChange({
      ...value,
      cml_location_id: id,
      cml_location: row?.name ?? '',
      onsite_location_id: '',
      onsite_location: '',
      site_name: '',
    });
  };

  const setOnsite = (id: string) => {
    const row = onsites.find((c) => c.id === id);
    const name = row?.name ?? '';
    onChange({
      ...value,
      onsite_location_id: id,
      onsite_location: name,
      site_name: name,
    });
  };

  const addNew = async () => {
    if (!token || !adding || !newName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, string> = { kind: adding, name: newName.trim() };
      if (adding === 'estates') body.client_id = value.client_id;
      if (adding === 'cml' || adding === 'onsite') body.estate_id = value.estate_id;
      if (adding === 'onsite' && value.cml_location_id) body.cml_location_id = value.cml_location_id;
      const res = await scFetch('/api/support-calls/locations', {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify(body),
      });
      setNewName('');
      setAdding(null);
      if (adding === 'clients') {
        await loadClients();
        const c = res.client as Row;
        onChange({ ...empty(), client_id: c.id, client: c.name });
      } else if (adding === 'estates') {
        const e = res.estate as Row;
        setEstates((list) => [...list, e].sort((a, b) => a.name.localeCompare(b.name)));
        onChange({
          ...value,
          estate_id: e.id,
          estate_or_building: e.name,
          cml_location_id: '',
          cml_location: '',
          onsite_location_id: '',
          onsite_location: '',
          site_name: '',
        });
      } else if (adding === 'cml') {
        const m = res.cml_location as Row;
        setCmls((list) => [...list, m].sort((a, b) => a.name.localeCompare(b.name)));
        onChange({ ...value, cml_location_id: m.id, cml_location: m.name, onsite_location_id: '', onsite_location: '', site_name: '' });
      } else {
        const o = res.onsite_location as Row;
        setOnsites((list) => [...list, o].sort((a, b) => a.name.localeCompare(b.name)));
        onChange({ ...value, onsite_location_id: o.id, onsite_location: o.name, site_name: o.name });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add location');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Client">
          <select className={inputCls} disabled={disabled} value={value.client_id} onChange={(e) => setClient(e.target.value)}>
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!disabled && (
            <button type="button" className={`${btnGhost} mt-1 text-xs`} onClick={() => { setAdding('clients'); setNewName(''); }}>
              + Add client
            </button>
          )}
        </Field>
        <Field label="Estate / Building">
          <select className={inputCls} disabled={disabled || !value.client_id} value={value.estate_id} onChange={(e) => setEstate(e.target.value)}>
            <option value="">Select estate…</option>
            {estates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!disabled && value.client_id && (
            <button type="button" className={`${btnGhost} mt-1 text-xs`} onClick={() => { setAdding('estates'); setNewName(''); }}>
              + Add estate
            </button>
          )}
        </Field>
        <Field label="CML Location" hint="Optional where not applicable">
          <select className={inputCls} disabled={disabled || !value.estate_id} value={value.cml_location_id} onChange={(e) => setCml(e.target.value)}>
            <option value="">None / not applicable</option>
            {cmls.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!disabled && value.estate_id && (
            <button type="button" className={`${btnGhost} mt-1 text-xs`} onClick={() => { setAdding('cml'); setNewName(''); }}>
              + Add CML
            </button>
          )}
        </Field>
        <Field label={requireOnsite ? 'On-site Location (required before dispatch)' : 'On-site Location'}>
          <select className={inputCls} disabled={disabled || !value.estate_id} value={value.onsite_location_id} onChange={(e) => setOnsite(e.target.value)}>
            <option value="">Select on-site…</option>
            {onsites.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!disabled && value.estate_id && (
            <button type="button" className={`${btnGhost} mt-1 text-xs`} onClick={() => { setAdding('onsite'); setNewName(''); }}>
              + Add on-site
            </button>
          )}
        </Field>
      </div>
      {adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <Field label={`New ${adding === 'cml' ? 'CML location' : adding === 'onsite' ? 'on-site location' : adding.slice(0, -1)}`}>
            <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
          </Field>
          <button type="button" className={btnGhost} disabled={busy || !newName.trim()} onClick={() => void addNew()}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className={btnGhost} onClick={() => setAdding(null)}>Cancel</button>
        </div>
      )}
      {err && <p className="text-xs text-rose-300">{err}</p>}
    </div>
  );
}
