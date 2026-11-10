// The learner's progress: one versioned JSON document, kept in local storage and mirrored
// to the server. Every way into the state (local storage, the server, an imported file)
// goes through parseState(), which validates and bounds what it reads and never throws.
//
// Changing the shape: bump STATE_VERSION, add a step to MIGRATIONS that turns the old
// shape into the new one, and give new fields a default in defaultState(). Never drop
// progress: a step that cannot convert a field keeps it.

export const STATE_VERSION = 2;
export const STORAGE_KEY = 'lgtm-learn-v1';

import { DAY, type QStat, type SrsEntry } from './quiz.ts';
import type { Cert } from './exams.ts';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  /** Domain the lab's addresses live under, e.g. lab.k8s.local (lab contract). */
  labDomain: string;
  /** Lab seed, 16 lower-case hex characters, or '' when not entered yet. */
  labSeed: string;
  theme: Theme;
  /** Celebrations: canvas effects (also off under prefers-reduced-motion) and sounds. */
  effects: boolean;
  sound: boolean;
}

export interface CardAnswer {
  /** Whether the last answer was right. */
  right: boolean;
  /** How many times the question was answered. */
  n: number;
  /** When it was last answered (ms since 1970). */
  at: number;
}

/** One try at a module quiz. */
export interface QuizTry {
  at: number;
  score: number;
  n: number;
}

/** A module quiz's record. */
export interface QuizRecord {
  /** Best result in whole percent. */
  best: number;
  /** When the quiz was first passed (ms), 0 when not yet. */
  passed: number;
  /** The newest tries, oldest first (at most LIMITS.tries). */
  tries: QuizTry[];
}

export type RunKind = 'module' | 'review' | 'step' | 'weak';

/** A checked answer in a quiz or practice run. */
export interface RunAnswer {
  /** Picked options, as indices in the file. */
  a: number[];
  /** When it was checked (ms). */
  at: number;
}

/** A module quiz or a practice round in progress, or on its results screen. */
export interface QuizRun {
  kind: RunKind;
  /** The module id (module quiz) or the step id (step practice); '' otherwise. */
  of: string;
  /** When it started (ms); identifies the run across devices. */
  t0: number;
  /** Question ids in the order asked. */
  ids: string[];
  /** Per question (same index as ids): the order its options are shown in. */
  ord: number[][];
  /** Checked answers by question id. A checked answer never changes. */
  ans: Record<string, RunAnswer>;
  /** The question on screen. */
  i: number;
  /** When the results were reached (ms), 0 while answering. */
  done: number;
  /** Right answers in a row now, and at most in this run. */
  row: number;
  rowMax: number;
  /** The longest run of right answers ever when this run started (for "new record"). */
  best0: number;
}

/** An answer, or just a flag, in a mock exam. The newest change of a question wins in a merge. */
export interface ExamMark {
  a: number[];
  /** Flagged for review. */
  f: boolean;
  at: number;
}

/** A mock exam in progress, or on its results screen. */
export interface ExamRun {
  cert: Cert;
  t0: number;
  /** When time is up (ms). */
  end: number;
  ids: string[];
  ord: number[][];
  marks: Record<string, ExamMark>;
  i: number;
  /** When it was submitted (ms), 0 while running. */
  done: number;
  /** Submitted because time ran out. */
  timeUp: boolean;
}

/** A finished mock exam. */
export interface MockRecord {
  cert: Cert;
  /** The run's start, which identifies it. */
  t0: number;
  /** When it was submitted. */
  at: number;
  score: number;
  n: number;
  pct: number;
  /** Per domain: [right, asked]. */
  dom: Record<string, [number, number]>;
  /** Minutes taken. */
  mins: number;
}

