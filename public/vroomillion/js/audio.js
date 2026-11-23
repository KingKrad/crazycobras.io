// Chiptune sound effects, synthesised with Web Audio. No audio files, no music.

let ctx = null;
let master = null;
let muted = false;
let engine = null;

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  // a limiter, so the loudest moments (the legendary fanfare) get louder without crackling
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -6;
  limit.knee.value = 4;
  limit.ratio.value = 12;
  limit.attack.value = 0.003;
  limit.release.value = 0.15;
  master.connect(limit).connect(ctx.destination);
  return true;
}

// Browsers only allow sound after a tap or key press.
export function unlock() {
  if (!ensure()) return;
  if (ctx.state === "suspended") ctx.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
export const isMuted = () => muted;

function tone(freq, dur, { type = "square", vol = 0.2, at = 0, slide = 0, out = master } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.2, at = 0, hp = 800 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

// filtered noise: type "bandpass" / "highpass" / "lowpass", optional sweep (filter glides to that frequency)
// and attack (seconds to swell in)
function noiseF(dur, { vol = 0.2, at = 0, type = "bandpass", freq = 1000, q = 1, sweep = 0, attack = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = ctx.createGain();
  if (attack) { g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); }
  else g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}
// a bass drum hit
const kick = (at = 0, vol = 0.4) => tone(150, 0.25, { type: "sine", vol, at, slide: 0.25 });

const N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880, C6: 1046.5, E6: 1318.5 };

export const sfx = {
  click: () => tone(660, 0.05, { vol: 0.12 }),
  move: () => tone(440, 0.04, { vol: 0.08 }),
  key: () => tone(900 + Math.random() * 200, 0.02, { vol: 0.04 }),
  deny: () => { tone(160, 0.12, { type: "sawtooth", vol: 0.15 }); tone(120, 0.16, { type: "sawtooth", vol: 0.15, at: 0.1 }); },
  tick: () => tone(1200, 0.03, { vol: 0.06 }),
  beep: () => tone(440, 0.14, { vol: 0.2 }),
  go: () => tone(880, 0.4, { vol: 0.22 }),
  lock: () => { tone(520, 0.05, { vol: 0.12 }); tone(780, 0.07, { vol: 0.12, at: 0.05 }); },
  nitro: () => { noise(0.5, { vol: 0.2, hp: 1500 }); tone(200, 0.5, { type: "sawtooth", vol: 0.12, slide: 4 }); },
  cash: () => [N.E5, N.G5, N.C6, N.E6].forEach((f, i) => tone(f, 0.08, { vol: 0.13, at: i * 0.05 })),
  buy: () => [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6].forEach((f, i) => tone(f, 0.1, { vol: 0.15, at: i * 0.08 })),
  flip: () => [0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.54, 0.63, 0.72, 0.81, 0.9].forEach((at, i) => tone(1500 + (i % 2) * 300, 0.03, { vol: 0.07, at })),
  ding: () => { tone(1320, 0.25, { vol: 0.16 }); tone(1980, 0.35, { vol: 0.1, at: 0.04 }); },
  bump: () => { noise(0.2, { vol: 0.3, hp: 300 }); tone(90, 0.2, { type: "square", vol: 0.2, slide: 0.5 }); },
  win: () => [N.C5, N.C5, N.C5, N.E5, N.G5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i === 7 ? 0.5 : 0.11, { vol: 0.18, at: i * 0.12 })),
  lose: () => [N.G4, N.F4, N.E4, N.C4].forEach((f, i) => tone(f, 0.25, { type: "triangle", vol: 0.22, at: i * 0.22 })),
  // Engine screaming up before a launch.
  rev: () => {
    tone(70, 0.55, { type: "sawtooth", vol: 0.16, slide: 3.2 });
    tone(140, 0.55, { type: "square", vol: 0.06, slide: 3 });
    noise(0.4, { vol: 0.05, hp: 2500, at: 0.15 });
  },
  // Off the line: a thump, a tyre screech and a whoosh, bigger for rarer answers.
  launch: (t) => {
    if (t === 0) { tone(90, 0.35, { type: "sawtooth", vol: 0.18, slide: 0.4 }); return; }
    tone(60, 0.3, { type: "square", vol: 0.25 + t * 0.03, slide: 0.5 });
    noise(0.25 + t * 0.12, { vol: 0.12 + t * 0.03, hp: 3500 });
    noise(0.5 + t * 0.15, { vol: 0.06 + t * 0.02, hp: 600, at: 0.1 });
    if (t >= 4) tone(220, 0.8, { type: "sawtooth", vol: 0.1, slide: 4, at: 0.05 });
  },
  // The car smashing through the answer card: glass, a thump, more of both for rarer answers.
  smash: (t) => {
    tone(70, 0.25, { type: "square", vol: 0.22 + t * 0.03, slide: 0.4 });
    noise(0.18 + t * 0.12, { vol: 0.16 + t * 0.04, hp: 2500 });
    for (let i = 0; i < 2 + t * 2; i++) tone(1800 + Math.random() * 2600, 0.04, { vol: 0.05, at: 0.03 + i * 0.035 });
    if (t >= 4) noise(0.6, { vol: 0.1, hp: 800, at: 0.08 });
  },
  bonk: () => { tone(140, 0.12, { type: "square", vol: 0.22, slide: 0.6 }); tone(95, 0.25, { type: "triangle", vol: 0.18, at: 0.1, slide: 0.7 }); noise(0.15, { vol: 0.1, hp: 300, at: 0.05 }); },
  shift: () => { noise(0.05, { vol: 0.12, hp: 1200 }); tone(320, 0.05, { vol: 0.06 }); },
  // Exhaust fire lighting up: a rushing whoosh, longer and brighter for rarer answers.
  whoosh: (t) => {
    noise(0.35 + t * 0.12, { vol: 0.06 + t * 0.02, hp: 900 });
    noise(0.2 + t * 0.08, { vol: 0.04 + t * 0.015, hp: 3000, at: 0.05 });
  },
  // A backfire on a gear shift: a sharp crack with a low thud under it.
  backfire: () => {
    noise(0.06, { vol: 0.22, hp: 400 });
    tone(55, 0.09, { type: "square", vol: 0.18, slide: 0.5 });
  },
  // A STALLED answer: the engine coughs out black smoke.
  sputter: () => [0, 0.16, 0.34].forEach((at, i) => { noise(0.08, { vol: 0.12 - i * 0.03, hp: 250, at }); tone(80 - i * 12, 0.08, { type: "square", vol: 0.1 - i * 0.02, at }); }),
  // Each tier has its own sound when it's revealed, grander as it gets rarer.
  tier: (t) => {
    if (t === 0) { tone(110, 0.3, { type: "sawtooth", vol: 0.18, slide: 0.5 }); noise(0.25, { vol: 0.1, hp: 200 }); return; }
    if (t === 1) { // TRAFFIC JAM: a plain two-note blip
      tone(N.C5, 0.07, { vol: 0.13 }); tone(N.E5, 0.12, { vol: 0.13, at: 0.07 });
      return;
    }
    if (t === 2) { // CRUISING: a bell chime with a sparkle
      [N.E5, N.A5, N.E6].forEach((f, i) => { tone(f, 0.5, { type: "triangle", vol: 0.16, at: i * 0.08 }); tone(f * 2, 0.25, { type: "sine", vol: 0.05, at: i * 0.08 }); });
      [0.3, 0.36, 0.42].forEach((at, i) => tone(2600 + i * 400, 0.05, { type: "sine", vol: 0.04, at }));
      return;
    }
    if (t === 3) { // FAST LANE: a crunchy power chord with a cymbal crash
      [N.G4 / 2, N.D4, N.G4].forEach((f) => { tone(f, 0.12, { type: "sawtooth", vol: 0.1 }); tone(f, 0.6, { type: "sawtooth", vol: 0.1, at: 0.14 }); });
      tone(N.G4 * 2, 0.6, { type: "square", vol: 0.05, at: 0.14 });
      noiseF(0.9, { vol: 0.12, at: 0.14, type: "highpass", freq: 5000 });
      kick(0.14, 0.3);
      return;
    }
    if (t === 4) { // TURBO: a synth riser, then a bass drop and a big chord stab
      tone(300, 0.35, { type: "sawtooth", vol: 0.07, slide: 4 });
      noiseF(0.35, { vol: 0.06, type: "bandpass", freq: 1500, sweep: 8000 });
      kick(0.36, 0.45);
      tone(110, 0.9, { type: "sine", vol: 0.35, at: 0.36, slide: 0.35 });
      [N.A4, N.C5, N.E5, N.A5].forEach((f) => tone(f, 0.55, { type: "sawtooth", vol: 0.06, at: 0.36 }));
      noiseF(1.1, { vol: 0.12, at: 0.36, type: "highpass", freq: 4500 });
      [0.6, 0.72, 0.84].forEach((at, i) => tone(N.A5 * (i + 2) / 2, 0.08, { vol: 0.06, at }));
      return;
    }
    // ONE IN A VROOMILLION: a fanfare, a held chord and a cheering crowd
    // louder than everything else in the game: this is the moment
    const brass = (f, dur, at) => { tone(f, dur, { type: "square", vol: 0.24, at }); tone(f * 1.005, dur, { type: "sawtooth", vol: 0.13, at }); tone(f / 2, dur, { type: "square", vol: 0.08, at }); };
    kick(0, 0.7);
    noiseF(1.4, { vol: 0.16, type: "highpass", freq: 4000 });
    [[N.G4, 0.12, 0], [N.G4, 0.12, 0.14], [N.G4, 0.12, 0.28], [N.C5, 0.5, 0.42], [N.G4, 0.14, 0.95], [N.C5, 0.14, 1.1], [N.E5, 1.3, 1.25]].forEach(([f, d, at]) => brass(f, d, at));
    [N.C4, N.G4, N.C5, N.E5].forEach((f) => tone(f, 1.6, { type: "triangle", vol: 0.16, at: 1.25 }));
    kick(1.25, 0.7);
    [1.3, 1.4, 1.5, 1.6, 1.7, 1.8].forEach((at, i) => tone([2093, 2637, 3136][i % 3], 0.06, { type: "sine", vol: 0.05, at }));
    sfx.crowd(0.4);
  },
  // A drumroll that speeds up and gets louder before a rare answer is revealed (dur in seconds),
  // with a tone rising underneath; bigger for rarer tiers.
  drumroll: (dur, t = 3) => {
    let at = 0, gap = 0.1;
    while (at < dur) {
      const k = at / dur;
      noiseF(0.06, { vol: 0.05 + k * (0.08 + (t - 3) * 0.03), at, type: "bandpass", freq: 1800 + k * 1200 });
      tone(180, 0.04, { type: "triangle", vol: 0.03 + k * 0.05, at });
      at += gap;
      gap = Math.max(0.028, gap * 0.9);
    }
    tone(110, dur, { type: "sawtooth", vol: 0.04 + (t - 3) * 0.015, slide: t >= 5 ? 6 : 4 });
    if (t >= 4) tone(55, dur, { type: "sine", vol: 0.12, slide: 3 });
  },
  // A stadium cheer: filtered noise swelling up, with whoops on top.
  crowd: (at = 0) => {
    noiseF(2.6, { vol: 0.16, at, type: "bandpass", freq: 900, q: 0.6, attack: 0.5 });
    noiseF(2.2, { vol: 0.07, at: at + 0.1, type: "bandpass", freq: 2400, q: 1, attack: 0.4 });
    for (let i = 0; i < 6; i++) tone(500 + Math.random() * 500, 0.35, { type: "sine", vol: 0.03, at: at + 0.3 + Math.random() * 1.4, slide: 1.6 + Math.random() });
  },
};

