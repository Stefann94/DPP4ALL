// Public site chrome: announcement bar, header, footer. Reused by every public page.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDB } from '../api/store';
import { Icon, useToast } from '../components/ui';
import { checkGtin, parseDigitalLinkPath } from '../lib/gs1';
import { CATALOG_UPDATED, CATEGORIES } from '../data/regulations';
import { LogoMark } from '../components/LogoMark';
import './site.css';

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className={'s-logo' + (light ? ' light' : '')} aria-label="DPP4ALL — Acasă">
      <LogoMark size={50} c={light ? "#fff" : "var(--accent)"} bg={light ? "var(--accent)" : "#fff"} a={light ? "#5eead4" : "#5eead4"} />
      <span>DPP<span className="four">4</span>ALL</span>
    </Link>
  );
}

const AUDIENCES: [string, string, string, string][] = [
  ['#verificator', 'battery', 'Importatori', 'Ce vi se aplică și cum publicați pașaportul'],
  ['#furnizori', 'users', 'Fabrici și furnizori · 供应商', 'Cum completați datele cerute de clientul din UE'],
  ['mailto:parteneri@dpp4all.eu', 'webhook', 'Brokeri vamali și parteneri', 'Mai mulți clienți, sub marca voastră'],
  ['/cerere-acces', 'lock', 'Reciclatori și autorități', 'Cereți acces la datele restricționate'],
];

/** Small dropdown used by the brand navbar (Categorii, Pentru cine, limbă). Closes on outside click / Esc. */
function NavDrop({ label, children, wide, align = 'left' }: { label: ReactNode; children: ReactNode; wide?: boolean; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="s-drop" ref={ref}>
      <button type="button" className={'s-navbtn' + (open ? ' open' : '')} aria-expanded={open} onClick={() => setOpen(o => !o)}>{label}<Icon name="chevronDown" size={14} /></button>
      {open && <div className={'s-dmenu' + (wide ? ' wide' : '') + (align === 'right' ? ' right' : '')} onClick={() => setOpen(false)}>{children}</div>}
    </div>
  );
}

function PassportSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const go = () => {
    const v = q.trim();
    const dl = parseDigitalLinkPath(v.replace(/^https?:\/\/[^/]+/i, ''));
    if (dl) { nav(`/01/${dl.gtin14}${dl.serial ? `/21/${encodeURIComponent(dl.serial)}` : ''}`); setOpen(false); return; }
    const g = checkGtin(v);
    if (g?.ok) { nav(`/01/${g.gtin14}`); setOpen(false); return; }
    setErr(g && !g.ok ? g.message : 'Introduceți GTIN-ul (codul de sub codul de bare) sau linkul din codul QR.');
  };
  return (
    <div className="s-drop" ref={ref}>
      <button type="button" className="s-iconbtn" aria-label="Caută un pașaport" title="Caută un pașaport" onClick={() => setOpen(o => !o)}><Icon name="search" size={18} /></button>
      {open && (
        <form className="s-dmenu right s-search" onSubmit={e => { e.preventDefault(); go(); }}>
          <b>Caută un pașaport</b>
          <span className="muted small">GTIN de pe etichetă sau linkul din codul QR</span>
          <div className="row nowrap-row"><input autoFocus className="input" value={q} onChange={e => { setQ(e.target.value); setErr(''); }} placeholder="ex. 5949876543219" /><button className="btn primary">Caută</button></div>
          {err && <span className="error small">{err}</span>}
        </form>
      )}
    </div>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const session = useDB(d => d.session);
  const [open, setOpen] = useState(false);
  useEffect(() => { document.title = 'DPP4ALL — Pașaportul digital pentru fiecare produs importat'; }, []);
  return (
    <div className="site">
      <header className="s-header brand nav-v1">
        <div className="wrap">
          <Logo light />
          <nav className="s-nav" aria-label="Navigare site">
            <a href="#verificator">Verifică produsele</a>
            <NavDrop label="Categorii" wide>
              {CATEGORIES.map(c => <a key={c.id} href="#categorii" className="s-ditem"><Icon name={c.icon} size={17} /><span><b>{c.name}</b><small>{c.badge}</small></span></a>)}
            </NavDrop>
            <a href="#termene">Termene</a>
            <a href="#preturi">Prețuri</a>
            <NavDrop label="Pentru cine">
              {AUDIENCES.map(([h, ic, t, d]) => h.startsWith('/')
                ? <Link key={t} to={h} className="s-ditem"><Icon name={ic} size={17} /><span><b>{t}</b><small>{d}</small></span></Link>
                : <a key={t} href={h} className="s-ditem"><Icon name={ic} size={17} /><span><b>{t}</b><small>{d}</small></span></a>)}
            </NavDrop>
          </nav>
          <div className="s-tools">
            <PassportSearch />
            <NavDrop label={<><Icon name="globe" size={16} />RO</>} align="right">
              <button type="button" className="s-ditem on">Română</button>
              <button type="button" className="s-ditem" disabled>English · în curând</button>
              <button type="button" className="s-ditem" disabled lang="zh">中文 · 即将推出</button>
            </NavDrop>
            {session
              ? <Link className="btn white" to="/panou"><span className="hide-sm">Deschide aplicația</span><span className="show-sm">Aplicația</span></Link>
              : <>
                  <Link className="s-login hide-sm" to="/login">Autentificare</Link>
                  <Link className="btn white" to="/inregistrare">Cont gratuit</Link>
                </>}
            <button className="btn ghost icon s-menu-btn" aria-label="Meniu" aria-expanded={open} onClick={() => setOpen(o => !o)}><Icon name={open ? 'x' : 'menu'} /></button>
          </div>
        </div>
        {open && (
          <nav className="s-mobile" onClick={() => setOpen(false)}>
            <a href="#verificator">Verifică produsele</a>
            <a href="#categorii">Categorii</a>
            <a href="#termene">Termene</a>
            <a href="#preturi">Prețuri</a>
            <a href="#furnizori">Fabrici și furnizori · 供应商</a>
            <Link to="/cerere-acces">Reciclatori și autorități</Link>
            <Link to="/login">Autentificare</Link>
          </nav>
        )}
      </header>
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const cats = useMemo(() => CATEGORIES.slice(0, 6), []);
  return (
    <footer className="s-footer">
      <div className="wrap">
        <div className="cols">
          <div className="stack">
            <Logo light />
            <p>Pașapoarte digitale de produs pentru importatori și distribuitori. Date găzduite în România (UE).</p>
            <form className="stack sm" onSubmit={e => { e.preventDefault(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Introdu o adresă de e-mail validă.', 'bad'); return; } try { localStorage.setItem('dpp4all-alerts', email); } catch { /* ignore */ } setEmail(''); toast('Gata: primești alertele DPP pe e-mail.'); }}>
              <label htmlFor="ft-email" style={{ color: '#fff', fontWeight: 600 }}>Alerte DPP pe e-mail</label>
              <div className="row nowrap-row"><input id="ft-email" className="input" type="email" placeholder="nume@firma.ro" value={email} onChange={e => setEmail(e.target.value)} /><button className="btn primary">Abonează-mă</button></div>
            </form>
          </div>
          <div><h4>Produs</h4><a href="#cum-functioneaza">Cum funcționează</a><a href="#demo">Pașaport demo</a><a href="#furnizori">Portal furnizori</a><a href="#preturi">Prețuri</a><Link to="/login">Autentificare</Link></div>
          <div><h4>Categorii</h4>{cats.map(c => <a key={c.id} href="#categorii">{c.name}</a>)}</div>
          <div><h4>Resurse</h4><a href="#termene">Calendar termene</a><a href="#verificator">Am nevoie de DPP?</a><a href="#intrebari">Întrebări frecvente</a><a href="https://single-market-economy.ec.europa.eu/single-market/digital-product-passport_en" target="_blank" rel="noreferrer">Comisia Europeană: DPP</a></div>
          <div><h4>Firmă</h4><a href="#incredere">Securitate și date</a><a href="mailto:contact@dpp4all.eu">contact@dpp4all.eu</a><a href="#">Termeni</a><a href="#">Confidențialitate</a><a href="#">DPA</a></div>
        </div>
        <div className="fine">
          <span>© {new Date().getFullYear()} DPP4ALL · Date firmă (CUI, adresă) — de completat</span>
          <span>Catalog de reglementări actualizat la {CATALOG_UPDATED.split('-').reverse().join('.')}</span>
        </div>
      </div>
    </footer>
  );
}
