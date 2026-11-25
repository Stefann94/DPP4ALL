import { useState } from 'react';
import { useDB } from '../api/store';
import { integrations, WEBHOOK_EVENTS } from '../api/actions';
import { Callout, ConfirmButton, CopyButton, Drawer, Empty, Field, Icon, Modal, PageHead, Switch, Tabs, useToast } from '../components/ui';
import { fmtDate, fmtDateTime, fmtRelative } from '../lib/format';
import { retryDelivery } from './_org';
import type { ApiKey, Webhook } from '../types';
import '../styles/org.css';

const SCOPES = ['passports:read', 'passports:write', 'units:read', 'units:write', 'documents:read', 'documents:write', 'events:read', 'access:read'];
const EVENT_RO: Record<string, string> = {
  'passport.created': 'Pașaport creat', 'passport.updated': 'Pașaport modificat', 'passport.published': 'Pașaport publicat', 'passport.unpublished': 'Pașaport retras',
  'passport.trashed': 'Mutat în coș', 'passport.restored': 'Restaurat', 'unit.created': 'Baterii adăugate', 'unit.reading_recorded': 'Valoare înregistrată',
  'unit.status_changed': 'Status baterie schimbat', 'alert.triggered': 'Alertă BMS', 'access.requested': 'Cerere acces', 'access.approved': 'Acces aprobat',
  'access.revoked': 'Acces revocat', 'document.uploaded': 'Document încărcat', 'import.completed': 'Import finalizat',
};

type Tab = 'keys' | 'webhooks' | 'docs' | 'mcp';

export default function Integrations() {
  const keys = useDB(d => d.apiKeys);
  const hooks = useDB(d => d.webhooks);
  const [tab, setTab] = useState<Tab>('keys');
  return (
    <div className="page">
      <PageHead title="Integrări și API" sub="Conectează ERP-ul, BMS-ul sau alte sisteme." />
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'keys', label: 'Chei API', count: keys.filter(k => !k.revokedAt).length },
        { value: 'webhooks', label: 'Webhook-uri', count: hooks.length },
        { value: 'docs', label: 'Documentație API' },
        { value: 'mcp', label: 'Asistent AI' },
      ]} />
      {tab === 'keys' && <KeysTab />}
      {tab === 'webhooks' && <WebhooksTab />}
      {tab === 'docs' && <DocsTab />}
      {tab === 'mcp' && <McpTab />}
    </div>
  );
}

function KeysTab() {
  const keys = useDB(d => d.apiKeys);
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const active = keys.filter(k => !k.revokedAt), revoked = keys.filter(k => k.revokedAt);
  return (
    <div className="stack">
      <div className="row between"><span className="muted small">Cheile de test nu ating datele reale. Cheia completă se afișează o singură dată.</span><button className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" />Cheie nouă</button></div>
      <div className="card flush">
        {active.length === 0 ? <Empty icon="key" title="Nicio cheie activă" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Nume</th><th>Mod</th><th>Cheie</th><th>Permisiuni</th><th>Creată</th><th>Ultima folosire</th><th className="shrink" /></tr></thead>
            <tbody>{active.map(k => <KeyRow key={k.id} k={k} onRevoke={() => { integrations.revokeKey(k.id); toast('Cheie revocată'); }} />)}</tbody>
          </table></div>)}
      </div>
      {revoked.length > 0 && <details><summary className="small muted" style={{ cursor: 'pointer' }}>{revoked.length} chei revocate</summary>
        <div className="card flush" style={{ marginTop: 8 }}><div className="table-wrap"><table className="table"><tbody>{revoked.map(k => <tr key={k.id}><td>{k.name}</td><td className="mono">{k.prefix}…</td><td className="small muted">revocată {fmtDate(k.revokedAt)}</td></tr>)}</tbody></table></div></div>
      </details>}
      {creating && <CreateKey onClose={() => setCreating(false)} />}
    </div>
  );
}

