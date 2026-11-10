// The quiz core: drawing questions, shuffling options, grading, per-question history,
// spaced repetition, weak spots, readiness and mock exam results. Pure functions with no
// page code and no clock of their own: every function that needs "now" or chance takes it
// as an argument, so the unit tests can fix both.
//
// The rules are ported from the owner's saa-plan tracker (saa-plan/site/qcore.js and
// saa-plan/docs/architecture.md, "Selection rules"); the code is new.
import { EXAMS, type Cert } from './exams.ts';

/** Questions in a module quiz. */
export const QUIZ_SIZE = 15;
/** Share of right answers that passes a module quiz. */
export const QUIZ_PASS = 0.8;
/** A missed question comes back after 1 day, then 2, then 4; the next right answer on time retires it. */
export const SRS_DAYS = [1, 2, 4] as const;
/** Questions in a practice round started from a step. */
export const STEP_PRACTICE = 3;
/** At most this many due questions in one review round. */
export const REVIEW_SIZE = 15;
/** Questions in a weak-spot practice round, and at most this many per tag. */
export const WEAK_SIZE = 10;
export const WEAK_PER_TAG = 4;
/** A tag needs this many answers before it can be called weak. */
export const WEAK_MIN_SEEN = 3;
/** A domain needs this many questions met before readiness gives a verdict. */
export const READY_MIN = 10;
/** Readiness bands: ready from 80% of the questions met answered right last time, close from 70%. */
export const READY_BANDS = { ready: 0.8, close: 0.7 } as const;

export type Rand = () => number;

/** What the quiz core needs to know about a question. */
export interface BankQuestion {
  id: string;
  /** The pool it belongs to: a module id such as "m04", or "mock-otca" / "mock-pca". */
  pool: string;
  /** 1 or 2 tags; the first is the main topic. */
  tags: string[];
  cert: Cert | 'none';
  /** Exam domain such as "P3", or "" when cert is "none". */
  domain: string;
  /** Number of options (4, or 5 with two answers). */
  n: number;
  /** Indices of the right options, as written in the file. */
  a: number[];
}

/** Per-question history. */
export interface QStat {
  /** Times answered. */
  seen: number;
  /** Times answered right. */
  right: number;
  /** Whether the last answer was right. */
  last: 0 | 1;
  /** When it was last answered (ms since 1970). */
  at: number;
  /** Right answers that taught something and earned XP (see learn()). */
  xp: number;
}

/** A missed question waiting for review. */
export interface SrsEntry {
  /** 0 after a miss, 1 and 2 after right answers on time. */
  step: number;
  /** Local date the question is due, YYYY-MM-DD. */
  due: string;
}

export type Stats = Record<string, QStat>;
export type Srs = Record<string, SrsEntry>;

// ---------- dates ----------

const pad = (n: number) => String(n).padStart(2, '0');

/** The learner's local calendar day of a moment, YYYY-MM-DD. Review days follow local midnight. */
export function localDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A calendar day plus n days (n may be negative). Works on the date alone, so DST cannot shift it. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// ---------- helpers ----------

export function shuffle<T>(list: readonly T[], rand: Rand = Math.random): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const stat = (stats: Stats, id: string): QStat | undefined => (Object.hasOwn(stats, id) ? stats[id] : undefined);
export const isMockPool = (q: BankQuestion) => q.pool.startsWith('mock-');

/** Right answers needed to pass n questions at the given mark. */
export const needed = (n: number, mark = QUIZ_PASS) => Math.ceil(mark * n - 1e-9);
export const passes = (score: number, n: number, mark = QUIZ_PASS) => n > 0 && score >= needed(n, mark);

/**
 * Priority order: never seen, then wrong last time, then right last time with the one seen
 * longest ago first. Random inside each tier.
 */
export function rank(qs: readonly BankQuestion[], stats: Stats, rand: Rand = Math.random): BankQuestion[] {
  const tier = (q: BankQuestion) => {
    const s = stat(stats, q.id);
    return !s ? 0 : s.last ? 2 : 1;
  };
  return shuffle(qs, rand)
    .map((q) => ({ q, t: tier(q), at: stat(stats, q.id)?.at ?? 0 }))
    .sort((x, y) => x.t - y.t || (x.t === 2 ? x.at - y.at : 0))
    .map((r) => r.q);
}

export const take = (qs: readonly BankQuestion[], n: number, stats: Stats, rand: Rand = Math.random) => rank(qs, stats, rand).slice(0, Math.max(0, n));

// ---------- drawing ----------

