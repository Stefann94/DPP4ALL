// Premium navbar directions (G–L). Each is shown over a slice of its hero so the whole mood reads.
import type { ReactNode } from 'react';
import { Icon } from '../components/ui';
import { CATEGORIES } from '../data/regulations';
import { daysUntil } from '../lib/format';
import './premium.css';

function Mark({ size = 28, a = '#5eead4', b = '#0e7c86', ink = '#06141f' }: { size?: number; a?: string; b?: string; ink?: string }) {
  const id = `g${a.replace('#', '')}${b.replace('#', '')}`;
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={`url(#${id})`} />
      <rect x="7" y="7" width="7" height="7" rx="1.5" fill="none" stroke={ink} strokeWidth="2" />
      <rect x="18" y="7" width="7" height="7" rx="1.5" fill="none" stroke={ink} strokeWidth="2" />
      <rect x="7" y="18" width="7" height="7" rx="1.5" fill="none" stroke={ink} strokeWidth="2" />
      <path d="M18 18h3v3h-3zM22 22h3v3h-3zM22 18h3M18 25h3" stroke={ink} strokeWidth="2" fill="none" />
    </svg>
  );
}

function P({ id, name, mood, pitch, pros, cons, children, mobile, extraH }: { id: string; name: string; mood: string; pitch: string; pros: string[]; cons: string[]; children: ReactNode; mobile: ReactNode; extraH?: number }) {
  return (
    <section className="nv-variant" id={id}>
      <header className="nv-head">
        <div>
          <span className="nv-id">{id} · PREMIUM</span>
          <h2>{name} <span className="nv-tag">{mood}</span></h2>
          <p>{pitch}</p>
        </div>
        <div className="nv-pc">
          <div><b>De ce da</b><ul>{pros.map(x => <li key={x}>{x}</li>)}</ul></div>
          <div><b>De ce nu</b><ul>{cons.map(x => <li key={x}>{x}</li>)}</ul></div>
        </div>
      </header>
      <div className="nv-frame"><div className="nv-label">Desktop · navbar peste hero</div><div className="pm-canvas" style={extraH ? { minHeight: extraH } : undefined}>{children}</div></div>
      <div className="nv-mobiles"><div className="nv-frame"><div className="nv-label">Mobil</div><div className="pm-phone">{mobile}</div></div></div>
    </section>
  );
}

const days = () => daysUntil('2027-02-18');

