// /machete/butoane-2 — simpler nav button styles on the proposed navbar structure.
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { LogoMark } from '../components/LogoMark';
import './site.css';
import './btnmock2.css';

const ITEMS: { t: string; drop?: boolean; primary?: boolean }[] = [
  { t: 'Verifică produsele', primary: true }, { t: 'Categorii', drop: true }, { t: 'Termene' }, { t: 'Prețuri' }, { t: 'Pentru cine', drop: true },
];
const VARIANTS = [
  { id: 's1', name: 'Doar text', note: 'Text alb, fără nicio formă. Forma apare doar la hover. Cel mai curat.' },
  { id: 's2', name: 'Text + „Verifică” evidențiat', note: 'Totul e text, doar „Verifică produsele” are un contur fin, fiind acțiunea cea mai utilă.' },
  { id: 's3', name: 'Fundal foarte discret', note: 'Fiecare link are un fundal abia vizibil, fără contur. Se vede că sunt butoane, fără zgomot.' },
  { id: 's4', name: 'Contur subțire', note: 'Contur alb de 1 px, transparent. Linie fină, colțuri mici.' },
  { id: 's5', name: 'Pagina curentă subliniată', note: 'Text simplu; pagina pe care ești are o bară groasă jos, lipită de marginea barei.' },
  { id: 's6', name: 'Separatoare', note: 'Linkuri text despărțite de linii verticale fine. Ordonat, aproape editorial.' },
  { id: 's7', name: 'Pagina curentă albă', note: 'Text simplu; doar pagina curentă e o pastilă albă cu text cyan.' },
  { id: 's8', name: 'Compact, colțuri mici', note: 'Butoane mici cu fundal ușor și colțuri de 6 px. Bun dacă se adaugă mai multe linkuri.' },
];

function Bar({ id, hover }: { id: string; hover?: boolean }) {
  return (
    <div className={`b2-bar ${id}`}>
      <span className="b2-logo"><LogoMark size={50} c="#fff" bg="#0e7c86" /><span>DPP<b>4</b>ALL</span></span>
      <span className="b2-pill">Baterii: 85 zile</span>
      <nav className="b2-nav">
        {ITEMS.map((it, i) => (
          <a key={it.t} className={(it.primary ? 'primary ' : '') + (i === 2 ? 'cur ' : '') + (hover && i === 1 ? 'hov' : '')}>
            {it.t}{it.drop && <Icon name="chevronDown" size={14} />}
          </a>
        ))}
      </nav>
      <div className="b2-right">
        <a className="b2-icon" aria-label="Caută un pașaport"><Icon name="search" size={18} /></a>
        <a className="b2-lang"><Icon name="globe" size={16} />RO<Icon name="chevronDown" size={13} /></a>
        <a className="b2-login">Autentificare</a>
        <a className="b2-cta">Cont gratuit</a>
      </div>
    </div>
  );
}

export default function SimpleButtonMockups() {
  return (
    <div className="site b2-page">
      <div className="b2-intro">
        <p><Link to="/machete/butoane">← Butoane 1</Link> · <Link to="/machete/logo">Logo</Link></p>
        <h1>Butoane mai simple, pe navbarul propus</h1>
        <p className="lead">Structura: Verifică produsele · Categorii · Termene · Prețuri · Pentru cine, apoi căutare, limbă, autentificare și cont. „Termene” e pagina curentă, iar sub fiecare variantă „Categorii” apare la hover.</p>
      </div>
      <div className="b2-list">
        {VARIANTS.map((v, i) => (
          <section key={v.id} className="b2-v">
            <div className="b2-head"><span>{i + 1}</span><div><h2>{v.name}</h2><p>{v.note}</p></div></div>
            <div className="b2-frame"><small>Normal</small><Bar id={v.id} /></div>
            <div className="b2-frame"><small>„Categorii” la hover</small><Bar id={v.id} hover /></div>
          </section>
        ))}
      </div>
    </div>
  );
}
