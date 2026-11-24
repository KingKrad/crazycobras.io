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
function noiseF(dur, { vol = 0.2, at = 0, type = "bandpass", freq = 1000, q = 1, sweep = 0, attack = 0, out = master } = {}) {
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
  src.connect(f).connect(g).connect(out);
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

// NICO'S CRAZY CAR: a V12 scream on launch and big exhaust pops and crackles on every gear change.
export const v12 = {
  scream: (t) => {
    if (t <= 0) return;
    const dur = 0.6 + t * 0.15;
    for (const [mul, vol] of [[1, 0.09], [1.5, 0.06], [2, 0.05], [3, 0.025]]) tone(180 * mul, dur, { type: "sawtooth", vol, slide: 2.4 + t * 0.2 });
    noiseF(dur, { vol: 0.05, type: "bandpass", freq: 2000, sweep: 5000, q: 1.5 });
    v12.pop(t, 0.2);
  },
  // a string of pops and bangs, more for rarer answers
  pop: (t = 3, at = 0) => {
    const n = 2 + Math.min(4, Math.max(0, t - 1));
    for (let k = 0; k < n; k++) {
      const a = at + k * (0.06 + Math.random() * 0.05);
      noiseF(0.05, { vol: 0.2 + Math.random() * 0.08, type: "highpass", freq: 500, at: a });
      tone(60 + Math.random() * 30, 0.08, { type: "square", vol: 0.16, slide: 0.5, at: a });
    }
  },
};


// ZIG'S WHIP: everything is reggae. Sounds go through a dub echo (a tape-style delay that repeats and
// fades), so every backfire is a rimshot that echoes "pop... pop.. pop.", launches blow an air horn,
// rare answers wail a dub siren, and the engine itself is a one-drop rhythm with a deep bassline.
let dubIn = null;
function dub() {
  if (dubIn || !ctx) return dubIn;
  dubIn = ctx.createGain();
  const delay = ctx.createDelay(1.5), fb = ctx.createGain(), tape = ctx.createBiquadFilter(), wet = ctx.createGain();
  delay.delayTime.value = 0.36; // a dotted-eighth at about 125 bpm
  fb.gain.value = 0.48;
  tape.type = "lowpass"; tape.frequency.value = 1800;
  wet.gain.value = 0.7;
  dubIn.connect(master);
  dubIn.connect(delay);
  delay.connect(tape).connect(fb).connect(delay);
  tape.connect(wet).connect(master);
  return dubIn;
}
const NR = { D2: 73.4, E2: 82.4, F2: 87.3, G2: 98, A2: 110, C3: 130.8, D3: 146.8, E3: 164.8, G3: 196, A3: 220, B3: 246.9, C4: 261.6, D4: 293.7, E4: 329.6, Fs4: 370, G4: 392, A4: 440 };
// a dub siren: a square wave whose pitch wobbles fast and climbs (or falls)
function siren(dur, { from = 500, to = 1100, rate = 7, depth = 90, vol = 0.07, at = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
  lfo.type = "triangle"; lfo.frequency.value = rate; lg.gain.value = depth;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
  g.gain.setValueAtTime(vol, t + dur * 0.75);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(dub());
  for (const x of [o, lfo]) { x.start(t); x.stop(t + dur + 0.05); }
}
// the offbeat guitar "skank": a short bright chord chop
const skank = (notes, at = 0, vol = 0.03, out) => { for (const f of notes) { tone(f * 2, 0.07, { type: "square", vol, at, out }); tone(f * 4, 0.04, { type: "triangle", vol: vol * 0.6, at, out }); } };
const rim = (at = 0, vol = 0.12, out) => { noiseF(0.04, { vol, at, type: "bandpass", freq: 2400, q: 3, out }); tone(820, 0.03, { type: "triangle", vol: vol * 0.8, at, out }); };
// ZIG'S WHIP's exhaust is a real recording (audio/zig-exhaust.mp3), loaded once when the truck races
let zigClip = null, zigLoading = null;
export function loadZigExhaust() {
  if (!ctx || zigClip || zigLoading) return;
  zigLoading = fetch("/vroomillion/audio/zig-exhaust.mp3")
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("missing"))))
    .then((b) => new Promise((ok, bad) => ctx.decodeAudioData(b, ok, bad)))
    .then((buf) => { zigClip = buf; })
    .catch(() => { zigLoading = null; }); // the synth sounds stand in if it can't load
}
// play some or all of the recording: rate pitches it up (faster) or down; echo sends a copy into the dub delay
function clip(buf, { rate = 1, vol = 0.6, at = 0, offset = 0, dur = 0, echo = 0 } = {}) {
  if (!ctx || !buf) return false;
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const len = (dur || buf.duration - offset) / rate;
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol, t + Math.max(0, len - 0.06));
  g.gain.linearRampToValueAtTime(0, t + len);
  src.connect(g).connect(master);
  if (echo) { const e = ctx.createGain(); e.gain.value = echo; g.connect(e).connect(dub()); }
  src.start(t, offset, dur || undefined);
  return src;
}
// AUDI 5000's exhaust: the owner's recording of three hard revs (audio/audi5k-exhaust.mp3).
// In the file: rev one 0-1.95 s (the big one), rev two 2.0-3.25 s, rev three 3.3-4.6 s.
let audiClip = null, audiLoading = null, audiPlaying = null;
export function loadAudiExhaust() {
  if (!ctx || audiClip || audiLoading) return;
  audiLoading = fetch("/vroomillion/audio/audi5k-exhaust.mp3")
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("missing"))))
    .then((b) => new Promise((ok, bad) => ctx.decodeAudioData(b, ok, bad)))
    .then((buf) => { audiClip = buf; })
    .catch(() => { audiLoading = null; });
}
const REVS = [[0, 1.95], [2.0, 1.25], [3.3, 1.3]];
export const audi = {
  // off the line: a rev from the recording, the big one for rarer answers, with a deep boom under it
  launch: (t) => {
    if (t <= 0) return;
    // the whole recording, all three revs, at its real speed; a new launch cuts off the last one
    try { audiPlaying?.stop(); } catch { /* already over */ }
    audiPlaying = clip(audiClip, { vol: 0.6 + t * 0.06 });
    if (!audiPlaying) v12.scream(t);
    tone(45, 0.6 + t * 0.1, { type: "sine", vol: 0.25 + t * 0.03, slide: 0.6 });
    if (t >= 4) noiseF(0.9, { vol: 0.12, type: "lowpass", freq: 200, sweep: 1200, attack: 0.05 }); // the flames whoosh
  },
  // each gear change: a short slice of a rev and a big flame bang
  pop: (t = 3) => {
    const [off, dur] = REVS[Math.floor(Math.random() * 3)];
    if (!clip(audiClip, { rate: 1.05 + Math.random() * 0.1, vol: 0.5, offset: off + dur * (0.3 + Math.random() * 0.4), dur: 0.3 })) v12.pop(t);
    noiseF(0.09, { vol: 0.22, type: "lowpass", freq: 700 });
    tone(55, 0.14, { type: "square", vol: 0.14, slide: 0.5 });
  },
  nitro: () => { tone(40, 1, { type: "sine", vol: 0.3, slide: 0.7 }); noiseF(0.8, { vol: 0.12, type: "lowpass", freq: 250, sweep: 2000, attack: 0.1 }); }, // a deep boom under the full recording, not a second copy of it
};
export const reggae = {
  // the air horn: "bap bap baaaa"
  horn: (at = 0, vol = 0.07) => {
    const out = dub();
    [[0, 0.1], [0.16, 0.1], [0.32, 0.45]].forEach(([d, len]) => {
      for (const f of [466, 349, 233]) tone(f, len, { type: "sawtooth", vol, at: at + d, out });
    });
  },
  // off the line: a skank and a bass drop, the air horn from Rare up, a dub siren for the rarest
  launch: (t) => {
    if (t === 0) return; // the stall plays reggae.sputter
    // the real exhaust: revved a little higher and louder for rarer answers
    if (!clip(zigClip, { rate: 0.94 + t * 0.05, vol: 0.55 + t * 0.07, echo: t >= 3 ? 0.35 : 0 })) {
      skank([NR.A3, NR.C4, NR.E4], 0, 0.05, dub());
      tone(NR.A2, 0.5, { type: "sine", vol: 0.3, slide: 0.5 });
    }
    if (t >= 2) reggae.horn(0.12, 0.05 + t * 0.01);
    if (t >= 3) siren(1 + t * 0.25, { from: 420, to: 900 + t * 120, vol: 0.05 + t * 0.008, at: 0.5 });
    if (t >= 5) siren(1.6, { from: 1400, to: 380, rate: 11, vol: 0.06, at: 1.6 });
  },
  // the thrusters, reggae style: a "wah" wobble-bass swell
  whoosh: (t) => {
    noiseF(0.5 + t * 0.1, { vol: 0.05 + t * 0.012, type: "bandpass", freq: 300, sweep: 1600, q: 4, attack: 0.1, out: dub() });
  },
  // a gear change: a rimshot (and a kick) that echoes away
  backfire: () => { if (!clip(zigClip, { rate: 1.25, vol: 0.5, offset: 0.35, dur: 0.3, echo: 0.6 })) { rim(0, 0.16, dub()); kick(0, 0.25); } },
  pop: (t = 3) => {
    const out = dub();
    // a short blip of the exhaust on every shift, echoing; the rimshot if the recording isn't loaded
    if (!clip(zigClip, { rate: 1.1 + t * 0.05, vol: 0.45, offset: 0.35 + Math.random() * 0.8, dur: 0.28, echo: 0.55 })) rim(0, 0.14 + t * 0.01, out);
    if (t >= 3) skank([NR.G3, NR.B3, NR.D4], 0.18, 0.035, out);
  },
  shift: () => rim(0, 0.07),
  // a right answer: ZIG'S WHIP's own victory riddim (an original tune). Two bars of one-drop with a
  // horn line on top, a dub siren pull-up for the rare ones, and a bigger horn stack the rarer it is.
  jingle: (t = 1) => {
    // a right answer: two bars in the same dancehall style (original): the bass walks up, the organ
    // bubbles, the snare drops, and a horn section answers; bigger horns and sirens the rarer it is
    if (!ctx || t <= 0) return;
    const out = dub(), e = 60 / 84 / 2;
    [[0, E2], [1.5, E2], [2, G2], [3, A1 * 2], [4, B1 * 2], [5.5, B1], [6, D2], [7, E2]].forEach(([at, f]) => { tone(f, e * 1.5, { type: "sine", vol: 0.36, at: at * e }); tone(f * 2, e * 0.8, { type: "triangle", vol: 0.08, at: at * e }); });
    for (let k = 1; k < 8; k += 2) bubble(CHORDS[k < 4 ? 0 : k < 6 ? 1 : 2], k * e, e, 0.035, out);
    kick(4 * e, 0.5); snare(4 * e, 0.15, out);
    // the horns: B G A, then B D E
    const horn = [[0.5, 493.9, 1], [1.5, 392, 1], [2.5, 440, 1.4], [4.5, 493.9, 1], [5.5, 587.3, 1], [6.5, 659.3, 1.6]];
    const stack = t >= 4 ? [1, 0.75, 0.5] : t >= 2 ? [1, 0.5] : [1];
    for (const [at, f, len] of horn) for (const m of stack) tone(f * m, e * len * 0.8, { type: "sawtooth", vol: 0.032 + t * 0.004, at: at * e, out });
    if (t >= 3) siren(1.1, { from: 600, to: 1300, rate: 9, vol: 0.045, at: 8 * e });
    if (t >= 5) reggae.horn(8 * e + 0.4, 0.06);
  },
  // nitro: the dub siren climbs and the bass drops
  nitro: () => { clip(zigClip, { rate: 1.3, vol: 0.6, at: 0.15, echo: 0.3 }); siren(1.2, { from: 300, to: 1500, rate: 9, vol: 0.06 }); tone(55, 0.9, { type: "sine", vol: 0.3, slide: 0.6 }); },
  // STALLED: a sad trombone-ish fall, echoing
  sputter: () => { const out = dub(); [0, 0.22, 0.44].forEach((at, k) => tone([233, 220, 208][k], k === 2 ? 0.6 : 0.2, { type: "sawtooth", vol: 0.05, at, slide: k === 2 ? 0.8 : 1, out })); },
};
// the engine: a one-drop groove (kick and rim on beat three, offbeat skanks, a bassline) over a low
// diesel rumble. The faster the truck goes, the faster and louder the groove.
// The engine: an early-80s dancehall-style groove of its own (an original bassline, not any song's): slow
// and heavy, a deep round bass, an organ "bubble" on the offbeats, a crisp drum-machine snare on the drop,
// short horn stabs every other bar, all over a low diesel rumble. Faster truck, faster and louder groove.
const E1 = 41.2, G1 = 49, A1 = 55, B1 = 61.7, C2 = 65.4, D2 = 73.4, E2 = 82.4, G2 = 98;
const RIDDIM = [
  // bass note (or 0) for each eighth of two bars: E minor, then C to D
  E2, 0, 0, E2, G1, 0, B1, 0,
  C2, 0, 0, C2, D2, 0, A1, E1,
];
const CHORDS = [[164.8, 196, 246.9], [130.8, 164.8, 196], [146.8, 185, 220]]; // Em, C, D voicings
// the organ bubble: a soft chord and a quieter ghost just after it
const bubble = (notes, at, len, vol, out) => {
  for (const f of notes) { tone(f, len * 0.5, { type: "triangle", vol, at, out }); tone(f * 2, len * 0.35, { type: "sine", vol: vol * 0.5, at, out }); tone(f, len * 0.3, { type: "triangle", vol: vol * 0.45, at: at + len * 0.5, out }); }
};
// a drum-machine snare: a short tone with a burst of noise
const snare = (at, vol, out) => { tone(190, 0.08, { type: "triangle", vol: vol * 0.7, at, slide: 0.7, out }); noiseF(0.14, { vol, at, type: "bandpass", freq: 1600, q: 0.8, out }); };
function reggaeEngine() {
  const g = ctx.createGain(); g.gain.value = 0;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 220;
  const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 38;
  const rg = ctx.createGain(); rg.gain.value = 0.3;
  o.connect(f).connect(rg).connect(g);
  const band = ctx.createGain(); band.gain.value = 1;
  band.connect(g);
  g.connect(master);
  o.start();
  const e = { reggae: true, o, f, g, band, speed: 0.1, step: 0, next: ctx.currentTime + 0.05 };
  e.timer = setInterval(() => {
    if (!ctx) return;
    const bpm = 66 + e.speed * 34; // slow and heavy, a little quicker flat out
    const eighth = 60 / bpm / 2;
    while (e.next < ctx.currentTime + 0.15) {
      const at = Math.max(0, e.next - ctx.currentTime), k = e.step % 16, bar = Math.floor(e.step / 16) % 2, bass = RIDDIM[k];
      if (bass) { tone(bass, eighth * 1.7, { type: "sine", vol: 0.6, at, out: band }); tone(bass * 2, eighth * 0.9, { type: "triangle", vol: 0.1, at, out: band }); }
      if (k % 2 === 1) bubble(CHORDS[k < 8 ? 0 : k < 12 ? 1 : 2], at, eighth, 0.03, band);
      if (k % 8 === 4) { kick(at, 0.55); snare(at, 0.13, band); } // the drop
      if (k === 0 && e.speed > 0.3) kick(at, 0.3);
      if (k % 2 === 0) noiseF(0.015, { vol: 0.02 + e.speed * 0.025, at, type: "highpass", freq: 8000, out: band }); // a ticking hat
      if (bar === 1 && (k === 7 || k === 15)) for (const m of [1, 1.5]) tone(329.6 * m, eighth * 0.6, { type: "sawtooth", vol: 0.018, at, out: band }); // horn stab
      e.next += eighth;
      e.step++;
    }
  }, 30);
  return e;
}

