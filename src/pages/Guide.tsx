// /ghid — step-by-step tutorial of the most important things in the platform.
// Each step detects from the data whether it has been done.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../api/store';
import { completeness } from '../lib/validation';
import { Icon, PageHead, Progress } from '../components/ui';
import { Tour } from '../components/layout/Tour';
import type { DB } from '../types';

type Step = {
  id: string; title: string; why: string; how: string[];
  to: string; cta: string; icon: string;
  done?: (db: DB) => boolean;
};

const STEPS: Step[] = [
  { id: 'firma', icon: 'settings', title: 'Configurează firma', why: 'Datele producătorului se completează automat în fiecare pașaport nou.',
    how: ['Setări → Producător: nume, adresă, țară, e-mail.', 'Adaugă EORI și persoana responsabilă în UE, dacă e cazul.', 'Setări → Domeniu QR: adresa la care vor duce codurile QR.'],
    to: '/setari/producator', cta: 'Deschide setările', done: db => !!(db.org.manufacturer?.manufacturer_name && db.org.manufacturer?.manufacturer_address) },
  { id: 'pasaport', icon: 'passport', title: 'Creează un pașaport', why: 'Un pașaport descrie un model de baterie. Toate bateriile de același model îl împart.',
    how: ['Pașapoarte → + Pașaport nou.', 'Alege categoria. Nu știi? Apasă „Ajută-mă să aleg”.', 'Scrie numele produsului și GTIN-ul (codul de sub codul de bare).'],
    to: '/pasapoarte/nou', cta: 'Pașaport nou', done: db => db.passports.some(p => p.status !== 'trashed') },
  { id: 'completare', icon: 'edit', title: 'Completează câmpurile obligatorii', why: 'Doar câmpurile cerute de regulament sunt afișate implicit. Bara de progres arată cât mai ai.',
    how: ['Editorul are 2 moduri: Ghidat (pas cu pas) sau O pagină.', '„Din fișa tehnică”: lipești textul fișei și propune valorile singur.', '„Ce lipsește?”: explică fiecare câmp gol și de unde îl iei.', 'Se salvează automat. Erorile apar sub câmp.'],
    to: '/pasapoarte', cta: 'Deschide pașapoartele', done: db => db.passports.some(p => p.status !== 'trashed' && completeness(p).canPublish) },
  { id: 'publicare', icon: 'qr', title: 'Publică și tipărește QR-ul', why: 'După publicare, QR-ul de pe baterie deschide pagina publică a pașaportului.',
    how: ['Butonul Publică devine activ când nu mai sunt erori.', 'Fiecare publicare salvează o versiune cu amprentă digitală.', 'Tab-ul „QR și etichete”: descarci QR-ul la dimensiunea corectă în mm.', 'Etichete: coli A4 sau imprimantă Zebra, cu EAN-14 pentru bax.'],
    to: '/etichete', cta: 'Etichete și QR', done: db => db.passports.some(p => p.status === 'published') },
  { id: 'baterii', icon: 'battery', title: 'Adaugă bateriile individuale', why: 'Din 2027, fiecare baterie are propriul QR, serie, status și istoric de valori.',
    how: ['Pașaport → Baterii → Adaugă baterii.', 'Lipește seriile sau generează o secvență (ex. HC10-000001…).', 'Pe pagina bateriei: înregistrezi valori și schimbi statusul.', 'La reutilizare se creează automat pașaportul pentru a doua viață.'],
    to: '/baterii', cta: 'Deschide bateriile', done: db => db.units.length > 0 },
  { id: 'import', icon: 'import', title: 'Importă din Excel sau automat', why: 'Nu completezi de mână sute de produse: le aduci din fișiere sau din ERP.',
    how: ['Import → descarcă șablonul Excel și completează-l.', 'La încărcare alegi tu ce coloană merge în ce câmp.', 'Duplicatele sunt detectate; erorile primesc un raport.', 'Scriptul CLI poate urmări un folder și încarcă singur fișierele noi.'],
    to: '/import', cta: 'Deschide importul', done: db => db.imports.length > 0 },
  { id: 'acces', icon: 'lock', title: 'Dă acces reciclatorilor și autorităților', why: 'Unele date sunt doar pentru cei cu interes legitim sau pentru autorități.',
    how: ['Ei completează formularul public de cerere de acces.', 'Acces date → aprobi, alegi nivelul și durata.', 'Primesc un link; fiecare vizualizare apare în jurnal.'],
    to: '/acces', cta: 'Acces date', done: db => db.accessRequests.some(r => r.status === 'approved') },
  { id: 'bms', icon: 'pulse', title: 'Conectează BMS-ul sau ERP-ul', why: 'Starea bateriilor (capacitate, cicluri, temperatură) se actualizează singură.',
    how: ['Telemetrie → Încărcare date: fișier CSV exportat din BMS.', 'Sau prin API: Integrări → creezi o cheie API.', 'Reguli de alertă: ex. capacitate sub 80%.', 'Webhook-uri: sistemele tale află imediat ce s-a schimbat.'],
    to: '/telemetrie', cta: 'Telemetrie', done: db => db.apiKeys.some(k => !k.revokedAt) || db.readings.some(r => r.source === 'bms') },
  { id: 'termene', icon: 'calendar', title: 'Urmărește termenele', why: 'Unele câmpuri devin obligatorii abia din 18.02.2027 sau după actele delegate.',
    how: ['Termene: calendarul legal și cât de pregătit e fiecare pașaport.', 'Câmpurile marcate „din 18.02.2027” pot fi completate de acum.', 'Primești notificări înainte de fiecare termen.'],
    to: '/termene', cta: 'Termene', done: db => db.org.notifications.deadlines },
];

