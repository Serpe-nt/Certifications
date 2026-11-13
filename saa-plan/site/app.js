(() => {
"use strict";

const PLAN = window.PLAN, LINKS = window.LINKS, GLOSS = window.GLOSSARY, CLEANUP = window.CLEANUP;
const BILL = window.BILLABLE || { kinds: {}, steps: {} };
const QZ = window.QZ, BANK = window.QUIZ || [], DOCS = window.DOCS || {};
const CARDS = window.CARDS || {}, DRILL = window.DRILL || [], CUES = window.CUES || [];
const KEYS = window.KEYS || {}, CUE_TAGS = window.CUE_TAGS || {}, SCORE_AT = window.SCORE_AT || {}, STEP_TAGS = window.STEP_TAGS || {};
const KEY = "saa-plan-v2";
// Bumped when the plan's days change meaning: entries keyed by a day (quiz results, completion dates) then start again.
// 2 = the 21-day plan on the Solutions Architect learning plan.
// 3 = 22 days: AWS Technical Essentials in front, a new Day 2, every later day one further down.
const PLAN_V = 4;
const DEF = {
  ticks: {}, notes: {}, scores: {}, dayDone: {},
  planV: 0,    // the plan these entries were saved under (see PLAN_V)
  inotes: {},  // step id → your own note on that step
  quiz: {},    // day id → { best, passed: date or "", tries: [{ at, score, n }] }
  qs: {},      // question id → { seen, right, last, at }
  srs: {},     // question id → { step, due }: missed questions waiting for review
  book: {},    // question id → { at, misses, note, fixed }: wrong-answer notebook
  run: null,   // quiz or mock exam in progress; survives a reload
  runOff: 0,   // when the last run that was closed or dropped began (its t0): no other device's copy brings it back
  mocks: [],   // finished mock exams
  conf: {},    // self-check id → "ok" | "shaky"
  kconf: {},   // "<step id>:<point index>" → "ok" | "shaky": key points recalled with "Test me"
  log: {},     // day id → minutes logged by the focus timer
  warm: {},    // date → "done" | "skip"
  slips: [],   // schedule shifts: [{ from: day, n: days }]
  slipSkip: "",
  drill: { best: 0, runs: 0, rev: 0, lives: 0, day: {} },   // bests: 60 seconds, reverse, three lives; day: date → daily five result
  ach: {},     // badge id → date earned
  rowBest: 0,  // most quiz answers right in a row, ever
  xpDay: {},   // date → { x: total XP when the day was first seen, at: when that was stamped, hit: daily goal reached }
  week: { key: "", at: 0, ids: [], base: {} },   // this week's challenges: Monday's date, when stamped, their ids, the counters at the start
  chal: {},    // "<Monday>:<challenge id>" → date completed (+CHAL_XP each)
  daily: {},   // date → device id → { a: answers, r: right, f: focus minutes }: the trends on the overview
  // billable things in your own AWS account: [{ id, k: kind, label, day, at: created, gone: deleted (0 = still running) }];
  // snooze: no evening reminder before this time; night: the date you said to keep them running
  cost: { items: [], snooze: 0, night: "" },
  settings: { start: "2026-10-12", portal: "", exam: "", fx: true, sound: true, gif: true, goal: 200 },
  // Focus (mode "focus") counts down: endAt, left, from. The break (mode "rest") has no set length and counts up:
  // at = when it last started running, up = seconds banked before a pause.
  // ts = when the timer last changed (merges keep the later one), day = the day a focus block credits, ask = the "done" prompt waits.
  // away = when you left during a running focus block (no input for 5 minutes, the screen locked, or the device slept); 0 = here.
  // dev = the device the block runs on (the last one used while it ran): only its idle state and clock can say you left.
  timer: { mode: "focus", running: false, endAt: 0, left: 50 * 60, from: 0, at: 0, up: 0, ts: 0, day: "", ask: false, away: 0, dev: "", min: matchMedia("(max-width:640px)").matches },
  savedAt: 0
};
const FOCUS = 50 * 60;      // a focus block, in seconds
const REST_NAG = 10 * 60;   // a break longer than this gets a reminder every minute
const TAGS = { watch: "Watch", play: "Play", prep: "Exam prep", build: "Build", check: "Self-check", setup: "Setup" };
const DOMAINS = ["Secure", "Resilient", "High-performing", "Cost"];
const QUIZ_MIN = 30;
const NOTE_MAX = 2000;
const LETTERS = "ABCDE";

// Weekly challenges (see "daily goal, weekly challenges"): each measures a counter from the week's start.
// can: whether the plan still leaves room for it, checked when the week's three are drawn.
const CHAL_XP = 50;
const CHAL = [
  { id: "ans", i: "", k: "a", n: 150, t: n => `Answer ${n} quiz questions` },
  { id: "right", i: "", k: "r", n: 120, t: n => `Get ${n} answers right` },
  { id: "xp", i: "", k: "x", n: 2000, t: n => `Earn ${n.toLocaleString("en-GB")} XP` },
  { id: "days", i: "", k: "d", n: 4, t: n => `Complete ${n} days of the plan`, can: () => DAYS.filter(d => !dayDone(d)).length >= 4 },
  { id: "steps", i: "", k: "s", n: 40, t: n => `Complete ${n} steps`, can: () => Object.keys(itemIndex).filter(id => !S.ticks[id]).length >= 40 },
  { id: "focus", i: "", k: "f", n: 15 * 60, t: n => `Log ${n / 60} hours of focus`, fmt: m => fmtH(m) },
  { id: "fix", i: "", k: "fix", n: 8, t: n => `Fix ${n} notebook questions`, can: () => Object.values(S.book).filter(b => !b.fixed).length >= 8 },
  { id: "warm", i: "", k: "w", n: 4, t: n => `Do the morning warm-up on ${n} days`, can: () => Object.keys(S.srs).length >= 5 },
  { id: "drill", i: "", k: "dr", n: 3, t: n => `Run the “Which service?” drill ${n} times` },
  // the id is the one Test me's challenge had, so a week that drew it keeps it; it now counts the cards' own questions
  { id: "recall", i: "", k: "cq", n: 15, t: n => `Get ${n} knowledge checks right`, can: () => CARDQS.filter(q => !(S.qs[q.id] || {}).right).length >= 15 }
];
const CHAL_BY = Object.assign(Object.create(null), Object.fromEntries(CHAL.map(c => [c.id, c])));
const CHAL_KEYS = [...new Set(CHAL.map(c => c.k))];
const GOALS = [100, 150, 200, 300, 400, 600];   // daily XP goals to choose from in Settings
// One-click reasons for a miss (S.book[id].why), and what helps with each.
const WHY = [["know", "", "Didn't know it"], ["mix", "", "Mixed up two services"], ["read", "", "Misread the question"],
  ["word", "", "Missed a key word"], ["rush", "", "Rushed or changed my answer"]];
const WHY_BY = Object.assign(Object.create(null), Object.fromEntries(WHY.map(w => [w[0], w])));
// Keep the newest 120 dates of a date-keyed map.
const pruneDates = m => { const ks = Object.keys(m).sort(); for (const k of ks.slice(0, Math.max(0, ks.length - 120))) delete m[k]; };

// ---------- state ----------
const clone = o => JSON.parse(JSON.stringify(o));
const kind = v => v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
const isObj = v => kind(v) === "object";
// Overlay b onto a. Where the default has a value, b's value must have the same type, so an
// import or a server copy can't swap an object for null (or a number for markup) and break the page.
function merge(a, b) {
  if (!isObj(b)) return a;
  for (const k in b) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;   // JSON.parse makes these own keys: never walk into a prototype
    const ka = kind(a[k]), kb = kind(b[k]);
    if (k in a && ka !== "null" && ka !== kb) continue;
    if (ka === "object" && kb === "object") merge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}
// Entries inside the maps have no defaults to check against, so validate them one by one.
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isDay = v => typeof v === "string" && ISO.test(v) && v >= "2000-01-01" && v <= "2999-12-31" && !isNaN(Date.parse(v));
const int0 = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(num0(v))));
const num0 = (v, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);
const str0 = v => (typeof v === "string" ? v : "");
const ints = v => Array.isArray(v) && v.every(Number.isInteger);
// Days changed places: what was saved for Day n belongs to Day to(n) now. A slip names the first day it
// pushes back, so it has its own map (slipTo).
function moveDays(s, to, slipTo = to) {
  const up = k => { const m = /^d(\d+)$/.exec(k); return m ? "d" + to(+m[1]) : k; };
  for (const f of ["quiz", "dayDone", "notes", "log"]) if (isObj(s[f])) s[f] = Object.fromEntries(Object.entries(s[f]).map(([k, v]) => [up(k), v]));
  if (Array.isArray(s.slips)) s.slips.forEach(x => { if (isObj(x) && Number.isInteger(x.from)) x.from = slipTo(x.from); });
  for (const o of [s.run, s.timer]) if (isObj(o) && typeof o.day === "string") o.day = up(o.day);
  if (isObj(s.cost) && Array.isArray(s.cost.items)) s.cost.items.forEach(x => { if (isObj(x) && typeof x.day === "string") x.day = up(x.day); });
}
// A day was inserted in front of Day `from`: Day n (n ≥ from) is Day n + 1 now.
const shiftDays = (s, from) => moveDays(s, n => (n >= from ? n + 1 : n));
// Plan 4 put Days 9 and 10 (containers, the edge) in front of Day 8 (first exam questions): 9 → 8, 10 → 9, 8 → 10.
// A slip from Day 9 or 10 now starts one day earlier; one from Day 8 still pushes all three.
const swapDays4 = s => moveDays(s, n => ({ 8: 10, 9: 8, 10: 9 })[n] || n, n => (n === 9 || n === 10 ? n - 1 : n));
function clean(s) {
  const keep = (m, ok) => { for (const k of Object.keys(m)) if (!ok(m[k])) delete m[k]; };
  // Saved under an earlier plan: steps keep their ids, so ticks, step notes and answers carry over,
  // but "Day 5" is now a different day, so its quiz result and completion date do not.
  if (s.planV === 2) { shiftDays(s, 2); s.planV = 3; }   // same days, one place further down: nothing is lost
  if (s.planV === 3) { swapDays4(s); s.planV = 4; }      // same days in a new order: nothing is lost
  if (s.planV !== PLAN_V) {
    s.quiz = {}; s.dayDone = {};
    if (isObj(s.run) && s.run.kind === "day") s.run = null;
    s.planV = PLAN_V;
  }
  keep(s.ticks, v => v === true);
  keep(s.notes, v => typeof v === "string");
  keep(s.inotes, v => typeof v === "string");
  for (const k in s.inotes) s.inotes[k] = s.inotes[k].slice(0, NOTE_MAX);
  keep(s.scores, v => typeof v === "string" || typeof v === "number");
  keep(s.dayDone, isDay);
  keep(s.quiz, v => isObj(v) && Array.isArray(v.tries));
  for (const r of Object.values(s.quiz)) {
    r.best = num0(r.best); r.passed = isDay(r.passed) ? r.passed : "";
    r.tries = r.tries.filter(isObj).map(t => ({ at: str0(t.at), score: num0(t.score), n: num0(t.n) }));
    // a try that meets today's pass mark counts, also one from before the mark went down from 90% to 80%
    if (!r.passed) { const t = r.tries.find(t => isDay(t.at) && t.n && QZ.passed(t.score, t.n)); if (t) r.passed = t.at; }
  }
  keep(s.qs, isObj);
  for (const k in s.qs) {
    const q = s.qs[k], seen = int0(q.seen, 0, 1e6), right = int0(q.right, 0, seen);
    // xp = the right answers that earned XP; an entry from before that rule keeps all of them, so no level drops
    s.qs[k] = { seen, right, last: q.last ? 1 : 0, at: str0(q.at), xp: typeof q.xp === "number" ? int0(q.xp, 0, right) : right };
  }
  keep(s.srs, v => isObj(v) && isDay(v.due));
  for (const k in s.srs) s.srs[k] = { step: num0(s.srs[k].step), due: s.srs[k].due };
  keep(s.book, isObj);
  for (const k in s.book) { const b = s.book[k]; s.book[k] = { at: str0(b.at), misses: num0(b.misses, 1), note: str0(b.note).slice(0, 300), fixed: !!b.fixed, why: WHY_BY[b.why] ? b.why : "" }; }
  s.mocks = s.mocks.filter(isObj).map(m => ({ at: str0(m.at), score: num0(m.score), n: num0(m.n), pct: num0(m.pct), mins: num0(m.mins),
    dom: Array.isArray(m.dom) ? m.dom.slice(0, 4).map(x => (Array.isArray(x) ? [num0(x[0]), num0(x[1])] : [0, 0])) : [] }));
  keep(s.conf, v => v === "ok" || v === "shaky");
  keep(s.kconf, v => v === "ok" || v === "shaky");
  for (const k of Object.keys(s.kconf)) if (!/^[\w-]{1,40}:\d{1,2}$/.test(k)) delete s.kconf[k];
  keep(s.log, v => typeof v === "number" && isFinite(v) && v >= 0);
  for (const k in s.log) s.log[k] = Math.min(s.log[k], 24 * 60);
  keep(s.warm, v => v === "done" || v === "skip");
  s.slips = s.slips.filter(x => isObj(x) && Number.isInteger(x.from) && Number.isInteger(x.n) && x.n > 0 && x.n < 100).map(x => ({ from: x.from, n: x.n }));
  s.drill = { best: int0(s.drill.best, 0, 1e4), runs: int0(s.drill.runs, 0, 1e6), rev: int0(s.drill.rev, 0, 1e4), lives: int0(s.drill.lives, 0, 1e4), day: isObj(s.drill.day) ? s.drill.day : {} };
  for (const k of Object.keys(s.drill.day)) if (!isDay(k) || !Number.isInteger(s.drill.day[k]) || s.drill.day[k] < 0 || s.drill.day[k] > 5) delete s.drill.day[k];
  pruneDates(s.drill.day);
  keep(s.ach, isDay);
  s.rowBest = int0(s.rowBest, 0, 1000);
  keep(s.xpDay, isObj);
  for (const k of Object.keys(s.xpDay)) { const e = s.xpDay[k]; if (!isDay(k)) delete s.xpDay[k]; else s.xpDay[k] = { x: int0(e.x, 0, 1e9), at: num0(e.at), hit: !!e.hit }; }
  const w = s.week;
  s.week = isDay(w.key) ? { key: w.key, at: num0(w.at), ids: (Array.isArray(w.ids) ? w.ids : []).filter(id => CHAL_BY[id]).slice(0, 3), base: {} } : { key: "", at: 0, ids: [], base: {} };
  if (isObj(w.base)) for (const k of CHAL_KEYS) if (typeof w.base[k] === "number" && isFinite(w.base[k])) s.week.base[k] = w.base[k];
  for (const k of Object.keys(s.chal)) { const m = /^(\d{4}-\d{2}-\d{2}):([a-z]+)$/.exec(k); if (!m || !isDay(m[1]) || !CHAL_BY[m[2]] || !isDay(s.chal[k])) delete s.chal[k]; }
  for (const k of Object.keys(s.daily)) {
    const day = s.daily[k];
    if (!isDay(k) || !isObj(day)) { delete s.daily[k]; continue; }
    for (const dev of Object.keys(day)) {
      const e = day[dev];
      if (!/^[a-z0-9]{1,12}$/.test(dev) || !isObj(e)) { delete day[dev]; continue; }
      const a = int0(e.a, 0, 1e5);
      day[dev] = { a, r: int0(e.r, 0, a), f: Math.min(24 * 60, Math.max(0, num0(e.f))) };
    }
  }
  pruneDates(s.xpDay); pruneDates(s.daily);
  const c = s.cost, weekAgo = Date.now() - 7 * 864e5;
  s.cost = { items: [], snooze: Math.min(num0(c.snooze), Date.now() + 864e5), night: isDay(c.night) ? c.night : "" };
  for (const x of Array.isArray(c.items) ? c.items : []) {
    if (!isObj(x) || typeof x.id !== "string" || !/^[\w:-]{1,40}$/.test(x.id) || !BILL.kinds[x.k] || s.cost.items.some(y => y.id === x.id)) continue;
    const gone = num0(x.gone);
    if (gone && gone < weekAgo) continue;   // deleted more than a week ago: off the list
    s.cost.items.push({ id: x.id, k: x.k, label: str0(x.label).slice(0, 60), day: PLAN.some(d => d.id === x.day) ? x.day : "", at: num0(x.at), gone });
    if (s.cost.items.length >= 60) break;
  }
  s.settings.goal = GOALS.includes(s.settings.goal) ? s.settings.goal : DEF.settings.goal;
  if (!ISO.test(s.settings.start)) s.settings.start = DEF.settings.start;
  if (s.settings.exam && !ISO.test(s.settings.exam)) s.settings.exam = "";
  if (!/^https?:\/\//i.test(s.settings.portal)) s.settings.portal = "";
  const t = s.timer;
  // The break used to be a 10-minute countdown called "break": such a copy starts the open-ended break afresh.
  if (t.mode === "break") { t.mode = "rest"; t.running = false; t.up = 0; }
  if (t.mode !== "focus" && t.mode !== "rest") t.mode = "focus";
  t.left = Math.min(FOCUS, Math.max(0, Math.round(num0(t.left, FOCUS))));
  t.endAt = num0(t.endAt); t.from = Math.min(FOCUS, Math.max(0, num0(t.from))); t.at = num0(t.at);
  t.up = Math.min(86400, Math.max(0, num0(t.up)));
  t.ts = num0(t.ts);
  t.away = Math.min(num0(t.away), Date.now());
  if (!/^[a-z0-9]{1,12}$/.test(t.dev)) t.dev = "";
  if (!PLAN.some(d => d.id === t.day)) t.day = "";
  if (t.ask && (t.mode !== "rest" || t.running)) t.ask = false;   // the prompt only waits on a break not yet started
  if (!(t.mode === "focus" && t.running) || t.away < 0) t.away = 0;
  // Running needs a clock that makes sense: a focus block ends within 50 minutes from now, a break began in the last day.
  const now = Date.now();
  if (t.running && !(t.mode === "rest" ? t.at > now - 864e5 && t.at < now + 6e4 : t.endAt > 0 && t.endAt < now + FOCUS * 1000 + 6e4)) t.running = false;
  s.savedAt = num0(s.savedAt);
  s.runOff = Math.min(num0(s.runOff), Date.now() + 864e5);
  s.run = cleanRun(s.run);
  if (s.run && s.runOff && s.run.t0 <= s.runOff) s.run = null;   // closed or dropped on some device already
  return s;
}
function cleanRun(r) {
  if (!isObj(r) || !["day", "mock", "review", "warm", "step"].includes(r.kind) || !Array.isArray(r.ids) || !r.ids.every(x => typeof x === "string")) return null;
  if (r.kind === "day" && !PLAN.some(d => d.id === r.day)) return null;
  const out = {
    kind: r.kind, day: str0(r.day), item: str0(r.item), ids: r.ids, ord: {}, ans: {}, flag: {}, i: Number.isInteger(r.i) && r.i >= 0 ? r.i : 0,
    t0: num0(r.t0), end: num0(r.end), done: !!r.done, view: r.view === "grid" ? "grid" : "", seen: !!r.seen, only: r.only !== false,
    score: num0(r.score), mins: num0(r.mins), cel: ["all", "week", "day"].includes(r.cel) ? r.cel : "", mockNew: !!r.mockNew,
    // right answers in a row now and at most in this run; XP when it started (-1: not known, a run from before XP)
    row: int0(r.row, 0, r.ids.length), rowMax: int0(r.rowMax, 0, r.ids.length), best0: int0(r.best0, 0, 1000), xp0: num0(r.xp0, -1), rec: !!r.rec,   // rec: "New record" said in this run
    xp1: num0(r.xp1, -1), gif: typeof r.gif === "string" && /^[A-Za-z0-9]{1,32}$/.test(r.gif) ? r.gif : ""   // XP and the GIF at the finish
  };
  out.x = {}; out.hl = {};   // mock exam: options struck out, words highlighted (indexes), per question
  for (const id of r.ids) {
    if (isObj(r.x) && ints(r.x[id])) out.x[id] = r.x[id].slice(0, 6);
    if (isObj(r.hl) && ints(r.hl[id])) out.hl[id] = r.hl[id].filter(i => i >= 0 && i < 2000).slice(0, 400);
    if (isObj(r.ord) && ints(r.ord[id])) out.ord[id] = r.ord[id];
    if (isObj(r.ans) && ints(r.ans[id])) out.ans[id] = r.ans[id];
    if (isObj(r.flag) && r.flag[id]) out.flag[id] = 1;
  }
  if (isObj(r.res) && ints(r.res.dom ? r.res.dom.flat() : null)) out.res = { score: num0(r.res.score), n: num0(r.res.n), pct: num0(r.res.pct), dom: r.res.dom };
  if (out.kind === "mock" && out.done && !out.res) return null;
  return out;
}
const parseState = obj => clean(merge(clone(DEF), obj));
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  return parseState(s);
}
let S = load();
// Server sync bookkeeping (see "server sync" below): last revision seen, unsaved changes, save count.
const SYNC_KEY = KEY + "-sync";
const sync = { on: false, rev: 0, dirty: false, busy: false, again: false, n: 0 };
const firstSync = localStorage.getItem(SYNC_KEY) === null;
try { Object.assign(sync, JSON.parse(localStorage.getItem(SYNC_KEY)) || {}, { on: false, busy: false, again: false, n: 0 }); } catch (e) {}
// Progress saved before the server existed must be merged into the server copy, not replaced by it.
if (firstSync && (Object.keys(S.ticks).length || Object.keys(S.notes).length || Object.keys(S.qs).length)) sync.dirty = true;
const syncMeta = () => { try { localStorage.setItem(SYNC_KEY, JSON.stringify({ rev: sync.rev, dirty: sync.dirty })); } catch (e) {} };
let lastSaved = "";   // what this tab last wrote to localStorage (leaving() sends only when nobody wrote since)
const writeLocal = () => { try { lastSaved = JSON.stringify(S); localStorage.setItem(KEY, lastSaved); } catch (e) {} };
function save() {
  S.savedAt = Date.now();
  sync.n++;
  writeLocal();
  syncLater();
}

// ---------- indexes ----------
const DAYS = PLAN.filter(d => d.id);
const itemIndex = Object.create(null);
DAYS.forEach(d => d.groups.forEach((g, gi) => {
  g.key = d.id + "g" + gi;
  g.items.forEach(it => { itemIndex[it[0]] = { d, g, it }; });
}));
const LAST = DAYS[DAYS.length - 1].day;
const TP = QZ.topics(PLAN, STEP_TAGS);   // what each day teaches; the day quizzes are drawn from it
// Questions by id and by plan step (the ones that name the step, plus the ones on a topic it teaches), and the steps that teach each topic.
const QBY = Object.create(null), QREF = {}, TAG_STEPS = {}, ORDER = {};
BANK.forEach(q => { QBY[q.id] = q; });
// The one question on each card (KEYS[id].q), written for that card: asked only there, never drawn into a quiz (it is
// not in BANK). An answer counts like a quiz answer (learn()): XP, topic accuracy, and a miss goes to the notebook and
// comes back in review, which finds it through QBY. A question on exam technique or the plan itself has no topic and
// no domain, so it gives XP and lands in the notebook without counting against an exam topic.
const CARDQ = Object.create(null);
for (const id in KEYS) {
  const c = KEYS[id].q;
  if (c) CARDQ[id] = QBY["card-" + id] = { id: "card-" + id, day: "card", dom: c.dom, tags: c.tags || [], q: c.q, o: c.o, a: c.a, x: c.x, ref: [id], doc: c.doc, card: id };
}
const CARDQS = Object.values(CARDQ), WITH_CARDQ = BANK.concat(CARDQS);
Object.keys(itemIndex).forEach((id, i) => {
  ORDER[id] = i;
  const qs = QZ.forStep(id, STEP_TAGS[id], BANK);
  if (qs.length) QREF[id] = qs;
  (STEP_TAGS[id] || []).forEach(t => { (TAG_STEPS[t] = TAG_STEPS[t] || []).push(id); });
});
// Weeks are whatever the plan's {week: "…"} entries make them.
const WEEK = {}, WEEKS = [];
PLAN.forEach(d => { if (d.week) WEEKS.push(d.week); else if (d.id) WEEK[d.id] = Math.max(0, WEEKS.length - 1); });
const dayOf = id => DAYS.find(x => x.id === id);
const done = id => !!S.ticks[id];
const gIds = g => g.items.map(i => i[0]);
const dIds = d => d.groups.flatMap(gIds);
const groupDone = g => gIds(g).every(done);
const hasQuiz = d => QZ.hasQuiz(d);
const quizOk = d => !hasQuiz(d) || !!(S.quiz[d.id] && S.quiz[d.id].passed);
const itemsDone = d => dIds(d).every(done);
const dayDone = d => itemsDone(d) && quizOk(d);
// The cards of a day, in order: one per step, then the quiz.
const stepIds = d => (hasQuiz(d) ? [...dIds(d), "quiz"] : dIds(d));
const groupLeft = g => { const ids = gIds(g); return (g.min || 0) * ids.filter(i => !done(i)).length / ids.length; };
const dayLeft = d => d.groups.reduce((a, g) => a + groupLeft(g), 0) + (quizOk(d) ? 0 : QUIZ_MIN);
const dayPlanned = d => d.groups.reduce((a, g) => a + (g.min || 0), 0) + (hasQuiz(d) ? QUIZ_MIN : 0);
const weekOf = d => DAYS.filter(x => WEEK[x.id] === WEEK[d.id]);
// The mock exam opens once the days of new material are done (MOCK_AFTER in plan.js; without it, every day but the last).
const MOCK_AFTER = Number.isInteger(window.MOCK_AFTER) ? window.MOCK_AFTER : LAST - 1;
const mockDays = DAYS.filter(d => d.day <= MOCK_AFTER);
const mockOpen = () => mockDays.every(dayDone);
function markDayDone(d) {
  if (dayDone(d)) { if (!S.dayDone[d.id]) S.dayDone[d.id] = today(); }
  else delete S.dayDone[d.id];
}

// ---------- dates & formatting ----------
function parseDate(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
const shift = n => S.slips.reduce((a, s) => a + (n >= s.from ? s.n : 0), 0);
function dayDate(n) { const d = parseDate(S.settings.start); d.setDate(d.getDate() + n - 1 + shift(n)); return d; }
function midnight(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
const diffDays = (a, b) => Math.round((midnight(a) - midnight(b)) / 864e5);
// Which plan day today is: 0 or less before Day 1, more than the last day's number after it.
function todayIdx() {
  const t = midnight();
  if (t < dayDate(1)) return 1 + diffDays(t, dayDate(1));
  if (t > dayDate(LAST)) return LAST + diffDays(t, dayDate(LAST));
  let n = 1;
  for (let k = 1; k <= LAST; k++) if (dayDate(k) <= t) n = k;
  return n;
}
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => iso(new Date());
const examDate = () => S.settings.exam ? parseDate(S.settings.exam) : dayDate(LAST);
const fmtD = d => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtH = m => m < 1 ? "0 min" : m < 60 ? `${Math.round(m / 5) * 5 || 5} min` : `${Math.round(m / 30) / 2} h`;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = h => { const t = document.createElement("div"); t.innerHTML = h; return t.textContent; };
const clock = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
function linkFor(key) {
  if (!key) return null;
  if (key === "own") return (/^https?:\/\//i.test(S.settings.portal) && S.settings.portal) || LINKS.console.url;
  return LINKS[key] ? LINKS[key].url : null;
}
function download(text, name, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// One modal at a time: later dialogs (quiz prompt after the cleanup check, say) wait their turn.
const pending = [];
function whenFree(fn) { if (document.querySelector("dialog[open]")) pending.push(fn); else fn(); }
function runPending() { setTimeout(() => { if (pending.length && !document.querySelector("dialog[open]")) pending.shift()(); }, 250); }

// ---------- glossary ----------
const GL = {}, GLK = {};
Object.keys(GLOSS).forEach(k => { GL[k.toLowerCase()] = GLOSS[k]; GLK[k.toLowerCase()] = k; });
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const GRE = new RegExp(`(?<![\\w-])(${Object.keys(GLOSS).sort((a, b) => b.length - a.length).map(escRe).join("|")})(?:s|es)?(?![\\w-])`, "gi");
function applyGlossary(scope) {
  scope.querySelectorAll(".txt").forEach(el => {
    const seen = new Set();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement.closest("code,a,.g") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const t = n.nodeValue;
      let m, last = 0, frag = null;
      GRE.lastIndex = 0;
      while ((m = GRE.exec(t))) {
        const key = m[1].toLowerCase();
        if (seen.has(key) || !GL[key]) continue;
        seen.add(key);
        frag = frag || document.createDocumentFragment();
        frag.append(t.slice(last, m.index));
        const s = document.createElement("span");
        s.className = "g"; s.tabIndex = 0; s.textContent = m[0]; s.dataset.tip = GL[key];
        frag.append(s);
        last = m.index + m[0].length;
      }
      if (frag) { frag.append(t.slice(last)); n.replaceWith(frag); }
    });
  });
}
// Glossary terms that occur in a piece of plain text, in order of appearance: [term, definition].
function termsIn(text) {
  const out = [], seen = new Set();
  let m;
  GRE.lastIndex = 0;
  while ((m = GRE.exec(text))) {
    const k = m[1].toLowerCase();
    if (seen.has(k) || !GL[k]) continue;
    seen.add(k);
    out.push([GLK[k], GL[k]]);
  }
  return out;
}

// ---------- views: the overview, or one day shown one step at a time ----------
const homeEl = document.getElementById("home"), flowEl = document.getElementById("flow"), cardEl = document.getElementById("card");
const bodyEl = document.getElementById("fl-body"), sideL = document.getElementById("side-l"), sideR = document.getElementById("side-r");
let view = { day: "", at: "" };   // day "" = overview. at = a step id, "quiz", or "done" (the day's summary).
let shown = "", movedAt = 0;      // the card on screen and when it appeared
// A day opens on its first open step, then on its quiz, then on its summary.
const landing = d => dIds(d).find(id => !done(id)) || (dayDone(d) ? "done" : hasQuiz(d) ? "quiz" : dIds(d)[0]);
const validAt = (d, at) => (stepIds(d).includes(at) || (at === "done" && dayDone(d)) ? at : landing(d));
// The address bar mirrors the view (#d3/d3w2), so a reload stays on the card and the browser's Back returns to the overview.
function setView(day, at, push) {
  const d = day && dayOf(day);
  view = d ? { day: d.id, at: validAt(d, at || "") } : { day: "", at: "" };
  const hash = d ? `#${view.day}/${view.at}` : "";
  if (location.hash !== hash) history[push ? "pushState" : "replaceState"](null, "", hash || location.pathname + location.search);
  const key = view.day + "/" + view.at, moved = key !== shown;
  homeEl.hidden = !!d; flowEl.hidden = !d;
  document.body.classList.toggle("in-flow", !!d);
  if (d) renderFlow(moved);
  railNav();
  bdDraw();
  if (moved) { shown = key; movedAt = Date.now(); scrollTo(0, 0); }
}
// ---------- the backdrop (Datum.backdrop) and the rail ----------
// The backdrop is Datum's: one figure, low in contrast, drawn to the window and seeded with the view, so each day keeps
// its own drawing; its one piece of text is the day's real number. A small orbit on a gutter crossing on the overview,
// the plain grid while you read a step (Datum's Operate views). A new view fades it up; a resize redraws it still.
const bdEl = document.getElementById("bd");
let bdKey = "", bdT = 0, inT = 0;
function bdDraw() {
  const d = view.day && dayOf(view.day), w = innerWidth, h = innerHeight, k = `${view.day}|${w}|${h}`;
  if (!window.Datum || k === bdKey) return;
  bdEl.toggleAttribute("data-dm-redraw", !!bdKey && bdKey.split("|")[0] === view.day);
  bdKey = k;
  bdEl.innerHTML = Datum.backdrop(d ? { figure: "grid", width: w, height: h, seed: d.id, ghost: pad2(d.day) }
    : { figure: "orbit", width: w, height: h, seed: "overview", at: [0.82, 0.3], scale: 0.62, grid: 64, glow: false });
}
addEventListener("resize", () => { clearTimeout(bdT); bdT = setTimeout(bdDraw, 150); });
// where you are, in the rail: the overview, or the day and its card
function railNav() {
  const d = view.day && dayOf(view.day);
  document.getElementById("rl-nav").innerHTML = d
    ? `<a href="#" data-home-link>Overview</a><span aria-hidden="true">/</span><span aria-current="page">Day ${pad2(d.day)}</span>`
    : `<span aria-current="page">Overview</span>`;
}
document.getElementById("timer").addEventListener("click", e => { if (e.target.closest("[data-home-link]")) { e.preventDefault(); setView("", "", true); } });
function route() {
  const m = /^#(d\d+)(?:\/([\w-]+))?$/.exec(location.hash);
  setView(m ? m[1] : "", m ? m[2] : "", false);
}
addEventListener("hashchange", route);
// Go to another card of the day on screen, and put the keyboard on its heading.
function move(at) {
  setView(view.day, at, false);
  const h = cardEl.querySelector(".c-t");
  if (h) h.focus({ preventScroll: true });
}
const jumpTo = id => setView(itemIndex[id].d.id, id, true);

// Section choices on the card (which helper lists are folded open) stay as you left them, in this browser only.
const UI_KEY = KEY + "-ui";
let ui = {};
try { const u = JSON.parse(localStorage.getItem(UI_KEY)); if (isObj(u)) ui = u; } catch (e) {}
const saveUI = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) {} };
// Text size, motion and the focus view are this browser's choice (Settings, the Focus view button), never synced.
// There is one theme, the dark Excimer one (a theme saved by an older version is dropped on the next Save).
// Motion is the Datum level: full (arrival, response, live loops), calm (no loops), off (static); with effects off
// a full level drops to calm. The reduced-motion system setting always means off (bundle.css and fx.css).
const motionLevel = () => { const m = ui.motion === "calm" || ui.motion === "off" ? ui.motion : "full"; return m === "full" && !S.settings.fx ? "calm" : m; };
function applyDisplay() {
  const r = document.documentElement;
  r.dataset.dmMotion = motionLevel();
  if (ui.size === "l" || ui.size === "xl") r.dataset.size = ui.size; else delete r.dataset.size;
  document.body.classList.toggle("focus-view", !!ui.focusView);
}
applyDisplay();