// Engine drone that follows car speed (0..1).
// electric: a spaceship's engine instead (AMELIA'S TESSY): two low detuned tones and thruster rumble,
// throbbing slowly, that only get a little deeper and louder with speed
export function engineStart(kind = false) {
  if (!ctx || engine) return;
  if (kind === "reggae") { loadZigExhaust(); engine = reggaeEngine(); return; }
  // a V12 (NICO'S CRAZY CAR): three sawtooth voices (the note, a fifth and an octave up) with a wobble,
  // revving high and bright, like a screaming twelve-cylinder
  if (kind === "v12") {
    const g = ctx.createGain();
    g.gain.value = 0;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1200;
    f.Q.value = 2;
    const voices = [1, 1.5, 2].map((mul, k) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 80 * mul;
      const vg = ctx.createGain();
      vg.gain.value = [0.5, 0.3, 0.22][k];
      o.connect(vg).connect(f);
      o.start();
      return { o, mul };
    });
    // the firing wobble
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 30;
    lg.gain.value = 3;
    lfo.connect(lg);
    for (const v of voices) lg.connect(v.o.frequency);
    lfo.start();
    f.connect(g).connect(master);
    engine = { v12: true, voices, lfo, g, f };
    return;
  }
  const electric = kind === true || kind === "electric";
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
  if (engine.reggae) {
    engine.speed = speed;
    engine.o.frequency.setTargetAtTime(34 + speed * 40, t, 0.15);
    engine.f.frequency.setTargetAtTime(180 + speed * 500, t, 0.15);
    engine.g.gain.setTargetAtTime(0.05 + speed * 0.07, t, 0.15);
    return;
  }
  if (engine.v12) {
    const base = 75 + speed * 340; // revs right up when it's flying
    for (const v of engine.voices) v.o.frequency.setTargetAtTime(base * v.mul, t, 0.06);
    engine.lfo.frequency.setTargetAtTime(20 + speed * 60, t, 0.1);
    engine.f.frequency.setTargetAtTime(900 + speed * 4200, t, 0.08);
    engine.g.gain.setTargetAtTime(0.035 + speed * 0.075, t, 0.08);
    return;
  }
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
  if (e.timer) clearInterval(e.timer);
  e.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  for (const x of [e.o, e.o2, e.n, e.lfo, ...(e.voices || []).map((v) => v.o)]) x?.stop(ctx.currentTime + 0.5);
}
