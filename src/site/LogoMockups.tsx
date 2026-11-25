// /machete/logo — passport-based logo concepts for DPP4ALL.
// Each icon is drawn on a 48×48 grid: c = main colour, bg = colour of cut-outs, a = accent.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './site.css';
import './logomock.css';

type P = { c: string; bg: string; a: string };
const Book = ({ c, x = 11, y = 5, w = 26, h = 38 }: { c: string; x?: number; y?: number; w?: number; h?: number }) => <rect x={x} y={y} width={w} height={h} rx="4.5" fill={c} />;
const Spine = ({ bg, x = 16, y1 = 5, y2 = 43 }: { bg: string; x?: number; y1?: number; y2?: number }) => <line x1={x} y1={y1 + 3} x2={x} y2={y2 - 3} stroke={bg} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />;
const Qr = ({ x, y, s, f }: { x: number; y: number; s: number; f: string }) => {
  const m = s / 5;
  const cells = [[0, 0], [1, 0], [0, 1], [3, 0], [4, 0], [4, 1], [0, 3], [0, 4], [1, 4], [2, 2], [3, 3], [4, 4], [3, 4], [4, 2]];
  return <g fill={f}>{cells.map(([cx, cy]) => <rect key={`${cx}${cy}`} x={x + cx! * m} y={y + cy! * m} width={m * 0.92} height={m * 0.92} rx={m * 0.18} />)}</g>;
};

