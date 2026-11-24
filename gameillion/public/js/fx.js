// Juice: particles, screen shake and synthesized sound. Everything scales with "tier" (0-3).
// Heavy effects are turned down automatically on slow devices and skipped for reduced motion.
import { loadSettings, prefersReducedMotion } from './store.js';

let canvas, ctx, particles = [], running = false, lowPower = null;
const frameTimes = [];

function detectLowPower() {
  const s = loadSettings();
  if (s.effects === 'low') return true;
  if (s.effects === 'high') return false;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  return cores <= 2 || mem <= 2;
}

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.id = 'fx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);
}

const COLORS = ['#ffc83d', '#ffe27a', '#2fe0c8', '#ff6fb5', '#a58bff', '#ffffff'];

function spawn(x, y, count, power) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (2 + Math.random() * 6) * power;
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3 * power,
      life: 1, decay: 0.008 + Math.random() * 0.012,
      size: 4 + Math.random() * 6, spin: Math.random() * 6, rot: Math.random() * 6,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: Math.random() < 0.45 ? 'coin' : Math.random() < 0.5 ? 'star' : 'rect',
    });
  }
}

function drawStar(r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

let last = 0;
function tick(t) {
  const dt = last ? t - last : 16;
  last = t;
  if (lowPower === false && frameTimes.length < 40) {
    frameTimes.push(dt);
    if (frameTimes.length === 40) {
      const avg = frameTimes.slice(5).reduce((a, b) => a + b, 0) / 35;
      if (avg > 24) lowPower = true; // device is struggling: fewer particles from now on
    }
  }
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const k = Math.min(dt / 16.7, 3);
  particles = particles.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of particles) {
    p.vy += 0.18 * k;
    p.vx *= 0.99;
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.rot += p.spin * 0.02 * k;
    p.life -= p.decay * k;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 'coin') {
      ctx.scale(Math.abs(Math.cos(p.rot * 2)) * 0.8 + 0.2, 1);
      ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9961a'; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2); ctx.fill();
    } else if (p.shape === 'star') drawStar(p.size);
    else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }
  if (particles.length) requestAnimationFrame(tick);
  else { running = false; last = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}

/** Burst of coins/stars at (x, y). tier 0..3 scales count and power. */
export function burst(x, y, tier = 1) {
  if (prefersReducedMotion()) return;
  if (lowPower === null) lowPower = detectLowPower();
  ensureCanvas();
  const base = [10, 28, 60, 120][Math.max(0, Math.min(3, tier))];
  spawn(x, y, lowPower ? Math.ceil(base / 3) : base, 0.7 + tier * 0.25);
  if (!running) { running = true; requestAnimationFrame(tick); }
}

export function burstFrom(el, tier = 1) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, tier);
}

/** Big win: several bursts across the screen. */
export function celebrate(tier = 2) {
  if (prefersReducedMotion()) return;
  burst(innerWidth / 2, innerHeight * 0.45, tier);
  if (tier >= 2) {
    setTimeout(() => burst(innerWidth * 0.2, innerHeight * 0.6, tier - 1), 180);
    setTimeout(() => burst(innerWidth * 0.8, innerHeight * 0.6, tier - 1), 320);
  }
  if (tier >= 3) setTimeout(() => burst(innerWidth / 2, innerHeight * 0.3, 3), 520);
}

export function shake(el = document.body) {
  if (prefersReducedMotion()) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

// ---------- Sound (synthesized, no audio files) ----------
let ac = null;
function audio() {
  if (!loadSettings().sound) return null;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch { return null; }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.15, slide = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  tap() { tone(660, 0, 0.06, { type: 'triangle', vol: 0.08, slide: 1.4 }); },
  good() { tone(784, 0, 0.12, { type: 'triangle' }); tone(1175, 0.08, 0.18, { type: 'triangle' }); },
  bad() { tone(220, 0, 0.18, { type: 'square', vol: 0.06, slide: 0.7 }); },
  coin() { tone(988, 0, 0.08, { type: 'square', vol: 0.06 }); tone(1319, 0.07, 0.22, { type: 'square', vol: 0.06 }); },
  /** Rising arpeggio; longer and brighter for bigger tiers. */
  win(tier = 2) {
    const notes = [523, 659, 784, 1047, 1319, 1568];
    const n = 3 + Math.min(3, tier);
    for (let i = 0; i < n; i++) tone(notes[i], i * 0.09, 0.3, { type: 'triangle', vol: 0.12 });
    if (tier >= 3) { tone(1047, n * 0.09, 0.6, { type: 'sine', vol: 0.14 }); tone(1568, n * 0.09, 0.6, { type: 'sine', vol: 0.08 }); }
  },
  countdown(i) { tone(i === 0 ? 1047 : 523, 0, i === 0 ? 0.5 : 0.15, { type: 'square', vol: 0.07 }); },
};