function KeyRow({ k, onRevoke }: { k: ApiKey; onRevoke: () => void }) {
  return (
    <tr>
      <td><b>{k.name}</b><div className="small muted">{k.createdBy}</div></td>
      <td><span className={'badge ' + (k.mode === 'live' ? 'ok' : 'warn')}>{k.mode === 'live' ? 'Live' : 'Test'}</span></td>
      <td className="mono nowrap">{k.prefix}…</td>
      <td><div className="chips">{k.scopes.map(s => <span key={s} className="badge">{s}</span>)}</div></td>
      <td className="nowrap small">{fmtDate(k.createdAt)}</td>
      <td className="nowrap small">{k.lastUsedAt ? fmtRelative(k.lastUsedAt) : 'niciodată'}</td>
      <td><ConfirmButton className="btn sm danger" onConfirm={onRevoke} confirmText="Confirmă">Revocă</ConfirmButton></td>
    </tr>
  );
}

function CreateKey({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<ApiKey['mode']>('test');
  const [scopes, setScopes] = useState<string[]>(['passports:read', 'units:read']);
  const [secret, setSecret] = useState('');
  if (secret) return (
    <Modal title="Cheia ta API" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Am salvat-o</button>}>
      <Callout kind="warn">Copiaz-o acum. Nu o mai poți vedea după ce închizi.</Callout>
      <div className="secret">{secret}</div>
      <div><CopyButton text={secret} label="Copiază cheia" /></div>
      <pre className="code">{`curl https://api.dpp.example/v1/passports \\\n  -H "Authorization: Bearer ${secret.slice(0, 14)}…"`}</pre>
    </Modal>
  );
  return (
    <Modal title="Cheie API nouă" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Anulează</button><button className="btn primary" disabled={!name.trim() || !scopes.length} onClick={() => setSecret(integrations.createKey(name.trim(), mode, scopes).secret)}>Creează</button></>}>
      <Field label="Nume" htmlFor="k-name" hint="De ex. ERP producție"><input id="k-name" className="input" autoFocus value={name} onChange={e => setName(e.target.value)} /></Field>
      <div className="field"><span className="label">Mod</span><div className="seg"><button aria-pressed={mode === 'test'} onClick={() => setMode('test')}>Test</button><button aria-pressed={mode === 'live'} onClick={() => setMode('live')}>Live</button></div></div>
      <div className="field"><span className="label">Permisiuni</span>
        <div className="chips">{SCOPES.map(s => <label key={s} className="chip"><input type="checkbox" checked={scopes.includes(s)} onChange={e => setScopes(e.target.checked ? [...scopes, s] : scopes.filter(x => x !== s))} /><span className="mono" style={{ fontSize: 12 }}>{s}</span></label>)}</div></div>
    </Modal>
  );
}

