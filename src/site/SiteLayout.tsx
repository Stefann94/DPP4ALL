// Public site chrome: announcement bar, header, footer. Reused by every public page.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../api/store';
import { Icon, useToast } from '../components/ui';
import { daysUntil } from '../lib/format';
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

const NAV = [
  ['#cum-functioneaza', 'Cum funcționează'], ['#categorii', 'Categorii'], ['#termene', 'Termene'], ['#preturi', 'Prețuri'], ['#furnizori', 'Pentru furnizori'],
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const session = useDB(d => d.session);
  const [open, setOpen] = useState(false);
  const days = daysUntil('2027-02-18');
  useEffect(() => { document.title = 'DPP4ALL — Pașaportul digital pentru fiecare produs importat'; }, []);
  return (
    <div className="site">
      <header className="s-header brand">
        <div className="wrap">
          <Logo light />
          <nav className="s-nav" aria-label="Navigare site">
            {NAV.map(([h, l]) => <a key={h} href={h}>{l}</a>)}
          </nav>
          <div className="s-tools">
            <div className="s-lang hide-sm" aria-label="Limbă" title={days > 0 ? `Baterii: obligatoriu în ${days} de zile` : undefined}>
              <button aria-current="true">RO</button>
              <button title="În curând" disabled>EN</button>
              <button title="În curând" disabled lang="zh">中文</button>
            </div>
            {session
              ? <Link className="btn white" to="/panou"><span className="hide-sm">Deschide aplicația</span><span className="show-sm">Aplicația</span></Link>
              : <>
                  <Link className="s-login hide-sm" to="/login">Autentificare</Link>
                  <Link className="btn white" to="/inregistrare">Cont gratuit</Link>
                </>}
            <button className="btn ghost icon s-menu-btn" aria-label="Meniu" aria-expanded={open} onClick={() => setOpen(o => !o)}><Icon name={open ? 'x' : 'menu'} /></button>
          </div>
        </div>
        {open && <nav className="s-mobile" onClick={() => setOpen(false)}>{NAV.map(([h, l]) => <a key={h} href={h}>{l}</a>)}<Link to="/login">Autentificare</Link></nav>}
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
