// QUESTS: goals with rewards, on the QUESTS tab. No DOM in here.
//   DAILY: three a day (the same three on every device that day), for cash. Some need Unlimited or the
//          Christmas event and are only dealt to players who can do them.
//   CHRISTMAS: while the event is on; most pay out presents from Santa.
//   MILESTONES: one-time, read straight from the save's own stats, for cash and a badge.
// Progress lives in save.quests: { day, daily: [ids], prog: { id: n }, claimed: [ids] }.

export const DAILY = [
  { id: "d-daily", text: "Play today's daily race", n: 1, ev: "daily", cash: 1500 },
  { id: "d-races", text: "Finish 2 races", n: 2, ev: "race", cash: 2000 },
  { id: "d-fast", text: "Give 3 FAST LANE answers (or rarer)", n: 3, ev: "tier3", cash: 2500 },
  { id: "d-turbo", text: "Give a TURBO answer (or rarer)", n: 1, ev: "tier4", cash: 3000 },
  { id: "d-far", text: "Go 3,000 M in one race", n: 1, ev: "far", cash: 2500 },
  { id: "d-clean", text: "Finish a race without a single stall", n: 1, ev: "clean", cash: 3000 },
  { id: "d-right", text: "Give 12 right answers", n: 12, ev: "right", cash: 2000 },
  { id: "d-win", text: "Win a 2-player or online race", n: 1, ev: "win", cash: 3000, unl: true },
  { id: "d-mode", text: "Finish a race in a game mode", n: 1, ev: "themed", cash: 2500, unl: true },
  { id: "d-present", text: "Catch a present from Santa", n: 1, ev: "present", cash: 1500, xmas: true },
];

// presents: how many presents it pays (opened on the spot); cash: dollars
export const XMAS = [
  { id: "x-races", text: "Finish 3 CHRISTMAS races", n: 3, ev: "xmrace", presents: 1, unl: true },
  { id: "x-cities", text: "Deliver presents to 25 cities in CHRISTMAS", n: 25, ev: "xmcity", presents: 2, unl: true },
  { id: "x-turbo", text: "Give 3 TURBO answers in CHRISTMAS", n: 3, ev: "xmtier4", presents: 1, unl: true },
  { id: "x-sleigh", text: "Win Santa's sleigh", n: 1, ev: "sleigh", presents: 2, unl: true },
  { id: "x-any", text: "Finish 10 races of any kind before Christmas is over", n: 10, ev: "race", presents: 1 },
  { id: "x-dailies", text: "Play 5 daily races before Christmas is over", n: 5, ev: "daily", presents: 1 },
  { id: "x-open", text: "Catch 5 presents from Santa", n: 5, ev: "present", cash: 10000 },
];

// stat(save) -> how far along it is, from the save's own numbers (so it counts everything ever done)
export const MILESTONES = [
  { id: "m-10", text: "Finish 10 races", n: 10, stat: (s) => s.races || 0, cash: 5000, badge: "ROOKIE" },
  { id: "m-50", text: "Finish 50 races", n: 50, stat: (s) => s.races || 0, cash: 20000, badge: "REGULAR" },
  { id: "m-100", text: "Finish 100 races", n: 100, stat: (s) => s.races || 0, cash: 50000, badge: "VETERAN" },
  { id: "m-500", text: "Finish 500 races", n: 500, stat: (s) => s.races || 0, cash: 250000, badge: "ROAD LEGEND" },
  { id: "m-vroom", text: "Give a ONE IN A VROOMILLION answer", n: 1, stat: (s) => s.vrooms || 0, cash: 25000, badge: "ONE IN A VROOMILLION" },
  { id: "m-turbo", text: "Give 25 TURBO answers", n: 25, stat: (s) => s.deep || 0, cash: 30000, badge: "TURBO TALKER" },
  { id: "m-stamps", text: "Collect 10 passport stamps", n: 10, stat: (s) => Object.keys(s.passport || {}).length, cash: 20000, badge: "GLOBETROTTER" },
  { id: "m-streak", text: "Play 7 days in a row", n: 7, stat: (s) => s.streak?.count || 0, cash: 15000, badge: "DEDICATED" },
  { id: "m-cars", text: "Own 10 cars", n: 10, stat: (s) => (s.owned || []).length, cash: 25000, badge: "COLLECTOR" },
  { id: "m-presents", text: "Catch 10 presents from Santa", n: 10, stat: (s) => s.santa?.opened || 0, cash: 20000, badge: "SANTA'S FAVOURITE", xmas: true },
];

const hash = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };

// today's three daily quests: the same for everyone with the same options that day
export function dealDaily(day, { unlimited, xmas }) {
  const pool = DAILY.filter((q) => (!q.unl || unlimited) && (!q.xmas || xmas));
  let h = hash(day);
  const out = [];
  const left = [...pool];
  while (out.length < 3 && left.length) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; out.push(left.splice(h % left.length, 1)[0].id); }
  return out;
}

// the save's quest state for today (a new day deals new daily quests; Christmas and claims are kept)
export function questState(save, day, opts) {
  const q = save.quests && typeof save.quests === "object" ? save.quests : {};
  if (!q.prog || typeof q.prog !== "object") q.prog = {};
  if (!Array.isArray(q.claimed)) q.claimed = [];
  if (q.day !== day || !Array.isArray(q.daily)) {
    for (const id of q.daily || []) { delete q.prog[id]; q.claimed = q.claimed.filter((c) => c !== id); } // yesterday's daily quests go
    q.day = day;
    q.daily = dealDaily(day, opts);
  }
  save.quests = q;
  return q;
}

// what one race (or a present, or the sleigh) adds: ev -> count
export function raceEvents({ daily, themed, xmas, won, tiers, dist }) {
  const right = tiers.filter((t) => t >= 1).length;
  const ev = {
    race: 1, daily: daily ? 1 : 0, themed: themed ? 1 : 0, win: won ? 1 : 0,
    tier3: tiers.filter((t) => t >= 3).length, tier4: tiers.filter((t) => t >= 4).length,
    right, far: dist >= 3000 ? 1 : 0, clean: tiers.length && tiers.every((t) => t >= 1) ? 1 : 0,
  };
  if (xmas) Object.assign(ev, { xmrace: 1, xmcity: right, xmtier4: ev.tier4 });
  return ev;
}

// add events to the quests in play; returns the quests that just got done
export function addEvents(q, ev, { xmasOn }) {
  const live = [...q.daily.map((id) => DAILY.find((d) => d.id === id)).filter(Boolean), ...(xmasOn ? XMAS : [])];
  const done = [];
  for (const quest of live) {
    const k = ev[quest.ev] || 0;
    if (!k) continue;
    const before = q.prog[quest.id] || 0;
    if (before >= quest.n) continue;
    q.prog[quest.id] = Math.min(quest.n, before + k);
    if (q.prog[quest.id] >= quest.n) done.push(quest);
  }
  return done;
}

// (a milestone keeps its best: a 7-day streak that later breaks still counts)
export function progressOf(q, quest, save) {
  if (quest.stat) q.prog[quest.id] = Math.max(q.prog[quest.id] || 0, quest.stat(save));
  return Math.min(quest.n, q.prog[quest.id] || 0);
}
export const claimable = (q, quest, save) => !q.claimed.includes(quest.id) && progressOf(q, quest, save) >= quest.n;
