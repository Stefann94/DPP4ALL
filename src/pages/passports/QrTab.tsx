import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import JSZip from 'jszip';
import Papa from 'papaparse';
import '../../styles/data.css';
import { useDB } from '../../api/store';
import { checkGtin, digitalLink, elementString, makeEan14 } from '../../lib/gs1';
import { downloadBlob, downloadText } from '../../lib/download';
import { Barcode, QrCode, minPrintMm, qrPng, qrSvg } from '../../components/Codes';
import { Callout, CopyButton, Empty, Icon, Segmented, useToast } from '../../components/ui';
import { slug } from '../data/_columns';

export default function QrTab() {
  const { id } = useParams();
  const toast = useToast();
  const p = useDB(d => d.passports.find(x => x.id === id));
  const org = useDB(d => d.org);
  const allUnits = useDB(d => d.units);
  const units = allUnits.filter(u => u.passportId === id);
  const [preset, setPreset] = useState<number | 'custom'>(25);
  const [custom, setCustom] = useState(35);
  const [indicator, setIndicator] = useState(1);
  const [busy, setBusy] = useState(false);

  if (!p) return <Empty icon="search" title="Pașaportul nu există" />;
  const g = checkGtin(p.gtin);
  const url = digitalLink(org.resolver, p.gtin);
  if (!g?.ok || !url) return (
    <div className="card"><Empty icon="qr" title="Fără GTIN valid, fără cod QR" action={<Link className="btn primary" to={`/pasapoarte/${p.id}`}>Completează GTIN</Link>}>
      {g && !g.ok ? g.message : 'Codul QR conține linkul GS1 Digital Link format din GTIN.'}</Empty></div>
  );

  const min = minPrintMm(url);
  const mm = Math.max(min, preset === 'custom' ? custom : preset);
  const gtin13 = g.gtin14.startsWith('0') ? g.gtin14.slice(1) : null;
  const ean14 = gtin13 ? makeEan14(gtin13, indicator) : null;
  const publicPage = `${window.location.origin}/p/${p.id}`;
  const base = slug(p.name);
  const linkset = {
    linkset: [{
      anchor: url,
      'https://gs1.org/voc/defaultLink': [{ href: publicPage }],
      'https://gs1.org/voc/pip': [{ href: publicPage, title: p.name, type: 'text/html', hreflang: org.languages }],
      'https://gs1.org/voc/dpp': [{ href: `${publicPage}?format=json`, title: 'Digital Product Passport (EN 18223)', type: 'application/json' }],
      ...(units.length ? { 'https://gs1.org/voc/serialised': [{ href: `${url}/21/{serial}`, title: `${units.length} baterii serializate` }] } : {}),
    }],
  };

  const dlSvg = async () => downloadText(await qrSvg(url, { sizeMm: mm }), `${base}-qr-${mm}mm.svg`, 'image/svg+xml');
  const dlPng = async (px: number) => downloadBlob(await qrPng(url, px), `${base}-qr-${px}px.png`);
  const dlUnits = async () => {
    setBusy(true);
    try {
      const zip = new JSZip();
      const manifest = [['fisier', 'serie', 'lot', 'url']];
      for (const u of units) {
        const uu = digitalLink(org.resolver, p.gtin, { serial: u.serial })!;
        const f = `${base}/${slug(u.serial)}.svg`;
        zip.file(f, await qrSvg(uu, { sizeMm: Math.max(mm, minPrintMm(uu)) }));
        manifest.push([f, u.serial, u.batch ?? '', uu]);
      }
      zip.file('manifest.csv', '﻿' + Papa.unparse(manifest));
      downloadBlob(await zip.generateAsync({ type: 'blob' }), `${base}-qr-baterii.zip`);
    } catch { toast('Arhiva nu a putut fi generată.', 'bad'); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack lg">
      {p.status !== 'published' && <Callout kind="warn">Ciornă: scanarea arată „pașaport indisponibil” până la publicare.</Callout>}
      <div className="card qr-hero">
        <div className="stack" style={{ justifyItems: 'center' }}>
          <QrCode value={url} size={196} title={url} />
          <span className="faint small">corecție H · min. {min} mm</span>
        </div>
        <div className="stack">
          <div className="field"><span className="label">GS1 Digital Link</span><div className="row nowrap-row"><div className="mono-line grow">{url}</div><CopyButton text={url} label="" /></div></div>
          <div className="field"><span className="label">Șir GS1</span><div className="mono-line">{elementString(p.gtin!)}</div></div>
          <div className="field"><span className="label">Mărime tipărire</span>
            <div className="row">
              <Segmented value={String(preset)} onChange={v => setPreset(v === 'custom' ? 'custom' : Number(v))} items={[{ value: '20', label: '20 mm' }, { value: '25', label: '25 mm' }, { value: '30', label: '30 mm' }, { value: '40', label: '40 mm' }, { value: 'custom', label: 'Alt' }]} />
              {preset === 'custom' && <input className="input" type="number" style={{ width: 80 }} min={min} max={200} value={custom} onChange={e => setCustom(Number(e.target.value) || min)} aria-label="mm" />}
            </div>
            {(preset === 'custom' ? custom : preset) < min && <span className="advice">Sub minim: se descarcă la {min} mm.</span>}
          </div>
          <div className="row">
            <button className="btn primary" onClick={dlSvg}><Icon name="download" />SVG {mm} mm</button>
            <button className="btn" onClick={() => dlPng(1024)}><Icon name="download" />PNG 1024</button>
            <button className="btn" onClick={() => dlPng(2048)}><Icon name="download" />PNG 2048</button>
            <Link className="btn ghost" to={`/etichete?passport=${p.id}`}><Icon name="tag" />Etichete</Link>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <div className="card-head" style={{ margin: 0 }}><h3>Coduri de bare</h3></div>
          {gtin13 ? <div className="stack sm"><span className="section-title">EAN-13 · produs</span><Barcode bcid="ean13" text={gtin13} width={240} /></div> : <span className="faint small">GTIN-14 fără EAN-13.</span>}
          {gtin13 && (
            <div className="stack sm">
              <div className="row between"><span className="section-title">EAN-14 · ambalaj (GS1-128)</span>
                <select className="select" style={{ width: 'auto' }} value={indicator} onChange={e => setIndicator(Number(e.target.value))} aria-label="Indicator">{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <option key={i} value={i}>indicator {i}</option>)}</select></div>
              {ean14 && <><Barcode bcid="gs1-128" text={`(01)${ean14}`} width={320} /><div className="row"><span className="mono small">{ean14}</span><CopyButton text={ean14} label="" /></div></>}
            </div>
          )}
        </div>

        <div className="card stack">
          <div className="card-head" style={{ margin: 0 }}><h3>Baterii</h3><span className="badge">{units.length}</span></div>
          {units.length ? <>
            <span className="muted small">Câte un QR per baterie: <span className="mono">…/01/{g.gtin14}/21/serie</span></span>
            <div className="row"><button className="btn" disabled={busy} onClick={dlUnits}><Icon name={busy ? 'refresh' : 'download'} />{busy ? 'Se pregătește…' : `ZIP ${units.length} coduri`}</button>
              <Link className="btn ghost" to={`/etichete?passport=${p.id}&units=${units.map(u => u.id).join(',')}`}><Icon name="tag" />Etichete baterii</Link></div>
          </> : <span className="faint small">Nicio baterie individuală.</span>}
          <span className="section-title" style={{ marginTop: 6 }}>Tipărire</span>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 3 }}>
            <li>Nu sub {min} mm; păstrează marginea albă.</li>
            <li>Negru pe alb, fără JPG.</li>
            <li>Evită cusături, pliuri, suprafețe lucioase.</li>
            <li>Testează la 10–30 cm cu camera telefonului.</li>
            <li>Publică înainte de tipărire.</li>
          </ul>
        </div>
      </div>

      <details className="card">
        <summary style={{ cursor: 'pointer' }}><b>Linkset resolver</b> <span className="faint small">GS1 · ?linkType=linkset</span></summary>
        <pre className="code-block" style={{ marginTop: 12 }}>{JSON.stringify(linkset, null, 2)}</pre>
      </details>
    </div>
  );
}
