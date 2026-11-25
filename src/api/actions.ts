// All writes go through here. Each action records an audit event and fires matching webhooks,
// exactly as the backend will. Screens import `actions` and never mutate the store directly.
import { getDB, update, uid, nowIso } from './store';
import { completeness } from '../lib/validation';
import { canonicalJson, sha256 } from '../lib/download';
import { profileOf } from '../data/catalog';
import { SERIAL_RE } from '../lib/gs1';
import type {
  AccessRequest, AccessTier, AlertRule, ApiKey, BatteryCategory, DB, DocumentFile, Invite, OrgSettings,
  Passport, PassportData, PassportVersion, Reading, Role, Unit, UnitStatus, Webhook,
} from '../types';

export const WEBHOOK_EVENTS = [
  'passport.created', 'passport.updated', 'passport.published', 'passport.unpublished', 'passport.trashed', 'passport.restored',
  'unit.created', 'unit.reading_recorded', 'unit.status_changed', 'alert.triggered',
  'access.requested', 'access.approved', 'access.revoked', 'document.uploaded', 'import.completed',
] as const;

const me = () => getDB().session?.name ?? 'Sistem';

function emit(db: DB, type: string, summary: string, extra: { passportId?: string; payload?: unknown } = {}) {
  const at = nowIso();
  db.audit = [{ id: uid('ae'), type, actor: me(), summary, passportId: extra.passportId, at }, ...db.audit].slice(0, 2000);
  const hooks = db.webhooks.filter(w => w.active && w.events.includes(type));
  if (hooks.length) {
    db.deliveries = [
      ...hooks.map(w => ({ id: uid('dl'), webhookId: w.id, event: type, status: 200, durationMs: 90 + Math.round(Math.random() * 200), at, payload: extra.payload ?? { summary } })),
      ...db.deliveries,
    ].slice(0, 500);
  }
}

function notify(db: DB, n: { kind: 'deadline' | 'alert' | 'access' | 'import' | 'system'; title: string; body?: string; href?: string }) {
  db.notifications = [{ id: uid('nt'), at: nowIso(), read: false, ...n }, ...db.notifications].slice(0, 200);
}

const patchPassport = (db: DB, id: string, fn: (p: Passport) => Passport) => {
  db.passports = db.passports.map(p => (p.id === id ? fn(p) : p));
};

async function snapshot(p: Passport, kind: PassportVersion['kind'], note?: string): Promise<PassportVersion> {
  const hash = await sha256(canonicalJson(p.data));
  return { id: uid('ver'), passportId: p.id, version: p.version, kind, data: structuredClone(p.data), name: p.name, hash, createdAt: nowIso(), createdBy: me(), note };
}

