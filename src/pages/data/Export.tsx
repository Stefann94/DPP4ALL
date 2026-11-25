import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import '../../styles/data.css';
import { getDB, update, useDB } from '../../api/store';
import { FIELD, SECTIONS, TIER_LABEL } from '../../data/catalog';
import { digitalLink, toGtin14 } from '../../lib/gs1';
import { downloadBlob, downloadCsv, downloadJson, readAsArrayBuffer, readAsText } from '../../lib/download';
import { toEN18223 } from '../../lib/en18223';
import { fmtDateTime } from '../../lib/format';
import { qrSvg } from '../../components/Codes';
import { Callout, ConfirmButton, FileDrop, Icon, PageHead, Segmented, StatusBadge, useToast } from '../../components/ui';
import { MODEL_FIELDS, passportRows, serializeValue, slug, usedColumns } from './_columns';
import type { AccessTier, DB, Passport } from '../../types';

type Scope = 'toate' | 'publicate' | 'selectate';
const stamp = () => new Date().toISOString().slice(0, 10);

/** Adds QR SVGs (model + every unit) for published passports, plus manifest.csv. */
async function addQrCodes(zip: JSZip, list: Passport[], root = '') {
  const db = getDB();
  const manifest: string[][] = [['fisier', 'pasaport', 'gtin', 'serie', 'url']];
  for (const p of list.filter(x => x.status === 'published')) {
    const url = digitalLink(db.org.resolver, p.gtin);
    if (!url) continue;
    const dir = `${root}${slug(p.name)}/`;
    zip.file(dir + 'model.svg', await qrSvg(url, { sizeMm: 25 }));
    manifest.push([dir + 'model.svg', p.name, toGtin14(p.gtin ?? '') ?? '', '', url]);
    for (const u of db.units.filter(x => x.passportId === p.id)) {
      const uu = digitalLink(db.org.resolver, p.gtin, { serial: u.serial });
      if (!uu) continue;
      const f = `${dir}${slug(u.serial)}.svg`;
      zip.file(f, await qrSvg(uu, { sizeMm: 25 }));
      manifest.push([f, p.name, toGtin14(p.gtin ?? '') ?? '', u.serial, uu]);
    }
  }
  zip.file(root + 'manifest.csv', '﻿' + Papa.unparse(manifest));
  return manifest.length - 1;
}

const dataUrlBytes = async (u: string) => new Uint8Array(await (await fetch(u)).arrayBuffer());

