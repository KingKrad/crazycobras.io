// Shared page chrome: background stars, XP/streak chips, toasts, settings.
import { loadProgress, applySettings, getMe, syncNow, today } from './store.js';
import { totalXp, currentStreak } from './rules.js';
import { sfx } from './fx.js';

export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}

let toastTimer;
export function toast(message) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(t);
  }
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

export function renderChips(progress = loadProgress(), me = null) {
  const box = document.getElementById('chips');
  if (!box) return;
  const streak = currentStreak(progress.streak, today());
  const chips = [
    el('span', { class: 'chip streak', title: 'Day streak' }, '\u{1F525} ', String(streak), el('span', { class: 'sr-only' }, ' day streak')),
    el('span', { class: 'chip xp', title: 'Experience points' }, '\u{1FA99} ', String(totalXp(progress)), el('span', { class: 'sr-only' }, ' XP')),
  ];
  if (me && me.paid) chips.push(el('span', { class: 'chip pro', title: 'Full course unlocked' }, 'FULL'));
  box.replaceChildren(...chips);
}

export async function initPage() {
  applySettings();
  if (!document.querySelector('.stars')) document.body.prepend(el('div', { class: 'stars', 'aria-hidden': 'true' }));
  renderChips();
  // Small tap sound on buttons for a tactile feel.
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn, .node, .option')) sfx.tap();
  });
  const me = await getMe();
  renderChips(loadProgress(), me);
  if (me.signedIn) {
    const merged = await syncNow();
    renderChips(merged, me);
  }
  for (const a of document.querySelectorAll('[data-signed-in]')) a.hidden = !me.signedIn;
  for (const a of document.querySelectorAll('[data-signed-out]')) a.hidden = !!me.signedIn;
  return me;
}
