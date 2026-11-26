// /machete/butoane-3 — frameless nav buttons: shape comes from fill/shadow/relief, a ring appears only on hover.
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { LogoMark } from '../components/LogoMark';
import './site.css';
import './btnmock2.css';
import './btnmock3.css';

const ITEMS: { t: string; icon: string; sub: string; drop?: boolean }[] = [
  { t: 'Verifică produsele', icon: 'check', sub: '60 de secunde' },
  { t: 'Categorii', icon: 'dashboard', sub: '12 tipuri', drop: true },
  { t: 'Termene', icon: 'calendar', sub: 'calendar legal' },
  { t: 'Prețuri', icon: 'tag', sub: 'de la 0 €' },
  { t: 'Pentru cine', icon: 'users', sub: 'importatori, fabrici', drop: true },
];
const VARIANTS = [
  { id: 't1', name: 'Nuanță moale', note: 'Fiecare buton are o nuanță ușor mai deschisă decât bara. Fără ramă; la hover apare un inel fin.' },
  { id: 't2', name: 'Nuanță mai închisă', note: 'Butoanele sunt puțin mai închise decât bara, ca niște zone apăsate. La hover se luminează și apare inelul.' },
  { id: 't3', name: 'Ridicate cu umbră', note: 'Fără ramă, dar cu o umbră mică dedesubt: par așezate deasupra barei. La hover se ridică puțin.' },
  { id: 't4', name: 'Tastă', note: 'Ca o tastă: o margine mai închisă doar jos, care dă relief. Clar că se poate apăsa.' },
  { id: 't5', name: 'Cu iconiță', note: 'Text cu iconiță mică în față și fundal foarte discret. Iconița spune singură că e un buton.' },
  { id: 't6', name: 'Tavă comună', note: 'Toate butoanele stau într-o singură tavă fără ramă; pagina curentă e albă. La hover, butonul primește inel.' },
  { id: 't7', name: 'Punct pentru pagina curentă', note: 'Pastile foarte discrete; pagina curentă are un punct alb mic sub text.' },
  { id: 't8', name: 'Contur doar la hover', note: 'Doar text cu fundal abia perceptibil. Rama apare numai la hover, plus o săgeată fină.' },
  { id: 't9', name: 'Două rânduri (avansat)', note: 'Sub fiecare buton, o explicație scurtă. Mai informativ, util pentru vizitatori noi.' },
  { id: 't10', name: 'Glisor (avansat)', note: 'O formă albă alunecă între butoane: stă pe pagina curentă și se mută sub mouse la hover.' },
];

function Bar({ id, state }: { id: string; state: 'normal' | 'hover' }) {
  return (
    <div className={`b2-bar t-bar ${id}`}>
      <span className="b2-logo"><LogoMark size={46} c="#fff" bg="#0e7c86" /><span>DPP<b>4</b>ALL</span></span>
      <nav className="b2-nav t-nav">
        {ITEMS.map((it, i) => (
          <a key={it.t} className={(i === 2 ? 'cur ' : '') + (state === 'hover' && i === 1 ? 'hov' : '')}>
            {id === 't5' && <Icon name={it.icon} size={16} />}
            {id === 't9' ? <span className="two"><b>{it.t}{it.drop && <Icon name="chevronDown" size={13} />}</b><small>{it.sub}</small></span> : <>{it.t}{it.drop && <Icon name="chevronDown" size={14} />}</>}
            {id === 't8' && <Icon name="arrowRight" size={13} />}
          </a>
        ))}
      </nav>
      <div className="b2-right">
        <a className="b2-icon" aria-label="Caută un pașaport"><Icon name="search" size={18} /></a>
        <a className="b2-lang"><Icon name="globe" size={16} />RO</a>
        <a className="b2-login">Autentificare</a>
        <a className="b2-cta">Cont gratuit</a>
      </div>
    </div>
  );
}

export default function FramelessButtonMockups() {
  return (
    <div className="site b2-page">
      <div className="b2-intro">
        <p><Link to="/machete/butoane-2">← Butoane 2</Link> · <Link to="/machete/butoane">Butoane 1</Link> · <Link to="/machete/logo">Logo</Link></p>
        <h1>Butoane fără ramă</h1>
        <p className="lead">Se văd că sunt butoane prin fundal, umbră sau relief, nu prin contur. Rama apare cel mult la hover. Navbarul rămâne aerisit: 5 butoane, căutare, limbă, cont. „Termene” e pagina curentă.</p>
      </div>
      <div className="b2-list">
        {VARIANTS.map((v, i) => (
          <section key={v.id} className="b2-v">
            <div className="b2-head"><span>{i + 1}</span><div><h2>{v.name}</h2><p>{v.note}</p></div></div>
            <div className="b2-frame"><small>Normal</small><Bar id={v.id} state="normal" /></div>
            <div className="b2-frame"><small>„Categorii” la hover</small><Bar id={v.id} state="hover" /></div>
          </section>
        ))}
      </div>
    </div>
  );
}
