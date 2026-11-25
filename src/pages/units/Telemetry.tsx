import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import '../../styles/units.css';
import { useDB, getDB } from '../../api/store';
import { telemetry, units as unitActions } from '../../api/actions';
import { FIELD, FIELDS, UNIT_RO } from '../../data/catalog';
import { formatError } from '../../lib/validation';
import { downloadCsv, readAsArrayBuffer, readAsText } from '../../lib/download';
import { fmtRelative } from '../../lib/format';
import { CopyButton, ConfirmButton, Empty, Field, FileDrop, Icon, Modal, PageHead, Switch, Tabs, useToast } from '../../components/ui';
import { Bars } from './_UnitWidgets';
import { soh, SOH_BUCKETS, today } from './_unitHelpers';
import type { AlertRule, Reading } from '../../types';

type Tab = 'alerte' | 'reguli' | 'incarcare' | 'conectare';
/** Unit fields a BMS can push (numeric/text telemetry, not identity or status). */
const BMS_FIELDS = FIELDS.filter(f => f.section === 'unitate' && !['serial_number', 'batch_number', 'unit_manufacturing_date', 'status'].includes(f.name));
const NUMERIC_BMS = BMS_FIELDS.filter(f => f.type === 'number');

export default function Telemetry() {
  const alerts = useDB(d => d.alerts);
  const open = alerts.filter(a => !a.acknowledged).length;
  const [tab, setTab] = useState<Tab>(open ? 'alerte' : 'incarcare');
  return (
    <div className="page">
      <PageHead title="Telemetrie BMS" sub="Valori din bateriile aflate în uz, alerte de degradare" />
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'alerte', label: 'Alerte', count: open },
        { value: 'reguli', label: 'Reguli' },
        { value: 'incarcare', label: 'Încărcare date' },
        { value: 'conectare', label: 'Conectare BMS' },
      ]} />
      {tab === 'alerte' && <AlertsTab />}
      {tab === 'reguli' && <RulesTab />}
      {tab === 'incarcare' && <UploadTab />}
      {tab === 'conectare' && <ConnectTab />}
    </div>
  );
}

