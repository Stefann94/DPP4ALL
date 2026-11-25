import { useEffect, useMemo, useRef, useState } from 'react';
import { usePassportCtx } from './_ctx';
import { useDB } from '../../api/store';
import { passports as pa } from '../../api/actions';
import { CATEGORIES, FIELD, SECTION_SHORT, isMandatory, modelFields, profileOf, requirementOf, sectionsFor, type FieldDef } from '../../data/catalog';
import { completeness, filled, validatePassport, type Issue } from '../../lib/validation';
import { digitalLink } from '../../lib/gs1';
import { formatValue } from '../../lib/present';
import { readAsArrayBuffer, readAsText } from '../../lib/download';
import { FieldInput } from '../../components/FieldInput';
import { QrCode } from '../../components/Codes';
import { Callout, Drawer, FileDrop, Icon, Segmented, Switch, TierBadge, useToast } from '../../components/ui';
import { extractFromDatasheet, howFor, pdfText, type Proposal } from './_editorHelp';
import type { BatteryCategory, Passport } from '../../types';
import '../../styles/passports.css';

const REVIEW = '__review';

export default function EditorTab() {
  const { passport: p } = usePassportCtx();
  const role = useDB(d => d.session?.role);
  const resolver = useDB(d => d.org.resolver);
  const allUnits = useDB(d => d.units);
  const units = useMemo(() => allUnits.filter(u => u.passportId === p.id), [allUnits, p.id]);
  const toast = useToast();
  const readOnly = role === 'viewer' || p.status === 'trashed';
  const [mode, setMode] = useState<'guided' | 'page'>(() => { try { return (localStorage.getItem('dpp-editor-mode') as 'guided' | 'page') ?? 'guided'; } catch { return 'guided'; } });
  const [showOptional, setShowOptional] = useState(false);
  const [step, setStep] = useState(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [missingOpen, setMissingOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingJump = useRef<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => { try { localStorage.setItem('dpp-editor-mode', mode); } catch { /* ignore */ } }, [mode]);

  const cat = p.category;
  const sections = useMemo(() => sectionsFor(cat), [cat]);
  const issues = useMemo(() => validatePassport(p, units), [p, units]);
  const comp = useMemo(() => completeness(p), [p]);
  const byField = useMemo(() => {
    const m = new Map<string, Issue>();
    for (const i of issues) if (i.level !== 'later' && i.code !== 'required' && !m.has(i.field)) m.set(i.field, i);
    return m;
  }, [issues]);

  const fieldsOf = (sid: string): FieldDef[] => {
    const all = modelFields(sid, cat);
    return showOptional ? all : all.filter(f => isMandatory(f, cat) || filled(p.data[sid]?.[f.name]));
  };
  const progress = (sid: string) => {
    const req = modelFields(sid, cat).filter(f => isMandatory(f, cat));
    const done = req.filter(f => filled(p.data[sid]?.[f.name]) && !byField.has(f.name)).length;
    return { done, total: req.length };
  };

  const steps = [...sections.map(s => s.id), REVIEW];
  const cur = mode === 'guided' ? steps[Math.min(step, steps.length - 1)]! : null;

  const set = (f: FieldDef, v: unknown) => { if (readOnly) return; pa.setField(p.id, f.section, f.name, v); setSavedAt(Date.now()); };

  const jumpTo = (field: string, section?: string) => {
    const sid = section ?? FIELD[field]?.section ?? 'identificare';
    if (field && FIELD[field] && !isMandatory(FIELD[field], cat)) setShowOptional(true);
    if (mode === 'guided') { const i = steps.indexOf(sid); if (i >= 0) setStep(i); }
    pendingJump.current = field || null;
    setMissingOpen(false);
    setTick(t => t + 1);
  };
  useEffect(() => {
    const f = pendingJump.current; if (!f) return;
    pendingJump.current = null;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${f}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1300);
      el.querySelector<HTMLElement>('input,select,textarea')?.focus({ preventScroll: true });
    });
  });

  const renderSection = (sid: string) => {
    const fs = fieldsOf(sid);
    const s = sections.find(x => x.id === sid)!;
    return (
      <section key={sid} id={`sec-${sid}`} className="ed-section stack">
        <div className="row between"><h2>{SECTION_SHORT[sid] ?? s.label_ro}</h2><span className="small faint">{s.regulation}</span></div>
        {sid === 'identificare' && <CategoryRow p={p} readOnly={readOnly} />}
        {fs.length === 0
          ? <p className="muted small">Niciun câmp obligatoriu aici. {!showOptional && <button className="linkbtn" onClick={() => setShowOptional(true)}>Arată opționalele</button>}</p>
          : <div className="form-grid">{fs.map(f => {
              const uf = f.unit_field && FIELD[f.unit_field]?.section === f.section ? FIELD[f.unit_field] : undefined;
              const iss = byField.get(f.name);
              return <FieldInput key={f.name} field={f} category={cat} value={p.data[f.section]?.[f.name]} readOnly={readOnly}
                onChange={v => set(f, v)}
                unitValue={uf ? (p.data[uf.section]?.[uf.name] as string | undefined) ?? f.unit : undefined}
                onUnitChange={uf ? v => set(uf, v) : undefined}
                error={iss?.level === 'error' ? iss.message : null} advice={iss?.level === 'advisory' ? iss.message : null} />;
            })}</div>}
      </section>
    );
  };

  return (
    <div className="stack lg">
      <div className="row between">
        <Segmented value={mode} onChange={setMode} items={[{ value: 'guided', label: 'Ghidat' }, { value: 'page', label: 'O pagină' }]} />
        <div className="row">
          <Switch checked={showOptional} onChange={setShowOptional} label={<span className="small">Câmpuri opționale</span>} />
          {!readOnly && <button className="btn sm" onClick={() => setSheetOpen(true)}><Icon name="sparkle" />Din fișa tehnică</button>}
          <button className="btn sm" onClick={() => setMissingOpen(true)}><Icon name="info" />Ce lipsește{comp.errors.length ? ` (${comp.errors.length})` : ''}</button>
          <span className="saved-ind" aria-live="polite">{readOnly ? 'Doar citire' : savedAt ? <><Icon name="check" />Salvat</> : 'Salvare automată'}</span>
        </div>
      </div>

      <div className="editor">
        <nav className="secnav" aria-label="Secțiuni">
          {sections.map((s, i) => {
            const pr = progress(s.id);
            const current = mode === 'guided' ? cur === s.id : false;
            return <button key={s.id} aria-current={current} onClick={() => mode === 'guided' ? setStep(i) : document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth' })}>
              <span>{SECTION_SHORT[s.id] ?? s.label_ro}</span><span className={'p' + (pr.total && pr.done === pr.total ? ' done' : '')}>{pr.total ? `${pr.done}/${pr.total}` : '—'}</span>
            </button>;
          })}
          <button aria-current={cur === REVIEW} onClick={() => mode === 'guided' ? setStep(steps.length - 1) : document.getElementById('sec-review')?.scrollIntoView({ behavior: 'smooth' })}>
            <span>Verificare</span><span className={'p' + (comp.canPublish ? ' done' : '')}>{comp.canPublish ? 'gata' : comp.errors.length}</span>
          </button>
        </nav>

        <div className="card stack lg" style={{ minWidth: 0 }}>
          {mode === 'guided' ? <>
            <div className="small faint">Pasul {Math.min(step, steps.length - 1) + 1} din {steps.length}</div>
            {cur === REVIEW ? <Review p={p} comp={comp} resolver={resolver} readOnly={readOnly} onJump={jumpTo} toast={toast} /> : renderSection(cur!)}
            <div className="row between">
              <button className="btn" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}><Icon name="chevronLeft" />Înapoi</button>
              {cur !== REVIEW && <button className="btn primary" onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}>Continuă<Icon name="chevronRight" /></button>}
            </div>
          </> : <>
            {sections.map(s => renderSection(s.id))}
            <div id="sec-review" className="ed-section"><Review p={p} comp={comp} resolver={resolver} readOnly={readOnly} onJump={jumpTo} toast={toast} /></div>
          </>}
        </div>
      </div>

      {missingOpen && <MissingDrawer p={p} issues={issues} onClose={() => setMissingOpen(false)} onJump={jumpTo} />}
      {sheetOpen && <DatasheetDrawer p={p} onClose={() => setSheetOpen(false)} onApplied={n => { setSheetOpen(false); setSavedAt(Date.now()); toast(`${n} câmpuri completate din fișa tehnică`); }} />}
    </div>
  );
}

