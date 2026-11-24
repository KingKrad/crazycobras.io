import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../public/js/rules.js';

test('price formats as $19', () => {
  assert.equal(R.PRICE_CENTS, 1900);
  assert.equal(R.formatPrice(), '$19');
  assert.equal(R.formatPrice(1950), '$19.50');
});

test('first 3 lessons are free', () => {
  assert.equal(R.isFreeLesson(1), true);
  assert.equal(R.isFreeLesson(3), true);
  assert.equal(R.isFreeLesson(4), false);
  assert.equal(R.isFreeLesson(0), false);
});

test('lessonAccess: paywall, order lock, open', () => {
  const total = 12;
  assert.equal(R.lessonAccess(1, { total, paid: false, completed: {} }), 'open');
  assert.equal(R.lessonAccess(2, { total, paid: false, completed: {} }), 'locked');
  assert.equal(R.lessonAccess(2, { total, paid: false, completed: { 1: {} } }), 'open');
  assert.equal(R.lessonAccess(4, { total, paid: false, completed: { 1: {}, 2: {}, 3: {} } }), 'paywall');
  assert.equal(R.lessonAccess(4, { total, paid: true, completed: { 3: {} } }), 'open');
  assert.equal(R.lessonAccess(13, { total, paid: true, completed: {} }), 'missing');
  assert.equal(R.lessonAccess('1', { total, paid: true, completed: {} }), 'missing');
});

test('xp and levels', () => {
  assert.equal(R.lessonXp({ mistakes: 0 }), 70);
  assert.equal(R.lessonXp({ mistakes: 2 }), 50);
  assert.deepEqual(R.levelFromXp(0), { level: 1, into: 0, span: 100 });
  assert.equal(R.levelFromXp(100).level, 2);
  assert.equal(R.levelFromXp(299).level, 2);
  assert.equal(R.levelFromXp(300).level, 3);
});

test('celebration scales with performance', () => {
  assert.equal(R.celebrationTier({ mistakes: 3 }), 0);
  assert.equal(R.celebrationTier({ mistakes: 1 }), 1);
  assert.equal(R.celebrationTier({ mistakes: 0 }), 2);
  assert.equal(R.celebrationTier({ mistakes: 2, streak: 7 }), 3);
  assert.equal(R.celebrationTier({ unitDone: true }), 3);
});

test('streaks: first day, same day, next day, gap', () => {
  let s = R.updateStreak(null, '2026-11-20');
  assert.deepEqual(s, { count: 1, last: '2026-11-20', best: 1 });
  s = R.updateStreak(s, '2026-11-20');
  assert.equal(s.count, 1);
  s = R.updateStreak(s, '2026-11-21');
  assert.equal(s.count, 2);
  s = R.updateStreak(s, '2026-11-24');
  assert.deepEqual(s, { count: 1, last: '2026-11-24', best: 2 });
  assert.equal(R.currentStreak({ count: 5, last: '2026-11-23' }, '2026-11-24'), 5);
  assert.equal(R.currentStreak({ count: 5, last: '2026-11-21' }, '2026-11-24'), 0);
  // month and year boundaries
  assert.equal(R.updateStreak({ count: 3, last: '2026-12-31', best: 3 }, '2027-01-01').count, 4);
});

test('completeLesson keeps best xp and earliest date', () => {
  let p = R.emptyProgress();
  p = R.completeLesson(p, 1, { mistakes: 2, today: '2026-11-20' });
  assert.equal(p.completed[1].xp, 50);
  p = R.completeLesson(p, 1, { mistakes: 0, today: '2026-11-21' });
  assert.deepEqual(p.completed[1], { xp: 70, at: '2026-11-20' });
  assert.equal(R.totalXp(p), 70);
  assert.equal(p.streak.count, 2);
});

test('cleanProgress drops junk and never throws', () => {
  assert.deepEqual(R.cleanProgress(null), R.emptyProgress());
  assert.deepEqual(R.cleanProgress('x'), R.emptyProgress());
  const p = R.cleanProgress({
    completed: { 1: { xp: 70, at: '2026-11-20' }, 99: { xp: 50 }, 2: { xp: 9999 }, x: {} },
    streak: { count: 'lots', last: 'yesterday' },
    evil: '<script>',
  });
  assert.deepEqual(Object.keys(p.completed), ['1']);
  assert.equal(p.streak.count, 0);
  assert.equal(p.evil, undefined);
});

