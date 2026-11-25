// /machete/butoane — resting-state styles for the brand navbar links (with hover preview).
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import './site.css';
import './btnmock.css';

const ITEMS: [string, string][] = [['play', 'Cum funcționează'], ['dashboard', 'Categorii'], ['calendar', 'Termene'], ['tag', 'Prețuri'], ['users', 'Pentru furnizori']];
const VARIANTS: { id: string; name: string; note: string; icons?: boolean; group?: boolean }[] = [
  { id: 'b1', name: 'Sticlă fină (actuală)', note: 'Fundal alb translucid + contur subțire. Discret, dar se vede că sunt butoane.' },
  { id: 'b2', name: 'Contur', note: 'Doar contur alb, fără fundal. Curat și aerisit.' },
  { id: 'b3', name: 'Pastilă plină', note: 'Fundal alb transparent, colțuri complet rotunde, fără contur. Moale, modern.' },
  { id: 'b4', name: 'Pastilă albă', note: 'Butoane albe cu text în culoarea brandului. Cele mai vizibile.' },
  { id: 'b5', name: 'Adâncit', note: 'Fundal mai închis decât bara, cu o linie de lumină sus. Arată „apăsat”, ca niște taste.' },
  { id: 'b6', name: 'Grup segmentat', note: 'Toate linkurile într-o singură capsulă, despărțite de linii fine.', group: true },
  { id: 'b7', name: 'Cu iconițe', note: 'Pastile translucide cu o iconiță mică în stânga fiecărui link.', icons: true },
  { id: 'b8', name: 'Linie dedesubt', note: 'Fără formă de buton: o linie scurtă sub fiecare link, care se lungește la hover.' },
];

function Bar({ v, hover }: { v: typeof VARIANTS[number]; hover?: boolean }) {
  return (
    <div className="bm-bar">
      <span className="bm-logo"><svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="#fff" /><path d="M9 9h6v6H9zM17 9h6v6h-6zM9 17h6v6H9zM17 17h2.5v2.5H17zM20.5 20.5H23V23h-2.5z" fill="var(--accent)" /></svg><span>DPP<b>4</b>ALL</span></span>
      <nav className={`bm-nav ${v.id}${v.group ? ' group' : ''}`}>
        {ITEMS.map(([ic, t], i) => <a key={t} className={hover && i === 1 ? 'hov' : ''}>{v.icons && <Icon name={ic} size={15} />}{t}</a>)}
      </nav>
      <div className="bm-right"><a className={`bm-login ${v.id}`}>Autentificare</a><a className="bm-cta">Cont gratuit</a></div>
    </div>
  );
}

export default function ButtonMockups() {
  return (
    <div className="site bm-page">
      <div className="bm-intro">
        <p><Link to="/">← Acasă</Link></p>
        <h1>Butoanele din navbar, fără hover</h1>
        <p className="lead">Opt feluri de a da formă linkurilor din bară. Sub fiecare variantă e aceeași bară cu „Categorii” în starea de hover, ca să vezi diferența.</p>
      </div>
      <div className="bm-list">
        {VARIANTS.map((v, i) => (
          <section key={v.id} className="bm-v">
            <div className="bm-head"><span>{i + 1}</span><div><h2>{v.name}</h2><p>{v.note}</p></div></div>
            <div className="bm-frame"><small>Normal</small><Bar v={v} /></div>
            <div className="bm-frame"><small>„Categorii” la hover</small><Bar v={v} hover /></div>
          </section>
        ))}
      </div>
    </div>
  );
}
