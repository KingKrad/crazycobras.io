// Local save + safe account sync. Progress always lives on the device first.
import { cleanProgress, mergeProgress, emptyProgress } from './rules.js';

const PKEY = 'gi_progress_v1';
const SKEY = 'gi_settings_v1';

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked: keep playing */ }
}

export function loadProgress() {
  const raw = readJson(PKEY);
  return raw ? cleanProgress(raw) : emptyProgress();
}

export function saveProgress(p) {
  writeJson(PKEY, p);
  scheduleSync();
}

export function resetProgress() {
  try { localStorage.removeItem(PKEY); } catch { /* ignore */ }
}

const DEFAULT_SETTINGS = { sound: true, motion: 'auto', effects: 'auto' };
export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(readJson(SKEY) || {}) };
}
export function saveSettings(s) {
  writeJson(SKEY, s);
  applySettings(s);
}
export function applySettings(s = loadSettings()) {
  document.documentElement.classList.toggle('reduce-motion', prefersReducedMotion(s));
}
export function prefersReducedMotion(s = loadSettings()) {
  if (s.motion === 'reduced') return true;
  if (s.motion === 'full') return false;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------- API ----------
export async function api(path, { method = 'GET', body } = {}) {
  const init = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try { res = await fetch(path, init); } catch { return { ok: false, status: 0, data: { error: 'You seem to be offline.' } }; }
  let data = {};
  try { data = await res.json(); } catch { /* not json */ }
  return { ok: res.ok, status: res.status, data };
}

let mePromise = null;
export function getMe(force = false) {
  if (!mePromise || force) {
    mePromise = api('/api/me').then((r) => (r.ok ? r.data : { signedIn: false, paid: false }));
  }
  return mePromise;
}

// ---------- Sync: merge device + account, never lose a lesson ----------
let syncTimer = null;
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 800);
}

export async function syncNow() {
  const me = await getMe();
  if (!me.signedIn) return loadProgress();
  const local = loadProgress();
  const r = await api('/api/progress', { method: 'PUT', body: { progress: local } });
  if (!r.ok) return local;
  const merged = mergeProgress(local, r.data.progress);
  writeJson(PKEY, merged);
  return merged;
}
