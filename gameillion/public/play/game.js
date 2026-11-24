/* The starter daily game. Classic script with no imports, so the exact same file works:
 *  - inside the course preview (sandboxed iframe, settings arrive via postMessage), and
 *  - as the learner's own downloaded game (settings baked into window.GAME_CONFIG).
 * The puzzle maths mirrors public/js/rules.js and is checked against it in test/game.test.js.
 */
(function () {
  'use strict';

  var DEFAULTS = {
    name: 'Mysterillion', tagline: 'Guess today’s secret number.', emoji: '\u{1F52E}', max: 100, tries: 7,
    bg: '#1b1446', accent: '#ffc83d', hot: 'Scorching!', cold: 'Ice cold.', higher: 'Go higher', lower: 'Go lower',
    win: 'You found it!', epoch: '2026-01-01', hintCode: '',
  };

  // ---------- pure puzzle logic (kept identical to rules.js) ----------
  function hashString(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function dayDiff(a, b) {
    var ta = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
    var tb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
    return Math.round((tb - ta) / 86400000);
  }
  function dailyAnswer(dateStr, c) { return (hashString(c.name.toLowerCase() + '|' + dateStr) % c.max) + 1; }
  function puzzleNumber(dateStr, epoch) { return Math.max(1, dayDiff(epoch, dateStr) + 1); }
  function judgeGuess(guess, answer, max) {
    if (guess === answer) return { result: 'win', heat: 1 };
    var heat = Math.max(0, 1 - Math.abs(guess - answer) / Math.max(1, max / 2));
    return { result: guess < answer ? 'higher' : 'lower', heat: heat };
  }
  function heatSquare(heat, result) {
    if (result === 'win') return '\u{1F7E9}';
    if (heat >= 0.9) return '\u{1F7E7}';
    if (heat >= 0.6) return '\u{1F7E8}';
    return '\u{1F7E6}';
  }
  function shareText(c, dateStr, guesses, answer) {
    var won = guesses.indexOf(answer) !== -1;
    var sq = guesses.map(function (g) { var j = judgeGuess(g, answer, c.max); return heatSquare(j.heat, j.result); }).join('');
    return c.emoji + ' ' + c.name + ' #' + puzzleNumber(dateStr, c.epoch) + ' ' + (won ? guesses.length : 'X') + '/' + c.tries + '\n' + sq;
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  window.__gameLogic = { hashString: hashString, dailyAnswer: dailyAnswer, puzzleNumber: puzzleNumber, judgeGuess: judgeGuess, shareText: shareText };
  if (typeof document === 'undefined') return; // loaded in tests

  // ---------- storage that survives sandboxing ----------
  var mem = {};
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return mem[k] || null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
  };

  var preview = !window.GAME_CONFIG;
  var cfg = Object.assign({}, DEFAULTS, window.GAME_CONFIG || {});
  var hintFn = null;
  var state;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function post(msg) { if (preview && window.parent !== window) window.parent.postMessage(msg, '*'); }

  function compileHint() {
    hintFn = null;
    if (!cfg.hintCode || !cfg.hintCode.trim()) return post({ type: 'code', ok: true, empty: true });
    try {
      var fn = new Function('guess', 'answer', 'max', cfg.hintCode);
      var sample = fn(30, 42, 100);
      if (sample !== undefined && typeof sample !== 'string') throw new Error('Your code should return text (a string), but it returned ' + typeof sample + '.');
      hintFn = fn;
      post({ type: 'code', ok: true, sample: sample || '' });
    } catch (e) {
      post({ type: 'code', ok: false, error: String(e && e.message || e) });
    }
  }

  function newRound(practice) {
    var date = today();
    var answer = practice ? 1 + Math.floor(Math.random() * cfg.max) : dailyAnswer(date, cfg);
    state = { date: date, answer: answer, guesses: [], done: false, practice: !!practice };
    if (!preview && !practice) {
      var saved = store.get('daily_' + cfg.name);
      if (saved && saved.date === date) state.guesses = saved.guesses.filter(function (g) { return typeof g === 'number'; });
    }
    render();
  }

  function applyTheme() {
    document.documentElement.style.setProperty('--bg', cfg.bg);
    document.documentElement.style.setProperty('--accent', cfg.accent);
    document.title = cfg.name;
    $('emoji').textContent = cfg.emoji;
    $('name').textContent = cfg.name;
    $('tagline').textContent = cfg.tagline;
    $('num').max = cfg.max;
    $('num').setAttribute('aria-label', 'Your guess, from 1 to ' + cfg.max);
    $('num').placeholder = '1 – ' + cfg.max;
  }

  function hintFor(g) {
    var j = judgeGuess(g, state.answer, cfg.max);
    if (j.result === 'win') return cfg.win;
    var custom = '';
    if (hintFn) { try { custom = hintFn(g, state.answer, cfg.max) || ''; } catch (e) { custom = ''; } }
    var temp = custom || (j.heat >= 0.9 ? cfg.hot : j.heat < 0.4 ? cfg.cold : '');
    return (j.result === 'higher' ? cfg.higher + ' ↑' : cfg.lower + ' ↓') + (temp ? ' · ' + temp : '');
  }

  function render() {
    applyTheme();
    $('puzzle').textContent = (state.practice ? 'Practice round' : '#' + puzzleNumber(state.date, cfg.epoch)) + ' · ' + cfg.tries + ' tries';
    var list = $('hints');
    list.replaceChildren();
    state.guesses.forEach(function (g) {
      var j = judgeGuess(g, state.answer, cfg.max);
      var li = document.createElement('li');
      li.className = j.result === 'win' ? 'win' : '';
      li.style.setProperty('--heat', String(j.heat));
      var n = document.createElement('b'); n.textContent = String(g);
      var t = document.createElement('span'); t.textContent = hintFor(g);
      li.append(n, t);
      list.append(li);
    });
    var left = cfg.tries - state.guesses.length;
    var won = state.guesses.indexOf(state.answer) !== -1;
    state.done = won || left <= 0;
    var dots = $('dots');
    dots.replaceChildren();
    for (var i = 0; i < cfg.tries; i++) {
      var d = document.createElement('i');
      if (i < state.guesses.length) d.className = 'used';
      dots.append(d);
    }
    dots.setAttribute('aria-label', left + ' tries left');
    $('form').hidden = state.done;
    $('end').hidden = !state.done;
    if (state.done) {
      $('endTitle').textContent = won ? cfg.emoji + ' ' + cfg.win : 'The number was ' + state.answer;
      $('endText').textContent = won ? 'Solved in ' + state.guesses.length + '/' + cfg.tries + '.' : 'So close. Try again tomorrow!';
      var streak = store.get('streak_' + cfg.name) || { count: 0 };
      $('streak').textContent = state.practice || preview ? '' : '\u{1F525} Streak: ' + streak.count;
      $('again').hidden = !preview && !state.practice;
    }
  }

  function guess() {
    if (state.done) return;
    var input = $('num');
    var g = Math.round(Number(input.value));
    if (!Number.isFinite(g) || g < 1 || g > cfg.max) {
      $('msg').textContent = 'Pick a whole number from 1 to ' + cfg.max + '.';
      bump($('form'));
      return;
    }
    if (state.guesses.indexOf(g) !== -1) { $('msg').textContent = 'You already tried ' + g + '.'; bump($('form')); return; }
    $('msg').textContent = '';
    state.guesses.push(g);
    input.value = '';
    var j = judgeGuess(g, state.answer, cfg.max);
    if (!preview && !state.practice) store.set('daily_' + cfg.name, { date: state.date, guesses: state.guesses });
    render();
    var last = $('hints').lastElementChild;
    if (last && !reduce) { last.classList.add('pop'); }
    if (j.result === 'win') { onWin(); }
    else if (state.done) { post({ type: 'lose' }); bump(document.body); }
    else { post({ type: 'guess', heat: j.heat }); if (j.heat < 0.4) bump(last); input.focus(); }
    $('live').textContent = j.result === 'win' ? cfg.win : hintFor(g);
  }

  function onWin() {
    if (!preview && !state.practice) {
      var s = store.get('streak_' + cfg.name) || { count: 0, last: null };
      if (s.last !== state.date) {
        s.count = s.last && dayDiff(s.last, state.date) === 1 ? s.count + 1 : 1;
        s.last = state.date;
        store.set('streak_' + cfg.name, s);
      }
      render();
    }
    confetti(state.guesses.length <= Math.ceil(cfg.tries / 2) ? 90 : 50);
    post({ type: 'win', guesses: state.guesses.length });
  }

  function bump(node) {
    if (!node || reduce) return;
    node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump');
  }

  function confetti(n) {
    if (reduce) return;
    var c = $('fx'), ctx = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    var ps = [];
    for (var i = 0; i < n; i++) ps.push({ x: innerWidth / 2, y: innerHeight / 2, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 2, life: 1, col: i % 3 ? cfg.accent : '#ffffff', s: 4 + Math.random() * 5 });
    (function step() {
      ctx.clearRect(0, 0, c.width, c.height);
      ps = ps.filter(function (p) { return p.life > 0; });
      ps.forEach(function (p) { p.vy += .3; p.x += p.vx; p.y += p.vy; p.life -= .012; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.s, p.s); });
      if (ps.length) requestAnimationFrame(step); else ctx.clearRect(0, 0, c.width, c.height);
    })();
  }

  function share() {
    var text = shareText(cfg, state.date, state.guesses, state.answer);
    if (navigator.share && !preview) { navigator.share({ text: text }).catch(function () {}); return; }
    var done = function () { $('shareMsg').textContent = 'Copied! Paste it in your group chat.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { $('shareMsg').textContent = text; });
    else $('shareMsg').textContent = text;
    post({ type: 'share', text: text });
  }

  window.addEventListener('message', function (e) {
    if (!preview || e.source !== window.parent) return;
    var m = e.data || {};
    if (m.type === 'config' && m.config && typeof m.config === 'object') {
      var prevName = cfg.name, prevMax = cfg.max;
      cfg = Object.assign({}, DEFAULTS, m.config);
      compileHint();
      if (cfg.name !== prevName || cfg.max !== prevMax || !state) newRound(state && state.practice);
      else render();
      if (m.flash) { bump($('card')); }
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    $('go').addEventListener('click', guess);
    $('num').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); guess(); } });
    $('share').addEventListener('click', share);
    $('again').addEventListener('click', function () { newRound(true); $('num').focus(); });
    compileHint();
    newRound(false);
    post({ type: 'ready' });
  });
})();
