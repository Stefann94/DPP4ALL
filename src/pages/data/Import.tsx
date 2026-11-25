import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import '../../styles/data.css';
import { useDB, getDB } from '../../api/store';
import { imports as importActions, units as unitActions } from '../../api/actions';
import { CATEGORIES, SECTIONS, FIELDS, profileOf, type FieldDef } from '../../data/catalog';
import { canTransition } from '../../lib/validation';
import { SERIAL_RE } from '../../lib/gs1';
import { downloadBlob, downloadCsv } from '../../lib/download';
import { fmtDateTime } from '../../lib/format';
import { Callout, CopyButton, Empty, FileDrop, Icon, PageHead, Segmented, Switch, Tabs, UNIT_STATUS_LABEL, useToast } from '../../components/ui';
import {
  applyImport, autoMap, buildRows, candidatesFromJson, candidatesFromTable, coerce, detectHeader, fieldLabel, mapAliases,
  matchReadingField, parseCsv, parseDate, parseFile, parseMonth, parseSource, parseStatus,
  type Candidate, type ImportRow, type KeyField, type Parsed, type RowAction,
} from './_importEngine';
import { MODEL_FIELDS, REQUIRED_FIELDS, orderColumns, passportRows, READING_COLUMNS, UNIT_COLUMNS } from './_columns';
import type { BatteryCategory, UnitStatus } from '../../types';

type Tab = 'pasapoarte' | 'baterii' | 'valori' | 'sabloane' | 'cli' | 'istoric';

export default function Import() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as Tab) || 'pasapoarte';
  const history = useDB(d => d.imports);
  return (
    <div className="page">
      <PageHead title="Import" sub="Excel, CSV sau JSON. Totul intră ca ciornă; nimic nu se publică automat." />
      <Tabs<Tab> value={tab} onChange={t => setSp({ tab: t }, { replace: true })} items={[
        { value: 'pasapoarte', label: 'Pașapoarte' }, { value: 'baterii', label: 'Baterii (serii)' }, { value: 'valori', label: 'Valori baterii' },
        { value: 'sabloane', label: 'Șabloane' }, { value: 'cli', label: 'Script / CLI' }, { value: 'istoric', label: 'Istoric', count: history.length },
      ]} />
      {tab === 'pasapoarte' && <PassportImport />}
      {tab === 'baterii' && <UnitsImport />}
      {tab === 'valori' && <ReadingsImport />}
      {tab === 'sabloane' && <Templates />}
      {tab === 'cli' && <CliDocs />}
      {tab === 'istoric' && <History />}
    </div>
  );
}

// ───────────────────────── Pașapoarte ─────────────────────────
const PASSPORT_FIELDS = MODEL_FIELDS;

function FieldSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="select" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— ignoră —</option>
      {SECTIONS.map(s => (
        <optgroup key={s.id} label={s.label_ro}>
          {PASSPORT_FIELDS.filter(f => f.section === s.id).map(f => <option key={f.name} value={f.name}>{f.label_ro}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

function PassportImport() {
  const toast = useToast();
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [sheet, setSheet] = useState(0);
  const [header, setHeader] = useState(0);
  const [skipLabel, setSkipLabel] = useState(false);
  const [mapping, setMapping] = useState<string[]>([]);
  const [defaultCategory, setDefaultCategory] = useState<BatteryCategory | ''>('');
  const [keyField, setKeyField] = useState<KeyField>('gtin');
  const [existingDefault, setExistingDefault] = useState<RowAction>('update');
  const [allowErrors, setAllowErrors] = useState(false);
  const [fillManufacturer, setFillManufacturer] = useState(true);
  const [overrides, setOverrides] = useState<Record<number, RowAction>>({});
  const [step, setStep] = useState<'upload' | 'map' | 'review' | 'done'>('upload');
  const [filter, setFilter] = useState<'toate' | 'erori' | 'duplicate' | 'lipsuri'>('toate');
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [jsonError, setJsonError] = useState('');

  const rows = parsed?.kind === 'table' ? parsed.sheets[sheet]?.rows ?? [] : [];
  const headers = rows[header] ?? [];

  const pickSheet = (p: Parsed, i: number) => {
    if (p.kind !== 'table') return;
    const r = p.sheets[i]?.rows ?? [];
    const d = detectHeader(r);
    setSheet(i); setHeader(d.header); setSkipLabel(d.skipLabelRow); setMapping(autoMap(r[d.header] ?? []));
  };

  const onFile = async (files: File[]) => {
    const f = files[0]; if (!f) return;
    setJsonError(''); setOverrides({}); setResult(null);
    try {
      const p = await parseFile(f);
      setFileName(f.name); setParsed(p);
      if (p.kind === 'json') { candidatesFromJson(p.json); setStep('review'); }
      else {
        const first = p.sheets.findIndex(s => s.rows.length > 0);
        if (first < 0) { toast('Fișierul nu conține date.', 'bad'); return; }
        pickSheet(p, first); setStep('map');
      }
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Fișierul nu a putut fi citit.');
    }
  };

  const candidates: Candidate[] = useMemo(() => {
    if (!parsed) return [];
    try {
      if (parsed.kind === 'json') return candidatesFromJson(parsed.json);
      const start = header + 1 + (skipLabel ? 1 : 0);
      return candidatesFromTable(rows.slice(start), mapping, start + 1, defaultCategory || null);
    } catch { return []; }
  }, [parsed, rows, header, skipLabel, mapping, defaultCategory]);

  const built: ImportRow[] = useMemo(() => buildRows(candidates, { keyField, existingDefault, allowErrors }), [candidates, keyField, existingDefault, allowErrors]);
  const final = built.map(r => ({ ...r, action: overrides[r.line] ?? r.action }));
  const stats = {
    total: final.length,
    ready: final.filter(r => r.action !== 'skip').length,
    errors: final.filter(r => r.errors.length).length,
    dups: final.filter(r => r.dupInFile || r.existing).length,
    updates: final.filter(r => r.action === 'update').length,
    missing: final.filter(r => r.missing.length).length,
  };
  const visible = final.filter(r => filter === 'toate' || (filter === 'erori' && r.errors.length) || (filter === 'duplicate' && (r.dupInFile || r.existing)) || (filter === 'lipsuri' && r.missing.length));
  const matched = mapping.filter(Boolean).length;

  const reset = () => { setParsed(null); setFileName(''); setStep('upload'); setOverrides({}); setResult(null); };

  const errorReport = () => {
    const bad = final.filter(r => r.errors.length);
    const head = parsed?.kind === 'table' ? [...headers, '_rand', '_eroare'] : ['_rand', 'json', '_eroare'];
    const body = bad.map(r => {
      const msg = r.errors.map(e => `${fieldLabel(e.field)}: ${e.message}`).join(' | ');
      return parsed?.kind === 'table' ? [...headers.map((_, i) => r.source[i] ?? ''), String(r.line), msg] : [String(r.line), r.source[0] ?? '', msg];
    });
    downloadCsv(Papa.unparse([head, ...body]), `erori-${fileName.replace(/\.[^.]+$/, '')}.csv`);
  };

  const run = () => {
    const res = applyImport(final, { fillManufacturer });
    importActions.log({ fileName, rows: final.length, created: res.created, updated: res.updated, skipped: res.skipped, errors: stats.errors, target: 'passports' });
    setResult(res); setStep('done');
    toast(`Import finalizat: ${res.created} create, ${res.updated} actualizate`);
  };

  if (step === 'upload') return (
    <div className="stack lg">
      <FileDrop accept=".csv,.xlsx,.xls,.ods,.json" onFiles={onFile}>
        <b>Trage aici fișierul cu pașapoarte</b><span className="small">CSV, Excel sau JSON (din scriptul CLI) · un rând = un pașaport</span>
      </FileDrop>
      {jsonError && <Callout kind="bad">{jsonError}</Callout>}
      <div className="row small muted"><Icon name="info" size={14} />Nu ai un fișier? <Link to="/import?tab=sabloane">Descarcă un șablon</Link></div>
    </div>
  );

  if (step === 'done' && result) return (
    <div className="card stack" style={{ justifyItems: 'start' }}>
      <div className="count-cards" style={{ width: '100%' }}>
        <div className="count-card ok"><span className="v">{result.created}</span><span className="l">create</span></div>
        <div className="count-card"><span className="v">{result.updated}</span><span className="l">actualizate</span></div>
        <div className="count-card warn"><span className="v">{result.skipped}</span><span className="l">sărite</span></div>
      </div>
      <div className="row"><Link className="btn primary" to="/pasapoarte">Vezi pașapoartele</Link><button className="btn" onClick={reset}>Import nou</button></div>
    </div>
  );

  return (
    <div className="stack lg">
      <div className="card tight row between">
        <span className="row"><Icon name="doc" size={16} /><b>{fileName}</b>
          {parsed?.kind === 'table' && parsed.sheets.length > 1 && (
            <select className="select" style={{ width: 'auto' }} value={sheet} onChange={e => parsed && pickSheet(parsed, Number(e.target.value))} aria-label="Foaie">
              {parsed.sheets.map((s, i) => <option key={s.name} value={i}>{s.name} ({s.rows.length})</option>)}
            </select>)}
        </span>
        <span className="row">
          {parsed?.kind === 'table' && <Segmented value={step} onChange={v => setStep(v)} items={[{ value: 'map', label: '1 · Coloane' }, { value: 'review', label: '2 · Verificare' }]} />}
          <button className="btn ghost" onClick={reset}><Icon name="x" />Alt fișier</button>
        </span>
      </div>

      {step === 'map' && parsed?.kind === 'table' && (
        <div className="card flush">
          <div className="row between" style={{ padding: '14px 16px' }}>
            <div className="row">
              <label className="small muted" htmlFor="hdr">Rând antet</label>
              <select id="hdr" className="select" style={{ width: 'auto' }} value={header} onChange={e => { const h = Number(e.target.value); setHeader(h); setMapping(autoMap(rows[h] ?? [])); }}>
                {rows.slice(0, 10).map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
              </select>
              <Switch checked={skipLabel} onChange={setSkipLabel} label={<span className="small">Rândul 2 are etichete</span>} />
            </div>
            <div className="row">
              <span className="badge accent">{matched} / {headers.length} coloane potrivite</span>
              <button className="btn sm" onClick={() => setMapping(autoMap(headers))}><Icon name="refresh" />Automat</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table map-table">
              <thead><tr><th>Coloană în fișier</th><th>Exemplu</th><th>Câmp în pașaport</th></tr></thead>
              <tbody>{headers.map((h, i) => {
                const start = header + 1 + (skipLabel ? 1 : 0);
                const sample = rows.slice(start, start + 2).map(r => r[i]).filter(Boolean).join(' · ');
                return <tr key={i}>
                  <td><b>{h || <span className="faint">(fără nume)</span>}</b></td>
                  <td className="sample ellipsis">{sample}</td>
                  <td><FieldSelect value={mapping[i] ?? ''} onChange={v => setMapping(m => { const n = [...m]; for (let k = 0; k < n.length; k++) if (v && n[k] === v) n[k] = ''; n[i] = v; return n; })} /></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <div className="row between" style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
            <div className="row">
              <label className="small muted" htmlFor="defcat">Categorie implicită</label>
              <select id="defcat" className="select" style={{ width: 'auto' }} value={defaultCategory} onChange={e => setDefaultCategory(e.target.value as BatteryCategory | '')}>
                <option value="">— din fișier —</option>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <button className="btn primary" disabled={!mapping.includes('product_name')} onClick={() => setStep('review')}>Continuă<Icon name="arrowRight" /></button>
          </div>
          {!mapping.includes('product_name') && <div style={{ padding: '0 16px 14px' }}><Callout kind="warn">Alege coloana cu denumirea produsului.</Callout></div>}
        </div>
      )}

      {step === 'review' && (<>
        <div className="count-cards">
          <div className="count-card"><span className="v">{stats.total}</span><span className="l">rânduri</span></div>
          <div className="count-card ok"><span className="v">{stats.ready}</span><span className="l">de importat</span></div>
          <div className="count-card bad"><span className="v">{stats.errors}</span><span className="l">cu erori</span></div>
          <div className="count-card warn"><span className="v">{stats.dups}</span><span className="l">duplicate</span></div>
          <div className="count-card"><span className="v">{stats.updates}</span><span className="l">actualizări</span></div>
        </div>

        <div className="card tight row" style={{ gap: '10px 18px' }}>
          <span className="row small"><span className="muted">Cheie</span>
            <select className="select" style={{ width: 'auto' }} value={keyField} onChange={e => { setKeyField(e.target.value as KeyField); setOverrides({}); }}>
              <option value="gtin">GTIN</option><option value="battery_model_identifier">Cod model</option>
            </select></span>
          <span className="row small"><span className="muted">Dacă există deja</span>
            <select className="select" style={{ width: 'auto' }} value={existingDefault} onChange={e => { setExistingDefault(e.target.value as RowAction); setOverrides({}); }}>
              <option value="update">actualizează</option><option value="skip">sari peste</option><option value="create">creează altul</option>
            </select></span>
          <Switch checked={allowErrors} onChange={v => { setAllowErrors(v); setOverrides({}); }} label={<span className="small">Importă și rândurile cu erori (fără câmpurile greșite)</span>} />
          <Switch checked={fillManufacturer} onChange={setFillManufacturer} label={<span className="small">Producător din setări</span>} />
        </div>

        <div className="card flush">
          <div className="row between" style={{ padding: '10px 14px' }}>
            <Segmented value={filter} onChange={setFilter} items={[{ value: 'toate', label: 'Toate' }, { value: 'erori', label: `Erori ${stats.errors}` }, { value: 'duplicate', label: `Duplicate ${stats.dups}` }, { value: 'lipsuri', label: `Incomplete ${stats.missing}` }]} />
            {stats.errors > 0 && <button className="btn sm" onClick={errorReport}><Icon name="download" />Raport erori CSV</button>}
          </div>
          <div className="table-wrap">
            <table className="table preview-table">
              <thead><tr><th className="shrink">Rând</th><th>Produs</th><th>Cheie</th><th>Verificare</th><th className="shrink">Acțiune</th></tr></thead>
              <tbody>
                {visible.slice(0, 300).map(r => (
                  <tr key={r.line}>
                    <td className="num faint">{r.line}</td>
                    <td><b>{r.name || '—'}</b><div className="faint small">{r.category ? CATEGORIES.find(c => c.value === r.category)?.short : 'fără categorie'}</div></td>
                    <td className="mono">{r.key ?? '—'}</td>
                    <td>
                      {r.errors.map((e, i) => <span key={'e' + i} className="chip-err" title={e.message}>{fieldLabel(e.field)}: {e.message}</span>)}
                      {r.dupInFile && <span className="chip-warn">Duplicat în fișier</span>}
                      {r.existing && <span className="chip-warn">Există: {r.existing.name}</span>}
                      {r.missing.length > 0 && <span className="chip-warn" title={r.missing.join(', ')}>{r.missing.length} câmpuri obligatorii lipsă</span>}
                      {!r.errors.length && !r.dupInFile && !r.existing && !r.missing.length && <span className="chip-ok"><Icon name="check" size={12} />Complet</span>}
                    </td>
                    <td>
                      <select className="select" value={r.action} onChange={e => setOverrides(o => ({ ...o, [r.line]: e.target.value as RowAction }))}>
                        <option value="create">creează</option>
                        <option value="update" disabled={!r.existing}>actualizează</option>
                        <option value="skip">sari peste</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={5}><Empty icon="check" title="Nimic de afișat" /></td></tr>}
              </tbody>
            </table>
          </div>
          {visible.length > 300 && <div className="faint small" style={{ padding: '8px 14px' }}>Se afișează primele 300 din {visible.length}.</div>}
        </div>

        <div className="row end">
          {parsed?.kind === 'table' && <button className="btn" onClick={() => setStep('map')}><Icon name="chevronLeft" />Coloane</button>}
          <button className="btn primary" disabled={stats.ready === 0} onClick={run}><Icon name="import" />Importă {stats.ready} {stats.ready === 1 ? 'rând' : 'rânduri'}</button>
        </div>
      </>)}
    </div>
  );
}

// ───────────────────────── Baterii (serii) ─────────────────────────
type UnitRow = { serial: string; batch?: string; month?: string; status: UnitStatus; problem?: string };

function UnitsImport() {
  const toast = useToast();
  const passports = useDB(d => d.passports).filter(p => p.status !== 'trashed' && profileOf(p.category) === 'battery_full');
  const allUnits = useDB(d => d.units);
  const [pid, setPid] = useState(passports[0]?.id ?? '');
  const [text, setText] = useState('');
  const [batch, setBatch] = useState('');
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState<UnitStatus>('original');
  const [fileRows, setFileRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState('');
  const [refused, setRefused] = useState<{ serial: string; reason: string }[] | null>(null);

  const parsedRows: UnitRow[] = useMemo(() => {
    const table = fileRows ?? (text.trim() ? (/[;,\t]/.test(text) ? parseCsv(text) : text.split(/\r?\n/).map(l => [l.trim()])) : []);
    if (!table.length) return [];
    const map = mapAliases(table[0]!, ['serial', 'batch', 'manufacturing_date', 'status']);
    const hasHeader = map.serial !== undefined;
    const body = hasHeader ? table.slice(1) : table;
    const col = (r: string[], k: string, fallback: number) => (hasHeader ? (map[k] !== undefined ? r[map[k]!] : undefined) : r[fallback]) ?? '';
    const existing = new Set(allUnits.filter(u => u.passportId === pid).map(u => u.serial));
    const seen = new Set<string>();
    return body.map(r => {
      const serial = col(r, 'serial', 0).trim();
      const b = col(r, 'batch', 1).trim() || batch || undefined;
      const mRaw = col(r, 'manufacturing_date', 2).trim();
      const m = mRaw ? parseMonth(mRaw) ?? undefined : month || undefined;
      const sRaw = col(r, 'status', 3).trim();
      const st = sRaw ? parseStatus(sRaw) : status;
      let problem: string | undefined;
      if (!SERIAL_RE.test(serial)) problem = 'Serie invalidă (max 20, set GS1)';
      else if (existing.has(serial)) problem = 'Există deja';
      else if (seen.has(serial)) problem = 'Duplicat în listă';
      else if (mRaw && !parseMonth(mRaw)) problem = 'Lună invalidă';
      else if (!st) problem = `Status necunoscut: ${sRaw}`;
      seen.add(serial);
      return { serial, batch: b, month: m, status: st ?? 'original', problem };
    }).filter(r => r.serial);
  }, [fileRows, text, batch, month, status, pid, allUnits]);

  const ok = parsedRows.filter(r => !r.problem);
  const bad = parsedRows.filter(r => r.problem);

  const onFile = async (files: File[]) => {
    const f = files[0]; if (!f) return;
    const p = await parseFile(f);
    if (p.kind !== 'table') { toast('Folosește CSV sau Excel.', 'bad'); return; }
    setFileRows(p.sheets[0]?.rows ?? []); setFileName(f.name); setRefused(null);
  };

  const run = () => {
    const groups = new Map<string, UnitRow[]>();
    for (const r of ok) { const k = `${r.batch ?? ''}|${r.month ?? ''}|${r.status}`; groups.set(k, [...(groups.get(k) ?? []), r]); }
    let added = 0; const ref: { serial: string; reason: string }[] = [];
    for (const g of groups.values()) {
      const res = unitActions.add(pid, g.map(x => x.serial), { batch: g[0]!.batch, manufacturingDate: g[0]!.month, status: g[0]!.status });
      added += res.added.length; ref.push(...res.refused);
    }
    importActions.log({ fileName: fileName || 'lipire manuală', rows: parsedRows.length, created: added, updated: 0, skipped: bad.length + ref.length, errors: bad.length, target: 'units' });
    setRefused([...bad.map(b => ({ serial: b.serial, reason: b.problem! })), ...ref]);
    setText(''); setFileRows(null); setFileName('');
    toast(`${added} baterii adăugate`);
  };

  if (!passports.length) return <div className="card"><Empty icon="battery" title="Niciun pașaport de baterie" action={<Link className="btn primary" to="/pasapoarte/nou">Pașaport nou</Link>}>Bateriile individuale se adaugă la un model EV, LMT sau industrial &gt; 2 kWh.</Empty></div>;

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card stack">
        <div className="field"><label htmlFor="u-pp">Model</label>
          <select id="u-pp" className="select" value={pid} onChange={e => setPid(e.target.value)}>{passports.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        {fileRows ? (
          <div className="callout info"><Icon name="doc" /><div className="grow"><b>{fileName}</b> · {fileRows.length} rânduri</div><button className="btn sm ghost" onClick={() => { setFileRows(null); setFileName(''); }}><Icon name="x" /></button></div>
        ) : (
          <div className="field"><label htmlFor="u-txt">Serii</label>
            <textarea id="u-txt" className="textarea mono" rows={8} placeholder={'HC10-2611-000001\nHC10-2611-000002\n…\n\nsau CSV: serial;batch;manufacturing_date;status'} value={text} onChange={e => { setText(e.target.value); setRefused(null); }} />
            <span className="hint">sau <FileInline onFiles={onFile} /></span>
          </div>
        )}
        <div className="grid-3">
          <div className="field"><label htmlFor="u-b">Lot</label><input id="u-b" className="input" value={batch} onChange={e => setBatch(e.target.value)} placeholder="L2611-01" /></div>
          <div className="field"><label htmlFor="u-m">Luna fabricației</label><input id="u-m" className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
          <div className="field"><label htmlFor="u-s">Status</label>
            <select id="u-s" className="select" value={status} onChange={e => setStatus(e.target.value as UnitStatus)}>{Object.entries(UNIT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div className="row end"><button className="btn primary" disabled={!ok.length || !pid} onClick={run}><Icon name="plus" />Adaugă {ok.length} baterii</button></div>
      </div>

      <div className="stack">
        <div className="count-cards">
          <div className="count-card ok"><span className="v">{ok.length}</span><span className="l">valide</span></div>
          <div className="count-card bad"><span className="v">{bad.length}</span><span className="l">cu probleme</span></div>
        </div>
        {(bad.length > 0 || (refused && refused.length > 0)) && (
          <div className="card flush"><div className="table-wrap"><table className="table">
            <thead><tr><th>Serie</th><th>Problemă</th></tr></thead>
            <tbody>{(refused ?? bad.map(b => ({ serial: b.serial, reason: b.problem! }))).slice(0, 200).map((r, i) => <tr key={i}><td className="mono">{r.serial}</td><td><span className="chip-err">{r.reason}</span></td></tr>)}</tbody>
          </table></div></div>
        )}
        {refused && refused.length === 0 && <Callout kind="ok">Toate seriile au fost adăugate.</Callout>}
      </div>
    </div>
  );
}

function FileInline({ onFiles, label = 'încarcă CSV / Excel' }: { onFiles: (f: File[]) => void; label?: string }) {
  return <label className="linkbtn" style={{ cursor: 'pointer' }}>{label}<input type="file" hidden accept=".csv,.xlsx,.xls,.ods,.txt" onChange={e => { onFiles([...(e.target.files ?? [])]); e.target.value = ''; }} /></label>;
}

// ───────────────────────── Valori baterii ─────────────────────────
type ReadingRow = { line: number; serial: string; unitId?: string; field?: FieldDef; value?: unknown; date: string; source: ReturnType<typeof parseSource>; note?: string; problem?: string };

function ReadingsImport() {
  const toast = useToast();
  const units = useDB(d => d.units);
  const passports = useDB(d => d.passports);
  const [table, setTable] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [done, setDone] = useState<number | null>(null);

  const rows: ReadingRow[] = useMemo(() => {
    const t = table ?? (text.trim() ? parseCsv(text) : []);
    if (t.length < 2) return [];
    const map = mapAliases(t[0]!, READING_COLUMNS.map(c => (c === 'observed_on' ? 'observed_on' : c)));
    const bySerial = new Map<string, string[]>();
    for (const u of units) bySerial.set(u.serial, [...(bySerial.get(u.serial) ?? []), u.id]);
    const today = new Date().toISOString().slice(0, 10);
    return t.slice(1).map((r, i) => {
      const get = (k: string) => (map[k] !== undefined ? (r[map[k]!] ?? '').trim() : '');
      const serial = get('serial');
      const ids = bySerial.get(serial) ?? [];
      const field = matchReadingField(get('field'));
      const rawDate = get('observed_on');
      const date = rawDate ? parseDate(rawDate) : today;
      const row: ReadingRow = { line: i + 2, serial, unitId: ids[0], field: field ?? undefined, date: date ?? today, source: parseSource(get('source')), note: get('note') || undefined };
      if (!serial) row.problem = 'Lipsește seria';
      else if (!ids.length) row.problem = 'Serie necunoscută';
      else if (ids.length > 1) row.problem = 'Serie prezentă la mai multe modele';
      else if (!field) row.problem = `Câmp necunoscut: ${get('field') || '—'}`;
      else if (!date) row.problem = 'Dată invalidă';
      else if (field.name === 'status') {
        const st = parseStatus(get('value'));
        const u = units.find(x => x.id === ids[0]);
        if (!st) row.problem = 'Status necunoscut';
        else if (u && !canTransition(u.status, st)) row.problem = `Tranziție nepermisă: ${UNIT_STATUS_LABEL[u.status]} → ${UNIT_STATUS_LABEL[st]}`;
        else row.value = st;
      } else {
        const c = coerce(field, get('value'));
        if (c.error) row.problem = c.error; else if (c.value === undefined) row.problem = 'Lipsește valoarea'; else row.value = c.value;
      }
      return row;
    });
  }, [table, text, units]);

  const ok = rows.filter(r => !r.problem);
  const onFile = async (files: File[]) => {
    const f = files[0]; if (!f) return;
    const p = await parseFile(f);
    if (p.kind !== 'table') { toast('Folosește CSV sau Excel.', 'bad'); return; }
    setTable(p.sheets[0]?.rows ?? []); setFileName(f.name); setDone(null);
  };
  const run = () => {
    for (const r of ok) {
      if (r.field!.name === 'status') unitActions.changeStatus(r.unitId!, r.value as UnitStatus, { observedOn: r.date, note: r.note });
      else unitActions.recordReading(r.unitId!, { field: r.field!.name, value: r.value, observedOn: r.date, source: r.source, note: r.note });
    }
    importActions.log({ fileName: fileName || 'lipire manuală', rows: rows.length, created: ok.length, updated: 0, skipped: rows.length - ok.length, errors: rows.length - ok.length, target: 'readings' });
    setDone(ok.length); setTable(null); setText(''); setFileName('');
    toast(`${ok.length} valori înregistrate`);
  };
  const pName = (unitId?: string) => passports.find(p => p.id === units.find(u => u.id === unitId)?.passportId)?.name;

  return (
    <div className="stack lg">
      {!table ? (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <FileDrop accept=".csv,.xlsx,.xls,.ods" onFiles={onFile}><b>Fișier cu valori</b><span className="small mono">serial · field · value · observed_on · source · note</span></FileDrop>
          <div className="field"><label htmlFor="r-txt">sau lipește CSV</label>
            <textarea id="r-txt" className="textarea mono" rows={6} value={text} onChange={e => { setText(e.target.value); setDone(null); }} placeholder={'serial;field;value;observed_on;source\nHC10-2609-000181;remaining_capacity;192,4;2026-11-20;bms'} /></div>
        </div>
      ) : (
        <div className="card tight row between"><span className="row"><Icon name="doc" size={16} /><b>{fileName}</b><span className="faint">{rows.length} rânduri</span></span><button className="btn ghost" onClick={() => setTable(null)}><Icon name="x" />Alt fișier</button></div>
      )}
      {done !== null && <Callout kind="ok">{done} valori înregistrate în istoricul bateriilor.</Callout>}
      {rows.length > 0 && (<>
        <div className="count-cards">
          <div className="count-card ok"><span className="v">{ok.length}</span><span className="l">valide</span></div>
          <div className="count-card bad"><span className="v">{rows.length - ok.length}</span><span className="l">cu probleme</span></div>
        </div>
        <div className="card flush"><div className="table-wrap"><table className="table">
          <thead><tr><th className="shrink">Rând</th><th>Serie</th><th>Câmp</th><th>Valoare</th><th>Data</th><th>Sursă</th><th>Verificare</th></tr></thead>
          <tbody>{rows.slice(0, 300).map(r => (
            <tr key={r.line}>
              <td className="faint num">{r.line}</td>
              <td><span className="mono">{r.serial}</span>{r.unitId && <div className="faint small">{pName(r.unitId)}</div>}</td>
              <td>{r.field?.label_ro ?? '—'}</td>
              <td className="num">{r.value !== undefined ? (r.field?.name === 'status' ? UNIT_STATUS_LABEL[r.value as UnitStatus] : String(r.value)) : '—'}</td>
              <td className="nowrap">{r.date}</td>
              <td>{r.source}</td>
              <td>{r.problem ? <span className="chip-err">{r.problem}</span> : <span className="chip-ok"><Icon name="check" size={12} />OK</span>}</td>
            </tr>))}</tbody>
        </table></div></div>
        <div className="row end"><button className="btn primary" disabled={!ok.length} onClick={run}><Icon name="import" />Înregistrează {ok.length} valori</button></div>
      </>)}
    </div>
  );
}

// ───────────────────────── Șabloane ─────────────────────────
function xlsxBlob(sheets: { name: string; rows: (string | number)[][]; widths?: number[] }[]): Blob {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    ws['!cols'] = (s.widths ?? s.rows[0]?.map(h => Math.min(40, Math.max(12, String(h).length + 2))) ?? []).map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function fieldReferenceSheet() {
  return {
    name: 'Câmpuri', widths: [44, 50, 12, 12, 16, 60],
    rows: [['câmp', 'etichetă', 'tip', 'unitate', 'obligatoriu', 'opțiuni (valoare)'] as (string | number)[]].concat(
      MODEL_FIELDS.map(f => [f.name, f.label_ro, f.type, f.unit ?? '', f.requirement === 'required' ? (f.required_from ? `din ${f.required_from}` : 'da') : f.requirement === 'recommended' ? 'recomandat' : '', (f.options ?? (f.name === 'battery_category' ? CATEGORIES.map(c => ({ value: c.value, label: c.label })) : [])).map(o => o.value).join('; ')])),
  };
}

function Templates() {
  const passportTemplate = (kind: 'required' | 'all' | 'example', fmt: 'csv' | 'xlsx') => {
    const cols = orderColumns(kind === 'required' ? REQUIRED_FIELDS : MODEL_FIELDS);
    const names = cols.map(f => (f.requirement === 'required' || f.name === 'product_name' ? f.name + '*' : f.name));
    let body: string[][] = [];
    if (kind === 'example') {
      const demo = getDB().passports.filter(p => p.status !== 'trashed')
        .sort((a, b) => Object.values(b.data).reduce((n, s) => n + Object.keys(s).length, 0) - Object.values(a.data).reduce((n, s) => n + Object.keys(s).length, 0)).slice(0, 2);
      body = passportRows(demo, cols);
    }
    const base = `sablon-pasapoarte-${kind === 'required' ? 'obligatorii' : kind === 'all' ? 'complet' : 'exemplu'}`;
    if (fmt === 'csv') downloadCsv(Papa.unparse([names, ...body]), base + '.csv');
    else downloadBlob(xlsxBlob([{ name: 'Pașapoarte', rows: [names, cols.map(f => f.label_ro), ...body] }, fieldReferenceSheet()]), base + '.xlsx');
  };
  const unitsTemplate = (fmt: 'csv' | 'xlsx') => {
    const rows = [UNIT_COLUMNS, ['HC10-2611-000001', 'L2611-01', '2026-11', 'original'], ['HC10-2611-000002', 'L2611-01', '2026-11', 'original']];
    fmt === 'csv' ? downloadCsv(Papa.unparse(rows), 'sablon-baterii.csv') : downloadBlob(xlsxBlob([{ name: 'Baterii', rows }]), 'sablon-baterii.xlsx');
  };
  const readingsTemplate = (fmt: 'csv' | 'xlsx') => {
    const rows = [READING_COLUMNS, ['HC10-2609-000181', 'remaining_capacity', '192.4', '2026-11-20', 'bms', ''], ['HC10-2609-000181', 'charge_discharge_cycles', '640', '2026-11-20', 'bms', ''], ['HC10-2609-000182', 'status', 'repurposed', '2026-11-21', 'brand_statement', 'Preluată pentru stocare comercială']];
    fmt === 'csv' ? downloadCsv(Papa.unparse(rows), 'sablon-valori.csv') : downloadBlob(xlsxBlob([{ name: 'Valori', rows }, { name: 'Câmpuri', rows: [['field', 'etichetă', 'unitate'], ...FIELDS.filter(f => f.section === 'unitate').map(f => [f.name, f.label_ro, f.unit ?? ''])] }]), 'sablon-valori.xlsx');
  };
  const Card = ({ icon, title, desc, onCsv, onXlsx }: { icon: string; title: string; desc: string; onCsv: () => void; onXlsx: () => void }) => (
    <div className="fmt-card">
      <div className="top"><span className="ic"><Icon name={icon} /></span><div><b>{title}</b><span className="d">{desc}</span></div></div>
      <div className="row"><button className="btn sm" onClick={onXlsx}><Icon name="download" />Excel</button><button className="btn sm" onClick={onCsv}><Icon name="download" />CSV</button></div>
    </div>
  );
  return (
    <div className="dz-cards">
      <Card icon="passport" title="Pașapoarte — obligatorii" desc={`${REQUIRED_FIELDS.length} coloane, * = obligatoriu`} onCsv={() => passportTemplate('required', 'csv')} onXlsx={() => passportTemplate('required', 'xlsx')} />
      <Card icon="passport" title="Pașapoarte — toate câmpurile" desc={`${MODEL_FIELDS.length} coloane + foaie de referință`} onCsv={() => passportTemplate('all', 'csv')} onXlsx={() => passportTemplate('all', 'xlsx')} />
      <Card icon="sparkle" title="Exemplu completat" desc="2 rânduri din datele demo" onCsv={() => passportTemplate('example', 'csv')} onXlsx={() => passportTemplate('example', 'xlsx')} />
      <Card icon="battery" title="Baterii (serii)" desc="serial · lot · lună · status" onCsv={() => unitsTemplate('csv')} onXlsx={() => unitsTemplate('xlsx')} />
      <Card icon="pulse" title="Valori baterii" desc="SoH, cicluri, status, evenimente" onCsv={() => readingsTemplate('csv')} onXlsx={() => readingsTemplate('xlsx')} />
    </div>
  );
}

// ───────────────────────── CLI ─────────────────────────
function Cmd({ cmd }: { cmd: string }) {
  return <div className="cmd-row"><pre className="code-block">{cmd}</pre><CopyButton text={cmd} label="" /></div>;
}
function CliDocs() {
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card stack">
        <div className="card-head" style={{ margin: 0 }}><h3>Script <span className="mono">cli/dpp.mjs</span></h3><span className="badge">Node 18+</span></div>
        <div className="stack sm"><span className="section-title">Șablon</span><Cmd cmd="node cli/dpp.mjs template --out sablon.xlsx" /><Cmd cmd="node cli/dpp.mjs template --all --out sablon-complet.csv" /></div>
        <div className="stack sm"><span className="section-title">Verificare</span><Cmd cmd="node cli/dpp.mjs validate produse.xlsx" /></div>
        <div className="stack sm"><span className="section-title">Conversie → JSON pentru import</span><Cmd cmd="node cli/dpp.mjs convert produse.xlsx --out pasapoarte.json" /></div>
        <div className="stack sm"><span className="section-title">Trimitere directă prin API</span><Cmd cmd="node cli/dpp.mjs push produse.xlsx --api https://dpp.firma.ro --key dpp_live_…" /><span className="hint">API-ul REST vine odată cu backend-ul; până atunci folosește <span className="mono">--dry-run</span>.</span></div>
      </div>
      <div className="card stack">
        <div className="card-head" style={{ margin: 0 }}><h3>Folder urmărit</h3><span className="badge accent">automat</span></div>
        <Cmd cmd="node cli/dpp.mjs watch D:\DPP\intrare --out D:\DPP\procesate" />
        <ol className="stack sm" style={{ margin: 0, paddingLeft: 18 }}>
          <li>ERP-ul sau colegii salvează CSV / Excel în <span className="mono">intrare</span>.</li>
          <li>Scriptul îl verifică și îl convertește imediat.</li>
          <li>Fără erori → <span className="mono">procesate/</span> + JSON gata de import.</li>
          <li>Cu erori → <span className="mono">erori/</span> + raport <span className="mono">.txt</span>.</li>
          <li>JSON-ul se încarcă aici, la <Link to="/import">Pașapoarte</Link>, sau cu <span className="mono">push</span>.</li>
        </ol>
        <Callout kind="info">Coloanele se recunosc după numele câmpului sau eticheta în română, exact ca în import.</Callout>
      </div>
    </div>
  );
}

// ───────────────────────── Istoric ─────────────────────────
function History() {
  const list = useDB(d => d.imports);
  const label = { passports: 'Pașapoarte', units: 'Baterii', readings: 'Valori' } as const;
  if (!list.length) return <div className="card"><Empty icon="import" title="Niciun import încă" /></div>;
  return (
    <div className="card flush"><div className="table-wrap"><table className="table">
      <thead><tr><th>Data</th><th>Fișier</th><th>Tip</th><th className="shrink">Rânduri</th><th className="shrink">Create</th><th className="shrink">Actualizate</th><th className="shrink">Sărite</th><th className="shrink">Erori</th><th>De către</th></tr></thead>
      <tbody>{list.map(j => (
        <tr key={j.id}>
          <td className="nowrap">{fmtDateTime(j.at)}</td><td className="mono">{j.fileName}</td><td>{label[j.target]}</td>
          <td className="num">{j.rows}</td><td className="num">{j.created}</td><td className="num">{j.updated}</td><td className="num">{j.skipped}</td>
          <td className="num">{j.errors ? <span className="badge bad">{j.errors}</span> : 0}</td><td>{j.by}</td>
        </tr>))}</tbody>
    </table></div></div>
  );
}