/** Questions about any of the tags, the ones whose main tag matches first, each group in rank order. */
export function drawByTags(pool: readonly BankQuestion[], tags: readonly string[], n: number, stats: Stats, rand: Rand = Math.random): BankQuestion[] {
  const set = new Set(tags);
  const about = pool.filter((q) => q.tags.some((t) => set.has(t)));
  return rank(about, stats, rand)
    .map((q, i) => ({ q, i, main: set.has(q.tags[0]) ? 0 : 1 }))
    .sort((x, y) => x.main - y.main || x.i - y.i)
    .slice(0, Math.max(0, n))
    .map((r) => r.q);
}

/** counts[domain] questions from each domain, by rank. A domain that runs short gives what it has. */
export function drawByDomain(pool: readonly BankQuestion[], counts: Readonly<Record<string, number>>, stats: Stats, rand: Rand = Math.random): BankQuestion[] {
  const out: BankQuestion[] = [];
  for (const [domain, n] of Object.entries(counts)) out.push(...take(pool.filter((q) => q.domain === domain), n, stats, rand));
  return shuffle(out, rand);
}

/**
 * Splits a total across weights by the largest remainder, so the parts add up to the total
 * exactly. Ties go to the domain listed first.
 */
export function splitByWeight(weights: Readonly<Record<string, number>>, total: number): Record<string, number> {
  const entries = Object.entries(weights);
  const sum = entries.reduce((n, [, w]) => n + w, 0) || 1;
  const raw = entries.map(([k, w], i) => ({ k, i, exact: (w / sum) * total }));
  const out: Record<string, number> = {};
  for (const r of raw) out[r.k] = Math.floor(r.exact + 1e-9);
  let left = total - Object.values(out).reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort((x, y) => y.exact - Math.floor(y.exact + 1e-9) - (x.exact - Math.floor(x.exact + 1e-9)) || x.i - y.i)) {
    if (left <= 0) break;
    out[r.k]++;
    left--;
  }
  return out;
}

/** Questions per domain in a mock exam: 60 split by the official weights. */
export const mockSplit = (cert: Cert) => splitByWeight(EXAMS[cert].weights, EXAMS[cert].questions);

/** A module quiz: QUIZ_SIZE questions from the module's own pool, by rank. */
export function pickModuleQuiz(bank: readonly BankQuestion[], moduleId: string, stats: Stats, rand: Rand = Math.random): BankQuestion[] {
  return shuffle(take(bank.filter((q) => q.pool === moduleId), QUIZ_SIZE, stats, rand), rand);
}

/** Ids of the questions due on or before today, the longest overdue first. */
export function dueIds(srs: Srs, today: string): string[] {
  return Object.keys(srs)
    .filter((id) => srs[id].due <= today)
    .sort((a, b) => (srs[a].due < srs[b].due ? -1 : srs[a].due > srs[b].due ? 1 : a < b ? -1 : 1));
}

/** A review round: up to REVIEW_SIZE due questions, the longest overdue first. */
export function pickReview(bank: readonly BankQuestion[], srs: Srs, today: string, n = REVIEW_SIZE): BankQuestion[] {
  const by = new Map(bank.map((q) => [q.id, q]));
  return dueIds(srs, today)
    .map((id) => by.get(id))
    .filter((q): q is BankQuestion => !!q)
    .slice(0, n);
}

/**
 * Practice from a step: questions on the step's tags, the ones whose main topic is one of them
 * first, then side topics; mock pool questions last, so practice does not use up the mock exams.
 */
export function pickStep(tags: readonly string[], bank: readonly BankQuestion[], stats: Stats, n = STEP_PRACTICE, rand: Rand = Math.random): BankQuestion[] {
  const study = drawByTags(bank.filter((q) => !isMockPool(q)), tags, n, stats, rand);
  if (study.length >= n) return study;
  return study.concat(drawByTags(bank.filter(isMockPool), tags, n - study.length, stats, rand));
}

/** Per tag: answers, right answers and the share right. */
export interface TagScore {
  tag: string;
  seen: number;
  right: number;
  acc: number;
}

/** Tags with at least minSeen answers, weakest first (lowest share right, then most answers). */
export function weakTags(bank: readonly BankQuestion[], stats: Stats, minSeen = WEAK_MIN_SEEN): TagScore[] {
  const agg = new Map<string, TagScore>();
  for (const q of bank) {
    const s = stat(stats, q.id);
    if (!s) continue;
    for (const t of q.tags) {
      const a = agg.get(t) ?? { tag: t, seen: 0, right: 0, acc: 0 };
      a.seen += s.seen;
      a.right += s.right;
      agg.set(t, a);
    }
  }
  return [...agg.values()]
    .filter((a) => a.seen >= minSeen)
    .map((a) => ({ ...a, acc: a.right / a.seen }))
    .sort((x, y) => x.acc - y.acc || y.seen - x.seen || (x.tag < y.tag ? -1 : 1));
}

