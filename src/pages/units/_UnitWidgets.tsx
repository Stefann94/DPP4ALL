import { useMemo, useState } from 'react';
import '../../styles/units.css';
import { Modal, Segmented, UNIT_STATUS_LABEL, useToast, Field } from '../../components/ui';
import { units as unitActions } from '../../api/actions';
import { canTransition } from '../../lib/validation';
import { SERIAL_RE } from '../../lib/gs1';
import type { Unit, UnitStatus } from '../../types';
import { STATUS_COLOR, STATUS_ORDER, today } from './_unitHelpers';

/** Status distribution: segmented bar + legend with counts (identity never by color alone). */
export function StatusBar({ units }: { units: Unit[] }) {
  const counts = STATUS_ORDER.map(s => ({ s, n: units.filter(u => u.status === s).length })).filter(x => x.n > 0);
  const total = units.length || 1;
  return (
    <div className="stack sm">
      <div className="u-stackbar" role="img" aria-label={counts.map(c => `${UNIT_STATUS_LABEL[c.s]}: ${c.n}`).join(', ')}>
        {counts.map(c => <span key={c.s} title={`${UNIT_STATUS_LABEL[c.s]}: ${c.n} (${Math.round((c.n / total) * 100)}%)`} style={{ width: `${(c.n / total) * 100}%`, background: STATUS_COLOR[c.s] }} />)}
      </div>
      <div className="u-legend">{counts.map(c => <span key={c.s}><i style={{ background: STATUS_COLOR[c.s] }} />{UNIT_STATUS_LABEL[c.s]}<b>{c.n}</b></span>)}</div>
    </div>
  );
}

export function SohCell({ value }: { value: number | null }) {
  if (value === null) return <span className="faint">—</span>;
  const cls = value < 70 ? ' bad' : value < 80 ? ' low' : '';
  return <span className={'u-soh' + cls}><span className="m"><span style={{ width: `${Math.min(100, value)}%` }} /></span>{value.toLocaleString('ro-RO')}%</span>;
}