// An electric car's sounds (AMELIA'S TESSY), like a classic sci-fi spaceship: a deep throbbing hum,
// thruster rumble, arcade "pew" lasers and a hyperdrive whoosh. Nothing slides up and down like a siren.
export const ev = {
  // off the line: the hyperdrive kicks in (a rushing roar and a deep drop), lasers for the rare ones
  launch: (t) => {
    if (t === 0) { ev.sputter(); return; }
    noiseF(0.5 + t * 0.15, { vol: 0.12 + t * 0.02, type: "lowpass", freq: 300, sweep: 1500 + t * 500, attack: 0.05 });
    tone(70, 0.6 + t * 0.1, { type: "sawtooth", vol: 0.1, slide: 0.6 });
    tone(42, 0.7, { type: "sine", vol: 0.25, slide: 0.7 });
    for (let i = 0; i < Math.max(0, t - 2); i++) ev.zap(0.2 + i * 0.16);
  },
  // one classic laser shot: a quick falling "pew" with a faint echo
  zap: (at = 0) => {
    tone(1500, 0.14, { type: "square", vol: 0.07, at, slide: 0.22 });
    tone(1500, 0.14, { type: "square", vol: 0.025, at: at + 0.09, slide: 0.22 });
  },
  // thrusters lighting up: a low rushing roar that swells and fades
  whoosh: (t) => {
    noiseF(0.6 + t * 0.15, { vol: 0.08 + t * 0.02, type: "lowpass", freq: 900, q: 0.7, attack: 0.12 });
    noiseF(0.3, { vol: 0.04, type: "bandpass", freq: 2500, q: 1, at: 0.08, attack: 0.08 });
  },
  // a gear change: a single laser shot instead of a backfire
  backfire: () => ev.zap(0),
  // nitro: a hyperspace jump, a deep "vwoom" and a rush of noise
  nitro: () => {
    tone(90, 0.7, { type: "sawtooth", vol: 0.12, slide: 0.45 });
    tone(45, 0.8, { type: "sine", vol: 0.3, slide: 0.6 });
    noiseF(0.8, { vol: 0.14, type: "lowpass", freq: 400, sweep: 5000, attack: 0.15 });
  },
  // STALLED: the ship powers down, a falling hum and a few crackles
  sputter: () => {
    tone(110, 0.8, { type: "sawtooth", vol: 0.08, slide: 0.35 });
    [0.1, 0.3, 0.45].forEach((at) => noiseF(0.04, { vol: 0.06, type: "highpass", freq: 3000, at }));
  },
};

