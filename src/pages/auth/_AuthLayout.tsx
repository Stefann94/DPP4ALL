import type { ReactNode } from 'react';
import { Icon } from '../../components/ui';
import '../../styles/org.css';

export const LogoMark = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="8" width="23" height="16" rx="3.5" fill="var(--nav-active)" /><rect x="26" y="13" width="3" height="6" rx="1" fill="var(--nav-active)" /><path d="M14 11l-3.5 6h4.5l-2 5 6.5-8h-4.5l2-3z" fill="var(--nav-bg)" /></svg>
);

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <div className="logo"><LogoMark />Pașapoarte Baterii</div>
        <div>
          <h1>Pașaportul bateriei, gata până în februarie 2027.</h1>
          <ul>
            <li><Icon name="check" />Toate câmpurile din Anexa XIII, validate automat</li>
            <li><Icon name="check" />Import din Excel, date direct din BMS</li>
            <li><Icon name="check" />QR GS1 pentru fiecare baterie</li>
          </ul>
        </div>
        <div className="foot">Reg. (UE) 2023/1542 · EN 18223 · GS1 Digital Link</div>
      </aside>
      <main className="auth-form">{children}</main>
    </div>
  );
}
