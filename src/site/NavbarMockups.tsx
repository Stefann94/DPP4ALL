// /machete/navbar — side-by-side navbar design options for the DPP4ALL public site.
// Each variant is static markup (no routing) so they can be compared on one page.
import { useState, type ReactNode } from 'react';
import { Icon } from '../components/ui';
import { CATEGORIES } from '../data/regulations';
import { daysUntil } from '../lib/format';
import './site.css';
import './navmock.css';
import { PremiumNavMockups } from './PremiumNavMockups';

function Mark({ size = 28, fill = 'var(--accent)', ink = '#fff' }: { size?: number; fill?: string; ink?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="7" fill={fill} />
      <rect x="7" y="7" width="7" height="7" rx="1.5" fill="none" stroke={ink} strokeWidth="2" />
      <rect x="18" y="7" width="7" height="7" rx="1.5" fill="none" stroke={ink} strokeWidth="2" />
      <rect x="7" y="18" width="7" height="7" rx="1.5" fill="none" stroke={ink} strokeWidth="2" />
      <path d="M18 18h3v3h-3zM22 22h3v3h-3zM22 18h3M18 25h3" stroke={ink} strokeWidth="2" fill="none" />
    </svg>
  );
}
const Word = ({ color }: { color?: string }) => <span className="nv-word" style={{ color }}>DPP<span>4</span>ALL</span>;
const Lang = ({ dark }: { dark?: boolean }) => <span className={'nv-lang' + (dark ? ' dark' : '')}><b>RO</b><span>EN</span><span lang="zh">中文</span></span>;

function Variant({ id, name, tag, pitch, pros, cons, desktop, mobile, open, mobileLabel = 'Mobil · închis' }: { id: string; name: string; tag?: string; pitch: string; pros: string[]; cons: string[]; desktop: ReactNode; mobile: ReactNode; open?: ReactNode; mobileLabel?: string }) {
  return (
    <section className="nv-variant" id={id}>
      <header className="nv-head">
        <div>
          <span className="nv-id">{id}</span>
          <h2>{name} {tag && <span className="nv-tag">{tag}</span>}</h2>
          <p>{pitch}</p>
        </div>
        <div className="nv-pc">
          <div><b>De ce da</b><ul>{pros.map(p => <li key={p}>{p}</li>)}</ul></div>
          <div><b>De ce nu</b><ul>{cons.map(p => <li key={p}>{p}</li>)}</ul></div>
        </div>
      </header>
      <div className="nv-frame"><div className="nv-label">Desktop · 1440 px</div><div className="nv-canvas">{desktop}<div className="nv-pagefake" /></div></div>
      {open && <div className="nv-frame"><div className="nv-label">Desktop · meniu deschis</div><div className="nv-canvas tall">{open}</div></div>}
      <div className="nv-mobiles">
        <div className="nv-frame"><div className="nv-label">{mobileLabel}</div><div className="nv-phone">{mobile}<div className="nv-pagefake sm" /></div></div>
      </div>
    </section>
  );
}

/* ── shared menu content ─────────────────────────────────── */
const PRODUCT = [
  ['play', 'Cum funcționează', '4 pași, de la fabrică la QR'], ['users', 'Portal furnizori', 'Fabrica completează în chineză'],
  ['passport', 'Pașaport demo', 'Vezi-l ca un consumator sau ca o autoritate'], ['sparkle', 'Funcționalități', 'Registru, acces, etichete, API'],
] as const;
const RESOURCES = [['calendar', 'Calendar termene'], ['help', 'Am nevoie de DPP?'], ['doc', 'Ghiduri pentru importatori'], ['info', 'Întrebări frecvente']] as const;

function MegaProduct() {
  return (
    <div className="nv-mega two">
      <div className="nv-mega-list">{PRODUCT.map(([i, t, d]) => <a key={t}><span className="ic"><Icon name={i} /></span><span><b>{t}</b><small>{d}</small></span></a>)}</div>
      <div className="nv-mega-promo"><span className="eyebrow">Nou</span><b>Verificatorul „Am nevoie de DPP?”</b><p>Află în 60 de secunde ce se aplică produselor tale.</p><span className="nv-link">Pornește verificatorul →</span></div>
    </div>
  );
}
function MegaCategories() {
  return (
    <div className="nv-mega cats">
      {CATEGORIES.map(c => <a key={c.id}><Icon name={c.icon} /><span><b>{c.name}</b><small>{c.badge}</small></span></a>)}
      <div className="nv-mega-foot"><span>Nu găsești categoria? Caută după codul NC.</span><span className="nv-link">Toate categoriile →</span></div>
    </div>
  );
}

