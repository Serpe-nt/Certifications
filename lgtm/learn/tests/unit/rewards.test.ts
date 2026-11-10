import { describe, expect, it } from 'vitest';
import { XP, badges, celebrationFor, levelOf, moduleDone, xpTotal, type Outline } from '../../src/lib/rewards.ts';
import { defaultState, parseState, type State } from '../../src/lib/state.ts';

const outline: Outline = {
  modules: [
    { id: 'm90', quiz: true, steps: [{ id: 'm90-s01' }, { id: 'm90-s02' }] },
    { id: 'm91', quiz: false, steps: [{ id: 'm91-s01' }] },
  ],
};
const clone = (s: State) => parseState(JSON.parse(JSON.stringify(s)));
const passMock = (s: State, cert: 'otca' | 'pca', t0: number) => s.mocks.push({ cert, t0, at: t0 + 1, score: 45, n: 60, pct: 75, dom: {}, mins: 80 });

describe('XP and levels', () => {
  it('is derived from the state alone', () => {
    const s = defaultState();
    expect(xpTotal(s, outline)).toBe(0);
    s.done['m90-s01'] = 1;
    s.checks['m90-s02'] = 1;
    s.qs['q-m90-001'] = { seen: 3, right: 2, last: 1, at: 1, xp: 2 };
    s.answers['q-m90-s01'] = { right: true, n: 1, at: 1 };
    expect(xpTotal(s, outline)).toBe(XP.step + XP.check + 2 * XP.answer + XP.card);
    s.done['m91-s01'] = 1;
    expect(xpTotal(s, outline)).toBe(2 * XP.step + XP.check + 2 * XP.answer + XP.card + XP.module);
  });

  it('level n starts at 40 n (n - 1)', () => {
    expect(levelOf(0)).toEqual({ level: 1, from: 0, to: 80 });
    expect(levelOf(79).level).toBe(1);
    expect(levelOf(80).level).toBe(2);
    expect(levelOf(3600).level).toBe(10);
    expect(levelOf(Number.NaN).level).toBe(1);
    expect(levelOf(1e15).level).toBe(99);
  });
});

describe('badges and module completion', () => {
  it('a module is done only with every step and its quiz passed', () => {
    const s = defaultState();
    s.done['m90-s01'] = 1;
    s.done['m90-s02'] = 1;
    expect(moduleDone(s, outline.modules[0])).toBe(false);
    s.quizzes.m90 = { best: 80, passed: 5, tries: [{ at: 1, score: 12, n: 15 }] };
    expect(moduleDone(s, outline.modules[0])).toBe(true);
  });

  it('earns badges from the state', () => {
    const s = defaultState();
    expect(badges(s, outline).filter((b) => b.earned)).toEqual([]);
    s.done['m90-s01'] = 1;
    s.rowBest = 10;
    s.quizzes.m90 = { best: 100, passed: 5, tries: [{ at: 1, score: 15, n: 15 }] };
    passMock(s, 'pca', 10);
    const earned = badges(s, outline).filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(['first-step', 'row-5', 'row-10', 'quiz-passed', 'quiz-perfect', 'mock-pca']);
  });
});

describe('the celebration ladder', () => {
  it('picks the biggest thing a change finished', () => {
    const a = defaultState();
    const b = clone(a);
    b.done['m90-s01'] = 1;
    expect(celebrationFor(a, b, outline)).toBe('step');
    const c = clone(b);
    c.checks['m90-s02'] = 2;
    c.done['m90-s02'] = 2;
    expect(celebrationFor(b, c, outline)).toBe('check');
    const d = clone(c);
    d.quizzes.m90 = { best: 80, passed: 3, tries: [{ at: 3, score: 12, n: 15 }] };
    expect(celebrationFor(c, d, outline)).toBe('module');
    const e = clone(d);
    e.quizzes.m90.tries.push({ at: 4, score: 13, n: 15 });
    expect(celebrationFor(d, e, outline)).toBe('quiz');
    const f = clone(e);
    f.done['m91-s01'] = 5;
    passMock(f, 'otca', 20);
    expect(celebrationFor(e, f, outline)).toBe('mock');
    const g = clone(f);
    passMock(g, 'pca', 30);
    expect(celebrationFor(f, g, outline)).toBe('all');
    expect(celebrationFor(g, clone(g), outline)).toBeNull();
  });

  it('a failed quiz or mock is not celebrated', () => {
    const a = defaultState();
    const b = clone(a);
    b.quizzes.m90 = { best: 40, passed: 0, tries: [{ at: 3, score: 6, n: 15 }] };
    b.mocks.push({ cert: 'pca', t0: 1, at: 2, score: 44, n: 60, pct: 73, dom: {}, mins: 80 });
    expect(celebrationFor(a, b, outline)).toBeNull();
  });
});
