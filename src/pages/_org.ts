// Shared helpers for the organization / operations screens.
import { getDB, update, uid, nowIso } from '../api/store';
import { access } from '../api/actions';
import type { AccessRequest, AccessTier } from '../types';

export const KIND_LABEL: Record<AccessRequest['kind'], string> = {
  recycler: 'Reciclator', repairer: 'Service / reparații', remanufacturer: 'Re-fabricare', second_life: 'A doua viață',
  authority: 'Autoritate', notified_body: 'Organism notificat', other: 'Altul',
};
export const COUNTRY: Record<string, string> = {
  RO: 'România', DE: 'Germania', IT: 'Italia', PL: 'Polonia', FR: 'Franța', AT: 'Austria', HU: 'Ungaria', NL: 'Olanda', ES: 'Spania',
  BG: 'Bulgaria', BE: 'Belgia', CZ: 'Cehia', GB: 'Regatul Unit', US: 'SUA', MD: 'Moldova',
};
export const DEVICE: Record<string, string> = { mobile: 'Telefon', desktop: 'Calculator', scanner: 'Scanner', api: 'API' };
export const LANG: Record<string, string> = { ro: 'Română', en: 'Engleză', de: 'Germană', fr: 'Franceză', it: 'Italiană', es: 'Spaniolă', pl: 'Poloneză', hu: 'Maghiară', bg: 'Bulgară' };

export const AUDIT_GROUPS: { id: string; label: string; match: (t: string) => boolean }[] = [
  { id: 'passport', label: 'Pașapoarte', match: t => t.startsWith('passport.') },
  { id: 'unit', label: 'Baterii', match: t => t.startsWith('unit.') || t.startsWith('alert.') },
  { id: 'access', label: 'Acces', match: t => t.startsWith('access.') },
  { id: 'team', label: 'Echipă', match: t => t.startsWith('team.') },
  { id: 'integrations', label: 'Integrări', match: t => t.startsWith('api_key.') || t.startsWith('webhook.') },
  { id: 'data', label: 'Date', match: t => t.startsWith('import.') || t.startsWith('document.') || t.startsWith('export.') },
  { id: 'settings', label: 'Setări', match: t => t.startsWith('settings.') },
];
export const auditGroupOf = (t: string) => AUDIT_GROUPS.find(g => g.match(t))?.label ?? 'Altele';

/** RFC 4180 CSV. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map(r => r.map(c => {
    const s = c === null || c === undefined ? '' : String(c);
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n');
}

export const PLAN_LIMITS: Record<string, { label: string; price: string; passports: number; units: number; seats: number; documents: number; features: string[] }> = {
  free: { label: 'Free', price: '0 €', passports: 3, units: 5, seats: 1, documents: 50, features: ['QR GS1 Digital Link', 'Pagină publică', 'Import CSV / Excel'] },
  starter: { label: 'Starter', price: '39 €', passports: 50, units: 500, seats: 3, documents: 250, features: ['Fără branding platformă', 'Limbi suplimentare', 'Etichete de tipărit'] },
  pro: { label: 'Pro', price: '99 €', passports: 500, units: 10000, seats: 10, documents: 2500, features: ['API live + webhook-uri', 'Domeniu propriu', 'Telemetrie BMS', 'Portal acces'] },
  scale: { label: 'Scale', price: '249 €', passports: 3000, units: 50000, seats: Infinity, documents: 10000, features: ['Membri nelimitați', 'SLA și backup zilnic', 'Asistență dedicată'] },
};

/** Approve with tier/scope overrides on top of actions.access.approve (which sets token + expiry). */
export function approveAccess(id: string, days: number, tier: Exclude<AccessTier, 'public'>, passportIds: string[] | null) {
  access.approve(id, days);
  update(db => {
    db.accessRequests = db.accessRequests.map(r => r.id === id
      ? { ...r, tierRequested: tier, ...(passportIds && passportIds.length ? { scope: 'passport' as const, passportIds } : {}) }
      : r);
  });
}

/** Re-send a webhook delivery (demo: always succeeds). */
export function retryDelivery(deliveryId: string) {
  const d = getDB().deliveries.find(x => x.id === deliveryId);
  if (!d) return;
  update(db => { db.deliveries = [{ ...d, id: uid('dl'), status: 200, durationMs: 110 + Math.round(Math.random() * 120), at: nowIso() }, ...db.deliveries]; });
}

/** Update the logged-in user's profile (session + member record). */
export function updateProfile(name: string, email: string) {
  update(db => {
    if (!db.session) return;
    const id = db.session.userId;
    db.session = { ...db.session, name, email };
    db.members = db.members.map(m => (m.id === id ? { ...m, name, email } : m));
  });
}

/** First passport a grant covers (for share links). */
export function grantPassportId(r: AccessRequest): string | undefined {
  if (r.scope === 'passport' && r.passportIds.length) return r.passportIds[0];
  return getDB().passports.find(p => p.status === 'published')?.id ?? getDB().passports[0]?.id;
}
export const accessLink = (r: AccessRequest, passportId?: string) => {
  const pid = passportId ?? grantPassportId(r);
  return pid && r.token ? `${location.origin}/p/${pid}?token=${r.token}` : '';
};
