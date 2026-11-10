// What happens to the state when a quiz, a practice round or a mock exam starts, is answered,
// finishes and closes. Each function changes a draft of the state (inside Store.update) and
// takes the time and chance as arguments, so the unit tests can drive them without a page.
import { EXAMS, type Cert } from './exams.ts';
import { isRight, learn, optionOrder, passes, runResult, type BankQuestion, type Rand } from './quiz.ts';
import { dict, LIMITS, type QuizRun, type RunKind, type State } from './state.ts';

/** Starts a quiz or practice run, dropping any run that was there. */
export function startRun(s: State, kind: RunKind, of: string, qs: readonly BankQuestion[], now: number, rand: Rand = Math.random): void {
  if (!qs.length) return;
  dropRun(s);
  const list = qs.slice(0, LIMITS.runQuestions);
  s.run = {
    kind,
    of,
    // Two runs never share a start, so a merge can always tell them apart.
    t0: Math.max(now, s.runOff + 1),
    ids: list.map((q) => q.id),
    ord: list.map((q) => optionOrder(q.n, rand)),
    ans: dict(),
    i: 0,
    done: 0,
    row: 0,
    rowMax: 0,
    best0: s.rowBest,
  };
}

/** Closes the run (results read, or dropped): a copy of it on another device does not come back. */
export function dropRun(s: State): void {
  if (s.run) s.runOff = Math.max(s.runOff, s.run.t0);
  s.run = null;
}

/** Checks an answer in the run. A question is answered once; later calls change nothing. */
export function answerRun(s: State, q: BankQuestion, picks: readonly number[], now: number): { right: boolean; xp: boolean } | null {
  const run = s.run;
  if (!run || run.done || !run.ids.includes(q.id) || Object.hasOwn(run.ans, q.id) || !picks.length) return null;
  const a = [...new Set(picks)].filter((i) => Number.isInteger(i) && i >= 0 && i < q.n).slice(0, 2);
  const right = isRight(q, a);
  run.ans[q.id] = { a, at: now };
  const { xp } = learn(s.qs, s.srs, q.id, right, now);
  run.row = right ? run.row + 1 : 0;
  run.rowMax = Math.max(run.rowMax, run.row);
  s.rowBest = Math.min(Math.max(s.rowBest, run.row), LIMITS.row);
  return { right, xp };
}

/** The next question after `from` that is still open, wrapping round; -1 when all are answered. */
export function nextOpen(run: QuizRun, from: number): number {
  const n = run.ids.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!Object.hasOwn(run.ans, run.ids[i])) return i;
  }
  return -1;
}

/**
 * Ends the run and shows the results. A module quiz records a try, keyed by the run's start so
 * the same run finished on two devices counts once, and passes the module's quiz at 80%.
 */
export function finishRun(s: State, byId: ReadonlyMap<string, BankQuestion>, now: number): void {
  const run = s.run;
  if (!run || run.done) return;
  run.done = now;
  if (run.kind !== 'module' || !run.of) return;
  const qs = run.ids.map((id) => byId.get(id)).filter((q): q is BankQuestion => !!q);
  const r = runResult(qs, (id) => (Object.hasOwn(run.ans, id) ? run.ans[id].a : undefined));
  if (!r.n) return;
  const rec = Object.hasOwn(s.quizzes, run.of) ? s.quizzes[run.of] : (s.quizzes[run.of] = { best: 0, passed: 0, tries: [] });
  if (!rec.tries.some((t) => t.at === run.t0)) rec.tries = [...rec.tries, { at: run.t0, score: r.score, n: r.n }].slice(-LIMITS.tries);
  rec.best = Math.max(rec.best, r.pct);
  if (passes(r.score, r.n) && !rec.passed) rec.passed = now;
}

// ---------- mock exams ----------

export function startExam(s: State, cert: Cert, qs: readonly BankQuestion[], now: number, rand: Rand = Math.random): void {
  if (!qs.length) return;
  dropExam(s);
  const list = qs.slice(0, LIMITS.runQuestions);
  const t0 = Math.max(now, s.examOff + 1);
  s.exam = {
    cert,
    t0,
    end: t0 + EXAMS[cert].minutes * 60_000,
    ids: list.map((q) => q.id),
    ord: list.map((q) => optionOrder(q.n, rand)),
    marks: dict(),
    i: 0,
    done: 0,
    timeUp: false,
  };
}

export function dropExam(s: State): void {
  if (s.exam) s.examOff = Math.max(s.examOff, s.exam.t0);
  s.exam = null;
}

/** Saves a pick or a flag in the running mock exam. No feedback, nothing learned yet. */
export function markExam(s: State, id: string, change: { a?: readonly number[]; f?: boolean }, now: number): void {
  const e = s.exam;
  if (!e || e.done || !e.ids.includes(id) || now >= e.end) return;
  const cur = Object.hasOwn(e.marks, id) ? e.marks[id] : { a: [], f: false, at: 0 };
  e.marks[id] = { a: change.a ? [...change.a].slice(0, 2) : cur.a, f: change.f ?? cur.f, at: now };
}

/**
 * Submits the mock exam: the result per domain goes to `mocks` (once per run), and every
 * answered question is learned like any other answer (history and review queue). Unanswered
 * questions count as wrong in the score and are not learned.
 */
export function submitExam(s: State, byId: ReadonlyMap<string, BankQuestion>, now: number, timeUp: boolean): void {
  const e = s.exam;
  if (!e || e.done) return;
  // A clock that ran out closes the exam at its end, even when the device noticed it later.
  e.done = timeUp ? Math.min(now, e.end) : now;
  e.timeUp = timeUp;
  const qs = e.ids.map((id) => byId.get(id)).filter((q): q is BankQuestion => !!q);
  const picksOf = (id: string) => (Object.hasOwn(e.marks, id) && e.marks[id].a.length ? e.marks[id].a : undefined);
  const r = runResult(qs, picksOf);
  for (const q of qs) {
    const a = picksOf(q.id);
    if (a) learn(s.qs, s.srs, q.id, isRight(q, a), e.done);
  }
  if (!s.mocks.some((m) => m.cert === e.cert && m.t0 === e.t0) && r.n) {
    s.mocks = [
      ...s.mocks,
      { cert: e.cert, t0: e.t0, at: e.done, score: r.score, n: r.n, pct: r.pct, dom: r.byDomain, mins: Math.round((e.done - e.t0) / 60_000) },
    ].slice(-LIMITS.mocks);
  }
}