/**
 * Weak-spot practice: questions from the topics answered wrong most often, past misses first,
 * at most WEAK_PER_TAG per main tag. Weakness is smoothed so one miss does not dominate, and a
 * topic never answered counts as halfway.
 */
export function pickWeak(bank: readonly BankQuestion[], stats: Stats, n = WEAK_SIZE, rand: Rand = Math.random): BankQuestion[] {
  const pool = bank.filter((q) => !isMockPool(q));
  const agg = new Map<string, [number, number]>();
  for (const q of pool) {
    const s = stat(stats, q.id);
    if (!s) continue;
    for (const t of q.tags) {
      const a = agg.get(t) ?? [0, 0];
      a[0] += s.seen - s.right;
      a[1] += s.seen;
      agg.set(t, a);
    }
  }
  const weakness = (t: string) => {
    const a = agg.get(t);
    return a ? (a[0] + 1) / (a[1] + 2) : 0.5;
  };
  const score = (q: BankQuestion) => {
    const s = stat(stats, q.id);
    const bonus = !s ? 0.3 : s.last ? 0 : 1;
    return Math.max(...q.tags.map(weakness)) + bonus + rand() * 0.2;
  };
  const sorted = pool
    .map((q) => ({ q, s: score(q) }))
    .sort((x, y) => y.s - x.s)
    .map((r) => r.q);
  const out: BankQuestion[] = [];
  const per = new Map<string, number>();
  for (const q of sorted) {
    if (out.length >= n) break;
    const t = q.tags[0];
    if ((per.get(t) ?? 0) >= WEAK_PER_TAG) continue;
    per.set(t, (per.get(t) ?? 0) + 1);
    out.push(q);
  }
  for (const q of sorted) {
    if (out.length >= n) break;
    if (!out.includes(q)) out.push(q);
  }
  return shuffle(out, rand);
}

/**
 * A mock exam: per domain the official share of 60. Inside a domain, unseen mock pool
 * questions come first, then unseen study questions of that domain, then misses, then the
 * ones seen longest ago. A domain with too few questions gives what it has.
 */
export function pickMock(cert: Cert, bank: readonly BankQuestion[], stats: Stats, rand: Rand = Math.random): BankQuestion[] {
  const split = mockSplit(cert);
  const own = `mock-${cert}`;
  const pool = bank.filter((q) => q.cert === cert && (q.pool === own || !isMockPool(q)));
  const tier = (q: BankQuestion) => {
    const s = stat(stats, q.id);
    return !s ? 0 : s.last ? 2 : 1;
  };
  const out: BankQuestion[] = [];
  for (const [domain, count] of Object.entries(split)) {
    shuffle(
      pool.filter((q) => q.domain === domain),
      rand,
    )
      .map((q) => ({ q, t: tier(q), m: q.pool === own ? 0 : 1, at: stat(stats, q.id)?.at ?? 0 }))
      .sort((x, y) => x.t - y.t || x.m - y.m || x.at - y.at)
      .slice(0, count)
      .forEach((r) => out.push(r.q));
  }
  return shuffle(out, rand);
}

// ---------- answering ----------

/** A shuffled order of a question's options: order[k] is the index in the file of the option shown k-th. */
export const optionOrder = (n: number, rand: Rand = Math.random) => shuffle(range(n), rand);

/** True when a valid order of n options. */
export function validOrder(order: unknown, n: number): order is number[] {
  return Array.isArray(order) && order.length === n && range(n).every((i) => order.includes(i));
}

/** Right when the picks are exactly the right options. */
export function isRight(q: Pick<BankQuestion, 'a'>, chosen: readonly number[] | undefined): boolean {
  if (!chosen || chosen.length !== q.a.length) return false;
  return q.a.every((i) => chosen.includes(i));
}

/**
 * Records one answer: the per-question history and the review queue. Returns whether the answer
 * earned XP: a right answer earns it the first time, right after a miss, or when it was due for
 * review, so redoing the same practice does not farm XP (the saa-plan rule).
 *
 * Review: a miss is due again tomorrow (step 0). A right answer only counts once the question
 * is due; it moves it to 2 days, then 4, then retires it. Another miss starts again at step 0.
 */