// ---------- overview: day tiles and quick links ----------
// Write a block of the overview only when its markup changed: a refresh with nothing new (news from another device,
// the minute tick) must not replay the Datum boot animation, which hides the hero for a moment.
const lastHTML = new WeakMap();
const setHTML = (el, h) => { if (lastHTML.get(el) !== h) { lastHTML.set(el, h); el.innerHTML = h; } };
// Datum numbers: zero-padded counts ("03 / 22")
const pad2 = n => String(n).padStart(2, "0");
// A section header: the index chip, a mono title, a rule, and one real value on the right
const secHead = (idx, title, val = "", id = "") => `<div class="dm-section"${id ? ` id="${id}"` : ""}><span class="dm-section__idx">/${pad2(idx)}</span><h2 class="dm-section__title">${title}</h2><span class="dm-section__rule"></span>${val ? `<span class="dm-data">${val}</span>` : ""}</div>`;
// The plan as a lattice: one cell per day, filled by its state (done ink, today signal, quiz to pass alert, open outline)
function renderMap(ti) {
  // a week is a row of eight cells: a shorter week is padded with empty cells, so the lattice has no ragged edge
  const pad = n => "<span class=\"dm-cell dm-cell--empty\" aria-hidden=\"true\">+</span>".repeat((8 - n % 8) % 8);
  let h = "", open = false, wk = 0, n = 0;
  for (const d of PLAN) {
    if (d.week) {
      const m = /^(Week \d+)\s*[—–-]\s*(.+)$/.exec(d.week);
      h += `${open ? pad(n) + "</div>" : ""}<div class="week">${secHead(++wk, esc(m ? m[1] : d.week), m ? esc(m[2]) : "")}</div><div class="tiles">`;
      open = true; n = 0; continue;
    }
    n++;
    const ids = dIds(d), k = ids.filter(done).length, complete = dayDone(d), quizDue = k === ids.length && !complete;
    const st = complete ? "✓ Done" : quizDue ? "Quiz to pass" : k ? `${k} of ${ids.length} steps, ~${fmtH(dayLeft(d))} left` : `${plural(ids.length, "step")}, ~${fmtH(dayPlanned(d))}`;
    const cls = complete ? " is-done" : d.day === ti ? " is-now" : quizDue ? " is-alert" : "";
    h += `<a class="dt dm-cell${cls}" href="#${d.id}" data-day="${d.id}" data-done="${complete ? 1 : 0}" data-quiz="${quizDue ? 1 : 0}" data-today="${d.day === ti ? 1 : 0}"${d.day === ti ? ' aria-current="date"' : ""}>` +
      `<span class="dt-top"><span class="dt-n dm-cell__code"><small>Day</small>${pad2(d.day)}</span>${d.day === ti ? `<span class="today-badge">Today</span>` : ""}</span>` +
      `<span><span class="dt-t dm-cell__name">${d.title}</span><span class="dt-d dm-cell__val">${fmtD(dayDate(d.day))}</span><span class="dt-s dm-cell__val">${st}</span>` +
      `<span class="pbar"><span style="width:${pct(k + (hasQuiz(d) && quizOk(d) ? 1 : 0), stepIds(d).length)}%"></span></span></span></a>`;
  }
  setHTML(document.getElementById("map"), h + (open ? pad(n) + "</div>" : ""));
}
function renderLinks() {
  const nav = document.getElementById("links");
  // every link of the plan that is not marked hidden, in the plan's order; the console link becomes your own sign-in page once you set it
  const items = Object.keys(LINKS).filter(k => !LINKS[k].hidden).map(k => (k === "console" && S.settings.portal ? ["AWS sign-in", S.settings.portal] : [LINKS[k].label, LINKS[k].url]));
  nav.innerHTML = items.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join("");
}

