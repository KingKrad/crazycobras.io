import { initPage, el } from './common.js';
import { loadProgress, api, today } from './store.js';
import { lessonAccess, levelFromXp, totalXp, currentStreak, formatPrice } from './rules.js';

const UNITS = { 1: ['Idea & hook', 'teal', 'Free'], 2: ['Build your daily puzzle', 'gold', 'Full course'], 3: ['Habit & sharing', 'pink', 'Full course'], 4: ['Polish & launch', 'violet', 'Full course'] };
const ICONS = { done: '✓', open: '★', locked: '\u{1F512}', paywall: '\u{1F512}' };
const SWAY = [0, 50, 80, 50, 0, -50, -80, -50];

async function boot() {
  const me = await initPage();
  const progress = loadProgress();
  const res = await api('/api/lessons');
  const lessons = res.ok ? res.data.lessons : [];
  const xp = totalXp(progress);
  const lvl = levelFromXp(xp);
  document.getElementById('level').textContent = `Level ${lvl.level}`;
  document.getElementById('xpText').textContent = `${lvl.into} / ${lvl.span} XP to next level · \u{1F525} ${currentStreak(progress.streak, today())} day streak`;
  const bar = document.querySelector('#levelBar span');
  requestAnimationFrame(() => { bar.style.width = `${(lvl.into / lvl.span) * 100}%`; });
  document.getElementById('levelBar').setAttribute('aria-valuenow', String(lvl.into));
  document.getElementById('levelBar').setAttribute('aria-valuemax', String(lvl.span));

  let currentFound = false;
  const map = document.getElementById('map');
  const frag = [];
  let i = 0;
  for (const u of [1, 2, 3, 4]) {
    const [title, color, badge] = UNITS[u];
    const items = lessons.filter((l) => l.unit === u).map((l) => {
      let state = lessonAccess(l.n, { total: lessons.length, paid: me.paid, completed: progress.completed });
      if (progress.completed[l.n]) state = 'done';
      const isCurrent = state === 'open' && !currentFound;
      if (isCurrent) currentFound = true;
      const label = `Lesson ${l.n}: ${l.title}. ${state === 'done' ? 'Completed' : state === 'paywall' ? 'Part of the full course' : state === 'locked' ? 'Locked' : 'Start'}`;
      const href = state === 'paywall' ? '/unlock.html' : state === 'locked' ? null : `/lesson.html?n=${l.n}`;
      const node = href
        ? el('a', { class: `node ${state}${isCurrent ? ' current' : ''}`, href, 'aria-label': label }, ICONS[state], isCurrent ? el('span', { class: 'start-bubble', 'aria-hidden': 'true', text: Object.keys(progress.completed).length ? 'Next!' : 'Start!' }) : null)
        : el('span', { class: `node ${state}`, role: 'img', 'aria-label': label }, ICONS[state]);
      const li = el('li', { style: `--x:${SWAY[i++ % SWAY.length]}px` }, node, el('div', { class: 'node-label' }, l.title, el('small', { text: `${l.minutes} min` })));
      return li;
    });
    frag.push(el('section', { class: 'unit', 'aria-labelledby': `u${u}` },
      el('div', { class: `unit-head u-${color}` }, el('div', {}, el('span', { id: `u${u}`, text: `Unit ${u}: ${title}` }), el('small', { text: u === 1 ? 'Free — no sign-up' : me.paid ? 'Unlocked' : badge }))),
      el('ol', { class: 'path' }, items)));
    if (u === 1 && !me.paid) {
      frag.push(el('div', { class: 'card paywall-card' },
        el('h2', { text: 'Ready to build the rest?' }),
        el('p', { class: 'muted', text: `Units 2–4: build, polish and launch your own game. One payment, yours for life.` }),
        el('a', { class: 'btn big', href: '/unlock.html', text: `\u{1F513} Unlock for ${formatPrice()}` })));
    }
  }
  map.replaceChildren(...frag);
  const cur = map.querySelector('.node.current');
  if (cur && Object.keys(progress.completed).length) cur.scrollIntoView({ block: 'center' });
}
boot();
