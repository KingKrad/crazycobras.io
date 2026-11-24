// Pure rules shared by the browser and the Worker. No DOM, no I/O.
// Every function here is covered by test/rules.test.js.

export const PRICE_CENTS = 1900;
export const CURRENCY = 'usd';
export const FREE_LESSON_COUNT = 3;
export const XP_PER_LESSON = 50;
export const XP_PERFECT_BONUS = 20;
export const MAX_PROGRESS_BYTES = 20000;

export function formatPrice(cents = PRICE_CENTS) {
  const whole = cents % 100 === 0;
  return '$' + (whole ? String(cents / 100) : (cents / 100).toFixed(2));
}

/** Lessons are numbered 1..N. The first FREE_LESSON_COUNT are free. */
export function isFreeLesson(n) {
  return Number.isInteger(n) && n >= 1 && n <= FREE_LESSON_COUNT;
}

/**
 * Can the learner open lesson n?
 * Needs: lesson exists, (free or paid), and the previous lesson is complete.
 */
export function lessonAccess(n, { total, paid, completed }) {
  if (!Number.isInteger(n) || n < 1 || n > total) return 'missing';
  if (!isFreeLesson(n) && !paid) return 'paywall';
  if (n > 1 && !(completed && completed[n - 1])) return 'locked';
  return 'open';
}

/** XP for finishing a lesson. A "perfect" lesson (no wrong quiz answers) earns a bonus. */
export function lessonXp({ mistakes = 0 } = {}) {
  return XP_PER_LESSON + (mistakes === 0 ? XP_PERFECT_BONUS : 0);
}

/** Level grows a little slower each time: level L needs 100*L*(L+1)/2 total XP. */
export function levelFromXp(xp) {
  let level = 1;
  while (xp >= (100 * level * (level + 1)) / 2) level++;
  const prev = (100 * (level - 1) * level) / 2;
  const next = (100 * level * (level + 1)) / 2;
  return { level, into: xp - prev, span: next - prev };
}

/** How big the celebration is: 0 small, 1 good, 2 great, 3 huge. */
export function celebrationTier({ mistakes = 0, streak = 0, unitDone = false } = {}) {
  if (unitDone) return 3;
  let tier = mistakes === 0 ? 2 : mistakes === 1 ? 1 : 0;
  if (streak > 0 && streak % 7 === 0) tier = 3;
  return tier;
}

/** Days between two YYYY-MM-DD strings (b - a). */
export function dayDiff(a, b) {
  const ta = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const tb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((tb - ta) / 86400000);
}

export function isDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Record learning on `today`. Same day: unchanged. Next day: +1. Gap: reset to 1. */
export function updateStreak(streak, today) {
  const s = streak && isDateStr(streak.last) ? streak : { count: 0, last: null, best: 0 };
  let count;
  if (!s.last) count = 1;
  else {
    const d = dayDiff(s.last, today);
    if (d <= 0) return { count: s.count, last: s.last, best: Math.max(s.best || 0, s.count) };
    count = d === 1 ? s.count + 1 : 1;
  }
  return { count, last: today, best: Math.max(s.best || 0, count) };
}

/** Streak as shown today: broken if the last day is more than 1 day ago. */
export function currentStreak(streak, today) {
  if (!streak || !isDateStr(streak.last)) return 0;
  return dayDiff(streak.last, today) <= 1 ? streak.count : 0;
}

export function emptyProgress() {
  return { v: 1, completed: {}, streak: { count: 0, last: null, best: 0 }, game: null, gameAt: 0 };
}

export function totalXp(progress) {
  return Object.values(progress.completed || {}).reduce((sum, c) => sum + (c.xp || 0), 0);
}

/** Mark lesson n complete. Keeps the best XP if replayed. */
export function completeLesson(progress, n, { mistakes = 0, today }) {
  const p = structuredClone(progress);
  const xp = lessonXp({ mistakes });
  const prev = p.completed[n];
  p.completed[n] = { xp: prev ? Math.max(prev.xp, xp) : xp, at: prev ? prev.at : today };
  p.streak = updateStreak(p.streak, today);
  return p;
}