export interface State {
  v: typeof STATE_VERSION;
  /** When this copy was last changed (ms since 1970). */
  savedAt: number;
  /** Completed steps: step id to the time it was marked complete. */
  done: Record<string, number>;
  /** Passed lab checks: step id to the time the check passed. */
  checks: Record<string, number>;
  /** Card questions (the one on each step): question id to the last result. */
  answers: Record<string, CardAnswer>;
  settings: Settings;
  /** Quiz, review, practice and mock questions: question id to its history (version 2). */
  qs: Record<string, QStat>;
  /** Missed questions waiting for review: question id to its step and due day (version 2). */
  srs: Record<string, SrsEntry>;
  /** Module quizzes: module id to the best result, the first pass and the tries (version 2). */
  quizzes: Record<string, QuizRecord>;
  /** The quiz or practice round in progress, or null (version 2). */
  run: QuizRun | null;
  /** Start of the latest run that was closed or dropped: a copy of it from another device does not come back. */
  runOff: number;
  /** The mock exam in progress, or null (version 2). */
  exam: ExamRun | null;
  /** Start of the latest mock exam that was closed or dropped. */
  examOff: number;
  /** Finished mock exams, oldest first. */
  mocks: MockRecord[];
  /** The most right answers in a row ever, in quizzes and practice. */
  rowBest: number;
  /**
   * When a setting last changed on any device (ms), 0 when never. In a merge the newer settings
   * win as a whole; a copy without this field (version 1) counts as older than any copy with it.
   */
  settingsAt: number;
  /** Top-level fields this version does not know (written by a newer version). Kept as they are. */
  [extra: string]: unknown;
}

export const DEFAULT_LAB_DOMAIN = 'lab.k8s.local';
export const LIMITS = {
  ids: 5000,
  idLength: 64,
  domainLength: 253,
  time: 4_102_444_800_000 /* 2100-01-01 */,
  /** Answers per question; right answers never exceed it. */
  count: 1_000_000,
  /** Tries kept per module quiz. */
  tries: 50,
  /** Questions in one run (a mock exam has 60). */
  runQuestions: 60,
  /** Options per question. */
  options: 6,
  /** Finished mock exams kept. */
  mocks: 100,
  /** The longest run of right answers that is believed. */
  row: 1000,
  /** A mock exam's clock never runs longer than this. */
  examMs: 4 * 60 * 60 * 1000,
} as const;

const ID = /^[a-z0-9][a-z0-9-]*$/;
const DOMAIN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
const SEED = /^[0-9a-f]{16}$/;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const KNOWN = new Set(['v', 'savedAt', 'done', 'checks', 'answers', 'settings', 'qs', 'srs', 'quizzes', 'run', 'runOff', 'exam', 'examOff', 'mocks', 'rowBest', 'settingsAt']);

export function defaultSettings(): Settings {
  return { labDomain: DEFAULT_LAB_DOMAIN, labSeed: '', theme: 'system', effects: true, sound: true };
}

export function defaultState(): State {
  return {
    v: STATE_VERSION,
    savedAt: 0,
    done: dict(),
    checks: dict(),
    answers: dict(),
    settings: defaultSettings(),
    qs: dict(),
    srs: dict(),
    quizzes: dict(),
    run: null,
    runOff: 0,
    exam: null,
    examOff: 0,
    mocks: [],
    rowBest: 0,
    settingsAt: 0,
  };
}

/** An object without a prototype, so ids such as "constructor" cannot reach Object.prototype. */
export function dict<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

export function validId(id: unknown): id is string {
  return typeof id === 'string' && id.length <= LIMITS.idLength && ID.test(id) && !FORBIDDEN.has(id);
}

function time(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(Math.floor(x), LIMITS.time) : null;
}

function timeMap(x: unknown): Record<string, number> {
  const out = dict<number>();
  if (!isObject(x)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(x)) {
    if (n >= LIMITS.ids) break;
    const t = time(v);
    if (validId(k) && t !== null) {
      out[k] = t;
      n++;
    }
  }
  return out;
}

function answerMap(x: unknown): Record<string, CardAnswer> {
  const out = dict<CardAnswer>();
  if (!isObject(x)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(x)) {
    if (n >= LIMITS.ids) break;
    if (!validId(k) || !isObject(v) || typeof v.right !== 'boolean') continue;
    const at = time(v.at) ?? 0;
    const count = typeof v.n === 'number' && Number.isFinite(v.n) ? Math.min(Math.max(Math.floor(v.n), 1), 100_000) : 1;
    out[k] = { right: v.right, n: count, at };
    n++;
  }
  return out;
}

/** A whole number inside [min, max], or null. */
function int(x: unknown, min: number, max: number): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? Math.min(Math.max(Math.floor(x), min), max) : null;
}

/** Iterates at most LIMITS.ids entries of an object whose keys are valid ids. */
function* entries(x: unknown, limit: number = LIMITS.ids): Generator<[string, unknown]> {
  if (!isObject(x)) return;
  let n = 0;
  for (const [k, v] of Object.entries(x)) {
    if (n >= limit) return;
    if (!validId(k)) continue;
    n++;
    yield [k, v];
  }
}

