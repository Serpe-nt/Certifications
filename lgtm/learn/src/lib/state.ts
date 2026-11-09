// The learner's progress: one versioned JSON document, kept in local storage and mirrored
// to the server. Every way into the state (local storage, the server, an imported file)
// goes through parseState(), which validates and bounds what it reads and never throws.
//
// Changing the shape: bump STATE_VERSION, add a step to MIGRATIONS that turns the old
// shape into the new one, and give new fields a default in defaultState(). Never drop
// progress: a step that cannot convert a field keeps it.

export const STATE_VERSION = 1;
export const STORAGE_KEY = 'lgtm-learn-v1';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  /** Domain the lab's addresses live under, e.g. lab.k8s.local (lab contract). */
  labDomain: string;
  /** Lab seed, 16 lower-case hex characters, or '' when not entered yet. */
  labSeed: string;
  theme: Theme;
  /** Stored now, used by the celebrations of card S2. */
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
  /** Top-level fields this version does not know (written by a newer version). Kept as they are. */
  [extra: string]: unknown;
}

export const DEFAULT_LAB_DOMAIN = 'lab.k8s.local';
export const LIMITS = { ids: 5000, idLength: 64, domainLength: 253, time: 4_102_444_800_000 /* 2100-01-01 */ } as const;

const ID = /^[a-z0-9][a-z0-9-]*$/;
const DOMAIN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
const SEED = /^[0-9a-f]{16}$/;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const KNOWN = new Set(['v', 'savedAt', 'done', 'checks', 'answers', 'settings']);

export function defaultSettings(): Settings {
  return { labDomain: DEFAULT_LAB_DOMAIN, labSeed: '', theme: 'system', effects: true, sound: true };
}

export function defaultState(): State {
  return { v: STATE_VERSION, savedAt: 0, done: dict(), checks: dict(), answers: dict(), settings: defaultSettings() };
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

/**
 * Combines two copies that both changed since they last agreed.
 * S1 rule: completed steps and passed checks are the union of both copies (earliest time wins);
 * everything else comes from the server copy. Card S2 extends this.
 */
export function mergeStates(local: State, server: State): State {
  return {
    ...server,
    done: unionTimes(server.done, local.done),
    checks: unionTimes(server.checks, local.checks),
    savedAt: Math.max(local.savedAt, server.savedAt),
  };
}
