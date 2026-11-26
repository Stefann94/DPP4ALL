// DPP4ALL — public Home page. Copy follows the plan in reports/Platforme DPP și cerințe pe categorii.md (Part 4).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { SiteLayout } from './SiteLayout';
import { Checker, type CheckerPreset } from './Checker';
import { HeroH3 } from './HeroParts';
import { Timeline } from './Timeline';
import { DemoPassport, HeroFlow } from './Mockups';
import { CATEGORIES } from '../data/regulations';

const FEATURES: [string, string, string][] = [
  ['shield', 'Registru UE și vamă', 'Cod NC validat, ID de înregistrare și dovada de înregistrare păstrate pe lot.'],
  ['lock', 'Acces pe niveluri', 'Cereri de acces pentru reparatori și autorități, aprobări și jurnal, nu e-mailuri.'],
  ['history', 'Versiuni și audit', 'Fiecare modificare, cine și când. Versiunile vechi rămân arhivate.'],
  ['qr', 'Etichete și QR', 'Coli A4, imprimante Zebra, EAN-14 pentru bax, GS1 Digital Link sau domeniul vostru.'],
  ['import', 'Import în masă', 'Excel sau CSV, cu potrivirea coloanelor și detectarea duplicatelor. Folder urmărit automat.'],
  ['chart', 'Statistici de scanare', 'Pe țară, limbă și produs, fără cookie-uri.'],
  ['webhook', 'API și webhook-uri', 'Conectați ERP-ul, magazinul online sau asistentul AI.'],
  ['pulse', 'Telemetrie baterii', 'Starea de sănătate din BMS ajunge automat în pașaport.'],
];

const FAQ: [string, React.ReactNode][] = [
  ['Produsele mele au nevoie de pașaport acum?', <>Depinde de categorie. Bateriile au termen pe <b>18 februarie 2027</b>; regulile de siguranță (GPSR) sunt deja obligatorii pentru orice produs de consum. Restul categoriilor urmează din 2028–2030. <a href="#verificator">Verificați în 60 de secunde.</a></>],
  ['Cine răspunde dacă fabrica e în China?', 'Pentru produsele fabricate în afara UE, răspunde importatorul sau reprezentantul autorizat. Pașaportul trebuie să existe și să fie înregistrat înainte de punerea în liberă circulație.'],
  ['Ce trebuie să cer furnizorului?', 'Depinde de categorie: rapoarte de test, declarația de conformitate, compoziția materialelor, fișa tehnică. Verificatorul vă dă lista, iar portalul în chineză o trimite direct fabricii.'],
  ['Pot folosi codurile mele GS1 sau domeniul meu?', 'Da. Codul QR poate folosi GTIN-ul vostru (GS1 Digital Link) și domeniul firmei, ca să nu depindeți de noi.'],
  ['Ce se întâmplă cu datele dacă renunț?', 'Exportați tot oricând (JSON EN 18223, JSON-LD, CSV, ZIP). Pașapoartele publicate rămân accesibile 10 ani, chiar după încheierea abonamentului.'],
  ['Mă înregistrați în registrul UE?', 'Pregătim datele și trimiterea. Pentru baterii, registrul așteaptă ca Comisia să publice catalogul de date; vă anunțăm imediat ce se deschide.'],
  ['Cine vede datele confidențiale?', 'Doar cine are dreptul: reparatori și reciclatori cu acces aprobat, autoritățile. Fiecare vizualizare apare în jurnal.'],
  ['Sunteți „certificați” ca furnizor de servicii DPP?', 'Încă nu există o certificare: actul delegat pentru furnizorii de servicii DPP e așteptat în 2027. Construim pe standardele europene deja citate în Jurnalul Oficial.'],
];