// ---------- status / refresh ----------
function streak() {
  const dates = new Set(Object.values(S.dayDone));
  let n = 0;
  const d = midnight();
  if (!dates.has(iso(d))) d.setDate(d.getDate() - 1);
  while (dates.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function renderStats(dn, total) {
  const mins = Object.values(S.log).reduce((a, b) => a + b, 0), sk = streak();
  let seen = 0, right = 0;
  for (const id in S.qs) if (QBY[id]) { seen += S.qs[id].seen; right += S.qs[id].right; }
  // label, value, its reference point; the lead tile carries an ink bar, the rest are quiet
  const cells = [
    ["Steps", `${pad2(dn)}<small>/ ${total}</small>`, "Steps complete in the plan"],
    ["Days", `${pad2(DAYS.filter(dayDone).length)}<small>/ ${DAYS.length}</small>`, "Days done, quiz passed"],
    ["Focus time", mins >= 1 ? fmtH(mins) : "—", mins >= 1 ? "Logged by the focus timer" : "No focus block logged yet"],
    ["Answers right", seen ? `${pct(right, seen)}<small>% of ${seen}</small>` : "—", seen ? "Every quiz answer so far" : "No quiz answered yet"],
    ["Streak", sk ? `${pad2(sk)}<small>${sk === 1 ? "day" : "days"}</small>` : "—", sk ? "Days done in a row" : "Finish a day to start one"]
  ];
  const L = levelOf(xpTotal());
  setHTML(document.getElementById("stats"), cells.map(([k, v, c], i) => `<div class="st dm-stat${i ? " dm-stat--quiet" : ""}"><span class="tb-k">${k}</span><b class="dm-stat__num">${v}</b><span class="dm-stat__cap">${c}</span></div>`).join("") +
    `<button type="button" class="st st-lv dm-stat dm-stat--quiet" data-sheet="badges" title="${L.x} XP, ${L.to - L.x} to level ${L.n + 1}. Open badges and level."><span class="tb-k">Level</span>` +
    `<b class="dm-stat__num">${L.n} <small>${rankOf(L.n)}</small></b><span class="xpbar"><span style="width:${L.pct}%"></span></span><span class="dm-stat__cap">${L.to - L.x} XP to level ${L.n + 1}</span></button>`);
}
function refresh() {
  const ti = todayIdx();
  let total = 0, dn = 0;
  for (const d of DAYS) {
    const ids = dIds(d), q = hasQuiz(d) ? 1 : 0;
    total += ids.length + q; dn += ids.filter(done).length + (q && quizOk(d) ? 1 : 0);
  }
  const p = pct(dn, total);
  document.getElementById("bar").style.width = p + "%";
  document.getElementById("tb-pct").textContent = p + "%";
  document.getElementById("tb-sheet").textContent = ti < 1 ? "Before Day 1" : ti > LAST ? `Past Day ${LAST}` : `Day ${ti} of ${LAST}`;
  // the rail: the calendar day against the plan, one segment per day
  const dayCls = d => (dayDone(d) ? "is-done" : d.day === ti ? "is-now" : "");
  document.getElementById("rl-pos").innerHTML = `<span class="dm-data">${ti < 1 ? "Day 00" : ti > LAST ? "Done" : "Day " + pad2(ti)} / ${LAST}</span>` +
    `<span class="dm-seg dm-seg--mini" role="progressbar" aria-label="Days done" aria-valuenow="${DAYS.filter(dayDone).length}" aria-valuemax="${DAYS.length}">${DAYS.map(d => `<i class="${dayCls(d)}"></i>`).join("")}</span>`;
  const examD = examDate();
  document.getElementById("tb-exam").textContent = fmtD(examD);
  document.getElementById("tb-exam-k").textContent = S.settings.exam ? "Exam (booked)" : "Exam";

  // where the plan stands: in the head of the card at the top, next to today's date
  const st = [];
  if (ti < 1) {
    st.push(`<span>Starts <b>${fmtD(dayDate(1))}</b> (in ${plural(1 - ti, "day")})</span>`);
  } else if (ti > LAST) {
    st.push(`<span>Plan period ended ${fmtD(dayDate(LAST))}</span>`);
  } else {
    const overdue = DAYS.filter(d => d.day < ti).reduce((a, d) => a + dayLeft(d), 0);
    if (overdue > 0) st.push(`<span class="pill ${overdue > 180 ? "bad" : "warn"}">Behind: ~${fmtH(overdue)} from earlier days</span>`);
    else if (DAYS.some(d => d.day > ti && dIds(d).some(done))) st.push(`<span class="pill ok">Ahead of plan</span>`);
    else st.push(`<span class="pill ok">On track</span>`);
  }
  if (S.settings.exam && dayDate(LAST) > parseDate(S.settings.exam)) st.push(`<span class="pill bad">Plan now ends after your booked exam</span>`);
  const daysToExam = diffDays(examD, new Date());
  if (daysToExam >= 0) st.push(`<span>${daysToExam ? `Exam in <b>${plural(daysToExam, "day")}</b>` : "<b>Exam today</b>"}</span>`);

  if (stamp()) save();
  renderSlip();
  renderNext(ti, st);
  renderStats(dn, total);
  renderToday();
  renderRunning();
  renderReady();
  renderTrends();
  renderMap(ti);
  renderScores();
  renderPractice();
  if (view.day) setView(view.day, view.at, false);
}

// ---------- slip guard ----------
const overdueDay = () => DAYS.find(d => !dayDone(d) && dayDate(d.day) < midnight()) || null;
function renderSlip() {
  const el = document.getElementById("slip");
  const d = overdueDay();
  if (!d || S.slipSkip === today()) { el.hidden = true; el.innerHTML = ""; return; }
  const late = diffDays(new Date(), dayDate(d.day));
  el.hidden = false;
  el.innerHTML = `<span>Day ${d.day} was planned for <b>${fmtD(dayDate(d.day))}</b> and isn't finished.</span>` +
    `<button type="button" class="primary" data-slip="${late}">Move Day ${d.day}${d.day < LAST ? "–" + LAST : ""} ${plural(late, "day")} later</button>` +
    `<button type="button" data-slip="skip">Not now</button>` +
    (S.settings.exam ? `<span class="muted">Booked exam: ${fmtD(parseDate(S.settings.exam))}. Pearson VUE lets you reschedule up to 24 h before.</span>` : "");
}
function applySlip(v) {
  if (v === "skip") { S.slipSkip = today(); save(); refresh(); return; }
  const d = overdueDay(), n = +v;
  if (!d || !(n > 0)) return;
  S.slips.push({ from: d.day, n });
  save(); refresh();
  FX.banner("Schedule moved", `Day ${d.day} is today. Day ${LAST} is now ${fmtD(dayDate(LAST))}.`, "info");
}

// ---------- overview, today first: the day to work on, its next step and one big button to start or continue ----------
function nextStep() {
  for (const d of DAYS) {
    for (const g of d.groups) for (const it of g.items) if (!done(it[0])) return { d, g, it };
    if (!quizOk(d)) return { d, quiz: true };
  }
  return null;
}
function warmInfo() {
  if ((S.run && !S.run.done) || todayIdx() < 2 || !BANK.length) return null;
  const t = today();
  if (!S.warm[t]) {
    const n = QZ.pickWarmup(BANK, S.qs, S.srs, t, 5).length;
    if (n) return { kind: "warm", n };
  }
  const due = QZ.dueIds(S.srs, t).filter(id => QBY[id]).length;
  return due ? { kind: "review", n: due } : null;
}
function warmHTML() {
  const w = warmInfo();
  if (!w) return "";
  // the warm-up's Start is not orange: the card's one orange button is the day's
  return w.kind === "warm"
    ? `<div class="nx-warm"><span><b>Warm-up:</b> ${plural(w.n, "quick question")} from yesterday before you start. Recalling it now is what makes it stick.</span><span class="nx-wb"><button type="button" class="nx-wgo" data-warm="start">Start the warm-up</button><button type="button" class="ghost" data-warm="skip">Skip today</button></span></div>`
    : `<div class="nx-warm"><span><b>${plural(w.n, "missed question")}</b> ${w.n === 1 ? "is" : "are"} due for review.</span><span class="nx-wb"><button type="button" data-review>Review now</button></span></div>`;
}
const liveQuiz = d => !!(S.run && S.run.kind === "day" && S.run.day === d.id && !S.run.done);
// The card at the top of the overview. Its day is the one with the earliest open step (today's, unless you are behind
// or ahead); left: the day, its goal and its progress; right: the next step in a box of its block's colour, with the
// one big button under it. The head holds today's date and where the plan stands (st, from refresh).
function renderNext(ti, st) {
  const el = document.getElementById("next");
  const pre = warmHTML(), n = nextStep(), td = ti >= 1 && ti <= LAST ? DAYS[ti - 1] : null;
  const head = (k, date) => `<div class="nx-h"><span class="nx-k">${k}</span>${date ? `<span class="nx-d">${date}</span>` : ""}<span class="nx-st">${st.join("")}</span></div>`;
  if (!n) {
    el.className = "next all-done";
    setHTML(el, pre + head("All done", fmtD(new Date())) + `<p class="nx-fin"><span class="nx-k">Plan complete</span> Every day is done. Book the exam and go pass SAA-C03.</p>` +
      `<div class="nx-a"><button type="button" class="primary big" data-mock>${S.run && S.run.kind === "mock" && !S.run.done ? "Resume mock exam" : "Take a mock exam"} <span aria-hidden="true">→</span></button></div>`);
    return;
  }
  el.className = "next";
  const { d } = n, ids = dIds(d), k = ids.filter(done).length, cards = stepIds(d), at = n.quiz ? "quiz" : n.it[0];
  // the card is on another day than the calendar's: say which day today is on the plan
  const cal = td && td !== d ? `<p class="nx-cal">Today on the plan: Day ${td.day}, ${td.title}${dayDone(td) ? ` <span class="pill ok">✓ Done</span>` : `, about ${fmtH(dayLeft(td))}`}</p>` : "";
  // one segment per card, grouped like the day's blocks: the done ones filled ink, the next one signal and standing proud
  const seg = id => `<i class="${(id === "quiz" ? quizOk(d) : done(id)) ? "on" : id === at ? "nx" : ""}${id === "quiz" ? " q" : ""}"></i>`;
  const segs = d.groups.map(g => `<span style="flex:${g.items.length}">${gIds(g).map(seg).join("")}</span>`).join("") + (hasQuiz(d) ? `<span style="flex:1">${seg("quiz")}</span>` : "");
  let kick, body, act;
  if (n.quiz) {
    const r = S.quiz[d.id], tries = r ? r.tries.length : 0, live = liveQuiz(d);
    kick = "Up next";
    body = `<span class="tag t-quiz">Quiz</span><p class="nx-step">${live ? `You are on question ${S.run.i + 1} of ${S.run.ids.length}.` : tries ? `Best so far ${r.best} of ${QZ.DAILY}. A retake draws different questions.` : `Every step is done. ${QZ.DAILY} questions, pass at ${QZ.needed(QZ.DAILY)}.`}</p>`;
    act = `<button type="button" class="primary big" data-quiz-start="${d.id}">${live ? "Resume quiz" : tries ? `Retake the Day ${d.day} quiz` : `Take the Day ${d.day} quiz`} <span aria-hidden="true">→</span></button>` +
      `<a class="btn" href="#${d.id}/quiz">Open Day ${d.day}</a>`;
  } else {
    const t = TAGS[n.g.t] ? n.g.t : "check";
    kick = k ? "Next step" : "First step";
    body = `<span class="tag t-${t}">${n.g.label || TAGS[n.g.t]}</span><p class="nx-step">${n.it[1]}</p>` +
      (n.g.where ? `<p class="nx-where">${n.g.where}</p>` : "");
    act = `<a class="btn primary big" href="#${d.id}" data-start-day>${k ? "Continue" : "Start"} Day ${d.day} <span aria-hidden="true">→</span></a>`;
  }
  // The hero: a frame holding the day as a dot-matrix numeral in a sunk well, beside its title, goal and numbers.
  const dots = window.Datum ? Datum.dotNumeral(pad2(d.day), { pitch: 13, label: `Day ${d.day}` }) : `<b>${pad2(d.day)}</b>`;
  const meta = [["Steps", `${pad2(k)} / ${pad2(ids.length)}`], ["Time left", `~${fmtH(dayLeft(d))}`], ["Planned", fmtD(dayDate(d.day))]];
  // before Day 1 the head already says when the plan starts
  setHTML(el, pre + head(d.day === ti ? "Today" : "Next up", d.day === ti ? fmtD(dayDate(d.day)) : ti < 1 ? "" : `planned for ${fmtD(dayDate(d.day))}`) + cal +
    `<div class="nx-body"><div class="nx-day dm-frame dm-frame--foot is-live"><span class="dm-frame__tab"><span class="dm-idx">/${pad2(d.day)}</span>${d.day === ti ? "Today" : "Next up"}<span class="dm-slants" aria-hidden="true"></span></span>` +
    `<div class="hero"><div class="hero-n dm-readout__well"><div class="dm-readout__cap"><span class="dm-label">Day</span><span class="dm-data">/ ${LAST}</span></div>${dots}</div>` +
    `<div class="hero-x"><h2 class="hero-t">${d.title}</h2><p class="goal">${d.goal}</p>` +
    `<dl class="dm-meta">${meta.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("")}</dl></div></div>` +
    `<div class="hero-p"><div class="dm-progress__head"><span class="dm-label">Steps today</span><span class="dm-data">${pad2(k)} / ${pad2(ids.length)}${hasQuiz(d) ? " + quiz" : ""}</span></div>` +
    `<div class="segs" aria-hidden="true">${segs}</div>` +
    `<span class="muted">${k} of ${ids.length} steps done${hasQuiz(d) ? ", then the quiz" : ""}. About ${fmtH(dayLeft(d))} left.</span></div>` +
    `<span class="dm-frame__foot dm-data">${esc(d.id.toUpperCase())}</span></div>` +
    `<div class="nx-go dm-cut is-current"><div class="nx-gk"><span>${kick}</span><span class="muted">Step ${pad2(cards.indexOf(at) + 1)} / ${pad2(cards.length)}</span></div>` +
    body + `<div class="nx-a">${act}</div></div></div>`);
}

// ---------- day flow: one card at a time ----------
const plain = {};
// a rewritten card names its topic in its own headline; the others go by the step text
const stepTitle = id => (id === "quiz" ? "End-of-day quiz" : plain[id] || (plain[id] = strip((KEYS[id] || {}).head || itemIndex[id].it[1])));
const flipLabel = id => S.conf[id] === "shaky" ? "Shaky: show answer" : "Show answer";
function renderFlow(moved) {
  const d = dayOf(view.day), ids = stepIds(d), at = view.at, i = ids.indexOf(at);
  document.getElementById("fl-day").innerHTML = `<span class="fl-dn">Day ${d.day}</span><span class="fl-tt">${d.title}</span>` +
    `<span class="fl-dd">${fmtD(dayDate(d.day))}</span>${d.day === todayIdx() ? `<span class="today-badge">Today</span>` : ""}`;
  const tools = [`<button type="button" class="ghost" data-focus-view aria-pressed="${!!ui.focusView}" title="Hide the panels around the card (F)">${ui.focusView ? "Show panels" : "Focus view"}</button>`,
    `<button type="button" class="ghost" data-search title="Search (Ctrl+K)">Search</button>`,
    `<button type="button" class="ghost" data-sheet="daynotes">Day notes</button>`];
  if (d.groups.some(g => g.t === "build")) tools.push(`<button type="button" class="ghost" data-cleanup="${d.id}">Cleanup check</button>`);
  for (const t of d.tools || []) tools.push(t === "notebook" ? `<button type="button" class="ghost" data-sheet="notebook">Notebook</button>` : `<button type="button" class="ghost" data-sheet="weak">Weak spots</button>`);
  document.getElementById("fl-tools").innerHTML = tools.join("");

  // one dot per card, grouped like the day's blocks
  const dot = id => {
    const on = id === "quiz" ? quizOk(d) : done(id), t = stepTitle(id);
    return `<button type="button" class="dot${on ? " on" : ""}${id === "quiz" ? " qd" : ""}${id === fxMark.pop ? " pop" : ""}" data-at="${id}"${id === at ? ' aria-current="step"' : ""} title="${esc(t)}" aria-label="${esc(`Step ${ids.indexOf(id) + 1}: ${t}${on ? " (done)" : ""}`)}"></button>`;
  };
  // the block you are in is underlined in the strip and named under it
  const gi = d.groups.findIndex(g => g.items.some(it => it[0] === at)), cur = gi >= 0 && d.groups[gi];
  document.getElementById("fl-strip").innerHTML = d.groups.map((g, k) => `<span class="fl-g${g.key === fxMark.wave ? " wave" : ""}${k === gi ? " cur" : ""}">${g.items.map(it => dot(it[0])).join("")}</span>`).join("") +
    (hasQuiz(d) ? `<span class="fl-g${at === "quiz" ? " cur" : ""}">${dot("quiz")}</span>` : "");
  document.getElementById("fl-count").textContent = at === "done" ? "Day complete" : `Step ${i + 1} of ${ids.length}`;
  document.getElementById("fl-blk").textContent = at === "quiz" ? "End-of-day quiz" : !cur ? ""
    : d.groups.length > 1 ? `${cur.label || TAGS[cur.t]}, block ${gi + 1} of ${d.groups.length}` : cur.label || TAGS[cur.t];

  // Typing in a field on the card or its panels: leave them alone, only the frame around them changes.
  const typing = !moved && bodyEl.contains(document.activeElement) && document.activeElement.matches("textarea,input");
  if (!typing) {
    const answer = !moved && cardEl.querySelector(".card-a:not([hidden])");
    const step = at !== "quiz" && at !== "done", side = step ? sideHTML(at) : { l: "", r: "" };
    cardEl.innerHTML = at === "quiz" ? quizCardHTML(d) : at === "done" ? doneCardHTML(d) : stepCardHTML(at);
    sideL.innerHTML = side.l; sideR.innerHTML = side.r;
    sideL.hidden = !side.l; sideR.hidden = !side.r;
    bodyEl.classList.toggle("no-l", !side.l); bodyEl.classList.toggle("no-r", !side.r);
    applyGlossary(cardEl);
    dgMark(cardEl);
    if (answer) flip(at, true);
    if (moved) {
      for (const el of [cardEl, sideL, sideR]) { el.classList.remove("in"); void el.offsetWidth; el.classList.add("in"); }
      // the arrival plays once: a re-render of the same card (a picked answer, a note saved) must not replay it
      clearTimeout(inT); inT = setTimeout(() => { for (const el of [cardEl, sideL, sideR]) el.classList.remove("in"); }, 1000);
    }
  }

  // Back, the card's main action, Next
  const back = at === "done" ? ids[ids.length - 1] : ids[i - 1] || "";
  const next = at === "done" ? "" : ids[i + 1] || (dayDone(d) ? "done" : "");
  // the keys that press them (the keydown handler below) show as key caps; on touch screens the arrows stay plain arrows
  const kh = k => `<kbd class="kh${k.length > 1 ? " kh-w" : ""}" aria-hidden="true">${k}</kbd>`, enter = ` aria-keyshortcuts="Enter"`;
  let mid, isDone = false;
  if (at === "done") {
    const nx = DAYS.find(x => x.day > d.day && !dayDone(x));
    mid = nx ? `<a class="btn primary big" href="#${nx.id}" data-main data-start-day${enter}>Start Day ${nx.day}${kh("Enter")}</a>` : `<button type="button" class="primary big" data-home data-main${enter}>Back to the overview${kh("Enter")}</button>`;
  } else if (at === "quiz") {
    const r = S.quiz[d.id], live = liveQuiz(d);
    isDone = quizOk(d) && !live;
    mid = isDone ? `<span class="fl-ok">✓ Passed</span>`
      : `<button type="button" class="primary big" data-quiz-start="${d.id}" data-main${enter}${itemsDone(d) || live ? "" : " disabled"}>${live ? "Resume quiz" : r && r.tries.length ? "Retake quiz" : "Start quiz"}${kh("Enter")}</button>`;
  } else {
    isDone = done(at);
    mid = isDone ? `<span class="fl-ok">✓ Completed</span><button type="button" class="link" data-undo="${at}">Undo</button>`
      : `<button type="button" class="primary big" data-complete="${at}" data-main${enter}>✓ Mark complete${kh("Enter")}</button>`;
  }
  const nextMain = isDone && next;
  document.getElementById("fl-nav").innerHTML =
    `<button type="button" class="fl-b ghost" data-back data-at="${back}" aria-keyshortcuts="ArrowLeft"${back ? "" : " disabled"}>${kh("←")} Back</button>` +
    `<div class="fl-mid">${mid}</div>` +
    (at === "done" ? `<span></span>` : `<button type="button" class="fl-n ${nextMain ? "primary" : "ghost"}" data-next data-at="${next}" aria-keyshortcuts="ArrowRight${nextMain ? " Enter" : ""}"${nextMain ? " data-main" : ""}${next ? "" : " disabled"}>Next ${kh("→")}</button>`);
}

// Docs for a step: the pages its key points cite, then the AWS pages its own quiz questions point to most often
// (questions that name the step or have one of its topics as their main topic).
function stepDocs(id) {
  const out = [], seen = new Set();
  const add = (label, url) => { if (/^https:\/\//.test(url) && !seen.has(url)) { seen.add(url); out.push([label, url]); } };
  ((KEYS[id] || {}).docs || []).forEach(x => add(x[0], x[1]));
  const n = {}, mine = STEP_TAGS[id] || [];
  (QREF[id] || []).forEach(q => { if (DOCS[q.doc] && (q.ref.includes(id) || mine.includes(q.tags[0]))) n[q.doc] = (n[q.doc] || 0) + 1; });
  Object.keys(n).sort((a, b) => n[b] - n[a]).forEach(k => add(DOCS[k][0], DOCS[k][1]));
  return out.slice(0, 5);
}
// Exam topics a step feeds: the ones the plan names for it, else the tags of the quiz questions that point at it, most frequent first.
function stepTags(id) {
  if (STEP_TAGS[id]) return STEP_TAGS[id].slice(0, 4);
  const n = {};
  (QREF[id] || []).forEach(q => q.tags.forEach(t => { n[t] = (n[t] || 0) + 1; }));
  return Object.keys(n).sort((a, b) => n[b] - n[a]).slice(0, 4);
}
function tagStats() {
  const m = {};
  for (const q of WITH_CARDQ) {
    const s = S.qs[q.id];
    if (s) for (const t of q.tags) { const a = m[t] || (m[t] = [0, 0]); a[0] += s.right; a[1] += s.seen; }
  }
  return m;
}
// A section of the card or a panel: an outlined panel under a mono label; the marker beside the label says what kind
// of thing it holds (signal for why, alert hazard for the trap, ink for the rest). icon stays for the call sites, unused.
const box = (kind, icon, title, body, cls = "") =>
  `<section class="box b-${kind}${cls ? " " + cls : ""}"><h3 class="box-h"><span class="bi" aria-hidden="true"></span>${title}</h3>${body}</section>`;
// A box that folds; whether it is open is remembered across cards, in this browser.
const foldBox = (kind, icon, sec, title, n, body, openByDefault) =>
  `<details class="box b-${kind} c-fold" data-sec="${sec}"${(sec in ui ? ui[sec] : openByDefault) ? " open" : ""}><summary class="box-h"><span class="bi" aria-hidden="true"></span>${title} <span class="muted">${n}</span></summary>${body}</details>`;
// ---------- course diagrams: one per lecture course, on the cards of the course (cN) and of its labs (lN) ----------
const DGS = window.DIAGRAMS || {};
const dgKey = id => { const m = /^[cl](\d+)[a-z]$/.exec(id); return m && DGS["c" + m[1]] && window.DG ? "c" + m[1] : ""; };
let dgSel = { id: "", part: "" };   // the part whose detail is open on the card on screen
// The parts this step is about: their tags meet the step's topics.
const dgRel = (id, dg) => { const tags = stepTags(id); return Object.keys(dg.parts || {}).filter(p => (dg.parts[p].tags || []).some(t => tags.includes(t))); };
function dgPartHTML(dg, pid) {
  const p = (dg.parts || {})[pid];
  if (!p) return `<p class="muted dg-hint">Click a part of the picture to see why it is there and what the exam asks about it.</p>`;
  return `<h4 class="dg-pn">${esc(p.name)}</h4><p class="dg-pw txt">${p.why}</p>` +
    ((p.k || []).length ? `<ul class="k-list">${p.k.map(([l, t]) => `<li><b class="k-l">${esc(l)}</b><span>${t}</span></li>`).join("")}</ul>` : "") +
    (p.trap ? `<p class="dg-trap"><b>[ Trap ]</b> ${p.trap}</p>` : "");
}
// The picture with the step's parts as buttons and the open part explained under it (or beside it, in the larger view).
function dgViewHTML(key, id, sel, big) {
  const dg = DGS[key], rel = id ? dgRel(id, dg) : [];
  const chips = rel.length ? `<p class="dg-rel"><span class="muted">This step:</span>${rel.map(p => `<button type="button" class="sm" data-dg-part="${esc(p)}">${esc(dg.parts[p].name)}</button>`).join("")}</p>` : "";
  return `<div class="dg-box" data-dg="${key}" data-rel="${esc(rel.join(" "))}">${chips}<div class="dg-pic"><div class="dg-wrap">${DG.svg(dg, key + (big ? "-big" : ""))}</div>` +
    (big ? "" : `<button type="button" class="sm dg-big" data-dg-big="${esc(id)}" title="Open the diagram larger">Larger ↗</button>`) +
    `</div><div class="dg-part" aria-live="polite" data-sel="${esc(sel)}">${dgPartHTML(dg, sel)}</div></div>`;
}
function dgHTML(id) {
  const key = dgKey(id);
  if (!key) return "";
  const dg = DGS[key];
  if (dgSel.id !== id) dgSel = { id, part: dgRel(id, dg)[0] || "" };
  return foldBox("map", "", "dg", "Course diagram", "", `<p class="dg-t"><b>${esc(dg.title)}</b></p><p class="dg-why txt">${dg.why}</p>${dgViewHTML(key, id, dgSel.part, false)}`, true);
}
// Mark the open part and the step's parts on the picture (after it is on screen).
function dgMark(root) {
  (root || document).querySelectorAll(".dg-box").forEach(b => {
    const sel = b.querySelector(".dg-part").dataset.sel, rel = b.dataset.rel.split(" ");
    b.querySelectorAll(".dg [data-part]").forEach(el => { el.classList.toggle("on", el.dataset.part === sel); el.classList.toggle("rel", rel.includes(el.dataset.part)); el.setAttribute("aria-pressed", el.dataset.part === sel); });
    b.querySelectorAll("[data-dg-part]").forEach(el => el.setAttribute("aria-pressed", el.dataset.dgPart === sel));
  });
}
function dgPick(b, pid) {
  const part = b.querySelector(".dg-part");
  part.dataset.sel = pid;
  part.innerHTML = dgPartHTML(DGS[b.dataset.dg], pid);
  applyGlossary(part);
  if (cardEl.contains(b) || shDlg.dataset.kind === "dg") dgSel.part = pid;   // the card keeps the choice, also from the larger view
  dgMark(b.parentNode);
}
function openDiagram(id) {
  const key = dgKey(id);
  if (!key) return;
  shDlg.dataset.dg = id;
  openSheet("dg");
}
function dgSheet() {
  const id = shDlg.dataset.dg || "", key = dgKey(id);
  if (!key) return ["Course diagram", ""];
  return [DGS[key].title, `<p class="muted dg-why txt">${DGS[key].why}</p>${dgViewHTML(key, id, dgSel.id === id ? dgSel.part : "", true)}`];
}

// ---------- look-alikes: services the exam sets against each other, side by side ----------
const LA = window.LOOKALIKES || [], LA_BY = Object.create(null);
LA.forEach(e => { LA_BY[e.id] = e; });
const laRx = new Map();
// a match word counts whole, with no letter or digit touching it (so "SSE-KMS" names KMS)
const laWord = w => laRx.get(w) || laRx.set(w, new RegExp(`(?<![A-Za-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`, "i")).get(w);
const laCols = (text, e) => e.match.map((ws, i) => (ws.some(w => laWord(w).test(text)) ? i : -1)).filter(i => i >= 0);
// The tables a missed question links to: a right option names one service of the table and a wrong option another.
// The options you picked count first; when they name none, any wrong option does.
function laFor(q, picked) {
  const wrongAll = q.o.map((_, i) => i).filter(i => !q.a.includes(i)), mine = (picked || []).filter(i => wrongAll.includes(i));
  const hit = wrong => LA.filter(e => {
    const rc = q.a.map(i => laCols(plainOf(q.o[i]), e)), wc = wrong.map(i => laCols(plainOf(q.o[i]), e));
    return rc.some(r => wc.some(w => r.some(i => w.some(j => i !== j))));
  });
  const a = mine.length ? hit(mine) : [];
  return a.length ? a : hit(wrongAll);
}
const laLinks = list => list.length ? `<div class="qz-la"><span>Compare side by side:</span>${list.map(e => `<button type="button" class="link" data-look="${esc(e.id)}">${esc(e.title)}</button>`).join("")}</div>` : "";
const laTag = tag => LA.filter(e => (e.tags || []).includes(tag));
let laOn = "";   // the table a link opened: shown first and marked
function lookHTML() {
  const miss = Object.create(null);
  for (const { q, b } of bookEntries()) if (!b.fixed) for (const e of laFor(q)) miss[e.id] = (miss[e.id] || 0) + 1;
  return `<p class="muted">Services the exam sets against each other, row by row. A question you miss whose right and wrong answers name two services of one table links here; the number is your open notebook questions that do.</p>` +
    `<div class="la-nav">${LA.map(e => `<button type="button" class="sm${e.id === laOn ? " on" : ""}" data-la-go="${esc(e.id)}">${esc(e.title)}${miss[e.id] ? ` <span class="pill warn">${miss[e.id]}</span>` : ""}</button>`).join("")}</div>` +
    LA.map(e => `<section class="la${e.id === laOn ? " on" : ""}" id="la-${esc(e.id)}"><h3 class="sub-h">${esc(e.title)}</h3><p class="la-why">${e.why}</p>` +
      `<table class="la-t"><thead><tr><th></th>${e.cols.map(c => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>` +
      e.rows.map((r, i) => `<tr${i === e.rows.length - 1 ? ' class="la-cue"' : ""}><th scope="row">${esc(r[0])}</th>${r.slice(1).map((c, k) => `<td data-col="${esc(e.cols[k])}">${c}</td>`).join("")}</tr>`).join("") +
      `</tbody></table>${(e.docs || []).length ? `<p class="la-docs">AWS pages: ${e.docs.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join(" · ")}</p>` : ""}</section>`).join("");
}
function openLook(id) {
  laOn = LA_BY[id] ? id : "";
  openSheet("look");
  const el = laOn && document.getElementById("la-" + laOn);
  if (el) el.scrollIntoView({ block: "start" });
}

function scoreFieldHTML(k) {
  const src = document.querySelector(`#scores [data-score="${k}"]`);
  if (!src) return "";
  const lab = src.closest("label").cloneNode(true);
  lab.querySelector("input").setAttribute("value", S.scores[k] ?? "");
  return `<div class="scores-grid c-score">${lab.outerHTML}</div>`;
}
// The card reads like an article, top to bottom: the headline and where to do it, then why it exists (the problem,
// then the idea that answers it), what to do, the model answer, what to know, the exam trap, and your notes at the end.
// What you look up or practise with sits in the sidebar (sideHTML).
const LESSONS = { watch: "In this lecture", play: "In this lab" };
function stepCardHTML(id) {
  const { d, g, it } = itemIndex[id], [, txt, note] = it;
  const url = linkFor(g.link), n = g.items.length, kp = KEYS[id];
  const head = kp && kp.head, steps = kp && kp.do;
  // "<b>Course</b> → lessons": a rewritten card shows the course over its headline and the lessons under it
  const parts = /^<b>([^<]{3,120})<\/b>\s*→\s*(.+)$/.exec(txt);
  let h = `<header class="c-head"><div class="c-h"><span class="tag t-${g.t}">${g.label || TAGS[g.t]}</span>` +
    (n > 1 ? `<span class="c-meta">${g.items.indexOf(it) + 1} of ${n}</span>` : "") +
    (g.min ? `<span class="c-meta">~${fmtH(g.min)}${n > 1 ? " for this block" : ""}</span>` : "") +
    (done(id) ? `<span class="pill ok">✓ Completed</span>` : "") + `</div>`;
  if (head && parts && !steps) h += `<p class="c-kick">${parts[1]}</p>`;
  h += head ? `<h2 class="c-t c-hl" tabindex="-1">${esc(head)}</h2>` : `<h2 class="c-t txt" tabindex="-1">${txt}</h2>`;
  // where to do it comes right after the title: it is where the step happens, read before anything else
  if (g.where || url) h += `<div class="c-where"><span class="bi" aria-hidden="true"></span>${g.where ? `<span class="where">Where: ${g.where}</span>` : `<span class="where"></span>`}${url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Open ↗</a>` : ""}</div>`;
  // a reading block ("Read: …") is a Watch group too, but you read it
  const lessons = /^Read\b/.test(g.label || "") ? "To read" : LESSONS[g.t];
  if (head && !steps) h += `<p class="c-les txt">${lessons ? `${lessons}: ` : ""}${parts ? parts[2] : txt}</p>`;
  if (note && !steps) h += `<p class="c-n txt">${note}</p>`;
  h += `</header>`;
  // Purpose first: the problem or need behind the step, then the idea that answers it, before any detail.
  if (kp && kp.why) h += box("why", "", g.t === "setup" || g.t === "prep" ? "Why this step" : "Why it exists",
    `<p class="txt">${kp.why}</p>${kp.idea ? `<p class="txt c-idea">${kp.idea}</p>` : ""}`, "c-why");
  // a step you carry out: its numbered actions (they replace the step text and its note) and how you know it worked
  if (steps) h += box("do", "", "Do it", `<ol class="c-do txt">${steps.map(s => `<li>${s}</li>`).join("")}</ol>` +
    (kp.done ? `<p class="c-done txt"><b>Done when:</b> ${kp.done}</p>` : ""), "c-doit");
  if (SCORE_AT[id]) h += scoreFieldHTML(SCORE_AT[id]);
  if (d.decision === id) { const [cls, v] = verdictHTML(); h += `<div class="verdict ${cls}" data-verdict>${v}</div>`; }
  if (g.t === "check" && CARDS[id]) {
    h += box("check", "", "Self-check", `<p class="muted">Explain it out loud first, then open the model answer and compare.</p>` +
      `<button type="button" class="flip${S.conf[id] === "shaky" ? " shaky" : ""}" data-flip="${id}" aria-expanded="false" aria-controls="ca-${id}">${flipLabel(id)}</button>` +
      `<div class="card-a" id="ca-${id}" hidden><div class="card-t">${CARDS[id]}</div><div class="card-b"><span class="muted">How close were you?</span>` +
      `<button type="button" data-conf="ok" data-cid="${id}">Got it</button><button type="button" data-conf="shaky" data-cid="${id}">Shaky</button></div></div>`, "c-check");
  }
  if (kp) {
    // a point is [label, text]; a bare string is the older form
    const pts = kp.k || [], labelled = pts.some(Array.isArray);
    if (pts.length) {
      const li = x => (Array.isArray(x) ? `<li><b class="k-l">${x[0]}</b><span>${x[1]}</span></li>` : `<li>${x}</li>`);
      h += box("know", "", kp.why ? "What to know" : "Key points", `<ul${labelled ? ' class="k-list"' : ""}>${pts.map(li).join("")}</ul>`, "c-key");
    }
    if (kp.trap) h += box("trap", "", "Exam trap", `<p>${kp.trap}</p>`, "c-trap");
  }
  // billable things: on the steps that create something, and on the block's last step (the cleanup)
  if (g.t === "build" && (BILL.steps[id] || g.items.indexOf(it) === g.items.length - 1)) h += costBoxHTML(d);
  // after the reading, the knowledge check: one question on what this card taught; then your notes close the article, like the comments under a post
  return h + dgHTML(id) + cardQHTML(id) +
    `<label class="box b-notes c-notes"><span class="box-h"><span class="bi" aria-hidden="true"></span>My notes on this step <span class="saved" data-saved="${id}">saved</span></span>` +
    `<textarea data-inote="${id}" maxlength="${NOTE_MAX}" placeholder="What surprised you, what to look at again…">${esc(S.inotes[id] || "")}</textarea></label>`;
}
// Two lists side by side when there is room (CSS decides); one alone needs no columns.
const sideCols = (a, b) => (a && b ? `<div class="side-cols"><div class="side-col">${a}</div><div class="side-col">${b}</div></div>` : a + b);
// The sidebar, like the one beside an article: reference, not part of the read. r = "On the exam": the exam topics with
// your accuracy and a practice round, look-alikes, how the exam words these topics. l = "Look it up": AWS pages, terms.
function sideHTML(id) {
  const { it } = itemIndex[id], [, txt, note] = it, kp = KEYS[id], qs = QREF[id] || [];
  const docs = stepDocs(id), tags = stepTags(id);
  const terms = termsIn(strip(`${txt} ${note || ""} ${kp ? `${kp.head || ""} ${kp.why || ""} ${kp.idea || ""} ${(kp.do || []).join(" ")} ${kp.done || ""} ${(kp.k || []).flat().join(" ")} ${kp.trap || ""}` : ""}`)).slice(0, 8);
  const cues = [];
  for (const t of tags) for (const c of CUES) if ((CUE_TAGS[c[0]] || []).includes(t) && !cues.includes(c) && cues.length < 4) cues.push(c);

  const l = sideCols(
    docs.length ? box("docs", "", "AWS docs", `<ul class="c-docs">${docs.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a></li>`).join("")}</ul>`) : "",
    terms.length ? foldBox("terms", "", "terms", "Terms in this step", terms.length, `<dl class="c-terms">${terms.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`, true) : "");

  // how you stand and what to tell apart in one column, how the exam words it in the other
  let r = "";
  if (tags.length || qs.length) {
    const acc = tagStats();
    let b = "";
    if (tags.length) b += `<ul class="c-tags">${tags.map(t => {
      const a = acc[t];
      return `<li><span>${esc(t)}</span><span class="tr"><span class="fi${a && a[0] / a[1] < 0.7 ? " low" : ""}" style="width:${a ? pct(a[0], a[1]) : 0}%"></span></span><span class="wk-n">${a ? `${a[0]}/${a[1]}` : "new"}</span></li>`;
    }).join("")}</ul><p class="muted c-hint">Your quiz answers on each topic so far, right of all.</p>`;
    if (qs.length) {
      const seen = qs.filter(q => S.qs[q.id]), right = seen.filter(q => S.qs[q.id].last).length;
      const live = S.run && !S.run.done && S.run.kind === "step" && S.run.item === id;
      b += `<div class="c-prac"><span>${plural(qs.length, "quiz question")} ${qs.length === 1 ? "covers" : "cover"} this step.` +
        (seen.length ? ` You have answered ${seen.length}, ${right} right at the last try.` : "") + `</span>` +
        `<button type="button" data-step-quiz="${id}">${live ? "Resume practice" : `Try ${Math.min(QZ.STEP, qs.length)} now`}</button></div>`;
    }
    r += box("exam", "", "Exam topics", b);
  }
  const las = LA.filter(e => (e.tags || []).some(t => tags.includes(t))).slice(0, 4);
  if (las.length) r += box("look", "", "Look-alikes on these topics", `<ul class="c-la">${las.map(e => `<li><button type="button" class="link" data-look="${esc(e.id)}">${esc(e.title)}</button></li>`).join("")}</ul>`);
  r = sideCols(r, cues.length ? foldBox("cues", "", "cues", "Exam wording on these topics", cues.length,
    `<ul class="cue-l">${cues.map(c => `<li><b>${esc(c[0])}</b><span>→ ${esc(c[1])}</span><span class="muted">${esc(c[2])}</span></li>`).join("")}</ul>`, true) : "");
  return { l: l && `<div class="side-t">Look it up</div>${l}`, r: r && `<div class="side-t">On the exam</div>${r}` };
}
function quizCardHTML(d) {
  const r = S.quiz[d.id], tries = r ? r.tries.length : 0, ok = quizOk(d), live = liveQuiz(d);
  const open = dIds(d).filter(id => !done(id));
  let h = `<div class="c-h"><span class="tag t-quiz">Quiz</span><span class="c-meta">${QZ.DAILY} questions, ~${QUIZ_MIN} min</span>${ok ? `<span class="pill ok">✓ Passed</span>` : ""}</div>` +
    `<h2 class="c-t" tabindex="-1">End-of-day quiz</h2><p class="c-n">${QZ.describe(d)}. Pass at ${QZ.needed(QZ.DAILY)} of ${QZ.DAILY} to complete Day ${d.day}.</p>`;
  if (live) h += `<p class="c-st">In progress: question ${S.run.i + 1} of ${S.run.ids.length}.</p>`;
  else if (ok) h += `<p class="c-st ok">Passed with ${r.best} of ${QZ.DAILY} on ${fmtD(parseDate(r.passed))}.</p><div class="c-w"><button type="button" data-quiz-start="${d.id}">Practice again</button></div>`;
  else if (open.length) {
    h += `<p class="c-st">${plural(open.length, "step")} still open. The quiz unlocks when every step of the day is complete.</p>` +
      `<ul class="c-open">${open.map(id => `<li><button type="button" class="link" data-at="${id}">${esc(stepTitle(id))}</button></li>`).join("")}</ul>`;
  } else {
    h += (tries ? `<p class="c-st">Best so far ${r.best} of ${QZ.DAILY} after ${plural(tries, "try", "tries")}. A retake draws different questions.</p>` : "") +
      `<ul class="qz-facts"><li>After each answer you see why every option is right or wrong, and which step to go back to.</li>` +
      `<li>Questions you miss come back for review over the next days and land in your notebook.</li>` +
      `<li>You can close the quiz and resume it later; your answers are kept.</li></ul>`;
  }
  if (tries) h += `<p class="muted">Tries so far: ${r.tries.map(t => `${t.score} of ${t.n}`).join(", ")}.</p>`;
  return h;
}
function doneCardHTML(d) {
  const r = S.quiz[d.id], m = S.log[d.id] || 0, n = dIds(d).length;
  const nx = DAYS.find(x => x.day > d.day && !dayDone(x));
  const facts = [["Steps", `${n} of ${n}`]];
  if (r && r.passed) facts.push(["Quiz", `${r.best} of ${QZ.DAILY}, ${plural(r.tries.length, "try", "tries")}`]);
  if (m >= 1) facts.push(["Focus time", `${fmtH(m)} of ~${fmtH(dayPlanned(d))} planned`]);
  if (S.dayDone[d.id]) facts.push(["Finished", fmtD(parseDate(S.dayDone[d.id]))]);
  return `<div class="c-h"><span class="pill ok">✓ Day complete</span></div><h2 class="c-t" tabindex="-1">Day ${d.day} is done</h2><p class="c-n">${d.title}</p>` +
    `<dl class="c-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>` +
    (nx ? `<p class="c-st">Next: <b>Day ${nx.day}</b>, ${nx.title} (${fmtD(dayDate(nx.day))}).</p>`
      : DAYS.every(dayDone) ? `<p class="c-st">Every day is done. Take a mock exam from the overview, then go pass SAA-C03.</p>` : "");
}
function flip(id, open) {
  const panel = document.getElementById("ca-" + id), b = cardEl.querySelector(`[data-flip="${id}"]`);
  if (!panel || !b) return;
  panel.hidden = !open;
  b.setAttribute("aria-expanded", String(open));
}

// ---------- completing steps & celebrations ----------
// The ladder, small to large: a step, a block of the day, the last step (the quiz opens), the day, the week, everything.
const fxMark = { pop: "", wave: "" };   // the dot and the block to animate in the strip, for a moment
let fxMarkT = 0;
function markStrip(pop, wave) {
  fxMark.pop = pop; fxMark.wave = wave || "";
  clearTimeout(fxMarkT);
  fxMarkT = setTimeout(() => { fxMark.pop = fxMark.wave = ""; }, 900);
}
// A long step (a lab, a lecture chunk) earns a bigger burst than a two-minute setup click.
const longStep = g => (g.min || 0) / g.items.length >= 30;
// the short line above the buttons: how far the day is
function stepToast(d) {
  const ids = dIds(d), n = ids.filter(done).length, left = ids.length - n;
  const half = ids.length >= 4 && n === Math.ceil(ids.length / 2);
  FX.toast(half ? `<b>Halfway through Day ${d.day}.</b> ${plural(left, "step")} to go`
    : `<b>✓ ${n} of ${ids.length}</b> steps done. ${left === 0 ? "Every step done" : left === 1 ? "One more step" : `${left} steps to go`}`, half ? "half" : "");
}
function stepDone(d, g, el) {
  FX.step(el, { n: dIds(d).filter(done).length, big: longStep(g) });
  stepToast(d);
}
function blockDone(d, g, el) {
  const n = d.groups.filter(groupDone).length;
  stepToast(d);
  if (itemsDone(d) && hasQuiz(d)) {
    FX.quizOpen();
    FX.banner("All steps done", `Day ${d.day} quiz open. ${QZ.DAILY} questions, pass mark ${QZ.needed(QZ.DAILY)}.`, "block");
  } else {
    FX.block(el);
    FX.banner(strip(g.label || TAGS[g.t]), `Block ${n} of ${d.groups.length} done. About ${fmtH(dayLeft(d))} left today.`, "block");
  }
}
function setTick(id, val, srcEl) {
  const { d, g } = itemIndex[id];
  const week = weekOf(d);
  const was = { g: groupDone(g), d: dayDone(d), w: week.every(dayDone), a: DAYS.every(dayDone) };
  if (val) S.ticks[id] = true; else delete S.ticks[id];
  markDayDone(d);
  const billed = billFor(id, val, d);
  save();
  if (billed.length) setTimeout(() => FX.toast(`Added to the <b>still running</b> list: ${billed.map(esc).join(", ")}`), 900);
  if (val) {
    // effects start from the button that was pressed, so fire them before the card is redrawn
    let cel = 0;   // how long a top rung's banner stays up
    if (!was.a && DAYS.every(dayDone)) cel = celebrate("all", d);
    else if (!was.w && week.every(dayDone)) cel = celebrate("week", d);
    else if (!was.d && dayDone(d)) cel = celebrate("day", d);
    else if (!was.g && groupDone(g)) blockDone(d, g, srcEl);
    else stepDone(d, g, srcEl);
    markStrip(id, !was.g && groupDone(g) ? g.key : "");
    const builds = d.groups.filter(x => x.t === "build");
    if (g.t === "build" && !was.g && builds.every(groupDone)) setTimeout(() => whenFree(() => openCleanup(d.id)), cel ? cel + 200 : 1100);
  }
  showGains(val ? award() : [], 1200);
  refresh();
}
// Mark the step on screen complete and move on: to the next open step, then the quiz, then the day's summary.
function complete(id, srcEl) {
  FX.unlock();
  setTick(id, true, srcEl);
  autoFocus();
  const d = itemIndex[id].d;
  if (view.day !== d.id) return;
  const ids = dIds(d), i = ids.indexOf(id);
  move(ids.slice(i + 1).concat(ids.slice(0, i)).find(x => !done(x)) || (dayDone(d) ? "done" : hasQuiz(d) ? "quiz" : id));
}
// The top rungs. Returns how long the banner stays up, so what follows (the cleanup check, the mock's prompt) waits for it.
function celebrate(kind, d) {
  const sk = streak(), nDone = DAYS.filter(dayDone).length;
  const skTxt = sk > 1 ? ` Streak ${pad2(sk)} days.` : "";
  // the banner's mark: the day, the week or the whole plan as dot-matrix characters (fx.js shows a square without art.js)
  const dots = s => (window.Datum ? Datum.dotNumeral(s, { pitch: 8, label: s }) : "");
  let ms;
  if (kind === "all") { FX.all(); ms = FX.banner(`All ${DAYS.length} days done`, `${pad2(nDone)} / ${DAYS.length} days. Plan complete. Next: pass SAA-C03.`, "all", dots(`${nDone}/${DAYS.length}`)); }
  else if (kind === "week") {
    const w = WEEK[d.id], next = WEEKS[w + 1];
    FX.week(); ms = FX.banner(`Week ${w + 1} complete`, (next ? `Next: ${strip(next)}.` : "Only the exam left.") + skTxt, "week", dots(`W${pad2(w + 1)}`));
  }
  else { FX.day(); ms = FX.banner(`Day ${d.day} complete`, `${pad2(nDone)} / ${DAYS.length} days done.${skTxt}`, "day", dots(pad2(d.day))); }
  if ([3, 5, 7, 10, 14, 21].includes(sk)) setTimeout(() => FX.badge(`${pad2(sk)}D`, `${sk} days in a row`, "Study streak", sk >= 10 ? "epic" : "gold"), 3400);
  return ms;
}

// ---------- XP, levels and badges ----------
// XP is worked out from what the state already holds, so syncing and merging need no rules of their own:
// right answers that teach something (qs[].xp, see learn()), completed steps, day quizzes passed, plus each badge earned.
const XP = { right: 10, step: 5, pass: 100 };
// Badges are earned once and kept with the date (S.ach). Most are read from the state, so progress made
// before badges existed earns them too (quietly, at boot); the streak ones (`row`) only while answering.
// i = the badge's code: a short mono label in its cell, mostly the badge's own threshold (Datum has no icons).
const ACH = [
  { id: "first", i: "1ST", t: "First one right", d: "Answer a quiz question right.", xp: 20, ok: c => c.right >= 1 },
  { id: "row5", i: "R05", t: "On a roll", d: "5 right answers in a row.", xp: 50, row: 5 },
  { id: "row10", i: "R10", t: "On fire", d: "10 right answers in a row.", xp: 100, row: 10 },
  { id: "row20", i: "R20", t: "Legendary", d: "20 right answers in a row.", xp: 200, row: 20 },
  { id: "row30", i: "R30", t: "Flawless", d: "30 right answers in a row: a whole day quiz.", xp: 300, row: 30 },
  { id: "pass1", i: "P01", t: "First quiz passed", d: "Pass an end-of-day quiz.", xp: 50, ok: c => c.passed >= 1 },
  { id: "perfect", i: "MAX", t: "Perfect score", d: "Every answer of a day quiz right.", xp: 200, ok: c => c.perfect },
  { id: "comeback", i: "2ND", t: "Comeback", d: "Pass a day quiz you failed before.", xp: 100, ok: c => c.comeback },
  { id: "right100", i: "100", t: "A hundred right", d: "100 right answers that earned XP.", xp: 100, ok: c => c.right >= 100 },
  { id: "right500", i: "500", t: "Five hundred right", d: "500 right answers that earned XP.", xp: 250, ok: c => c.right >= 500 },
  { id: "fix10", i: "FIX", t: "Mistake fixer", d: "Answer 10 notebook questions right after missing them.", xp: 100, ok: c => c.fixed >= 10 },
  { id: "warm5", i: "AM5", t: "Early bird", d: "Do the morning warm-up on 5 days.", xp: 75, ok: c => c.warm >= 5 },
  { id: "drill15", i: "D15", t: "Quick draw", d: "15 or more in the 60-second drill.", xp: 100, ok: c => c.drill >= 15 },
  { id: "focus10", i: "10H", t: "Deep work", d: "10 hours of focus time logged.", xp: 150, ok: c => c.focus >= 600 },
  { id: "mock80", i: "80%", t: "Exam ready", d: "80% or more on a mock exam.", xp: 300, ok: c => c.mock >= 80 }
];
const ACH_BY = Object.assign(Object.create(null), Object.fromEntries(ACH.map(a => [a.id, a])));
// A title for every two levels; the plan's XP adds up to about level 20 by exam day.
const RANKS = ["Cloud curious", "Console clicker", "IAM apprentice", "Subnet scout", "VPC builder", "Load balancer", "Auto scaler", "Multi-AZ", "Well-Architected", "Solutions architect"];
const rankOf = n => RANKS[Math.min(RANKS.length - 1, Math.floor((n - 1) / 2))];
const lvAt = n => 40 * n * (n - 1);   // XP that reaches level n: 80 for level 2, 240 for 3, 3,600 for 10
function xpTotal() {
  let x = 0;
  for (const id in S.qs) x += XP.right * S.qs[id].xp;
  x += XP.step * Object.keys(S.ticks).filter(id => itemIndex[id]).length;
  x += XP.pass * DAYS.filter(d => S.quiz[d.id] && S.quiz[d.id].passed).length;
  for (const id in S.ach) if (ACH_BY[id]) x += ACH_BY[id].xp;
  return x + CHAL_XP * Object.keys(S.chal).length;
}
function levelOf(x) {
  x = Number.isFinite(x) && x > 0 ? Math.min(x, 1e12) : 0;
  let n = Math.max(1, Math.floor((1 + Math.sqrt(1 + x / 10)) / 2));
  while (lvAt(n + 1) <= x) n++;
  while (n > 1 && lvAt(n) > x) n--;
  return { n, x, from: lvAt(n), to: lvAt(n + 1), pct: (x - lvAt(n)) / (lvAt(n + 1) - lvAt(n)) * 100 };
}
function achCtx() {
  let right = 0;
  for (const id in S.qs) right += S.qs[id].xp;
  const qz = DAYS.map(d => S.quiz[d.id]).filter(Boolean);
  return {
    right,
    passed: qz.filter(q => q.passed).length,
    perfect: qz.some(q => q.tries.some(t => t.n && t.score === t.n)),
    comeback: qz.some(q => q.tries.findIndex(t => QZ.passed(t.score, t.n)) > 0),   // a try below the bar came before the first pass
    fixed: Object.values(S.book).filter(b => b.fixed).length,
    warm: Object.values(S.warm).filter(v => v === "done").length,
    drill: S.drill.best,
    focus: Object.values(S.log).reduce((a, b) => a + b, 0),
    mock: S.mocks.reduce((a, m) => Math.max(a, m.pct), 0)
  };
}
// Earn every badge whose condition holds now. row = right answers in a row in the quiz on screen.
// Returns the new ones; the caller shows them (a streak badge names the badge it earned itself).
// persist = false at boot: saving before the first sync would make this copy look newer than the server's.
function award(row = 0, persist = true) {
  const c = achCtx(), got = [];
  for (const a of ACH) if (!S.ach[a.id] && (a.row ? row >= a.row : a.ok(c))) { S.ach[a.id] = today(); got.push(a); }
  if (got.length && persist) save();
  return got;
}
let lvShown = 0;   // the highest level on screen so far; only a level above it gets announced
const syncLevel = () => { lvShown = Math.max(lvShown, levelOf(xpTotal()).n); };
// New badges, then a new level, each as a badge at the top of the screen.
function showGains(got, delay = 0) {
  const all = got.map(a => [a.i, a.t, `New badge, +${a.xp} XP`, "gold"]).concat(checkGoals());
  all.forEach(([i, t, sub, tier], k) => setTimeout(() => { FX.sound("unlock"); FX.badge(i, t, sub, tier); }, delay + k * 650));
  const n = levelOf(xpTotal()).n, was = lvShown;
  if (was && n > was) setTimeout(() => { FX.sound("level"); FX.badge(`L${pad2(n)}`, `Level ${n}`, rankOf(n) !== rankOf(was) ? `New title: ${rankOf(n)}` : rankOf(n), "level"); }, delay + all.length * 650);
  lvShown = Math.max(lvShown, n);
}

// ---------- daily goal, weekly challenges ----------
// Today's XP is the total now minus the total when the day was first seen (S.xpDay). Days and weeks are stamped only
// after the first sync was tried (ready), so a copy that is behind doesn't stamp a starting point that is too low.
let ready = false;
const DEV = (() => { if (!/^[a-z0-9]{1,12}$/.test(str0(ui.dev))) { ui.dev = Math.random().toString(36).slice(2, 10) || "dev"; saveUI(); } return ui.dev; })();
// This device's counts for today (answers, right, focus minutes), created on first use.
function dailyNow() {
  const day = S.daily[today()] || (S.daily[today()] = {});
  return day[DEV] || (day[DEV] = { a: 0, r: 0, f: 0 });
}
const weekKey = (d = new Date()) => { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - (m.getDay() + 6) % 7); return iso(m); };
// The counters the challenges measure, as totals so far.
function counters() {
  let a = 0, r = 0;
  for (const id in S.qs) { a += S.qs[id].seen; r += S.qs[id].right; }
  return { a, r, x: xpTotal(), d: DAYS.filter(dayDone).length, s: Object.keys(S.ticks).filter(id => itemIndex[id]).length,
    f: Math.round(Object.values(S.log).reduce((x, y) => x + y, 0)), fix: Object.values(S.book).filter(b => b.fixed).length,
    w: Object.values(S.warm).filter(v => v === "done").length, dr: S.drill.runs, cq: CARDQS.filter(q => (S.qs[q.id] || {}).right).length };
}
// Three a week, one from each group, drawn from the week's date so every device draws the same.
function pickChal(key) {
  let h = 7;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [["ans", "right", "xp"], ["days", "steps", "focus"], ["fix", "warm", "drill", "recall"]].map((g, gi) => {
    const ok = g.filter(id => !CHAL_BY[id].can || CHAL_BY[id].can());
    return ok.length ? ok[(h >>> (gi * 5)) % ok.length] : "";
  }).filter(Boolean);
}
// Stamp today's and this week's starting points, once each. True when something changed.
function stamp() {
  if (!ready) return false;
  let ch = false;
  const t = today(), wk = weekKey();
  if (!S.xpDay[t]) { S.xpDay[t] = { x: xpTotal(), at: Date.now(), hit: false }; pruneDates(S.xpDay); ch = true; }
  if (S.week.key !== wk) { S.week = { key: wk, at: Date.now(), ids: pickChal(wk), base: counters() }; ch = true; }
  return ch;
}
const xpToday = () => { const e = S.xpDay[today()]; return e ? Math.max(0, xpTotal() - e.x) : 0; };
const chalDone = id => !!S.chal[`${S.week.key}:${id}`];
const chalProg = (id, c = counters()) => { const k = CHAL_BY[id].k; return Math.max(0, c[k] - num0(S.week.base[k], c[k])); };
// Days in a row the goal was reached, up to today (or yesterday, while today's is still open).
function goalStreak() {
  const d = midnight();
  if (!(S.xpDay[iso(d)] || {}).hit) d.setDate(d.getDate() - 1);
  let n = 0;
  while ((S.xpDay[iso(d)] || {}).hit) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
// After XP or a counter changed: the daily goal and the week's challenges, each announced once. Returns badges to show.
function checkGoals() {
  const e = S.xpDay[today()];
  if (!ready || !e) return [];
  const out = [];
  if (!e.hit && xpToday() >= S.settings.goal) { e.hit = true; const gs = goalStreak(); out.push(["XP", "Daily goal reached", `${S.settings.goal} XP today${gs > 1 ? `, ${gs} days in a row` : ""}`, "silver"]); }
  const c = counters();
  for (const id of S.week.ids) {
    const ch = CHAL_BY[id];
    if (chalDone(id) || chalProg(id, c) < ch.n) continue;
    S.chal[`${S.week.key}:${id}`] = today();
    out.push(["WK", "Weekly challenge done", `${ch.t(ch.n)}, +${CHAL_XP} XP`, "epic"]);
  }
  if (out.length) save();
  return out;
}
function renderToday() {
  const el = document.getElementById("today");
  if (!ready || !S.xpDay[today()]) { el.hidden = true; return; }
  el.hidden = false;
  const goal = S.settings.goal, x = xpToday(), hit = x >= goal, gs = goalStreak();
  // a Datum dial: a ring of ticks lit up to today's share of the goal, the goal itself the long tick at the end
  const share = Math.min(100, Math.round(x / goal * 100));
  const ring = window.Datum ? Datum.dial(share, { max: 100, target: 100, size: 88, label: `${x} of ${goal} XP today` }) : "";
  const c = counters(), sun = parseDate(S.week.key); sun.setDate(sun.getDate() + 6);
  const rows = S.week.ids.map(id => {
    const ch = CHAL_BY[id], n = Math.min(ch.n, chalDone(id) ? ch.n : chalProg(id, c)), done = n >= ch.n, f = ch.fmt || (v => v.toLocaleString("en-GB"));
    return `<li class="${done ? "done" : ""}"><span class="ch-i" aria-hidden="true">${ch.i}</span><span class="ch-t">${ch.t(ch.n)}</span>` +
      `<span class="ch-m"><span class="mt" role="meter" aria-valuemin="0" aria-valuemax="${ch.n}" aria-valuenow="${n}" aria-label="${esc(ch.t(ch.n))}"><span style="width:${pct(n, ch.n)}%"></span></span>` +
      `<span class="ch-n">${done ? "✓ Done" : `${f(n)} / ${f(ch.n)}`}</span></span></li>`;
  }).join("");
  el.innerHTML = `<div class="td-goal${hit ? " hit" : ""}" role="group" aria-label="Today's goal: ${x} of ${goal} XP">${ring}` +
    `<div class="ring-v" aria-hidden="true"><b>${x.toLocaleString("en-GB")}</b><small>of ${goal} XP</small></div>` +
    `<div class="td-x"><h3>Today's goal</h3><p>${hit ? "[ Reached ]" : `${goal - x} XP to go`}</p>` +
    `<p class="muted">${gs > 1 ? `Reached ${gs} days in a row.` : hit ? "Reached today. Keep it up tomorrow for a run of days." : "Right answers, steps, passed quizzes and challenges count."} <button type="button" class="link" data-goal-set>Change</button></p></div></div>` +
    `<div class="td-ch"><h3>This week's challenges <span class="muted">+${CHAL_XP} XP each, until ${fmtD(sun)}</span></h3><ul>${rows || `<li class="muted">None this week.</li>`}</ul></div>`;
}

// ---------- readiness and trends (overview) ----------
const MIN_MET = 15;                 // answers a domain needs before its readiness means something
const READY = 80, CLOSE = 70;       // readiness bands: ready, close, not yet
const DOM_W = [30, 26, 24, 20];     // exam guide weights
// Per domain: the questions met so far, and how many of them were right at the last answer.
function readiness() {
  const r = DOMAINS.map(() => ({ met: 0, ok: 0, all: 0 }));
  for (const q of WITH_CARDQ) { const d = r[q.dom - 1], s = S.qs[q.id]; if (!d) continue; d.all++; if (s && s.seen) { d.met++; if (s.last) d.ok++; } }
  return r.map(d => ({ ...d, acc: d.met ? Math.round(d.ok / d.met * 100) : 0 }));
}
// The weakest topic of the weakest domain (with enough answers), and the step that teaches it.
function studyNext(rd) {
  const dom = rd.map((d, i) => ({ ...d, i })).filter(d => d.met >= MIN_MET).sort((a, b) => a.acc - b.acc)[0];
  if (!dom) return null;
  const w = QZ.weakTags(BANK.filter(q => q.dom === dom.i + 1), S.qs, 3).find(t => tagRefs(t.tag).length);
  return w ? { dom: dom.i + 1, tag: w.tag, right: w.right, seen: w.seen, step: tagRefs(w.tag)[0] } : null;
}
const band = a => (a >= READY ? ["ok", "✓", "Ready"] : a >= CLOSE ? ["warn", "■", "Close"] : ["bad", "✕", "Not yet"]);
function whyCounts() {
  const n = Object.create(null);
  for (const id in S.book) if (QBY[id] && S.book[id].why) n[S.book[id].why] = (n[S.book[id].why] || 0) + 1;
  return WHY.map(w => [w, n[w[0]] || 0]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
}
const WHY_TIP = {
  know: () => "Go back to the step that teaches it: every miss lists the steps under it.",
  mix: () => `Put the two services side by side: <button type="button" class="link" data-look>the look-alikes</button>.`,
  read: () => "Read the question's last sentence first: it says what is asked. Then read the scenario for the requirements.",
  word: () => `Learn what the requirement words point to (least cost, least operational overhead…): <button type="button" class="link" data-sheet="cues">exam wording</button>.`,
  rush: () => "Read every option before you pick one, and change an answer only for a reason you can name."
};
// Why you miss: one bar per reason, most common first, with what helps against the top one.
function whyPatternHTML() {
  const wc = whyCounts();
  if (!wc.length) return `<p class="muted">Mark why you missed a question (the buttons under a wrong answer, or in the notebook) and the pattern shows here.</p>`;
  const max = wc[0][1], all = wc.reduce((a, x) => a + x[1], 0);
  return `<ul class="why-bars">${wc.map(([w, n]) => `<li><span class="wb-l">${esc(w[2])}</span><span class="wb-t"><span style="width:${(n / max * 100).toFixed(1)}%"></span></span><span class="wb-n">${n}</span></li>`).join("")}</ul>` +
    `<p class="why-tip"><b>Most often: ${esc(wc[0][0][2].toLowerCase())}</b> (${wc[0][1]} of ${all}). ${WHY_TIP[wc[0][0][0]]()}</p>`;
}
function renderReady() {
  const rd = readiness(), el = document.getElementById("ready");
  const total = rd.reduce((a, d) => a + d.met, 0);
  if (total < 10) { el.innerHTML = `<p class="muted">Fills in as you answer quiz questions: how many of each exam domain's questions you would get right now.</p>`; return; }
  const full = rd.every(d => d.met >= MIN_MET), all = full ? Math.round(rd.reduce((a, d, i) => a + d.acc * DOM_W[i], 0) / 100) : 0;
  let h = `<div class="rd-head">${full ? `<div class="rd-all"><b>${all}%</b><span class="muted">weighted like the exam (30 / 26 / 24 / 20)</span></div>` : `<p class="muted">An overall figure needs ${MIN_MET} answers in each domain.</p>`}` +
    `<p class="muted rd-how">Of the questions you have met in a domain, the share you got right at your last answer. Ready from ${READY}%.</p></div><ul class="rd-list">`;
  rd.forEach((d, i) => {
    const few = d.met < MIN_MET, [cls, ic, lb] = band(d.acc);
    h += `<li class="${few ? "few" : cls}"><span class="rd-n">D${i + 1} ${DOMAINS[i]}</span>` +
      `<span class="mt" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${d.acc}" aria-label="Domain ${i + 1} ${DOMAINS[i]}"><span style="width:${d.acc}%"></span><i style="left:${READY}%"></i></span>` +
      `<span class="rd-v">${d.met ? `${d.acc}%` : "–"}</span><span class="rd-s">${few ? `${d.met} of ${MIN_MET} answers` : `${ic} ${lb}`}</span>` +
      `<span class="rd-c muted">${d.met} of ${d.all} questions met</span></li>`;
  });
  h += `</ul>`;
  const nx = studyNext(rd);
  if (nx) {
    const { d, it } = itemIndex[nx.step];
    h += `<div class="rd-next"><span class="rd-nk">Study this next</span><p><b>${esc(nx.tag)}</b> in D${nx.dom} ${DOMAINS[nx.dom - 1]}: ${nx.right} of ${nx.seen} answers right. Day ${d.day} teaches it: ${it[1]}</p>` +
      `<div class="row"><button type="button" data-jump="${nx.step}">Open the step</button><button type="button" data-step-quiz="${nx.step}">Try 3 questions on it</button>${laTag(nx.tag).length ? `<button type="button" data-look="${esc(laTag(nx.tag)[0].id)}">${esc(laTag(nx.tag)[0].title)}</button>` : ""}</div></div>`;
  }
  h += `<h3 class="sub-h">Why you miss</h3>${whyPatternHTML()}`;
  el.innerHTML = h;
}

// Trends: answers right, focus time and XP per day. One series per chart, so the title names it; values on hover
// or with the arrow keys, and all of them in the table view.
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortD = k => { const d = parseDate(k); return `${d.getDate()} ${MON[d.getMonth()]}`; };
// XP on a day: the next stamped day's starting total (or today's total) minus this day's.
function xpOn(k) {
  const e = S.xpDay[k];
  if (!e) return null;
  const next = Object.keys(S.xpDay).sort().find(x => x > k);
  return Math.max(0, (next ? S.xpDay[next].x : xpTotal()) - e.x);
}
function trendData(n) {
  const out = [], d = midnight(), first = Object.keys(S.daily).sort()[0] || today();
  // before the per-day counts existed: day quizzes and mock exams only
  const old = {};
  for (const q of Object.values(S.quiz)) for (const t of q.tries) if (t.at && t.at < first) { const o = old[t.at.slice(0, 10)] || (old[t.at.slice(0, 10)] = [0, 0]); o[0] += t.n; o[1] += t.score; }
  for (const m of S.mocks) if (m.at && m.at < first) { const o = old[m.at.slice(0, 10)] || (old[m.at.slice(0, 10)] = [0, 0]); o[0] += m.n; o[1] += m.score; }
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++, d.setDate(d.getDate() + 1)) {
    const k = iso(d), day = S.daily[k] || {};
    let a = 0, r = 0, f = 0;
    for (const dev in day) { a += day[dev].a; r += day[dev].r; f += day[dev].f; }
    if (!a && old[k]) [a, r] = old[k];
    out.push({ k, a, r, f: Math.round(f), x: xpOn(k), old: !!old[k] && k < first });
  }
  return out;
}
const niceMax = v => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };
// One chart as SVG: kind "line" (percent, gaps where a day has no answers) or "col"; ref = a labelled reference line.
function chartSVG(data, val, { kind, max, ref, refLabel, unit, per = 1 }) {
  const W = 320, H = 150, L = 34, R = 10, T = 12, B = 22, pw = W - L - R, ph = H - T - B, n = data.length, bw = pw / n;
  // per: the axis steps in whole units of this size (60: hours for minutes)
  const vs = data.map(val), top = max || niceMax(Math.max(ref || 0, ...vs.filter(v => v != null)) / per) * per;
  const y = v => T + ph - (v / top) * ph, x = i => L + bw * i + bw / 2;
  let g = "";
  for (const t of [0, top / 2, top]) g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="ax" x="${L - 5}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${unit(t, true)}</text>`;
  for (const i of [0, Math.floor((n - 1) / 2), n - 1]) g += `<text class="ax" x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${shortD(data[i].k)}</text>`;
  // the reference line's label sits at the left end: the recent days, on the right, are the ones read most
  if (ref) g += `<line class="ref" x1="${L}" x2="${W - R}" y1="${y(ref).toFixed(1)}" y2="${y(ref).toFixed(1)}"/><text class="ref-t" x="${L + 4}" y="${(y(ref) - 4).toFixed(1)}">${refLabel}</text>`;
  if (kind === "col") {
    const w = Math.min(24, Math.max(2, bw - 2));
    vs.forEach((v, i) => {
      if (!v) return;
      const h = Math.max(1, (v / top) * ph), x0 = x(i) - w / 2, y0 = T + ph - h;
      g += `<rect class="mk${i === n - 1 ? " now" : ""}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`;
    });
  } else {
    let path = "", on = false;
    vs.forEach((v, i) => { if (v == null) { on = false; return; } path += on ? `H${x(i).toFixed(1)}V${y(v).toFixed(1)}` : `M${x(i).toFixed(1)} ${y(v).toFixed(1)}`; on = true; });
    g += `<path class="ln" d="${path}"/>`;
    vs.forEach((v, i) => { if (v != null) g += `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"/>`; });
  }
  // the last value is labelled; the rest are on hover, with the keys, and in the table
  const li = vs.map((v, i) => (v ? i : -1)).filter(i => i >= 0).pop();
  if (li != null) { const t = unit(vs[li]), hw = t.length * 3; g += `<text class="lab" x="${Math.min(x(li), W - 2 - hw).toFixed(1)}" y="${(y(vs[li]) - 8).toFixed(1)}" text-anchor="middle">${t}</text>`; }
  g += `<line class="xh" x1="0" x2="0" y1="${T}" y2="${T + ph}" visibility="hidden"/>`;
  data.forEach((_, i) => { g += `<rect class="hit" data-i="${i}" x="${(L + bw * i).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${ph}"/>`; });
  return `<svg class="ch" viewBox="0 0 ${W} ${H}" aria-hidden="true">${g}</svg>`;
}
const pctU = (v, ax) => `${Math.round(v)}%`;
const minU = (v, ax) => (v >= 60 || ax ? `${Math.round(v / 6) / 10} h` : `${Math.round(v)} min`);   // axis ticks fall on whole or half hours (per: 60)
const xpU = v => `${Math.round(v)}`;
const TRENDS = [
  { id: "acc", t: "Answers right, per day", val: d => (d.a ? Math.round(d.r / d.a * 100) : null), o: { kind: "line", max: 100, ref: Math.round(QZ.PASS * 100), refLabel: `${Math.round(QZ.PASS * 100)}% pass mark`, unit: pctU },
    tip: d => (d.a ? [`${Math.round(d.r / d.a * 100)}%`, `${d.r} of ${d.a} right${d.old ? " (day quizzes and mocks)" : ""}`] : ["–", "no answers"]) },
  { id: "focus", t: "Focus time, per day", val: d => d.f, o: { kind: "col", unit: minU, per: 60 }, tip: d => [d.f ? fmtH(d.f) : "–", "focus logged"] },
  { id: "xp", t: "XP, per day", val: d => d.x || 0, o: { kind: "col", ref: 0, refLabel: "", unit: xpU }, tip: d => [d.x == null ? "–" : `${d.x} XP`, d.x == null ? "app not opened" : d.x >= S.settings.goal ? "goal reached" : `goal ${S.settings.goal}`] }
];
let trendCache = [];
function renderTrends() {
  const n = ui.trend === 30 ? 30 : 14, data = trendCache = trendData(n), el = document.getElementById("trends");
  TRENDS[2].o.ref = S.settings.goal; TRENDS[2].o.refLabel = `goal ${S.settings.goal}`;
  const empty = !data.some(d => d.a || d.f || d.x);
  const ctl = `<div class="tr-ctl" role="group" aria-label="Range">${[14, 30].map(k => `<button type="button" class="sm" data-trend="${k}" aria-pressed="${n === k}">Last ${k} days</button>`).join("")}` +
    `<button type="button" class="sm" data-trend-table aria-pressed="${!!ui.trendTable}">${ui.trendTable ? "Show charts" : "Show as table"}</button></div>`;
  if (empty) { el.innerHTML = ctl + `<p class="muted">Nothing in these days yet. Answers, focus time and XP show here per day.</p>`; return; }
  if (ui.trendTable) {
    el.innerHTML = ctl + `<div class="tr-tw"><table class="tr-tab"><thead><tr><th scope="col">Day</th><th scope="col">Answers</th><th scope="col">Right</th><th scope="col">Focus</th><th scope="col">XP</th></tr></thead><tbody>` +
      data.slice().reverse().map(d => `<tr><th scope="row">${esc(fmtD(parseDate(d.k)))}</th><td>${d.a || "–"}</td><td>${d.a ? `${Math.round(d.r / d.a * 100)}%` : "–"}</td><td>${d.f ? fmtH(d.f) : "–"}</td><td>${d.x == null ? "–" : d.x}</td></tr>`).join("") + `</tbody></table></div>`;
    return;
  }
  el.innerHTML = ctl + `<div class="tr-grid">${TRENDS.map(c => `<figure class="tr-fig" data-chart="${c.id}" tabindex="0" aria-label="${esc(c.t)}. Use the arrow keys to read each day.">` +
    `<figcaption>${esc(c.t)}</figcaption>${chartSVG(data, c.val, c.o)}<div class="tt" hidden></div></figure>`).join("")}</div>`;
}
// The hover layer: one tooltip per chart, a hairline on the day under the pointer (or chosen with the arrow keys).
function trendShow(fig, i) {
  const c = TRENDS.find(t => t.id === fig.dataset.chart), d = trendCache[i];
  if (!c || !d) return;
  fig.dataset.i = i;
  const hit = fig.querySelector(`.hit[data-i="${i}"]`), xh = fig.querySelector(".xh"), svg = fig.querySelector("svg");
  const cx = +hit.getAttribute("x") + +hit.getAttribute("width") / 2;
  xh.setAttribute("x1", cx); xh.setAttribute("x2", cx); xh.setAttribute("visibility", "visible");
  const tt = fig.querySelector(".tt"), [v, sub] = c.tip(d);
  tt.replaceChildren();
  const b = document.createElement("b"); b.textContent = v;
  const s1 = document.createElement("span"); s1.textContent = sub;
  const s2 = document.createElement("span"); s2.className = "muted"; s2.textContent = fmtD(parseDate(d.k));
  tt.append(b, s1, s2);
  tt.hidden = false;
  const box = svg.getBoundingClientRect(), fx = (cx / 320) * box.width + (box.left - fig.getBoundingClientRect().left);
  // beside the hairline, on the side with room, so it doesn't sit on the marks of that day
  tt.style.left = `${fx + 10 + tt.offsetWidth <= fig.clientWidth ? fx + 10 : Math.max(0, fx - 10 - tt.offsetWidth)}px`;
}
function trendHide(fig) { fig.querySelector(".tt").hidden = true; fig.querySelector(".xh").setAttribute("visibility", "hidden"); }

// ---------- scores ----------
function num(k) { const v = S.scores[k]; return v === "" || v == null || isNaN(+v) ? null : +v; }
function verdictHTML() {
  const pe = num("pe");
  const weak = weakestDomain();
  const weakTxt = weak ? ` Focus on <b>Domain ${weak.i + 1} (${weak.name})</b>.` : "";
  const peStep = itemIndex[Object.keys(SCORE_AT).find(k => SCORE_AT[k] === "pe")];
  if (pe == null) return ["", `Enter your <b>Official Practice Exam</b> score${peStep ? ` (Day ${peStep.d.day})` : ""} in Scores to get the go/no-go decision.`];
  if (pe < 100 || pe > 1000) return ["", "Practice exam score must be between 100 and 1000."];
  if (pe >= 750) return ["go", `<b>[ GO ]</b> ${pe}/1000. Book the exam for Day ${LAST} (${fmtD(dayDate(LAST))}).`];
  if (pe >= 720) return ["mid", `<b>[ BORDERLINE ]</b> ${pe}/1000 passes, but with no margin. Add 3–4 days, then book.${weakTxt}`];
  return ["no", `<b>[ NOT YET ]</b> ${pe}/1000 (pass is 720). Add a week before booking.${weakTxt}`];
}
function weakestDomain() {
  let w = null;
  for (let i = 0; i < 4; i++) {
    const v = num("b" + (i + 1));
    if (v != null && (!w || v < w.v)) w = { i, v, name: DOMAINS[i] };
  }
  return w;
}
const bar = (label, value, text, cls = "") => `<div class="db ${cls}"><span>${label}</span><span class="tr"><span class="fi" style="width:${Math.max(0, Math.min(100, value))}%;display:block"></span></span><span>${text}</span></div>`;
function renderScores() {
  const [cls, html] = verdictHTML();
  document.querySelectorAll("[data-verdict]").forEach(el => { el.className = "verdict " + cls; el.innerHTML = html; });
  const weak = weakestDomain();
  const bars = [];
  for (let i = 0; i < 4; i++) {
    const v = num("b" + (i + 1));
    if (v == null) continue;
    bars.push(bar(`D${i + 1} ${DOMAINS[i]}`, v, `${v}%`, weak && weak.i === i ? "weak" : ""));
  }
  document.getElementById("dom-bars").innerHTML = bars.join("");
  const logged = DAYS.filter(d => (S.log[d.id] || 0) >= 1);
  document.getElementById("time-log").innerHTML = logged.length
    ? `<h3 class="sub-h">Study time</h3><p class="muted">Logged by the focus timer against the day you were working on.</p>` +
      logged.map(d => bar(`Day ${d.day}`, pct(S.log[d.id], dayPlanned(d)), `${fmtH(S.log[d.id])} of ~${fmtH(dayPlanned(d))}`, "tl")).join("")
    : "";
  const sum = [];
  const q7 = num("qs7"), q13 = num("qs13"), pe = num("pe");
  if (q7 != null) sum.push(`QS ${Math.round(q7 / 20 * 100)}%`);
  if (q13 != null) sum.push(`retake ${Math.round(q13 / 20 * 100)}%`);
  if (pe != null) sum.push(`practice exam ${pe}`);
  document.getElementById("score-sum").textContent = sum.join(", ");
}
// A score can be typed in the Scores panel or on the card of the step that asks for it: keep both in step.
document.addEventListener("input", e => {
  const k = e.target.dataset && e.target.dataset.score;
  if (!k) return;
  S.scores[k] = e.target.value;
  document.querySelectorAll(`[data-score="${k}"]`).forEach(inp => { if (inp !== e.target) inp.value = e.target.value; });
  save(); renderScores();
});

// ---------- practice panel ----------
function renderPractice() {
  const t = today();
  const due = QZ.dueIds(S.srs, t).filter(id => QBY[id]).length;
  const book = Object.keys(S.book).filter(id => QBY[id]);
  const open = book.filter(id => !S.book[id].fixed).length;
  const weak = QZ.weakTags(BANK, S.qs)[0];
  const last = S.mocks[S.mocks.length - 1];
  const left = mockDays.filter(d => !dayDone(d)).length;
  const liveMock = S.run && S.run.kind === "mock" && !S.run.done;
  const cards = [
    ["Review", due ? `${plural(due, "missed question")} due today.` : `Nothing due. Questions you miss come back after ${QZ.SRS_DAYS.join(", ").replace(/, (\d+)$/, " and $1")} days until you get them right three times.`,
      `<button type="button" data-review${due ? ' class="primary"' : " disabled"}>Start review</button>`],
    ["Mock exam", mockOpen() || liveMock
      ? `${QZ.MOCK.n} questions in ${QZ.MOCK.minutes} minutes, results at the end like the real exam. Each attempt draws different questions.${last ? ` Last: ${last.pct}% on ${fmtD(parseDate(last.at))}.` : ""}`
      : `Unlocks when Days 1–${MOCK_AFTER} are complete (${left} to go): the lectures and labs.`,
      `<button type="button" data-mock${mockOpen() || liveMock ? ' class="primary"' : " disabled"}>${liveMock ? `Resume (${clock(S.run.end - Date.now())} left)` : "Start mock exam"}</button>`],
    ["Which service?", `Quick picks between services, four ways.${S.drill.day[t] != null ? ` Today's five: ${S.drill.day[t]} of 5.` : ""}`,
      `<div class="dr-modes">${Object.entries(DRILL_MODES).map(([k, m]) => { const b = { go: S.drill.best, rev: S.drill.rev, lives: S.drill.lives }[k];
        return `<button type="button"${k === "go" ? " data-drill" : ` data-drill-mode="${k}"`}${DRILL.length ? "" : " disabled"} title="${esc(m.t)}: ${esc(m.d)}">${m.b}${b ? ` <small>best ${b}</small>` : k === "day" && S.drill.day[t] != null ? ` <small>✓ ${S.drill.day[t]}/5</small>` : ""}</button>`; }).join("")}</div>`],
    ["Wrong-answer notebook", book.length ? `${open} open, ${book.length - open} fixed.` : "Every question you miss lands here with your one-line note.",
      `<button type="button" data-sheet="notebook">Open notebook</button>`],
    ["Weak spots", weak ? `Weakest topic so far: ${esc(weak.tag)} (${pct(weak.right, weak.seen)}% right).` : "Fills in as you answer questions.",
      `<button type="button" data-sheet="weak">Show weak spots</button>`],
    ["Exam wording", "What phrases like “least operational overhead” usually point to.",
      `<button type="button" data-sheet="cues"${CUES.length ? "" : " disabled"}>Open cheat sheet</button>`],
    ["Look-alikes", `${plural(LA.length, "table")} of services that sound alike, side by side: SQS or SNS, ALB or NLB, EBS, EFS or S3…`,
      `<button type="button" data-look${LA.length ? "" : " disabled"}>Compare them</button>`],
    ["Badges and level", (L => `Level ${L.n}, ${rankOf(L.n)}: ${L.to - L.x} XP to level ${L.n + 1}. ${Object.keys(S.ach).filter(id => ACH_BY[id]).length} of ${ACH.length} badges earned.`)(levelOf(xpTotal())),
      `<button type="button" data-sheet="badges">Show badges</button>`]
  ];
  document.getElementById("pr-grid").innerHTML = cards.map(([h, p, b]) => `<div class="place pr"><h3>${h}</h3><p>${p}</p>${b}</div>`).join("");
  const sum = [];
  if (due) sum.push(`${due} due for review`);
  if (liveMock) sum.push("mock exam in progress");
  else if (mockOpen()) sum.push("mock exam unlocked");
  document.getElementById("pr-sum").textContent = sum.join(", ");
}

// ---------- quizzes: shared ----------
const qzDlg = document.getElementById("quiz"), qzBody = document.getElementById("qz-body");
// The card's height lets the study panel beside it line up with its top edge (style.css, .qz-side).
new ResizeObserver(() => qzDlg.style.setProperty("--qzdh", qzDlg.offsetHeight + "px")).observe(qzDlg);
// The progress bar sticks under the header, which wraps to more lines on a phone (style.css, .qz-bar).
const qzHead = qzDlg.querySelector(".qz-h");
new ResizeObserver(() => qzDlg.style.setProperty("--qzh", qzHead.offsetHeight + "px")).observe(qzHead);
let picks = {};      // question id → options picked, not yet checked (memory only; kept while you move between questions)
let fresh = false;   // the answer on screen was checked just now: animate it (going back to it later does not); "xp" when it earned XP
let comboFx = "";    // the answer just checked, for the combo meter: "up" (right), "broke" (a miss ended a run of 2 or more), "miss"
let comboWas = 0;    // the run a miss just ended
// Right answers in a row (run.row) get a badge at these marks; the tier sets its look.
// The second field is the badge's code: the run itself, zero-padded.
const ROW_TIERS = [[30, "R30", "Flawless", "epic"], [25, "R25", "Untouchable", "epic"], [20, "R20", "Legendary", "epic"], [15, "R15", "Unstoppable", "gold"], [10, "R10", "On fire", "gold"], [5, "R05", "On a roll", "silver"], [3, "R03", "Warming up", "bronze"]];
const ROW_MARKS = ROW_TIERS.map(x => x[0]);
const ROW_UP = ROW_MARKS.slice().reverse();   // 3, 5, 10 … 30
let intro = null;    // { title, html, go, goLabel } shown before a quiz or mock starts
let drill = null;    // "Which service?" round, kept in memory only

const runTitle = r => r.kind === "day" ? `Day ${dayOf(r.day).day} quiz` : r.kind === "mock" ? "Mock exam" : r.kind === "warm" ? "Warm-up" : r.kind === "step" ? "Step practice" : "Review";
function head(title, parts, barPct) {
  document.getElementById("qz-title").textContent = title;
  document.getElementById("qz-meta").innerHTML = parts.filter(Boolean).map(p => `<span>${p}</span>`).join("");
  document.getElementById("qz-bar").style.width = Math.max(0, Math.min(100, barPct || 0)) + "%";
}
// Put keyboard focus on the main action, not the ✕ that showModal() picks by default.
function focusMain() {
  for (const sel of ['[data-qz="go"]', '[data-qz="next"]', '[data-qz="retake"]', '[data-qz="finish"]', ".qz-o", "[data-drill]"]) {
    const el = qzBody.querySelector(sel);
    if (el) { el.focus({ preventScroll: true }); return; }
  }
}
function openQuiz() {
  renderQuiz();
  if (!qzDlg.open) qzDlg.showModal();
  qzDlg.scrollTop = 0;
  focusMain();
}
// Questions can be retired from the bank: drop them from a saved run without skipping the current one.
function pruneRun(r) {
  if (r.ids.every(id => QBY[id])) return;
  r.i = r.ids.slice(0, r.i).filter(id => QBY[id]).length;
  r.ids = r.ids.filter(id => QBY[id]);
  for (const k of Object.keys(r.ans)) if (!QBY[k]) delete r.ans[k];
  if (r.done && r.kind !== "mock") r.score = r.ids.filter(id => QZ.isRight(QBY[id], r.ans[id])).length;
}
function renderQuiz() {
  if (intro) return renderIntro();
  if (drill) return renderDrill();
  const r = S.run;
  if (!r) { if (qzDlg.open) qzDlg.close(); return; }
  pruneRun(r);
  if (!r.ids.length) { dropRun(); save(); if (qzDlg.open) qzDlg.close(); return; }
  if (r.i >= r.ids.length) r.i = r.ids.length - 1;
  if (r.done) return r.kind === "mock" ? renderMockResult() : renderResult();
  if (r.kind === "mock") return r.view === "grid" ? renderGrid() : renderMockQ();
  renderQ();
}
// The run on screen is over (closed, dropped or replaced): remember when it began, so a copy from another device that
// still has it doesn't bring it back (runOff, mergeRun).
function dropRun() { if (S.run) S.runOff = Math.max(S.runOff, S.run.t0); S.run = null; }
// of = the day id for a day quiz, the step id for step practice
function startRun(kind, of) {
  intro = null;
  if (drill) stopDrill();
  if (S.run && !S.run.done) {
    const same = S.run.kind === kind && (kind !== "day" || S.run.day === of) && (kind !== "step" || S.run.item === of);
    if (same || !confirm(`You have an unfinished ${runTitle(S.run).toLowerCase()}. Drop it and start this instead?`)) return openQuiz();
  }
  const t = today();
  const qs = kind === "day" ? QZ.pickDay(dayOf(of), TP, BANK, S.qs)
    : kind === "mock" ? QZ.pickMock(BANK, S.qs)
    : kind === "warm" ? QZ.pickWarmup(BANK, S.qs, S.srs, t, 5)
    : kind === "step" ? QZ.pickStep(of, STEP_TAGS[of], BANK, S.qs)
    : QZ.pickReview(BANK, S.srs, t, 15);
  if (!qs.length) { if (qzDlg.open) qzDlg.close(); FX.banner("No questions available yet", "", "info"); return; }
  const ord = {};
  qs.forEach(q => { ord[q.id] = QZ.order(q); });
  dropRun();
  const now = Math.max(Date.now(), S.runOff + 1);
  S.run = { kind, day: kind === "day" ? of : "", item: kind === "step" ? of : "", ids: qs.map(q => q.id), ord, ans: {}, flag: {}, x: {}, hl: {}, i: 0, t0: now, end: kind === "mock" ? now + QZ.MOCK.minutes * 60000 : 0, done: false, view: "",
    row: 0, rowMax: 0, best0: S.rowBest, xp0: xpTotal(), rec: false };
  picks = {};
  save(); refresh(); openQuiz();
}
function promptMock() {
  if (S.run && S.run.kind === "mock" && !S.run.done) return openQuiz();
  intro = {
    title: "Mock exam", goLabel: `Start the ${QZ.MOCK.minutes}-minute exam`, go: () => startRun("mock"),
    html: `<p class="qz-lead">A full SAA-C03 practice run, original questions in the exam's style.</p><ul class="qz-facts">` +
      `<li>${QZ.MOCK.n} questions in ${QZ.MOCK.minutes} minutes, split by domain like the exam guide (30 / 26 / 24 / 20 %).</li>` +
      `<li>No feedback until you finish, like the real exam. Flag questions and come back to them.</li>` +
      `<li>The clock keeps running if you close this window; it submits itself when time is up.</li>` +
      `<li>Afterwards: your score by domain and every question with explanations. Each attempt draws different questions.</li></ul>`
  };
  openQuiz();
}
function renderIntro() {
  head(intro.title, [], 0);
  qzBody.innerHTML = intro.html + `<div class="qz-a"><button type="button" data-qz="close">Later</button><button type="button" class="primary" data-qz="go">${intro.goLabel}</button></div>`;
}

// what each option says, which ones were right, which one you picked, and why (QuizOption rows after checking:
// the right one filled signal, your wrong pick with an alert key, each with its state word; colour never says it alone)
function fbHTML(q, ord, ans, anim = false) {
  return `<ol class="qz-fb${anim ? " fresh" : ""}">${ord.map((oi, k) => {
    const right = q.a.includes(oi), mine = ans.includes(oi);
    const word = right ? (mine ? "✓ Your answer" : "✓ Correct") : mine ? "✕ Your answer" : "";
    return `<li class="${right ? "right" : mine ? "wrong" : ""}"><span class="qz-l">${LETTERS[k]}</span><div class="qz-c"><div class="qz-t">${q.o[oi]}</div><div class="qz-why">${q.x[oi]}</div></div>` +
      `<span class="qz-s${mine ? " mine" : ""}">${word}</span></li>`;
  }).join("")}</ol>`;
}
// Show where to watch or read first (Skill Builder), then hands-on, then self-checks; within a kind, in the plan's order.
const REF_ORDER = { watch: 0, prep: 0, play: 1, build: 2, check: 3, setup: 4 };
const byKind = ids => [...new Set(ids)].filter(id => itemIndex[id]).sort((a, b) => REF_ORDER[itemIndex[a].g.t] - REF_ORDER[itemIndex[b].g.t] || ORDER[a] - ORDER[b]);
// Where to study a topic, and a question: the steps the question names, then the steps that teach its main topic. Three at most.
const tagRefs = t => byKind(TAG_STEPS[t] || []).slice(0, 3);
const studyRefs = q => byKind([...q.ref, ...(TAG_STEPS[q.tags[0]] || []), ...(TAG_STEPS[q.tags[0]] ? [] : q.tags.flatMap(t => TAG_STEPS[t] || []))]).slice(0, 3);
function refHTML(id, extra = "") {
  const { d, g, it } = itemIndex[id];
  const url = linkFor(g.link);
  return `<li><div class="ref-h">${extra}<span class="tag t-${g.t}">${g.label || TAGS[g.t]}</span><span class="muted">Day ${d.day}</span></div><div class="ref-t">${it[1]}</div>` +
    (g.where ? `<div class="where">${g.where}</div>` : "") +
    `<div class="ref-a">${url ? `<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">Open ↗</a>` : ""}<button type="button" class="sm" data-jump="${id}">Open step</button></div></li>`;
}
// side: the feedback on the question just answered; wide screens show it beside the quiz card (style.css, .qz-side).
// miss: the question was missed (picked = the options chosen, when known), so it links to its look-alike tables
function studyHTML(q, side = false, miss = false, picked) {
  const refs = studyRefs(q), las = miss ? laFor(q, picked) : [];
  const doc = q.doc && DOCS[q.doc];
  if (!refs.length && !doc && !las.length) return "";
  return `<div class="qz-study${side ? " qz-side" : ""}"><div class="qz-sh">Where to study this</div><ul class="qz-refs">${refs.map(id => refHTML(id)).join("")}</ul>` +
    (doc ? `<div class="qz-doc">AWS page: <a href="${doc[1]}" target="_blank" rel="noopener">${doc[0]} ↗</a></div>` : "") + laLinks(las) + `</div>`;
}
const answerHTML = q => `<ul class="qz-ans">${q.a.map(i => `<li><b>✓ ${q.o[i]}</b><div class="qz-why">${q.x[i]}</div></li>`).join("")}</ul>`;
// One click says why a question was missed; the weak spots and the overview show the pattern.
const whyHTML = q => {
  const b = S.book[q.id];
  if (!b) return "";
  return `<div class="why-r" role="group" aria-label="Why did you miss it?"><span class="why-k">Why did you miss it?</span>${WHY.map(([k, i, t]) => `<button type="button" class="sm" data-why="${k}" data-wq="${esc(q.id)}" aria-pressed="${b.why === k}">${i ? `${i} ` : ""}${t}</button>`).join("")}</div>`;
};
const noteHTML = q => `<label class="qz-note">A line for your notebook, if you like.<input type="text" maxlength="300" data-note="${q.id}" value="${esc((S.book[q.id] || {}).note || "")}" placeholder="e.g. mixed up gateway and interface endpoints"></label>`;
const optsHTML = (q, ord, on) => `<div class="qz-opts">${ord.map((oi, k) => `<button type="button" class="qz-o${on.includes(oi) ? " on" : ""}" data-o="${oi}" aria-pressed="${on.includes(oi)}"><span class="qz-l">${LETTERS[k]}</span><span class="qz-t">${q.o[oi]}</span><span class="qz-s" aria-hidden="true">${on.includes(oi) ? "Selected" : ""}</span></button>`).join("")}</div>`;

// Record an answer everywhere it matters: stats, spaced repetition, notebook.
// Returns whether the answer earned XP: a right answer the first time, right after a miss, or right when it was
// due for review. Answering the same question right again and again (step practice, retakes) earns nothing more.
function learn(q, ok) {
  const t = today(), s = S.qs[q.id], due = !!(S.srs[q.id] && S.srs[q.id].due <= t);
  const earns = ok && (!s || !s.right || !s.last || due);
  QZ.record(S.qs, q.id, ok, t);
  const dl = dailyNow();
  dl.a++; if (ok) dl.r++;
  const e = S.qs[q.id];
  e.xp = Math.min(e.right, (e.xp || 0) + (earns ? 1 : 0));
  if (ok) {
    QZ.srsHit(S.srs, q.id, t);
    if (S.book[q.id]) S.book[q.id].fixed = true;
  } else {
    QZ.srsMiss(S.srs, q.id, t);
    const b = S.book[q.id] || (S.book[q.id] = { at: t, misses: 0, note: "", fixed: false, why: "" });
    b.misses++; b.at = t; b.fixed = false;
  }
  return earns;
}

// ---------- quizzes: day, review, warm-up (feedback after every answer) ----------
// Where a run of n right answers stands on the way to the next streak badge: to = that mark (the mark itself when
// n has just reached it), pct = how full the bar between the mark before it and that one is.
function comboStep(n) {
  const to = ROW_UP.find(m => m >= n) || ROW_UP[ROW_UP.length - 1], from = [0, ...ROW_UP].filter(m => m < to).pop();
  return { to, pct: Math.max(0, Math.min(100, (n - from) / (to - from) * 100)) };
}
// The combo meter in the quiz's header (not in the mock exam): the run of right answers and a segmented bar (one
// segment per answer between two marks) that fills towards the next streak badge. Heat (h0–h4) is shown by four heat
// cells and the meter's fill (fx.css); it bursts at each mark and drains with a crack on a miss.
function comboHTML(r) {
  if (r.ids.length < 3) return "";
  const segs = t => t - [0, ...ROW_UP].filter(m => m < t).pop();
  const n = r.row, { to, pct } = comboStep(n), meter = (w, from, t) => `<span class="cb-m" aria-hidden="true" style="--u:${segs(t)}"><i style="width:${w}%;--from:${from}%"></i></span>`;
  if (comboFx === "broke") return `<span class="qz-cb broke" title="Right answers in a row">` +
    `<span class="cb-f" aria-hidden="true">✕</span><span class="cb-n">Streak lost <small>at ${comboWas}</small></span>${meter(0, comboStep(comboWas).pct, to)}<span class="cb-to">${to}</span></span>`;
  const h = n >= 20 ? 4 : n >= 10 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0, prev = comboStep(Math.max(0, n - 1));
  const fx = comboFx === "up" ? (ROW_MARKS.includes(n) ? " boom" : " up") : comboFx === "miss" ? " miss" : "";
  const from = comboFx === "miss" ? comboStep(comboWas).pct : comboFx === "up" && prev.to === to ? prev.pct : comboFx === "up" ? 0 : pct;
  return `<span class="qz-cb h${h}${fx}" title="Right answers in a row; the next streak badge at ${to}">` +
    `<span class="cb-f" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="cb-n"><b>${n}</b> in a row</span>` +
    `${meter(pct, from, to)}<span class="cb-to">${n >= to ? "✓" : to}</span></span>`;
}
// One square per question, numbered (a Trace of the run): right ink, wrong alert, the one on screen signal, not
// answered an outline. Click one to go there. The one just answered pops.
function mapHTML(r) {
  if (r.ids.length < 2) return "";
  return `<div class="qz-map">${r.ids.map((k, i) => {
    const a = r.ans[k], st = !a ? "" : QZ.isRight(QBY[k], a) ? "ok" : "bad";
    return `<button type="button" tabindex="-1" data-go="${i}" class="${st}${i === r.i ? " cur" : ""}${i === r.i && fresh && st ? " just" : ""}" aria-label="Question ${i + 1}${st === "ok" ? ", right" : st ? ", wrong" : ""}">${pad2(i + 1)}</button>`;
  }).join("")}</div>`;
}
// The next question not answered yet after the one on screen, wrapping round; -1 when every one is answered.
function nextOpen(r) {
  for (let k = 1; k <= r.ids.length; k++) { const j = (r.i + k) % r.ids.length; if (!r.ans[r.ids[j]]) return j; }
  return -1;
}
function renderQ() {
  const r = S.run, id = r.ids[r.i], q = QBY[id], ord = r.ord[id] || QZ.order(q), ans = r.ans[id], n = r.ids.length, sel = picks[id] || [];
  r.ord[id] = ord;
  const answered = Object.keys(r.ans).filter(k => QBY[k]);
  const right = answered.filter(k => QZ.isRight(QBY[k], r.ans[k])).length, bump = c => fresh && (comboFx === "up") === (c === "ok") ? " bump" : "";
  head(runTitle(r), [`Question ${pad2(r.i + 1)} / ${pad2(n)}`, `<span class="ok${bump("ok")}">✓ ${right}</span>`, `<span class="bad${bump("bad")}">✕ ${answered.length - right}</span>`, comboHTML(r)], answered.length / n * 100);
  // Previous and Next move one question either way and never answer; the main button checks, then goes on to the next open question.
  const prev = n > 1 ? `<button type="button" data-qz="prev"${r.i ? "" : " disabled"}>← Previous</button>` : "";
  const skip = r.i + 1 < n ? `<button type="button" data-qz="skip">Next →</button>` : "";
  if (!ans) {
    const multi = q.a.length > 1;
    qzBody.innerHTML = mapHTML(r) + `<div class="qz-q">${q.q}</div>${optsHTML(q, ord, sel)}` +
      `<p class="qz-hint muted">${multi ? "Pick two, then check." : "Pick one, then check."}<span class="kbd"> Keys A–${LETTERS[ord.length - 1]} and Enter work too, ← and → move between questions.</span></p>` +
      `<div class="qz-a qz-nav">${prev}${skip}<button type="button" class="primary" data-qz="check"${sel.length === q.a.length ? "" : " disabled"}>Check answer</button></div>`;
  } else {
    const ok = QZ.isRight(q, ans), to = nextOpen(r);
    const keyL = ord.map((oi, k) => q.a.includes(oi) ? LETTERS[k] : "").filter(Boolean).join(" and ");
    const main = to < 0 ? "See results" : to === r.i + 1 ? "Next question →" : `Continue at question ${to + 1} →`;
    qzBody.innerHTML = mapHTML(r) + `<div class="qz-q">${q.q}</div>` +
      `<div class="qz-verdict ${ok ? "ok" : "bad"}${fresh ? " fresh" : ""}" role="status">${ok ? `<span class="v-s">✓ Correct</span>` : `<span class="v-s">✕ Incorrect</span><span class="v-l">The answer is ${keyL}.</span>`}${fresh === "xp" ? `<span class="xp-up">+${XP.right} XP</span>` : ""}</div>` +
      fbHTML(q, ord, ans, fresh) + studyHTML(q, true, !ok, ans) + (ok ? "" : whyHTML(q) + noteHTML(q)) +
      `<div class="qz-a qz-nav">${prev}${to === r.i + 1 ? "" : skip}<button type="button" class="primary" data-qz="next">${main}</button></div>`;
  }
  fresh = false; comboFx = "";
}
// Go to question i of the run (Previous, Next, the squares, Continue). Answers stay as they are.
function goQ(i) {
  const r = S.run;
  if (!r || r.done || r.kind === "mock" || drill || intro || i < 0 || i >= r.ids.length || i === r.i) return;
  r.i = i;
  save(); renderQ(); qzDlg.scrollTop = 0;
  refocus(r.ans[r.ids[i]] ? '[data-qz="next"]' : ".qz-o");
}
// After Previous, Next or Flag in the mock: the same control again, or the main one where it is gone (the last question).
const mockFocus = a => (qzBody.querySelector(`[data-qz="${a}"]`) || qzBody.querySelector(".mk-a .primary") || qzBody).focus({ preventScroll: true });
// Re-rendering replaces the buttons; put focus back somewhere sensible inside the dialog.
function refocus(sel) {
  const el = qzBody.querySelector(sel);
  if (el) el.focus({ preventScroll: true });
}
function pick(oi) {
  const r = S.run;
  if (!r || r.done) return;
  const id = r.ids[r.i], q = QBY[id];
  if (r.kind === "mock") {
    const cur = r.ans[id] || [];
    let next;
    if (q.a.length === 1) next = [oi];
    else if (cur.includes(oi)) next = cur.filter(x => x !== oi);
    else if (cur.length < q.a.length) next = cur.concat(oi);
    else return;
    if (next.length) r.ans[id] = next; else delete r.ans[id];
    if (r.x[id] && next.includes(oi)) { r.x[id] = r.x[id].filter(x => x !== oi); if (!r.x[id].length) delete r.x[id]; }   // picking an option brings it back
    save(); renderMockQ(); refocus(`[data-o="${oi}"]`);
    return;
  }
  if (r.ans[id]) return;
  let sel = picks[id] || [];
  if (q.a.length === 1) sel = [oi];
  else if (sel.includes(oi)) sel = sel.filter(x => x !== oi);
  else if (sel.length < q.a.length) sel = sel.concat(oi);
  picks[id] = sel;
  renderQ();
  refocus(sel.length === q.a.length ? '[data-qz="check"]' : `[data-o="${oi}"]`);
}
function check() {
  const r = S.run, id = r.ids[r.i], q = QBY[id];
  const sel = picks[id] || [];
  if (r.ans[id] || sel.length !== q.a.length) return;
  r.ans[id] = sel.slice();
  delete picks[id];
  const ok = QZ.isRight(q, r.ans[id]);
  const earned = learn(q, ok);
  const was = r.row, best = r.best0;
  r.row = ok ? r.row + 1 : 0;
  r.rowMax = Math.max(r.rowMax, r.row);
  S.rowBest = Math.max(S.rowBest, r.row);
  const record = ok && r.row > best && best >= 3 && !r.rec;   // past your longest run from before this quiz, said once a quiz
  const got = award(r.row);
  fresh = earned ? "xp" : true;
  comboFx = ok ? "up" : was >= 2 ? "broke" : "miss"; comboWas = was;
  save(); renderQ();
  refocus('[data-qz="next"]');
  const verdict = qzBody.querySelector(".qz-verdict"), meter = document.querySelector("#qz-meta .qz-cb");
  verdict.scrollIntoView({ block: "nearest" });
  // every answer has a sound (right ones climb with the run) and something to see; the mock exam has none of this
  let rest = got;
  if (!ok) FX.wrong(was, meter);
  else if (ROW_MARKS.includes(r.row)) {
    // the streak's badge drops in at the top; when it also earns a badge, it says so instead of a second one
    const [, icon, name, tier] = ROW_TIERS.find(x => x[0] === r.row), a = got.find(x => x.row === r.row);
    rest = got.filter(x => x !== a);
    FX.combo(r.row, verdict, meter);
    FX.badge(icon, `${r.row} in a row`, a ? `New badge: ${a.t}, +${a.xp} XP` : name, tier);
  }
  else FX.right(r.row, verdict, meter);
  if (record) { r.rec = true; save(); const n = r.row; setTimeout(() => FX.badge("REC", "New record", `${n} in a row beats your best of ${best}`, "gold"), 450); }
  showGains(rest, 700);
}
function nextQ() {
  const r = S.run;
  if (!r.ans[r.ids[r.i]]) return;
  const to = nextOpen(r);
  if (to < 0) finishRun(); else goQ(to);
}
function finishRun() {
  const r = S.run, t = today();
  r.score = r.ids.filter(id => QZ.isRight(QBY[id], r.ans[id])).length;
  r.done = true;
  if (r.kind === "day") {
    const d = dayOf(r.day);
    const was = { d: dayDone(d), w: weekOf(d).every(dayDone), a: DAYS.every(dayDone), m: mockOpen() };
    const rec = S.quiz[d.id] || (S.quiz[d.id] = { best: 0, passed: "", tries: [] });
    rec.tries.push({ at: t, score: r.score, n: r.ids.length });
    rec.best = Math.max(rec.best, r.score);
    if (QZ.passed(r.score, r.ids.length) && !rec.passed) rec.passed = t;
    markDayDone(d);
    r.cel = !was.a && DAYS.every(dayDone) ? "all" : !was.w && weekOf(d).every(dayDone) ? "week" : !was.d && dayDone(d) ? "day" : "";
    r.mockNew = !was.m && mockOpen();
  }
  if (r.kind === "warm") S.warm[t] = "done";
  let got = award();
  r.xp1 = xpTotal(); r.gif = pickGif(outcome(r));
  save(); refresh(); renderQuiz();
  // the results are on screen: celebrate there (the day's own celebration follows when they are closed)
  const n = r.ids.length, clean = r.score === n;
  if (r.kind === "day") {
    if (!QZ.passed(r.score, n)) FX.sound("miss");
    else if (clean) {
      const a = got.find(x => x.id === "perfect");
      got = got.filter(x => x !== a);
      FX.perfect(); FX.badge("MAX", "Perfect score", a ? `New badge, +${a.xp} XP` : `All ${n} right`, "epic");
    }
    else FX.pass();
  } else if (clean) { FX.sound("chime"); FX.sparkle(qzBody.querySelector(".qz-score")); }
  showGains(got, 900);
  qzDlg.scrollTop = 0;
  focusMain();
}
function missedHTML(missed) {
  if (!missed.length) return "";
  // Group by where to study, so six misses on one module read as one place to go back to.
  const refs = {};
  missed.forEach(q => { const id = studyRefs(q)[0]; if (id) refs[id] = (refs[id] || 0) + 1; });
  const order = Object.keys(refs).sort((a, b) => refs[b] - refs[a]);
  return `<h3 class="sub-h">Go back to</h3><ul class="qz-refs">${order.map(id => refHTML(id, `<span class="pill warn">${plural(refs[id], "miss", "misses")}</span>`)).join("")}</ul>` +
    `<h3 class="sub-h">Questions you missed</h3><ol class="qz-missed">${missed.map(q => `<li><details><summary>${q.q}</summary>${answerHTML(q)}${whyHTML(q)}</details></li>`).join("")}</ol>`;
}
// How a finished quiz went: "ace" (every answer right), "pass" or "fail". The bar is the pass mark on a day quiz,
// 72% on a mock exam (where its results call it close to the line), 60% on a review, warm-up or step practice.
function outcome(r) {
  const [sc, n] = r.kind === "mock" ? [r.res.score, r.res.n] : [r.score, r.ids.length];
  if (n && sc === n) return "ace";
  return (r.kind === "day" ? QZ.passed(sc, n) : sc / n >= (r.kind === "mock" ? 0.72 : 0.6)) ? "pass" : "fail";
}
// Stars, the level with the XP this quiz earned, and the longest run of right answers.
function rewardHTML(r) {
  const o = outcome(r), [sc, n] = r.kind === "mock" ? [r.res.score, r.res.n] : [r.score, r.ids.length];
  const stars = o === "ace" ? 3 : o === "fail" ? 0 : sc / n >= (r.kind === "day" ? 0.95 : 0.8) ? 2 : 1;
  const L = levelOf(r.xp1 >= 0 ? r.xp1 : xpTotal()), gain = r.xp0 >= 0 ? L.x - r.xp0 : 0;
  const from = r.xp0 >= L.from ? (r.xp0 - L.from) / (L.to - L.from) * 100 : 0;   // a level gained: the bar fills from empty
  const row = r.rowMax >= 2 ? `Longest run of right answers: ${r.rowMax}${r.rowMax < 3 ? "" : r.rowMax > r.best0 ? ", your best yet" : r.rowMax === r.best0 ? ", equal to your best" : ""}. ` : "";
  // the stars are three squares: lit in signal, unlit an outline
  return `<div class="qz-rw"><div class="stars" role="img" aria-label="${stars} of 3 stars">${[0, 1, 2].map(k => `<span class="${k < stars ? "on" : ""}" style="animation-delay:${0.2 + k * 0.25}s"></span>`).join("")}</div>` +
    `<div class="rw-x"><div class="rw-l"><b>Level ${L.n}</b><span class="muted">${rankOf(L.n)}</span>${gain > 0 ? `<span class="xp-up">+${gain} XP</span>` : ""}</div>` +
    `<span class="xpbar"><span style="--from:${from}%;width:${L.pct}%"></span></span>` +
    `<span class="muted">${row}${L.to - L.x} XP to level ${L.n + 1}.</span></div></div>`;
}
// A South Park GIF for the outcome (gifs.js), taken in turn from its list so it changes every time.
// Loaded from GIPHY; if that fails (offline, a GIF taken down) the space closes again.
const gifList = o => ((window.GIFS || {})[o] || []).filter(g => Array.isArray(g) && /^[A-Za-z0-9]+$/.test(g[0]));
// The next GIF of an outcome's list, chosen when the quiz finishes and kept in the run.
function pickGif(o) {
  const list = gifList(o);
  if (!list.length) return "";
  const at = isObj(ui.gif) && Number.isInteger(ui.gif[o]) && ui.gif[o] >= 0 ? ui.gif[o] % list.length : Math.floor(Math.random() * list.length);
  ui.gif = { ...(isObj(ui.gif) ? ui.gif : {}), [o]: (at + 1) % list.length };
  try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) {}
  return list[at][0];
}
function gifHTML(r) {
  const list = gifList(outcome(r));
  if (!S.settings.gif || !list.length) return "";
  let g = list.find(x => x[0] === r.gif);
  if (!g) { r.gif = pickGif(outcome(r)); g = list.find(x => x[0] === r.gif); save(); }   // a run finished before GIFs, or the list changed
  const [id, alt] = g, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return `<figure class="qz-gif"><img src="https://media.giphy.com/media/${id}/${still ? "giphy_s" : "giphy"}.gif" alt="${esc(alt || "South Park")}" referrerpolicy="no-referrer" decoding="async"><figcaption>via GIPHY</figcaption></figure>`;
}
// The run's own id, for the result's foot and its barcode: the day and the try ("D03-T2"), the mock's number, the step,
// or the kind and the date.
function runCode(r) {
  if (r.kind === "day") { const d = dayOf(r.day), q = S.quiz[r.day]; return `D${pad2(d ? d.day : 0)}-T${q && q.tries.length ? q.tries.length : 1}`; }
  if (r.kind === "mock") return `MOCK-${pad2(S.mocks.length)}`;
  if (r.kind === "step") return `STEP-${String(r.item).toUpperCase()}`;
  return `${r.kind === "warm" ? "WARM" : "REV"}-${today()}`;
}
// The score box as a Datum Result: a frame with the verdict as one bracketed word, the score on a dial and on a
// ruler against the bar (the pass mark of a day quiz, 80% aimed at on a mock, 60% on the rest), the number and what it
// means, the run's id as a real barcode in the frame's foot; the GIF beside it.
function resHTML(r, cls, score, msg) {
  const gif = gifHTML(r), A = window.Datum, [sc, n] = r.kind === "mock" ? [r.res.score, r.res.n] : [r.score, r.ids.length];
  const p = n ? Math.round(sc / n * 100) : 0;
  const [barK, bar] = r.kind === "day" ? ["Pass", Math.round(QZ.needed(n) / n * 100)] : r.kind === "mock" ? ["Aim", 80] : ["Bar", 60];
  const below = p < bar;
  const word = r.kind === "day" ? (QZ.passed(sc, n) ? "Passed" : "Retry") : r.kind === "mock" ? (cls === "ok" ? "Ready" : cls === "mid" ? "Close" : "Retry") : outcome(r) === "fail" ? "Retry" : "Done";
  const label = `Score ${p}%, ${barK.toLowerCase()} mark ${bar}%`, code = runCode(r);
  const dial = A ? `<span class="dm-dial${below ? " is-below" : ""}">${A.dial(p, { target: bar, size: 112, label })}<span class="dm-dial__val">${p}<small>%</small></span></span>` : "";
  const ruler = `<div class="dm-ruler${below ? " is-below" : ""}" style="--value:${p};--target:${bar}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}" aria-label="${label}">` +
    `<div class="dm-ruler__track"><span class="dm-ruler__target" data-label="${barK} ${bar}"></span><span class="dm-ruler__pointer" data-label="${p}%"></span></div>` +
    `<div class="dm-ruler__scale" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div></div>`;
  return `<section class="qz-res dm-frame dm-frame--foot ${cls}${gif ? " has-gif" : ""}" aria-label="Result"><span class="dm-frame__tab">Result</span>` +
    `<div class="qz-res-t"><p class="qz-vd dm-bracketed${word === "Retry" ? " is-alert" : ""}">${word}</p>` +
    `<div class="qz-res-m">${dial}<div class="qz-res-x"><div class="qz-score">${score}</div><div class="qz-msg">${msg}</div></div></div>${ruler}</div>` +
    `${gif}<span class="dm-frame__foot">${esc(code)}${A ? A.barcode(code, { height: 10 }).replace("<svg", '<svg aria-hidden="true"') : ""}</span></section>` + rewardHTML(r);
}
function hookGif() {
  const img = qzBody.querySelector(".qz-gif img");
  if (!img) return;
  const drop = () => { const f = img.closest(".qz-gif"); if (f) { f.closest(".qz-res").classList.remove("has-gif"); f.remove(); } };
  img.addEventListener("error", drop);
  setTimeout(() => { if (!img.naturalWidth) drop(); }, 20000);
}
function renderResult() {
  const r = S.run, n = r.ids.length;
  r.seen = true;
  const missed = r.ids.filter(id => !QZ.isRight(QBY[id], r.ans[id])).map(id => QBY[id]);
  head(runTitle(r), ["Results"], 100);
  const score = `${r.score} <small>of ${n}</small>`;
  if (r.kind === "day") {
    const d = dayOf(r.day), pass = QZ.passed(r.score, n);
    qzBody.innerHTML = resHTML(r, pass ? "ok" : "bad", score,
      pass ? `Pass mark ${QZ.needed(n)}.${r.cel ? ` Day ${d.day} is complete.` : ""}` : `You need ${QZ.needed(n)} to pass. A retake draws different questions, and the ones you missed come back for review over the next days.`) +
      missedHTML(missed) +
      `<div class="qz-a">${pass
        ? `<button type="button" class="primary" data-qz="finish">${r.cel ? `Finish Day ${d.day} →` : "Close"}</button>`
        : `<button type="button" data-qz="finish">Close</button><button type="button" class="primary" data-qz="retake">Retake with new questions</button>`}</div>`;
  } else {
    qzBody.innerHTML = resHTML(r, missed.length ? (outcome(r) === "fail" ? "bad" : "") : "ok", score,
      missed.length ? "The ones you missed come back in a few days." : "Every answer right.") + missedHTML(missed) +
      `<div class="qz-a"><button type="button" class="primary" data-qz="finish">Close</button></div>`;
  }
  hookGif();
}
// Leave the results screen: clear the run, then celebrate if the quiz finished a day.
function finishResults() {
  const r = S.run;
  if (!r || !r.done) return;
  dropRun();
  save();
  if (qzDlg.open) qzDlg.close();
  refresh();
  if (r.kind === "day") {
    const d = dayOf(r.day);
    const cel = r.cel ? celebrate(r.cel, d) : 0;
    if (r.cel && view.day === d.id) move("done");   // the day's summary, with the button for the next day
    if (r.mockNew) setTimeout(() => whenFree(promptMock), (cel || 3200) + 600);   // after the celebration
  }
}