function statMap(x: unknown): Record<string, QStat> {
  const out = dict<QStat>();
  for (const [k, v] of entries(x)) {
    // A question never answered has no history: drop it rather than invent an answer.
    if (!isObject(v) || typeof v.seen !== 'number' || !(v.seen >= 1)) continue;
    const seen = int(v.seen, 1, LIMITS.count)!;
    const right = int(v.right, 0, seen) ?? 0;
    const xp = int(v.xp, 0, right) ?? 0;
    out[k] = { seen, right, last: v.last === 1 || v.last === true ? 1 : 0, at: time(v.at) ?? 0, xp };
  }
  return out;
}

function srsMap(x: unknown): Record<string, SrsEntry> {
  const out = dict<SrsEntry>();
  for (const [k, v] of entries(x)) {
    if (!isObject(v) || typeof v.due !== 'string' || !DAY.test(v.due)) continue;
    out[k] = { step: int(v.step, 0, 2) ?? 0, due: v.due };
  }
  return out;
}

function quizMap(x: unknown): Record<string, QuizRecord> {
  const out = dict<QuizRecord>();
  for (const [k, v] of entries(x, 200)) {
    if (!isObject(v)) continue;
    const tries: QuizTry[] = [];
    if (Array.isArray(v.tries)) {
      for (const t of v.tries.slice(-LIMITS.tries)) {
        if (!isObject(t)) continue;
        const n = int(t.n, 1, LIMITS.runQuestions);
        const at = time(t.at);
        if (n === null || at === null) continue;
        tries.push({ at, n, score: int(t.score, 0, n) ?? 0 });
      }
    }
    out[k] = { best: int(v.best, 0, 100) ?? 0, passed: time(v.passed) ?? 0, tries };
  }
  return out;
}

/** Picked options: distinct indices below LIMITS.options, at most two. */
function picks(x: unknown, min: number): number[] | null {
  if (!Array.isArray(x) || x.length < min || x.length > 2) return null;
  const out: number[] = [];
  for (const i of x) {
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= LIMITS.options || out.includes(i)) return null;
    out.push(i);
  }
  return out;
}

/** The question ids of a run and the order of each one's options. Null when unusable. */
function runQuestions(ids: unknown, ord: unknown): { ids: string[]; ord: number[][] } | null {
  if (!Array.isArray(ids) || !Array.isArray(ord) || ids.length < 1 || ids.length > LIMITS.runQuestions || ord.length !== ids.length) return null;
  const seen = new Set<string>();
  for (const id of ids) {
    if (!validId(id) || seen.has(id)) return null;
    seen.add(id);
  }
  const orders: number[][] = [];
  for (const o of ord) {
    if (!Array.isArray(o) || o.length < 2 || o.length > LIMITS.options) return null;
    const n = o.length;
    if (!o.every((i) => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < n) || new Set(o).size !== n) return null;
    orders.push(o.slice() as number[]);
  }
  return { ids: ids.slice() as string[], ord: orders };
}

/** Exam domain keys in a mock result. */
const DOMAIN_KEY = /^(O[1-4]|P[1-5])$/;

const RUN_KINDS = new Set<RunKind>(['module', 'review', 'step', 'weak']);

function parseRun(x: unknown): QuizRun | null {
  if (!isObject(x) || typeof x.kind !== 'string' || !RUN_KINDS.has(x.kind as RunKind)) return null;
  const t0 = time(x.t0);
  const q = runQuestions(x.ids, x.ord);
  if (!t0 || !q) return null;
  const of = x.of === '' || validId(x.of) ? (x.of as string) : null;
  if (of === null) return null;
  const ans = dict<RunAnswer>();
  if (isObject(x.ans)) {
    for (const id of q.ids) {
      const v = Object.hasOwn(x.ans, id) ? x.ans[id] : undefined;
      const a = isObject(v) ? picks(v.a, 1) : null;
      if (isObject(v) && a) ans[id] = { a, at: time(v.at) ?? 0 };
    }
  }
  const n = q.ids.length;
  const rowMax = int(x.rowMax, 0, n) ?? 0;
  return {
    kind: x.kind as RunKind,
    of,
    t0,
    ...q,
    ans,
    i: int(x.i, 0, n - 1) ?? 0,
    done: time(x.done) ?? 0,
    row: Math.min(int(x.row, 0, n) ?? 0, rowMax),
    rowMax,
    best0: int(x.best0, 0, LIMITS.row) ?? 0,
  };
}

