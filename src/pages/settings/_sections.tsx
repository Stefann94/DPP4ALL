// Settings sections. Each section edits a local draft and saves with one button (one audit entry per save).
import { useState } from 'react';
import { useDB, resetDemo, clearAll } from '../../api/store';
import { org as orgActions, team } from '../../api/actions';
import { FIELDS } from '../../data/catalog';
import { FieldInput } from '../../components/FieldInput';
import { Callout, ConfirmButton, CopyButton, Empty, Field, Icon, Modal, Progress, Switch, useToast } from '../../components/ui';
import { readAsDataUrl } from '../../lib/download';
import { fmtDate, fmtRelative, initials } from '../../lib/format';
import { LANG, PLAN_LIMITS, updateProfile } from '../_org';
import type { OrgSettings, Role } from '../../types';

function SaveBar({ dirty, onSave, onReset }: { dirty: boolean; onSave: () => void; onReset: () => void }) {
  return <div className="row end"><button className="btn" disabled={!dirty} onClick={onReset}>Renunță</button><button className="btn primary" disabled={!dirty} onClick={onSave}>Salvează</button></div>;
}
function useDraft<T>(initial: T) {
  const [d, setD] = useState<T>(initial);
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  return { d, setD, dirty, reset: () => setD(initial) };
}

