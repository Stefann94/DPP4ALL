// /machete/v3 — six navbar + hero directions built from the product's own world
// (passport booklet, EU colours, paper folder, shipping label, Swiss grid, rubber stamp). No glow, no glass, no gradients.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { Barcode, QrCode } from '../components/Codes';
import { daysUntil } from '../lib/format';
import './site.css';
import './navmock.css';
import './human.css';

const DL = 'https://id.dpp4all.eu/01/05949876543233/21/SN-000187';

function V({ id, name, idea, why, watch, children, mobile }: { id: string; name: string; idea: string; why: string; watch: string; children: ReactNode; mobile: ReactNode }) {
  return (
    <section className="hm-v" id={id}>
      <div className="hm-v-head">
        <span className="hm-v-id">{id}</span>
        <div>
          <h2>{name}</h2>
          <p>{idea}</p>
        </div>
        <dl><dt>Bun pentru</dt><dd>{why}</dd><dt>Atenție la</dt><dd>{watch}</dd></dl>
      </div>
      <div className="hm-row">
        <div className="hm-desk">{children}</div>
        <div className="hm-mob">{mobile}</div>
      </div>
    </section>
  );
}

let stampN = 0;
function StampLogo({ size = 46, color = '#1f4d3a' }: { size?: number; color?: string }) {
  const pid = 'sc' + (++stampN);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs><path id={pid} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" /></defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="50" cy="50" r="27" fill="none" stroke={color} strokeWidth="1.5" />
      <text fontSize="10.5" fontWeight="700" letterSpacing="2.2" fill={color} fontFamily="Archivo, sans-serif"><textPath href={'#' + pid}>PAȘAPORT DIGITAL · PRODUS · UE ·</textPath></text>
      <text x="50" y="56" textAnchor="middle" fontSize="17" fontWeight="800" fill={color} fontFamily="Archivo, sans-serif">4ALL</text>
    </svg>
  );
}