function parseExam(x: unknown): ExamRun | null {
  if (!isObject(x) || (x.cert !== 'otca' && x.cert !== 'pca')) return null;
  const t0 = time(x.t0);
  const end = time(x.end);
  const q = runQuestions(x.ids, x.ord);
  if (!t0 || end === null || end <= t0 || end - t0 > LIMITS.examMs || !q) return null;
  const marks = dict<ExamMark>();
  if (isObject(x.marks)) {
    for (const id of q.ids) {
      const v = Object.hasOwn(x.marks, id) ? x.marks[id] : undefined;
      const a = isObject(v) ? picks(v.a, 0) : null;
      if (isObject(v) && a) marks[id] = { a, f: v.f === true, at: time(v.at) ?? 0 };
    }
  }
  return { cert: x.cert, t0, end, ...q, marks, i: int(x.i, 0, q.ids.length - 1) ?? 0, done: time(x.done) ?? 0, timeUp: x.timeUp === true };
}

function mockList(x: unknown): MockRecord[] {
  if (!Array.isArray(x)) return [];
  const out: MockRecord[] = [];
  for (const m of x.slice(-LIMITS.mocks)) {
    if (!isObject(m) || (m.cert !== 'otca' && m.cert !== 'pca')) continue;
    const t0 = time(m.t0);
    const at = time(m.at);
    const n = int(m.n, 1, LIMITS.runQuestions);
    if (!t0 || at === null || n === null) continue;
    const score = int(m.score, 0, n) ?? 0;
    const dom = dict<[number, number]>();
    if (isObject(m.dom)) {
      for (const [k, v] of Object.entries(m.dom).slice(0, 10)) {
        if (!DOMAIN_KEY.test(k) || !Array.isArray(v) || v.length !== 2) continue;
        const asked = int(v[1], 0, n);
        if (asked === null) continue;
        dom[k] = [int(v[0], 0, asked) ?? 0, asked];
      }
    }
    out.push({ cert: m.cert, t0, at, score, n, pct: Math.round((score / n) * 100), dom, mins: int(m.mins, 0, LIMITS.examMs / 60_000) ?? 0 });
  }
  return out;
}

export function parseSettings(x: unknown): Settings {
  const d = defaultSettings();
  if (!isObject(x)) return d;
  const domain = typeof x.labDomain === 'string' ? x.labDomain.trim().toLowerCase().replace(/\.$/, '') : '';
  const seed = typeof x.labSeed === 'string' ? x.labSeed.trim().toLowerCase() : '';
  return {
    labDomain: DOMAIN.test(domain) ? domain : d.labDomain,
    labSeed: SEED.test(seed) ? seed : '',
    theme: x.theme === 'light' || x.theme === 'dark' || x.theme === 'system' ? x.theme : d.theme,
    effects: typeof x.effects === 'boolean' ? x.effects : d.effects,
    sound: typeof x.sound === 'boolean' ? x.sound : d.sound,
  };
}

/** Steps that turn version n into version n + 1. Index 0 turns an unversioned document into version 1. */
const MIGRATIONS: ((doc: Record<string, unknown>) => Record<string, unknown>)[] = [
  // Before version 1 there was no shape; a document without "v" is read as version 1.
  (doc) => ({ ...doc, v: 1 }),
  // Version 2 (card S2) adds qs, srs, quizzes, run, runOff, exam, examOff, mocks, rowBest and settingsAt.
  // Version 1 had none of them, so every one starts at its default; nothing is dropped.
  (doc) => ({ ...doc, v: 2 }),
];

export function migrate(doc: Record<string, unknown>): Record<string, unknown> {
  let out = doc;
  let v = typeof out.v === 'number' && Number.isInteger(out.v) ? out.v : 0;
  while (v < STATE_VERSION) {
    out = MIGRATIONS[v](out);
    v++;
  }
  return out;
}