// ───────────────────────── passports ─────────────────────────
export const passports = {
  create(input: { name: string; category: BatteryCategory | null; data?: PassportData; linkedFrom?: { passportId: string; serial: string } }): Passport {
    const db = getDB();
    const data: PassportData = input.data ? structuredClone(input.data) : {};
    data.identificare = { ...(data.identificare ?? {}), product_name: input.name };
    if (input.category) data.identificare.battery_category = input.category;
    if (!input.data) data.operator = { ...db.org.manufacturer };
    const p: Passport = {
      id: uid('pp'), name: input.name, category: input.category, profile: profileOf(input.category), status: 'draft', version: 1, publishedVersion: null,
      gtin: (data.identificare.gtin as string) ?? null, data, modelStartingValues: true,
      linkedFromPassportId: input.linkedFrom?.passportId ?? null, linkedFromUnitSerial: input.linkedFrom?.serial ?? null,
      createdAt: nowIso(), updatedAt: nowIso(), publishedAt: null, trashedAt: null, createdBy: me(), updatedBy: me(),
    };
    update(d => { d.passports = [p, ...d.passports]; emit(d, 'passport.created', `A creat ${p.name}`, { passportId: p.id }); });
    return p;
  },

  /** Set one field value (autosave). `undefined`/'' clears it. */
  setField(id: string, section: string, field: string, value: unknown) {
    update(db => patchPassport(db, id, p => {
      const data = { ...p.data, [section]: { ...(p.data[section] ?? {}) } };
      const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
      if (empty) delete data[section]![field]; else data[section]![field] = value;
      const name = field === 'product_name' ? String(value ?? '') || 'Fără nume' : p.name;
      const gtin = field === 'gtin' ? (empty ? null : String(value)) : p.gtin;
      return { ...p, data, name, gtin, version: p.version + 1, updatedAt: nowIso(), updatedBy: me() };
    }));
  },

  setFields(id: string, values: { section: string; field: string; value: unknown }[], source = 'editare') {
    update(db => {
      patchPassport(db, id, p => {
        const data = structuredClone(p.data);
        for (const v of values) { data[v.section] ??= {}; data[v.section]![v.field] = v.value; }
        const name = String(data.identificare?.product_name ?? p.name);
        const gtin = (data.identificare?.gtin as string) ?? p.gtin;
        return { ...p, data, name, gtin, version: p.version + 1, updatedAt: nowIso(), updatedBy: me() };
      });
      const p = db.passports.find(x => x.id === id);
      emit(db, 'passport.updated', `${values.length} câmpuri completate (${source}) în ${p?.name}`, { passportId: id });
    });
  },

  setCategory(id: string, category: BatteryCategory) {
    update(db => patchPassport(db, id, p => ({
      ...p, category, profile: profileOf(category),
      data: { ...p.data, identificare: { ...(p.data.identificare ?? {}), battery_category: category } },
      version: p.version + 1, updatedAt: nowIso(), updatedBy: me(),
    })));
  },

  setModelStartingValues(id: string, on: boolean) {
    update(db => patchPassport(db, id, p => ({ ...p, modelStartingValues: on, updatedAt: nowIso() })));
  },

  /** Validates, snapshots a hashed version, marks published. Returns the blocking issues if any. */
  async publish(id: string, note?: string) {
    const p0 = getDB().passports.find(p => p.id === id);
    if (!p0) return { ok: false as const, reason: 'Pașaportul nu există.' };
    const units = getDB().units.filter(u => u.passportId === id);
    const c = completeness(p0);
    if (!c.canPublish) return { ok: false as const, reason: `${c.errors.length} probleme blochează publicarea.`, issues: c.errors };
    if (!units.every(u => SERIAL_RE.test(u.serial))) return { ok: false as const, reason: 'Există serii invalide.' };
    const pub: Passport = { ...p0, status: 'published', publishedVersion: p0.version, publishedAt: nowIso(), trashedAt: null };
    const ver = await snapshot(pub, 'publish', note);
    update(db => {
      patchPassport(db, id, () => pub);
      db.versions = [ver, ...db.versions];
      emit(db, 'passport.published', `A publicat ${pub.name} (v${pub.version})`, { passportId: id, payload: { passport: id, version: pub.version, hash: ver.hash } });
    });
    return { ok: true as const, version: ver };
  },

  unpublish(id: string) {
    update(db => {
      patchPassport(db, id, p => ({ ...p, status: 'draft', updatedAt: nowIso() }));
      emit(db, 'passport.unpublished', `A retras de la publicare ${db.passports.find(p => p.id === id)?.name}`, { passportId: id });
    });
  },
  trash(id: string) {
    update(db => {
      patchPassport(db, id, p => ({ ...p, status: 'trashed', trashedAt: nowIso() }));
      emit(db, 'passport.trashed', `A mutat în coș ${db.passports.find(p => p.id === id)?.name}`, { passportId: id });
    });
  },
  restore(id: string) {
    update(db => {
      patchPassport(db, id, p => ({ ...p, status: 'draft', trashedAt: null }));
      emit(db, 'passport.restored', `A restaurat ${db.passports.find(p => p.id === id)?.name}`, { passportId: id });
    });
  },
  deleteForever(id: string) {
    update(db => {
      const name = db.passports.find(p => p.id === id)?.name;
      db.passports = db.passports.filter(p => p.id !== id);
      db.units = db.units.filter(u => u.passportId !== id);
      db.readings = db.readings.filter(r => r.passportId !== id);
      db.versions = db.versions.filter(v => v.passportId !== id);
      db.documents = db.documents.map(d => ({ ...d, passportIds: d.passportIds.filter(x => x !== id) }));
      emit(db, 'passport.deleted', `A șters definitiv ${name}`);
    });
  },
  duplicate(id: string): Passport | null {
    const p = getDB().passports.find(x => x.id === id);
    if (!p) return null;
    const data = structuredClone(p.data);
    delete data.identificare?.gtin;
    return passports.create({ name: `${p.name} (copie)`, category: p.category, data });
  },
  async saveVersion(id: string, note: string) {
    const p = getDB().passports.find(x => x.id === id); if (!p) return;
    const v = await snapshot(p, 'save', note);
    update(db => { db.versions = [v, ...db.versions]; emit(db, 'passport.version_saved', `Versiune salvată: ${note || p.name}`, { passportId: id }); });
  },
  async restoreVersion(versionId: string) {
    const v = getDB().versions.find(x => x.id === versionId); if (!v) return;
    update(db => {
      patchPassport(db, v.passportId, p => ({ ...p, data: structuredClone(v.data), name: v.name, gtin: (v.data.identificare?.gtin as string) ?? null, version: p.version + 1, updatedAt: nowIso(), updatedBy: me() }));
      emit(db, 'passport.restored_version', `A restaurat versiunea v${v.version} din ${v.name}`, { passportId: v.passportId });
    });
    const p = getDB().passports.find(x => x.id === v.passportId);
    if (p) { const snap = await snapshot(p, 'restore', `Restaurat din v${v.version}`); update(db => { db.versions = [snap, ...db.versions]; }); }
  },
};

