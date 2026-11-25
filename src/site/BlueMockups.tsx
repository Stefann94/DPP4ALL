// /machete/v4 — six blue directions (Geist, modern buttons). Navbar + hero, desktop and mobile.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { Barcode, QrCode } from '../components/Codes';
import { daysUntil } from '../lib/format';
import './site.css';
import './blue.css';

const DL = 'https://id.dpp4all.eu/01/05949876543233/21/SN-000187';
const Logo = ({ light }: { light?: boolean }) => (
  <span className={'bl-logo' + (light ? ' light' : '')}>
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill={light ? '#fff' : '#0e7c86'} /><path d="M9 9h6v6H9zM17 9h6v6h-6zM9 17h6v6H9zM17 17h2.5v2.5H17zM20.5 20.5H23V23h-2.5z" fill={light ? '#0e7c86' : '#fff'} /></svg>
    <span>DPP<b>4</b>ALL</span>
  </span>
);
const Nav = ({ items = ['Produs', 'Categorii', 'Termene', 'Prețuri'], light }: { items?: string[]; light?: boolean }) => (
  <nav className={'bl-nav' + (light ? ' light' : '')}>{items.map((x, i) => <a key={x} className={i === 0 ? 'on' : ''}>{x}{i < 2 && <Icon name="chevronDown" size={13} />}</a>)}</nav>
);
const PassCard = () => (
  <div className="bl-pass">
    <div className="bl-pass-h"><span>Pașaport digital · baterie</span><span className="bl-chip ok">Publicat</span></div>
    <b>Baterie e-bike 48V 14Ah</b><small>VLT-RIDE-48-14 · SN-000187</small>
    <dl><dt>Producător</dt><dd>Ningbo Mobility Co., CN</dd><dt>Importator</dt><dd>SC Exemplu SRL, RO</dd><dt>Chimie</dt><dd>Litiu-ion NMC 811</dd><dt>Stare</dt><dd>96% · originală</dd></dl>
    <div className="bl-pass-f"><QrCode value={DL} size={62} /><span>Scanați pentru<br />pașaportul complet</span></div>
  </div>
);

function V({ id, name, idea, children, mobile }: { id: string; name: string; idea: string; children: ReactNode; mobile: ReactNode }) {
  return (
    <section className="bl-v" id={id}>
      <div className="bl-v-head"><span>{id}</span><div><h2>{name}</h2><p>{idea}</p></div></div>
      <div className="bl-desk">{children}</div>
      <div className="bl-mob">{mobile}</div>
    </section>
  );
}