function AlertsTab() {
  const alerts = useDB(d => d.alerts);
  const rules = useDB(d => d.alertRules);
  const units = useDB(d => d.units);
  const passports = useDB(d => d.passports);
  const [showAck, setShowAck] = useState(false);
  const list = alerts.filter(a => showAck || !a.acknowledged);
  // capacity distribution (all units with a rated capacity)
  const sohVals = units.map(u => soh(u, passports.find(p => p.id === u.passportId))).filter((v): v is number => v !== null);
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card flush">
        <div className="row between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
          <b>{list.length} alerte</b>
          <Switch checked={showAck} onChange={setShowAck} label={<span className="small">Arată și confirmate</span>} />
        </div>
        {list.length === 0 ? <Empty icon="check" title="Nicio alertă deschisă" /> : (
          <div className="table-wrap"><table className="table"><tbody>
            {list.map(a => {
              const u = units.find(x => x.id === a.unitId);
              return (
                <tr key={a.id}>
                  <td style={{ width: 18 }}><Icon name="alert" size={16} /></td>
                  <td>
                    <div className="stack sm" style={{ gap: 2 }}>
                      <span>{a.message}</span>
                      <span className="faint small">{rules.find(r => r.id === a.ruleId)?.name ?? 'Regulă ștearsă'} · {fmtRelative(a.at)}</span>
                    </div>
                  </td>
                  <td className="shrink">
                    <div className="row nowrap-row">
                      {u && <Link className="btn sm" to={`/pasapoarte/${a.passportId}/baterii/${u.id}`}>Deschide</Link>}
                      {!a.acknowledged ? <button className="btn sm" onClick={() => telemetry.acknowledge(a.id)}><Icon name="check" />Confirmă</button> : <span className="badge">confirmată</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody></table></div>
        )}
      </div>
      <div className="card stack">
        <span className="section-title">Stare de sănătate a flotei</span>
        {sohVals.length ? <Bars data={SOH_BUCKETS.map(b => ({ label: b.label, value: sohVals.filter(b.test).length }))} label="Baterii pe intervale de SoH" /> : <span className="faint small">Fără date de capacitate.</span>}
        <span className="faint small">{sohVals.length} baterii cu capacitate măsurată</span>
      </div>
    </div>
  );
}

function RulesTab() {
  const rules = useDB(d => d.alertRules);
  const [edit, setEdit] = useState<(Partial<AlertRule>) | null>(null);
  return (
    <div className="card flush">
      <div className="row between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
        <b>Reguli de alertă</b>
        <button className="btn primary sm" onClick={() => setEdit({ name: '', field: 'remaining_capacity', op: '<', threshold: 0, active: true })}><Icon name="plus" />Regulă nouă</button>
      </div>
      {rules.length === 0 ? <Empty icon="bell" title="Nicio regulă" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Nume</th><th>Condiție</th><th className="shrink">Activă</th><th className="shrink" /></tr></thead>
          <tbody>{rules.map(r => {
            const f = FIELD[r.field];
            return (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td className="mono small">{f?.label_ro ?? r.field} {r.op === 'drop_pct' ? 'scade cu peste' : r.op} {r.threshold}{r.op === 'drop_pct' ? '%' : f?.unit ? ' ' + (UNIT_RO[f.unit] ?? f.unit) : ''}</td>
                <td className="shrink"><Switch checked={r.active} onChange={v => telemetry.saveRule({ ...r, active: v })} label={<span className="sr-only">Activă</span>} /></td>
                <td className="shrink"><div className="row nowrap-row">
                  <button className="btn sm" onClick={() => setEdit(r)}><Icon name="edit" />Editează</button>
                  <ConfirmButton className="btn sm danger" confirmText="Șterge" onConfirm={() => telemetry.deleteRule(r.id)}><Icon name="trash" /></ConfirmButton>
                </div></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
      {edit && <RuleModal rule={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function RuleModal({ rule, onClose }: { rule: Partial<AlertRule>; onClose: () => void }) {
  const [r, setR] = useState(rule);
  const valid = !!r.name?.trim() && !!r.field && Number.isFinite(r.threshold);
  const f = r.field ? FIELD[r.field] : undefined;
  return (
    <Modal title={rule.id ? 'Editează regula' : 'Regulă nouă'} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Anulează</button>
      <button className="btn primary" disabled={!valid} onClick={() => { telemetry.saveRule({ id: r.id, name: r.name!.trim(), field: r.field!, op: r.op ?? '<', threshold: Number(r.threshold), active: r.active ?? true }); onClose(); }}>Salvează</button>
    </>}>
      <Field label="Nume" htmlFor="rl-name"><input id="rl-name" className="input" value={r.name ?? ''} onChange={e => setR({ ...r, name: e.target.value })} placeholder="ex. Capacitate sub 80%" /></Field>
      <div className="form-grid">
        <Field label="Valoare" htmlFor="rl-field"><select id="rl-field" className="select" value={r.field} onChange={e => setR({ ...r, field: e.target.value })}>{NUMERIC_BMS.map(x => <option key={x.name} value={x.name}>{x.label_ro}</option>)}</select></Field>
        <Field label="Condiție" htmlFor="rl-op"><select id="rl-op" className="select" value={r.op} onChange={e => setR({ ...r, op: e.target.value as AlertRule['op'] })}><option value="<">mai mică decât</option><option value=">">mai mare decât</option><option value="drop_pct">scade cu peste (%)</option></select></Field>
        <Field label={`Prag${r.op !== 'drop_pct' && f?.unit ? ` (${UNIT_RO[f.unit] ?? f.unit})` : r.op === 'drop_pct' ? ' (%)' : ''}`} htmlFor="rl-th"><input id="rl-th" className="input" type="number" step="any" value={r.threshold ?? ''} onChange={e => setR({ ...r, threshold: Number(e.target.value) })} /></Field>
      </div>
    </Modal>
  );
}

type Row = { line: number; serial: string; field: string; value: unknown; date: string; source: Reading['source']; unitId?: string; status: 'ok' | 'serial' | 'field' | 'value' | 'date' };
const STATUS_TXT: Record<Row['status'], string> = { ok: 'OK', serial: 'Serie necunoscută', field: 'Câmp invalid', value: 'Valoare invalidă', date: 'Dată invalidă' };

function parseRows(records: Record<string, unknown>[]): Row[] {
  const db = getDB();
  const bySerial = new Map(db.units.map(u => [u.serial.toLowerCase(), u]));
  const norm = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.trim().toLowerCase().replace(/^﻿/, ''), v]));
  return records.map((raw, i) => {
    const o = norm(raw);
    const serial = String(o.serial ?? o.serie ?? '').trim();
    const fieldIn = String(o.field ?? o.camp ?? o['câmp'] ?? '').trim();
    const f = BMS_FIELDS.find(x => x.name === fieldIn || x.label_ro.toLowerCase() === fieldIn.toLowerCase());
    const rawVal = o.value ?? o.valoare;
    const dateRaw = o.date ?? o.data ?? today();
    const date = typeof dateRaw === 'number' ? XLSX.SSF.format('yyyy-mm-dd', dateRaw) : String(dateRaw).trim().slice(0, 10);
    const src = String(o.source ?? o.sursa ?? 'bms').trim() as Reading['source'];
    const source: Reading['source'] = ['measurement', 'brand_statement', 'bms', 'import'].includes(src) ? src : 'bms';
    const unit = bySerial.get(serial.toLowerCase());
    let value: unknown = rawVal;
    let status: Row['status'] = 'ok';
    if (!unit) status = 'serial';
    else if (!f) status = 'field';
    else {
      if (f.type === 'number') value = typeof rawVal === 'number' ? rawVal : Number(String(rawVal ?? '').replace(',', '.'));
      else value = String(rawVal ?? '').trim();
      if (value === '' || (f.type === 'number' && !Number.isFinite(value as number)) || formatError(f, value)) status = 'value';
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) status = 'date';
    }
    return { line: i + 2, serial, field: f?.name ?? fieldIn, value, date, source, unitId: unit?.id, status };
  });
}

function UploadTab() {
  const toast = useToast();
  const [file, setFile] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'bad'>('all');

  const load = async (files: File[]) => {
    const f = files[0]; if (!f) return;
    setDone(null);
    try {
      let records: Record<string, unknown>[];
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        const wb = XLSX.read(await readAsArrayBuffer(f));
        records = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]!]!, { defval: '' });
      } else {
        records = Papa.parse<Record<string, unknown>>(await readAsText(f), { header: true, skipEmptyLines: true, dynamicTyping: (col: string | number) => ['value', 'valoare'].includes(String(col).trim().toLowerCase()) }).data;
      }
      setFile(f.name); setRows(parseRows(records));
    } catch { toast('Fișierul nu poate fi citit. Folosește CSV sau Excel.', 'bad'); }
  };
  const ok = rows?.filter(r => r.status === 'ok') ?? [];
  const bad = (rows?.length ?? 0) - ok.length;
  const shown = (rows ?? []).filter(r => filter === 'all' || r.status !== 'ok').slice(0, 200);
  const apply = () => {
    for (const r of ok) unitActions.recordReading(r.unitId!, { field: r.field, value: r.value, observedOn: r.date, source: r.source });
    setDone(ok.length); setRows(null); toast(`${ok.length} valori înregistrate`);
  };
  const template = () => downloadCsv(Papa.unparse([
    { serial: 'HC10-2609-000181', field: 'remaining_capacity', value: 196.4, date: today(), source: 'bms' },
    { serial: 'HC10-2609-000181', field: 'charge_discharge_cycles', value: 214, date: today(), source: 'bms' },
    { serial: 'HC10-2609-000182', field: 'temperature', value: 31, date: today(), source: 'bms' },
  ]), 'sablon-telemetrie.csv');

  return (
    <div className="stack lg">
      {done !== null && <div className="callout ok"><Icon name="check" />{done} valori înregistrate din {file}. Alertele s-au verificat automat.</div>}
      {!rows ? (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <FileDrop accept=".csv,.xlsx,.xls" onFiles={load}><b>Trage exportul din BMS</b><span className="small">CSV sau Excel · coloane: serial, field, value, date, source</span></FileDrop>
          <div className="card stack">
            <span className="section-title">Câmpuri acceptate</span>
            <div className="chips">{BMS_FIELDS.map(f => <span key={f.name} className="chip mono" title={f.label_ro} style={{ cursor: 'default' }}>{f.name}{f.unit ? ` · ${UNIT_RO[f.unit] ?? f.unit}` : ''}</span>)}</div>
            <div><button className="btn sm" onClick={template}><Icon name="download" />Șablon CSV</button></div>
          </div>
        </div>
      ) : (
        <div className="card flush">
          <div className="row" style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <b className="ellipsis">{file}</b>
            <span className="badge ok">{ok.length} OK</span>
            {bad > 0 && <span className="badge bad">{bad} cu probleme</span>}
            <div className="grow" />
            <select className="select" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value as 'all' | 'bad')} aria-label="Filtru"><option value="all">Toate rândurile</option><option value="bad">Doar probleme</option></select>
            <button className="btn" onClick={() => setRows(null)}>Anulează</button>
            <button className="btn primary" disabled={!ok.length} onClick={apply}>Înregistrează {ok.length}</button>
          </div>
          <div className="table-wrap" style={{ maxHeight: 460, overflow: 'auto' }}>
            <table className="table">
              <thead><tr><th className="shrink">Rând</th><th>Serie</th><th>Câmp</th><th>Valoare</th><th>Data</th><th>Stare</th></tr></thead>
              <tbody>{shown.map(r => (
                <tr key={r.line}>
                  <td className="shrink faint num">{r.line}</td>
                  <td className="mono">{r.serial || '—'}</td>
                  <td>{FIELD[r.field]?.label_ro ?? <span className="mono">{r.field || '—'}</span>}</td>
                  <td className="num">{String(r.value ?? '')}</td>
                  <td className="nowrap">{r.date}</td>
                  <td><span className={'badge ' + (r.status === 'ok' ? 'ok' : 'bad')}>{STATUS_TXT[r.status]}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {(rows.length > 200) && <div className="u-pager">Primele 200 din {rows.length} rânduri</div>}
        </div>
      )}
    </div>
  );
}

function ConnectTab() {
  const resolver = useDB(d => d.org.resolver);
  const base = (resolver || 'https://dpp.firma.ro').replace(/\/+$/, '') + '/api/v1';
  const single = `curl -X POST ${base}/units/HC10-2609-000181/readings \\
  -H "Authorization: Bearer dpp_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"field":"remaining_capacity","value":196.4,"observed_on":"${today()}","source":"bms"}'`;
  const batch = `POST ${base}/readings:batch
{
  "readings": [
    { "serial": "HC10-2609-000181", "field": "remaining_capacity", "value": 196.4, "observed_on": "${today()}" },
    { "serial": "HC10-2609-000181", "field": "charge_discharge_cycles", "value": 214, "observed_on": "${today()}" },
    { "serial": "HC10-2609-000182", "field": "temperature", "value": 31, "observed_on": "${today()}" }
  ]
}`;
  const mqtt = `topic:   dpp/{gtin14}/{serial}/telemetry
payload: { "remaining_capacity": 196.4, "temperature": 31, "state_of_charge": 64, "ts": "${new Date().toISOString().slice(0, 19)}Z" }`;
  return (
    <div className="stack lg">
      <div className="grid-3">
        <div className="card stack sm"><Icon name="key" size={20} /><b>1. Cheie API</b><span className="muted small">Scope <span className="mono">units:write</span></span><Link className="small" to="/integrari">Creează cheie</Link></div>
        <div className="card stack sm"><Icon name="pulse" size={20} /><b>2. Trimite citiri</b><span className="muted small">Una câte una sau în loturi de până la 1000</span></div>
        <div className="card stack sm"><Icon name="bell" size={20} /><b>3. Alerte automate</b><span className="muted small">Fiecare citire e verificată de reguli</span></div>
      </div>
      <Snippet title="O citire" code={single} />
      <Snippet title="Lot de citiri" code={batch} />
      <Snippet title="MQTT (gateway)" code={mqtt} />
      <div className="card flush">
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Câmp</th><th>Denumire</th><th>Unitate</th><th>Acces</th></tr></thead>
          <tbody>{BMS_FIELDS.map(f => <tr key={f.name}><td className="mono">{f.name}</td><td>{f.label_ro}</td><td className="mono muted">{f.unit ? (UNIT_RO[f.unit] ?? f.unit) : f.type === 'text' ? 'text' : '—'}</td><td><span className={'tier ' + f.access_tier}>{f.access_tier === 'public' ? 'Public' : f.access_tier === 'restricted' ? 'Interes legitim' : 'Autorități'}</span></td></tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <div className="card stack sm">
      <div className="row between"><b>{title}</b><CopyButton text={code} /></div>
      <pre className="u-code">{code}</pre>
    </div>
  );
}