// ---------- mock exam (no feedback until the end) ----------
// The mock exam screen works like an exam screen: strike out the options you have ruled out, highlight the words
// that carry the requirement, flag questions for review, the clock always in view (red in the last 10 minutes).
const mkClock = r => `<span id="mk-time" class="mk-time${r.end - Date.now() < 600000 ? " low" : ""}">${clock(r.end - Date.now())}</span> left`;
function renderMockQ() {
  const r = S.run, id = r.ids[r.i], q = QBY[id], ord = r.ord[id] || QZ.order(q), mine = r.ans[id] || [], xs = r.x[id] || [];
  r.ord[id] = ord;
  const answered = r.ids.filter(k => (r.ans[k] || []).length).length;
  head("Mock exam", [`Question ${pad2(r.i + 1)} / ${r.ids.length}`, mkClock(r), `${pad2(answered)} answered`], answered / r.ids.length * 100);
  const last = r.i + 1 >= r.ids.length, multi = q.a.length > 1;
  qzBody.innerHTML = `<div class="mk-tools"><button type="button" data-qz="flag" class="flagb" aria-pressed="${!!r.flag[id]}">${r.flag[id] ? "■ Flagged for review" : "□ Flag for review"}</button>` +
    `<span class="muted mk-hint"><span class="kbd">Click or drag over words to highlight them. Shift + 1–${ord.length} or the / button strikes an option out.</span><span class="touch">Tap a word to highlight it. The / button strikes an option out.</span></span></div>` +
    `<div class="qz-q mk-q">${q.q}</div>` +
    `<div class="qz-opts mk-opts${multi ? " multi" : ""}">${ord.map((oi, k) => `<div class="mk-row${xs.includes(oi) ? " x" : ""}">` +
      `<button type="button" class="qz-o${mine.includes(oi) ? " on" : ""}" data-o="${oi}" aria-pressed="${mine.includes(oi)}"><span class="qz-l">${LETTERS[k]}</span><span class="qz-t">${q.o[oi]}</span></button>` +
      `<button type="button" class="mk-x" data-qz="strike" data-x="${oi}" aria-pressed="${xs.includes(oi)}" title="${xs.includes(oi) ? "Bring this option back" : "Strike this option out"}" aria-label="${xs.includes(oi) ? "Bring back" : "Strike out"} option ${LETTERS[k]}">/</button></div>`).join("")}</div>` +
    `<div class="qz-a mk-a"><button type="button" data-qz="prev"${r.i ? "" : " disabled"}>← Previous</button>` +
    `<button type="button" data-qz="grid">Review all</button>` +
    `<button type="button" class="primary" data-qz="${last ? "grid" : "mnext"}">${last ? "Review and finish" : "Next →"}</button></div>`;
  mkWords();
}
// Wrap every word of the question in a span (numbered in reading order) and mark the highlighted ones.
function mkWords() {
  const qEl = qzBody.querySelector(".mk-q"), r = S.run, hl = new Set(r.hl[r.ids[r.i]] || []);
  if (!qEl) return;
  const walker = document.createTreeWalker(qEl, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let n = 0;
  for (const t of nodes) {
    const parts = t.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) { frag.append(p); continue; }
      const w = document.createElement("span");
      w.className = "w" + (hl.has(n) ? " hl" : ""); w.dataset.w = n++; w.textContent = p;
      frag.append(w);
    }
    t.replaceWith(frag);
  }
}
// A click on a word toggles it; a drag over several marks them all (or clears them, when all were marked).
function mkHighlight(from, to) {
  const r = S.run, id = r.ids[r.i], set = new Set(r.hl[id] || []), lo = Math.min(from, to), hi = Math.max(from, to);
  const all = [];
  for (let i = lo; i <= hi; i++) all.push(i);
  const off = all.every(i => set.has(i));
  all.forEach(i => (off ? set.delete(i) : set.add(i)));
  r.hl[id] = [...set].sort((a, b) => a - b);
  if (!r.hl[id].length) delete r.hl[id];
  save();
  qzBody.querySelectorAll(".mk-q .w").forEach(w => w.classList.toggle("hl", set.has(+w.dataset.w)));
}
function mkStrike(oi) {
  const r = S.run, id = r.ids[r.i], xs = new Set(r.x[id] || []);
  if (xs.has(oi)) xs.delete(oi);
  else { xs.add(oi); if ((r.ans[id] || []).includes(oi)) { r.ans[id] = r.ans[id].filter(x => x !== oi); if (!r.ans[id].length) delete r.ans[id]; } }   // a struck option is no longer picked
  r.x[id] = [...xs];
  if (!r.x[id].length) delete r.x[id];
  save(); renderMockQ(); refocus(`[data-x="${oi}"]`);
}
let gridF = "";   // the review screen's filter: "", "flag" or "open"
// Highlighting: press on a word, release on the same word (toggle) or another one (the words between).
let mkDown = -1;
qzBody.addEventListener("pointerdown", e => { const w = e.target.closest(".mk-q .w"); mkDown = w ? +w.dataset.w : -1; });
qzBody.addEventListener("pointerup", e => {
  if (mkDown < 0) return;
  const el = document.elementFromPoint(e.clientX, e.clientY), w = el && el.closest(".mk-q .w"), from = mkDown;
  mkDown = -1;
  if (!w || !S.run || S.run.kind !== "mock" || S.run.done) return;
  mkHighlight(from, +w.dataset.w);
  const sel = getSelection();
  if (sel) sel.removeAllRanges();
});
function renderGrid() {
  const r = S.run;
  const un = r.ids.filter(k => !(r.ans[k] || []).length).length;
  const fl = r.ids.filter(k => r.flag[k]).length;
  head("Mock exam", ["Review", mkClock(r)], (r.ids.length - un) / r.ids.length * 100);
  const show = k => (gridF === "flag" ? !!r.flag[k] : gridF === "open" ? !(r.ans[k] || []).length : true);
  qzBody.innerHTML = `<p>${r.ids.length - un} of ${r.ids.length} answered${fl ? `, ${fl} flagged` : ""}. Pick a number to go back to it.</p>` +
    `<div class="seg mk-f" role="group" aria-label="Show">${[["", `All (${r.ids.length})`], ["flag", `Flagged (${fl})`], ["open", `Not answered (${un})`]].map(([k, l]) => `<button type="button" data-grid-f="${k}" aria-pressed="${gridF === k}">${l}</button>`).join("")}</div>` +
    `<div class="mk-grid">${r.ids.map((k, i) => show(k) ? `<button type="button" data-go="${i}" class="${(r.ans[k] || []).length ? "ans" : ""}${r.flag[k] ? " flag" : ""}" aria-label="Question ${i + 1}, ${(r.ans[k] || []).length ? "answered" : "not answered"}${r.flag[k] ? ", flagged" : ""}">${i + 1}</button>` : "").join("") || `<p class="muted">None.</p>`}</div>` +
    `<div class="mk-key"><span class="ans">Answered</span><span class="flag">Flagged</span><span>Not answered</span></div>` +
    `<div class="qz-a"><button type="button" data-qz="back">Back to the questions</button><button type="button" class="primary" data-qz="finish-mock">Finish exam</button></div>`;
}
function finishMock(auto) {
  const r = S.run;
  if (!r || r.kind !== "mock" || r.done) return;
  pruneRun(r);
  if (!auto) {
    const un = r.ids.filter(k => !(r.ans[k] || []).length).length;
    if (!confirm(un ? `${plural(un, "question")} ${un === 1 ? "is" : "are"} unanswered and will count as wrong. Finish anyway?` : "Finish the exam and see your results?")) return;
  }
  const qs = r.ids.map(id => QBY[id]);
  const res = QZ.mockResult(qs, r.ans);
  qs.forEach(q => learn(q, QZ.isRight(q, r.ans[q.id])));
  r.done = true; r.res = res; r.only = true;
  r.mins = Math.round((Math.min(Date.now(), r.end) - r.t0) / 60000);
  S.mocks.push({ at: today(), score: res.score, n: res.n, pct: res.pct, dom: res.dom, mins: r.mins });
  const got = award();
  r.xp1 = xpTotal(); r.gif = pickGif(outcome(r));
  save(); refresh();
  showGains(got, 1000);
  if (res.pct >= 80) setTimeout(() => FX.pass(), 300);   // a comfortable margin on a full mock exam
  if (qzDlg.open) { renderQuiz(); qzDlg.scrollTop = 0; focusMain(); }
  if (auto) { FX.banner("Time is up", "Your mock exam was submitted.", "info"); if (!qzDlg.open) whenFree(openQuiz); }
}
function renderMockResult() {
  const r = S.run, res = r.res;
  r.seen = true;
  head("Mock exam", ["Results"], 100);
  const doms = ["Secure", "Resilient", "High-performing", "Cost-optimized"];
  const prev = S.mocks.slice(0, -1).map(m => m.pct + "%");
  const cls = res.pct >= 80 ? "ok" : res.pct >= 72 ? "mid" : "bad";
  const msg = cls === "ok" ? "A comfortable margin. Keep your rhythm until exam day."
    : cls === "mid" ? "Close to the line. Work through the misses below and your weakest domain."
    : "Not there yet. Work through the misses below, then the weak-spot map.";
  const list = r.ids.map((id, i) => ({ q: QBY[id], i, ok: QZ.isRight(QBY[id], r.ans[id]) })).filter(x => !r.only || !x.ok);
  qzBody.innerHTML = resHTML(r, cls, `${res.pct}% <small>${res.score} of ${res.n} in ${r.mins} min</small>`, msg) +
    `<p class="muted">The real exam reports a scaled score from 100 to 1000 (720 to pass), and AWS doesn't publish how right answers map to it, so treat this percentage as a rough guide. Aim for 80% or more here.${prev.length ? ` Earlier mocks: ${prev.join(", ")}.` : ""}</p>` +
    `<div class="dom-bars">${res.dom.map(([a, n], i) => bar(`D${i + 1} ${doms[i]}`, pct(a, n), `${a}/${n}`)).join("")}</div>` +
    `<div class="mk-rev-h"><h3 class="sub-h">Review</h3><label class="chk"><input type="checkbox" data-only${r.only ? " checked" : ""}> Only the ones I got wrong</label></div>` +
    `<ol class="qz-missed">${list.map(x => `<li value="${x.i + 1}" class="${x.ok ? "right" : "wrong"}"><details><summary>${x.ok ? "✓" : "✕"} ${x.q.q}</summary>${fbHTML(x.q, r.ord[x.q.id] || QZ.order(x.q), r.ans[x.q.id] || [])}${x.ok ? "" : whyHTML(x.q)}${studyHTML(x.q, false, !x.ok, r.ans[x.q.id])}</details></li>`).join("") || "<li>Nothing wrong.</li>"}</ol>` +
    `<div class="qz-a"><button type="button" class="primary" data-qz="finish">Close</button></div>`;
  hookGif();
}

