import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getDB, update } from '../../api/store';
import { Field } from '../../components/ui';
import { AuthLayout } from './_AuthLayout';

function signIn(email?: string) {
  const db = getDB();
  const m = db.members.find(x => email && x.email.toLowerCase() === email.trim().toLowerCase()) ?? db.members.find(x => x.role === 'owner') ?? db.members[0];
  update(d => {
    d.session = m ? { userId: m.id, name: m.name, email: m.email, role: m.role } : { userId: 'mb_local', name: 'Administrator', email: email || 'admin@firma.ro', role: 'owner' };
    d.members = d.members.map(x => (x.id === m?.id ? { ...x, lastActiveAt: new Date().toISOString() } : x));
  });
}

export default function Login() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/panou';
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (params.get('logout')) update(d => { d.session = null; });
    else if (getDB().session) nav(from, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (mail?: string) => { signIn(mail); nav(from === '/login' || from === '/' ? '/panou' : from, { replace: true }); };

  return (
    <AuthLayout>
      <form onSubmit={e => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Introdu o adresă de e-mail validă.');
        if (pass.length < 8) return setErr('Parola are cel puțin 8 caractere.');
        go(email);
      }}>
        <h2>Intră în cont</h2>
        {params.get('logout') && <p className="muted small">Ai ieșit din cont.</p>}
        <div className="oauth">
          <button type="button" className="btn" onClick={() => go()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" /></svg>
            Google
          </button>
          <button type="button" className="btn" onClick={() => go()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M2 2h9.5v9.5H2z" /><path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" /><path fill="#00A4EF" d="M2 12.5h9.5V22H2z" /><path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" /></svg>
            Microsoft
          </button>
        </div>
        <div className="or">sau</div>
        <Field label="E-mail" htmlFor="lg-email"><input id="lg-email" className="input" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} autoFocus /></Field>
        <Field label="Parolă" htmlFor="lg-pass" error={err || null}><input id="lg-pass" className="input" type="password" autoComplete="current-password" value={pass} onChange={e => { setPass(e.target.value); setErr(''); }} /></Field>
        <button className="btn primary" type="submit">Intră</button>
        <p className="small muted">Nu ai cont? <Link to="/inregistrare">Creează unul</Link></p>
        <p className="small faint">Demo: orice adresă din echipă (ex. maria@voltaria.example) și orice parolă de minim 8 caractere.</p>
      </form>
    </AuthLayout>
  );
}
