import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { update, uid, nowIso } from '../../api/store';
import { org } from '../../api/actions';
import { Field } from '../../components/ui';
import { AuthLayout } from './_AuthLayout';

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', pass: '', company: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: '' }); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = 'Completează numele.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = 'Adresă de e-mail invalidă.';
    if (f.pass.length < 8) er.pass = 'Minim 8 caractere.';
    if (!f.company.trim()) er.company = 'Completează numele firmei.';
    setErr(er);
    if (Object.keys(er).length) return;
    const id = uid('mb');
    update(db => {
      db.members = [{ id, name: f.name.trim(), email: f.email.trim(), role: 'owner', joinedAt: nowIso(), lastActiveAt: nowIso() }, ...db.members.filter(m => m.role !== 'owner').map(m => m)];
      db.session = { userId: id, name: f.name.trim(), email: f.email.trim(), role: 'owner' };
    });
    const slug = f.company.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    org.update({ name: f.company.trim(), slug, trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString() });
    nav('/bun-venit', { replace: true });
  };

  return (
    <AuthLayout>
      <form onSubmit={submit} noValidate>
        <h2>Creează cont</h2>
        <p className="muted small">14 zile Pro gratuit. Fără card.</p>
        <Field label="Numele tău" htmlFor="rg-name" error={err.name}><input id="rg-name" className="input" autoComplete="name" value={f.name} onChange={set('name')} autoFocus /></Field>
        <Field label="E-mail" htmlFor="rg-email" error={err.email}><input id="rg-email" className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Parolă" htmlFor="rg-pass" error={err.pass} hint="Minim 8 caractere"><input id="rg-pass" className="input" type="password" autoComplete="new-password" value={f.pass} onChange={set('pass')} /></Field>
        <Field label="Firma" htmlFor="rg-company" error={err.company}><input id="rg-company" className="input" autoComplete="organization" value={f.company} onChange={set('company')} /></Field>
        <button className="btn primary" type="submit">Creează contul</button>
        <p className="small muted">Ai deja cont? <Link to="/login">Intră</Link></p>
      </form>
    </AuthLayout>
  );
}
