// Shared UI building blocks. Styling lives in styles/app.css (class names below).
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { TIER_LABEL, type Requirement } from '../../data/catalog';
import type { AccessTier, PassportStatus, UnitStatus } from '../../types';
import { copyText } from '../../lib/download';

export { Icon };

// ── Toasts ───────────────────────────────────────────────
type Toast = { id: number; text: string; kind?: 'bad' };
const ToastCtx = createContext<(text: string, kind?: 'bad') => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind?: 'bad') => {
    const id = Date.now() + Math.random();
    setItems(x => [...x, { id, text, kind }]);
    setTimeout(() => setItems(x => x.filter(t => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">{items.map(t => <div key={t.id} className={'toast' + (t.kind ? ' ' + t.kind : '')}>{t.text}</div>)}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ── Modal / Drawer ───────────────────────────────────────
export function Modal({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={'dialog' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <div className="dialog-head"><h2>{title}</h2><button className="btn ghost icon" onClick={onClose} aria-label="Închide"><Icon name="x" /></button></div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>, document.body);
}
export function Drawer({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(<>
    <div className="drawer-overlay" onClick={onClose} />
    <aside className="drawer" role="dialog" aria-modal="true">
      <div className="dialog-head"><h2>{title}</h2><button className="btn ghost icon" onClick={onClose} aria-label="Închide"><Icon name="x" /></button></div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-foot">{footer}</div>}
    </aside>
  </>, document.body);
}

// ── Dropdown menu ────────────────────────────────────────
export function Menu({ trigger, children, align = 'right' }: { trigger: (open: () => void) => ReactNode; children: ReactNode; align?: 'left' | 'right' }) {
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
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {trigger(() => setOpen(o => !o))}
      {open && <div className="menu" style={{ [align]: 0, top: 'calc(100% + 4px)' }} onClick={() => setOpen(false)}>{children}</div>}
    </div>
  );
}
export function MoreMenu({ children, label = 'Mai multe acțiuni' }: { children: ReactNode; label?: string }) {
  return <Menu trigger={t => <button className="btn ghost icon" aria-label={label} onClick={t}><Icon name="more" /></button>}>{children}</Menu>;
}

// ── Confirm (two-step button; no browser dialogs) ────────
export function ConfirmButton({ onConfirm, children, confirmText = 'Confirmă', className = 'btn danger', disabled }: { onConfirm: () => void; children: ReactNode; confirmText?: string; className?: string; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  return <button className={className + (armed ? ' solid' : '')} disabled={disabled} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>{armed ? confirmText : children}</button>;
}

// ── Badges ───────────────────────────────────────────────
export function TierBadge({ tier }: { tier: AccessTier }) { return <span className={'tier ' + tier}>{TIER_LABEL[tier]}</span>; }
export function StatusBadge({ status }: { status: PassportStatus }) {
  const m = { draft: ['', 'Ciornă'], published: ['ok', 'Publicat'], trashed: ['bad', 'În coș'] } as const;
  return <span className={'badge ' + m[status][0]}><span className="dot" />{m[status][1]}</span>;
}
export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = { original: 'Originală', repurposed: 'Reutilizată în alt scop', 're-used': 'Refolosită', remanufactured: 'Recondiționată', waste: 'Deșeu' };
export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  const cls = { original: 'ok', repurposed: 'accent', 're-used': 'accent', remanufactured: 'warn', waste: 'bad' }[status];
  return <span className={'badge ' + cls}>{UNIT_STATUS_LABEL[status]}</span>;
}
export function RequirementBadge({ req, from }: { req: Requirement; from?: string }) {
  if (req === 'required') return <span className="badge bad">obligatoriu</span>;
  if (req === 'later') return <span className="badge warn">din {from?.split('-').reverse().join('.')}</span>;
  if (req === 'recommended') return <span className="badge accent">recomandat</span>;
  return null;
}

// ── Misc ─────────────────────────────────────────────────
export function Empty({ icon = 'info', title, children, action }: { icon?: IconName | string; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty"><div className="ico"><Icon name={icon} /></div><b>{title}</b>{children && <div>{children}</div>}{action}</div>;
}
export function Callout({ kind = 'info', children, icon }: { kind?: 'info' | 'warn' | 'bad' | 'ok'; children: ReactNode; icon?: IconName | string }) {
  return <div className={'callout ' + kind}><Icon name={icon ?? (kind === 'ok' ? 'check' : kind === 'info' ? 'info' : 'alert')} /><div className="grow">{children}</div></div>;
}
export function Progress({ value, tone }: { value: number; tone?: 'ok' | 'warn' }) {
  return <div className={'progress' + (tone ? ' ' + tone : '')} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}
export function Stat({ label, value, delta, href }: { label: string; value: ReactNode; delta?: ReactNode; href?: string }) {
  const body = <div className="stat"><span className="l">{label}</span><span className="v">{value}</span>{delta && <span className="d">{delta}</span>}</div>;
  return <div className="card">{href ? <a href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{body}</a> : body}</div>;
}
export function PageHead({ title, sub, actions, crumbs }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return <div className="page-head"><div className="titles">{crumbs && <div className="crumbs">{crumbs}</div>}<h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>{actions && <div className="row">{actions}</div>}</div>;
}
export function Field({ label, hint, error, advice, children, wide, htmlFor, extra }: { label: ReactNode; hint?: ReactNode; error?: string | null; advice?: string | null; children: ReactNode; wide?: boolean; htmlFor?: string; extra?: ReactNode }) {
  return <div className={'field' + (wide ? ' wide' : '')}><label htmlFor={htmlFor}>{label}{extra}</label>{children}{error ? <span className="error">{error}</span> : advice ? <span className="advice">{advice}</span> : hint ? <span className="hint">{hint}</span> : null}</div>;
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  const id = useId();
  return <label className="check" htmlFor={id}><span className="switch"><input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span /></span>{label}</label>;
}
export function CopyButton({ text, label = 'Copiază' }: { text: string; label?: string }) {
  const toast = useToast();
  return <button className="btn sm" onClick={async () => toast((await copyText(text)) ? 'Copiat' : 'Nu s-a putut copia. Selectează textul manual.')}><Icon name="copy" />{label}</button>;
}
export function FileDrop({ accept, onFiles, children, multiple }: { accept?: string; onFiles: (f: File[]) => void; children?: ReactNode; multiple?: boolean }) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={'drop' + (over ? ' over' : '')} role="button" tabIndex={0}
      onClick={() => ref.current?.click()} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}>
      <Icon name="upload" />
      {children ?? <><b>Trage fișierul aici</b><span className="small">sau apasă pentru a-l alege</span></>}
      <input ref={ref} type="file" hidden accept={accept} multiple={multiple} onChange={e => { onFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />
    </div>
  );
}
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[] }) {
  return <div className="tabs" role="tablist">{items.map(i => <button key={i.value} role="tab" aria-selected={value === i.value} onClick={() => onChange(i.value)}>{i.label}{i.count !== undefined && <span className="count">{i.count}</span>}</button>)}</div>;
}
export function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return <div className="seg">{items.map(i => <button key={i.value} aria-pressed={value === i.value} onClick={() => onChange(i.value)}>{i.label}</button>)}</div>;
}