export function PremiumNavMockups() {
  const d = days();
  return (
    <>
      {/* G — Aurora glass */}
      <P id="G" name="Aurora pe sticlă" mood="tech premium" extraH={560}
        pitch="Hero bleumarin cu lumini aurora turcoaz–albastru și granulație fină. Navbarul e o bandă de sticlă mată cu margine în gradient, iar meniul se deschide tot pe sticlă."
        pros={['Senzație de produs tech scump (Linear, Vercel)', 'Turcoazul brandului strălucește pe fundal închis', 'Meniul cu card de prezentare vinde funcțiile']}
        cons={['Mai greu de citit dacă e prost calibrat', 'Cere grijă la performanță (blur)']}
        mobile={<div className="pm-g m"><div className="pm-g-bar m"><span className="pm-brand"><Mark size={24} /><b>DPP<i>4</i>ALL</b></span><span className="pm-g-cta sm">Începe</span><Icon name="menu" size={20} /></div><div className="pm-g-hero m"><span className="pm-pill"><span className="dot" />Registrul UE e activ</span><h3>Pașaportul digital pentru <em>orice</em> import</h3></div></div>}>
        <div className="pm-g">
          <div className="pm-g-bar">
            <span className="pm-brand"><Mark /><b>DPP<i>4</i>ALL</b></span>
            <nav><a className="on">Produs<Icon name="chevronDown" size={13} /></a><a>Categorii<Icon name="chevronDown" size={13} /></a><a>Termene</a><a>Prețuri</a><a lang="zh">供应商</a></nav>
            <div className="pm-right"><span className="pm-g-lang">RO · EN · 中文</span><a className="pm-g-login">Autentificare</a><a className="pm-g-cta">Începe gratuit <Icon name="arrowRight" size={14} /></a></div>
          </div>
          <div className="pm-g-mega">
            <div className="col">
              <small>Platformă</small>
              {[['users', 'Portal furnizori', 'Fabrica completează în chineză'], ['sparkle', 'Extragere din documente', 'Rapoarte de test → câmpuri'], ['shield', 'Registru UE și vamă', 'ID de înregistrare pe lot'], ['lock', 'Acces pe niveluri', 'Reparatori, reciclatori, autorități']].map(([i, t, s]) => <a key={t}><span className="ic"><Icon name={i} /></span><span><b>{t}</b><em>{s}</em></span></a>)}
            </div>
            <div className="feat">
              <div className="feat-art"><div className="feat-qr" /><div className="feat-card"><b>Baterie e-bike 48V</b><span>Pașaport per bucată · SN-000187</span><i /></div></div>
              <b>Vezi un pașaport live</b><span>Scanează ca un consumator, un reparator sau o autoritate.</span>
            </div>
          </div>
          <div className="pm-g-hero">
            <span className="pm-pill"><span className="dot" />Registrul UE e activ · Baterii în {d} de zile</span>
            <h3>Pașaportul digital pentru <em>orice produs</em> pe care îl importați</h3>
          </div>
        </div>
      </P>

      {/* H — Midnight & champagne */}
      <P id="H" name="Bleumarin și auriu" mood="instituțional de lux"
        pitch="Bleumarin adânc cu linii fine aurii și titluri serif elegante. Aspectul unei bănci private sau al unei case de avocatură, potrivit pentru conformitate."
        pros={['Transmite seriozitate și încredere juridică', 'Se distinge clar de toate SaaS-urile DPP', 'Serif + aur = premium clasic']}
        cons={['Poate părea mai puțin „tech”', 'Aurul trebuie folosit cu măsură']}
        mobile={<div className="pm-h m"><div className="pm-h-bar m"><span className="pm-h-brand">DPP<span>4</span>ALL</span><Icon name="menu" size={20} /></div><div className="pm-h-hero m"><span className="pm-h-eyebrow">Conformitate UE · Importatori</span><h3>Pașaportul fiecărui produs, în ordine.</h3></div></div>}>
        <div className="pm-h">
          <div className="pm-h-util"><span>Reg. (UE) 2023/1542 · Pașaportul bateriei: 18.02.2027</span><span className="sp" /><span>RO</span><span>EN</span><span lang="zh">中文</span><span className="sep" /><span>Autentificare</span></div>
          <div className="pm-h-bar">
            <span className="pm-h-brand">DPP<span>4</span>ALL</span>
            <nav>{['Platforma', 'Categorii', 'Importatori', 'Termene', 'Tarife'].map((t, i) => <a key={t} className={i === 0 ? 'on' : ''}>{t}</a>)}</nav>
            <a className="pm-h-cta">Solicită acces <Icon name="arrowRight" size={14} /></a>
          </div>
          <div className="pm-h-hero">
            <span className="pm-h-eyebrow">Conformitate UE pentru importatori</span>
            <h3>Pașaportul fiecărui produs,<br /><em>în ordine și la timp.</em></h3>
            <div className="pm-h-stats"><div><b>12</b><span>categorii acoperite</span></div><div><b>{d}</b><span>zile până la termenul bateriilor</span></div><div><b>RO</b><span>date găzduite în UE</span></div></div>
          </div>
        </div>
      </P>

      {/* I — Command bar */}
      <P id="I" name="Bară de comandă" mood="tech pentru specialiști"
        pitch="Grafit închis cu margini fine în gradient. Are un comutator de produs (Importatori · Furnizori · Parteneri), căutare cu Ctrl K și o pastilă cu noutăți."
        pros={['Arată ca un instrument profesional serios', 'Comutatorul de audiență scurtează drumul', 'Căutarea cu tastatura e un plus pentru utilizatorii avansați']}
        cons={['Rece pentru un IMM fără profil tehnic', 'Mai multe elemente de explicat']}
        mobile={<div className="pm-i m"><div className="pm-i-bar m"><span className="pm-brand"><Mark size={22} /><b>DPP<i>4</i>ALL</b></span><span className="pm-i-k">⌘K</span><Icon name="menu" size={20} /></div></div>}>
        <div className="pm-i">
          <div className="pm-i-bar">
            <span className="pm-brand"><Mark /><b>DPP<i>4</i>ALL</b></span>
            <div className="pm-i-switch"><a className="on">Importatori</a><a>Furnizori 供应商</a><a>Parteneri</a></div>
            <nav><a>Produs</a><a>Categorii</a><a>Docs</a><a>Prețuri</a></nav>
            <div className="pm-right"><span className="pm-i-search"><Icon name="search" size={14} />Cod NC…<kbd>Ctrl K</kbd></span><a className="pm-i-login">Intră</a><a className="pm-i-cta">Începe</a></div>
          </div>
          <div className="pm-i-hero">
            <span className="pm-i-news"><b>Nou</b>Înregistrare în registrul UE din aplicație<Icon name="arrowRight" size={13} /></span>
            <h3>Pașapoarte digitale, de la fabrică la vamă.</h3>
            <div className="pm-i-code"><span>$</span> dpp import produse.xlsx <em>--categorie baterii</em><br /><span>✓</span> 248 de produse · 0 erori · gata de publicare</div>
          </div>
        </div>
      </P>

      {/* J — Gradient wave */}
      <P id="J" name="Val de culoare" mood="SaaS premium luminos" extraH={520}
        pitch="Navbar alb, aerisit, peste un val de gradient animat (turcoaz, albastru, violet), în stilul Stripe. Mega-meniul are coloane și o previzualizare ilustrată."
        pros={['Premium, dar luminos (păstrează tema deschisă)', 'Foarte vizual, memorabil', 'Mega-meniul arată maturitate']}
        cons={['Gradientul trebuie făcut cu gust', 'Animația cere atenție pe mobil']}
        mobile={<div className="pm-j m"><div className="pm-j-wave" /><div className="pm-j-bar m"><span className="pm-brand dark"><Mark size={22} a="#0e7c86" b="#3b5bdb" ink="#fff" /><b>DPP<i>4</i>ALL</b></span><Icon name="menu" size={20} /></div><div className="pm-j-hero m"><h3>Pașaportul digital pentru fiecare import</h3></div></div>}>
        <div className="pm-j">
          <div className="pm-j-wave" />
          <div className="pm-j-bar">
            <span className="pm-brand dark"><Mark a="#0e7c86" b="#3b5bdb" ink="#fff" /><b>DPP<i>4</i>ALL</b></span>
            <nav><a>Produs</a><a className="on">Categorii</a><a>Resurse</a><a>Prețuri</a></nav>
            <div className="pm-right"><a className="pm-j-login">Autentificare <Icon name="chevronRight" size={13} /></a><a className="pm-j-cta">Începe gratuit</a></div>
          </div>
          <div className="pm-j-mega">
            <div className="cols">
              <div><small>Obligatoriu în curând</small>{CATEGORIES.filter(c => ['baterii', 'gpsr', 'ambalaje', 'masini'].includes(c.id)).map(c => <a key={c.id}><Icon name={c.icon} size={16} /><span>{c.name}<em>{c.badge}</em></span></a>)}</div>
              <div><small>Legi adoptate</small>{CATEGORIES.filter(c => ['jucarii', 'detergenti', 'constructii'].includes(c.id)).map(c => <a key={c.id}><Icon name={c.icon} size={16} /><span>{c.name}<em>{c.badge}</em></span></a>)}</div>
              <div><small>În pregătire</small>{CATEGORIES.filter(c => ['electronice', 'textile', 'mobilier', 'anvelope', 'otel'].includes(c.id)).map(c => <a key={c.id}><Icon name={c.icon} size={16} /><span>{c.name}<em>{c.badge}</em></span></a>)}</div>
            </div>
            <div className="prev"><div className="prev-art"><span /><span /><span /></div><b>Calendarul complet</b><em>Toate termenele, cu sursa oficială</em></div>
          </div>
          <div className="pm-j-hero"><h3>Pașaportul digital pentru<br />fiecare produs importat</h3></div>
        </div>
      </P>

      {/* K — Live status */}
      <P id="K" name="Stare în timp real" mood="platformă vie"
        pitch="Sub navbar rulează o bandă cu starea registrului UE, termenele și activitatea platformei. Logo-ul are un punct verde care „respiră”, semn că platforma e activă."
        pros={['Arată că platforma e vie și urmărește legislația', 'Termenele sunt mereu la vedere, fără panică', 'Original în piața DPP']}
        cons={['Cifrele trebuie să fie reale (nu inventate)', 'Încă o bandă pe verticală']}
        mobile={<div className="pm-k m"><div className="pm-k-bar m"><span className="pm-brand"><Mark size={22} /><b>DPP<i>4</i>ALL</b><span className="live" /></span><Icon name="menu" size={20} /></div><div className="pm-k-tick m"><span><i className="ok" />Registrul UE: activ</span><span><i className="warn" />Baterii: {d} zile</span></div></div>}>
        <div className="pm-k">
          <div className="pm-k-bar">
            <span className="pm-brand"><Mark /><b>DPP<i>4</i>ALL</b><span className="live" title="Platformă activă" /></span>
            <nav><a>Produs<Icon name="chevronDown" size={13} /></a><a>Categorii<Icon name="chevronDown" size={13} /></a><a>Termene</a><a>Prețuri</a><a lang="zh">供应商</a></nav>
            <div className="pm-right"><a className="pm-k-login">Autentificare</a><a className="pm-k-cta">Începe gratuit</a></div>
          </div>
          <div className="pm-k-tick">
            <div className="track">
              <span><i className="ok" />Registrul UE al pașapoartelor: activ din 20.07.2026</span>
              <span><i className="warn" />Baterii: pașaport obligatoriu în {d} de zile</span>
              <span><i className="info" />Catalog actualizat: 25.11.2026</span>
              <span><i className="info" />Jucării: lege adoptată · 01.08.2030</span>
              <span><i className="dash" />Textile: act delegat așteptat ~2027</span>
            </div>
          </div>
          <div className="pm-k-hero"><h3>Toate termenele DPP,<br />urmărite pentru voi.</h3></div>
        </div>
      </P>

      {/* L — Editorial fullscreen */}
      <P id="L" name="Editorial, meniu pe tot ecranul" mood="agenție de brand" extraH={600}
        pitch="Navbar minimal (logo mare, „Meniu” și buton). La apăsare se deschide un meniu pe tot ecranul, cu titluri serif mari numerotate și termenul următor în colț."
        pros={['Foarte premium, ca brandurile de design', 'Lasă tot spațiul pentru hero', 'Tipografie memorabilă']}
        cons={['Navigarea cere un click în plus', 'Mai puțin potrivit pentru utilizatori grăbiți']}
        mobile={<div className="pm-l m"><div className="pm-l-menu m"><div className="pm-l-top"><span className="pm-l-brand">DPP4ALL</span><span className="pm-l-close">Închide ✕</span></div>{['Produs', 'Categorii', 'Termene', 'Prețuri'].map((t, i) => <a key={t}><small>0{i + 1}</small>{t}</a>)}</div></div>}>
        <div className="pm-l">
          <div className="pm-l-bar"><span className="pm-l-brand">DPP<span>4</span>ALL</span><span className="sp" /><span className="pm-l-lang">RO / EN / 中文</span><a className="pm-l-cta">Începe gratuit</a><span className="pm-l-burger">Meniu <i /><i /></span></div>
          <div className="pm-l-menu">
            <div className="list">
              {[['Platforma', 'Portal furnizori, registru, acces'], ['Categorii', '12 categorii, un singur loc'], ['Termene', 'Calendarul legal, cu surse'], ['Prețuri', 'Publice, fără apel de vânzări'], ['Furnizori', '供应商门户']].map(([t, s], i) => <a key={t} className={i === 1 ? 'on' : ''}><small>0{i + 1}</small><span>{t}</span><em>{s}</em></a>)}
            </div>
            <aside><small>Următorul termen</small><b>18.02.2027</b><span>Pașaportul bateriei devine obligatoriu.</span><em>{d} de zile</em><hr /><small>Contact</small><span>contact@dpp4all.eu</span></aside>
          </div>
        </div>
      </P>
    </>
  );
}