/** Single-series column chart (one hue, no legend), hover title per bar, value labels on top. */
export function Bars({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <figure style={{ margin: 0 }} aria-label={label}>
      <div className="u-bars">
        {data.map(d => (
          <div key={d.label} className="b" title={`${d.label}: ${d.value}`}>
            <em style={{ bottom: `calc(${(d.value / max) * 100}% + 2px)` }}>{d.value || ''}</em>
            <span style={{ height: `${(d.value / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="u-bars-x">{data.map(d => <span key={d.label}>{d.label}</span>)}</div>
    </figure>
  );
}

export function AddUnitsModal({ passportId, onClose }: { passportId: string; onClose: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<'paste' | 'seq'>('paste');
  const [text, setText] = useState('');
  const [prefix, setPrefix] = useState('SN-');
  const [start, setStart] = useState(1);
  const [count, setCount] = useState(10);
  const [pad, setPad] = useState(6);
  const [batch, setBatch] = useState('');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [status, setStatus] = useState<UnitStatus>('original');
  const [refused, setRefused] = useState<{ serial: string; reason: string }[] | null>(null);

  const serials = useMemo(() => mode === 'paste'
    ? text.split(/[\r\n,;\t]+/).map(s => s.trim()).filter(Boolean)
    : Array.from({ length: Math.max(0, Math.min(1000, count)) }, (_, i) => prefix + String(start + i).padStart(pad, '0')), [mode, text, prefix, start, count, pad]);
  const invalid = serials.filter(s => !SERIAL_RE.test(s)).length;

  const submit = () => {
    const r = unitActions.add(passportId, serials, { batch: batch.trim() || undefined, manufacturingDate: month || undefined, status });
    toast(`${r.added.length} baterii adăugate`);
    if (r.refused.length) setRefused(r.refused); else onClose();
  };

  return (
    <Modal title="Adaugă baterii" onClose={onClose} wide footer={refused
      ? <button className="btn primary" onClick={onClose}>Gata</button>
      : <><button className="btn" onClick={onClose}>Anulează</button><button className="btn primary" disabled={!serials.length} onClick={submit}>Adaugă {serials.length || ''}</button></>}>
      {refused ? (
        <div className="stack">
          <b>{refused.length} serii nu au fost adăugate</b>
          <div className="card flush table-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>
            <table className="table"><tbody>{refused.map(r => <tr key={r.serial}><td className="mono">{r.serial}</td><td className="muted">{r.reason}</td></tr>)}</tbody></table>
          </div>
        </div>
      ) : <>
        <Segmented value={mode} onChange={setMode} items={[{ value: 'paste', label: 'Lipește serii' }, { value: 'seq', label: 'Generează secvență' }]} />
        {mode === 'paste'
          ? <Field label="Serii (câte una pe rând)" hint={`${serials.length} serii${invalid ? ` · ${invalid} invalide` : ''}`} htmlFor="u-paste">
              <textarea id="u-paste" className="textarea mono" rows={8} value={text} onChange={e => setText(e.target.value)} placeholder={'HC10-2611-000001\nHC10-2611-000002'} />
            </Field>
          : <div className="form-grid">
              <Field label="Prefix" htmlFor="u-pre"><input id="u-pre" className="input mono" value={prefix} onChange={e => setPrefix(e.target.value)} /></Field>
              <Field label="Primul număr" htmlFor="u-start"><input id="u-start" className="input" type="number" min={0} value={start} onChange={e => setStart(Math.max(0, Number(e.target.value) || 0))} /></Field>
              <Field label="Câte" hint="Maxim 1000" htmlFor="u-count"><input id="u-count" className="input" type="number" min={1} max={1000} value={count} onChange={e => setCount(Number(e.target.value) || 0)} /></Field>
              <Field label="Cifre" htmlFor="u-pad"><input id="u-pad" className="input" type="number" min={1} max={12} value={pad} onChange={e => setPad(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} /></Field>
              <div className="wide small muted mono">{serials.slice(0, 3).join(', ')}{serials.length > 3 ? ` … ${serials.at(-1)}` : ''}</div>
            </div>}
        <div className="form-grid">
          <Field label="Lot (AI 10)" htmlFor="u-batch"><input id="u-batch" className="input mono" value={batch} onChange={e => setBatch(e.target.value)} placeholder="opțional" /></Field>
          <Field label="Luna fabricației" htmlFor="u-month"><input id="u-month" className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} /></Field>
          <Field label="Status inițial" htmlFor="u-st">
            <select id="u-st" className="select" value={status} onChange={e => setStatus(e.target.value as UnitStatus)}>{STATUS_ORDER.map(s => <option key={s} value={s}>{UNIT_STATUS_LABEL[s]}</option>)}</select>
          </Field>
        </div>
      </>}
    </Modal>
  );
}

export function BulkStatusModal({ units, onClose, onDone }: { units: Unit[]; onClose: () => void; onDone?: () => void }) {
  const toast = useToast();
  const [to, setTo] = useState<UnitStatus>('repurposed');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const ok = units.filter(u => canTransition(u.status, to));
  const skip = units.length - ok.length;
  return (
    <Modal title={`Schimbă statusul (${units.length})`} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Anulează</button>
      <button className="btn primary" disabled={!ok.length} onClick={() => {
        ok.forEach(u => unitActions.changeStatus(u.id, to, { observedOn: date, note: note || undefined }));
        toast(`${ok.length} actualizate${skip ? `, ${skip} sărite` : ''}`); onDone?.(); onClose();
      }}>Aplică la {ok.length}</button></>}>
      <div className="form-grid">
        <Field label="Status nou" htmlFor="bs-to"><select id="bs-to" className="select" value={to} onChange={e => setTo(e.target.value as UnitStatus)}>{STATUS_ORDER.filter(s => s !== 'original').map(s => <option key={s} value={s}>{UNIT_STATUS_LABEL[s]}</option>)}</select></Field>
        <Field label="Data" htmlFor="bs-date"><input id="bs-date" className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Notă" wide htmlFor="bs-note"><input id="bs-note" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="opțional" /></Field>
      </div>
      {skip > 0 && <div className="callout warn small">{skip} baterii nu pot trece în acest status (deșeul e final, iar statusul „Originală” nu se mai poate seta) și vor fi sărite.</div>}
    </Modal>
  );
}
