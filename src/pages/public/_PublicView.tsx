// Public passport rendering shared by /p/:id and the GS1 Digital Link resolver (/01/...).
import { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/public.css';
import { useDB } from '../../api/store';
import { access, scans } from '../../api/actions';
import { FIELD, TIER_RANK, categoryLabel, modelFields, sectionsFor, unitFields } from '../../data/catalog';
import { digitalLink } from '../../lib/gs1';
import { formatValue } from '../../lib/present';
import { toEN18223 } from '../../lib/en18223';
import { copyText, downloadJson } from '../../lib/download';
import { fmtDate } from '../../lib/format';
import { filled } from '../../lib/validation';
import { QrCode } from '../../components/Codes';
import { Icon } from '../../components/ui';
import { effectiveValue } from '../units/_unitHelpers';
import type { AccessRequest, AccessTier, Passport, Unit, UnitStatus } from '../../types';

export type Lang = 'ro' | 'en';

const T = {
  ro: {
    model: 'Pașaportul bateriei', unitTitle: 'Bateria aceasta', category: 'Categorie', modelId: 'Model', gtin: 'GTIN', serial: 'Serie', maker: 'Producător', status: 'Status',
    held: 'Se publică după actul delegat', docs: 'Documente', json: 'Date pentru sisteme (JSON EN 18223)', hide: 'Ascunde', copy: 'Copiază', download: 'Descarcă',
    request: 'Solicită acces la date restricționate', grant: 'Acces acordat', until: 'până la', notCovered: 'Accesul tău nu acoperă acest pașaport. Vezi doar datele publice.',
    preview: 'Previzualizare ciornă — vizibilă doar echipei', foot: 'Pașaport digital conform Reg. (UE) 2023/1542', powered: 'Platformă pașapoarte digitale',
    symbols: 'Simboluri pe baterie', na: 'Acest pașaport nu este disponibil', naSub: 'Codul scanat nu corespunde unui pașaport publicat.', unknownSerial: 'Seria scanată nu e înregistrată. Afișăm pagina modelului.',
    statuses: { original: 'Originală', repurposed: 'Reutilizată în alt scop', 're-used': 'Refolosită', remanufactured: 'Recondiționată', waste: 'Deșeu' } as Record<UnitStatus, string>,
    tiers: { public: 'Public', restricted: 'Interes legitim', authority: 'Autorități' } as Record<AccessTier, string>,
  },
  en: {
    model: 'Battery passport', unitTitle: 'This battery', category: 'Category', modelId: 'Model', gtin: 'GTIN', serial: 'Serial', maker: 'Manufacturer', status: 'Status',
    held: 'Published once the delegated act applies', docs: 'Documents', json: 'Machine-readable data (JSON EN 18223)', hide: 'Hide', copy: 'Copy', download: 'Download',
    request: 'Request access to restricted data', grant: 'Access granted', until: 'until', notCovered: 'Your access does not cover this passport. Showing public data only.',
    preview: 'Draft preview — visible to your team only', foot: 'Digital passport under Regulation (EU) 2023/1542', powered: 'Digital passport platform',
    symbols: 'Symbols on the battery', na: 'This passport is not available', naSub: 'The scanned code does not match a published passport.', unknownSerial: 'The scanned serial is not registered. Showing the model page.',
    statuses: { original: 'Original', repurposed: 'Repurposed', 're-used': 'Re-used', remanufactured: 'Remanufactured', waste: 'Waste' } as Record<UnitStatus, string>,
    tiers: { public: 'Public', restricted: 'Legitimate interest', authority: 'Authorities' } as Record<AccessTier, string>,
  },
};
const SECTION_EN: Record<string, string> = {
  identificare: 'Product identification', operator: 'Manufacturer / economic operator', etichete_conformitate: 'Labels, symbols and conformity',
  amprenta_carbon: 'Carbon footprint', due_diligence: 'Supply-chain due diligence', materiale: 'Materials and composition',
  circularitate: 'Circularity and resource efficiency', performanta: 'Performance and durability',
};
const SECTION_RO: Record<string, string> = {
  identificare: 'Identificare produs', operator: 'Producător / operator economic', etichete_conformitate: 'Etichete, simboluri și conformitate',
  amprenta_carbon: 'Amprenta de carbon', due_diligence: 'Due diligence', materiale: 'Materiale și compoziție',
  circularitate: 'Circularitate și reciclare', performanta: 'Performanță și durabilitate',
};
const CAT_EN: Record<string, string> = {
  industrial_stationary: 'Stationary energy storage > 2 kWh', industrial_other: 'Industrial battery > 2 kWh', ev: 'Electric vehicle (EV) battery',
  lmt: 'Light means of transport (LMT) battery', portable: 'Portable battery', sli: 'Starter (SLI) battery', industrial_up_to_2kwh: 'Industrial battery ≤ 2 kWh',
};
const HEADER_FIELDS = new Set(['product_name', 'gtin', 'battery_model_identifier', 'battery_category']);

export function NotAvailable({ lang = 'ro' }: { lang?: Lang }) {
  const t = T[lang];
  return <div className="pub-na"><div className="box"><Icon name="passport" /><b>{t.na}</b><span className="small">{t.naSub}</span></div></div>;
}

export function PublicView({ passport: p, unit, grant, lang, onLang, preview, note }: {
  passport: Passport; unit?: Unit; grant: AccessRequest | null; lang: Lang; onLang: (l: Lang) => void; preview?: boolean; note?: string;
}) {
  const t = T[lang];
  const org = useDB(d => d.org);
  const documents = useDB(d => d.documents);
  const readings = useDB(d => d.readings);
  const [showJson, setShowJson] = useState(false);
  const covered = !!grant && (grant.scope === 'all' || grant.passportIds.includes(p.id));
  const tier: AccessTier = covered ? grant!.tierRequested : 'public';
  const allowed = (x: AccessTier) => TIER_RANK[x] <= TIER_RANK[tier];
  const label = (name: string) => { const f = FIELD[name]; return f ? (lang === 'en' ? f.label : f.label_ro.replace(/ \((GS1 AI \d+|ISO 3166)\)$/, '')) : name; };
  const link = digitalLink(org.resolver, p.gtin, { serial: unit?.serial });
  const id = p.data?.identificare ?? {};
  const maker = String(p.data?.operator?.manufacturer_name ?? org.name);

  const sections = useMemo(() => sectionsFor(p.category).map(s => {
    const rows = modelFields(s.id, p.category).filter(f => !HEADER_FIELDS.has(f.name) && f.type !== 'pictogram' && allowed(f.access_tier) && filled(p.data?.[f.section]?.[f.name]));
    return { s, rows };
  }).filter(x => x.rows.length), [p, tier]); // eslint-disable-line react-hooks/exhaustive-deps
  const symbols = modelFields('etichete_conformitate', p.category).filter(f => f.type === 'pictogram' && p.data?.etichete_conformitate?.[f.name] === true);
  const unitRows = unit ? unitFields(p.category).filter(f => !['serial_number', 'status', 'batch_number', 'unit_manufacturing_date'].includes(f.name) && allowed(f.access_tier))
    .map(f => ({ f, v: effectiveValue(unit, f.name, p, readings).value })).filter(x => filled(x.v)) : [];
  const docs = documents.filter(d => d.passportIds.includes(p.id) && allowed(d.accessTier));

  // log legitimate-interest views once per mount; count fields above public tier
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current || !covered || preview) return;
    logged.current = true;
    const extra = sections.reduce((n, x) => n + x.rows.filter(r => r.access_tier !== 'public').length, 0) + unitRows.filter(r => r.f.access_tier !== 'public').length;
    access.logView(grant!, p.id, extra, unit?.serial);
  }, [covered, preview]); // eslint-disable-line react-hooks/exhaustive-deps
  const scanned = useRef(false);
  useEffect(() => {
    if (scanned.current || preview || p.status !== 'published') return;
    scanned.current = true;
    scans.record(p.id, unit?.serial, lang);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const json = useMemo(() => toEN18223(p, org, { unit, tier, documents }), [p, org, unit, tier, documents]);
  const brandStyle = { ['--brand' as string]: org.brand?.primary || 'var(--accent)' } as React.CSSProperties;

  return (
    <div className="pub" style={brandStyle}>
      <div className="pub-top" />
      <main className="pub-wrap">
        <div className="pub-bar">
          <div className="pub-logo">{org.brand?.logoDataUrl ? <img src={org.brand.logoDataUrl} alt={org.name} /> : <span>{org.name}</span>}</div>
          <div className="seg" role="group" aria-label="Limba">
            {(['ro', 'en'] as Lang[]).map(l => <button key={l} aria-pressed={lang === l} onClick={() => onLang(l)}>{l.toUpperCase()}</button>)}
          </div>
        </div>

        {preview && <div className="pub-banner preview"><Icon name="eye" />{t.preview}</div>}
        {note && <div className="pub-banner note"><Icon name="info" />{note}</div>}
        {grant && covered && <div className="pub-banner grant"><Icon name="lock" />{t.grant}: <b>{grant.organization}</b> · {t.tiers[grant.tierRequested]}{grant.expiresAt ? ` · ${t.until} ${fmtDate(grant.expiresAt)}` : ''}</div>}
        {grant && !covered && <div className="pub-banner note"><Icon name="lock" />{t.notCovered}</div>}

        <article className="pub-card">
          <header className="pub-hero">
            <div style={{ minWidth: 0 }}>
              <span className="pub-eyebrow">{unit ? `${t.model} · ${t.serial}` : t.model}</span>
              <h1>{String(id.product_name ?? p.name)}</h1>
              <dl className="pub-meta">
                <dt>{t.category}</dt><dd>{lang === 'en' ? CAT_EN[p.category ?? ''] ?? '—' : categoryLabel(p.category)}</dd>
                {filled(id.battery_model_identifier) && <><dt>{t.modelId}</dt><dd className="mono">{String(id.battery_model_identifier)}</dd></>}
                {p.gtin && <><dt>{t.gtin}</dt><dd className="mono">{p.gtin}</dd></>}
                {unit && <><dt>{t.serial}</dt><dd className="mono">{unit.serial}</dd></>}
                <dt>{t.maker}</dt><dd>{maker}</dd>
              </dl>
            </div>
            <div className="pub-qr"><QrCode value={link} size={128} />{link && <span className="cap">{link}</span>}</div>
          </header>

          {unit && (
            <section className="pub-sec pub-unit">
              <h2>{t.unitTitle}</h2>
              <dl className="pub-kv">
                <dt>{t.status}</dt><dd><b>{t.statuses[unit.status]}</b></dd>
                {unitRows.map(({ f, v }) => [
                  <dt key={f.name + 't'}>{label(f.name)}{f.access_tier !== 'public' && <span className={'tier ' + f.access_tier}>{t.tiers[f.access_tier]}</span>}</dt>,
                  <dd key={f.name + 'd'}>{formatValue(f, v, p.data)}</dd>,
                ])}
              </dl>
            </section>
          )}

          {symbols.length > 0 && (
            <section className="pub-sec">
              <h2>{t.symbols}</h2>
              <div className="pub-syms">{symbols.map(f => <span key={f.name}><Icon name="check" size={13} />{label(f.name)}</span>)}</div>
            </section>
          )}

          {sections.map(({ s, rows }) => (
            <section key={s.id} className="pub-sec">
              <h2>{lang === 'en' ? SECTION_EN[s.id] ?? s.id : SECTION_RO[s.id] ?? s.label_ro}</h2>
              <dl className="pub-kv">
                {rows.map(f => {
                  const v = p.data[f.section]![f.name];
                  const held = tier === 'public' && f.withheld_from_public;
                  return [
                    <dt key={f.name + 't'}>{label(f.name)}{f.access_tier !== 'public' && <span className={'tier ' + f.access_tier}>{t.tiers[f.access_tier]}</span>}</dt>,
                    <dd key={f.name + 'd'}>{held ? <span className="pub-held">{t.held}</span> : f.type === 'url' && /^https?:\/\//i.test(String(v)) ? <a href={String(v)} target="_blank" rel="noopener noreferrer">{String(v).replace(/^https?:\/\//, '')}</a> : formatValue(f, v, p.data)}</dd>,
                  ];
                })}
              </dl>
            </section>
          ))}

          {docs.length > 0 && (
            <section className="pub-sec">
              <h2>{t.docs}</h2>
              <dl className="pub-kv">
                {docs.map(d => [
                  <dt key={d.id + 't'}>{d.name}{d.accessTier !== 'public' && <span className={'tier ' + d.accessTier}>{t.tiers[d.accessTier]}</span>}</dt>,
                  <dd key={d.id + 'd'}>{d.dataUrl ? <a href={d.dataUrl} download={d.name}>{t.download}</a> : <span className="faint">{d.mime.split('/').pop()?.toUpperCase()}</span>}</dd>,
                ])}
              </dl>
            </section>
          )}

          <section className="pub-sec">
            <div className="row">
              <button className="pub-btn" onClick={() => setShowJson(s => !s)} aria-expanded={showJson}><Icon name="terminal" />{showJson ? t.hide : t.json}</button>
              {tier === 'public' && <a className="pub-btn" href={`/cerere-acces?passport=${encodeURIComponent(p.id)}`}><Icon name="lock" />{t.request}</a>}
            </div>
            {showJson && (
              <div className="stack sm" style={{ marginTop: 10 }}>
                <div className="row">
                  <button className="pub-btn" onClick={() => copyText(JSON.stringify(json, null, 2))}><Icon name="copy" />{t.copy}</button>
                  <button className="pub-btn" onClick={() => downloadJson(json, `dpp-${p.gtin ?? p.id}${unit ? '-' + unit.serial : ''}.json`)}><Icon name="download" />{t.download}</button>
                </div>
                <pre className="pub-json">{JSON.stringify(json, null, 2)}</pre>
              </div>
            )}
          </section>
        </article>

        <footer className="pub-foot">
          <span>{t.foot}</span>
          {org.brand?.showPoweredBy && <span>{t.powered}</span>}
        </footer>
      </main>
    </div>
  );
}