/** Validates, bounds and migrates any value into a State. Never throws. */
export function parseState(raw: unknown): State {
  let doc: unknown = raw;
  if (typeof doc === 'string') {
    try {
      doc = JSON.parse(doc);
    } catch {
      return defaultState();
    }
  }
  if (!isObject(doc)) return defaultState();
  const m = migrate(doc);
  const s = defaultState();
  s.savedAt = time(m.savedAt) ?? 0;
  s.done = timeMap(m.done);
  s.checks = timeMap(m.checks);
  s.answers = answerMap(m.answers);
  s.settings = parseSettings(m.settings);
  s.qs = statMap(m.qs);
  s.srs = srsMap(m.srs);
  s.quizzes = quizMap(m.quizzes);
  s.run = parseRun(m.run);
  s.runOff = time(m.runOff) ?? 0;
  s.exam = parseExam(m.exam);
  s.examOff = time(m.examOff) ?? 0;
  s.mocks = mockList(m.mocks);
  s.rowBest = int(m.rowBest, 0, LIMITS.row) ?? 0;
  s.settingsAt = time(m.settingsAt) ?? 0;
  // A document written by a newer version may carry fields this one does not know: keep them.
  for (const [k, v] of Object.entries(m)) {
    if (!KNOWN.has(k) && !FORBIDDEN.has(k) && k.length <= LIMITS.idLength) s[k] = v;
  }
  if (typeof m.v === 'number' && m.v > STATE_VERSION) s.v = STATE_VERSION;
  return s;
}

function unionTimes(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = dict<number>();
  for (const src of [a, b]) {
    for (const [k, t] of Object.entries(src)) out[k] = k in out ? Math.min(out[k], t) : t;
  }
  return out;
}

/** Card answers: per question, the copy that answered it more often; on a tie, the newer answer. */
function mergeAnswers(a: Record<string, CardAnswer>, b: Record<string, CardAnswer>): Record<string, CardAnswer> {
  const out = dict<CardAnswer>();
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = Object.hasOwn(a, k) ? a[k] : undefined;
    const y = Object.hasOwn(b, k) ? b[k] : undefined;
    out[k] = { ...(!x ? y! : !y ? x : y.n > x.n || (y.n === x.n && y.at > x.at) ? y : x) };
  }
  return out;
}

/**
 * Per-question history and review queue: for every question, both come from the copy that
 * answered that question more often (on a tie, the one that answered it last), so an answer
 * and the review step it caused are never split across copies.
 */
function mergeHistory(server: State, local: State): { qs: Record<string, QStat>; srs: Record<string, SrsEntry> } {
  const qs = dict<QStat>();
  const srs = dict<SrsEntry>();
  const ids = new Set([...Object.keys(server.qs), ...Object.keys(local.qs), ...Object.keys(server.srs), ...Object.keys(local.srs)]);
  for (const id of ids) {
    const s = Object.hasOwn(server.qs, id) ? server.qs[id] : undefined;
    const l = Object.hasOwn(local.qs, id) ? local.qs[id] : undefined;
    const fromLocal = !s ? !!l || !Object.hasOwn(server.srs, id) : !!l && (l.seen > s.seen || (l.seen === s.seen && l.at > s.at));
    const src = fromLocal ? local : server;
    if (Object.hasOwn(src.qs, id)) qs[id] = { ...src.qs[id] };
    if (Object.hasOwn(src.srs, id)) srs[id] = { ...src.srs[id] };
  }
  return { qs, srs };
}

/** Module quizzes: the best result, the earliest pass, and every try from both copies. */
function mergeQuizzes(a: Record<string, QuizRecord>, b: Record<string, QuizRecord>): Record<string, QuizRecord> {
  const out = dict<QuizRecord>();
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = Object.hasOwn(a, k) ? a[k] : undefined;
    const y = Object.hasOwn(b, k) ? b[k] : undefined;
    if (!x || !y) {
      const one = (x ?? y)!;
      out[k] = { ...one, tries: one.tries.map((t) => ({ ...t })) };
      continue;
    }
    const tries = new Map<number, QuizTry>();
    for (const t of [...x.tries, ...y.tries]) if (!tries.has(t.at)) tries.set(t.at, { ...t });
    const passed = [x.passed, y.passed].filter((p) => p > 0);
    out[k] = {
      best: Math.max(x.best, y.best),
      passed: passed.length ? Math.min(...passed) : 0,
      tries: [...tries.values()].sort((p, q) => p.at - q.at).slice(-LIMITS.tries),
    };
  }
  return out;
}

const cloneRun = <T>(r: T): T => (r === null ? r : (JSON.parse(JSON.stringify(r)) as T));

/**
 * A quiz or practice run on two copies. A run that started at or before the latest closed one
 * (`off`) is gone. Two different runs: the one started later stands. The same run (same start):
 * every answer either copy checked (the first check of a question counts), finished if either
 * finished, the question on screen from this device.
 */
