// Domain model for the battery passport platform. Mirrors the future REST API.

export type AccessTier = 'public' | 'restricted' | 'authority';
export type Profile = 'battery_full' | 'battery_basic';
export type BatteryCategory =
  | 'ev' | 'lmt' | 'industrial_stationary' | 'industrial_other'
  | 'portable' | 'sli' | 'industrial_up_to_2kwh';
export type PassportStatus = 'draft' | 'published' | 'trashed';
export type UnitStatus = 'original' | 'repurposed' | 're-used' | 'remanufactured' | 'waste';
export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

/** Field values grouped by section id from the field catalogue (identificare, operator, ...). */
export type SectionData = Record<string, unknown>;
export type PassportData = Record<string, SectionData>;

export interface Passport {
  id: string;
  name: string;                 // denormalised product_name for lists
  category: BatteryCategory | null;
  profile: Profile;
  status: PassportStatus;
  version: number;              // increments on every save
  publishedVersion: number | null; // version number of the last publish
  gtin: string | null;          // denormalised identificare.gtin
  data: PassportData;
  modelStartingValues: boolean; // units inherit model values until their own reading
  linkedFromPassportId?: string | null; // second-life: passport this one was created from (Art. 77(7))
  linkedFromUnitSerial?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  trashedAt: string | null;
  createdBy: string;
  updatedBy: string;
}

/** Immutable snapshot taken at every publish and on demand; used for history/diff/restore. */
export interface PassportVersion {
  id: string;
  passportId: string;
  version: number;
  kind: 'publish' | 'save' | 'restore' | 'import';
  data: PassportData;
  name: string;
  hash: string;                 // SHA-256 of the canonical JSON (integrity, EN 18246 prep)
  createdAt: string;
  createdBy: string;
  note?: string;
}

export interface Unit {
  id: string;
  passportId: string;
  serial: string;               // GS1 AI 21, max 20 chars
  batch?: string;               // GS1 AI 10
  manufacturingDate?: string;   // YYYY-MM
  status: UnitStatus;
  values: Record<string, unknown>; // current values (latest reading per field)
  createdAt: string;
  updatedAt: string;
  secondLifePassportId?: string | null;
}

export interface Reading {
  id: string;
  unitId: string;
  passportId: string;
  field: string;
  value: unknown;
  observedOn: string;           // YYYY-MM-DD
  source: 'measurement' | 'brand_statement' | 'bms' | 'import';
  note?: string;
  documentId?: string | null;
  recordedBy: string;
  recordedAt: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: 'conformity_declaration' | 'test_report' | 'certification' | 'carbon_footprint_study' | 'due_diligence_report' | 'manual' | 'safety_data_sheet' | 'datasheet' | 'image' | 'document';
  accessTier: AccessTier;
  mime: string;
  size: number;
  dataUrl?: string;             // local demo storage (small files only)
  sha256?: string;
  passportIds: string[];
  uploadedAt: string;
  uploadedBy: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
  lastActiveAt?: string;
}

export interface Invite {
  id: string;
  email: string;
  role: Exclude<Role, 'owner'>;
  createdAt: string;
  expiresAt: string;
  invitedBy: string;
}

/** Legitimate-interest access portal (recyclers, repairers, second-life operators, authorities). */
export interface AccessRequest {
  id: string;
  organization: string;
  contactName: string;
  email: string;
  kind: 'recycler' | 'repairer' | 'remanufacturer' | 'second_life' | 'authority' | 'notified_body' | 'other';
  reason: string;
  scope: 'all' | 'passport';
  passportIds: string[];
  tierRequested: Exclude<AccessTier, 'public'>;
  status: 'pending' | 'approved' | 'rejected' | 'revoked' | 'expired';
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  expiresAt?: string;
  token?: string;               // access token handed to the grantee
}

export interface AccessLogEntry {
  id: string;
  requestId: string;
  organization: string;
  passportId: string;
  unitSerial?: string;
  fieldsViewed: number;
  at: string;
  ip?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  mode: 'test' | 'live';
  prefix: string;               // shown, e.g. dpp_live_ab12
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdBy: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: number;               // HTTP status
  durationMs: number;
  at: string;
  payload: unknown;
}

export interface AlertRule {
  id: string;
  name: string;
  field: string;                // e.g. remaining_capacity, temperature
  op: '<' | '>' | 'drop_pct';
  threshold: number;
  active: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  passportId: string;
  unitId: string;
  message: string;
  at: string;
  acknowledged: boolean;
}

export interface ScanEvent {
  id: string;
  passportId: string;
  unitSerial?: string;
  at: string;
  country: string;              // ISO alpha-2
  device: 'mobile' | 'desktop' | 'scanner' | 'api';
  language: string;
}

export interface AuditEvent {
  id: string;
  type: string;                 // passport.published, unit.status_changed, access.approved ...
  actor: string;
  summary: string;
  passportId?: string;
  at: string;
  meta?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  kind: 'deadline' | 'alert' | 'access' | 'import' | 'system';
  title: string;
  body?: string;
  href?: string;
  at: string;
  read: boolean;
}

export interface ImportJob {
  id: string;
  fileName: string;
  rows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  at: string;
  by: string;
  target: 'passports' | 'units' | 'readings';
}

export interface OrgSettings {
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'pro' | 'scale';
  trialEndsAt?: string | null;
  manufacturer: Record<string, string>;   // defaults pre-filled into new passports (operator section)
  brand: { logoDataUrl?: string; primary: string; accent: string; showPoweredBy: boolean };
  languages: string[];                    // public page languages
  defaultLanguage: string;
  resolver: string;                       // https://dpp.firma.ro
  customDomain: { host: string; status: 'none' | 'waiting_dns' | 'verified' | 'live' | 'error'; cname: string; txt: string; checkedAt?: string } ;
  gln?: string;                           // economic operator id (EN 18223)
  notifications: { deadlines: boolean; alerts: boolean; accessRequests: boolean; weeklyDigest: boolean; email: string };
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

export interface DB {
  org: OrgSettings;
  session: Session | null;
  passports: Passport[];
  versions: PassportVersion[];
  units: Unit[];
  readings: Reading[];
  documents: DocumentFile[];
  members: Member[];
  invites: Invite[];
  accessRequests: AccessRequest[];
  accessLog: AccessLogEntry[];
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  deliveries: WebhookDelivery[];
  alertRules: AlertRule[];
  alerts: Alert[];
  scans: ScanEvent[];
  audit: AuditEvent[];
  notifications: Notification[];
  imports: ImportJob[];
}