export default function BlueMockups() {
  const d = daysUntil('2027-02-18');
  return (
    <div className="site bl-page">
      <div className="bl-intro">
        <p><Link to="/machete/v3">← Machete 3</Link> · <Link to="/machete/navbar">Machete 1–2</Link></p>
        <h1>Machete 4 — cyan, modern</h1>
        <p className="lead">Font Geist, butoane rotunjite cu umbră fină, albastru #0e7c86. Șase feluri de a începe pagina.</p>
        <nav className="bl-toc">{['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(x => <a key={x} href={`#${x}`}>{x}</a>)}</nav>
      </div>

      {/* S1 — clean white */}
      <V id="S1" name="Alb, cu fișa pașaportului" idea="Navbar alb, aerisit. Text la stânga, fișa unui pașaport real la dreapta. Cel mai sigur și echilibrat."
        mobile={<div className="bl-s1 m"><div className="bl-bar"><Logo /><Icon name="menu" size={20} /></div><div className="bl-s1-hero m"><span className="bl-kick">Pentru importatori</span><h3>Pașaportul digital pentru fiecare produs importat</h3><a className="bl-btn">Verifică produsele</a></div></div>}>
        <div className="bl-s1">
          <div className="bl-bar"><Logo /><Nav items={['Produs', 'Categorii', 'Termene', 'Prețuri', 'Furnizori']} /><div className="bl-right"><a className="bl-link">Autentificare</a><a className="bl-btn">Începe gratuit</a></div></div>
          <div className="bl-s1-hero">
            <div>
              <span className="bl-kick"><span className="dot" />Baterii: obligatoriu în {d} de zile</span>
              <h3>Pașaportul digital pentru fiecare produs pe care îl importați</h3>
              <p>Cereți datele fabricii în chineză, verificați-le și publicați pașaportul cu cod QR. Pentru orice categorie.</p>
              <div className="bl-ctas"><a className="bl-btn lg">Verifică ce produse au nevoie <Icon name="arrowRight" size={16} /></a><a className="bl-btn ghost lg">Vezi un exemplu</a></div>
            </div>
            <PassCard />
          </div>
        </div>
      </V>

      {/* S2 — blue bar + checker */}
      <V id="S2" name="Bară colorată cu verificator" idea="Navbar plin, în culoarea brandului. Hero deschis, cu verificatorul ca formular modern: alegi categoria și primești răspunsul."
        mobile={<div className="bl-s2 m"><div className="bl-bar blue"><Logo light /><Icon name="menu" size={20} /></div><div className="bl-s2-hero m"><h3>Ce cere UE pentru produsele voastre?</h3><div className="bl-form m"><span>Baterii <Icon name="chevronDown" size={14} /></span><a className="bl-btn">Verifică</a></div></div></div>}>
        <div className="bl-s2">
          <div className="bl-bar blue"><Logo light /><Nav light items={['Produs', 'Categorii', 'Pentru importatori', 'Termene', 'Prețuri']} /><div className="bl-right"><a className="bl-link light">Autentificare</a><a className="bl-btn white">Cont gratuit</a></div></div>
          <div className="bl-s2-hero">
            <h3>Ce cere UE pentru produsele pe care le importați?</h3>
            <p>Răspuns în 60 de secunde, cu sursa oficială la fiecare obligație.</p>
            <div className="bl-form">
              <label><small>Ce importați?</small><span>Baterii e-bike și trotinete <Icon name="chevronDown" size={14} /></span></label>
              <label><small>Rolul vostru</small><span>Importator <Icon name="chevronDown" size={14} /></span></label>
              <label><small>Vindeți către</small><span>Consumatori <Icon name="chevronDown" size={14} /></span></label>
              <a className="bl-btn lg">Verifică</a>
            </div>
            <div className="bl-tags"><span>Baterii · 18.02.2027</span><span>Jucării · 01.08.2030</span><span>Detergenți · 23.09.2029</span><span className="ind">Textile · ~2029</span></div>
          </div>
        </div>
      </V>

      {/* S3 — deep blue hero */}
      <V id="S3" name="Hero închis" idea="Fundal petrol închis, plat (fără efecte). Navbar transparent peste el, buton alb. Mai puternic și mai „premium”, dar sobru."
        mobile={<div className="bl-s3 m"><div className="bl-bar dark"><Logo light /><Icon name="menu" size={20} /></div><div className="bl-s3-hero m"><h3>Fiecare produs importat, cu pașaportul lui.</h3><a className="bl-btn white">Începe gratuit</a></div></div>}>
        <div className="bl-s3">
          <div className="bl-bar dark"><Logo light /><Nav light /><div className="bl-right"><span className="bl-lang">RO · EN · 中文</span><a className="bl-link light">Autentificare</a><a className="bl-btn white">Începe gratuit</a></div></div>
          <div className="bl-s3-hero">
            <div>
              <h3>Fiecare produs importat, cu pașaportul lui.</h3>
              <p>Fabrica completează, voi aprobați, clientul scanează. Baterii, jucării, textile, electronice și restul.</p>
              <div className="bl-ctas"><a className="bl-btn white lg">Începe gratuit</a><a className="bl-btn outline lg">Vezi demo</a></div>
              <div className="bl-stats"><div><b>12</b><span>categorii</span></div><div><b>{d}</b><span>zile până la baterii</span></div><div><b>RO</b><span>date în UE</span></div></div>
            </div>
            <PassCard />
          </div>
        </div>
      </V>

      {/* S4 — split with phone */}
      <V id="S4" name="Împărțit, cu telefonul" idea="Jumătate albă cu textul, jumătate cyan deschis cu un telefon care arată pașaportul public. Meniul are taburi rotunjite."
        mobile={<div className="bl-s4 m"><div className="bl-bar"><Logo /><Icon name="menu" size={20} /></div><div className="bl-s4-l m"><h3>Pașapoarte digitale, de la fabrică la client</h3><a className="bl-btn">Începe gratuit</a></div></div>}>
        <div className="bl-s4">
          <div className="bl-bar"><Logo /><div className="bl-tabs"><a className="on">Importatori</a><a>Furnizori 供应商</a><a>Parteneri</a></div><div className="bl-right"><a className="bl-link">Prețuri</a><a className="bl-link">Autentificare</a><a className="bl-btn">Începe gratuit</a></div></div>
          <div className="bl-s4-hero">
            <div className="bl-s4-l">
              <h3>Pașapoarte digitale, de la fabrică la client.</h3>
              <ul><li><Icon name="check" size={16} />Fabrica completează în chineză</li><li><Icon name="check" size={16} />Verificați și aprobați într-un singur loc</li><li><Icon name="check" size={16} />Cod QR gata de tipărit, pentru orice categorie</li></ul>
              <div className="bl-ctas"><a className="bl-btn lg">Începe gratuit</a><a className="bl-link">Programează o discuție →</a></div>
            </div>
            <div className="bl-s4-r">
              <div className="bl-phone"><div className="bl-phone-s">
                <div className="bl-phone-h"><b>Baterie e-bike 48V</b><small>Pașaport per bucată</small></div>
                <div className="bl-phone-b">{[['Producător', 'Ningbo Mobility'], ['Importator', 'SC Exemplu SRL'], ['Capacitate', '14 Ah · 48 V'], ['Stare', '96%'], ['Reciclare', 'Punct de colectare']].map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}<div className="lock"><Icon name="lock" size={12} />Compoziție detaliată</div></div>
              </div></div>
            </div>
          </div>
        </div>
      </V>

      {/* S5 — product preview */}
      <V id="S5" name="Previzualizare aplicație" idea="Titlu centrat, două butoane, iar dedesubt o captură din aplicația reală (lista de pașapoarte cu progres). Arată produsul direct."
        mobile={<div className="bl-s5 m"><div className="bl-bar"><Logo /><Icon name="menu" size={20} /></div><div className="bl-s5-hero m"><h3>Toate pașapoartele, într-un singur loc</h3><a className="bl-btn">Începe gratuit</a></div></div>}>
        <div className="bl-s5">
          <div className="bl-bar"><Logo /><Nav /><div className="bl-right"><a className="bl-link">Autentificare</a><a className="bl-btn">Începe gratuit</a></div></div>
          <div className="bl-s5-hero">
            <h3>Toate pașapoartele produselor, într-un singur loc.</h3>
            <div className="bl-ctas center"><a className="bl-btn lg">Începe gratuit</a><a className="bl-btn ghost lg">Vezi demo</a></div>
            <div className="bl-app">
              <div className="bl-app-top"><i /><i /><i /><span>app.dpp4all.eu/pasapoarte</span></div>
              <table><thead><tr><th>Produs</th><th>Categorie</th><th>GTIN</th><th>Stare</th><th>Completat</th></tr></thead>
                <tbody>{[['Baterie e-bike 48V 14Ah', 'Baterii', '5949876543233', 'Publicat', 100], ['Mașinuță cu telecomandă', 'Jucării', '5949876543301', 'Ciornă', 72], ['Tricou bumbac organic', 'Textile', '5949876543318', 'Ciornă', 45], ['Trotinetă 350 W', 'Baterii', '5949876543325', 'Publicat', 100]].map(([n, c, g, s, p]) => (
                  <tr key={String(n)}><td><b>{n}</b></td><td>{c}</td><td className="mono">{g}</td><td><span className={'bl-chip' + (s === 'Publicat' ? ' ok' : '')}>{s}</span></td><td><div className="bl-prog"><i style={{ width: `${p}%` }} /></div><small>{p}%</small></td></tr>))}</tbody></table>
            </div>
          </div>
        </div>
      </V>

      {/* S6 — blue label */}
      <V id="S6" name="Etichetă colorată" idea="Eticheta de transport, reinterpretată modern în culoarea brandului: cod de bare real, QR, câmpuri De la / Către. Concret pentru importatori."
        mobile={<div className="bl-s6 m"><div className="bl-bar"><Logo /><Icon name="menu" size={20} /></div><div className="bl-s6-hero m"><h3>De la containerul din Ningbo la QR-ul de pe cutie.</h3><a className="bl-btn">Începe gratuit</a></div></div>}>
        <div className="bl-s6">
          <div className="bl-bar"><Logo /><Nav items={['Produs', 'Categorii', 'Termene', 'Prețuri', 'Furnizori']} /><div className="bl-right"><a className="bl-link">Autentificare</a><a className="bl-btn">Începe gratuit</a></div></div>
          <div className="bl-s6-hero">
            <div><h3>De la containerul din Ningbo la QR-ul de pe cutie.</h3><p>Pașaportul digital cerut în UE, completat de fabrică și aprobat de voi.</p><div className="bl-ctas"><a className="bl-btn lg">Începe gratuit</a><a className="bl-btn ghost lg">Cum funcționează</a></div></div>
            <div className="bl-label">
              <div className="r1"><div><small>De la</small><b>Ningbo Mobility Co.</b><span>Zhejiang, CN</span></div><div><small>Către</small><b>SC Exemplu SRL</b><span>Cluj-Napoca, RO</span></div></div>
              <div className="r2"><Barcode bcid="gs1-128" text="(01)15949876543230" height={9} /><QrCode value={DL} size={70} /></div>
              <div className="r3"><span>Pașaport digital</span><b>id.dpp4all.eu/01/05949876543233</b></div>
            </div>
          </div>
        </div>
      </V>
    </div>
  );
}