const CONCEPTS = [
  { icon: 'passport', title: 'Model și baterie', text: 'Pașaportul e pe model. Fiecare baterie fizică are serie și QR propriu.' },
  { icon: 'lock', title: '3 niveluri de acces', text: 'Public (oricine scanează), interes legitim (reciclatori, service), autorități.' },
  { icon: 'calendar', title: 'Acum și din 2027', text: '„Obligatoriu” = trebuie pentru publicare. „Din 18.02.2027” = îl completezi până atunci.' },
  { icon: 'qr', title: 'QR = GS1 Digital Link', text: 'Codul conține un link standard /01/GTIN/21/serie, citit de orice telefon.' },
];

export default function Guide() {
  const db = useDB(d => d);
  const [tour, setTour] = useState(false);
  const status = useMemo(() => STEPS.map(s => !!s.done?.(db)), [db]);
  const doneCount = status.filter(Boolean).length;
  const next = status.findIndex(x => !x);

  return (
    <div className="page narrow">
      <PageHead title="Ghid" sub="Cele mai importante lucruri din platformă, în ordinea în care le faci."
        actions={<button className="btn" onClick={() => setTour(true)}><Icon name="play" />Tur rapid</button>} />

      <div className="card stack">
        <div className="row between"><b>{doneCount} din {STEPS.length} pași făcuți</b>{next >= 0 && <a className="small" href={`#${STEPS[next]!.id}`}>Următorul: {STEPS[next]!.title}</a>}</div>
        <Progress value={(doneCount / STEPS.length) * 100} tone={doneCount === STEPS.length ? 'ok' : undefined} />
      </div>

      <div className="guide-concepts">
        {CONCEPTS.map(c => (
          <div key={c.title} className="card guide-concept"><span className="ic"><Icon name={c.icon} /></span><b>{c.title}</b><span className="muted small">{c.text}</span></div>
        ))}
      </div>

      <div className="guide-steps">
        {STEPS.map((s, i) => (
          <div key={s.id} id={s.id} className={'card guide-step' + (status[i] ? ' done' : '')}>
            <span className="n" aria-label={status[i] ? 'Făcut' : `Pasul ${i + 1}`}>{status[i] ? <Icon name="check" /> : i + 1}</span>
            <details open={i === next}>
              <summary><h3>{s.title}</h3><span className="why">{s.why}</span></summary>
              <ol>{s.how.map(h => <li key={h}>{h}</li>)}</ol>
            </details>
            <div className="row"><Link className={'btn sm' + (i === next ? ' primary' : '')} to={s.to}>{s.cta}<Icon name="arrowRight" /></Link></div>
          </div>
        ))}
      </div>
      {tour && <Tour onClose={() => setTour(false)} />}
    </div>
  );
}