// A-DOG'S HONDEEZY's rocket booster: a deep rocket roar on every launch, louder for rarer answers,
// with crackle on top (the car's own engine sounds still play underneath).
export const rocket = {
  roar: (t) => {
    if (t <= 0) return;
    const dur = 1 + t * 0.35;
    noiseF(dur, { vol: 0.14 + t * 0.03, type: "lowpass", freq: 250, sweep: 900, attack: 0.08 });
    noiseF(dur * 0.8, { vol: 0.06 + t * 0.015, type: "bandpass", freq: 1800, q: 0.8, attack: 0.05 });
    tone(38, dur, { type: "sine", vol: 0.3, slide: 1.4 });
    for (let i = 0; i < 6 + t * 3; i++) noiseF(0.03, { vol: 0.07, type: "highpass", freq: 3500, at: 0.1 + Math.random() * dur * 0.8 });
  },
  // nitro: the booster throttles up again
  surge: () => { noiseF(0.9, { vol: 0.16, type: "lowpass", freq: 300, sweep: 2500, attack: 0.1 }); tone(45, 0.9, { type: "sine", vol: 0.28, slide: 1.6 }); },
};

// Engine drone that follows car speed (0..1).
// electric: a spaceship's engine instead (AMELIA'S TESSY): two low detuned tones and thruster rumble,
// throbbing slowly, that only get a little deeper and louder with speed
export function engineStart(electric = false) {
  if (!ctx || engine) return;
  if (electric) {
    const g = ctx.createGain();
    g.gain.value = 0;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 400;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    o.type = o2.type = "sawtooth";
    o.frequency.value = 55;
    o2.frequency.value = 55.8;
    // thruster rumble: looping noise through a low band
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = ctx.createBufferSource();
    n.buffer = buf;
    n.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "lowpass";
    nf.frequency.value = 500;
    const ng = ctx.createGain();
    ng.gain.value = 0.25;
    // a slow throb on the whole hum
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5;
    lg.gain.value = 0.3;
    const throb = ctx.createGain();
    throb.gain.value = 0.7;
    lfo.connect(lg).connect(throb.gain);
    o.connect(f); o2.connect(f); n.connect(nf).connect(ng).connect(f);
    f.connect(throb).connect(g).connect(master);
    for (const x of [o, o2, n, lfo]) x.start();
    engine = { o, o2, n, lfo, g, f, ng, electric: true };
    return;
  }
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  o.type = "sawtooth";
  o.frequency.value = 50;
  f.type = "lowpass";
  f.frequency.value = 500;
  g.gain.value = 0;
  o.connect(f).connect(g).connect(master);
  o.start();
  engine = { o, g, f };
}
export function engineSet(speed) {
  if (!engine) return;
  const t = ctx.currentTime;
  if (engine.electric) {
    // barely any pitch change (no siren): the hum opens up, the thrusters roar and the throb quickens
    engine.o.frequency.setTargetAtTime(52 + speed * 14, t, 0.3);
    engine.o2.frequency.setTargetAtTime(52.8 + speed * 14, t, 0.3);
    engine.f.frequency.setTargetAtTime(300 + speed * 900, t, 0.25);
    engine.ng.gain.setTargetAtTime(0.2 + speed * 0.6, t, 0.25);
    engine.lfo.frequency.setTargetAtTime(4 + speed * 5, t, 0.3);
    engine.g.gain.setTargetAtTime(0.06 + speed * 0.1, t, 0.25);
    return;
  }
  engine.o.frequency.setTargetAtTime(48 + speed * 150, t, 0.08);
  engine.f.frequency.setTargetAtTime(350 + speed * 1400, t, 0.08);
  engine.g.gain.setTargetAtTime(0.03 + speed * 0.09, t, 0.08);
}
export function engineStop() {
  if (!engine) return;
  const e = engine;
  engine = null;
  e.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  for (const x of [e.o, e.o2, e.n, e.lfo]) x?.stop(ctx.currentTime + 0.5);
}
