import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import '../../styles/units.css';
import { useDB } from '../../api/store';
import { unitFields } from '../../data/catalog';
import { unitMissing } from '../../lib/validation';
import { downloadCsv } from '../../lib/download';
import { fmtMonth, fmtRelative } from '../../lib/format';
import { Empty, Icon, UNIT_STATUS_LABEL, UnitStatusBadge } from '../../components/ui';
import { AddUnitsModal, BulkStatusModal, SohCell, StatusBar } from './_UnitWidgets';
import { STATUS_ORDER, ratedCapacity, soh, useRoutePassport } from './_unitHelpers';
import type { UnitStatus } from '../../types';

export default function UnitsTab() {
  const p = useRoutePassport();
  const all = useDB(d => d.units);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<UnitStatus | ''>('');
  const [batch, setBatch] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState(false);

  const units = useMemo(() => all.filter(u => u.passportId === p?.id), [all, p?.id]);
  const batches = useMemo(() => [...new Set(units.map(u => u.batch).filter(Boolean))] as string[], [units]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return units.filter(u => (!s || u.serial.toLowerCase().includes(s)) && (!status || u.status === status) && (!batch || u.batch === batch))
      .sort((a, b) => a.serial.localeCompare(b.serial));
  }, [units, q, status, batch]);

  if (!p) return null;
  if (p.profile === 'battery_basic') {
    return <div className="card"><Empty icon="battery" title="Fără baterii individuale">Bateriile portabile, SLI și industriale ≤ 2 kWh au doar pagina de informații, fără înregistrări per baterie.</Empty></div>;
  }

  const rated = ratedCapacity(p);
  const sohs = units.map(u => soh(u, p)).filter((v): v is number => v !== null);
  const avgSoh = sohs.length ? Math.round((sohs.reduce((a, b) => a + b, 0) / sohs.length) * 10) / 10 : null;
  const missing = units.reduce((n, u) => n + (unitMissing(p.category, u).length ? 1 : 0), 0);
  const selected = rows.filter(u => sel.has(u.id));
  const allSel = rows.length > 0 && rows.every(u => sel.has(u.id));

  const exportCsv = () => {
    const fields = unitFields(p.category).filter(f => !['serial_number', 'batch_number', 'unit_manufacturing_date', 'status'].includes(f.name));
    const data = rows.map(u => ({
      serie: u.serial, lot: u.batch ?? '', luna_fabricatiei: u.manufacturingDate ?? '', status: u.status,
      ...Object.fromEntries(fields.map(f => [f.name, u.values?.[f.name] ?? ''])),
      soh_pct: soh(u, p) ?? '', actualizat: u.updatedAt,
    }));
    downloadCsv(Papa.unparse(data), `baterii-${(p.name || p.id).replace(/[^\w-]+/g, '_')}.csv`);
  };

  if (!units.length) {
    return <>
      <div className="card"><Empty icon="battery" title="Nicio baterie înregistrată" action={<button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" />Adaugă baterii</button>}>
        Fiecare baterie primește serie, cod QR propriu și istoric de valori.
      </Empty></div>
      {adding && <AddUnitsModal passportId={p.id} onClose={() => setAdding(false)} />}
    </>;
  }

  return (
    <div className="stack lg">
      <div className="grid-4">
        <div className="card"><div className="stat"><span className="l">Baterii</span><span className="v">{units.length}</span></div></div>
        <div className="card"><div className="stat"><span className="l">SoH mediu</span><span className="v">{avgSoh !== null ? `${avgSoh.toLocaleString('ro-RO')}%` : '—'}</span><span className="d faint">{rated ? `din ${rated} Ah nominal` : 'lipsește capacitatea nominală'}</span></div></div>
        <div className="card"><div className="stat"><span className="l">Date lipsă (2027)</span><span className="v" style={{ color: missing ? 'var(--warn)' : undefined }}>{missing}</span><span className="d faint">baterii</span></div></div>
        <div className="card" style={{ display: 'grid', alignContent: 'center' }}><StatusBar units={units} /></div>
      </div>

      <div className="card flush">
        <div className="row" style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
          <input className="input" style={{ maxWidth: 240 }} placeholder="Caută serie" value={q} onChange={e => setQ(e.target.value)} aria-label="Caută serie" />
          <select className="select" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value as UnitStatus | '')} aria-label="Status">
            <option value="">Toate statusurile</option>{STATUS_ORDER.map(s => <option key={s} value={s}>{UNIT_STATUS_LABEL[s]}</option>)}
          </select>
          {batches.length > 0 && <select className="select" style={{ width: 'auto' }} value={batch} onChange={e => setBatch(e.target.value)} aria-label="Lot">
            <option value="">Toate loturile</option>{batches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>}
          <div className="grow" />
          {selected.length > 0 && <button className="btn" onClick={() => setBulk(true)}>Schimbă status ({selected.length})</button>}
          <button className="btn" onClick={exportCsv}><Icon name="download" />CSV</button>
          <button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" />Adaugă</button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th className="shrink"><input type="checkbox" aria-label="Selectează tot" checked={allSel} onChange={e => setSel(e.target.checked ? new Set(rows.map(u => u.id)) : new Set())} /></th>
              <th>Serie</th><th>Lot</th><th>Fabricată</th><th>Status</th><th>SoH</th><th>Cicluri</th><th>Actualizată</th><th className="shrink">Lipsă</th>
            </tr></thead>
            <tbody>
              {rows.map(u => {
                const miss = unitMissing(p.category, u).length;
                return (
                  <tr key={u.id} className="clickable" onClick={() => nav(u.id)}>
                    <td className="shrink" onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Selectează ${u.serial}`} checked={sel.has(u.id)} onChange={e => { const n = new Set(sel); e.target.checked ? n.add(u.id) : n.delete(u.id); setSel(n); }} /></td>
                    <td className="mono">{u.serial}</td>
                    <td className="mono muted">{u.batch ?? '—'}</td>
                    <td className="muted nowrap">{fmtMonth(u.manufacturingDate)}</td>
                    <td><UnitStatusBadge status={u.status} /></td>
                    <td><SohCell value={soh(u, p)} /></td>
                    <td className="num">{typeof u.values?.charge_discharge_cycles === 'number' ? (u.values.charge_discharge_cycles as number).toLocaleString('ro-RO') : '—'}</td>
                    <td className="muted nowrap">{fmtRelative(u.updatedAt)}</td>
                    <td className="shrink num">{miss ? <span className="badge warn">{miss}</span> : <span className="faint">0</span>}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={9} className="faint" style={{ textAlign: 'center', padding: 24 }}>Nicio baterie pentru filtrele alese.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {adding && <AddUnitsModal passportId={p.id} onClose={() => setAdding(false)} />}
      {bulk && <BulkStatusModal units={selected} onClose={() => setBulk(false)} onDone={() => setSel(new Set())} />}
    </div>
  );
}