function mergeRun(local: QuizRun | null, server: QuizRun | null, off: number): QuizRun | null {
  const l = local && local.t0 > off ? local : null;
  const s = server && server.t0 > off ? server : null;
  if (!l || !s) return cloneRun(l ?? s);
  if (l.t0 !== s.t0) return cloneRun(l.t0 > s.t0 ? l : s);
  const more = Object.keys(l.ans).length > Object.keys(s.ans).length ? l : s;
  const out = cloneRun(more);
  out.ans = dict<RunAnswer>();
  for (const id of out.ids) {
    const x = Object.hasOwn(l.ans, id) ? l.ans[id] : undefined;
    const y = Object.hasOwn(s.ans, id) ? s.ans[id] : undefined;
    const pick = !x ? y : !y ? x : y.at < x.at ? y : x;
    if (pick) out.ans[id] = { a: pick.a.slice(), at: pick.at };
  }
  const done = [l.done, s.done].filter((d) => d > 0);
  out.done = done.length ? Math.min(...done) : 0;
  out.i = Math.min(l.i, out.ids.length - 1);
  out.rowMax = Math.max(l.rowMax, s.rowMax);
  out.row = Math.min(out.row, out.rowMax);
  return out;
}

/**
 * A mock exam on two copies. Gone when it started at or before the latest closed one. Two
 * different runs: the later one stands. The same run: a submitted copy wins over one still
 * running (answers given on the other device after the submit do not count); both submitted,
 * the earlier submit; both running, per question the newest change, and the question on
 * screen from this device.
 */
function mergeExam(local: ExamRun | null, server: ExamRun | null, off: number): ExamRun | null {
  const l = local && local.t0 > off ? local : null;
  const s = server && server.t0 > off ? server : null;
  if (!l || !s) return cloneRun(l ?? s);
  if (l.t0 !== s.t0) return cloneRun(l.t0 > s.t0 ? l : s);
  if (l.done || s.done) {
    if (l.done && s.done) return cloneRun(l.done <= s.done ? l : s);
    return cloneRun(l.done ? l : s);
  }
  const out = cloneRun(s);
  out.marks = dict<ExamMark>();
  for (const id of out.ids) {
    const x = Object.hasOwn(l.marks, id) ? l.marks[id] : undefined;
    const y = Object.hasOwn(s.marks, id) ? s.marks[id] : undefined;
    const pick = !x ? y : !y ? x : x.at > y.at ? x : y;
    if (pick) out.marks[id] = { a: pick.a.slice(), f: pick.f, at: pick.at };
  }
  out.i = Math.min(l.i, out.ids.length - 1);
  return out;
}

/** Finished mock exams: both lists, one entry per run (by its start), oldest first. */
function mergeMocks(a: MockRecord[], b: MockRecord[]): MockRecord[] {
  const by = new Map<string, MockRecord>();
  for (const m of [...a, ...b]) {
    const key = `${m.cert}:${m.t0}`;
    const have = by.get(key);
    if (!have || m.at < have.at) by.set(key, cloneRun(m));
  }
  return [...by.values()].sort((x, y) => x.at - y.at).slice(-LIMITS.mocks);
}

/**
 * Combines two copies that both changed since they last agreed (documented in lgtm/learn/CLAUDE.md):
 * - completed steps and passed checks: the union (earliest time wins);
 * - card answers, per-question history and the review queue: per question, the copy that answered it more;
 * - module quizzes: the best result, the earliest pass, the tries of both;
 * - the quiz run and the mock exam: see mergeRun() and mergeExam(); closed-run markers: the later;
 * - finished mock exams: the union; the longest run of right answers: the maximum;
 * - settings: the copy whose settings changed last (settingsAt) wins as a whole; on a tie, the server copy;
 * - fields this version does not know: from the server copy.
 */
export function mergeStates(local: State, server: State): State {
  const runOff = Math.max(local.runOff, server.runOff);
  const examOff = Math.max(local.examOff, server.examOff);
  const settingsFrom = local.settingsAt > server.settingsAt ? local : server;
  return {
    ...server,
    settings: { ...settingsFrom.settings },
    settingsAt: settingsFrom.settingsAt,
    done: unionTimes(server.done, local.done),
    checks: unionTimes(server.checks, local.checks),
    answers: mergeAnswers(server.answers, local.answers),
    ...mergeHistory(server, local),
    quizzes: mergeQuizzes(server.quizzes, local.quizzes),
    run: mergeRun(local.run, server.run, runOff),
    runOff,
    exam: mergeExam(local.exam, server.exam, examOff),
    examOff,
    mocks: mergeMocks(server.mocks, local.mocks),
    rowBest: Math.max(local.rowBest, server.rowBest),
    savedAt: Math.max(local.savedAt, server.savedAt),
  };
}