const ICONS: { id: string; name: string; idea: string; draw: (p: P) => ReactNode }[] = [
  { id: 'L1', name: 'Copertă cu cod QR', idea: 'Coperta pașaportului, cu un cod QR în locul stemei. Spune direct „pașaport digital”.',
    draw: ({ c, bg }) => <><Book c={c} /><Spine bg={bg} /><Qr x={19} y={15} s={15} f={bg} /><rect x={19} y={34} width={15} height="2.2" rx="1.1" fill={bg} opacity=".7" /></> },
  { id: 'L2', name: 'Copertă cu „4”', idea: 'Stema rotundă de pe copertă conține cifra 4 din nume. Simplu și memorabil.',
    draw: ({ c, bg }) => <><Book c={c} /><Spine bg={bg} /><circle cx="26.5" cy="21" r="8" fill="none" stroke={bg} strokeWidth="2.2" /><text x="26.5" y="25.4" textAnchor="middle" fontSize="12" fontWeight="800" fill={bg} fontFamily="Geist, Inter, sans-serif">4</text><rect x="20" y="33" width="13" height="2.2" rx="1.1" fill={bg} opacity=".75" /></> },
  { id: 'L3', name: 'Pașaport deschis', idea: 'Pașaportul deschis: pagina din stânga cu rânduri de date, cea din dreapta cu codul QR.',
    draw: ({ c, bg, a }) => <><path d="M24 10 C18 7 10 7 5 9 V39 C10 37 18 37 24 40 Z" fill={c} /><path d="M24 10 C30 7 38 7 43 9 V39 C38 37 30 37 24 40 Z" fill={a} /><g stroke={bg} strokeWidth="1.8" strokeLinecap="round" opacity=".8"><line x1="9" y1="17" x2="19" y2="18" /><line x1="9" y1="22" x2="19" y2="23" /><line x1="9" y1="27" x2="16" y2="27.6" /></g><Qr x={28} y={15} s={11} f={bg} /></> },
  { id: 'L4', name: 'Linia citibilă automat', idea: 'Copertă cu stemă mică și cele două rânduri „<<<” de jos, ca în pașaportul real.',
    draw: ({ c, bg }) => <><Book c={c} /><Spine bg={bg} /><circle cx="26.5" cy="17" r="5.5" fill="none" stroke={bg} strokeWidth="2" /><path d="M26.5 11.5 V22.5 M21 17 H32" stroke={bg} strokeWidth="1.4" opacity=".7" /><g fill={bg}>{[0, 1, 2, 3, 4].map(i => <path key={i} d={`M${19.5 + i * 3} 30 l2 1.4 -2 1.4`} fill="none" stroke={bg} strokeWidth="1.3" />)}{[0, 1, 2, 3, 4].map(i => <path key={'b' + i} d={`M${19.5 + i * 3} 35 l2 1.4 -2 1.4`} fill="none" stroke={bg} strokeWidth="1.3" />)}</g></> },
  { id: 'L5', name: 'Pașaport validat', idea: 'Pașaport cu o bifă rotundă în colț: produsul are actele în regulă.',
    draw: ({ c, bg, a }) => <><Book c={c} x={9} w={25} /><Spine bg={bg} x={14} /><rect x={18} y={13} width={11} height={11} rx="2.5" fill="none" stroke={bg} strokeWidth="2" /><rect x={18} y={28} width={11} height="2.2" rx="1.1" fill={bg} opacity=".7" /><circle cx="35" cy="35" r="9" fill={a} stroke={bg} strokeWidth="2.5" /><path d="M30.8 35.2 l2.9 2.9 5.4 -5.8" fill="none" stroke={bg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></> },
  { id: 'L6', name: 'Teanc de pașapoarte', idea: 'Două pașapoarte suprapuse: „pentru toate produsele” (4ALL).',
    draw: ({ c, bg, a }) => <><rect x="16" y="4" width="24" height="35" rx="4.5" fill={a} /><rect x="8" y="9" width="24" height="35" rx="4.5" fill={c} stroke={bg} strokeWidth="1.6" /><Spine bg={bg} x={13} y1={9} y2={44} /><Qr x={16} y={18} s={12} f={bg} /></> },
  { id: 'L7', name: 'Monogramă D', idea: 'Litera D desenată ca un pașaport: cotorul drept la stânga, paginile rotunjite la dreapta.',
    draw: ({ c, bg }) => <><path d="M11 6 H25 C35 6 41 14 41 24 C41 34 35 42 25 42 H11 Z" fill={c} /><line x1="17" y1="10" x2="17" y2="38" stroke={bg} strokeWidth="1.8" strokeLinecap="round" opacity=".6" /><Qr x={22} y={17} s={13} f={bg} /></> },
  { id: 'L8', name: '„4” decupat', idea: 'Copertă plină cu cifra 4 decupată mare. Foarte puternic la dimensiuni mici.',
    draw: ({ c, bg }) => <><Book c={c} /><Spine bg={bg} /><path d="M29.5 12 L19 28.5 H33 M29.5 12 V36" fill="none" stroke={bg} strokeWidth="4.2" strokeLinejoin="round" strokeLinecap="round" /></> },
  { id: 'L9', name: 'Ștampilă', idea: 'Un pașaport în interiorul unei ștampile rotunde, ca viza de intrare.',
    draw: ({ c, bg }) => <><circle cx="24" cy="24" r="20" fill="none" stroke={c} strokeWidth="3" /><circle cx="24" cy="24" r="15.5" fill="none" stroke={c} strokeWidth="1.2" strokeDasharray="2.2 2" /><rect x="17" y="13" width="14" height="22" rx="2.8" fill={c} /><line x1="20" y1="16" x2="20" y2="32" stroke={bg} strokeWidth="1.2" opacity=".6" /><circle cx="25" cy="21" r="3" fill="none" stroke={bg} strokeWidth="1.5" /><rect x="22" y="28" width="6" height="1.6" rx=".8" fill={bg} /></> },
  { id: 'L10', name: 'Cip digital', idea: 'Pe copertă, un cip ca la cardurile bancare: arată clar că e un document digital.',
    draw: ({ c, bg, a }) => <><Book c={c} /><Spine bg={bg} /><rect x="19" y="14" width="15" height="12" rx="2.6" fill={a} /><path d="M19 20 H23.5 M29.5 20 H34 M26.5 14 V17.5 M26.5 22.5 V26 M23.5 17.5 H29.5 V22.5 H23.5 Z" fill="none" stroke={c} strokeWidth="1.3" /><rect x="19" y="32" width="15" height="2.2" rx="1.1" fill={bg} opacity=".75" /></> },
];

const TEAL = '#0e7c86', MINT = '#5eead4', INK = '#0d1b2a';

function Icon({ draw, size, p }: { draw: (p: P) => ReactNode; size: number; p: P }) {
  return <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">{draw(p)}</svg>;
}

export default function LogoMockups() {
  return (
    <div className="site lg-page">
      <div className="lg-intro">
        <p><Link to="/">← Acasă</Link> · <Link to="/machete/butoane">Butoane</Link></p>
        <h1>Logo DPP4ALL — concepte cu pașaport</h1>
        <p className="lead">Zece idei. Fiecare e arătată mare, în bara site-ului, ca iconiță de aplicație și la mărimea de favicon (32 și 16 px), unde se vede dacă rămâne clară.</p>
      </div>
      <div className="lg-grid">
        {ICONS.map(ic => (
          <section key={ic.id} className="lg-card">
            <div className="lg-head"><span>{ic.id}</span><div><h2>{ic.name}</h2><p>{ic.idea}</p></div></div>
            <div className="lg-big"><Icon draw={ic.draw} size={120} p={{ c: TEAL, bg: '#fff', a: MINT }} /></div>
            <div className="lg-bar">
              <Icon draw={ic.draw} size={36} p={{ c: '#fff', bg: TEAL, a: MINT }} />
              <span className="lg-word">DPP<b>4</b>ALL</span>
            </div>
            <div className="lg-row">
              <div className="lg-app"><Icon draw={ic.draw} size={44} p={{ c: '#fff', bg: TEAL, a: MINT }} /></div>
              <div className="lg-app dark"><Icon draw={ic.draw} size={44} p={{ c: MINT, bg: INK, a: '#fff' }} /></div>
              <div className="lg-fav"><Icon draw={ic.draw} size={32} p={{ c: TEAL, bg: '#fff', a: MINT }} /><small>32</small></div>
              <div className="lg-fav"><Icon draw={ic.draw} size={16} p={{ c: TEAL, bg: '#fff', a: MINT }} /><small>16</small></div>
              <div className="lg-lock"><Icon draw={ic.draw} size={28} p={{ c: TEAL, bg: '#fff', a: MINT }} /><span className="lg-word dark">DPP<b>4</b>ALL</span></div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