export function learn(stats: Stats, srs: Srs, id: string, right: boolean, now: number): { xp: boolean } {
  const today = localDay(now);
  const prev = stat(stats, id);
  const entry = Object.hasOwn(srs, id) ? srs[id] : undefined;
  const due = !!entry && entry.due <= today;
  const xp = right && (!prev || prev.last === 0 || due);
  const s: QStat = prev ? { ...prev } : { seen: 0, right: 0, last: 0, at: 0, xp: 0 };
  s.seen++;
  if (right) s.right++;
  if (xp) s.xp++;
  s.last = right ? 1 : 0;
  s.at = now;
  stats[id] = s;
  if (!right) {
    srs[id] = { step: 0, due: addDays(today, SRS_DAYS[0]) };
  } else if (entry && due) {
    const step = entry.step + 1;
    if (step >= SRS_DAYS.length) delete srs[id];
    else srs[id] = { step, due: addDays(today, SRS_DAYS[step]) };
  }
  return { xp };
}

// ---------- results ----------

export interface RunResult {
  score: number;
  n: number;
  /** Whole percent. */
  pct: number;
  /** Per domain: [right, asked]. */
  byDomain: Record<string, [number, number]>;
  /** Main tags of the missed questions, most missed first. */
  missedTags: string[];
}

export function runResult(qs: readonly BankQuestion[], answers: (id: string) => readonly number[] | undefined): RunResult {
  let score = 0;
  const byDomain: Record<string, [number, number]> = {};
  const missed = new Map<string, number>();
  for (const q of qs) {
    const ok = isRight(q, answers(q.id));
    if (ok) score++;
    else missed.set(q.tags[0], (missed.get(q.tags[0]) ?? 0) + 1);
    const key = q.domain || 'none';
    const d = (byDomain[key] ??= [0, 0]);
    d[1]++;
    if (ok) d[0]++;
  }
  const n = qs.length;
  return {
    score,
    n,
    pct: n ? Math.round((score / n) * 100) : 0,
    byDomain,
    missedTags: [...missed.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([t]) => t),
  };
}

// ---------- readiness ----------

/** One question as readiness sees it. */
export interface ReadinessItem {
  cert: Cert | 'none';
  domain: string;
  /** Answered at least once. */
  met: boolean;
  /** The last answer was right. */
  lastRight: boolean;
  /** Waiting in the review queue and due today or earlier. */
  due: boolean;
}

export type Band = 'ready' | 'close' | 'not-yet' | 'unmeasured';

export interface DomainReadiness {
  domain: string;
  /** Questions in the course for this domain. */
  total: number;
  /** Questions met (answered at least once). */
  met: number;
  /** Of those, how many were right the last time. */
  right: number;
  /** Share right of those met, 0 to 1 (0 when none met). */
  acc: number;
  /** Due for review today. */
  due: number;
  band: Band;
}

export interface ExamReadiness {
  cert: Cert;
  domains: DomainReadiness[];
  /** Weighted like the exam, once every domain is measured; null before. */
  overall: number | null;
  band: Band;
}

export function band(met: number, acc: number): Band {
  if (met < READY_MIN) return 'unmeasured';
  return acc >= READY_BANDS.ready ? 'ready' : acc >= READY_BANDS.close ? 'close' : 'not-yet';
}

/** Readiness per exam and per domain, from question history: seen, correct, due. */
export function readiness(cert: Cert, items: readonly ReadinessItem[]): ExamReadiness {
  const weights = EXAMS[cert].weights;
  const domains = Object.keys(weights).map((domain): DomainReadiness => {
    const mine = items.filter((it) => it.cert === cert && it.domain === domain);
    const met = mine.filter((it) => it.met);
    const right = met.filter((it) => it.lastRight).length;
    const acc = met.length ? right / met.length : 0;
    return { domain, total: mine.length, met: met.length, right, acc, due: mine.filter((it) => it.due).length, band: band(met.length, acc) };
  });
  const measured = domains.every((d) => d.band !== 'unmeasured');
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const overall = measured ? domains.reduce((n, d) => n + d.acc * weights[d.domain], 0) / sum : null;
  return { cert, domains, overall, band: overall === null ? 'unmeasured' : band(READY_MIN, overall) };
}

/** Builds readiness items from the bank, the history and the review queue. */
export function readinessItems(bank: readonly BankQuestion[], stats: Stats, srs: Srs, today: string): ReadinessItem[] {
  return bank.map((q) => {
    const s = stat(stats, q.id);
    const e = Object.hasOwn(srs, q.id) ? srs[q.id] : undefined;
    return { cert: q.cert, domain: q.domain, met: !!s, lastRight: s?.last === 1, due: !!e && e.due <= today };
  });
}