function CategoryRow({ p, readOnly }: { p: Passport; readOnly: boolean }) {
  const full = profileOf(p.category) === 'battery_full';
  return (
    <div className="form-grid">
      <div className="field" data-field="battery_category">
        <label htmlFor="f-battery_category">Categoria bateriei <span className="badge bad">obligatoriu</span></label>
        <select id="f-battery_category" className={'select' + (p.category ? '' : ' invalid')} disabled={readOnly} value={p.category ?? ''} onChange={e => e.target.value && pa.setCategory(p.id, e.target.value as BatteryCategory)}>
          <option value="">Alege…</option>
          <optgroup label="Pașaport complet">{CATEGORIES.filter(c => c.profile === 'battery_full').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
          <optgroup label="Informații prin QR">{CATEGORIES.filter(c => c.profile === 'battery_basic').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
        </select>
      </div>
      {full && <div className="field" style={{ alignContent: 'end' }}>
        <Switch checked={p.modelStartingValues} onChange={v => !readOnly && pa.setModelStartingValues(p.id, v)} label={<span className="small">Valorile modelului sunt valori de pornire pentru baterii</span>} />
      </div>}
    </div>
  );
}

function Review({ p, comp, resolver, readOnly, onJump, toast }: { p: Passport; comp: ReturnType<typeof completeness>; resolver: string; readOnly: boolean; onJump: (f: string, s?: string) => void; toast: (t: string, k?: 'bad') => void }) {
  const link = digitalLink(resolver, p.gtin);
  const [busy, setBusy] = useState(false);
  const label = (i: Issue) => FIELD[i.field]?.label_ro ?? (i.field === 'battery_category' ? 'Categoria bateriei' : i.field);
  const list = (items: Issue[]) => (
    <ul className="issue-list">{items.map((i, k) => <li key={i.field + k}><button onClick={() => onJump(i.field, i.section)}><span>{label(i)}</span><span className="small muted">{i.code === 'required' || i.code === 'required_from' ? '' : i.message}</span><span className="sec">{SECTION_SHORT[i.section] ?? i.section}</span></button></li>)}</ul>
  );
  return (
    <section className="stack lg">
      <div className="row between"><h2>Verificare și publicare</h2><span className="small muted num">{comp.done}/{comp.total} obligatorii</span></div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack">
          {comp.errors.length === 0
            ? <Callout kind="ok">Toate câmpurile obligatorii acum sunt completate.</Callout>
            : <div className="stack sm"><h3 style={{ color: 'var(--bad)' }}>{comp.errors.length} de rezolvat</h3>{list(comp.errors)}</div>}
          {comp.later.length > 0 && <details><summary className="small" style={{ cursor: 'pointer' }}><b>{comp.later.length}</b> obligatorii din 18.02.2027</summary>{list(comp.later)}</details>}
          {comp.advisories.length > 0 && <details><summary className="small" style={{ cursor: 'pointer' }}><b>{comp.advisories.length}</b> avertismente (nu blochează)</summary>{list(comp.advisories)}</details>}
        </div>
        <div className="card tight stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <QrCode value={link} size={150} />
          <span className="mono faint" style={{ overflowWrap: 'anywhere', fontSize: 11 }}>{link ?? 'Completează un GTIN valid'}</span>
          {!readOnly && p.status !== 'trashed' && (
            <button className="btn primary" disabled={!comp.canPublish || busy} onClick={async () => {
              setBusy(true); const r = await pa.publish(p.id); setBusy(false);
              r.ok ? toast(`Publicat · v${r.version.version}`) : toast(r.reason, 'bad');
            }}><Icon name="check" />{p.status === 'published' ? 'Publică versiunea nouă' : 'Publică'}</button>
          )}
        </div>
      </div>
    </section>
  );
}

function MissingDrawer({ p, issues, onClose, onJump }: { p: Passport; issues: Issue[]; onClose: () => void; onJump: (f: string, s?: string) => void }) {
  const [later, setLater] = useState(false);
  const items = issues.filter(i => i.code === 'required' || (later && i.level === 'later'));
  return (
    <Drawer title="Ce lipsește" onClose={onClose}>
      <Switch checked={later} onChange={setLater} label={<span className="small">Include obligatoriile din 2027</span>} />
      {items.length === 0 && <Callout kind="ok">Nimic obligatoriu nu lipsește.</Callout>}
      {items.map(i => {
        const f = FIELD[i.field];
        return (
          <div key={i.field} className="miss-item">
            <div className="row between"><b>{f?.label_ro ?? 'Categoria bateriei'}</b>{f && f.access_tier !== 'public' && <TierBadge tier={f.access_tier} />}</div>
            <dl>
              <dt>Ce e</dt><dd>{f?.description ?? 'Tipul bateriei: decide ce câmpuri se cer.'}</dd>
              <dt>De ce</dt><dd className="mono" style={{ fontSize: 11.5 }}>{f?.regulation?.join(' · ') ?? 'Reg. (UE) 2023/1542'}{i.level === 'later' && <span className="badge warn" style={{ marginLeft: 6 }}>din {f?.required_from?.split('-').reverse().join('.')}</span>}</dd>
              <dt>Cum</dt><dd>{howFor(i.field)}</dd>
            </dl>
            <div><button className="btn sm" onClick={() => onJump(i.field, i.section)}>Completează<Icon name="arrowRight" /></button></div>
          </div>
        );
      })}
    </Drawer>
  );
}

function DatasheetDrawer({ p, onClose, onApplied }: { p: Passport; onClose: () => void; onApplied: (n: number) => void }) {
  const [text, setText] = useState('');
  const [props, setProps] = useState<Proposal[] | null>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);

  const run = (t: string) => {
    const r = extractFromDatasheet(t, p.category);
    setProps(r);
    setPick(new Set(r.filter(x => !filled(p.data[x.section]?.[x.field])).map(x => x.field)));
  };
  const onFile = async (files: File[]) => {
    const f = files[0]; if (!f) return;
    let t = '';
    if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') t = await pdfText(await readAsArrayBuffer(f));
    else t = await readAsText(f);
    if (t.replace(/\s/g, '').length < 40) { setNote('Nu am putut citi textul din fișier (poate e scanat). Copiază textul fișei și lipește-l mai jos.'); return; }
    setNote(`Am citit ${f.name}.`); setText(t); run(t);
  };
  const apply = () => {
    if (!props) return;
    const chosen = props.filter(x => pick.has(x.field));
    const vals = chosen.flatMap(x => [
      { section: x.section, field: x.field, value: x.value },
      ...(x.unitField && x.unitValue && FIELD[x.unitField] ? [{ section: FIELD[x.unitField]!.section, field: x.unitField, value: x.unitValue }] : []),
    ]);
    if (vals.length) pa.setFields(p.id, vals, 'fișă tehnică');
    onApplied(chosen.length);
  };

  return (
    <Drawer title="Completează din fișa tehnică" onClose={onClose}
      footer={props && props.length > 0 ? <><button className="btn" onClick={() => setProps(null)}>Înapoi</button><button className="btn primary" disabled={pick.size === 0} onClick={apply}>Aplică {pick.size}</button></> : undefined}>
      {!props ? <>
        <FileDrop accept=".pdf,.txt,.csv,.md" onFiles={onFile}><b>Fișa tehnică (PDF sau text)</b><span className="small">Se citește local, nu pleacă nicăieri</span></FileDrop>
        {note && <Callout kind={note.startsWith('Nu') ? 'warn' : 'info'}>{note}</Callout>}
        <div className="field">
          <label htmlFor="ds-text">sau lipește textul</label>
          <textarea id="ds-text" className="textarea" rows={10} value={text} onChange={e => setText(e.target.value)} placeholder={'Nominal voltage: 51.2 V\nNominal capacity: 200 Ah\nCycle life: 6000 cycles @ 90% DoD, 25 °C, 0.5C'} />
        </div>
        <div><button className="btn primary" disabled={text.trim().length < 10} onClick={() => run(text)}><Icon name="sparkle" />Extrage valorile</button></div>
      </> : props.length === 0 ? (
        <Callout kind="warn">Nu am găsit valori recunoscute. Verifică textul sau completează manual.</Callout>
      ) : (
        <div className="stack">
          <span className="small muted">{props.length} valori găsite. Bifează ce aplici.</span>
          <div className="table-wrap"><table className="table">
            <thead><tr><th className="shrink" /><th>Câmp</th><th>Acum</th><th>Propus</th></tr></thead>
            <tbody>{props.map(x => {
              const f = FIELD[x.field]!;
              const data = x.unitField && x.unitValue ? { ...p.data, [FIELD[x.unitField]!.section]: { ...(p.data[FIELD[x.unitField]!.section] ?? {}), [x.unitField]: x.unitValue } } : p.data;
              const curV = p.data[x.section]?.[x.field];
              return <tr key={x.field} title={x.evidence}>
                <td className="shrink"><input type="checkbox" checked={pick.has(x.field)} onChange={() => setPick(s => { const n = new Set(s); n.has(x.field) ? n.delete(x.field) : n.add(x.field); return n; })} aria-label={f.label_ro} /></td>
                <td><span>{f.label_ro}</span>{requirementOf(f, p.category) !== 'optional' && <span className="faint small"> ·obl.</span>}<div className="faint small ellipsis" style={{ maxWidth: 220 }}>{x.evidence}</div></td>
                <td className="muted small">{filled(curV) ? formatValue(f, curV, p.data) : '—'}</td>
                <td><b>{formatValue(f, x.value, data)}</b></td>
              </tr>;
            })}</tbody>
          </table></div>
        </div>
      )}
    </Drawer>
  );
}