export default function Home() {
  const [q, setQ] = useState<CheckerPreset>({ cat: 'baterii', sub: 'lmt', role: 'importer', b2c: true });
  const [run, setRun] = useState(0);
  const verify = () => { setRun(r => r + 1); setTimeout(() => document.getElementById('verificator')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
  return (
    <SiteLayout>
      {/* 2 · Hero (H3: copy + checker form, live answer card + supplier phone) */}
      <section className="hm2-hero tint">
        <div className="wrap"><HeroH3 q={q} setQ={setQ} onVerify={verify} /></div>
      </section>

      {/* 3 · Checker result */}
      <section id="verificator">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Am nevoie de DPP?</span>
            <h2>Ce vi se aplică, cu sursa oficială</h2>
            <p className="lead">Schimbați categoria sau rolul oricând. Vă arătăm ce e obligatoriu azi, ce e lege adoptată și ce e doar planificat.</p>
          </div>
          <Checker key={run} preset={q} />
        </div>
      </section>

      {/* flow visual */}
      <section className="band">
        <div className="wrap s-split">
          <div>
            <span className="eyebrow">Fabrica → voi → clientul</span>
            <h2 style={{ marginTop: 12 }}>De la fabrică la clientul vostru, într-un singur flux</h2>
            <p className="lead" style={{ marginTop: 14 }}>Cereți datele direct fabricii din China, în limba ei. Le extragem și le verificăm, iar voi publicați pașaportul cu cod QR, pregătit pentru registrul UE.</p>
            <div className="ctas" style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}><Link className="btn primary lg" to="/inregistrare">Începe gratuit</Link><a className="btn lg" href="#demo">Vezi un pașaport demo</a></div>
          </div>
          <HeroFlow />
        </div>
      </section>

      {/* 4 · Timeline */}
      <section id="termene" className="band">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Calendar</span>
            <h2>Termenele, pe categorii — nu doar pentru baterii</h2>
            <p className="lead">Punct plin = lege adoptată. Punct punctat = dată indicativă a Comisiei, fără act delegat. Apăsați pe un termen pentru detalii.</p>
          </div>
          <Timeline />
        </div>
      </section>

      {/* 5 · Importer problem */}
      <section>
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">De ce importatorul</span><h2>Când fabrica e în afara UE, pașaportul devine responsabilitatea voastră</h2></div>
          <div className="s-grid3">
            <div className="s-card"><span className="ic"><Icon name="shield" /></span><h3>Răspunderea e la importator</h3><p>Pentru produsele fabricate în afara UE, pașaportul trebuie să existe și să fie înregistrat înainte de punerea în liberă circulație.</p><a className="src" href="https://single-market-economy.ec.europa.eu/single-market/digital-product-passport_en" target="_blank" rel="noreferrer">Sursa: Comisia Europeană</a></div>
            <div className="s-card"><span className="ic"><Icon name="users" /></span><h3>Datele sunt la fabrică</h3><p>Compoziția, rapoartele de test și originea materialelor le are furnizorul. Iar furnizorii întreabă adesea „de ce?” când li se cer.</p></div>
            <div className="s-card"><span className="ic"><Icon name="alert" /></span><h3>Nu orice certificat e ce pare</h3><p>Rapoartele de test împrumutate sau modificate sunt o problemă cunoscută. Verificarea se face la laboratorul emitent, nu prin QR-ul de pe document.</p></div>
          </div>
        </div>
      </section>

      {/* 6 · How it works */}
      <section id="cum-functioneaza" className="band">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Cum funcționează</span><h2>De la fabrică la codul QR, în patru pași</h2></div>
          <div className="s-steps">
            <div><span className="n">1</span><h3>Adăugați produsele</h3><p>Importați Excel-ul de la furnizor sau un CSV. Coloanele le potrivim noi, duplicatele le semnalăm.</p></div>
            <div><span className="n">2</span><h3>Cereți datele fabricii</h3><p>Trimiteți un link. Furnizorul completează în chineză, pe telefon, fără cont, și încarcă rapoartele de test.</p></div>
            <div><span className="n">3</span><h3>Verificați și aprobați</h3><p>Extragem câmpurile din documente, voi aprobați. Contorul arată ce mai lipsește pentru publicare.</p></div>
            <div><span className="n">4</span><h3>Publicați și etichetați</h3><p>Pașaport public în limbile UE, acces pe niveluri, etichete A4 sau Zebra și fișiere QR pentru linia de producție.</p></div>
          </div>
        </div>
      </section>

      {/* 7 · Supplier portal */}
      <section id="furnizori">
        <div className="wrap s-split">
          <div>
            <span className="eyebrow">Portal pentru furnizori · 供应商门户</span>
            <h2 style={{ marginTop: 12 }}>Fabrica voastră completează în limba ei</h2>
            <p className="lead" style={{ marginTop: 14 }}>Fiecare cerere ajunge la furnizor ca link, în chineză sau engleză. Vede exact ce câmpuri trebuie pentru categoria lui, încarcă PDF-uri sau fotografii și știe ce date rămân private. Voi vedeți progresul și trimiteți reamintiri automate.</p>
            <ul className="s-checks">
              <li><Icon name="check" />Formulare pe categorie, cu unități și exemple</li>
              <li><Icon name="check" />Încărcare rapoarte de test, declarații, liste de materiale</li>
              <li><Icon name="check" />Fișiere QR pentru linia de producție</li>
            </ul>
            <span className="muted small">Textul în chineză va fi verificat de un vorbitor nativ înainte de lansare.</span>
          </div>
          <div style={{ display: 'grid', justifyItems: 'center' }}>
            <div className="phone auto" style={{ maxWidth: 250 }}><div className="scr">
              <div className="bar zh" lang="zh"><b>欧盟数字产品护照 — 供应商数据填写</b><span>SC Exemplu SRL 请求</span></div>
              <div className="body zh" lang="zh">
                <p style={{ color: '#4b5a67' }}>您的欧盟客户请您提供以下产品数据。无需注册，手机即可填写。</p>
                <div className="row2"><span>产品型号</span><div className="inp">EB-48V-14Ah</div></div>
                <div className="row2"><span>材料成分</span><div className="inp">NMC 811 / 石墨</div></div>
                <div className="file"><Icon name="upload" size={12} />上传测试报告</div>
                <div className="btnp">开始填写</div>
              </div>
            </div></div>
          </div>
        </div>
      </section>

      {/* 8 · Demo passport */}
      <section id="demo" className="band">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Pașaport demo</span><h2>Vedeți un pașaport așa cum îl vede fiecare</h2></div>
          <DemoPassport />
          <div style={{ marginTop: 28 }}><Link className="btn primary lg" to="/inregistrare">Creați-vă propriul pașaport gratuit</Link></div>
        </div>
      </section>

      {/* 9 · Categories */}
      <section id="categorii">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Categorii</span><h2>O singură platformă pentru tot ce importați</h2><p className="lead">Fiecare categorie are propriul șablon de date, actualizat odată cu legislația.</p></div>
          <div className="s-catgrid">
            {CATEGORIES.map(c => <div key={c.id} className="s-catcard"><Icon name={c.icon} /><div><b>{c.name}</b><small>{c.badge}</small></div></div>)}
          </div>
          <div className="s-fam">
            <div><b>Pașaport per bucată</b><p>Fiecare baterie are al ei: serie, stare, istoric.</p></div>
            <div><b>Pașaport per model, legat de EPREL</b><p>Electrocasnice, anvelope, telefoane.</p></div>
            <div><b>Pașaport în locul declarației de conformitate</b><p>Jucării, construcții, detergenți.</p></div>
          </div>
        </div>
      </section>

      {/* 10 · Features */}
      <section className="band">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Funcționalități</span><h2>Tot ce cere un pașaport, fără foi de calcul</h2></div>
          <div className="s-grid4">{FEATURES.map(([i, t, d]) => <div key={t} className="s-card"><span className="ic"><Icon name={i} /></span><h3>{t}</h3><p>{d}</p></div>)}</div>
        </div>
      </section>

      {/* 11 · No lock-in */}
      <section>
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Fără blocare</span><h2>Pașapoartele voastre rămân ale voastre</h2></div>
          <div className="s-grid4">
            <div className="s-card"><span className="ic"><Icon name="globe" /></span><h3>Domeniul vostru</h3><p>Codul QR poate duce la domeniul firmei, nu la al nostru.</p></div>
            <div className="s-card"><span className="ic"><Icon name="export" /></span><h3>Export complet</h3><p>JSON EN 18223, JSON-LD, CSV, arhivă ZIP. Oricând.</p></div>
            <div className="s-card"><span className="ic"><Icon name="calendar" /></span><h3>Păstrare 10 ani</h3><p>Pașapoartele rămân accesibile chiar dacă renunțați la abonament.</p></div>
            <div className="s-card"><span className="ic"><Icon name="refresh" /></span><h3>Backup zilnic</h3><p>Copie în altă locație din UE, în fiecare zi.</p></div>
          </div>
          <div className="s-band-cta" style={{ marginTop: 32 }}>
            <div className="stack sm"><b>Sunteți broker vamal, casă de expediții sau consultant?</b><p>Gestionați pașapoartele clienților dintr-un singur cont, sub marca voastră.</p></div>
            <a className="btn primary lg" href="mailto:parteneri@dpp4all.eu">Devino partener</a>
          </div>
        </div>
      </section>

      {/* 13 · Pricing teaser */}
      <section id="preturi" className="band">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Prețuri</span><h2>Prețuri publice. Fără apel de vânzări.</h2></div>
          <div className="s-prices">
            <div className="s-price"><b>Gratuit</b><span className="amt">0 €</span><p>3 produse publicate, verificator, alerte.</p></div>
            <div className="s-price"><b>Start</b><span className="amt">29 € <small>/lună</small></span><p>50 de modele, import Excel, etichete, 3 utilizatori.</p></div>
            <div className="s-price hot"><span className="tag">Cel mai ales</span><b>Importator</b><span className="amt">89 € <small>/lună</small></span><p>500 de modele, portal furnizori nelimitat, extragere din documente, acces pe niveluri, API.</p></div>
            <div className="s-price"><b>Business</b><span className="amt">249 € <small>/lună</small></span><p>3.000 de modele, telemetrie baterii, mai multe firme, SLA.</p></div>
          </div>
          <p className="muted small" style={{ marginTop: 14 }}>Prețuri pe lună, facturare anuală, fără TVA. Echivalent în lei pe pagina de prețuri. Prețuri de lansare, în curs de validare.</p>
        </div>
      </section>

      {/* 14 · Trust */}
      <section id="incredere">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Încredere</span><h2>Construit pe standarde, găzduit în România</h2></div>
          <div className="s-grid4">
            <div className="s-card"><span className="ic"><Icon name="shield" /></span><h3>Date în România (UE)</h3><p>Server dedicat în România, backup zilnic în altă locație din UE.</p></div>
            <div className="s-card"><span className="ic"><Icon name="link" /></span><h3>Standarde europene</h3><p>GS1 Digital Link, EN 18219–18223, JSON-LD.</p></div>
            <div className="s-card"><span className="ic"><Icon name="lock" /></span><h3>GDPR</h3><p>Acord de prelucrare a datelor (DPA) disponibil. Fără cookie-uri pe pașapoarte.</p></div>
            <div className="s-card"><span className="ic"><Icon name="users" /></span><h3>Program pilot</h3><p>Primii 20 de importatori primesc configurare asistată gratuită.</p></div>
          </div>
        </div>
      </section>

      {/* 15 · FAQ */}
      <section id="intrebari" className="band">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Întrebări frecvente</span><h2>Răspunsuri scurte</h2></div>
          <div className="s-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>

      {/* 16 · Final CTA */}
      <section>
        <div className="wrap s-final">
          <h2>Aflați în 2 minute ce produse ale voastre au nevoie de pașaport</h2>
          <div className="row" style={{ justifyContent: 'center' }}>
            <a className="btn primary lg" href="#verificator">Pornește verificatorul</a>
            <a className="btn lg" href="mailto:contact@dpp4all.eu?subject=Discu%C8%9Bie%2020%20minute">Programează o discuție de 20 de minute</a>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