// ───────────────────────── units (individual batteries) ─────────────────────────
export const units = {
  /** Add serials; returns which were added and which were refused (duplicate/invalid). */
  add(passportId: string, serials: string[], opts: { batch?: string; manufacturingDate?: string; status?: UnitStatus } = {}) {
    const db = getDB();
    const existing = new Set(db.units.filter(u => u.passportId === passportId).map(u => u.serial));
    const added: Unit[] = []; const refused: { serial: string; reason: string }[] = [];
    const model = db.passports.find(p => p.id === passportId);
    for (const raw of serials) {
      const serial = raw.trim(); if (!serial) continue;
      if (!SERIAL_RE.test(serial)) { refused.push({ serial, reason: 'Format invalid (max 20 caractere GS1)' }); continue; }
      if (existing.has(serial)) { refused.push({ serial, reason: 'Există deja' }); continue; }
      existing.add(serial);
      const status = opts.status ?? 'original';
      added.push({ id: uid('un'), passportId, serial, batch: opts.batch, manufacturingDate: opts.manufacturingDate, status,
        values: { status, ...(model?.modelStartingValues ? { state_of_certified_energy: 100 } : {}) }, createdAt: nowIso(), updatedAt: nowIso() });
    }
    if (added.length) update(d => {
      d.units = [...added, ...d.units];
      emit(d, 'unit.created', `${added.length} baterii adăugate la ${model?.name}`, { passportId, payload: { serials: added.map(a => a.serial) } });
    });
    return { added, refused };
  },

  recordReading(unitId: string, r: { field: string; value: unknown; observedOn: string; source: Reading['source']; note?: string; documentId?: string | null }) {
    update(db => {
      const u = db.units.find(x => x.id === unitId); if (!u) return;
      const reading: Reading = { id: uid('rd'), unitId, passportId: u.passportId, recordedBy: me(), recordedAt: nowIso(), ...r };
      db.readings = [reading, ...db.readings];
      // latest observedOn wins
      const latest = db.readings.filter(x => x.unitId === unitId && x.field === r.field).sort((a, b) => b.observedOn.localeCompare(a.observedOn) || b.recordedAt.localeCompare(a.recordedAt))[0];
      db.units = db.units.map(x => x.id === unitId ? { ...x, values: { ...x.values, [r.field]: latest?.value }, updatedAt: nowIso() } : x);
      emit(db, 'unit.reading_recorded', `${u.serial}: ${r.field} = ${String(r.value)}`, { passportId: u.passportId, payload: { serial: u.serial, ...r } });
      checkAlerts(db, unitId, r.field, r.value);
    });
  },

  /** Status change with Annex XIII rules; `correction` allows fixing a mistake (kept in history). */
  changeStatus(unitId: string, to: UnitStatus, opts: { observedOn: string; note?: string; correction?: boolean }) {
    update(db => {
      const u = db.units.find(x => x.id === unitId); if (!u) return;
      db.readings = [{ id: uid('rd'), unitId, passportId: u.passportId, field: 'status', value: to, observedOn: opts.observedOn, source: 'brand_statement', note: (opts.correction ? '[Corecție] ' : '') + (opts.note ?? ''), recordedBy: me(), recordedAt: nowIso() }, ...db.readings];
      db.units = db.units.map(x => x.id === unitId ? { ...x, status: to, values: { ...x.values, status: to }, updatedAt: nowIso() } : x);
      emit(db, 'unit.status_changed', `${u.serial} → ${to}${opts.correction ? ' (corecție)' : ''}`, { passportId: u.passportId, payload: { serial: u.serial, from: u.status, to } });
    });
  },

  /** Second life (Art. 77(7)): new passport for the repurposed/remanufactured battery, linked to the original. */
  startSecondLife(unitId: string, newName: string): Passport | null {
    const db = getDB();
    const u = db.units.find(x => x.id === unitId); if (!u) return null;
    const src = db.passports.find(p => p.id === u.passportId); if (!src) return null;
    const data = structuredClone(src.data);
    delete data.identificare?.gtin;
    const np = passports.create({ name: newName, category: src.category, data, linkedFrom: { passportId: src.id, serial: u.serial } });
    update(d => { d.units = d.units.map(x => x.id === unitId ? { ...x, secondLifePassportId: np.id } : x); });
    return np;
  },

  remove(unitId: string) {
    update(db => {
      const u = db.units.find(x => x.id === unitId);
      db.units = db.units.filter(x => x.id !== unitId);
      db.readings = db.readings.filter(r => r.unitId !== unitId);
      emit(db, 'unit.deleted', `A șters bateria ${u?.serial}`, { passportId: u?.passportId });
    });
  },
};