// ---------- "Which service?" drill ----------
// The "Which service?" drill, four ways (the owner chose the three new ones):
//   go:    60 seconds, a requirement and four services
//   rev:   60 seconds, a service and four requirements: which one is it for?
//   lives: no clock, until the third miss
//   day:   the same five for everyone on a date, once a day; the first try is the day's result
const DRILL_MODES = {
  go: { t: "60 seconds", b: "60 s", d: "A requirement, four services." },
  rev: { t: "Reverse", b: "Reverse", d: "A service, four requirements: which one is it for?" },
  lives: { t: "Three lives", b: "3 lives", d: "No clock. Keep going until your third miss." },
  day: { t: "Daily five", b: "Daily five", d: "Today's five, the same all day. Your first try counts." }
};
// A seeded shuffle, so the daily five are the same five all day.
function seeded(arr, seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Reverse mode: the wrong requirements come from the services that this one is usually confused with, then from its neighbours in the list.
function revOpts(it) {
  const k = DRILL.indexOf(it), out = [];
  for (const w of it[2]) { const x = DRILL.find(d => d[1] === w); if (x && !out.includes(x[0])) out.push(x[0]); }
  for (let d = 1; out.length < 3 && d < DRILL.length; d++) for (const j of [k - d, k + d]) { const x = DRILL[j]; if (x && x !== it && out.length < 3 && !out.includes(x[0])) out.push(x[0]); }
  return QZ.shuffle([it[0], ...out.slice(0, 3)]);
}
function startDrill(mode = "go") {
  if (!DRILL.length) return;
  if (!DRILL_MODES[mode]) mode = "go";
  intro = null;
  stopDrill();
  const t = today();
  drill = { mode, end: mode === "go" || mode === "rev" ? Date.now() + 60000 : 0, lives: 3, items: mode === "day" ? seeded(DRILL, t).slice(0, 5) : QZ.shuffle(DRILL), i: 0, score: 0, n: 0, missed: [], lock: false, done: false, opts: [], date: t };
  drillNext();
  if (!qzDlg.open) qzDlg.showModal();
  focusMain();
  if (drill.end) drill.timer = setInterval(drillTick, 200);
}
const drillAns = it => (drill.mode === "rev" ? it[0] : it[1]);
function drillNext() {
  const it = drill.items[drill.i % drill.items.length];
  drill.opts = drill.mode === "rev" ? revOpts(it) : QZ.shuffle([it[1], ...it[2]]);
  renderDrill();
}
function drillTick() {
  if (!drill || drill.done || !drill.end) return;
  const left = drill.end - Date.now();
  if (left <= 0) return drillEnd();
  const el = document.getElementById("dr-time");
  if (el) el.textContent = Math.ceil(left / 1000) + " s";
  document.getElementById("qz-bar").style.width = (100 - left / 600) + "%";
}
function drillPick(k) {
  if (!drill || drill.lock || drill.done) return;
  const it = drill.items[drill.i % drill.items.length], ok = drill.opts[k] === drillAns(it);
  drill.n++;
  if (ok) drill.score++; else { drill.missed.push(it); drill.lives--; }
  drill.lock = true;
  qzBody.querySelectorAll("[data-dr]").forEach((b, i) => {
    if (drill.opts[i] === drillAns(it)) b.classList.add("right");
    else if (i === k) b.classList.add("wrong");
  });
  const sc = document.getElementById("dr-score");
  if (sc) sc.textContent = `Score ${drill.score}`;
  const lv = document.getElementById("dr-lives");
  if (lv) lv.innerHTML = livesHTML();
  FX.sound(ok ? "pop" : "miss");
  const over = (drill.mode === "lives" && drill.lives <= 0) || (drill.mode === "day" && drill.n >= drill.items.length);
  setTimeout(() => { if (!drill || drill.done) return; if (over) return drillEnd(); drill.lock = false; drill.i++; drillNext(); }, ok ? 350 : 1200);
}
const livesHTML = () => [0, 1, 2].map(i => `<span class="${i < drill.lives ? "on" : ""}" aria-hidden="true">${i < drill.lives ? "■" : "□"}</span>`).join("") + `<span class="sr">${plural(Math.max(0, drill.lives), "life", "lives")} left</span>`;
// Days in a row with the daily five done, up to today (or yesterday, while today's is still open).
function dailyRun() {
  const d = midnight();
  if (!(iso(d) in S.drill.day)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (iso(d) in S.drill.day) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function drillEnd() {
  drill.done = true;
  clearInterval(drill.timer);
  S.drill.runs++;
  const key = { go: "best", rev: "rev", lives: "lives" }[drill.mode];
  if (key) { drill.best = drill.score > S.drill[key]; if (drill.best) S.drill[key] = drill.score; }
  else { drill.first = !(drill.date in S.drill.day); if (drill.first) S.drill.day[drill.date] = drill.score; }
  const got = award();
  save(); renderDrill(); renderPractice();
  FX.sound("chime");
  showGains(got, 500);
}
function stopDrill() { if (drill) clearInterval(drill.timer); drill = null; }
function renderDrill() {
  const m = DRILL_MODES[drill.mode], title = drill.mode === "go" ? "Which service?" : `Which service? ${m.t}`;
  if (!drill.done) {
    const it = drill.items[drill.i % drill.items.length], rev = drill.mode === "rev";
    const meta = drill.end ? [`<span id="dr-time">${Math.ceil((drill.end - Date.now()) / 1000)} s</span>`] : drill.mode === "lives" ? [`<span id="dr-lives" class="dr-lives">${livesHTML()}</span>`] : [`${drill.n + 1} of ${drill.items.length}`];
    head(title, [...meta, `<span id="dr-score">Score ${drill.score}</span>`], drill.end ? 100 - (drill.end - Date.now()) / 600 : drill.mode === "day" ? drill.n / drill.items.length * 100 : 0);
    qzBody.innerHTML = `<div class="dr-req${rev ? " dr-svc" : ""}">${rev ? `<span class="muted">What is this one for?</span>` : ""}${esc(rev ? it[1] : it[0])}</div>` +
      `<div class="qz-opts dr-opts${rev ? " dr-long" : ""}">${drill.opts.map((o, k) => `<button type="button" class="qz-o" data-dr="${k}"><span class="qz-l">${k + 1}</span><span class="qz-t">${esc(o)}</span></button>`).join("")}</div><p class="muted kbd">Keys 1–4 work too.</p>`;
    return;
  }
  const best = drill.mode === "day" ? "" : drill.best ? "New personal best." : `Your best: ${S.drill[{ go: "best", rev: "rev", lives: "lives" }[drill.mode]]}.`;
  const day = drill.mode === "day" ? (drill.first ? `Today's result. ${dailyRun() > 1 ? `${dailyRun()} days in a row.` : "Come back tomorrow for the next five."}` : `Today's result stays ${S.drill.day[drill.date]} of 5: only the first try counts.`) : "";
  head(title, [drill.mode === "lives" ? "Out of lives" : drill.mode === "day" ? "Done" : "Time is up"], 100);
  // the result in a frame like a quiz's: the state as one bracketed word, the count, what it means
  qzBody.innerHTML = `<section class="qz-res dm-frame ok" aria-label="Result"><span class="dm-frame__tab">Result</span><div class="qz-res-t">` +
    `<p class="qz-vd dm-bracketed">${drill.mode === "lives" ? "Out" : drill.mode === "day" ? "Done" : "Time"}</p>` +
    `<div class="qz-res-x"><div class="qz-score">${drill.score} <small>right of ${drill.n}</small></div><div class="qz-msg">${best}${day}</div></div></div></section>` +
    (drill.missed.length ? `<h3 class="sub-h">Missed</h3><ul class="dr-missed">${drill.missed.map(it => `<li><div>${esc(it[0])}</div><div><b>${esc(it[1])}</b>: ${esc(it[3])}</div></li>`).join("")}</ul>` : "") +
    `<div class="qz-a"><button type="button" data-qz="close">Close</button>${drill.mode === "day" ? "" : `<button type="button" class="primary" data-drill-mode="${drill.mode}">Play again</button>`}</div>`;
}

// ---------- quiz dialog events ----------
qzDlg.addEventListener("click", e => {
  const o = e.target.closest("[data-o]");
  if (o) { pick(+o.dataset.o); return; }
  const dr = e.target.closest("[data-dr]");
  if (dr) { drillPick(+dr.dataset.dr); return; }
  const go = e.target.closest("[data-go]");
  if (go && S.run) {
    if (S.run.kind !== "mock") { goQ(+go.dataset.go); return; }
    S.run.i = +go.dataset.go; S.run.view = ""; save(); renderQuiz(); qzDlg.scrollTop = 0; return;
  }
  const j = e.target.closest("[data-jump]");
  if (j) { qzDlg.close(); jumpTo(j.dataset.jump); return; }
  const gf = e.target.closest("[data-grid-f]");
  if (gf) { gridF = gf.dataset.gridF; renderGrid(); return; }
  const b = e.target.closest("[data-qz]");
  if (!b) return;
  const a = b.dataset.qz, r = S.run;
  if (a === "close") qzDlg.close();
  else if (a === "go") { const fn = intro.go; intro = null; fn(); }
  else if (!r) qzDlg.close();   // the run went away under the dialog (another device or tab)
  else if (a === "check") check();
  else if (a === "next") nextQ();
  else if (a === "finish") finishResults();
  else if (a === "retake") { const day = r.day; dropRun(); startRun("day", day); }
  else if (a === "prev") { if (r.kind === "mock") { r.i = Math.max(0, r.i - 1); save(); renderMockQ(); mockFocus(a); } else goQ(r.i - 1); }
  else if (a === "skip") goQ(r.i + 1);
  else if (a === "mnext") { r.i = Math.min(r.ids.length - 1, r.i + 1); save(); renderMockQ(); qzDlg.scrollTop = 0; mockFocus(a); }
  else if (a === "flag") { const id = r.ids[r.i]; if (r.flag[id]) delete r.flag[id]; else r.flag[id] = 1; save(); renderMockQ(); mockFocus(a); }
  else if (a === "strike") mkStrike(+b.dataset.x);
  else if (a === "grid") { r.view = "grid"; save(); renderGrid(); qzDlg.scrollTop = 0; }
  else if (a === "back") { r.view = ""; save(); renderMockQ(); }
  else if (a === "finish-mock") finishMock(false);
});
qzDlg.addEventListener("change", e => {
  if (e.target.matches("[data-only]")) { S.run.only = e.target.checked; save(); renderMockResult(); }
});
// Listen on the document: re-rendering removes the focused button, which drops focus to <body>.
document.addEventListener("keydown", e => {
  if (!qzDlg.open || brkDlg.open || shDlg.open || e.target.matches("input,textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (drill) {
    const n = k.length === 1 ? Math.max("1234".indexOf(k), "abcd".indexOf(k)) : -1;
    if (n >= 0 && !drill.done) { e.preventDefault(); drillPick(n); }
    return;
  }
  const r = S.run;
  if (intro || !r || r.done) return;
  // Enter on a focused control (Previous, Flag, Open ↗, Open step) presses that control.
  if (k === "enter" && e.target.closest("button,a") && !e.target.closest(".qz-o")) return;
  if (r.kind === "mock" && e.shiftKey && /^Digit[1-5]$/.test(e.code)) {
    const x = qzBody.querySelectorAll(".mk-x")[+e.code.slice(5) - 1];
    if (x) { e.preventDefault(); x.click(); }
    return;
  }
  const n = k.length === 1 ? Math.max("12345".indexOf(k), "abcde".indexOf(k)) : -1;
  if (n >= 0) {
    const opt = qzBody.querySelectorAll(".qz-opts .qz-o")[n];
    if (opt) { e.preventDefault(); opt.click(); }
    return;
  }
  if (r.kind === "mock") {
    if (k === "arrowright" || k === "enter") { const nb = qzBody.querySelector(k === "enter" ? ".mk-a .primary" : '[data-qz="mnext"]'); if (nb) { e.preventDefault(); nb.click(); } }
    else if (k === "arrowleft") { e.preventDefault(); qzBody.querySelector('[data-qz="prev"]')?.click(); }
    else if (k === "f") { e.preventDefault(); qzBody.querySelector('[data-qz="flag"]')?.click(); }
    return;
  }
  if (k === "arrowleft" || k === "arrowright") { e.preventDefault(); goQ(r.i + (k === "arrowright" ? 1 : -1)); return; }
  if (k === "enter") {
    const p = qzBody.querySelector('[data-qz="check"]:not([disabled]),[data-qz="next"]');
    if (p || e.target.closest(".qz-o")) e.preventDefault();   // Space or A–E pick; Enter on an option alone does nothing
    if (p) p.click();
  }
});
qzDlg.addEventListener("close", () => {
  if (qzDlg.open) return;           // reopened before this event was delivered
  intro = null;
  if (drill) stopDrill();
  const r = S.run;
  // Results that were never on screen (time ran out behind the drill, say) get shown first.
  if (r && r.done) { if (r.seen) finishResults(); else whenFree(openQuiz); }
  else refresh();
  runPending();
});
let mkWarned = "";
// mock exam clock: tick the display, submit when time is up (even with the dialog closed); called by the timer's ticker
function mockTick() {
  const r = S.run;
  if (!r || r.kind !== "mock" || r.done) return;
  if (Date.now() >= r.end) return finishMock(true);
  const el = document.getElementById("mk-time"), left = r.end - Date.now();
  if (el && qzDlg.open) { el.textContent = clock(left); el.classList.toggle("low", left < 600000); }
  // like the exam, a word when 10 minutes and 1 minute are left (once each, in this tab)
  for (const m of [10, 1]) if (left < m * 60000 && left > m * 60000 - 5000 && mkWarned !== `${r.t0}:${m}`) { mkWarned = `${r.t0}:${m}`; FX.toast(`<b>${m === 1 ? "1 minute" : "10 minutes"} left</b> in the mock exam`, "warn"); }
}

// ---------- notebook, weak spots, cheat sheet, day notes ----------
const shDlg = document.getElementById("sheet"), shBody = document.getElementById("sh-body");
let nbFilter = "open";
function openSheet(kind) {
  shDlg.dataset.kind = kind;
  renderSheet();
  if (!shDlg.open) shDlg.showModal();
  shDlg.scrollTop = 0;
}
function renderSheet() {
  const kind = shDlg.dataset.kind;
  const [title, html] = kind === "notebook" ? ["Wrong-answer notebook", notebookHTML()] : kind === "weak" ? ["Weak spots", weakHTML()]
    : kind === "daynotes" ? dayNotesHTML() : kind === "badges" ? ["Badges and level", badgesHTML()] : kind === "look" ? ["Look-alikes", lookHTML()] : kind === "dg" ? dgSheet() : ["Exam wording", cuesHTML()];
  document.getElementById("sh-title").textContent = title;
  shBody.innerHTML = html;
  if (kind === "dg") { dgMark(shBody); applyGlossary(shBody); }
}
// Notes for the day on screen, plus the notes written on its single steps.
function dayNotesHTML() {
  const d = dayOf(view.day);
  if (!d) return ["Day notes", ""];
  const mine = dIds(d).filter(id => (S.inotes[id] || "").trim());
  return [`Day ${d.day} notes`,
    `<label class="notes-l">Notes for the whole day <span class="saved" data-saved="${d.id}">saved</span>` +
    `<textarea data-notes="${d.id}" placeholder="${esc(d.notesHint || "Weak spots, wrong answers, things to revisit…")}">${esc(S.notes[d.id] || "")}</textarea></label>` +
    (mine.length ? `<h3 class="sub-h">Your notes on single steps</h3><ul class="qz-refs">${mine.map(id => `<li><div class="ref-t">${itemIndex[id].it[1]}</div>` +
      `<p class="in-note">${esc(S.inotes[id])}</p><div class="ref-a"><button type="button" class="sm" data-jump="${id}">Open step</button></div></li>`).join("")}</ul>`
      : `<p class="muted">Notes you write on single steps of this day are listed here too.</p>`)];
}
function bookEntries() {
  return Object.keys(S.book).filter(id => QBY[id]).map(id => ({ q: QBY[id], b: S.book[id] }))
    .sort((x, y) => (x.b.at < y.b.at ? 1 : x.b.at > y.b.at ? -1 : y.b.misses - x.b.misses));
}
function notebookHTML() {
  const all = bookEntries(), weakDay = DAYS.find(d => d.quiz === "weak");
  if (!all.length) return `<p class="muted">Empty for now. Every question you miss in a quiz, review or mock exam lands here, with a line for why you missed it.</p>`;
  const open = all.filter(e => !e.b.fixed), fixed = all.filter(e => e.b.fixed);
  const list = nbFilter === "open" ? open : nbFilter === "fixed" ? fixed : all;
  return `<div class="seg">${[["open", `Open (${open.length})`], ["fixed", `Fixed (${fixed.length})`], ["all", `All (${all.length})`]].map(([k, l]) => `<button type="button" data-nb="${k}" aria-pressed="${nbFilter === k}">${l}</button>`).join("")}<button type="button" class="nb-exp" data-nb-export>Export as Markdown</button></div>` +
    `<p class="muted">Fixed means you answered it right after missing it. ${weakDay ? `Day ${weakDay.day} and the` : "The"} morning of the exam ${weakDay ? "are" : "is"} for this list.</p>` +
    `<ol class="qz-missed nb">${list.map(({ q, b }) => `<li class="${b.fixed ? "right" : "wrong"}"><details><summary>${q.q}<span class="nb-m">${q.tags.map(esc).join(", ")}. Missed ${b.misses}×${b.fixed ? ", answered right since" : ""}.</span></summary>` +
      `${answerHTML(q)}${whyHTML(q)}<label class="qz-note">My note<input type="text" maxlength="300" data-note="${q.id}" value="${esc(b.note || "")}"></label>${studyHTML(q, false, true)}</details></li>`).join("") || `<li class="muted">Nothing here.</li>`}</ol>`;
}
function exportNotebook() {
  const md = ["# SAA-C03 wrong-answer notebook", "", `Exported ${fmtD(new Date())}.`, ""];
  for (const { q, b } of bookEntries()) {
    md.push(`## ${strip(q.q)}`, "");
    q.a.forEach(i => md.push(`- **Answer:** ${strip(q.o[i])}`, `  - ${strip(q.x[i])}`));
    if (b.note) md.push(`- **Why I missed it:** ${b.note}`);
    md.push(`- **Missed:** ${b.misses}×${b.fixed ? " (answered right since)" : ""}`);
    const refs = studyRefs(q).map(id => { const { d, g, it } = itemIndex[id]; return `Day ${d.day}, ${strip(g.label || TAGS[g.t])}: ${strip(it[1])}`; });
    if (refs.length) md.push(`- **Study:** ${refs.join("; ")}`);
    md.push("");
  }
  download(md.join("\n"), `saa-wrong-answers-${today()}.md`, "text/markdown");
}
function weakHTML() {
  const w = QZ.weakTags(WITH_CARDQ, S.qs), dom = QZ.domainAcc(WITH_CARDQ.filter(q => q.dom), S.qs);   // an exam-technique card question has no domain
  const shaky = Object.keys(S.conf).filter(id => S.conf[id] === "shaky" && itemIndex[id]);
  if (!w.length && !shaky.length && !whyCounts().length) return `<p class="muted">Nothing yet. This fills in as you answer quiz questions and mark self-checks as shaky.</p>`;
  let h = `<h3 class="sub-h">Why you miss</h3>${whyPatternHTML()}`;
  if (dom.some(x => x[1])) h += `<h3 class="sub-h">By exam domain</h3><div class="dom-bars">${dom.map(([a, n], i) => n ? bar(`D${i + 1} ${DOMAINS[i]}`, pct(a, n), `${pct(a, n)}%`) : "").join("")}</div>`;
  if (w.length) h += `<h3 class="sub-h">By topic, weakest first</h3><p class="muted">Share of answers right, counting every attempt. Open a topic to see where to study it.</p>` +
    `<ul class="wk">${w.map(t => `<li><details><summary><span class="wk-t">${esc(t.tag)}</span><span class="tr"><span class="fi${t.acc < 0.7 ? " low" : ""}" style="width:${Math.round(t.acc * 100)}%"></span></span><span class="wk-n">${t.right}/${t.seen}</span></summary>` +
      `<ul class="qz-refs">${tagRefs(t.tag).map(id => refHTML(id)).join("")}</ul>${laLinks(laTag(t.tag))}</details></li>`).join("")}</ul>`;
  if (shaky.length) h += `<h3 class="sub-h">Self-checks you marked shaky</h3><ul class="qz-refs">${shaky.map(id => refHTML(id)).join("")}</ul>`;
  return h;
}
function badgesHTML() {
  const L = levelOf(xpTotal()), next = Math.floor((L.n - 1) / 2) + 1;
  // the level as a readout; each badge a cell whose code is filled ink once earned (state is fill)
  return `<div class="lv"><div class="lv-n"><small>Level</small>${pad2(L.n)}</div><div class="lv-x"><b>${rankOf(L.n)}</b>` +
    `<span class="xpbar"><span style="width:${L.pct}%"></span></span>` +
    `<span class="muted">${L.x} XP, ${L.to - L.x} to level ${L.n + 1}.${next < RANKS.length ? ` Next title at level ${next * 2 + 1}: ${RANKS[next]}.` : ""}</span></div></div>` +
    `<p class="muted">XP: ${XP.right} for a right quiz answer the first time, right after a miss, or right when it is due for review (repeats earn nothing), ${XP.step} for a completed step, ${XP.pass} for a day quiz passed, and what each badge is worth. ` +
    `Your longest run of right answers: ${S.rowBest || "none yet"}.</p>` +
    `<ul class="ach">${ACH.map(a => `<li class="${S.ach[a.id] ? "on" : ""}"><span class="ach-i">${a.i}</span><span class="ach-x"><b>${a.t}</b><span>${a.d}</span>` +
      `<span class="muted">${S.ach[a.id] ? `Earned ${fmtD(parseDate(S.ach[a.id]))}, +${a.xp} XP` : `+${a.xp} XP`}</span></span></li>`).join("")}</ul>`;
}
// ---------- search (Ctrl+K, / or 🔍): steps, key points, terms, exam wording, your notes, the notebook ----------
const srDlg = document.getElementById("search"), srQ = document.getElementById("sr-q"), srList = document.getElementById("sr-list");
let srStatic = null, srHits = [], srAt = 0;
const plainOf = h => strip(String(h || "")).replace(/\s+/g, " ").trim();
// What the data files hold, built once: every step, its why, each key point and trap, the glossary, exam wording.
function srBuild() {
  const out = [];
  for (const id of Object.keys(itemIndex)) {
    const { d, it } = itemIndex[id], kp = KEYS[id], at = `Day ${d.day}`;
    out.push({ kind: "Step", where: at, title: stepTitle(id), text: plainOf(`${kp && kp.head ? kp.head + " " : ""}${it[1]} ${it[2] || ""} ${kp && kp.do ? kp.do.join(" ") + " " + (kp.done || "") : ""}`), go: ["step", id] });
    if (!kp) continue;
    if (kp.why) out.push({ kind: "Why it exists", where: at, title: stepTitle(id), text: plainOf(`${kp.why} ${kp.idea || ""}`), go: ["step", id] });
    (kp.k || []).forEach(x => { if (Array.isArray(x)) out.push({ kind: "Key point", where: at, title: plainOf(x[0]), text: plainOf(`${x[0]}: ${x[1]}`), go: ["step", id] }); });
    if (kp.trap) out.push({ kind: "Exam trap", where: at, title: stepTitle(id), text: plainOf(kp.trap), go: ["step", id] });
  }
  for (const k of Object.keys(GLOSS)) out.push({ kind: "Term", where: "", title: k, text: `${k}: ${GLOSS[k]}`, go: ["term", k], full: true });
  for (const c of CUES) out.push({ kind: "Exam wording", where: "", title: c[0], text: `${c[0]}: ${c[1]}. ${c[2]}`, go: ["cues"] });
  for (const e of LA) out.push({ kind: "Look-alikes", where: "", title: e.title, text: plainOf(`${e.title}. ${e.why} ${e.rows.map(r => r.join(" ")).join(" ")}`), go: ["look", e.id] });
  for (const key in DGS) {
    const first = Object.keys(itemIndex).find(id => dgKey(id) === key);
    if (first) for (const pid in DGS[key].parts || {}) {
      const p = DGS[key].parts[pid];
      out.push({ kind: "Diagram", where: `Day ${itemIndex[first].d.day}`, title: p.name, text: plainOf(`${p.name}: ${p.why} ${(p.k || []).map(x => x.join(": ")).join(" ")} ${p.trap || ""}`), go: ["part", first, pid] });
    }
  }
  return out;
}
// What you wrote, read fresh on every search: step notes, day notes, the notebook.
function srDynamic() {
  const out = [];
  for (const id in S.inotes) if (itemIndex[id] && S.inotes[id].trim()) out.push({ kind: "My note", where: `Day ${itemIndex[id].d.day}`, title: stepTitle(id), text: S.inotes[id], go: ["step", id] });
  for (const id in S.notes) { const d = dayOf(id); if (d && S.notes[id].trim()) out.push({ kind: "Day note", where: `Day ${d.day}`, title: d.title, text: S.notes[id], go: ["day", id] }); }
  for (const id in S.book) if (QBY[id]) {
    const q = QBY[id], b = S.book[id];
    out.push({ kind: "Notebook", where: `Missed ${b.misses}×`, title: plainOf(q.q).slice(0, 90), text: plainOf(`${b.note} ${q.q} ${q.a.map(i => q.o[i]).join(" ")}`), go: ["book", id] });
  }
  return out;
}
const srWords = q => q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
function srFind(q) {
  const words = srWords(q);
  if (!words.length) return [];
  srStatic = srStatic || srBuild();
  const hits = [];
  for (const e of [...srDynamic(), ...srStatic]) {
    const t = e.text.toLowerCase();
    if (!words.every(w => t.includes(w))) continue;
    const tl = e.title.toLowerCase();
    hits.push({ e, s: words.filter(w => tl.includes(w)).length * 10 + (/note|Notebook/.test(e.kind) ? 4 : 0) - e.text.length / 2000 });
  }
  return hits.sort((a, b) => b.s - a.s).slice(0, 40).map(h => h.e);
}
// Mark the words on the plain text and escape every piece, so nothing typed or written becomes markup.
function srMark(text, words) {
  const low = text.toLowerCase(), on = new Array(text.length).fill(false);
  for (const w of words) for (let i = low.indexOf(w); i >= 0; i = low.indexOf(w, i + w.length)) for (let k = i; k < i + w.length; k++) on[k] = true;
  let h = "", m = false;
  for (let i = 0; i < text.length; i++) { if (on[i] !== m) { h += m ? "</mark>" : "<mark>"; m = on[i]; } h += esc(text[i]); }
  return h + (m ? "</mark>" : "");
}
function srSnip(text, words) {
  const low = text.toLowerCase(), first = Math.min(...words.map(w => { const j = low.indexOf(w); return j < 0 ? Infinity : j; }));
  const from = Math.max(0, (isFinite(first) ? first : 0) - 50), s = text.slice(from, from + 180);
  return (from ? "…" : "") + s + (from + 180 < text.length ? "…" : "");
}
function srRender() {
  const q = srQ.value.trim(), words = srWords(q);
  srHits = srFind(q);
  srAt = Math.min(srAt, Math.max(0, srHits.length - 1));
  srList.innerHTML = !q ? `<li class="muted sr-none">Type a word or two.</li>`
    : !srHits.length ? `<li class="muted sr-none">Nothing found for “${esc(q)}”.</li>`
    : srHits.map((e, i) => `<li role="option" class="sr-it${i === srAt ? " on" : ""}" data-sr="${i}" aria-selected="${i === srAt}">` +
      `<span class="sr-h"><span class="sr-k">${esc(e.kind)}</span>${e.where ? `<span class="muted">${esc(e.where)}</span>` : ""}</span>` +
      `<b class="sr-t">${srMark(e.title, words)}</b><span class="sr-s">${srMark(e.full ? e.text : srSnip(e.text, words), words)}</span></li>`).join("");
}
function openSearch() {
  if (document.querySelector("dialog[open]") && !srDlg.open) return;
  if (!srDlg.open) srDlg.showModal();
  srAt = 0; srRender(); srQ.focus(); srQ.select();
}
function srOpen(i) {
  const e = srHits[i];
  if (!e || e.go[0] === "term") return;   // a term's result is its definition
  const [k, v] = e.go;
  srDlg.close();
  if (k === "step") jumpTo(v);
  else if (k === "day") { const d = dayOf(v); setView(d.id, landing(d), true); openSheet("daynotes"); }
  else if (k === "book") { nbFilter = "all"; openSheet("notebook"); }
  else if (k === "look") openLook(v);
  else if (k === "part") { dgSel = { id: v, part: e.go[2] }; ui.dg = true; saveUI(); jumpTo(v); const m = cardEl.querySelector(".b-map"); if (m) m.scrollIntoView({ block: "start" }); }
  else openSheet("cues");
}
srQ.addEventListener("input", () => { srAt = 0; srRender(); });
srDlg.addEventListener("keydown", e => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    srAt = Math.max(0, Math.min(srHits.length - 1, srAt + (e.key === "ArrowDown" ? 1 : -1)));
    srRender();
    const on = srList.querySelector(".on");
    if (on) on.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") { e.preventDefault(); srOpen(srAt); }
});
srDlg.addEventListener("click", e => {
  const it = e.target.closest("[data-sr]");
  if (it) srOpen(+it.dataset.sr);
  else if (e.target.closest("[data-sr-close]")) srDlg.close();
});
srDlg.addEventListener("close", runPending);
document.addEventListener("keydown", e => {
  const typing = e.target.matches("input,textarea,select");
  if (((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") || (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
    if (document.querySelector("dialog[open]") && !srDlg.open) return;
    e.preventDefault();
    openSearch();
  }
});
document.getElementById("b-search").onclick = openSearch;

// ---------- the focus view, and the knowledge check on a card ----------
function toggleFocusView() { ui.focusView = !ui.focusView; saveUI(); applyDisplay(); if (view.day) renderFlow(false); }
// On screen only: the card it belongs to, the options' order (shuffled, as in the quizzes), your picks and, once
// checked, your answer. The answer itself is recorded by learn(), like a quiz answer.
let cardQ = { id: "", ord: [], sel: [], ans: null };
function cardQHTML(id) {
  const q = CARDQ[id];
  if (!q) return "";
  if (cardQ.id !== id) cardQ = { id, ord: QZ.order(q), sel: [], ans: null };
  const s = S.qs[q.id];
  let b = `<p class="cq-q txt">${q.q}</p>`;
  if (cardQ.ans) {
    const ok = QZ.isRight(q, cardQ.ans);
    b += `<p class="cq-v ${ok ? "ok" : "bad"}" role="status">${ok ? "✓ Right." : "✕ Not this time. It is in your notebook now and comes back in review."}</p>` +
      fbHTML(q, cardQ.ord, cardQ.ans) + `<div class="cq-a"><button type="button" class="sm" data-cq-again>Answer again</button></div>`;
  } else {
    b += `<div class="qz-opts cq-opts">${cardQ.ord.map((oi, k) => { const on = cardQ.sel.includes(oi); return `<button type="button" class="qz-o${on ? " on" : ""}" data-cq-o="${oi}" aria-pressed="${on}"><span class="qz-l">${LETTERS[k]}</span><span class="qz-t">${q.o[oi]}</span></button>`; }).join("")}</div>` +
      `<div class="cq-a"><button type="button" data-cq-check${cardQ.sel.length === q.a.length ? "" : " disabled"}>Check answer</button>` +
      (s && s.seen ? `<span class="muted">Last time: ${s.last ? "right" : "missed"}.</span>` : "") + `</div>`;
  }
  return box("q", "", "Knowledge check", b, "c-q");
}
function cardQClick(b) {
  const q = CARDQ[cardQ.id], ds = b.dataset;
  if (!q) return;
  if ("cqCheck" in ds) {
    if (cardQ.ans || cardQ.sel.length !== q.a.length) return;
    cardQ.ans = cardQ.sel.slice();
    const ok = QZ.isRight(q, cardQ.ans);
    learn(q, ok);
    const got = award();
    save();
    renderFlow(false);
    const v = cardEl.querySelector(".cq-v");
    if (ok) FX.right(1, v); else FX.wrong(0);
    showGains(got, 500);
    if (v) { v.scrollIntoView({ block: "nearest" }); cardEl.querySelector("[data-cq-again]").focus({ preventScroll: true }); }
    return;
  }
  if ("cqAgain" in ds) cardQ = { id: cardQ.id, ord: QZ.order(q), sel: [], ans: null };
  else if ("cqO" in ds && !cardQ.ans) {
    const oi = +ds.cqO, i = cardQ.sel.indexOf(oi);
    if (i >= 0) cardQ.sel.splice(i, 1);
    else if (q.a.length === 1) cardQ.sel = [oi];
    else if (cardQ.sel.length < q.a.length) cardQ.sel.push(oi);
  }
  renderFlow(false);
  const f = cardEl.querySelector(ds.cqO !== undefined ? `[data-cq-o="${ds.cqO}"]` : "[data-cq-o]");
  if (f) f.focus({ preventScroll: true });
}

function cuesHTML() {
  return `<p class="muted">Exam questions hide the deciding requirement in a phrase. Spot it and half the options fall away.</p>` +
    `<table class="cues"><thead><tr><th>When you read</th><th>It usually points to</th><th>Example</th></tr></thead><tbody>` +
    CUES.map(c => `<tr><td><b>${esc(c[0])}</b></td><td>${esc(c[1])}</td><td class="muted">${esc(c[2])}</td></tr>`).join("") + `</tbody></table>`;
}
shDlg.addEventListener("click", e => {
  const g = e.target.closest(".g");   // a term in the larger diagram: a tap shows its definition
  if (g) { g.classList.toggle("show"); return; }
  const f = e.target.closest("[data-nb]");
  if (f) { nbFilter = f.dataset.nb; renderSheet(); return; }
  if (e.target.closest("[data-nb-export]")) { exportNotebook(); return; }
  const j = e.target.closest("[data-jump]");
  if (j) { shDlg.close(); jumpTo(j.dataset.jump); return; }
  const lg = e.target.closest("[data-la-go]");
  if (lg) { laOn = lg.dataset.laGo; shBody.querySelectorAll(".la.on,.la-nav .on").forEach(x => x.classList.remove("on")); lg.classList.add("on"); const el = document.getElementById("la-" + laOn); if (el) { el.classList.add("on"); el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } return; }
  if (e.target.closest("[data-sh-close]")) shDlg.close();
});
shDlg.addEventListener("close", () => {
  if (shDlg.dataset.kind === "dg" && view.day) renderFlow(false);   // the card shows the part chosen in the larger view
  runPending();
});
let noteT = 0;
document.addEventListener("input", e => {
  const id = e.target.dataset && e.target.dataset.note;
  if (!id || !S.book[id]) return;
  S.book[id].note = e.target.value.slice(0, 300);
  clearTimeout(noteT);
  noteT = setTimeout(() => { noteT = 0; save(); }, 400);
});

// ---------- cost guard: what is still running in your own AWS account ----------
// The owner's own account is billed by the hour for some of what the Build steps create. The list on the overview
// shows what is still there; after 20:00 a reminder comes up every 30 minutes while anything is (or until "keep running tonight").
const NAG_HOUR = 20, COST_SNOOZE = 30 * 60000;
const costRunning = () => S.cost.items.filter(x => !x.gone);
const costName = x => BILL.kinds[x.k][0] + (x.label ? ` “${x.label}”` : "");
// A Build step ticked: what it creates goes on the list; unticked: those come off again (unless already deleted).
function billFor(id, val, d) {
  const ks = BILL.steps[id] || [], out = [];
  for (const k of ks) {
    const key = `${id}:${k}`, i = S.cost.items.findIndex(x => x.id === key);
    if (val && (i < 0 || S.cost.items[i].gone)) {
      if (i >= 0) S.cost.items.splice(i, 1);
      S.cost.items.push({ id: key, k, label: "", day: d.id, at: Date.now(), gone: 0 });
      out.push(BILL.kinds[k][0]);
    } else if (!val && i >= 0 && !S.cost.items[i].gone) S.cost.items.splice(i, 1);
  }
  return out;
}
const sinceText = at => {
  if (!at) return "";
  const d = new Date(at), mins = (Date.now() - at) / 60000, hm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `since ${iso(d) === today() ? hm : `${fmtD(d)} ${hm}`} (${mins < 1 ? "just now" : fmtH(mins)})`;
};
const costAddHTML = dayId => `<div class="cost-add"><select data-cost-k aria-label="What you created">${Object.entries(BILL.kinds).map(([k, v]) => `<option value="${k}">${esc(v[0])}</option>`).join("")}</select>` +
  `<input type="text" maxlength="60" data-cost-l placeholder="Its name, if you like" aria-label="Its name"><button type="button" data-cost-add="${esc(dayId)}">Add</button></div>`;
const costItemHTML = (x, undo) => `<li class="${x.gone ? "gone" : ""}"><span class="ci-n"><b>${esc(costName(x))}</b>${x.gone ? ` <span class="pill ok">deleted</span>` : ` <span class="muted">${sinceText(x.at)}</span>`}</span>` +
  (BILL.kinds[x.k][1] ? `<span class="ci-d muted">${esc(BILL.kinds[x.k][1])}</span>` : "") +
  (x.gone ? (undo ? `<button type="button" class="link sm" data-cost-back="${esc(x.id)}">Undo</button>` : "") : `<button type="button" class="sm" data-cost-gone="${esc(x.id)}">✓ Deleted</button>`) + `</li>`;
function renderRunning() {
  const el = document.getElementById("running"), run = costRunning();
  el.hidden = !run.length;
  if (!run.length) { el.innerHTML = ""; return; }
  el.innerHTML = `<h3>Still running in your AWS account <span class="muted">${plural(run.length, "thing")}</span></h3>` +
    `<p class="muted">Delete them when you're done with them: they cost money while they exist. Mark each one when it's gone.</p>` +
    `<ul class="cost-l">${run.map(x => costItemHTML(x)).join("")}</ul>` +
    `<div class="row"><a class="btn" href="${esc(linkFor("own"))}" target="_blank" rel="noopener">Open AWS ↗</a><details class="cost-more"><summary class="btn">+ Something else</summary>${costAddHTML("")}</details></div>`;
}
// On a Build card: what this day put in your account, and a way to add what the steps don't know about.
function costBoxHTML(d) {
  const mine = S.cost.items.filter(x => x.day === d.id);
  return box("cost", "", "Billable things from this day",
    (mine.length ? `<ul class="cost-l">${mine.map(x => costItemHTML(x, true)).join("")}</ul>` : `<p class="muted">Nothing yet. Steps that create something billable add it here and to the overview when you complete them.</p>`) +
    `<p class="muted cost-h">Made something else that bills (a load balancer, a database…)? Add it, so the evening check knows.</p>${costAddHTML(d.id)}`, "c-cost");
}
function costChanged() {
  save(); renderRunning();
  if (view.day) renderFlow(false);
  if (clDlg.open) renderCleanupRun();
  if (costDlg.open) renderCostNag();
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-cost-gone]");
  if (g) {
    const x = S.cost.items.find(y => y.id === g.dataset.costGone);
    if (!x) return;
    x.gone = Date.now();
    FX.small(g);
    costChanged();
    if (!costRunning().length) FX.toast("<b>All clean</b>: nothing left running up a bill");
    return;
  }
  const b = e.target.closest("[data-cost-back]");
  if (b) { const x = S.cost.items.find(y => y.id === b.dataset.costBack); if (x) { x.gone = 0; costChanged(); } return; }
  const a = e.target.closest("[data-cost-add]");
  if (a) {
    const wrap = a.closest(".cost-add"), k = wrap.querySelector("[data-cost-k]").value, label = wrap.querySelector("[data-cost-l]").value.trim().slice(0, 60);
    if (!BILL.kinds[k]) return;
    S.cost.items.push({ id: "q" + Date.now().toString(36), k, label, day: a.dataset.costAdd, at: Date.now(), gone: 0 });
    if (S.cost.items.length > 60) S.cost.items.splice(S.cost.items.findIndex(x => x.gone), 1);
    FX.sound("pop");
    costChanged();
  }
});
// The evening reminder: a pop-up of its own (after any other dialog, never over the mock exam or the drill),
// plus a Windows notification when this window isn't the one in use.
const costDlg = document.getElementById("costnag");
const costDue = () => costRunning().length > 0 && new Date().getHours() >= NAG_HOUR && S.cost.night !== today() && Date.now() >= S.cost.snooze;
function renderCostNag() {
  const run = costRunning();
  document.getElementById("cn-body").innerHTML = run.length
    ? `<p>It's evening, and ${run.length === 1 ? "this is" : "these are"} still in your AWS account:</p><ul class="cost-l">${run.map(x => costItemHTML(x)).join("")}</ul>` +
      `<p class="muted">Delete ${run.length === 1 ? "it" : "them"} in the console, then mark ${run.length === 1 ? "it" : "each one"} here. Keeping something for tomorrow's step? Say so and the reminder stops for tonight.</p>`
    : `<p class="cl-ok">All clean ✓. Nothing left running up a bill.</p>`;
  document.getElementById("cn-open").href = linkFor("own");
  costDlg.querySelector('[data-cn="night"]').hidden = costDlg.querySelector('[data-cn="later"]').hidden = !run.length;
}
function openCostNag() {
  renderCostNag();
  costDlg.showModal();
  costDlg.querySelector("h2").focus({ preventScroll: true });
  FX.sound("nag");
  const run = costRunning();
  notify("Still running in your AWS account", run.map(costName).join(", "));
}
costDlg.addEventListener("click", e => {
  const b = e.target.closest("[data-cn]");
  if (!b) return;
  if (b.dataset.cn === "night") S.cost.night = today();
  else S.cost.snooze = Date.now() + COST_SNOOZE;   // "In 30 minutes", and Done with something still running
  save();
  costDlg.close();
});
costDlg.addEventListener("close", () => {
  if (costRunning().length && S.cost.night !== today() && S.cost.snooze <= Date.now()) { S.cost.snooze = Date.now() + COST_SNOOZE; save(); }   // Esc: ask again in 30 minutes
  runPending();
});
setInterval(() => {
  if (pulling || Date.now() - lastTick > 3000) return;   // just woke up: the list may have changed on another device
  if (costDlg.open) { if (!costRunning().length && !costDlg.querySelector(".cl-ok")) renderCostNag(); else if (!costDue() && costRunning().length) costDlg.close(); return; }   // answered in another tab
  if (costDue() && !document.querySelector("dialog[open]") && !inTimed()) openCostNag();
}, 15000);

// ---------- cleanup dialog ----------
const clDlg = document.getElementById("cleanup");
function openCleanup(dayId) {
  const d = DAYS.find(x => x.id === dayId);
  document.getElementById("cl-day").textContent = d ? `· Day ${d.day}` : "";
  document.getElementById("cl-open").href = linkFor("own");
  document.getElementById("cl-ok").hidden = true;
  renderCleanupRun();
  const ul = document.getElementById("cl-list");
  ul.innerHTML = CLEANUP.map(([t, n], i) => `<li><label><input type="checkbox" data-cl="${i}"><span>${t}${n ? `<span class="n">${n}</span>` : ""}</span></label></li>`).join("");
  if (!clDlg.open) clDlg.showModal();
}
clDlg.addEventListener("change", e => {
  if (!e.target.matches("[data-cl]")) return;
  const all = [...clDlg.querySelectorAll("[data-cl]")];
  if (e.target.checked) {
    if (all.every(c => c.checked)) { document.getElementById("cl-ok").hidden = false; FX.small(e.target); }
    else FX.sound("pop");
  } else document.getElementById("cl-ok").hidden = true;
});
clDlg.addEventListener("close", runPending);
function renderCleanupRun() {
  const run = costRunning(), el = document.getElementById("cl-run");
  el.hidden = !run.length;
  el.innerHTML = run.length ? `<h3>Still running, from your list</h3><ul class="cost-l">${run.map(x => costItemHTML(x)).join("")}</ul>` : "";
}

// ---------- events: day flow ----------
flowEl.addEventListener("click", e => {
  if (e.target.closest("[data-focus-view]")) { toggleFocusView(); return; }
  if (e.target.closest("[data-search]")) { openSearch(); return; }
  const cq = e.target.closest("[data-cq-o],[data-cq-check],[data-cq-again]");
  if (cq) { if (!cq.disabled) cardQClick(cq); return; }
  const g = e.target.closest(".g");
  if (g) { e.preventDefault(); g.classList.toggle("show"); return; }
  if (e.target.closest("[data-home]")) { setView("", "", true); return; }
  const at = e.target.closest("[data-at]");
  if (at) { if (!at.disabled && at.dataset.at) move(at.dataset.at); return; }
  const c = e.target.closest("[data-complete]");
  // A double click must not also complete the card that slides in under the pointer.
  if (c) { if (Date.now() - movedAt > 350) complete(c.dataset.complete, c); return; }
  const u = e.target.closest("[data-undo]");
  if (u) { setTick(u.dataset.undo, false); return; }
  const cl = e.target.closest("[data-cleanup]");
  if (cl) { openCleanup(cl.dataset.cleanup); return; }
  const sq = e.target.closest("[data-step-quiz]");
  if (sq) { FX.unlock(); startRun("step", sq.dataset.stepQuiz); return; }
  const fl = e.target.closest("[data-flip]");
  if (fl) { flip(fl.dataset.flip, document.getElementById("ca-" + fl.dataset.flip).hidden); return; }
  const cf = e.target.closest("[data-conf]");
  if (cf) {
    const id = cf.dataset.cid;
    S.conf[id] = cf.dataset.conf;
    if (cf.dataset.conf === "ok") FX.sparkle(cf);
    if (!done(id)) complete(id, cf);
    else { flip(id, false); save(); refresh(); }
  }
});
// <details> toggles don't bubble: catch them on the way down (card and panels) and remember the choice.
bodyEl.addEventListener("toggle", e => {
  const sec = e.target.dataset && e.target.dataset.sec;
  if (!sec) return;
  ui[sec] = e.target.open;
  try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (err) {}
}, true);
// ← and → move between cards, Enter presses the card's main action (unless a control has the focus).
document.addEventListener("keydown", e => {
  if (!view.day || document.querySelector("dialog[open]") || e.ctrlKey || e.metaKey || e.altKey || e.target.matches("input,textarea,select")) return;
  const nav = document.getElementById("fl-nav");
  let b = null;
  if ((e.key === "f" || e.key === "F") && !e.repeat) { e.preventDefault(); toggleFocusView(); return; }
  if (e.key === "ArrowLeft") b = nav.querySelector("[data-back]");
  else if (e.key === "ArrowRight") b = nav.querySelector("[data-next]");
  else if (e.key === "Enter" && !e.repeat && !e.target.closest("button,a,summary,[role=button]")) b = nav.querySelector("[data-main]");
  if (b && !b.disabled) { e.preventDefault(); b.click(); }
});
// Day notes and step notes save as you type.
const noteTimers = {};
document.addEventListener("input", e => {
  const ds = e.target.dataset || {}, id = ds.notes || ds.inote;
  if (!id) return;
  if (ds.notes) S.notes[id] = e.target.value; else S.inotes[id] = e.target.value.slice(0, NOTE_MAX);
  clearTimeout(noteTimers[id]);
  noteTimers[id] = setTimeout(() => {
    noteTimers[id] = 0;
    save();
    const s = document.querySelector(`[data-saved="${id}"]`);
    if (s) { s.classList.add("show"); setTimeout(() => s.classList.remove("show"), 1200); }
  }, 400);
});
document.addEventListener("click", e => {
  if (!e.target.closest(".g")) document.querySelectorAll(".g.show").forEach(x => x.classList.remove("show"));
}, true);

document.getElementById("next").addEventListener("click", e => {
  const w = e.target.closest("[data-warm]");
  if (!w) return;
  if (w.dataset.warm === "skip") { S.warm[today()] = "skip"; save(); refresh(); }
  else { FX.unlock(); startRun("warm"); }
});
// reasons for a miss, the trends' range and table, "Change" on the daily goal, practice on the overview's "study this next"
document.addEventListener("click", e => {
  const wy = e.target.closest("[data-why]");
  if (wy) {
    const b = S.book[wy.dataset.wq];
    if (!b) return;
    b.why = b.why === wy.dataset.why ? "" : wy.dataset.why;
    save();
    document.querySelectorAll(`[data-wq="${CSS.escape(wy.dataset.wq)}"]`).forEach(x => x.setAttribute("aria-pressed", x.dataset.why === b.why));
    renderReady();
    return;
  }
  const tr = e.target.closest("[data-trend],[data-trend-table]");
  if (tr) { if (tr.dataset.trend) ui.trend = +tr.dataset.trend; else ui.trendTable = !ui.trendTable; saveUI(); renderTrends(); return; }
  if (e.target.closest("[data-goal-set]")) { document.getElementById("b-set").click(); setTimeout(() => document.getElementById("s-goal").focus(), 0); return; }
  const sq = e.target.closest("#home [data-step-quiz]");
  if (sq) { FX.unlock(); startRun("step", sq.dataset.stepQuiz); return; }
  const jp = e.target.closest("#home [data-jump]");
  if (jp) jumpTo(jp.dataset.jump);
});
const trEl = document.getElementById("trends");
trEl.addEventListener("pointermove", e => { const h = e.target.closest(".hit"); if (h) trendShow(h.closest(".tr-fig"), +h.dataset.i); });
trEl.addEventListener("click", e => { const h = e.target.closest(".hit"); if (h) trendShow(h.closest(".tr-fig"), +h.dataset.i); });   // a tap on a touch screen
trEl.addEventListener("pointerout", e => { const f = e.target.closest(".tr-fig"); if (f && !f.contains(e.relatedTarget) && document.activeElement !== f) trendHide(f); });
trEl.addEventListener("focusin", e => { const f = e.target.closest(".tr-fig"); if (f) trendShow(f, f.dataset.i ? +f.dataset.i : trendCache.length - 1); });
trEl.addEventListener("focusout", e => { const f = e.target.closest(".tr-fig"); if (f) trendHide(f); });
trEl.addEventListener("keydown", e => {
  const f = e.target.closest(".tr-fig");
  if (!f || (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End")) return;
  e.preventDefault();
  const i = +(f.dataset.i ?? trendCache.length - 1), n = trendCache.length - 1;
  trendShow(f, e.key === "Home" ? 0 : e.key === "End" ? n : Math.max(0, Math.min(n, i + (e.key === "ArrowRight" ? 1 : -1))));
});
// a look-alike table (from a miss, a card's panel, weak spots, the overview), and a part of a course diagram
document.addEventListener("click", e => {
  const l = e.target.closest("[data-look]");
  if (l) { openLook(l.dataset.look); return; }
  const p = e.target.closest(".dg-box [data-part],.dg-box [data-dg-part]");
  if (p) { dgPick(p.closest(".dg-box"), p.dataset.part || p.dataset.dgPart); return; }
  const big = e.target.closest("[data-dg-big]");
  if (big) openDiagram(big.dataset.dgBig);
});
document.addEventListener("keydown", e => {
  const p = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest(".dg-box [data-part]");
  if (p) { e.preventDefault(); dgPick(p.closest(".dg-box"), p.dataset.part); }
});
// buttons that can appear anywhere: overview, cards, practice panel, slip banner, dialogs
document.addEventListener("click", e => {
  const t = e.target.closest("[data-quiz-start],[data-review],[data-mock],[data-drill],[data-drill-mode],[data-sheet],[data-slip]");
  if (!t || t.disabled) return;
  FX.unlock();
  if (t.dataset.quizStart) startRun("day", t.dataset.quizStart);
  else if ("review" in t.dataset) startRun("review");
  else if ("mock" in t.dataset) { if (mockOpen() || (S.run && S.run.kind === "mock")) promptMock(); }
  else if ("drill" in t.dataset) startDrill();
  else if (t.dataset.drillMode) startDrill(t.dataset.drillMode);
  else if (t.dataset.sheet) openSheet(t.dataset.sheet);
  else if (t.dataset.slip) applySlip(t.dataset.slip);
});

// ---------- header buttons ----------
const bFx = document.getElementById("b-fx"), bSnd = document.getElementById("b-snd");
function syncToggles() {
  bFx.textContent = `Effects ${S.settings.fx ? "on" : "off"}`;
  bFx.setAttribute("aria-pressed", S.settings.fx);
  bSnd.textContent = `Sound ${S.settings.sound ? "on" : "off"}`;
  bSnd.setAttribute("aria-pressed", S.settings.sound);
  document.documentElement.dataset.dmMotion = motionLevel();
  FX.set({ fx: S.settings.fx, sound: S.settings.sound });
}
bFx.onclick = () => { S.settings.fx = !S.settings.fx; save(); syncToggles(); if (S.settings.fx) FX.tick(bFx); };
bSnd.onclick = () => { S.settings.sound = !S.settings.sound; save(); syncToggles(); if (S.settings.sound) { FX.unlock(); FX.sound("pop"); } };

// ---------- settings ----------
const setDlg = document.getElementById("settings");
function renderSettingsInfo() {
  const sl = document.getElementById("s-slips");
  const moved = S.slips.reduce((a, s) => a + s.n, 0);
  sl.hidden = !moved;
  document.getElementById("s-slips-t").textContent = moved ? `The schedule has been moved ${plural(moved, "day")} later in total. Day ${LAST} is ${fmtD(dayDate(LAST))}.` : "";
  document.getElementById("s-sync").textContent = net && (sync.on || sync.rev > 0) ? NET[net][1]
    : sync.on ? `Progress is saved on the server (revision ${sync.rev}) and kept in this browser too. Your other devices pick up changes within half a minute, or as soon as you go back to them.`
    : "Progress lives in this browser only: no server answers at this address. Served by the app's Go server (Docker), it is saved there too and shared by all your devices.";
}
document.getElementById("b-set").onclick = () => {
  document.getElementById("s-start").value = S.settings.start;
  document.getElementById("s-exam").value = S.settings.exam || "";
  document.getElementById("s-portal").value = S.settings.portal;
  document.getElementById("s-fx").checked = S.settings.fx;
  document.getElementById("s-snd").checked = S.settings.sound;
  document.getElementById("s-gif").checked = S.settings.gif;
  document.getElementById("s-goal").value = String(S.settings.goal);
  document.getElementById("s-size").value = ui.size === "l" || ui.size === "xl" ? ui.size : "";
  document.getElementById("s-motion").value = ui.motion === "calm" || ui.motion === "off" ? ui.motion : "";
  renderSettingsInfo();
  setDlg.returnValue = "";
  setDlg.showModal();
};
setDlg.addEventListener("close", () => {
  runPending();
  if (setDlg.returnValue !== "save") return;
  const start = document.getElementById("s-start").value;
  if (start) S.settings.start = start;
  S.settings.exam = document.getElementById("s-exam").value;
  const portal = document.getElementById("s-portal").value.trim();
  S.settings.portal = /^https?:\/\//i.test(portal) ? portal : "";
  S.settings.fx = document.getElementById("s-fx").checked;
  S.settings.sound = document.getElementById("s-snd").checked;
  S.settings.gif = document.getElementById("s-gif").checked;
  const goal = +document.getElementById("s-goal").value;
  if (GOALS.includes(goal)) S.settings.goal = goal;
  delete ui.theme; ui.size = document.getElementById("s-size").value;
  ui.motion = document.getElementById("s-motion").value;
  saveUI(); applyDisplay();
  save(); rebuild();
});
document.getElementById("s-unslip").onclick = () => { S.slips = []; S.slipSkip = ""; save(); refresh(); renderSettingsInfo(); };
document.getElementById("s-export").onclick = () => download(JSON.stringify(S, null, 2), `saa-plan-progress-${today()}.json`, "application/json");
const fileIn = document.getElementById("s-file");
document.getElementById("s-import").onclick = () => fileIn.click();
fileIn.onchange = () => {
  const f = fileIn.files[0];
  if (!f) return;
  f.text().then(t => {
    const next = JSON.parse(t);
    if (!isObj(next) || !isObj(next.settings)) throw new Error("not an export");
    S = parseState(next);
    S.timer = Object.assign(clone(DEF.timer), { min: S.timer.min });   // an export carries a timer from another time: start it idle
    DAYS.forEach(markDayDone);
    award();
    save(); setDlg.close("x"); rebuild(); restoreScores();
    FX.banner("Progress imported", "", "info");
  }).catch(() => alert("That file isn't a valid progress export. Nothing was changed."));
  fileIn.value = "";
};
document.getElementById("s-reset").onclick = () => {
  if (!confirm("Clear all ticks, notes, scores and quiz history? (Settings are kept.)")) return;
  const keep = S.settings;
  S = clone(DEF); S.settings = keep;
  lvShown = 0;
  save(); setDlg.close("x"); rebuild(); restoreScores();
};
function restoreScores() { document.querySelectorAll("[data-score]").forEach(inp => { inp.value = S.scores[inp.dataset.score] ?? ""; }); }

// ---------- focus timer ----------
// A focus block counts down from 50 minutes. When it ends, a pop-up offers a break. The break has no set length:
// it counts up, and once it passes 10 minutes it reminds you every minute to start the next focus block, with
// the pop-up when it isn't up already and with the sound alone when it is, so reminders never pile up.
// Several tabs: the "done" prompt (timer.ask) shows in each and closes in each once answered; a reminder's
// sound plays once a minute for all of them (NAG_KEY).
const tm = document.getElementById("timer");
const brkDlg = document.getElementById("brk"), brkBody = document.getElementById("brk-body");
const NAG_KEY = KEY + "-nag";   // "<break start>:<minute>" of the last reminder sound, shared by this browser's tabs
let nagKey = "";                // the same, for the pop-up of this tab
let brkAt = 0, brkGains = [];   // when the pop-up opened (a click right after is ignored); badges to show once it closes
const tmLeft = () => S.timer.running ? Math.min(FOCUS, Math.max(0, Math.round((S.timer.endAt - Date.now()) / 1000))) : S.timer.left;
const restUp = () => Math.min(86400, Math.max(0, Math.round(S.timer.up + (S.timer.running ? (Date.now() - S.timer.at) / 1000 : 0))));
const mmss = s => (s >= 3600 ? `${Math.floor(s / 3600)}:` : "") + `${String(Math.floor(s / 60) % (s >= 3600 ? 60 : 1e9)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const workDay = () => dayOf(view.day) || (nextStep() || {}).d;
// The mock exam and the drill run against a clock: the timer's pop-ups wait until they are closed or over.
const inTimed = () => qzDlg.open && (drill ? !drill.done : !intro && !!S.run && S.run.kind === "mock" && !S.run.done);
let overHeld = false;   // a "Break is over" pop-up is waiting for the mock exam or the drill
// Every change to the timer carries its own time, so a merge keeps the timer that changed last (not whichever copy saved last).
function tmSave() { S.timer.ts = Date.now(); save(); tmRender(); }
// Credit focused time to the day the block was started on (or, for a block from before that was kept, the day you're on).
// Every open device may see a block end, and the max-per-day merge counts it once in the log; the per-device counts for the
// trends add up across devices, so only the device the block runs on adds it there.
function logFocus() {
  const t = S.timer;
  if (t.mode !== "focus" || !t.running) return;
  const sec = (t.from > 0 ? t.from : FOCUS) - tmLeft();
  const d = dayOf(t.day) || workDay();
  if (sec < 30 || !d) return;
  S.log[d.id] = (S.log[d.id] || 0) + sec / 60;
  if (!holds()) return;
  const dl = dailyNow();
  dl.f = Math.min(24 * 60, dl.f + sec / 60);
}
// The device the block runs on: the one that started it or was used last while it ran (a block from before has none).
const holds = () => !S.timer.dev || S.timer.dev === DEV;
function tmRender() {
  const t = S.timer, rest = t.mode === "rest", s = rest ? restUp() : tmLeft(), over = rest && t.running && s >= REST_NAG, away = !rest && t.running && t.away > 0;
  tm.classList.toggle("running", t.running);
  tm.classList.toggle("break", rest);
  tm.classList.toggle("over", over);
  tm.classList.toggle("away", away);
  // the strip fills as the block runs; a break fills towards its 10 minutes, then turns red
  tm.querySelector(".tm-fill").style.width = `${Math.round((t.ask ? 1 : rest ? Math.min(1, s / REST_NAG) : 1 - s / FOCUS) * 1000) / 10}%`;
  tm.querySelector(".tm-mode").textContent = away ? "Away" : !rest ? (t.running || s === FOCUS ? "Focus" : "Focus, paused")
    : over ? "Break is over" : !t.running && s ? "Break, paused" : t.ask ? "Focus block done" : "Break";
  tm.querySelector(".tm-time").textContent = mmss(s);
  const go = tm.querySelector('[data-tm="toggle"]'), what = t.running ? "Pause" : rest ? (s ? "Resume the break" : "Start the break") : s === FOCUS ? "Start a 50-minute focus block" : "Resume focus";
  go.textContent = t.running ? "■" : "▶";
  go.title = what; go.setAttribute("aria-label", what);
  tm.querySelector('[data-tm="switch"]').textContent = rest ? "Focus now" : "Break now";
  const day = dayOf(t.day) || workDay();
  tm.querySelector(".tm-info").textContent = [day && (S.log[day.id] || 0) >= 1 ? `Focus on Day ${day.day} so far: ${fmtH(S.log[day.id])}.` : "Starts by itself when you start a day or complete a step.", permText()].filter(Boolean).join(" ");
  tm.querySelector('[data-tm="perm"]').hidden = !permAsk();
  document.title = t.running ? `${mmss(s)} ${!rest ? "Focus" : over ? "Break over" : "Break"} · SAA-C03 Plan` : t.ask ? "Focus block done · SAA-C03 Plan" : "SAA-C03 Plan";
  const up = document.getElementById("brk-up");
  if (up) up.textContent = mmss(restUp());
}
function tmSet(mode) { Object.assign(S.timer, { mode, running: false, left: FOCUS, up: 0, at: 0, ask: false }); tmSave(); }
const startFocus = () => { logFocus(); Object.assign(S.timer, { mode: "focus", running: true, left: FOCUS, from: FOCUS, endAt: Date.now() + FOCUS * 1000, up: 0, at: 0, ask: false, day: (workDay() || {}).id || "", dev: DEV }); };
const startRest = () => { logFocus(); Object.assign(S.timer, { mode: "rest", running: true, up: 0, at: Date.now(), ask: false, dev: DEV }); };
const pauseRest = () => { Object.assign(S.timer, { up: restUp(), running: false }); };
tm.addEventListener("click", e => {
  const b = e.target.closest("[data-tm]");
  if (!b) return;
  const a = b.dataset.tm, t = S.timer, rest = t.mode === "rest";
  if (a === "menu") { tmMenu(); return; }
  if (a === "perm") { askPerms(); return; }
  if (a === "toggle") {
    if (t.running) { if (rest) pauseRest(); else { logFocus(); t.left = tmLeft(); t.running = false; } }
    else {
      FX.unlock();
      if (rest) { t.at = Date.now(); t.ask = false; }
      else { if (t.left <= 0) t.left = FOCUS; t.from = t.left; t.endAt = Date.now() + t.left * 1000; t.day = (workDay() || {}).id || ""; }   // paused at 00:00: a new block
      t.running = true; t.dev = DEV;
    }
  } else if (a === "reset" || a === "switch") { logFocus(); tmSet(a === "reset" ? t.mode : rest ? "focus" : "rest"); tmMenu(false); refresh(); showGains(award()); return; }
  tmSave(); refresh(); showGains(award());
});
function tmMenu(open) {
  const pop = document.getElementById("tm-pop"), on = open === undefined ? pop.hidden : open;
  pop.hidden = !on;
  tm.querySelector('[data-tm="menu"]').setAttribute("aria-expanded", String(on));
}
document.addEventListener("click", e => { if (!e.target.closest("#timer")) tmMenu(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape") tmMenu(false); });
// Starting a day or completing a step starts a focus block, unless one is running or you're on a break (a paused one resumes).
function autoFocus() {
  const t = S.timer;
  if (t.running || (t.mode === "rest" && (t.up > 0 || t.ask))) return;   // a block runs already, or you are on a break (paused too)
  FX.unlock();
  if (t.mode === "rest" || t.left <= 0 || t.left > FOCUS) t.left = FOCUS;
  Object.assign(t, { mode: "focus", from: t.left, endAt: Date.now() + t.left * 1000, running: true, day: (workDay() || {}).id || "", dev: DEV });
  tmSave();
  FX.toast(`<b>Focus on</b>, ${Math.round(t.left / 60)} minutes`);
}
document.addEventListener("click", e => { if (e.target.closest("[data-start-day]")) autoFocus(); }, true);

// Away: two monitors with a full-screen window each keep the page "visible" while you work in the other one, so the
// page can't tell from that. It uses the PC's own idle state (Edge's idle detection, once you allow it: no mouse or
// keyboard for 5 minutes, when your screen turns off, or the screen locked) and a jump in its clock (the PC slept; on a
// phone or tablet, the screen was off or the browser in the background). Only the device the block runs on can say so
// (holds(): the PC's idle state means nothing while you read on the tablet), and the first touch or key on another
// device takes the block over. While you're away the block can't end; when you're back, a pop-up asks whether that time counts.
const AWAY = 5 * 60000;
let idleDet = null, idlePerm = "", lastTick = Date.now(), lastInput = 0;
function goneSince(at) {
  const t = S.timer;
  if (t.mode !== "focus" || !t.running || t.away || !holds()) return;
  t.away = Math.max(at, t.endAt - FOCUS * 1000);
  tmSave();
}
for (const ev of ["pointerdown", "keydown", "wheel"]) addEventListener(ev, () => {
  lastInput = Date.now();
  const t = S.timer;
  // not on a copy that may be behind; and not with a newer time stamp, so it never outweighs a change made elsewhere
  if (t.mode === "focus" && t.running && !t.away && !holds() && !pulling) { t.dev = DEV; save(); }
}, { capture: true, passive: true });
// Another device marked you away, but this one was in use since that moment: you never left.
function stillHere() {
  const t = S.timer;
  if (t.away && !holds() && lastInput >= t.away) { t.away = 0; t.dev = DEV; tmSave(); }
}
async function startIdle() {
  if (idleDet || !("IdleDetector" in window)) return;
  try {
    const det = new IdleDetector();
    det.addEventListener("change", () => { if (det.userState === "idle" || det.screenState === "locked") goneSince(det.screenState === "locked" ? Date.now() : Date.now() - AWAY); });
    await det.start({ threshold: AWAY });
    idleDet = det;
    tmRender();
  } catch (e) {}
}
const here = () => !idleDet || (idleDet.userState === "active" && idleDet.screenState !== "locked");
if ("IdleDetector" in window && navigator.permissions) navigator.permissions.query({ name: "idle-detection" }).then(p => { idlePerm = p.state; if (p.state === "granted") startIdle(); }).catch(() => {});
// Desktop notifications, so a prompt on one monitor is seen from the other. A phone or tablet stops the page as soon
// as it is out of view, so nothing could notify from there: the button isn't offered on touch screens.
const notifyOK = () => "Notification" in window && Notification.permission === "granted";
function notify(title, body) {
  if (!notifyOK() || document.hasFocus()) return;
  try { const n = new Notification(title, { body, tag: "saa-timer", renotify: true }); n.onclick = () => { focus(); n.close(); }; } catch (e) {}   // Android: only through a service worker
}
const touchOnly = matchMedia("(hover: none) and (pointer: coarse)");
const permAsk = () => !touchOnly.matches && (("Notification" in window && Notification.permission === "default") || ("IdleDetector" in window && !idleDet && idlePerm !== "denied"));
const permText = () => { const on = [notifyOK() && "notifications", idleDet && "away detection"].filter(Boolean); return on.length ? `On: ${on.join(" and ")}.` : ""; };
async function askPerms() {
  try { if ("IdleDetector" in window && !idleDet) { idlePerm = await IdleDetector.requestPermission(); if (idlePerm === "granted") await startIdle(); } } catch (e) {}
  try { if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission(); } catch (e) {}
  tmRender();
}
// The pop-up: "done" when a focus block has just ended, "over" when the break has run past 10 minutes.
// It is a modal of its own, so it also comes up over an open quiz (and the quiz keys wait under it). The keyboard
// goes to its heading, not a button, so a key typed for something else (a note, a quiz answer) doesn't answer it.
function brkOpen(kind) {
  brkDlg.dataset.kind = kind;
  brkBody.innerHTML = kind === "away"
    ? `<h2 id="brk-t" tabindex="-1">Welcome back</h2><p>You were away for <b>${Math.max(1, Math.round((Date.now() - S.timer.away) / 60000))} minutes</b> during this focus block (no input, the screen off or the device asleep). Count that time as focus?</p>` +
      `<p class="muted">Not counting it picks the block up where you left it.</p>` +
      `<div class="row end"><button type="button" data-brk="skip-away">Don't count it</button><button type="button" class="primary" data-brk="keep-away">Count it</button></div>`
    : kind === "done"
    ? `<h2 id="brk-t" tabindex="-1">Focus block done</h2><p>50 minutes of focus. Take a break now: it has no set length. The clock counts up, and after ${REST_NAG / 60} minutes it reminds you every minute to come back.</p>` +
      `<div class="row end"><button type="button" data-brk="focus">Skip the break, focus again</button><button type="button" class="primary" data-brk="rest">Start break</button></div>`
    : `<h2 id="brk-t" tabindex="-1">Break is over</h2><p>You have been on a break for <b id="brk-up">${mmss(restUp())}</b>. Time for the next 50 minutes of focus.</p>` +
      `<p class="muted">Away for longer? Pause the break and the reminders stop until you resume it.</p>` +
      `<div class="row end"><button type="button" data-brk="pause">Pause the break</button><button type="button" data-brk="later">Not yet</button><button type="button" class="primary" data-brk="focus">Start focus</button></div>`;
  if (!brkDlg.open) brkDlg.showModal();
  brkAt = Date.now();
  if (kind === "done") notify("Focus block done", "Time for a break. It has no set length.");
  document.getElementById("brk-t").focus({ preventScroll: true });
}
brkDlg.addEventListener("click", e => {
  const b = e.target.closest("[data-brk]");
  if (!b || Date.now() - brkAt < 400) return;   // a click meant for what was under the pointer when it opened
  const a = b.dataset.brk;
  brkDlg.close();
  if (a === "later") return;
  FX.unlock();
  const t = S.timer;
  t.dev = DEV;   // answered here: the block runs on this device now
  if (a === "keep-away") t.away = 0;
  else if (a === "skip-away") { const left = Math.max(0, t.endAt - t.away); Object.assign(t, { endAt: Date.now() + left, away: 0 }); }   // the block resumes where you left it
  else if (a === "rest") startRest(); else if (a === "pause") pauseRest(); else startFocus();
  tmSave(); refresh();
  showGains(award());
  FX.sound("pop");
});
brkDlg.addEventListener("close", () => {
  // Esc on "done" answers it too: no break for now (the timer offers Start break)
  if (brkDlg.dataset.kind === "done" && S.timer.ask) { S.timer.ask = false; tmSave(); }
  if (brkDlg.dataset.kind === "away" && S.timer.away) { S.timer.away = 0; tmSave(); }   // Esc on "welcome back": the time counts
  if (brkGains.length) showGains(brkGains.splice(0), 300);
  runPending();
});
// The 1-second ticker of the focus timer and the mock exam's clock. It never acts on a copy that may be behind: not while
// news from the server is on its way, and after a gap (the device slept, a phone's browser was in the background) it asks
// for news first, so a phone that wakes up can't end, or mark away, a block that another device already moved on.
setInterval(() => {
  if (pulling) return;   // lastTick stays: a jump is still seen once the news is in
  const was = lastTick;
  lastTick = Date.now();
  if (lastTick - was > 15000 && sync.on && lastTick - pulledAt > 3000) pull().then(() => { timerTick(was); mockTick(); });
  else { timerTick(was); mockTick(); }
}, 1000);
function timerTick(was) {
  const t = S.timer;
  if (Date.now() - was > AWAY) goneSince(was);   // the clock jumped on the device the block runs on: it slept, or its screen was off
  if (t.away && here() && !brkDlg.open && !inTimed()) brkOpen("away");
  if (t.running && t.mode === "focus" && !t.away && tmLeft() <= 0) {
    logFocus();
    tmSet("rest");
    t.ask = true;   // the prompt waits for an answer, in every tab and after a reload
    tmSave();
    refresh();
    FX.sound("timer");
    FX.sparkle(tm);   // a full focus block is something finished too
    brkGains.push(...award());
  }
  if (t.ask && !brkDlg.open && !inTimed()) brkOpen("done");
  if (t.running && t.mode === "rest" && restUp() >= REST_NAG) {
    const key = `${t.at}:${Math.floor((restUp() - REST_NAG) / 60)}`;   // a new or resumed break starts its own minutes
    if (key !== nagKey) {
      nagKey = key;
      let heard = "";
      try { heard = localStorage.getItem(NAG_KEY) || ""; localStorage.setItem(NAG_KEY, key); } catch (e) {}
      if (heard !== key) { FX.sound("nag"); notify("Break is over", `On a break for ${mmss(restUp())}. Time for the next focus block.`); }   // another tab already knocked this minute
      if (!brkDlg.open) { if (inTimed()) overHeld = true; else brkOpen("over"); }
    }
    if (overHeld && !brkDlg.open && !inTimed()) { overHeld = false; brkOpen("over"); }
  } else overHeld = false;
  // the timer moved on elsewhere (another tab, the server): a pop-up that no longer fits goes away
  const k = brkDlg.dataset.kind;
  if (brkDlg.open && (k === "over" ? !(t.mode === "rest" && t.running && restUp() >= REST_NAG) : k === "away" ? !t.away : !t.ask)) brkDlg.close();
  if (t.running) tmRender();
}
// Browsers keep sound off after a reload until the first click, tap or key: take the first one anywhere, so reminders can
// be heard. A touch only counts once the finger lifts (pointerup), a mouse and a key at once.
for (const ev of ["pointerdown", "pointerup", "keydown"]) addEventListener(ev, () => FX.unlock(), { capture: true, passive: true });

// ---------- server sync (only when served by the Go backend; otherwise browser-only) ----------
// localStorage stays the working copy. The server keeps one revisioned document. If this copy is
// unchanged since the last sync, a newer server copy simply replaces it; if both changed (two
// devices, or offline edits), the two are merged so no tick, answer or note is lost.
let pushT = 0;
function syncLater() {
  sync.dirty = true;
  syncMeta();
  if (!sync.on) return;
  clearTimeout(pushT);
  pushT = setTimeout(push, 800);
}
// Combine two copies edited in parallel: every tick and answer, the best quiz results, the newer copy's settings.
function mergeDocs(local, remote) {
  const [older, newer] = local.savedAt > remote.savedAt ? [remote, local] : [local, remote];
  const m = clone(newer);
  const seenIn = (st, id) => (st.qs[id] ? st.qs[id].seen : 0);
  for (const k in older.ticks) m.ticks[k] = true;
  for (const f of ["notes", "inotes", "scores", "conf", "kconf", "warm"]) for (const k in older[f]) if (!(k in m[f]) || m[f][k] === "") m[f][k] = older[f][k];
  for (const k in older.dayDone) if (!m.dayDone[k] || older.dayDone[k] < m.dayDone[k]) m.dayDone[k] = older.dayDone[k];
  for (const k in older.quiz) {
    const o = older.quiz[k], n = m.quiz[k];
    if (!n) { m.quiz[k] = o; continue; }
    n.best = Math.max(n.best, o.best);
    if (o.passed && (!n.passed || o.passed < n.passed)) n.passed = o.passed;
    if (o.tries.length > n.tries.length) n.tries = o.tries;
  }
  // per question, trust whichever copy has answered it more often
  for (const id of new Set([...Object.keys(older.qs), ...Object.keys(newer.qs)])) {
    if (seenIn(older, id) <= seenIn(newer, id)) continue;
    m.qs[id] = older.qs[id];
    if (older.srs[id]) m.srs[id] = older.srs[id]; else delete m.srs[id];
    if (older.book[id]) m.book[id] = { ...older.book[id], note: (newer.book[id] && newer.book[id].note) || older.book[id].note };
  }
  for (const id in older.book) if (!m.book[id]) m.book[id] = older.book[id];
  const mk = x => `${x.at}|${x.score}|${x.pct}|${x.mins}`, have = new Set(m.mocks.map(mk));
  m.mocks = m.mocks.concat(older.mocks.filter(x => !have.has(mk(x)))).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  for (const k in older.log) m.log[k] = Math.max(m.log[k] || 0, older.log[k]);
  m.drill = { best: Math.max(m.drill.best, older.drill.best), runs: Math.max(m.drill.runs, older.drill.runs), rev: Math.max(m.drill.rev, older.drill.rev),
    lives: Math.max(m.drill.lives, older.drill.lives), day: { ...older.drill.day, ...m.drill.day } };
  for (const k in older.ach) if (!m.ach[k] || older.ach[k] < m.ach[k]) m.ach[k] = older.ach[k];
  m.rowBest = Math.max(m.rowBest, older.rowBest);
  for (const id in older.book) if (m.book[id] && !m.book[id].why && older.book[id].why) m.book[id].why = older.book[id].why;
  // a day's and a week's starting point: the copy that stamped it first (a copy behind on sync stamps a lower total later)
  for (const k in older.xpDay) {
    const o = older.xpDay[k], n = m.xpDay[k];
    if (!n || (o.at && o.at < n.at)) m.xpDay[k] = { ...o, hit: o.hit || !!(n && n.hit) };
    else if (o.hit) n.hit = true;
  }
  if (older.week.key > m.week.key || (older.week.key === m.week.key && older.week.at && older.week.at < m.week.at)) m.week = clone(older.week);
  for (const k in older.chal) if (!m.chal[k] || older.chal[k] < m.chal[k]) m.chal[k] = older.chal[k];
  // billable things: every item from both; deleted on either side means deleted
  for (const o of older.cost.items) { const n = m.cost.items.find(x => x.id === o.id); if (!n) m.cost.items.push(o); else { n.gone = Math.max(n.gone, o.gone); n.at = Math.min(n.at || o.at, o.at || n.at); } }
  m.cost.snooze = Math.max(m.cost.snooze, older.cost.snooze);
  if (older.cost.night > m.cost.night) m.cost.night = older.cost.night;
  // each device counts its own answers and focus per day; the copy that counted more for a device is the newer one
  for (const k in older.daily) {
    const n = m.daily[k] || (m.daily[k] = {});
    for (const dev in older.daily[k]) { const o = older.daily[k][dev]; if (!n[dev] || o.a + o.f > n[dev].a + n[dev].f) n[dev] = o; }
  }
  if (older.timer.ts > newer.timer.ts) m.timer = clone(older.timer);   // the timer that changed last, not the copy that saved last
  m.runOff = Math.max(local.runOff, remote.runOff);
  m.run = mergeRun(local.run, remote.run, m.runOff);
  m.savedAt = Date.now();
  return m;
}
// A quiz in progress on two devices. The same run (same start) keeps every answer either one checked, from the copy that
// answered more, and this screen's question; a finished copy wins. Of two different runs the later one stands (starting
// one drops the last), and one closed or dropped anywhere (off) stays gone.
function mergeRun(mine, theirs, off) {
  let r = mine || theirs;
  if (mine && theirs && mine.t0 !== theirs.t0) r = mine.t0 > theirs.t0 ? mine : theirs;
  else if (mine && theirs && theirs.done && !mine.done) r = clone(theirs);
  else if (mine && theirs && !mine.done) {
    const n = x => Object.keys(x.ans).length, [a, b] = n(theirs) > n(mine) ? [theirs, mine] : [mine, theirs];
    r = clone(a);
    for (const id in b.ans) if (!r.ans[id]) r.ans[id] = b.ans[id];
    Object.assign(r, { i: mine.i, view: mine.view, rowMax: Math.max(a.rowMax, b.rowMax), rec: a.rec || b.rec });
  }
  return r && !(off && r.t0 <= off) ? r : null;
}
// Re-render after the state was replaced from outside (server or another tab).
function applyState() {
  DAYS.forEach(markDayDone);
  award();
  stillHere();
  rebuild(); restoreScores(); tmRender();
  // never redraw a field under the cursor (a notebook note, the note under a missed answer, the day notes)
  const typing = d => d.contains(document.activeElement) && document.activeElement.matches("input,textarea");
  if (qzDlg.open && !drill && !intro && !typing(qzDlg)) renderQuiz();   // a run finished or dropped elsewhere closes it
  if (shDlg.open && shDlg.dataset.kind !== "daynotes" && !typing(shDlg)) renderSheet();
}
// The server holds a revision we haven't seen. Returns true when the result still needs pushing.
function absorb(cur) {
  const remote = parseState(cur.doc);
  const both = sync.dirty;
  S = both ? mergeDocs(S, remote) : remote;
  sync.rev = cur.rev;
  if (!both) sync.dirty = false;
  writeLocal();
  syncMeta();
  applyState();
  return both;
}
// What the last request to the server got: "" an answer, "off" no network, "auth" the sign-in in front of the app answered
// instead (signed out), "err" no answer or an error. The timer strip says so (#sync-st), so changes that stay on this device
// are never a surprise. A browser that never reached a server (a static preview) shows nothing.
let net = "", netN = 0;
const isJSON = r => (r.headers.get("Content-Type") || "").includes("application/json");
const netWhy = r => !r ? (navigator.onLine === false ? "off" : "err") : r.type === "opaqueredirect" || r.status === 401 || (r.ok && !isJSON(r)) ? "auth" : "err";
const NET = {
  off: ["Offline", "Offline: your changes stay on this device and go to the server when the network is back."],
  auth: ["Signed out", "Not saved to the server: the sign-in has run out. Tap here to sign in again; nothing on this device is lost."],
  err: ["Not synced", "The server isn't answering: your changes stay on this device and go to it once it answers. Tap here to try now."]
};
function netSaw(kind) {
  net = kind; netN = kind ? netN + 1 : 0;
  const el = document.getElementById("sync-st"), show = !!kind && (sync.on || sync.rev > 0) && (kind === "auth" || netN >= 2 || sync.dirty);
  el.hidden = !show;
  if (!show) return;
  el.dataset.k = kind;
  el.querySelector(".ss-s").textContent = NET[kind][0];
  el.querySelector(".ss-l").textContent = NET[kind][1];
  el.title = NET[kind][1];
}
document.getElementById("sync-st").onclick = () => { if (net === "auth") location.reload(); else pull(); };
// keepalive: leaving the page (a phone switching apps), the save may finish after the page is frozen; browsers allow 64 KB that way
async function push(keepalive = false) {
  if (sync.busy) { sync.again = true; return; }
  sync.busy = true;
  const n = sync.n;   // only call it clean if nothing was saved while the request was in flight
  try {
    const body = JSON.stringify({ rev: sync.rev, doc: S });
    const r = await fetch("api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body, redirect: "manual", keepalive: keepalive && new Blob([body]).size < 64000 });
    if (r.ok && isJSON(r)) { sync.rev = (await r.json()).rev; if (sync.n === n) sync.dirty = false; syncMeta(); netSaw(""); }
    else if (r.status === 409 && isJSON(r)) { netSaw(""); if (absorb(await r.json())) sync.again = true; }
    else netSaw(netWhy(r));
  } catch (e) { netSaw(netWhy(null)); }   // stays dirty: tried again on the next save, the next ask for news, or back on the page
  sync.busy = false;
  if (sync.again) { sync.again = false; push(); }
}
// The first try (answered or not) makes the day's and the week's starting points safe to stamp.
function markReady() { if (ready) return; ready = true; if (stamp()) save(); refresh(); showGains([], 600); }
// Ask the server for news, one ask at a time; the promise settles when it is in (or there is none).
let pulling = null, pulledAt = 0;
function pull() {
  return pulling || (pulling = pullNow().finally(() => { pulling = null; pulledAt = Date.now(); }));
}
async function pullNow() {
  flushEdits();
  let cur = null;
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);   // a phone on a bad network: don't wait for minutes
  try {
    // With the revision this copy has, the server answers 304 and no document unless another device saved since.
    const r = await fetch("api/state", { cache: "no-store", headers: { "If-None-Match": `"${sync.rev}"` }, redirect: "manual", signal: ctl.signal });
    if (r.status === 304) { netSaw(""); sync.on = true; if (sync.dirty) push(); }
    else if (!r.ok || !isJSON(r)) netSaw(netWhy(r));
    else { cur = await r.json(); netSaw(""); }
  } catch (e) { netSaw(netWhy(null)); }
  clearTimeout(to);
  try { if (cur) await pullApply(cur); } finally { markReady(); }
}
async function pullApply(cur) {
  sync.on = true;
  if (cur.rev === sync.rev) { if (sync.dirty) push(); return; }
  if (!isObj(cur.doc)) { sync.rev = cur.rev; push(); return; }   // empty server: upload this copy
  if (absorb(cur)) push();
}
// Notes save 0.4 s after the last key: what was typed just before news arrives goes into this copy first, so it wins the merge.
function flushEdits() {
  let n = 0;
  for (const id in noteTimers) if (noteTimers[id]) { clearTimeout(noteTimers[id]); noteTimers[id] = 0; n++; }
  if (noteT) { clearTimeout(noteT); noteT = 0; n++; }
  if (n) save();
}
// News from the other devices: every 30 seconds while this page is in view, and at once when it comes back into view, gets
// the focus (a click on its monitor) or the network returns. Out of view (another app, the screen off, the tab closed),
// what is unsaved goes to the server right away: a phone may freeze the page next.
setInterval(() => { if (document.visibilityState === "visible" && (sync.on || sync.rev > 0) && !sync.busy) pull(); }, 30000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pull(); else leaving(); });
addEventListener("pagehide", leaving);
addEventListener("focus", () => { if (sync.on) pull(); });
addEventListener("online", () => pull());
function leaving() {
  flushEdits();
  if (!sync.dirty || !sync.on) return;
  // only while localStorage still holds this tab's last save: a copy written behind its back (another tab, by hand) is never replaced from memory
  let mine = false;
  try { mine = !!lastSaved && localStorage.getItem(KEY) === lastSaved; } catch (e) {}
  if (mine) { clearTimeout(pushT); push(true); }
}
// Another tab of this site saved: take its copy, so this tab never writes back stale data.
addEventListener("storage", e => {
  if (e.key === SYNC_KEY && e.newValue) {
    try { const m = JSON.parse(e.newValue); sync.rev = num0(m.rev); sync.dirty = !!m.dirty; } catch (err) {}
    return;
  }
  if (e.key !== KEY || !e.newValue) return;
  let next;
  try { next = parseState(JSON.parse(e.newValue)); } catch (err) { return; }
  if (qzDlg.open && S.run) next.run = S.run;   // keep the quiz on this screen
  S = next;
  applyState();
});

// ---------- boot ----------
function rebuild() { syncLevel(); renderLinks(); syncToggles(); refresh(); }
// stay correct past midnight without reloading
let lastIdx = todayIdx(), lastDate = today();
setInterval(() => { if (todayIdx() !== lastIdx || today() !== lastDate) { lastIdx = todayIdx(); lastDate = today(); refresh(); } }, 60000);

// Days ticked off before quizzes existed count as done once their quiz is passed.
DAYS.forEach(markDayDone);
award(0, false);   // saved with the next change, or after the first sync (applyState)
document.querySelector(".tb .tb-k").textContent = `SAA-C03 / ${DAYS.length}-day study plan`;
restoreScores();
rebuild();
route();
tmRender();
// The news first: the server may already have this mock submitted or these results closed on another device.
pull().then(() => {
  if (S.run && S.run.kind === "mock" && !S.run.done && Date.now() >= S.run.end) finishMock(true);
  else if (S.run && S.run.done) whenFree(openQuiz);   // results left open before a reload
});
})();