test('mergeProgress never loses lessons and picks newest game + streak', () => {
  const device = {
    completed: { 1: { xp: 50, at: '2026-11-21' }, 2: { xp: 70, at: '2026-11-21' } },
    streak: { count: 2, last: '2026-11-22', best: 2 },
    game: { name: 'Device game' }, gameAt: 200,
  };
  const account = {
    completed: { 1: { xp: 70, at: '2026-11-20' }, 3: { xp: 50, at: '2026-11-22' } },
    streak: { count: 9, last: '2026-11-15', best: 9 },
    game: { name: 'Old game' }, gameAt: 100,
  };
  const m = R.mergeProgress(device, account);
  assert.deepEqual(Object.keys(m.completed).sort(), ['1', '2', '3']);
  assert.deepEqual(m.completed[1], { xp: 70, at: '2026-11-20' });
  assert.equal(m.streak.count, 2);
  assert.equal(m.streak.best, 9);
  assert.equal(m.game.name, 'Device game');
  // merge is symmetric for lessons
  assert.deepEqual(R.mergeProgress(account, device).completed, m.completed);
});

test('checkGoal ops', () => {
  const base = { name: 'A', max: 100 };
  assert.equal(R.checkGoal({ key: 'name', op: 'changed' }, { name: 'B' }, base), true);
  assert.equal(R.checkGoal({ key: 'name', op: 'changed' }, { name: 'A' }, base), false);
  assert.equal(R.checkGoal({ key: 'max', op: 'gte', value: 200 }, { max: 250 }), true);
  assert.equal(R.checkGoal({ key: 'max', op: 'between', min: 10, max: 50 }, { max: 60 }), false);
  assert.equal(R.checkGoal({ key: 'tagline', op: 'minLength', value: 5 }, { tagline: ' hi ' }), false);
  assert.equal(R.checkGoal({ key: 'x', op: 'nope' }, {}), false);
  assert.equal(R.checkGoal(null, {}), true);
});

test('game config is clamped and sanitized', () => {
  const c = R.cleanGameConfig({ max: 5, tries: 99, bg: 'red', name: '   ', accent: '#00ff00' });
  assert.equal(c.max, 10);
  assert.equal(c.tries, 20);
  assert.equal(c.bg, R.DEFAULT_GAME.bg);
  assert.equal(c.name, R.DEFAULT_GAME.name);
  assert.equal(c.accent, '#00ff00');
});

test('daily answer is stable per day and in range', () => {
  const cfg = { name: 'Testillion', max: 50 };
  const a = R.dailyAnswer('2026-11-24', cfg);
  assert.equal(a, R.dailyAnswer('2026-11-24', cfg));
  for (let d = 1; d <= 28; d++) {
    const v = R.dailyAnswer(`2026-02-${String(d).padStart(2, '0')}`, cfg);
    assert.ok(v >= 1 && v <= 50);
  }
  assert.equal(R.puzzleNumber('2026-01-01'), 1);
  assert.equal(R.puzzleNumber('2026-01-10'), 10);
});

test('judgeGuess and spoiler-free share text', () => {
  assert.deepEqual(R.judgeGuess(5, 5, 100), { result: 'win', heat: 1 });
  assert.equal(R.judgeGuess(10, 50, 100).result, 'higher');
  assert.equal(R.judgeGuess(90, 50, 100).result, 'lower');
  const text = R.shareText({ config: { name: 'Mysterillion', tries: 7, emoji: 'X' }, dateStr: '2026-01-03', guesses: [50, 75, 62], answer: 62 });
  assert.match(text, /^X Mysterillion #3 3\/7\n/);
  assert.ok(!text.includes('62'.padStart(3, ' ')) && !/\b(50|75|62)\b/.test(text.split('\n')[1]));
  assert.ok(text.endsWith('\u{1F7E9}'));
  const lost = R.shareText({ config: { tries: 2 }, dateStr: '2026-01-01', guesses: [1, 2], answer: 90 });
  assert.match(lost, /X\/2/);
});

test('email and showcase validation', () => {
  assert.equal(R.isEmail('a@b.co'), true);
  assert.equal(R.isEmail('nope'), false);
  assert.equal(R.normalizeEmail('  A@B.Co '), 'a@b.co');
  assert.equal(R.validateShowcaseEntry({ title: 'Moonillion', url: 'https://moon.example/' }).ok, true);
  assert.equal(R.validateShowcaseEntry({ title: 'M', url: 'https://x.y' }).ok, false);
  assert.equal(R.validateShowcaseEntry({ title: 'Moon', url: 'javascript:alert(1)' }).ok, false);
  assert.equal(R.validateShowcaseEntry({ title: 'Moon', url: 'http://x.y' }).ok, false);
  assert.equal(R.validateShowcaseEntry({ title: 'Moon', url: 'https://u:p@x.y' }).ok, false);
  assert.equal(R.validateShowcaseEntry({ title: 'Moon', url: 'https://x.y', blurb: 'z'.repeat(141) }).ok, false);
});