export function OrgSection() {
  const o = useDB(d => d.org);
  const toast = useToast();
  const { d, setD, dirty, reset } = useDraft({ name: o.name, slug: o.slug, gln: o.gln ?? '' });
  const glnOk = !d.gln || /^\d{13}$/.test(d.gln);
  return (
    <section className="card stack lg">
      <div className="form-grid">
        <Field label="Nume organizație" htmlFor="s-name"><input id="s-name" className="input" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></Field>
        <Field label="Adresă spațiu de lucru" htmlFor="s-slug" hint="Litere mici, cifre și cratimă"><input id="s-slug" className="input mono" value={d.slug} onChange={e => setD({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></Field>
        <Field label="GLN (identificator operator)" htmlFor="s-gln" error={glnOk ? null : '13 cifre.'} hint="Apare ca economicOperatorId în JSON EN 18223"><input id="s-gln" className="input mono" inputMode="numeric" value={d.gln} onChange={e => setD({ ...d, gln: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>
      <SaveBar dirty={dirty && glnOk && !!d.name.trim()} onReset={reset} onSave={() => { orgActions.update({ name: d.name.trim(), slug: d.slug, gln: d.gln || undefined }); toast('Salvat'); }} />
    </section>
  );
}

const MF_KEYS = new Set(['manufacturer_name', 'manufacturer_address', 'manufacturer_country', 'manufacturer_email', 'manufacturer_website', 'eori_number', 'eu_responsible_person', 'placed_on_market_by', 'eu_importer']);
export function ManufacturerSection() {
  const o = useDB(d => d.org);
  const toast = useToast();
  const { d, setD, dirty, reset } = useDraft<Record<string, string>>({ ...o.manufacturer });
  const fields = FIELDS.filter(f => f.section === 'operator' && MF_KEYS.has(f.name));
  return (
    <section className="card stack lg">
      <p className="muted small">Se completează automat în fiecare pașaport nou. Le poți schimba pe pașaport.</p>
      <div className="form-grid">
        {fields.map(f => <FieldInput key={f.name} field={f} value={d[f.name]} idPrefix="mf-" onChange={v => { const n = { ...d }; if (v == null || v === '') delete n[f.name]; else n[f.name] = String(v); setD(n); }} />)}
      </div>
      <SaveBar dirty={dirty} onReset={reset} onSave={() => { orgActions.update({ manufacturer: d }); toast('Date producător salvate'); }} />
    </section>
  );
}

export function BrandSection() {
  const o = useDB(d => d.org);
  const toast = useToast();
  const { d, setD, dirty, reset } = useDraft(o.brand);
  const [err, setErr] = useState('');
  return (
    <div className="grid-2">
      <section className="card stack lg">
        <div className="field"><span className="label">Logo</span>
          <div className="row">
            {d.logoDataUrl ? <img src={d.logoDataUrl} alt="Logo" style={{ height: 44, maxWidth: 160, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: 4, border: '1px solid var(--line)' }} /> : <span className="faint small">Fără logo</span>}
            <label className="btn sm"><Icon name="upload" />Încarcă<input type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={async e => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (!f) return;
              if (f.size > 1_000_000) { setErr('Maxim 1 MB.'); return; }
              setErr(''); setD({ ...d, logoDataUrl: await readAsDataUrl(f) });
            }} /></label>
            {d.logoDataUrl && <button className="btn sm ghost" onClick={() => setD({ ...d, logoDataUrl: undefined })}>Elimină</button>}
          </div>
          {err && <span className="error">{err}</span>}
        </div>
        <div className="grid-2">
          <Field label="Culoare principală" htmlFor="b-p"><div className="row nowrap-row"><input id="b-p" type="color" value={d.primary} onChange={e => setD({ ...d, primary: e.target.value })} style={{ width: 44, height: 34, border: 0, background: 'none', padding: 0 }} /><span className="mono">{d.primary}</span></div></Field>
          <Field label="Culoare accent" htmlFor="b-a"><div className="row nowrap-row"><input id="b-a" type="color" value={d.accent} onChange={e => setD({ ...d, accent: e.target.value })} style={{ width: 44, height: 34, border: 0, background: 'none', padding: 0 }} /><span className="mono">{d.accent}</span></div></Field>
        </div>
        <Switch checked={d.showPoweredBy} onChange={v => setD({ ...d, showPoweredBy: v })} label="Arată „Realizat cu Platforma DPP” pe pagina publică" />
        <SaveBar dirty={dirty} onReset={reset} onSave={() => { orgActions.update({ brand: d }); toast('Brand salvat'); }} />
      </section>
      <section className="stack">
        <span className="section-title">Previzualizare pagină publică</span>
        <div className="brand-preview">
          <div className="bar" style={{ background: d.primary }}>{d.logoDataUrl ? <img src={d.logoDataUrl} alt="" /> : <Icon name="battery" />}{o.name}</div>
          <div className="body">
            <b style={{ fontFamily: 'var(--fh)', fontSize: 18 }}>Voltaria HomeCell 10</b>
            <span className="small muted">Stocare staționară · 10,24 kWh · LFP</span>
            <span style={{ display: 'inline-block', alignSelf: 'start', justifySelf: 'start', padding: '2px 10px', borderRadius: 99, background: d.accent, color: '#fff', fontSize: 12, fontWeight: 600 }}>Original</span>
            {d.showPoweredBy && <span className="small faint">Realizat cu Platforma DPP</span>}
          </div>
        </div>
      </section>
    </div>
  );
}

export function LanguagesSection() {
  const o = useDB(d => d.org);
  const toast = useToast();
  const { d, setD, dirty, reset } = useDraft({ languages: o.languages, defaultLanguage: o.defaultLanguage });
  return (
    <section className="card stack lg">
      <div className="field"><span className="label">Limbi pe pagina publică</span>
        <div className="chips">{Object.entries(LANG).map(([k, v]) => (
          <label key={k} className="chip"><input type="checkbox" checked={d.languages.includes(k)} disabled={k === d.defaultLanguage}
            onChange={e => setD({ ...d, languages: e.target.checked ? [...d.languages, k] : d.languages.filter(x => x !== k) })} />{v}</label>))}</div>
        <span className="hint">Cel care scanează vede pagina în limba telefonului, dacă e în listă.</span></div>
      <Field label="Limba implicită" htmlFor="l-def"><select id="l-def" className="select" style={{ maxWidth: 240 }} value={d.defaultLanguage} onChange={e => setD({ languages: [...new Set([...d.languages, e.target.value])], defaultLanguage: e.target.value })}>
        {Object.entries(LANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <SaveBar dirty={dirty} onReset={reset} onSave={() => { orgActions.update(d); toast('Limbi salvate'); }} />
    </section>
  );
}

export function DomainSection() {
  const o = useDB(d => d.org);
  const toast = useToast();
  const [resolver, setResolver] = useState(o.resolver);
  const [host, setHost] = useState(o.customDomain.status === 'none' ? '' : o.customDomain.host);
  const cd = o.customDomain;
  const resolverOk = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(resolver.replace(/\/+$/, ''));
  const hostOk = /^[a-z0-9-]+(\.[a-z0-9-]+){2,}$/i.test(host);
  const STATUS: Record<OrgSettings['customDomain']['status'], [string, string]> = {
    none: ['', 'Neconfigurat'], waiting_dns: ['warn', 'Așteaptă DNS'], verified: ['accent', 'DNS verificat'], live: ['ok', 'Activ'], error: ['bad', 'Necesită atenție'],
  };
  const setCd = (patch: Partial<OrgSettings['customDomain']>) => orgActions.update({ customDomain: { ...cd, ...patch } });
  const check = () => {
    const next = cd.status === 'waiting_dns' ? 'verified' : cd.status === 'verified' ? 'live' : cd.status;
    setCd({ status: next, checkedAt: new Date().toISOString() });
    if (next === 'live') orgActions.update({ resolver: `https://${cd.host}` });
    toast(next === 'live' ? 'Domeniul e activ' : next === 'verified' ? 'DNS verificat. Se emite certificatul.' : 'Verificat');
  };
  return (
    <div className="stack lg">
      <section className="card stack lg">
        <Field label="Adresa din codurile QR" htmlFor="d-res" error={resolver && !resolverOk ? 'Adresă https:// fără cale, ex. https://dpp.firma.ro' : null}>
          <input id="d-res" className="input mono" value={resolver} onChange={e => setResolver(e.target.value.trim())} />
        </Field>
        <div className="callout info"><Icon name="qr" /><span className="mono small">{resolver.replace(/\/+$/, '')}/01/05949876543219/21/HC10-2609-000187</span></div>
        <div className="row end"><button className="btn primary" disabled={!resolverOk || resolver === o.resolver} onClick={() => { orgActions.update({ resolver: resolver.replace(/\/+$/, '') }); toast('Salvat'); }}>Salvează</button></div>
      </section>

      <section className="card stack lg">
        <div className="row between"><h3>Domeniu propriu</h3><span className={'badge ' + STATUS[cd.status][0]}>{STATUS[cd.status][1]}</span></div>
        {cd.status === 'none' ? (
          <div className="row nowrap-row">
            <input className="input mono" aria-label="Subdomeniu" placeholder="dpp.firma.ro" value={host} onChange={e => setHost(e.target.value.trim().toLowerCase())} />
            <button className="btn primary" disabled={!hostOk} onClick={() => setCd({ host, status: 'waiting_dns', cname: 'resolver.dpp-platform.example', txt: `_dpp-verify.${host}` })}>Adaugă</button>
          </div>
        ) : <>
          <div className="dns">
            <span className="h">Tip</span><span className="h">Nume</span><span className="h">Valoare</span><span />
            <span className="mono">CNAME</span><span className="mono ellipsis">{cd.host}</span><span className="mono ellipsis">{cd.cname}</span><CopyButton text={cd.cname} label="" />
            <span className="mono">TXT</span><span className="mono ellipsis">{cd.txt}</span><span className="mono ellipsis">dpp-verify={o.slug}</span><CopyButton text={`dpp-verify=${o.slug}`} label="" />
          </div>
          <div className="row between">
            <span className="small muted">{cd.checkedAt ? `Ultima verificare ${fmtRelative(cd.checkedAt)}` : 'Neverificat'}</span>
            <div className="row">
              <ConfirmButton onConfirm={() => { setCd({ status: 'none', host: '', checkedAt: undefined }); setHost(''); toast('Domeniu eliminat'); }} confirmText="Codurile tipărite nu vor mai funcționa. Confirmă">Elimină</ConfirmButton>
              {cd.status !== 'live' && <button className="btn primary" onClick={check}><Icon name="refresh" />Verifică DNS</button>}
            </div>
          </div>
          <Callout kind="warn">Codurile QR tipărite cu acest domeniu funcționează cât timp domeniul rămâne înregistrat și legat. Pașaportul trebuie să rămână accesibil până la reciclarea bateriei.</Callout>
        </>}
      </section>
    </div>
  );
}

const ROLE_RO: Record<Role, string> = { owner: 'Proprietar', admin: 'Administrator', editor: 'Editor', viewer: 'Vizualizare' };
const MATRIX: [string, boolean[]][] = [
  ['Vede pașapoarte și setări', [true, true, true, true]],
  ['Creează, editează, importă', [false, true, true, true]],
  ['Publică și retrage', [false, true, true, true]],
  ['Înregistrează valori baterii', [false, true, true, true]],
  ['Aprobă cereri de acces', [false, false, true, true]],
  ['Chei API și webhook-uri', [false, false, true, true]],
  ['Echipă, brand, domeniu', [false, false, true, true]],
  ['Facturare', [false, false, true, true]],
  ['Șterge definitiv', [false, false, true, true]],
];

export function TeamSection() {
  const members = useDB(d => d.members);
  const invites = useDB(d => d.invites);
  const session = useDB(d => d.session);
  const plan = useDB(d => d.org.plan);
  const [inviting, setInviting] = useState(false);
  const toast = useToast();
  const seats = PLAN_LIMITS[plan]!.seats;
  const used = members.length + invites.length;
  return (
    <div className="stack lg">
      <div className="row between"><span className="small muted">{used} din {seats === Infinity ? 'nelimitat' : seats} locuri folosite</span>
        <button className="btn primary" disabled={used >= seats} onClick={() => setInviting(true)}><Icon name="plus" />Invită</button></div>
      <section className="card flush"><div className="table-wrap"><table className="table">
        <thead><tr><th>Membru</th><th>Rol</th><th>Activ</th><th className="shrink" /></tr></thead>
        <tbody>{members.map(m => (
          <tr key={m.id}>
            <td><div className="row nowrap-row"><span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(m.name)}</span><span><b>{m.name}</b>{m.id === session?.userId && <span className="faint small"> (tu)</span>}<div className="small muted">{m.email}</div></span></div></td>
            <td>{m.role === 'owner' ? <span className="badge accent">{ROLE_RO.owner}</span> :
              <select className="select" style={{ width: 'auto' }} aria-label={`Rol ${m.name}`} value={m.role} disabled={m.id === session?.userId} onChange={e => { team.setRole(m.id, e.target.value as Role); toast('Rol actualizat'); }}>
                {(['admin', 'editor', 'viewer'] as Role[]).map(r => <option key={r} value={r}>{ROLE_RO[r]}</option>)}</select>}</td>
            <td className="small muted nowrap">{m.lastActiveAt ? fmtRelative(m.lastActiveAt) : '—'}</td>
            <td>{m.role !== 'owner' && m.id !== session?.userId && <ConfirmButton className="btn sm danger" onConfirm={() => { team.remove(m.id); toast('Membru eliminat'); }}>Elimină</ConfirmButton>}</td>
          </tr>))}
        </tbody></table></div></section>

      {invites.length > 0 && <section className="card stack">
        <h3>Invitații în așteptare</h3>
        {invites.map(i => (
          <div key={i.id} className="row between">
            <span><b>{i.email}</b> <span className="badge">{ROLE_RO[i.role]}</span> <span className="small faint">expiră {fmtDate(i.expiresAt)}</span></span>
            <div className="row"><CopyButton text={`${location.origin}/inregistrare?invite=${i.id}`} label="Link" /><button className="btn sm ghost" onClick={() => team.cancelInvite(i.id)}>Anulează</button></div>
          </div>))}
      </section>}

      <section className="card flush">
        <div className="card-head" style={{ padding: '14px 14px 0' }}><h3>Ce poate face fiecare rol</h3></div>
        <div className="table-wrap"><table className="table matrix">
          <thead><tr><th /><th>Vizualizare</th><th>Editor</th><th>Administrator</th><th>Proprietar</th></tr></thead>
          <tbody>{MATRIX.map(([label, v]) => <tr key={label}><td>{label}</td>{v.map((y, i) => <td key={i} className={y ? 'y' : 'n'}>{y ? <Icon name="check" size={16} /> : '—'}</td>)}</tr>)}</tbody>
        </table></div>
      </section>
      {inviting && <InviteModal onClose={() => setInviting(false)} />}
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<Role, 'owner'>>('editor');
  const members = useDB(d => d.members);
  const toast = useToast();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const exists = members.some(m => m.email.toLowerCase() === email.toLowerCase());
  return (
    <Modal title="Invită în echipă" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Anulează</button><button className="btn primary" disabled={!valid || exists} onClick={() => { team.invite(email.trim(), role); toast('Invitație trimisă'); onClose(); }}>Trimite invitația</button></>}>
      <Field label="E-mail" htmlFor="iv-email" error={exists ? 'E deja în echipă.' : null}><input id="iv-email" className="input" type="email" autoFocus value={email} onChange={e => setEmail(e.target.value.trim())} /></Field>
      <div className="field"><span className="label">Rol</span>
        <div className="seg">{(['viewer', 'editor', 'admin'] as const).map(r => <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>{ROLE_RO[r]}</button>)}</div></div>
      <p className="small muted">Invitația e valabilă 7 zile.</p>
    </Modal>
  );
}

export function BillingSection() {
  const o = useDB(d => d.org);
  const passports = useDB(d => d.passports);
  const units = useDB(d => d.units);
  const members = useDB(d => d.members);
  const invites = useDB(d => d.invites);
  const docs = useDB(d => d.documents);
  const toast = useToast();
  const lim = PLAN_LIMITS[o.plan]!;
  const yearStart = new Date(); yearStart.setMonth(0, 1); yearStart.setHours(0, 0, 0, 0);
  const meters: [string, number, number][] = [
    ['Pașapoarte publicate', passports.filter(p => p.status === 'published').length, lim.passports],
    ['Baterii anul acesta', units.filter(u => new Date(u.createdAt) >= yearStart).length, lim.units],
    ['Membri', members.length + invites.length, lim.seats],
    ['Documente', docs.length, lim.documents],
  ];
  return (
    <div className="stack lg">
      <section className="card stack lg">
        <div className="row between"><div><span className="small muted">Plan curent</span><h2>{lim.label}{o.trialEndsAt && new Date(o.trialEndsAt) > new Date() ? <span className="badge warn" style={{ marginLeft: 8 }}>Perioadă de probă până la {fmtDate(o.trialEndsAt)}</span> : null}</h2></div><span className="price" style={{ fontFamily: 'var(--fh)', fontSize: 22, fontWeight: 600 }}>{lim.price}<span className="small muted"> / lună</span></span></div>
        <div className="grid-4">
          {meters.map(([l, n, max]) => {
            const pct = max === Infinity ? 0 : Math.round((n / max) * 100);
            return <div key={l} className="stack sm"><span className="small muted">{l}</span><span className="num"><b>{n.toLocaleString('ro-RO')}</b> <span className="faint">/ {max === Infinity ? '∞' : max.toLocaleString('ro-RO')}</span></span><Progress value={pct} tone={pct >= 90 ? 'warn' : undefined} /></div>;
          })}
        </div>
      </section>
      <div className="grid-4">
        {Object.entries(PLAN_LIMITS).map(([k, p]) => (
          <div key={k} className={'plan-card' + (k === o.plan ? ' current' : '')}>
            <b>{p.label}</b><span className="price">{p.price}<span className="small muted" style={{ fontFamily: 'var(--f)' }}> / lună</span></span>
            <span className="small muted">{p.passports.toLocaleString('ro-RO')} pașapoarte · {p.units.toLocaleString('ro-RO')} baterii/an · {p.seats === Infinity ? 'membri nelimitați' : `${p.seats} membri`}</span>
            <ul>{p.features.map(f => <li key={f}>{f}</li>)}</ul>
            {k === o.plan ? <span className="badge accent" style={{ justifySelf: 'start' }}>Planul tău</span>
              : <button className="btn sm" onClick={() => { orgActions.update({ plan: k as OrgSettings['plan'], trialEndsAt: null }); toast(`Plan schimbat: ${p.label}`); }}>Alege {p.label}</button>}
          </div>))}
      </div>
      <p className="small faint">Facturare anuală. Prețurile nu includ TVA.</p>
    </div>
  );
}

export function NotificationsSection() {
  const o = useDB(d => d.org);
  const toast = useToast();
  const { d, setD, dirty, reset } = useDraft(o.notifications);
  const items: [keyof typeof d, string][] = [['deadlines', 'Termene legale apropiate'], ['alerts', 'Alerte din telemetria BMS'], ['accessRequests', 'Cereri noi de acces'], ['weeklyDigest', 'Rezumat săptămânal']];
  return (
    <section className="card stack lg">
      <div className="stack">{items.map(([k, l]) => <Switch key={k} checked={d[k] as boolean} onChange={v => setD({ ...d, [k]: v })} label={l} />)}</div>
      <Field label="Trimite pe e-mail la" htmlFor="n-email"><input id="n-email" className="input" type="email" style={{ maxWidth: 340 }} value={d.email} onChange={e => setD({ ...d, email: e.target.value })} /></Field>
      <SaveBar dirty={dirty} onReset={reset} onSave={() => { orgActions.update({ notifications: d }); toast('Salvat'); }} />
    </section>
  );
}

export function ProfileSection() {
  const s = useDB(d => d.session);
  const toast = useToast();
  const { d, setD, dirty, reset } = useDraft({ name: s?.name ?? '', email: s?.email ?? '' });
  const ok = d.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email);
  return (
    <section className="card stack lg">
      <div className="form-grid">
        <Field label="Nume" htmlFor="p-name"><input id="p-name" className="input" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></Field>
        <Field label="E-mail" htmlFor="p-email"><input id="p-email" className="input" type="email" value={d.email} onChange={e => setD({ ...d, email: e.target.value })} /></Field>
      </div>
      <span className="small muted">Rol: {s ? ROLE_RO[s.role] : '—'}</span>
      <SaveBar dirty={dirty && !!ok} onReset={reset} onSave={() => { updateProfile(d.name.trim(), d.email.trim()); toast('Profil salvat'); }} />
    </section>
  );
}

export function DemoSection() {
  const toast = useToast();
  return (
    <div className="stack lg">
      <section className="card row between">
        <div className="stack sm"><h3>Resetează datele demo</h3><span className="small muted">Readuce pașapoartele, bateriile și statisticile de exemplu.</span></div>
        <ConfirmButton className="btn" onConfirm={() => { resetDemo(); toast('Date demo restaurate'); }} confirmText="Confirmă resetarea">Resetează</ConfirmButton>
      </section>
      <section className="card row between">
        <div className="stack sm"><h3>Golește tot</h3><span className="small muted">Șterge pașapoartele, bateriile, documentele și jurnalele. Setările rămân.</span></div>
        <ConfirmButton onConfirm={() => { clearAll(); toast('Date șterse'); }} confirmText="Șterge definitiv">Golește</ConfirmButton>
      </section>
      <p className="small faint">Datele sunt salvate doar în acest browser până la conectarea serverului.</p>
    </div>
  );
}

export { Empty };
