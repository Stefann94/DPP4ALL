// Local data store (browser localStorage). Same shape as the future REST backend, so screens
// only talk to `useDB` (read) and `actions` (write) and never to storage directly.
import { useRef, useSyncExternalStore } from 'react';
import type { DB } from '../types';
import { seed } from './seed';

const KEY = 'dpp-platform-v1';
let state: DB = load();
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* corrupted or blocked storage: fall back to seed */ }
  return seed();
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { console.warn('Nu s-a putut salva în localStorage (spațiu plin?)'); }
  }, 150);
}

export const getDB = () => state;

/** Apply an immutable update. `fn` receives a draft copy of the top-level object. */
export function update(fn: (db: DB) => void) {
  const next: DB = { ...state };
  fn(next);
  state = next;
  persist();
  listeners.forEach(l => l());
}

export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

/**
 * React hook: re-renders when the store changes. The selector result is cached per store state,
 * so selectors that build new arrays/objects (e.g. `d => d.units.filter(...)`) are safe and don't loop.
 */
export function useDB<T>(selector: (db: DB) => T): T {
  const cache = useRef<{ state: DB | null; value: T }>({ state: null, value: undefined as T });
  const get = () => {
    if (cache.current.state !== state) cache.current = { state, value: selector(state) };
    return cache.current.value;
  };
  return useSyncExternalStore(subscribe, get, get);
}

export function resetDemo() { state = seed(); persist(); listeners.forEach(l => l()); }
export function clearAll() { const s = seed(); state = { ...s, passports: [], versions: [], units: [], readings: [], documents: [], accessRequests: [], accessLog: [], scans: [], audit: [], notifications: [], imports: [], alerts: [], deliveries: [] }; persist(); listeners.forEach(l => l()); }

export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const nowIso = () => new Date().toISOString();

// keep tabs in sync
window.addEventListener('storage', e => {
  if (e.key === KEY && e.newValue) { try { state = JSON.parse(e.newValue); listeners.forEach(l => l()); } catch { /* ignore */ } }
});
