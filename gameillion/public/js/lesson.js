import { initPage, el, toast, renderChips } from './common.js';
import { loadProgress, saveProgress, api, today } from './store.js';
import {
  DEFAULT_GAME, cleanGameConfig, checkGoal, completeLesson, lessonAccess, celebrationTier,
  currentStreak, levelFromXp, totalXp, isFreeLesson,
} from './rules.js';
import { burstFrom, celebrate, shake, sfx } from './fx.js';

const n = Number(new URLSearchParams(location.search).get('n')) || 1;
const $ = (id) => document.getElementById(id);

let lesson, outline, progress, me, config, stepIndex = 0, mistakes = 0;
let stepDone = false, frameReady = false;
let baseline = null;

function postConfig(flash = false) {
  if (!frameReady) return;
  $('preview').contentWindow.postMessage({ type: 'config', config, flash }, '*');
}

function setConfig(key, value) {
  config = cleanGameConfig({ ...config, [key]: value });
  progress.game = config;
  progress.gameAt = Date.now();
  saveProgress(progress);
  postConfig(true);
}

function setDone(done) {
  stepDone = done;
  $('next').disabled = !done;
}

function bodyParas(step) {
  const out = [];
  for (const p of step.body || []) out.push(el('p', { text: p }));
  if (step.list) out.push(el('ul', {}, step.list.map((li) => el('li', { text: li }))));
  return out;
}

