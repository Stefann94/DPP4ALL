import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDB } from '../../api/store';
import { access } from '../../api/actions';
import { Field, Icon } from '../../components/ui';
import { KIND_LABEL } from '../_org';
import type { AccessRequest } from '../../types';
import '../../styles/org.css';

export default function AccessRequestForm() {
  const [params] = useSearchParams();
  const o = useDB(d => d.org);
  const passports = useDB(d => d.passports);
  const pre = params.get('passport');
  const prePassport = passports.find(p => p.id === pre && p.status === 'published');
  const [f, setF] = useState({ organization: '', contactName: '', email: '', kind: 'recycler' as AccessRequest['kind'], reason: '', tier: 'restricted' as 'restricted' | 'authority', scope: (prePassport ? 'passport' : 'all') as 'all' | 'passport', consent: false });
  const [err, setErr] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<AccessRequest | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF({ ...f, [k]: v }); setErr({ ...err, [k]: '' }); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.organization.trim()) er.organization = 'Completează organizația.';
    if (!f.contactName.trim()) er.contactName = 'Completează numele.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = 'Adresă de e-mail invalidă.';
    if (f.reason.trim().length < 15) er.reason = 'Descrie pe scurt de ce ai nevoie de date (minim 15 caractere).';
    if (!f.consent) er.consent = 'Confirmă pentru a trimite.';
    setErr(er);
    if (Object.keys(er).length) return;
    setSent(access.request({
      organization: f.organization.trim(), contactName: f.contactName.trim(), email: f.email.trim(), kind: f.kind, reason: f.reason.trim(),
      scope: f.scope, passportIds: f.scope === 'passport' && prePassport ? [prePassport.id] : [], tierRequested: f.tier,
    }));
  };

  const head = (
    <div className="public-head" style={{ background: o.brand.primary }}>
      {o.brand.logoDataUrl ? <img src={o.brand.logoDataUrl} alt="" /> : <Icon name="lock" />}
      <div><b>{o.name}</b><span className="small" style={{ opacity: .85 }}>Cerere de acces la datele pașaportului bateriei</span></div>
    </div>
  );

  if (sent) return (
    <div className="public-wrap"><div className="inner">{head}
      <div className="card stack">
        <div className="row"><span className="badge ok"><Icon name="check" size={12} />Trimisă</span></div>
        <h2>Am primit cererea</h2>
        <p className="muted">{o.name} o analizează și îți trimite un link de acces la <b>{sent.email}</b>. Accesul are durată limitată și fiecare consultare se înregistrează.</p>
        <p className="small faint mono">Referință: {sent.id}</p>
      </div>
    </div></div>
  );

  return (
    <div className="public-wrap"><div className="inner">
      {head}
      <form className="card stack lg" onSubmit={submit} noValidate>
        <div className="stack sm"><h2>Solicită acces</h2><p className="muted small">Datele restricționate (compoziție detaliată, manuale de demontare, starea bateriei) sunt disponibile doar persoanelor cu interes legitim (Reg. (UE) 2023/1542, Anexa XIII).</p></div>
        {prePassport && <div className="callout info"><Icon name="passport" /><span>Pașaport: <b>{prePassport.name}</b></span></div>}
        <div className="form-grid">
          <Field label="Organizație" htmlFor="ar-org" error={err.organization}><input id="ar-org" className="input" autoComplete="organization" value={f.organization} onChange={e => set('organization', e.target.value)} /></Field>
          <Field label="Persoană de contact" htmlFor="ar-name" error={err.contactName}><input id="ar-name" className="input" autoComplete="name" value={f.contactName} onChange={e => set('contactName', e.target.value)} /></Field>
          <Field label="E-mail" htmlFor="ar-email" error={err.email}><input id="ar-email" className="input" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Tip organizație" htmlFor="ar-kind"><select id="ar-kind" className="select" value={f.kind} onChange={e => { const k = e.target.value as AccessRequest['kind']; setF({ ...f, kind: k, tier: k === 'authority' || k === 'notified_body' ? 'authority' : f.tier }); }}>
            {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        </div>
        <Field label="De ce ai nevoie de date" htmlFor="ar-reason" error={err.reason} wide><textarea id="ar-reason" className="textarea" rows={3} value={f.reason} onChange={e => set('reason', e.target.value)} /></Field>
        <div className="grid-2">
          <div className="field"><span className="label">Nivel de acces</span>
            <div className="seg"><button type="button" aria-pressed={f.tier === 'restricted'} onClick={() => set('tier', 'restricted')}>Interes legitim</button><button type="button" aria-pressed={f.tier === 'authority'} onClick={() => set('tier', 'authority')}>Autoritate</button></div></div>
          <div className="field"><span className="label">Pentru</span>
            <div className="seg"><button type="button" aria-pressed={f.scope === 'all'} onClick={() => set('scope', 'all')}>Toate bateriile</button><button type="button" disabled={!prePassport} aria-pressed={f.scope === 'passport'} onClick={() => set('scope', 'passport')}>Acest pașaport</button></div></div>
        </div>
        <div className="field">
          <label className="check"><input type="checkbox" checked={f.consent} onChange={e => set('consent', e.target.checked)} />Folosesc datele doar în scopul declarat și accept înregistrarea fiecărei consultări.</label>
          {err.consent && <span className="error">{err.consent}</span>}
        </div>
        <div className="row end"><button className="btn primary" type="submit">Trimite cererea</button></div>
      </form>
    </div></div>
  );
}