/**
 * Sanitize untrusted progress (from localStorage or a request).
 * Unknown fields are dropped, bad values reset. Never throws.
 */
export function cleanProgress(raw, totalLessons = 12) {
  const out = emptyProgress();
  if (!raw || typeof raw !== 'object') return out;
  if (raw.completed && typeof raw.completed === 'object') {
    for (const [k, v] of Object.entries(raw.completed)) {
      const n = Number(k);
      if (!Number.isInteger(n) || n < 1 || n > totalLessons || !v || typeof v !== 'object') continue;
      const xp = Number(v.xp);
      if (!Number.isFinite(xp) || xp < 0 || xp > XP_PER_LESSON + XP_PERFECT_BONUS) continue;
      out.completed[n] = { xp, at: isDateStr(v.at) ? v.at : null };
    }
  }
  const s = raw.streak;
  if (s && isDateStr(s.last) && Number.isInteger(s.count) && s.count >= 0 && s.count < 100000) {
    out.streak = { count: s.count, last: s.last, best: Math.max(s.count, Number.isInteger(s.best) ? s.best : 0) };
  }
  if (raw.game && typeof raw.game === 'object') {
    out.game = cleanGameConfig(raw.game);
    out.gameAt = Number.isFinite(raw.gameAt) ? raw.gameAt : 0;
  }
  return out;
}

/**
 * Merge two progress records (device + account). Never loses a completed lesson.
 * Streak: the most recent wins; ties take the higher count. Game: newest edit wins.
 */
export function mergeProgress(a, b) {
  const x = cleanProgress(a), y = cleanProgress(b);
  const out = emptyProgress();
  for (const n of new Set([...Object.keys(x.completed), ...Object.keys(y.completed)])) {
    const ca = x.completed[n], cb = y.completed[n];
    if (!ca || !cb) { out.completed[n] = ca || cb; continue; }
    const at = [ca.at, cb.at].filter(Boolean).sort()[0] || null;
    out.completed[n] = { xp: Math.max(ca.xp, cb.xp), at };
  }
  const sa = x.streak, sb = y.streak;
  if (!sa.last) out.streak = sb;
  else if (!sb.last) out.streak = sa;
  else if (sa.last !== sb.last) out.streak = sa.last > sb.last ? sa : sb;
  else out.streak = sa.count >= sb.count ? sa : sb;
  out.streak = { ...out.streak, best: Math.max(sa.best || 0, sb.best || 0, out.streak.count) };
  if (x.gameAt >= y.gameAt) { out.game = x.game; out.gameAt = x.gameAt; }
  else { out.game = y.game; out.gameAt = y.gameAt; }
  if (!out.game) { out.game = x.game || y.game; }
  return out;
}

// ---------- Lesson goals (declarative, so lesson content can be plain JSON) ----------

export function checkGoal(goal, config, baseline) {
  if (!goal) return true;
  const v = config ? config[goal.key] : undefined;
  const b = baseline ? baseline[goal.key] : undefined;
  switch (goal.op) {
    case 'changed': return v !== undefined && v !== b;
    case 'eq': return v === goal.value;
    case 'gte': return typeof v === 'number' && v >= goal.value;
    case 'lte': return typeof v === 'number' && v <= goal.value;
    case 'between': return typeof v === 'number' && v >= goal.min && v <= goal.max;
    case 'minLength': return typeof v === 'string' && v.trim().length >= goal.value;
    default: return false;
  }
}

// ---------- The starter daily game ----------

export const DEFAULT_GAME = Object.freeze({
  name: 'Mysterillion',
  tagline: 'Guess today’s secret number.',
  emoji: '\u{1F52E}',
  max: 100,
  tries: 7,
  bg: '#1b1446',
  accent: '#ffc83d',
  hot: 'Scorching!',
  cold: 'Ice cold.',
  higher: 'Go higher',
  lower: 'Go lower',
  win: 'You found it!',
  epoch: '2026-01-01',
  hintCode: '',
});