function checkAlerts(db: DB, unitId: string, field: string, value: unknown) {
  const u = db.units.find(x => x.id === unitId); if (!u || typeof value !== 'number') return;
  // previous value of the same field (readings are newest-first; index 0 is the one just recorded)
  const prev = db.readings.filter(x => x.unitId === unitId && x.field === field).map(x => x.value).find((v, i) => i > 0 && typeof v === 'number') as number | undefined;
  for (const r of db.alertRules.filter(r => r.active && r.field === field)) {
    const hit = r.op === '<' ? value < r.threshold
      : r.op === '>' ? value > r.threshold
      : prev !== undefined && prev > 0 && ((prev - value) / prev) * 100 > r.threshold;
    if (!hit) continue;
    const message = `${u.serial}: ${r.name} (${value})`;
    db.alerts = [{ id: uid('alr'), ruleId: r.id, passportId: u.passportId, unitId, message, at: nowIso(), acknowledged: false }, ...db.alerts];
    notify(db, { kind: 'alert', title: 'Alertă baterie', body: message, href: '/telemetrie' });
    emit(db, 'alert.triggered', message, { passportId: u.passportId });
  }
}

export const telemetry = {
  saveRule(rule: Omit<AlertRule, 'id'> & { id?: string }) {
    update(db => { db.alertRules = rule.id ? db.alertRules.map(r => r.id === rule.id ? { ...r, ...rule } as AlertRule : r) : [...db.alertRules, { ...rule, id: uid('rule') }]; });
  },
  deleteRule(id: string) { update(db => { db.alertRules = db.alertRules.filter(r => r.id !== id); }); },
  acknowledge(id: string) { update(db => { db.alerts = db.alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a); }); },
};