export default function HumanMockups() {
  const d = daysUntil('2027-02-18');
  return (
    <div className="site hm-page">
      <div className="hm-intro">
        <p className="hm-crumb"><Link to="/machete/navbar">← Machete 1 și 2</Link></p>
        <h1>Machete 3: navbar + început de pagină</h1>
        <p>Șase direcții desenate pornind de la lucruri reale din lumea produsului: pașaportul, eticheta de transport, dosarul, ștampila. Fără gradienturi, fără sticlă, fără strălucire.</p>
        <nav className="hm-toc">{['M', 'N', 'O', 'P', 'Q', 'R'].map(x => <a key={x} href={`#${x}`}>{x}</a>)}</nav>
      </div>

      {/* M — passport booklet */}
      <V id="M" name="Pagina de pașaport" idea="Culoarea copertei de pașaport (vișiniu închis) și pagina de date cu linia citibilă automat jos. Produsul e prezentat literalmente ca un pașaport."
        why="Metaforă clară, imediat înțeleasă; arată „oficial” fără să fie rece." watch="Vișiniul trebuie dozat (doar bara și accente), restul pagina albă."
        mobile={<div className="hm-m mob"><div className="hm-m-bar"><b className="hm-m-logo">DPP4ALL</b><Icon name="menu" size={20} /></div><div className="hm-m-hero mob"><h3>Fiecare produs importat, cu pașaportul lui.</h3><a className="hm-m-btn">Verifică produsele</a></div></div>}>
        <div className="hm-m">
          <div className="hm-m-bar">
            <b className="hm-m-logo">DPP4ALL</b>
            <nav><a>Cum funcționează</a><a>Categorii</a><a>Termene</a><a>Prețuri</a><a lang="zh">供应商</a></nav>
            <span className="hm-m-lang">RO / EN / 中文</span>
            <a className="hm-m-login">Intră în cont</a>
          </div>
          <div className="hm-m-hero">
            <div className="hm-m-copy">
              <h3>Fiecare produs importat, cu pașaportul lui.</h3>
              <p>Cereți datele fabricii, verificați-le și publicați pașaportul digital cerut în UE. Pentru baterii, jucării, textile și restul.</p>
              <div className="hm-m-ctas"><a className="hm-m-btn">Verifică ce produse au nevoie</a><a className="hm-m-link">Vezi un exemplu →</a></div>
            </div>
            <div className="hm-m-page">
              <div className="hm-m-page-top"><span>PAȘAPORT DIGITAL AL PRODUSULUI</span><span>UE</span></div>
              <div className="hm-m-page-body">
                <div className="hm-m-photo"><QrCode value={DL} size={84} /></div>
                <dl>
                  <dt>Produs</dt><dd>Baterie e-bike 48V 14Ah</dd>
                  <dt>Model</dt><dd>VLT-RIDE-48-14</dd>
                  <dt>Țara fabricării</dt><dd>China</dd>
                  <dt>Importator</dt><dd>SC Exemplu SRL, RO</dd>
                  <dt>Valabil din</dt><dd>18.02.2027</dd>
                </dl>
              </div>
              <div className="hm-m-mrz">P&lt;ROUBATERIE&lt;EBIKE&lt;&lt;VLT&lt;RIDE&lt;48&lt;14&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />05949876543233&lt;SN000187&lt;CN&lt;2702181&lt;&lt;&lt;&lt;&lt;&lt;</div>
            </div>
          </div>
        </div>
      </V>

      {/* N — EU blue and yellow */}
      <V id="N" name="Albastru și galben UE" idea="Culorile Uniunii, folosite simplu: bara albastră, un singur buton galben. Verificatorul stă direct în hero, ca un formular."
        why="Comunică „UE / conformitate” instant, aspect instituțional prietenos." watch="Nu folosim cercul de stele (emblema UE are reguli de utilizare)."
        mobile={<div className="hm-n mob"><div className="hm-n-bar"><b>DPP4ALL</b><Icon name="menu" size={20} /></div><div className="hm-n-hero mob"><h3>Aflați ce cere UE pentru produsele voastre.</h3><div className="hm-n-form mob"><span>Baterii</span><a>Verifică</a></div></div></div>}>
        <div className="hm-n">
          <div className="hm-n-bar">
            <b>DPP4ALL</b>
            <nav><a className="on">Acasă</a><a>Categorii</a><a>Pentru importatori</a><a>Termene</a><a>Prețuri</a></nav>
            <div className="hm-n-right"><span>RO</span><span>EN</span><span lang="zh">中文</span><a className="hm-n-login">Autentificare</a><a className="hm-n-cta">Cont gratuit</a></div>
          </div>
          <div className="hm-n-hero">
            <h3>Aflați ce cere UE pentru produsele pe care le importați.</h3>
            <div className="hm-n-form">
              <label><small>Ce importați?</small><span>Baterii pentru e-bike și trotinete <Icon name="chevronDown" size={14} /></span></label>
              <label><small>Rolul vostru</small><span>Importator <Icon name="chevronDown" size={14} /></span></label>
              <a>Verifică</a>
            </div>
            <p className="hm-n-note">Răspuns cu sursa oficială pentru fiecare obligație · Baterii: obligatoriu peste {d} de zile</p>
          </div>
        </div>
      </V>

      {/* O — folder tabs */}
      <V id="O" name="Dosar cu taburi" idea="Meniul arată ca taburile unui dosar de hârtie. Tabul activ se continuă în pagină, iar în hero apare o fișă de produs ștampilată „Publicat”."
        why="Original și funcțional: utilizatorul vede imediat în ce secțiune e." watch="Pe mobil taburile devin o listă simplă."
        mobile={<div className="hm-o mob"><div className="hm-o-top"><b>DPP4ALL</b><Icon name="menu" size={20} /></div><div className="hm-o-sheet mob"><h3>Dosarul de conformitate al fiecărui produs, la zi.</h3></div></div>}>
        <div className="hm-o">
          <div className="hm-o-top"><b>DPP4ALL</b><span className="hm-o-meta">Pașapoarte digitale pentru importatori</span><div className="hm-o-right"><a>RO · EN · 中文</a><a>Autentificare</a><a className="hm-o-cta">Creează cont</a></div></div>
          <div className="hm-o-tabs"><a className="on">Prezentare</a><a>Categorii</a><a>Termene</a><a>Prețuri</a><a lang="zh">Furnizori 供应商</a></div>
          <div className="hm-o-sheet">
            <div><h3>Dosarul de conformitate al fiecărui produs, la zi.</h3><p>Furnizorul încarcă documentele, voi le verificați, platforma publică pașaportul și vă anunță ce mai lipsește.</p><a className="hm-o-cta">Începe cu un produs</a></div>
            <div className="hm-o-card">
              <span className="hm-o-stamp">PUBLICAT</span>
              <b>Mașinuță cu telecomandă</b><small>Lot L2611 · Jucării</small>
              <ul><li className="ok">Declarație de conformitate</li><li className="ok">Rapoarte EN 71-1, -2, -3</li><li className="ok">Avertismente în română</li><li>Lista substanțelor chimice</li></ul>
            </div>
          </div>
        </div>
      </V>

      {/* P — shipping label */}
      <V id="P" name="Etichetă de transport" idea="Limbajul etichetelor logistice: linii negre, câmpuri cu titluri mici, cod de bare real (EAN-14) și QR. Accent portocaliu de semnalizare."
        why="Vorbește pe limba importatorilor și a depozitelor; foarte concret." watch="Să rămână ordonat, nu „industrial” încărcat."
        mobile={<div className="hm-p mob"><div className="hm-p-bar"><b>DPP4ALL</b><span className="hm-p-tag">EU</span><Icon name="menu" size={20} /></div><div className="hm-p-hero mob"><h3>De la containerul din Ningbo la codul QR de pe cutie.</h3></div></div>}>
        <div className="hm-p">
          <div className="hm-p-bar">
            <b>DPP4ALL</b><span className="hm-p-tag">EU</span>
            <nav>{['Produs', 'Categorii', 'Termene', 'Prețuri', 'Furnizori'].map(x => <a key={x}><small>{x === 'Produs' ? 'cum' : x === 'Categorii' ? '12' : x === 'Termene' ? '2027+' : x === 'Prețuri' ? 'de la 0 €' : '中文'}</small>{x}</a>)}</nav>
            <div className="hm-p-right"><a>Autentificare</a><a className="hm-p-cta">Cont gratuit</a></div>
          </div>
          <div className="hm-p-hero">
            <div><h3>De la containerul din Ningbo la codul QR de pe cutie.</h3><p>Pașaportul digital cerut în UE, completat de fabrică și aprobat de voi, pentru orice categorie de produs.</p></div>
            <div className="hm-p-label">
              <div className="row1"><div><small>De la</small><b>Ningbo Mobility Co.</b><span>Zhejiang, CN</span></div><div><small>Către</small><b>SC Exemplu SRL</b><span>Cluj-Napoca, RO</span></div></div>
              <div className="row2"><div className="bc"><Barcode bcid="gs1-128" text="(01)15949876543230" height={9} /></div><div className="qr"><QrCode value={DL} size={74} /></div></div>
              <div className="row3"><span>Pașaport digital</span><b>id.dpp4all.eu/01/05949876543233</b></div>
            </div>
          </div>
        </div>
      </V>

      {/* Q — Swiss grid */}
      <V id="Q" name="Grilă elvețiană" idea="Alb, negru și un singur roșu. Logotip mare, linii fine, colțuri drepte. Termenele sunt așezate ca un tabel tipografic."
        why="Clasic, sigur pe el, nu se demodează; foarte lizibil." watch="Poate părea sever dacă textele sunt lungi."
        mobile={<div className="hm-q mob"><div className="hm-q-bar"><b>DPP4ALL<i>.</i></b><Icon name="menu" size={20} /></div><div className="hm-q-hero mob"><h3>Pașaportul produselor importate.</h3></div></div>}>
        <div className="hm-q">
          <div className="hm-q-bar"><b>DPP4ALL<i>.</i></b><nav><a>Produs</a><a>Categorii</a><a>Termene</a><a>Prețuri</a></nav><div className="hm-q-right"><a>RO</a><a>Autentificare</a><a className="hm-q-cta">Începe →</a></div></div>
          <div className="hm-q-hero">
            <h3>Pașaportul<br />produselor<br />importate.</h3>
            <div className="hm-q-table">
              <div><span>18.02.2027</span><b>Baterii</b><em>pașaport + QR</em></div>
              <div><span>23.09.2029</span><b>Detergenți</b><em>pașaport</em></div>
              <div><span>01.08.2030</span><b>Jucării</b><em>pașaport</em></div>
              <div><span>~2029</span><b>Textile, electronice</b><em>indicativ</em></div>
            </div>
          </div>
        </div>
      </V>

      {/* R — paper and stamp */}
      <V id="R" name="Hârtie și ștampilă" idea="Fundal de hârtie caldă, cerneală verde închis și logo-ul ca o ștampilă rotundă. Butoanele sunt dreptunghiuri simple, ca formularele tipărite."
        why="Cald și uman; amintește de actele reale fără să fie birocratic." watch="Ștampila e elementul principal: nu o repetăm peste tot."
        mobile={<div className="hm-r mob"><div className="hm-r-bar"><StampLogo size={34} /><b>DPP4ALL</b><Icon name="menu" size={20} /></div><div className="hm-r-hero mob"><h3>Actele produselor voastre, în regulă.</h3></div></div>}>
        <div className="hm-r">
          <div className="hm-r-bar"><StampLogo /><b>DPP4ALL</b><nav><a>Cum funcționează</a><a>Categorii</a><a>Termene</a><a>Prețuri</a></nav><div className="hm-r-right"><a>RO · EN · 中文</a><a className="hm-r-login">Intră în cont</a><a className="hm-r-cta">Începe gratuit</a></div></div>
          <div className="hm-r-hero">
            <div><h3>Actele produselor voastre, în regulă — și digitale.</h3><p>Pașapoartele cerute de UE pentru tot ce importați: date de la fabrică, verificate, publicate cu cod QR.</p></div>
            <ul className="hm-r-list"><li><b>1</b>Furnizorul completează, în chineză</li><li><b>2</b>Voi verificați și aprobați</li><li><b>3</b>Codul QR merge pe produs</li></ul>
          </div>
        </div>
      </V>
    </div>
  );
}