function WebhooksTab() {
  const hooks = useDB(d => d.webhooks);
  const deliveries = useDB(d => d.deliveries);
  const [edit, setEdit] = useState<Partial<Webhook> | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const toast = useToast();
  return (
    <div className="stack lg">
      <div className="row between"><span className="muted small">Trimitem un POST cu semnătură la fiecare eveniment ales.</span><button className="btn primary" onClick={() => setEdit({ url: '', events: ['passport.published'], active: true })}><Icon name="plus" />Webhook nou</button></div>
      {hooks.length === 0 ? <div className="card"><Empty icon="webhook" title="Niciun webhook" /></div> : (
        <div className="stack">{hooks.map(w => (
          <article key={w.id} className="card">
            <div className="row between">
              <div className="stack sm" style={{ minWidth: 0, flex: '1 1 300px' }}>
                <span className="mono ellipsis" style={{ display: 'block', fontSize: 13 }}>{w.url}</span>
                <div className="chips">{w.events.map(e => <span key={e} className="badge">{EVENT_RO[e] ?? e}</span>)}</div>
              </div>
              <div className="row">
                <Switch checked={w.active} onChange={v => integrations.saveWebhook({ ...w, active: v })} label={w.active ? 'Activ' : 'Oprit'} />
                <button className="btn sm" onClick={() => { integrations.testWebhook(w.id); toast('Ping trimis'); }}>Test</button>
                <button className="btn sm" onClick={() => setEdit(w)}><Icon name="edit" />Editează</button>
              </div>
            </div>
          </article>))}
        </div>)}

      <section className="card flush">
        <div className="card-head" style={{ padding: '14px 14px 0' }}><h3>Livrări recente</h3></div>
        {deliveries.length === 0 ? <Empty icon="activity" title="Nicio livrare" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Când</th><th>Eveniment</th><th>Status</th><th style={{ textAlign: 'right' }}>Durată</th><th className="shrink" /></tr></thead>
            <tbody>{deliveries.slice(0, 40).flatMap(d => {
              const ok = d.status >= 200 && d.status < 300;
              const rows = [
                <tr key={d.id} className="clickable" onClick={() => setOpen(open === d.id ? null : d.id)}>
                  <td className="nowrap small">{fmtDateTime(d.at)}</td><td><span className="mono small">{d.event}</span></td>
                  <td><span className={'badge ' + (ok ? 'ok' : 'bad')}>{d.status}</span></td>
                  <td className="num small" style={{ textAlign: 'right' }}>{d.durationMs} ms</td>
                  <td onClick={e => e.stopPropagation()}>{!ok && <button className="btn sm" onClick={() => { retryDelivery(d.id); toast('Retrimis'); }}><Icon name="refresh" />Retrimite</button>}</td>
                </tr>];
              if (open === d.id) rows.push(<tr key={d.id + 'p'}><td colSpan={5}><pre className="code">{JSON.stringify({ event: d.event, at: d.at, data: d.payload }, null, 2)}</pre></td></tr>);
              return rows;
            })}</tbody></table></div>)}
      </section>
      {edit && <WebhookDrawer w={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function WebhookDrawer({ w, onClose }: { w: Partial<Webhook>; onClose: () => void }) {
  const [url, setUrl] = useState(w.url ?? '');
  const [events, setEvents] = useState<string[]>(w.events ?? []);
  const [reveal, setReveal] = useState(false);
  const toast = useToast();
  const valid = /^https:\/\/[^\s/]+\.[^\s]+$/.test(url);
  return (
    <Drawer title={w.id ? 'Editează webhook' : 'Webhook nou'} onClose={onClose}
      footer={<>
        {w.id && <ConfirmButton onConfirm={() => { integrations.deleteWebhook(w.id!); onClose(); toast('Webhook șters'); }} confirmText="Confirmă ștergerea">Șterge</ConfirmButton>}
        <span className="grow" />
        <button className="btn" onClick={onClose}>Anulează</button>
        <button className="btn primary" disabled={!valid || !events.length} onClick={() => { integrations.saveWebhook({ id: w.id, url, events, active: w.active ?? true }); onClose(); toast('Salvat'); }}>Salvează</button>
      </>}>
      <Field label="URL" htmlFor="wh-url" error={url && !valid ? 'Adresă HTTPS completă.' : null}><input id="wh-url" className="input mono" type="url" placeholder="https://erp.firma.ro/hooks/dpp" value={url} onChange={e => setUrl(e.target.value.trim())} /></Field>
      <div className="field"><span className="label">Evenimente</span>
        <div className="stack sm">{WEBHOOK_EVENTS.map(e => <label key={e} className="check"><input type="checkbox" checked={events.includes(e)} onChange={x => setEvents(x.target.checked ? [...events, e] : events.filter(y => y !== e))} />{EVENT_RO[e] ?? e}<span className="mono faint" style={{ fontSize: 11 }}>{e}</span></label>)}</div></div>
      {w.secret && <div className="field"><span className="label">Secret semnătură</span>
        <div className="row nowrap-row"><span className="secret grow">{reveal ? w.secret : '•'.repeat(18)}</span><button className="btn sm" onClick={() => setReveal(!reveal)}><Icon name="eye" /></button><CopyButton text={w.secret} label="" /></div></div>}
    </Drawer>
  );
}

const ENDPOINTS: [string, string, string, string][] = [
  ['GET', '/v1/passports', 'passports:read', 'Listă, filtre status/categorie, paginare cursor'],
  ['POST', '/v1/passports', 'passports:write', 'Creează ciornă'],
  ['GET', '/v1/passports/{id}', 'passports:read', 'Un pașaport, cu ETag'],
  ['PATCH', '/v1/passports/{id}', 'passports:write', 'JSON Merge Patch, If-Match'],
  ['POST', '/v1/passports/{id}/validate', 'passports:read', 'Verificare fără salvare'],
  ['POST', '/v1/passports/{id}/publish', 'passports:write', 'Publică (versiune cu hash)'],
  ['POST', '/v1/passports/{id}/unpublish', 'passports:write', 'Retrage'],
  ['GET', '/v1/passports/{id}/versions', 'passports:read', 'Istoric versiuni'],
  ['GET', '/v1/passports/{id}/units', 'units:read', 'Baterii individuale'],
  ['POST', '/v1/passports/{id}/units', 'units:write', 'Adaugă 1–1000 serii'],
  ['POST', '/v1/readings:batch', 'units:write', 'Valori BMS în lot (până la 5000)'],
  ['POST', '/v1/units/{id}/status', 'units:write', 'Schimbă statusul'],
  ['POST', '/v1/documents', 'documents:write', 'Încarcă document (URL semnat)'],
  ['GET', '/v1/events', 'events:read', 'Flux evenimente, cursor'],
  ['GET', '/v1/access-requests', 'access:read', 'Cereri de acces'],
  ['GET', '/v1/dpps/{dppId}', 'public', 'EN 18222 ReadDPPById'],
  ['GET', '/v1/dppsByProductId/{productId}', 'public', 'EN 18222 ReadDPPByProductId'],
  ['POST', '/v1/dppsByProductIds', 'public', 'EN 18222, până la 500 ID-uri'],
];

function DocsTab() {
  return (
    <div className="stack lg">
      <div className="grid-2">
        <section className="card stack"><h3>Autentificare</h3>
          <pre className="code">{`Authorization: Bearer dpp_live_xxxxxxxx\nIdempotency-Key: 7f1c…   (POST, păstrat 30 zile)\nIf-Match: "v12"           (PATCH, evită suprascrieri)`}</pre></section>
        <section className="card stack"><h3>Semnătura webhook</h3>
          <pre className="code">{`X-DPP-Signature: sha256=<hmac>\n\n// Node.js\nconst sig = crypto.createHmac('sha256', SECRET)\n  .update(rawBody).digest('hex');\nconst ok = crypto.timingSafeEqual(\n  Buffer.from('sha256=' + sig), Buffer.from(header));`}</pre></section>
      </div>
      <section className="card flush">
        <div className="table-wrap"><table className="table">
          <thead><tr><th className="shrink">Metodă</th><th>Cale</th><th>Permisiune</th><th>Ce face</th></tr></thead>
          <tbody>{ENDPOINTS.map(([m, p, s, d]) => <tr key={m + p}><td><span className={'method ' + m}>{m}</span></td><td className="mono">{p}</td><td>{s === 'public' ? <span className="badge ok">public</span> : <span className="mono small">{s}</span>}</td><td className="small">{d}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="card stack"><h3>Exemplu: valori din BMS</h3>
        <pre className="code">{`POST /v1/readings:batch\n{\n  "readings": [\n    { "serial": "HC10-2609-000187", "field": "remaining_capacity", "value": 192.4,\n      "observed_on": "2026-11-25", "source": "bms" },\n    { "serial": "HC10-2609-000187", "field": "charge_discharge_cycles", "value": 431,\n      "observed_on": "2026-11-25", "source": "bms" }\n  ]\n}`}</pre></section>
    </div>
  );
}

function McpTab() {
  return (
    <div className="grid-2">
      <section className="card stack">
        <h3>Conector pentru asistenți AI</h3>
        <p className="muted">Claude, ChatGPT sau alt asistent compatibil MCP poate citi catalogul, completa ciorne și spune ce lipsește.</p>
        <div className="field"><span className="label">Adresă server</span><div className="row nowrap-row"><span className="secret grow">https://api.dpp.example/mcp</span><CopyButton text="https://api.dpp.example/mcp" label="" /></div></div>
        <span className="badge warn" style={{ justifySelf: 'start' }}>În pregătire</span>
      </section>
      <section className="card stack">
        <h3>Ce nu poate face un asistent</h3>
        <div className="list">
          {['Să publice un pașaport fără aprobarea ta', 'Să modifice un pașaport publicat fără propunere aprobată', 'Să șteargă sau să retragă ceva', 'Să trimită date către autorități'].map(t => (
            <div className="li" key={t}><span className="ic bad"><Icon name="x" /></span><span>{t}</span></div>))}
        </div>
      </section>
    </div>
  );
}
