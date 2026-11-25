import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDB } from '../../api/store';
import { org } from '../../api/actions';
import { CATEGORIES, FIELDS } from '../../data/catalog';
import { FieldInput } from '../../components/FieldInput';
import { Field, Icon } from '../../components/ui';
import { AuthLayout } from './_AuthLayout';

const KEYS = ['manufacturer_name', 'manufacturer_address', 'manufacturer_country', 'manufacturer_email', 'manufacturer_website', 'eori_number', 'eu_responsible_person'];

export default function Onboarding() {
  const nav = useNavigate();
  const session = useDB(d => d.session);
  const o = useDB(d => d.org);
  const [step, setStep] = useState(0);
  const [kinds, setKinds] = useState<string[]>([]);
  const [mf, setMf] = useState<Record<string, string>>(() => ({ manufacturer_name: o.name, ...o.manufacturer }));
  const [resolver, setResolver] = useState(o.resolver || `https://dpp.${o.slug || 'firma'}.ro`);
  if (!session) return <Navigate to="/login" replace />;
  const fields = FIELDS.filter(f => KEYS.includes(f.name));
  const finish = () => {
    const clean = Object.fromEntries(Object.entries(mf).filter(([, v]) => v));
    org.update({ manufacturer: clean, resolver: resolver.trim().replace(/\/+$/, '') });
    nav('/panou', { replace: true });
  };

  return (
    <AuthLayout>
      <div className="box">
        <div className="steps" aria-label={`Pasul ${step + 1} din 3`}>{[0, 1, 2].map(i => <span key={i} className={i <= step ? 'on' : ''} />)}</div>
        {step === 0 && <>
          <h2>Ce baterii produci?</h2>
          <div className="chips">
            {CATEGORIES.map(c => <label key={c.value} className="chip"><input type="checkbox" checked={kinds.includes(c.value)} onChange={e => setKinds(e.target.checked ? [...kinds, c.value] : kinds.filter(k => k !== c.value))} />{c.label}</label>)}
          </div>
          {kinds.length > 0 && (
            <p className="small muted">
              {kinds.some(k => CATEGORIES.find(c => c.value === k)?.profile === 'battery_full') ? 'Pașaport complet obligatoriu din 18.02.2027.' : ''}{' '}
              {kinds.some(k => CATEGORIES.find(c => c.value === k)?.profile === 'battery_basic') ? 'Bateriile mici au nevoie doar de QR cu informații de bază.' : ''}
            </p>
          )}
        </>}
        {step === 1 && <>
          <h2>Date producător</h2>
          <p className="muted small">Se completează automat în fiecare pașaport nou.</p>
          {fields.map(f => <FieldInput key={f.name} field={f} value={mf[f.name]} compact onChange={v => setMf({ ...mf, [f.name]: v == null ? '' : String(v) })} idPrefix="ob-" />)}
        </>}
        {step === 2 && <>
          <h2>Domeniul codurilor QR</h2>
          <Field label="Adresă" htmlFor="ob-res" hint="Codurile tipărite duc aici. Poți folosi un subdomeniu propriu mai târziu.">
            <input id="ob-res" className="input" type="url" value={resolver} onChange={e => setResolver(e.target.value)} />
          </Field>
          <div className="callout info"><Icon name="qr" /><span className="mono">{resolver.replace(/\/+$/, '')}/01/05949876543219/21/SERIE</span></div>
        </>}
        <div className="row between">
          <button className="btn ghost" onClick={() => (step ? setStep(step - 1) : finish())}>{step ? 'Înapoi' : 'Sari peste'}</button>
          <button className="btn primary" onClick={() => (step < 2 ? setStep(step + 1) : finish())}>{step < 2 ? 'Continuă' : 'Gata'}</button>
        </div>
      </div>
    </AuthLayout>
  );
}
