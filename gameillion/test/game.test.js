// The starter game is a classic script (it must run sandboxed and as a single downloaded file),
// so it carries its own copy of the puzzle maths. This test proves that copy matches rules.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as R from '../public/js/rules.js';

const src = readFileSync(new URL('../public/play/game.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const G = sandbox.window.__gameLogic;

test('game.js puzzle logic matches rules.js', () => {
  const cfg = R.cleanGameConfig({ name: 'Moonillion', max: 250, tries: 8, emoji: 'M' });
  for (let d = 1; d <= 31; d++) {
    const date = `2026-03-${String(d).padStart(2, '0')}`;
    assert.equal(G.dailyAnswer(date, cfg), R.dailyAnswer(date, cfg));
    assert.equal(G.puzzleNumber(date, cfg.epoch), R.puzzleNumber(date, cfg.epoch));
  }
  for (const [g, a] of [[10, 200], [190, 200], [200, 200], [240, 3]]) {
    assert.deepEqual({ ...G.judgeGuess(g, a, 250) }, R.judgeGuess(g, a, 250));
  }
  const guesses = [125, 190, 200];
  assert.equal(G.shareText(cfg, '2026-03-05', guesses, 200), R.shareText({ config: cfg, dateStr: '2026-03-05', guesses, answer: 200 }));
});