export default function NavbarMockups() {
  const days = daysUntil('2027-02-18');
  const [compare, setCompare] = useState(false);
  return (
    <div className="site nv-page">
      <div className="wrap nv-intro">
        <span className="eyebrow">Machete · navbar site public</span>
        <h1>12 variante de bară de navigare pentru DPP4ALL</h1>
        <p className="lead">Fiecare variantă e randată real: desktop, meniu deschis (unde are) și mobil. Alege una sau combină elemente (ex. „C cu meniul din B”).</p>
        <div className="nv-toc">{['A', 'B', 'C', 'D', 'E', 'F'].map(x => <a key={x} href={`#${x}`}>{x}</a>)}<span className="nv-sep">Premium</span>{['G', 'H', 'I', 'J', 'K', 'L'].map(x => <a key={x} className="pm" href={`#${x}`}>{x}</a>)}<button className="btn sm" onClick={() => setCompare(c => !c)}>{compare ? 'Ascunde' : 'Arată'} comparația rapidă</button></div>
        {compare && (
          <div className="table-wrap card flush" style={{ marginTop: 14 }}>
            <table className="table">
              <thead><tr><th>Variantă</th><th>Stil</th><th>Meniu</th><th>Cel mai bun pentru</th></tr></thead>
              <tbody>
                <tr><td><b>A</b> Clasic alb</td><td>Simplu, curat</td><td>Ancore pe pagină</td><td>Lansare rapidă, puține pagini</td></tr>
                <tr><td><b>B</b> Mega-meniu</td><td>SaaS matur</td><td>Dropdown-uri bogate</td><td>Multe pagini și categorii</td></tr>
                <tr><td><b>C</b> Două niveluri</td><td>Instituțional</td><td>Bară utilitară + principală</td><td>Termene, limbi și login la vedere</td></tr>
                <tr><td><b>D</b> Pastilă plutitoare</td><td>Modern, aerisit</td><td>Compact</td><td>Imagine de brand premium</td></tr>
                <tr><td><b>E</b> Căutare în centru</td><td>Funcțional</td><td>Caută categorie / cod NC</td><td>Verificatorul ca produs principal</td></tr>
                <tr><td><b>F</b> Bleumarin</td><td>Tech, contrast</td><td>Dropdown-uri pe fundal închis</td><td>Diferențiere vizuală față de concurență</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="wrap nv-list">
        {/* A — current */}
        <Variant id="A" name="Clasic alb" tag="actuală" pitch="Bara folosită acum pe Home: logo, 5 ancore, limbi, două butoane."
          pros={['Cea mai simplă, se citește instant', 'Funcționează și cu puține pagini']} cons={['Nu scalează la multe pagini', 'Seamănă cu majoritatea concurenților']}
          desktop={<div className="nv-a"><span className="nv-brand"><Mark /><Word /></span><nav>{['Cum funcționează', 'Categorii', 'Termene', 'Prețuri', 'Pentru furnizori'].map(t => <a key={t}>{t}</a>)}<a lang="zh">供应商</a></nav><div className="nv-right"><Lang /><a className="btn ghost">Autentificare</a><a className="btn primary">Începe gratuit</a></div></div>}
          mobile={<div className="nv-a m"><span className="nv-brand"><Mark size={24} /><Word /></span><div className="nv-right"><a className="btn primary sm">Începe</a><Icon name="menu" size={22} /></div></div>} />

        {/* B — mega menu */}
        <Variant id="B" mobileLabel="Mobil · meniu deschis" name="Mega-meniu" tag="recomandată" pitch="Trei meniuri bogate: Produs, Categorii (cu starea fiecărei categorii), Resurse. Prețurile rămân link direct."
          pros={['Arată din prima că acoperim toate categoriile', 'Scalează la zeci de pagini fără aglomerare', 'Categoriile cu badge de termen = mesajul nostru']} cons={['Mai mult de construit', 'Pe mobil devine meniu cu secțiuni']}
          desktop={<div className="nv-b"><span className="nv-brand"><Mark /><Word /></span><nav><a>Produs <Icon name="chevronDown" size={14} /></a><a className="on">Categorii <Icon name="chevronDown" size={14} /></a><a>Resurse <Icon name="chevronDown" size={14} /></a><a>Prețuri</a><a lang="zh">供应商</a></nav><div className="nv-right"><Lang /><a className="btn ghost">Autentificare</a><a className="btn primary">Începe gratuit</a></div></div>}
          open={<div className="nv-stack"><div className="nv-b"><span className="nv-brand"><Mark /><Word /></span><nav><a>Produs <Icon name="chevronDown" size={14} /></a><a className="on">Categorii <Icon name="chevronDown" size={14} /></a><a>Resurse <Icon name="chevronDown" size={14} /></a><a>Prețuri</a><a lang="zh">供应商</a></nav><div className="nv-right"><Lang /><a className="btn ghost">Autentificare</a><a className="btn primary">Începe gratuit</a></div></div><div className="nv-drop" style={{ left: 260 }}><MegaCategories /></div><div className="nv-drop ghosted" style={{ right: 40, top: 70 }}><MegaProduct /></div></div>}
          mobile={<div className="nv-mobmenu"><div className="nv-a m"><span className="nv-brand"><Mark size={24} /><Word /></span><div className="nv-right"><Icon name="x" size={22} /></div></div><div className="nv-mm"><div className="nv-mm-sec">Produs<Icon name="chevronDown" size={14} /></div><div className="nv-mm-sec open">Categorii<Icon name="chevronDown" size={14} /></div>{CATEGORIES.slice(0, 5).map(c => <div key={c.id} className="nv-mm-item"><Icon name={c.icon} size={15} />{c.name}<small>{c.badge}</small></div>)}<div className="nv-mm-sec">Resurse<Icon name="chevronDown" size={14} /></div><div className="nv-mm-sec">Prețuri</div><a className="btn primary" style={{ marginTop: 10 }}>Începe gratuit</a><a className="btn">Autentificare</a></div></div>} />

        {/* C — two tier */}
        <Variant id="C" name="Două niveluri" pitch="O bară subțire cu termenul bateriilor, limbile, contactul și autentificarea, iar dedesubt bara principală cu meniul."
          pros={['Termenul și limbile mereu vizibile', 'Bara principală rămâne aerisită', 'Aspect instituțional, de încredere']} cons={['Ocupă mai mult pe verticală', 'Pe mobil bara de sus se ascunde']}
          desktop={<div className="nv-c"><div className="nv-c-top"><span><Icon name="calendar" size={13} />Baterii: obligatoriu pe 18.02.2027 · <b>{days} zile</b></span><span className="sp" /><span><Icon name="globe" size={13} />RO · EN · 中文</span><span>contact@dpp4all.eu</span><span>Autentificare</span></div><div className="nv-c-main"><span className="nv-brand"><Mark /><Word /></span><nav>{['Produs', 'Categorii', 'Pentru importatori', 'Termene', 'Prețuri'].map(t => <a key={t}>{t}</a>)}</nav><div className="nv-right"><a className="btn">Verifică produsele</a><a className="btn primary">Începe gratuit</a></div></div></div>}
          mobile={<div className="nv-c m"><div className="nv-c-top"><span>Baterii: <b>{days} zile</b></span></div><div className="nv-a m"><span className="nv-brand"><Mark size={24} /><Word /></span><div className="nv-right"><Icon name="menu" size={22} /></div></div></div>} />

        {/* D — floating pill */}
        <Variant id="D" name="Pastilă plutitoare" pitch="Bara se desprinde de marginea de sus: rotunjită, translucidă, cu umbră fină. Se micșorează la derulare."
          pros={['Arată premium și modern', 'Lasă hero-ul să respire până sus']} cons={['Încape mai puțin în meniu', 'Trend des întâlnit în 2024–2026']}
          desktop={<div className="nv-dwrap"><div className="nv-d"><span className="nv-brand"><Mark size={26} /><Word /></span><nav>{['Produs', 'Categorii', 'Termene', 'Prețuri'].map(t => <a key={t}>{t}</a>)}</nav><div className="nv-right"><Lang /><a className="btn primary sm">Începe gratuit</a></div></div></div>}
          mobile={<div className="nv-dwrap m"><div className="nv-d m"><span className="nv-brand"><Mark size={22} /><Word /></span><div className="nv-right"><a className="btn primary sm">Începe</a><Icon name="menu" size={20} /></div></div></div>} />

        {/* E — search first */}
        <Variant id="E" name="Căutare în centru" pitch="În centrul barei e un câmp „Ce importați? Caută categoria sau codul NC”, care deschide direct verificatorul."
          pros={['Verificatorul devine produsul principal', 'Utilizatorul ajunge direct la răspuns', 'Original față de concurență']} cons={['Meniul principal trece într-un buton', 'Cere un motor de căutare bun pe coduri NC']}
          desktop={<div className="nv-e"><span className="nv-brand"><Mark /><Word /></span><div className="nv-search"><Icon name="search" size={16} /><span>Ce importați? Caută categoria sau codul NC (ex. 8507)…</span><kbd>/</kbd></div><div className="nv-right"><a className="nv-menu"><Icon name="menu" size={18} />Meniu</a><a className="btn ghost">Autentificare</a><a className="btn primary">Începe gratuit</a></div></div>}
          open={<div className="nv-stack"><div className="nv-e"><span className="nv-brand"><Mark /><Word /></span><div className="nv-search focus"><Icon name="search" size={16} /><span style={{ color: 'var(--ink)' }}>8507</span></div><div className="nv-right"><a className="nv-menu"><Icon name="menu" size={18} />Meniu</a><a className="btn ghost">Autentificare</a><a className="btn primary">Începe gratuit</a></div></div>
            <div className="nv-drop" style={{ left: '50%', transform: 'translateX(-50%)', width: 560 }}><div className="nv-results"><div className="nv-r-head">Cod NC 8507 · Acumulatori electrici</div><a><Icon name="battery" /><span><b>Baterii — transport ușor (e-bike, trotinetă)</b><small>Pașaport obligatoriu din 18.02.2027 · per bucată</small></span><span className="stag adopted">Lege adoptată</span></a><a><Icon name="battery" /><span><b>Baterii — industriale / stocare &gt; 2 kWh</b><small>Pașaport obligatoriu din 18.02.2027</small></span><span className="stag adopted">Lege adoptată</span></a><a><Icon name="battery" /><span><b>Baterii portabile</b><small>Cod QR din 18.02.2027 · fără pașaport complet</small></span><span className="stag adopted">Lege adoptată</span></a><div className="nv-r-foot">Enter pentru rezultatul complet în verificator →</div></div></div></div>}
          mobile={<div className="nv-e m"><div className="nv-a m" style={{ border: 0 }}><span className="nv-brand"><Mark size={24} /><Word /></span><div className="nv-right"><Icon name="menu" size={22} /></div></div><div className="nv-search m"><Icon name="search" size={15} /><span>Categorie sau cod NC…</span></div></div>} />

        {/* F — navy */}
        <Variant id="F" name="Bleumarin" pitch="Bara pe fundal bleumarin, cu accent turcoaz și meniuri deschise pe alb. Continuă vizual bara de anunț și subsolul."
          pros={['Contrast puternic, se ține minte', 'Leagă vizual site-ul de aplicație', 'Butonul turcoaz iese în evidență']} cons={['Mai „greu” decât varianta albă', 'Ai cerut temă luminoasă pentru aplicație']}
          desktop={<div className="nv-f"><span className="nv-brand"><Mark fill="#5eead4" ink="#0d1b2a" /><Word color="#fff" /></span><nav>{['Produs', 'Categorii', 'Termene', 'Prețuri'].map((t, i) => <a key={t} className={i === 1 ? 'on' : ''}>{t}{i < 2 && <Icon name="chevronDown" size={14} />}</a>)}<a lang="zh">供应商</a></nav><div className="nv-right"><Lang dark /><a className="nv-f-login">Autentificare</a><a className="btn nv-f-cta">Începe gratuit</a></div></div>}
          open={<div className="nv-stack"><div className="nv-f"><span className="nv-brand"><Mark fill="#5eead4" ink="#0d1b2a" /><Word color="#fff" /></span><nav>{['Produs', 'Categorii', 'Termene', 'Prețuri'].map((t, i) => <a key={t} className={i === 0 ? 'on' : ''}>{t}{i < 2 && <Icon name="chevronDown" size={14} />}</a>)}<a lang="zh">供应商</a></nav><div className="nv-right"><Lang dark /><a className="nv-f-login">Autentificare</a><a className="btn nv-f-cta">Începe gratuit</a></div></div><div className="nv-drop" style={{ left: 230 }}><MegaProduct /></div></div>}
          mobile={<div className="nv-f m"><span className="nv-brand"><Mark size={24} fill="#5eead4" ink="#0d1b2a" /><Word color="#fff" /></span><div className="nv-right"><a className="btn nv-f-cta sm">Începe</a><span style={{ color: '#fff', display: 'inline-flex' }}><Icon name="menu" size={22} /></span></div></div>} />

        <div className="nv-divider" id="premium"><span className="eyebrow">Direcții premium</span><h2>G–L: mai bogate vizual</h2><p className="lead">Fiecare e prezentată peste o bucată de hero, ca să se vadă atmosfera completă, nu doar bara.</p></div>
        <PremiumNavMockups />
        <div className="nv-resources">
          <b>Meniul „Resurse” (folosit în B, C, F):</b> {RESOURCES.map(([, t]) => t).join(' · ')}
        </div>
      </div>
    </div>
  );
}