const HEX = /^#[0-9a-fA-F]{6}$/;
function str(v, def, max) {
  return typeof v === 'string' && v.trim() ? v.slice(0, max) : def;
}
function int(v, def, min, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

export function cleanGameConfig(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_GAME;
  return {
    name: str(r.name, d.name, 30),
    tagline: str(r.tagline, d.tagline, 80),
    emoji: str(r.emoji, d.emoji, 8),
    max: int(r.max, d.max, 10, 1000),
    tries: int(r.tries, d.tries, 1, 20),
    bg: HEX.test(r.bg) ? r.bg : d.bg,
    accent: HEX.test(r.accent) ? r.accent : d.accent,
    hot: str(r.hot, d.hot, 40),
    cold: str(r.cold, d.cold, 40),
    higher: str(r.higher, d.higher, 40),
    lower: str(r.lower, d.lower, 40),
    win: str(r.win, d.win, 60),
    epoch: isDateStr(r.epoch) ? r.epoch : d.epoch,
    hintCode: typeof r.hintCode === 'string' ? r.hintCode.slice(0, 4000) : '',
  };
}

/** Small, stable string hash (FNV-1a). */
export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Same answer for everyone on the same day; different games get different answers. */
export function dailyAnswer(dateStr, config) {
  const c = cleanGameConfig(config);
  return (hashString(c.name.toLowerCase() + '|' + dateStr) % c.max) + 1;
}

export function puzzleNumber(dateStr, epoch = DEFAULT_GAME.epoch) {
  return Math.max(1, dayDiff(epoch, dateStr) + 1);
}

/** Result of one guess: 'win' | 'higher' | 'lower', plus heat 0..1 (1 = very close). */
export function judgeGuess(guess, answer, max) {
  if (guess === answer) return { result: 'win', heat: 1 };
  const heat = Math.max(0, 1 - Math.abs(guess - answer) / Math.max(1, max / 2));
  return { result: guess < answer ? 'higher' : 'lower', heat };
}

export function heatSquare(heat, result) {
  if (result === 'win') return '\u{1F7E9}';
  if (heat >= 0.9) return '\u{1F7E7}';
  if (heat >= 0.6) return '\u{1F7E8}';
  return '\u{1F7E6}';
}

/** Spoiler-free share text: shows how close each guess was, never the numbers. */
export function shareText({ config, dateStr, guesses, answer }) {
  const c = cleanGameConfig(config);
  const won = guesses.includes(answer);
  const squares = guesses
    .map((g) => {
      const j = judgeGuess(g, answer, c.max);
      return heatSquare(j.heat, j.result);
    })
    .join('');
  const score = won ? `${guesses.length}/${c.tries}` : `X/${c.tries}`;
  return `${c.emoji} ${c.name} #${puzzleNumber(dateStr, c.epoch)} ${score}\n${squares}`;
}

// ---------- Validation for server inputs ----------

export function isEmail(s) {
  return typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

export function normalizeEmail(s) {
  return String(s || '').trim().toLowerCase();
}

/** Showcase submissions: https URL only, short plain text. Returns {ok, value|error}. */
export function validateShowcaseEntry(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  const blurb = typeof r.blurb === 'string' ? r.blurb.trim() : '';
  const url = typeof r.url === 'string' ? r.url.trim() : '';
  if (title.length < 2 || title.length > 40) return { ok: false, error: 'Game name must be 2–40 characters.' };
  if (blurb.length > 140) return { ok: false, error: 'Description must be 140 characters or fewer.' };
  let u;
  try { u = new URL(url); } catch { return { ok: false, error: 'Enter a full link starting with https://' }; }
  if (u.protocol !== 'https:' || url.length > 300 || u.username || u.password) {
    return { ok: false, error: 'Enter a full link starting with https://' };
  }
  return { ok: true, value: { title, blurb, url: u.href } };
}