// ───────────────────────── documents ─────────────────────────
export const documents = {
  add(doc: Omit<DocumentFile, 'id' | 'uploadedAt' | 'uploadedBy'>) {
    const d: DocumentFile = { ...doc, id: uid('doc'), uploadedAt: nowIso(), uploadedBy: me() };
    update(db => { db.documents = [d, ...db.documents]; emit(db, 'document.uploaded', `A încărcat ${d.name}`); });
    return d;
  },
  update(id: string, patch: Partial<DocumentFile>) { update(db => { db.documents = db.documents.map(d => d.id === id ? { ...d, ...patch } : d); }); },
  link(id: string, passportId: string) { update(db => { db.documents = db.documents.map(d => d.id === id && !d.passportIds.includes(passportId) ? { ...d, passportIds: [...d.passportIds, passportId] } : d); }); },
  unlink(id: string, passportId: string) { update(db => { db.documents = db.documents.map(d => d.id === id ? { ...d, passportIds: d.passportIds.filter(x => x !== passportId) } : d); }); },
  remove(id: string) { update(db => { db.documents = db.documents.filter(d => d.id !== id); }); },
};

// ───────────────────────── team ─────────────────────────
export const team = {
  invite(email: string, role: Exclude<Role, 'owner'>) {
    const inv: Invite = { id: uid('iv'), email, role, createdAt: nowIso(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), invitedBy: me() };
    update(db => { db.invites = [inv, ...db.invites]; emit(db, 'team.invited', `A invitat ${email} (${role})`); });
    return inv;
  },
  cancelInvite(id: string) { update(db => { db.invites = db.invites.filter(i => i.id !== id); }); },
  setRole(memberId: string, role: Role) { update(db => { db.members = db.members.map(m => m.id === memberId && m.role !== 'owner' ? { ...m, role } : m); emit(db, 'team.role_changed', `Rol schimbat: ${db.members.find(m => m.id === memberId)?.name} → ${role}`); }); },
  remove(memberId: string) { update(db => { const m = db.members.find(x => x.id === memberId); if (m?.role === 'owner') return; db.members = db.members.filter(x => x.id !== memberId); emit(db, 'team.removed', `A eliminat ${m?.name}`); }); },
};

// ───────────────────────── access portal (legitimate interest) ─────────────────────────
export const access = {
  request(r: Omit<AccessRequest, 'id' | 'status' | 'createdAt'>) {
    const req: AccessRequest = { ...r, id: uid('ar'), status: 'pending', createdAt: nowIso() };
    update(db => {
      db.accessRequests = [req, ...db.accessRequests];
      notify(db, { kind: 'access', title: 'Cerere nouă de acces', body: `${req.organization} cere acces la date ${req.tierRequested === 'authority' ? 'pentru autorități' : 'restricționate'}.`, href: '/acces' });
      emit(db, 'access.requested', `Cerere acces: ${req.organization}`, { payload: { request: req.id, organization: req.organization } });
    });
    return req;
  },
  approve(id: string, days: number) {
    update(db => {
      db.accessRequests = db.accessRequests.map(r => r.id === id ? { ...r, status: 'approved', decidedAt: nowIso(), decidedBy: me(), expiresAt: new Date(Date.now() + days * 86400000).toISOString(), token: 'acc_' + Math.random().toString(36).slice(2, 10) } : r);
      emit(db, 'access.approved', `Acces aprobat pentru ${db.accessRequests.find(r => r.id === id)?.organization} (${days} zile)`);
    });
  },
  reject(id: string) { update(db => { db.accessRequests = db.accessRequests.map(r => r.id === id ? { ...r, status: 'rejected', decidedAt: nowIso(), decidedBy: me() } : r); emit(db, 'access.rejected', `Cerere respinsă: ${db.accessRequests.find(r => r.id === id)?.organization}`); }); },
  revoke(id: string) { update(db => { db.accessRequests = db.accessRequests.map(r => r.id === id ? { ...r, status: 'revoked' } : r); emit(db, 'access.revoked', `Acces revocat: ${db.accessRequests.find(r => r.id === id)?.organization}`); }); },
  /** Resolve an access token to its grant (public page with ?token=). */
  grantFor(token: string | null): AccessRequest | null {
    if (!token) return null;
    const r = getDB().accessRequests.find(x => x.token === token && x.status === 'approved');
    if (!r || (r.expiresAt && r.expiresAt < nowIso())) return null;
    return r;
  },
  logView(grant: AccessRequest, passportId: string, fieldsViewed: number, unitSerial?: string) {
    update(db => { db.accessLog = [{ id: uid('al'), requestId: grant.id, organization: grant.organization, passportId, unitSerial, fieldsViewed, at: nowIso() }, ...db.accessLog].slice(0, 2000); });
  },
};
export const tierAllowed = (grant: AccessRequest | null): AccessTier => grant?.tierRequested ?? 'public';

