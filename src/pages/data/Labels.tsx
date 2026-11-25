import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import '../../styles/data.css';
import { useDB } from '../../api/store';
import { checkGtin, digitalLink, makeEan14 } from '../../lib/gs1';
import { downloadBlob, downloadText } from '../../lib/download';
import { barcodeSvg, minPrintMm, qrSvg } from '../../components/Codes';
import { Callout, Empty, Icon, PageHead, Segmented, useToast } from '../../components/ui';
import { slug } from './_columns';

type Template = 'qr' | 'qr_text' | 'qr_ean13' | 'ambalaj';
type Label = { key: string; url: string; title: string; model: string; serial?: string; batch?: string; gtin13?: string; ean14?: string };
type Cfg = { template: Template; qr: number; w: number; h: number };

const PAD = 2;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s: string, widthMm: number, fontMm: number) => { const n = Math.max(4, Math.floor(widthMm / (fontMm * 0.56))); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

function autoSize(t: Template, qr: number): { w: number; h: number } {
  const base = qr + PAD * 2;
  if (t === 'qr') return { w: base, h: base };
  if (t === 'qr_text') return { w: base + 46, h: Math.max(base, 22) };
  if (t === 'qr_ean13') return { w: base + 44, h: Math.max(base, 26) };
  return { w: Math.max(100, base + 62), h: Math.max(base, 50) };
}

const BAR = new Map<string, string | null>();
const bar = (bcid: string, text: string) => { const k = bcid + '|' + text; if (!BAR.has(k)) BAR.set(k, barcodeSvg(bcid, text, { height: 14, includetext: true })); return BAR.get(k)!; };

/** Composes one label as a standalone SVG in millimetres. */
function labelSvg(l: Label, c: Cfg, qr: string): string {
  const parts: string[] = [];
  const q = qr.replace(/<\?xml[^>]*>/, '').replace('<svg ', `<svg x="${PAD}" y="${(c.h - c.qr) / 2}" width="${c.qr}" height="${c.qr}" `);
  parts.push(q);
  const tx = PAD * 2 + c.qr, tw = c.w - tx - PAD;
  const text = (y: number, s: string, size: number, weight = 400, mono = false) =>
    parts.push(`<text x="${tx}" y="${y}" font-family="${mono ? 'Consolas, monospace' : 'Arial, Helvetica, sans-serif'}" font-size="${size}" font-weight="${weight}" fill="#000">${esc(clip(s, tw, size))}</text>`);
  const embed = (svg: string | null, x: number, y: number, w: number, h: number) => { if (svg) parts.push(svg.replace(/<\?xml[^>]*>/, '').replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `)); };
  if (c.template === 'qr_text') {
    text(PAD + 4, l.title, 3.4, 700);
    text(PAD + 8.5, l.model, 2.6);
    if (l.serial) text(PAD + 13, l.serial, 2.8, 400, true);
    text(c.h - PAD - 1, 'Pașaport digital — scanați', 2.1);
  } else if (c.template === 'qr_ean13') {
    text(PAD + 3.5, l.title, 2.8, 700);
    if (l.gtin13) embed(bar('ean13', l.gtin13), tx, PAD + 5, tw, c.h - PAD * 2 - 5);
  } else if (c.template === 'ambalaj') {
    text(PAD + 4.5, l.title, 3.6, 700);
    text(PAD + 9.5, l.model, 2.8);
    if (l.batch) text(PAD + 14, `Lot ${l.batch}`, 2.8);
    if (l.ean14) embed(bar('gs1-128', `(01)${l.ean14}${l.batch ? `(10)${l.batch}` : ''}`), tx, c.h - PAD - 24, tw, 24);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.w}mm" height="${c.h}mm" viewBox="0 0 ${c.w} ${c.h}"><rect width="100%" height="100%" fill="#fff"/>${parts.join('')}</svg>`;
}

/** ZPL II for Zebra-style thermal printers. */
function labelZpl(l: Label, c: Cfg, dpi: 203 | 300, copies = 1): string {
  const d = dpi === 203 ? 8 : 12;
  const z = (mm: number) => Math.round(mm * d);
  const clean = (s: string) => s.replace(/[\^~]/g, ' ');
  const modules = QRCode.create(l.url, { errorCorrectionLevel: 'H' }).modules.size;
  const mag = Math.min(10, Math.max(1, Math.round(z(c.qr) / modules)));
  const tx = z(PAD * 2 + c.qr);
  const out = ['^XA', '^CI28', `^PW${z(c.w)}`, `^LL${z(c.h)}`, `^FO${z(PAD)},${z(PAD)}^BQN,2,${mag}^FDHA,${clean(l.url)}^FS`];
  const t = (y: number, s: string, mm: number) => out.push(`^FO${tx},${z(y)}^A0N,${z(mm)},${z(mm)}^FD${clean(s)}^FS`);
  if (c.template !== 'qr') { t(PAD, l.title, 3.2); t(PAD + 5, l.model, 2.6); }
  if (c.template === 'qr_text' && l.serial) t(PAD + 9.5, l.serial, 2.8);
  if (c.template === 'qr_ean13' && l.gtin13) out.push(`^FO${tx},${z(PAD + 9)}^BY2^BEN,${z(12)},Y,N^FD${l.gtin13.slice(0, 12)}^FS`);
  if (c.template === 'ambalaj' && l.ean14) out.push(`^FO${tx},${z(c.h - PAD - 20)}^BY2^BCN,${z(14)},Y,N,N,D^FD(01)${l.ean14}${l.batch ? `(10)${clean(l.batch)}` : ''}^FS`);
  if (copies > 1) out.push(`^PQ${copies}`);
  out.push('^XZ');
  return out.join('\n');
}

async function svgToPng(svg: string, wMm: number, hMm: number, dpi = 300): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg')); img.src = url; });
    const c = document.createElement('canvas');
    c.width = Math.round(wMm / 25.4 * dpi); c.height = Math.round(hMm / 25.4 * dpi);
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('png'))), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export default function Labels() {
  const toast = useToast();
  const [sp] = useSearchParams();
  const org = useDB(d => d.org);
  const passports = useDB(d => d.passports).filter(p => p.status !== 'trashed');
  const allUnits = useDB(d => d.units);
  const [pid, setPid] = useState(() => sp.get('passport') ?? passports.find(p => p.status === 'published' && p.gtin)?.id ?? passports[0]?.id ?? '');
  const p = passports.find(x => x.id === pid);
  const units = useMemo(() => allUnits.filter(u => u.passportId === pid), [allUnits, pid]);
  const [mode, setMode] = useState<'model' | 'units'>(() => (sp.get('units') ? 'units' : 'model'));
  const [copies, setCopies] = useState(24);
  const [batch, setBatch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(() => new Set((sp.get('units') ?? '').split(',').filter(Boolean)));
  const [template, setTemplate] = useState<Template>('qr_text');
  const [indicator, setIndicator] = useState(1);
  const [qrPick, setQrPick] = useState<number | 'custom'>(25);
  const [qrCustom, setQrCustom] = useState(28);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [margin, setMargin] = useState(8);
  const [gap, setGap] = useState(3);
  const [dpi, setDpi] = useState<203 | 300>(203);
  const [svgs, setSvgs] = useState<Map<string, string>>(new Map());

  const gtin = p?.gtin ?? '';
  const g = checkGtin(gtin);
  const gtin13 = g?.ok ? (g.gtin14.startsWith('0') ? g.gtin14.slice(1) : undefined) : undefined;
  const ean14 = gtin13 ? makeEan14(gtin13, indicator) ?? undefined : undefined;
  const model = String(p?.data?.identificare?.battery_model_identifier ?? '');

  const labels: Label[] = useMemo(() => {
    if (!p || !g?.ok) return [];
    if (mode === 'model') {
      const url = digitalLink(org.resolver, gtin); if (!url) return [];
      return Array.from({ length: Math.min(1000, Math.max(1, copies)) }, (_, i) => ({ key: 'm' + i, url, title: p.name, model, gtin13, ean14 }));
    }
    return units.filter(u => picked.has(u.id)).slice(0, 1000).map(u => ({ key: u.id, url: digitalLink(org.resolver, gtin, { serial: u.serial })!, title: p.name, model, serial: u.serial, batch: u.batch, gtin13, ean14 }));
  }, [p, g?.ok, mode, copies, units, picked, org.resolver, gtin, model, gtin13, ean14]);

  const minMm = labels.length ? Math.max(...[...new Set(labels.map(l => l.url))].slice(0, 50).map(minPrintMm)) : 15;
  const qrMm = Math.max(minMm, qrPick === 'custom' ? qrCustom : qrPick);
  const auto = autoSize(template, qrMm);
  const { w, h } = size ?? auto;
  const cfg: Cfg = { template, qr: qrMm, w, h };
  const cols = Math.max(1, Math.floor((210 - 2 * margin + gap) / (w + gap)));
  const rows = Math.max(1, Math.floor((297 - 2 * margin + gap) / (h + gap)));
  const perPage = cols * rows;
  const pages = Math.ceil(labels.length / perPage);

  useEffect(() => {
    let live = true;
    (async () => {
      const m = new Map<string, string>();
      for (const url of new Set(labels.map(l => l.url))) m.set(url, await qrSvg(url));
      if (live) setSvgs(m);
    })();
    return () => { live = false; };
  }, [labels]);
  useEffect(() => setSize(null), [template, qrMm]);

  const rendered = useMemo(() => {
    const cache = new Map<string, string>();
    return labels.map(l => {
      const k = l.url + '|' + (l.batch ?? '');
      if (!cache.has(k)) cache.set(k, svgs.has(l.url) ? labelSvg(l, { template, qr: qrMm, w, h }, svgs.get(l.url)!) : '');
      return { l, svg: cache.get(k)! };
    });
  }, [labels, svgs, template, qrMm, w, h]);
  const unique = mode === 'model' ? rendered.slice(0, 1) : rendered;
  const batches = [...new Set(units.map(u => u.batch).filter(Boolean))] as string[];
  const shownUnits = units.filter(u => !batch || u.batch === batch);
  const fileBase = slug(p?.name ?? 'etichete');

  const dlSvgZip = async () => { const zip = new JSZip(); unique.forEach(({ l, svg }) => zip.file(`${slug(l.serial ?? 'model')}.svg`, svg)); downloadBlob(await zip.generateAsync({ type: 'blob' }), `${fileBase}-etichete-svg.zip`); };
  const dlPngZip = async () => {
    const zip = new JSZip();
    for (const { l, svg } of unique) zip.file(`${slug(l.serial ?? 'model')}.png`, await svgToPng(svg, w, h));
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `${fileBase}-etichete-png-300dpi.zip`);
  };
  const dlZpl = () => {
    const zpl = mode === 'model' && labels[0] ? labelZpl(labels[0], cfg, dpi, labels.length) : labels.map(l => labelZpl(l, cfg, dpi)).join('\n');
    downloadText(zpl, `${fileBase}-${dpi}dpi.zpl`);
  };

  if (!passports.length) return <div className="page"><PageHead title="Etichete și QR" /><div className="card"><Empty icon="tag" title="Niciun pașaport" /></div></div>;

  return (
    <div className="page">
      <PageHead title="Etichete și QR" actions={<>
        <button className="btn" disabled={!labels.length} onClick={dlZpl}><Icon name="terminal" />ZPL</button>
        <button className="btn" disabled={!labels.length} onClick={() => dlPngZip().catch(() => toast('PNG nu a putut fi generat.', 'bad'))}><Icon name="download" />PNG</button>
        <button className="btn" disabled={!labels.length} onClick={dlSvgZip}><Icon name="download" />SVG</button>
        <button className="btn primary" disabled={!labels.length} onClick={() => window.print()}><Icon name="print" />Tipărește</button>
      </>} />

      <div className="grid-2 no-print" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <div className="field"><label htmlFor="l-pp">Pașaport</label>
            <select id="l-pp" className="select" value={pid} onChange={e => { setPid(e.target.value); setPicked(new Set()); setBatch(''); }}>
              {passports.map(x => <option key={x.id} value={x.id}>{x.name}{x.status !== 'published' ? ' · ciornă' : ''}</option>)}</select></div>
          {!g?.ok && <Callout kind="warn">Pașaportul nu are un GTIN valid. <Link to={`/pasapoarte/${pid}`}>Completează GTIN</Link></Callout>}
          {p && p.status !== 'published' && g?.ok && <Callout kind="warn">Ciornă: codurile funcționează după publicare.</Callout>}
          <Segmented value={mode} onChange={setMode} items={[{ value: 'model', label: 'Model' }, { value: 'units', label: `Baterii (${units.length})` }]} />
          {mode === 'model' ? (
            <div className="field"><label htmlFor="l-cp">Exemplare</label><input id="l-cp" className="input" type="number" min={1} max={1000} value={copies} onChange={e => setCopies(Number(e.target.value) || 1)} /></div>
          ) : units.length === 0 ? <span className="faint small">Modelul nu are baterii individuale.</span> : (
            <div className="stack sm">
              <div className="row between">
                <select className="select" style={{ width: 'auto' }} value={batch} onChange={e => setBatch(e.target.value)} aria-label="Lot"><option value="">Toate loturile</option>{batches.map(b => <option key={b} value={b}>{b}</option>)}</select>
                <span className="row"><button className="linkbtn small" onClick={() => setPicked(new Set(shownUnits.map(u => u.id)))}>Toate ({shownUnits.length})</button><button className="linkbtn small" onClick={() => setPicked(new Set())}>Niciuna</button></span>
              </div>
              <div className="serial-box">{shownUnits.map(u => (
                <label key={u.id} className="check"><input type="checkbox" checked={picked.has(u.id)} onChange={e => setPicked(s => { const n = new Set(s); e.target.checked ? n.add(u.id) : n.delete(u.id); return n; })} />{u.serial}</label>))}</div>
            </div>
          )}
        </div>

        <div className="card stack">
          <div className="field"><span className="label">Șablon</span>
            <Segmented value={template} onChange={setTemplate} items={[{ value: 'qr', label: 'QR' }, { value: 'qr_text', label: 'QR + text' }, { value: 'qr_ean13', label: 'QR + EAN-13' }, { value: 'ambalaj', label: 'Ambalaj' }]} /></div>
          {template === 'ambalaj' && (
            <div className="row"><label className="small muted" htmlFor="l-ind">Indicator EAN-14</label>
              <select id="l-ind" className="select" style={{ width: 'auto' }} value={indicator} onChange={e => setIndicator(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <option key={i} value={i}>{i}</option>)}</select>
              <span className="mono small">{ean14 ?? '—'}</span></div>)}
          <div className="field"><span className="label">QR <span className="faint small">min. {minMm} mm</span></span>
            <div className="row">
              <Segmented value={String(qrPick)} onChange={v => setQrPick(v === 'custom' ? 'custom' : Number(v))} items={[...[20, 25, 30, 40].map(n => ({ value: String(n), label: `${n} mm` })), { value: 'custom', label: 'Alt' }]} />
              {qrPick === 'custom' && <input className="input" style={{ width: 80 }} type="number" min={minMm} max={120} value={qrCustom} onChange={e => setQrCustom(Number(e.target.value) || minMm)} aria-label="Mărime QR mm" />}
            </div>
            {(qrPick === 'custom' ? qrCustom : qrPick) < minMm && <span className="advice">Mărit la {minMm} mm ca să se poată scana.</span>}
          </div>
          <div className="grid-4">
            <div className="field"><label htmlFor="l-w">Lățime mm</label><input id="l-w" className="input" type="number" value={w} onChange={e => setSize({ w: Number(e.target.value) || auto.w, h })} /></div>
            <div className="field"><label htmlFor="l-h">Înălțime mm</label><input id="l-h" className="input" type="number" value={h} onChange={e => setSize({ w, h: Number(e.target.value) || auto.h })} /></div>
            <div className="field"><label htmlFor="l-m">Margine</label><input id="l-m" className="input" type="number" min={0} value={margin} onChange={e => setMargin(Number(e.target.value) || 0)} /></div>
            <div className="field"><label htmlFor="l-g">Spațiu</label><input id="l-g" className="input" type="number" min={0} value={gap} onChange={e => setGap(Number(e.target.value) || 0)} /></div>
          </div>
          <div className="row between small">
            <span className="muted">A4 · {cols}×{rows} = {perPage}/coală · <b>{labels.length}</b> etichete · {pages} {pages === 1 ? 'coală' : 'coli'}</span>
            <span className="row"><span className="muted">ZPL</span><Segmented value={String(dpi)} onChange={v => setDpi(Number(v) as 203 | 300)} items={[{ value: '203', label: '203 dpi' }, { value: '300', label: '300 dpi' }]} /></span>
          </div>
        </div>
      </div>

      <div className="print-area">
        {labels.length === 0 ? <div className="card no-print"><Empty icon="qr" title="Nicio etichetă" >{mode === 'units' ? 'Bifează bateriile.' : 'Alege un pașaport cu GTIN.'}</Empty></div> : (
          <div className="sheets">
            {Array.from({ length: pages }, (_, pg) => (
              <div key={pg} className="sheet-zoom">
                <div className="sheet" style={{ padding: `${margin}mm`, gridTemplateColumns: `repeat(${cols}, ${w}mm)`, gridAutoRows: `${h}mm`, gap: `${gap}mm` }}>
                  {rendered.slice(pg * perPage, (pg + 1) * perPage).map(({ l, svg }) => (
                    <div key={l.key} className="label-cell" style={{ width: `${w}mm`, height: `${h}mm` }} dangerouslySetInnerHTML={{ __html: svg }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