export default function Export() {
  const toast = useToast();
  const [sp] = useSearchParams();
  const all = useDB(d => d.passports).filter(p => p.status !== 'trashed');
  const preIds = (sp.get('ids') ?? '').split(',').filter(Boolean);
  const [scope, setScope] = useState<Scope>(preIds.length ? 'selectate' : 'toate');
  const [picked, setPicked] = useState<Set<string>>(() => new Set(preIds));
  const [busy, setBusy] = useState('');
  const [tier, setTier] = useState<AccessTier>('authority');

  const list = useMemo(() => scope === 'toate' ? all : scope === 'publicate' ? all.filter(p => p.status === 'published') : all.filter(p => picked.has(p.id)), [scope, all, picked]);
  const ids = new Set(list.map(p => p.id));
  const units = useDB(d => d.units).filter(u => ids.has(u.passportId));
  const readings = useDB(d => d.readings).filter(r => ids.has(r.passportId));

  const job = (key: string, fn: () => Promise<void> | void) => async () => {
    if (!list.length) { toast('Nu e niciun pașaport în selecție.', 'bad'); return; }
    setBusy(key);
    try { await fn(); } catch (e) { toast('Exportul a eșuat: ' + (e instanceof Error ? e.message : 'eroare'), 'bad'); }
    finally { setBusy(''); }
  };

  const unitRows = () => {
    const keys = [...new Set(units.flatMap(u => Object.keys(u.values ?? {})))].filter(k => k !== 'status');
    const head = ['serial', 'passport', 'gtin', 'batch', 'manufacturing_date', 'status', ...keys];
    const body = units.map(u => { const p = list.find(x => x.id === u.passportId); return [u.serial, p?.name ?? '', p?.gtin ?? '', u.batch ?? '', u.manufacturingDate ?? '', u.status, ...keys.map(k => serializeValue(FIELD[k], u.values?.[k]))]; });
    return [head, ...body];
  };
  const readingRows = () => {
    const serial = new Map(units.map(u => [u.id, u.serial]));
    return [['serial', 'passport', 'field', 'value', 'observed_on', 'source', 'note', 'recorded_by', 'recorded_at'],
      ...readings.map(r => [serial.get(r.unitId) ?? '', list.find(p => p.id === r.passportId)?.name ?? '', r.field, serializeValue(FIELD[r.field], r.value), r.observedOn, r.source, r.note ?? '', r.recordedBy, r.recordedAt])];
  };

  const exportCsv = job('csv', () => {
    const cols = usedColumns(list);
    downloadCsv(Papa.unparse([cols.map(f => f.name), ...passportRows(list, cols)]), `pasapoarte-${stamp()}.csv`);
  });
  const exportXlsx = job('xlsx', () => {
    const wb = XLSX.utils.book_new();
    const add = (name: string, rows: unknown[][]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.replace(/[\\/?*[\]:]/g, '').slice(0, 31));
    const all = usedColumns(list);
    add('Toate', [all.map(f => f.name), all.map(f => f.label_ro), ...passportRows(list, all)]);
    for (const s of SECTIONS) {
      const cols = usedColumns(list, MODEL_FIELDS.filter(f => f.section === s.id || f.name === 'product_name' || f.name === 'gtin'));
      if (cols.length <= 2) continue;
      add(s.label_ro, [cols.map(f => f.name), cols.map(f => f.label_ro), ...passportRows(list, cols)]);
    }
    if (units.length) add('Baterii', unitRows());
    if (readings.length) add('Istoric valori', readingRows());
    downloadBlob(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer]), `pasapoarte-${stamp()}.xlsx`);
  });
  const exportJson = job('json', () => {
    const db = getDB();
    downloadJson({
      format: 'dpp-platform-export', version: 1, exportedAt: new Date().toISOString(), org: db.org,
      passports: list, units, readings, versions: db.versions.filter(v => ids.has(v.passportId)),
      documents: db.documents.filter(d => d.passportIds.some(x => ids.has(x))).map(({ dataUrl, ...d }) => d),
    }, `pasapoarte-${stamp()}.json`);
  });
  const exportEn = job('en', async () => {
    const db = getDB(); const zip = new JSZip();
    for (const p of list) {
      const s = slug(p.name);
      zip.file(`${s}.json`, JSON.stringify(toEN18223(p, db.org, { tier, documents: db.documents }), null, 2));
      for (const u of db.units.filter(x => x.passportId === p.id)) zip.file(`${s}/baterii/${slug(u.serial)}.json`, JSON.stringify(toEN18223(p, db.org, { unit: u, tier, documents: db.documents }), null, 2));
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `en18223-${tier}-${stamp()}.zip`);
  });
  const exportUnits = job('units', () => downloadCsv(Papa.unparse(unitRows()), `baterii-${stamp()}.csv`));
  const exportReadings = job('readings', () => downloadCsv(Papa.unparse(readingRows()), `istoric-valori-${stamp()}.csv`));
  const exportQr = job('qr', async () => {
    const zip = new JSZip();
    const n = await addQrCodes(zip, list);
    if (!n) { toast('Niciun pașaport publicat cu GTIN valid în selecție.', 'bad'); return; }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `coduri-qr-${stamp()}.zip`);
  });
  const exportBackup = job('backup', async () => {
    const { session, ...rest } = getDB();
    const zip = new JSZip();
    zip.file('data.json', JSON.stringify({ format: 'dpp-platform-backup', version: 1, exportedAt: new Date().toISOString(), db: rest }, null, 2));
    for (const d of rest.documents) if (d.dataUrl) zip.file(`documente/${d.id}-${slug(d.name)}`, await dataUrlBytes(d.dataUrl));
    await addQrCodes(zip, rest.passports.filter(p => p.status !== 'trashed'), 'qr/');
    zip.file('README.txt', [
      'Backup complet — Platforma pașapoarte baterii', `Creat: ${new Date().toISOString()}`, '',
      'data.json    toate datele (pașapoarte, baterii, istoric, versiuni, documente, acces, setări)',
      'documente/   fișierele încărcate', 'qr/          codurile QR ale pașapoartelor publicate + manifest.csv', '',
      'Restaurare: Export și backup → Restaurare din backup → încarcă acest ZIP.',
      'Datele unui pașaport de baterie se păstrează și după reciclare (Reg. (UE) 2023/1542, art. 77(8)).',
    ].join('\n'));
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `backup-complet-${stamp()}.zip`);
    toast('Backup descărcat');
  });

  const cards: { key: string; icon: string; title: string; desc: string; run: () => void; extra?: React.ReactNode }[] = [
    { key: 'csv', icon: 'doc', title: 'CSV pașapoarte', desc: 'Aceleași coloane ca la import', run: exportCsv },
    { key: 'xlsx', icon: 'doc', title: 'Excel', desc: 'O foaie pe secțiune + baterii + istoric', run: exportXlsx },
    { key: 'json', icon: 'terminal', title: 'JSON platformă', desc: 'Complet: pașapoarte, baterii, versiuni', run: exportJson },
    { key: 'en', icon: 'globe', title: 'EN 18223 JSON', desc: 'Un fișier per pașaport și baterie', run: exportEn,
      extra: <select className="select" style={{ width: 'auto', padding: '3px 6px', fontSize: 12.5 }} value={tier} onChange={e => setTier(e.target.value as AccessTier)} aria-label="Nivel de acces">{(Object.keys(TIER_LABEL) as AccessTier[]).map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}</select> },
    { key: 'units', icon: 'battery', title: 'Baterii CSV', desc: `${units.length} baterii cu valorile curente`, run: exportUnits },
    { key: 'readings', icon: 'history', title: 'Istoric valori CSV', desc: `${readings.length} înregistrări`, run: exportReadings },
    { key: 'qr', icon: 'qr', title: 'Coduri QR', desc: 'SVG model + baterii, manifest.csv', run: exportQr },
  ];

  return (
    <div className="page">
      <PageHead title="Export și backup" />
      <div className="card stack">
        <div className="row between">
          <Segmented value={scope} onChange={setScope} items={[{ value: 'toate', label: `Toate (${all.length})` }, { value: 'publicate', label: `Publicate (${all.filter(p => p.status === 'published').length})` }, { value: 'selectate', label: `Selectate (${picked.size})` }]} />
          <span className="faint small">{list.length} pașapoarte · {units.length} baterii</span>
        </div>
        {scope === 'selectate' && (
          <div className="serial-box" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {all.map(p => (
              <label key={p.id} className="check" style={{ fontFamily: 'var(--f)', fontSize: 13.5, padding: '3px 0' }}>
                <input type="checkbox" checked={picked.has(p.id)} onChange={e => setPicked(s => { const n = new Set(s); e.target.checked ? n.add(p.id) : n.delete(p.id); return n; })} />
                <span className="ellipsis">{p.name}</span><StatusBadge status={p.status} />
              </label>))}
          </div>
        )}
      </div>

      <div className="dz-cards">
        {cards.map(c => (
          <div key={c.key} className="fmt-card">
            <div className="top"><span className="ic"><Icon name={c.icon} /></span><div><b>{c.title}</b><span className="d">{c.desc}</span></div></div>
            <div className="row">{c.extra}<button className="btn sm" disabled={!!busy} onClick={c.run}><Icon name={busy === c.key ? 'refresh' : 'download'} />{busy === c.key ? 'Se pregătește…' : 'Descarcă'}</button></div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <div className="card-head" style={{ margin: 0 }}><h3>Backup complet</h3><span className="badge accent">ZIP</span></div>
          <p className="muted small">Toate datele organizației, documentele și codurile QR, indiferent de selecție.</p>
          <div className="row"><button className="btn primary" disabled={!!busy} onClick={exportBackup}><Icon name={busy === 'backup' ? 'refresh' : 'download'} />{busy === 'backup' ? 'Se pregătește…' : 'Descarcă backup'}</button></div>
          <span className="faint small"><Icon name="shield" size={12} /> Datele se păstrează și după reciclarea bateriei (art. 77(8)).</span>
        </div>
        <Restore />
      </div>
    </div>
  );
}

// ───────────────────────── Restore ─────────────────────────
type Incoming = Partial<DB> & { passports: Passport[] };
const COLLECTIONS: { key: keyof DB; label: string }[] = [
  { key: 'passports', label: 'Pașapoarte' }, { key: 'units', label: 'Baterii' }, { key: 'readings', label: 'Valori' }, { key: 'versions', label: 'Versiuni' },
  { key: 'documents', label: 'Documente' }, { key: 'members', label: 'Membri' }, { key: 'accessRequests', label: 'Cereri acces' }, { key: 'accessLog', label: 'Jurnal acces' },
  { key: 'apiKeys', label: 'Chei API' }, { key: 'webhooks', label: 'Webhook-uri' }, { key: 'scans', label: 'Scanări' }, { key: 'audit', label: 'Activitate' },
];

function Restore() {
  const toast = useToast();
  const [data, setData] = useState<Incoming | null>(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  const onFile = async (files: File[]) => {
    const f = files[0]; if (!f) return;
    setErr(''); setData(null);
    try {
      let json: unknown;
      if (f.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(await readAsArrayBuffer(f));
        const entry = zip.file('data.json');
        if (!entry) throw new Error('Arhiva nu conține data.json.');
        json = JSON.parse(await entry.async('string'));
      } else json = JSON.parse(await readAsText(f));
      const o = json as { db?: Incoming } & Incoming;
      const inc = (o.db ?? o) as Incoming;
      if (!Array.isArray(inc.passports)) throw new Error('Fișierul nu conține pașapoarte.');
      setData(inc); setName(f.name);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Fișier invalid.'); }
  };

  const apply = () => {
    if (!data) return;
    update(db => {
      for (const { key } of COLLECTIONS) {
        const inc = data[key];
        if (!Array.isArray(inc)) continue;
        const cur = db[key] as unknown as { id: string }[];
        if (mode === 'replace') (db as unknown as Record<string, unknown>)[key] = inc;
        else {
          const byId = new Map(cur.map(x => [x.id, x]));
          for (const x of inc as { id: string }[]) byId.set(x.id, x);
          (db as unknown as Record<string, unknown>)[key] = [...byId.values()];
        }
      }
      if (mode === 'replace' && data.org) db.org = data.org;
      db.audit = [{ id: 'ae_' + Date.now().toString(36), type: 'backup.restored', actor: db.session?.name ?? 'Sistem', summary: `Restaurare din ${name} (${mode === 'replace' ? 'înlocuire' : 'combinare'})`, at: new Date().toISOString() }, ...db.audit];
    });
    toast('Date restaurate'); setData(null);
  };

  return (
    <div className="card stack">
      <div className="card-head" style={{ margin: 0 }}><h3>Restaurare din backup</h3></div>
      {!data ? <FileDrop accept=".zip,.json" onFiles={onFile}><b>Backup ZIP sau JSON</b><span className="small">backup complet sau JSON platformă</span></FileDrop> : (
        <>
          <div className="row between"><span className="row"><Icon name="doc" size={16} /><b>{name}</b></span><button className="btn ghost sm" onClick={() => setData(null)}><Icon name="x" /></button></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Date</th><th className="shrink">În fișier</th><th className="shrink">Acum</th></tr></thead>
            <tbody>{COLLECTIONS.filter(c => Array.isArray(data[c.key])).map(c => (
              <tr key={c.key}><td>{c.label}</td><td className="num">{(data[c.key] as unknown[]).length}</td><td className="num faint">{(getDB()[c.key] as unknown[]).length}</td></tr>))}</tbody>
          </table></div>
          <Segmented value={mode} onChange={setMode} items={[{ value: 'merge', label: 'Combină (după ID)' }, { value: 'replace', label: 'Înlocuiește tot' }]} />
          {mode === 'replace' && <Callout kind="warn">Datele actuale din colecțiile de mai sus se pierd. Descarcă întâi un backup.</Callout>}
          <div className="row end"><ConfirmButton className="btn primary" confirmText="Confirmă restaurarea" onConfirm={apply}><Icon name="upload" />Restaurează</ConfirmButton></div>
        </>
      )}
      {err && <Callout kind="bad">{err}</Callout>}
      {!data && <span className="faint small">Ultima modificare locală: {fmtDateTime(getDB().audit[0]?.at)}</span>}
    </div>
  );
}