// ---------- Step renderers ----------
const render = {
  read(step) {
    setDone(true);
    return [el('h2', { tabindex: '-1', text: step.title }), ...bodyParas(step)];
  },
  case(step) {
    setDone(true);
    return [
      el('span', { class: 'tag', text: 'CASE STUDY' }),
      el('h2', { tabindex: '-1', text: step.title }),
      ...bodyParas(step),
      el('p', {}, el('a', { href: step.url, target: '_blank', rel: 'noopener noreferrer', class: 'btn teal small' }, `Play ${step.site} ↗`)),
      step.note ? el('p', { class: 'note', text: step.note }) : null,
    ];
  },
  tweak(step) {
    const c = step.control;
    const goalLine = el('p', { class: 'goal', role: 'status' }, el('span', { text: '○' }), el('span', { text: goalText(step.goal) }));
    let input;
    const id = 'ctl-' + c.key;
    const readout = el('span', { class: 'range-val', 'aria-hidden': 'true' });
    const onChange = (value) => {
      setConfig(c.key, value);
      const met = checkGoal(step.goal, config, baseline);
      goalLine.classList.toggle('met', met);
      goalLine.firstChild.textContent = met ? '✓' : '○';
      if (met && !stepDone) {
        setDone(true);
        if (step.bigMoment) itsAlive();
        else { sfx.good(); burstFrom(input, 1); }
      }
    };
    if (c.kind === 'range') {
      input = el('input', { id, type: 'range', min: c.min, max: c.max, step: c.step || 1, value: config[c.key] });
      readout.textContent = String(config[c.key]);
      input.addEventListener('input', () => { readout.textContent = input.value; onChange(Number(input.value)); });
    } else if (c.kind === 'color') {
      input = el('input', { id, type: 'color', value: config[c.key] });
      input.addEventListener('input', () => onChange(input.value));
    } else {
      input = el('input', { id, type: 'text', maxlength: c.max || 40, value: config[c.key], autocomplete: 'off', spellcheck: 'false' });
      input.addEventListener('input', () => { if (input.value.trim()) onChange(input.value); });
    }
    const met = checkGoal(step.goal, config, baseline) && step.goal.op !== 'changed';
    setDone(met);
    if (met) { goalLine.classList.add('met'); goalLine.firstChild.textContent = '✓'; }
    return [
      el('h2', { tabindex: '-1', text: step.title }),
      ...bodyParas(step),
      el('label', { class: 'field', for: id }, el('span', {}, c.label, ' ', c.kind === 'range' ? readout : null), input),
      goalLine,
    ];
  },
  quiz(step) {
    setDone(false);
    const fb = el('div', { role: 'status', 'aria-live': 'polite' });
    let answered = false;
    const buttons = step.options.map((opt, i) =>
      el('button', {
        class: 'option', type: 'button', text: opt,
        onclick: (e) => {
          if (answered) return;
          const b = e.currentTarget;
          if (i === step.answer) {
            answered = true;
            b.classList.add('right');
            fb.replaceChildren(el('div', { class: 'feedback good', text: '✓ ' + step.explain }));
            sfx.good();
            burstFrom(b, mistakes === 0 ? 2 : 1);
            setDone(true);
            $('next').focus();
          } else {
            mistakes++;
            b.classList.add('wrong');
            b.disabled = true;
            fb.replaceChildren(el('div', { class: 'feedback bad', text: 'Not quite — try another one.' }));
            sfx.bad();
          }
        },
      }));
    return [el('h2', { tabindex: '-1', text: step.question }), el('div', { class: 'options' }, buttons), fb];
  },
  prompt(step) {
    setDone(true);
    const copy = el('button', {
      class: 'btn teal small', type: 'button', text: 'Copy prompt',
      onclick: async (e) => {
        try { await navigator.clipboard.writeText(step.prompt); toast('Copied! Paste it into your AI helper.'); sfx.coin(); burstFrom(e.currentTarget, 0); }
        catch { toast('Select the text and copy it manually.'); }
      },
    });
    return [
      el('h2', { tabindex: '-1', text: step.title }),
      ...bodyParas(step),
      el('div', { class: 'prompt-box', text: step.prompt }),
      el('p', {}, copy),
    ];
  },
  code(step) {
    setDone(false);
    const ta = el('textarea', { id: 'code', class: 'code', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off' });
    ta.value = config.hintCode || step.starter;
    const status = el('div', { role: 'status', 'aria-live': 'polite' });
    const run = el('button', {
      class: 'btn small', type: 'button', text: '▶ Run it',
      onclick: () => {
        codeStatus = status;
        codeButton = run;
        status.replaceChildren(el('p', { class: 'muted', text: 'Running…' }));
        const ticket = ++codeTicket;
        // If the preview hasn't answered (still loading on a slow device), say so instead of hanging.
        setTimeout(() => {
          if (ticket === codeTicket && status.textContent === 'Running…') {
            status.replaceChildren(el('div', { class: 'feedback bad', text: 'The preview is still loading. Wait a second and press Run again.' }));
          }
        }, 2500);
        setConfig('hintCode', ta.value);
      },
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey && !e.altKey) { /* keep Tab for focus navigation (accessibility) */ }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run.click();
    });
    return [
      el('h2', { tabindex: '-1', text: step.title }),
      ...bodyParas(step),
      el('label', { class: 'field', for: 'code' }, el('span', { text: 'function hint(guess, answer, max) {' }), ta, el('span', { text: '}' })),
      el('div', { class: 'row' }, run, el('span', { class: 'muted', text: 'Ctrl/⌘ + Enter runs it' })),
      status,
    ];
  },
  publish(step) {
    setDone(true);
    const dl = el('button', { class: 'btn big', type: 'button', text: '\u{1F680} Download my game', onclick: () => launch() });
    return [
      el('h2', { tabindex: '-1', text: step.title }),
      el('p', { text: `Your game is called ${config.name}. Download it, upload it to a free host, then submit the link to the Gameillion showcase.` }),
      el('p', {}, dl),
      el('p', {}, el('a', { href: '/showcase.html#submit', text: 'Submit to the showcase →' })),
    ];
  },
};

let codeStatus = null, codeButton = null, codeTicket = 0;

function goalText(g) {
  if (g.op === 'changed') return 'Goal: change it';
  if (g.op === 'between') return `Goal: set it between ${g.min} and ${g.max}`;
  if (g.op === 'gte') return `Goal: at least ${g.value}`;
  if (g.op === 'lte') return `Goal: at most ${g.value}`;
  return 'Goal';
}

function showStep() {
  const step = lesson.steps[stepIndex];
  baseline = { ...config };
  const box = $('step');
  box.replaceChildren(...(render[step.type] || render.read)(step).filter(Boolean));
  box.classList.toggle('case', step.type === 'case');
  $('bar').style.width = `${(stepIndex / lesson.steps.length) * 100}%`;
  $('bar').parentElement.setAttribute('aria-valuenow', String(stepIndex));
  $('next').textContent = stepIndex === lesson.steps.length - 1 ? 'Finish lesson' : 'Continue';
  const h = box.querySelector('h2');
  if (h && document.activeElement !== document.body) h.focus({ preventScroll: true });
}

function next() {
  if (!stepDone) return;
  if (stepIndex < lesson.steps.length - 1) {
    stepIndex++;
    showStep();
    sfx.tap();
  } else finish();
}

// ---------- Big moments ----------
function itsAlive() {
  sfx.win(3);
  celebrate(3);
  shake($('preview'));
  openOverlay({
    title: 'IT’S ALIVE! ⚡',
    text: `You just changed a real game. ${config.name} is yours now — everyone who plays it will see that name.`,
    stats: [],
    actions: [el('button', { class: 'btn big', type: 'button', text: 'Keep going', onclick: closeOverlay })],
  });
}

function finish() {
  const before = levelFromXp(totalXp(progress)).level;
  progress = completeLesson(progress, n, { mistakes, today: today() });
  saveProgress(progress);
  renderChips(progress, me);
  const unitLessons = outline.filter((l) => l.unit === lesson.unit);
  const unitDone = unitLessons.every((l) => progress.completed[l.n]);
  const streak = currentStreak(progress.streak, today());
  const tier = celebrationTier({ mistakes, streak, unitDone });
  const xp = progress.completed[n].xp;
  const lvl = levelFromXp(totalXp(progress));
  $('bar').style.width = '100%';
  sfx.win(tier);
  celebrate(tier);
  if (lvl.level > before) setTimeout(() => { sfx.coin(); celebrate(2); }, 900);
  const nextN = n + 1;
  const hasNext = nextN <= outline.length;
  const needsPay = hasNext && !isFreeLesson(nextN) && !me.paid;
  const actions = [];
  if (hasNext && !needsPay) actions.push(el('a', { class: 'btn big', href: `/lesson.html?n=${nextN}`, text: 'Next lesson →' }));
  if (needsPay) actions.push(el('a', { class: 'btn big', href: '/unlock.html', text: '\u{1F513} Unlock the full course' }));
  actions.push(el('a', { class: 'btn ghost', href: '/path.html', text: 'Back to path' }));
  const titles = ['Lesson done!', 'Nice work!', 'Perfect lesson! ⭐', unitDone ? 'Unit complete! \u{1F3C6}' : 'Legendary! \u{1F525}'];
  openOverlay({
    title: titles[tier],
    text: unitDone ? `You finished “${unitTitle(lesson.unit)}”.` : mistakes === 0 ? 'No mistakes. Bonus XP!' : 'Every lesson gets your game closer to launch.',
    stats: [['+' + xp, 'XP'], ['\u{1F525} ' + streak, 'day streak'], ['Lv ' + lvl.level, lvl.level > before ? 'LEVEL UP!' : 'level']],
    level: lvl,
    actions,
  });
}

function unitTitle(id) {
  return ({ 1: 'Idea & hook', 2: 'Build your daily puzzle', 3: 'Habit & sharing', 4: 'Polish & launch' })[id] || '';
}

let lastFocus = null;
function openOverlay({ title, text, stats, level, actions }) {
  lastFocus = document.activeElement;
  const o = $('overlay');
  const card = el('div', { class: 'card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ov-title' },
    el('img', { src: '/img/milli.svg', alt: '' }),
    el('h2', { id: 'ov-title', text: title }),
    el('p', { text }),
    stats.length ? el('div', { class: 'stat-row' }, stats.map(([b, s]) => el('div', { class: 'stat' }, el('b', { text: b }), el('span', { text: s })))) : null,
    level ? el('div', { class: 'level-bar', role: 'progressbar', 'aria-label': 'Level progress', 'aria-valuemin': '0', 'aria-valuemax': String(level.span), 'aria-valuenow': String(level.into) }, el('span')) : null,
    el('div', { class: 'row', style: 'justify-content:center;margin-top:14px' }, actions));
  o.replaceChildren(card);
  o.hidden = false;
  if (level) requestAnimationFrame(() => requestAnimationFrame(() => { card.querySelector('.level-bar span').style.width = `${(level.into / level.span) * 100}%`; }));
  (card.querySelector('a, button') || card).focus();
}
function closeOverlay() {
  $('overlay').hidden = true;
  if (lastFocus) lastFocus.focus();
}

// ---------- Launch: download the learner's game as one HTML file ----------
async function launch() {
  const [html, js] = await Promise.all([fetch('/play/game.html').then((r) => r.text()), fetch('/play/game.js').then((r) => r.text())]);
  const safeJson = JSON.stringify(config).replace(/</g, '\\u003c');
  const safeJs = js.replace(/<\/script/gi, '<\\/script');
  const out = html.replace('<script src="game.js"></script>', () => `<script>window.GAME_CONFIG = ${safeJson};</script>\n<script>${safeJs}</script>`);
  const blob = new Blob([out], { type: 'text/html' });
  const a = el('a', { href: URL.createObjectURL(blob), download: (config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-game') + '.html' });
  document.body.append(a);
  // Countdown build-up, then the payoff.
  const o = $('overlay');
  const num = el('div', { class: 'price', 'aria-live': 'assertive' });
  o.replaceChildren(el('div', { class: 'card' }, el('p', { text: 'Launching ' + config.name + '…' }), num));
  o.hidden = false;
  for (const i of [3, 2, 1]) {
    num.textContent = String(i);
    sfx.countdown(i);
    await new Promise((r) => setTimeout(r, 650));
  }
  sfx.countdown(0);
  a.click();
  a.remove();
  sfx.win(3);
  celebrate(3);
  shake(document.body);
  openOverlay({
    title: `${config.emoji} ${config.name} is ready!`,
    text: 'Your game file is downloading. Upload it to a free host to get your public link, then show it off in the showcase.',
    stats: [],
    actions: [el('a', { class: 'btn big', href: '/showcase.html#submit', text: 'Submit to showcase' }), el('button', { class: 'btn ghost', type: 'button', text: 'Close', onclick: closeOverlay })],
  });
}

// ---------- Boot ----------
window.addEventListener('message', (e) => {
  if (e.source !== $('preview').contentWindow) return;
  const m = e.data || {};
  if (m.type === 'ready') { frameReady = true; postConfig(); }
  if (m.type === 'win') { sfx.win(1); burstFrom($('preview'), 1); }
  if (m.type === 'code' && codeStatus) {
    codeTicket++;
    if (m.ok && !m.empty) {
      codeStatus.replaceChildren(el('div', { class: 'feedback good', text: `✓ It works! For a guess of 30 (answer 42) your code says: “${m.sample || '(nothing)'}”. Try guessing in the preview.` }));
      if (!stepDone) { setDone(true); sfx.win(2); burstFrom(codeButton, 2); }
    } else if (!m.ok) {
      codeStatus.replaceChildren(el('div', { class: 'feedback bad', text: `Error: ${m.error} — paste this message back to your AI helper.` }));
      sfx.bad();
    }
  }
});

async function boot() {
  me = await initPage();
  progress = loadProgress();
  config = cleanGameConfig(progress.game || DEFAULT_GAME);
  const [o, l] = await Promise.all([api('/api/lessons'), api(`/api/lessons/${n}`)]);
  outline = o.ok ? o.data.lessons : [];
  if (l.status === 402) { location.replace('/unlock.html?from=' + n); return; }
  if (!l.ok) { $('step').replaceChildren(el('h2', { text: 'Lesson not found' }), el('a', { href: '/path.html', text: 'Back to the path' })); return; }
  lesson = l.data.lesson;
  const access = lessonAccess(n, { total: outline.length, paid: me.paid, completed: progress.completed });
  document.title = `${lesson.title} · Gameillion`;
  $('title').textContent = `Lesson ${n}: ${lesson.title}`;
  if (access === 'locked') {
    $('step').replaceChildren(el('h2', { text: 'Not so fast! \u{1F512}' }), el('p', { text: `Finish lesson ${n - 1} first — each lesson builds on the last.` }), el('a', { class: 'btn', href: `/lesson.html?n=${n - 1}`, text: `Go to lesson ${n - 1}` }));
    $('next').hidden = true;
    return;
  }
  // Load the preview only now that the message listener is attached, so 'ready' is never missed.
  $('preview').src = '/play/game.html';
  $('next').addEventListener('click', next);
  $('overlay').addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('overlay').querySelector('.price')) closeOverlay(); });
  showStep();
}
boot();