// ───────────────────────── integrations ─────────────────────────
export const integrations = {
  createKey(name: string, mode: ApiKey['mode'], scopes: string[]) {
    const secret = `dpp_${mode}_${Math.random().toString(36).slice(2, 6)}${Math.random().toString(36).slice(2, 30)}`;
    const key: ApiKey = { id: uid('key'), name, mode, prefix: secret.slice(0, 13), scopes, createdAt: nowIso(), createdBy: me() };
    update(db => { db.apiKeys = [key, ...db.apiKeys]; emit(db, 'api_key.created', `Cheie API creată: ${name} (${mode})`); });
    return { key, secret }; // secret shown once
  },
  revokeKey(id: string) { update(db => { db.apiKeys = db.apiKeys.map(k => k.id === id ? { ...k, revokedAt: nowIso() } : k); emit(db, 'api_key.revoked', `Cheie API revocată: ${db.apiKeys.find(k => k.id === id)?.name}`); }); },
  saveWebhook(w: Omit<Webhook, 'id' | 'createdAt' | 'secret'> & { id?: string }) {
    update(db => {
      db.webhooks = w.id ? db.webhooks.map(x => x.id === w.id ? { ...x, ...w } as Webhook : x)
        : [...db.webhooks, { ...w, id: uid('wh'), createdAt: nowIso(), secret: 'whsec_' + Math.random().toString(36).slice(2, 12) }];
    });
  },
  deleteWebhook(id: string) { update(db => { db.webhooks = db.webhooks.filter(w => w.id !== id); }); },
  testWebhook(id: string) {
    update(db => { db.deliveries = [{ id: uid('dl'), webhookId: id, event: 'ping', status: 200, durationMs: 120, at: nowIso(), payload: { ping: true } }, ...db.deliveries]; });
  },
};

// ───────────────────────── org, notifications, imports ─────────────────────────
export const org = {
  update(patch: Partial<OrgSettings>) { update(db => { db.org = { ...db.org, ...patch }; emit(db, 'settings.updated', 'Setări actualizate'); }); },
};
export const notifications = {
  markRead(id: string) { update(db => { db.notifications = db.notifications.map(n => n.id === id ? { ...n, read: true } : n); }); },
  markAllRead() { update(db => { db.notifications = db.notifications.map(n => ({ ...n, read: true })); }); },
};
export const imports = {
  log(job: Omit<import('../types').ImportJob, 'id' | 'at' | 'by'>) {
    update(db => {
      db.imports = [{ ...job, id: uid('im'), at: nowIso(), by: me() }, ...db.imports];
      notify(db, { kind: 'import', title: 'Import finalizat', body: `${job.fileName}: ${job.created} create, ${job.updated} actualizate, ${job.errors} erori.`, href: '/import' });
      emit(db, 'import.completed', `Import ${job.fileName}: ${job.created + job.updated} rânduri`, { payload: job });
    });
  },
};
export const scans = {
  /** Record a scan when the public page is opened (demo analytics). */
  record(passportId: string, unitSerial?: string, language = 'ro') {
    update(db => { db.scans = [...db.scans, { id: uid('sc'), passportId, unitSerial, at: nowIso(), country: 'RO', device: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop', language }]; });
  },
};
