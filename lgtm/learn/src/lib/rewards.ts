// XP, levels, badges and which celebration a change deserves. All of it is derived from the
// state every time and never stored, so syncing and merging need no rules for it and progress
// made before these features existed counts. Pure functions; the course outline comes in as an
// argument (src/lib/bank.ts).
import { EXAMS, type Cert } from './exams.ts';
import { passes } from './quiz.ts';
import type { State } from './state.ts';

/** What the reward rules need to know about the course. */
export interface Outline {
  modules: { id: string; quiz: boolean; steps: { id: string }[] }[];
}

/** XP per thing done. */
export const XP = {
  /** A right answer that taught something (QStat.xp: first time right, right after a miss, right when due). */
  answer: 10,
  /** A card question whose last answer was right. */
  card: 5,
  step: 5,
  check: 10,
  /** A module quiz passed (once per module). */
  quiz: 100,
  /** A module done: every step complete and its quiz passed. */
  module: 50,
  /** A finished mock exam. */
  mock: 25,
  /** A mock exam passed (once per exam). */
  mockPass: 250,
} as const;

/** Level n starts at LEVEL_STEP * n * (n - 1) XP: 80 for level 2, 3,600 for level 10. */
export const LEVEL_STEP = 40;
export const MAX_LEVEL = 99;
/** Right answers in a row that earn a badge. */
export const ROW_BADGES = [5, 10, 20] as const;

const count = (o: Record<string, unknown>) => Object.keys(o).length;
const has = (o: Record<string, unknown>, k: string) => Object.hasOwn(o, k);

export function quizPassed(s: State, moduleId: string): boolean {
  return has(s.quizzes, moduleId) && s.quizzes[moduleId].passed > 0;
}

/** A module is done when every step is complete and its quiz (when it has one) is passed. */
export function moduleDone(s: State, m: Outline['modules'][number]): boolean {
  return m.steps.length > 0 && m.steps.every((st) => has(s.done, st.id)) && (!m.quiz || quizPassed(s, m.id));
}

export const mockPassed = (s: State, cert: Cert) => s.mocks.some((m) => m.cert === cert && passes(m.score, m.n, EXAMS[cert].pass));

export function modulesDone(s: State, o: Outline): number {
  return o.modules.filter((m) => moduleDone(s, m)).length;
}

/** Everything: every module done and both mock exams passed. */
export function allDone(s: State, o: Outline): boolean {
  return o.modules.length > 0 && modulesDone(s, o) === o.modules.length && mockPassed(s, 'otca') && mockPassed(s, 'pca');
}

export function xpTotal(s: State, o: Outline | null): number {
  let xp = 0;
  for (const q of Object.values(s.qs)) xp += q.xp * XP.answer;
  for (const a of Object.values(s.answers)) if (a.right) xp += XP.card;
  xp += count(s.done) * XP.step + count(s.checks) * XP.check;
  for (const q of Object.values(s.quizzes)) if (q.passed > 0) xp += XP.quiz;
  if (o) xp += modulesDone(s, o) * XP.module;
  xp += s.mocks.length * XP.mock;
  for (const cert of ['otca', 'pca'] as const) if (mockPassed(s, cert)) xp += XP.mockPass;
  return xp;
}

export interface Level {
  level: number;
  /** XP where this level starts and the next one starts. */
  from: number;
  to: number;
}

export function levelOf(xp: number): Level {
  const x = Number.isFinite(xp) && xp > 0 ? xp : 0;
  let level = 1;
  while (level < MAX_LEVEL && LEVEL_STEP * (level + 1) * level <= x) level++;
  return { level, from: LEVEL_STEP * level * (level - 1), to: LEVEL_STEP * (level + 1) * level };
}

export interface Badge {
  id: string;
  title: string;
  /** What earns it, in one sentence. */
  how: string;
  earned: boolean;
}

/** Every badge, earned or not, in the order they are usually earned. */
export function badges(s: State, o: Outline | null): Badge[] {
  const tries = Object.values(s.quizzes).flatMap((q) => q.tries);
  const done = o ? modulesDone(s, o) : 0;
  const list: Omit<Badge, 'earned'>[] = [];
  const earned: boolean[] = [];
  const add = (id: string, title: string, how: string, ok: boolean) => {
    list.push({ id, title, how });
    earned.push(ok);
  };
  add('first-step', 'First step', 'Complete a step.', count(s.done) >= 1);
  add('first-check', 'Lab hand', 'Pass a lab check.', count(s.checks) >= 1);
  add('ten-steps', 'Ten steps', 'Complete ten steps.', count(s.done) >= 10);
  for (const n of ROW_BADGES) add(`row-${n}`, `${n} in a row`, `Answer ${n} quiz questions right in a row.`, s.rowBest >= n);
  add('quiz-passed', 'Quiz passed', 'Pass a module quiz.', Object.values(s.quizzes).some((q) => q.passed > 0));
  add('quiz-perfect', 'Perfect quiz', 'Answer every question of a module quiz right.', tries.some((t) => t.n > 0 && t.score === t.n));
  add('module-done', 'Module done', 'Finish a module: every step and its quiz.', done >= 1);
  add('mock-otca', 'OTCA mock passed', 'Pass the OTCA mock exam.', mockPassed(s, 'otca'));
  add('mock-pca', 'PCA mock passed', 'Pass the PCA mock exam.', mockPassed(s, 'pca'));
  add('all-done', 'Everything', 'Finish every module and pass both mock exams.', !!o && allDone(s, o));
  return list.map((b, i) => ({ ...b, earned: earned[i] }));
}

/** The celebration ladder, smallest first. Each rung is clearly bigger than the one below. */
export const RUNGS = ['step', 'check', 'quiz', 'module', 'mock', 'all'] as const;
export type Rung = (typeof RUNGS)[number];

const passingTries = (s: State) => Object.values(s.quizzes).reduce((n, q) => n + q.tries.filter((t) => passes(t.score, t.n)).length, 0);
const passingMocks = (s: State) => s.mocks.filter((m) => passes(m.score, m.n, EXAMS[m.cert].pass)).length;

/**
 * The biggest thing a local change finished, or null. Called with the state before and after
 * one change made on this device (never for a copy that arrived from another device).
 */
export function celebrationFor(before: State, after: State, o: Outline | null): Rung | null {
  if (o && allDone(after, o) && !allDone(before, o)) return 'all';
  if (passingMocks(after) > passingMocks(before)) return 'mock';
  if (o && modulesDone(after, o) > modulesDone(before, o)) return 'module';
  if (passingTries(after) > passingTries(before)) return 'quiz';
  if (Object.keys(after.checks).some((k) => !has(before.checks, k))) return 'check';
  if (Object.keys(after.done).some((k) => !has(before.done, k))) return 'step';
  return null;
}
