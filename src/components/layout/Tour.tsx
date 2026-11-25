// Quick spotlight tour of the main navigation. Starts once on first visit; restart from the "?" menu.
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui';

type Step = { target?: string; title: string; body: string };

const STEPS: Step[] = [
  { title: 'Bun venit', body: 'Un tur de un minut prin platformă. Poți ieși oricând cu Esc.' },
  { target: '[data-tour="nav-/pasapoarte"]', title: 'Pașapoarte', body: 'Un pașaport = un model de baterie. Aici creezi, completezi și publici.' },
  { target: '[data-tour="nav-/baterii"]', title: 'Baterii', body: 'Fiecare baterie fizică are serie, QR propriu, status și istoric de valori.' },
  { target: '[data-tour="nav-Date"]', title: 'Date', body: 'Import din Excel sau script, export și backup, documente, etichete de tipărit.' },
  { target: '[data-tour="nav-Operare"]', title: 'Operare', body: 'Telemetrie BMS, acces pentru reciclatori și autorități, statistici, API.' },
  { target: '[data-tour="nav-Conformitate"]', title: 'Conformitate', body: 'Termenele legale și jurnalul complet al modificărilor.' },
  { target: '[data-tour="search"]', title: 'Căutare rapidă', body: 'Ctrl K: găsești orice pașaport, serie de baterie sau pagină.' },
  { target: '[data-tour="notifications"]', title: 'Notificări', body: 'Cereri de acces, alerte de la baterii, termene care se apropie.' },
  { target: '[data-tour="help"]', title: 'Ajutor', body: 'Ghidul pas cu pas și acest tur sunt mereu aici.' },
];

const KEY = 'dpp-tour-done';
export const tourDone = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };
const markDone = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } };

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const nav = useNavigate();
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;

  const measure = useCallback(() => {
    const el = step.target ? document.querySelector(step.target) as HTMLElement | null : null;
    const r = el?.getBoundingClientRect();
    setRect(r && r.width > 0 && r.height > 0 ? r : null); // hidden (e.g. mobile) → centered card
  }, [step.target]);
  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [measure]);

  const finish = useCallback((goGuide = false) => { markDone(); onClose(); if (goGuide) nav('/ghid'); }, [onClose, nav]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' || e.key === 'Enter') setI(x => Math.min(STEPS.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [finish]);

  const pad = 6;
  const W = 300;
  const cardStyle: React.CSSProperties = rect
    ? { top: Math.min(rect.bottom + 14, window.innerHeight - 220), left: Math.max(12, Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 12)), width: W }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: Math.min(360, window.innerWidth - 32) };

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-label="Tur rapid">
      {rect
        ? <div className="tour-hole" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
        : <div className="tour-dim" />}
      <div className="tour-card" style={cardStyle}>
        <div className="row between nowrap-row">
          <span className="faint small num">{i + 1} / {STEPS.length}</span>
          <button className="btn ghost sm icon" aria-label="Închide turul" onClick={() => finish()}><Icon name="x" /></button>
        </div>
        <h3>{step.title}</h3>
        <p className="muted">{step.body}</p>
        <div className="tour-dots" aria-hidden="true">{STEPS.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="row between">
          {i > 0 ? <button className="btn sm" onClick={() => setI(i - 1)}>Înapoi</button> : <button className="btn ghost sm" onClick={() => finish()}>Sari peste</button>}
          {last
            ? <button className="btn primary sm" onClick={() => finish(true)}>Deschide ghidul</button>
            : <button className="btn primary sm" autoFocus onClick={() => setI(i + 1)}>Continuă</button>}
        </div>
      </div>
    </div>, document.body);
}
