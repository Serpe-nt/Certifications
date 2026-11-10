// The version 2 state: parsing, the migration from version 1, the S2 merge rules, and the runs.
import { describe, expect, it } from 'vitest';
import type { BankQuestion } from '../../src/lib/quiz.ts';
import { answerRun, dropExam, dropRun, finishRun, markExam, nextOpen, startExam, startRun, submitExam } from '../../src/lib/runs.ts';
import { STATE_VERSION, defaultState, mergeStates, parseState, type State } from '../../src/lib/state.ts';

const q = (id: string, over: Partial<BankQuestion> = {}): BankQuestion => ({ id, pool: 'm90', tags: ['t'], cert: 'pca', domain: 'P1', n: 4, a: [0], ...over });
const seq = () => {
  let i = 0;
  return () => ((i++ * 0.37) % 1);
};
const T = new Date('2026-11-09T10:00:00').getTime();
const MIN = 60_000;

/** A copy of a state as it would travel through local storage or the server. */
const copy = (s: State) => parseState(JSON.parse(JSON.stringify(s)));

function quizBank(n = 15, pool = 'm90'): BankQuestion[] {
  return Array.from({ length: n }, (_, i) => q(`q-${pool}-${String(100 + i)}`, { pool }));
}

describe('state version 2', () => {
  it('migrates a version 1 document without losing anything', () => {
    const v1 = { v: 1, savedAt: 5, done: { 'm90-s01': 1 }, checks: { 'm90-s02': 2 }, answers: { 'q-m90-s01': { right: true, n: 1, at: 3 } }, settings: { theme: 'dark' } };
    const s = parseState(v1);
    expect(s.v).toBe(STATE_VERSION);
    expect(STATE_VERSION).toBe(2);
    expect(s.done['m90-s01']).toBe(1);
    expect(s.checks['m90-s02']).toBe(2);
    expect(s.answers['q-m90-s01']).toEqual({ right: true, n: 1, at: 3 });
    expect(s.settings.theme).toBe('dark');
    expect(s.run).toBeNull();
    expect(s.exam).toBeNull();
    expect(s.mocks).toEqual([]);
    expect({ ...s.qs }).toEqual({});
  });

  it('round-trips a full state through JSON', () => {
    const s = defaultState();
    startRun(s, 'module', 'm90', quizBank(), T, seq());
    answerRun(s, quizBank()[0], [0], T + 1);
    startExam(s, 'pca', quizBank(5, 'mock-pca'), T, seq());
    markExam(s, 'q-mock-pca-100', { a: [1], f: true }, T + 2);
    expect(copy(s)).toEqual(s);
  });

  it('bounds and validates every new field', () => {
    const hostile = JSON.parse(
      JSON.stringify({
        qs: { 'q-m90-001': { seen: 1e12, right: 5e12, last: 'yes', at: -1, xp: 99 }, '<x>': { seen: 1 }, 'q-m90-002': { seen: 0 } },
        srs: { 'q-m90-001': { step: 9, due: '2026-11-10' }, 'q-m90-002': { step: 0, due: 'tomorrow' } },
        quizzes: { m90: { best: 500, passed: -4, tries: [{ at: 1, score: 99, n: 15 }, { at: 'x', score: 1, n: 1 }] } },
        run: { kind: 'module', of: 'm90', t0: 1, ids: ['q-m90-001', 'q-m90-001'], ord: [[0, 1, 2, 3], [0, 1, 2, 3]], ans: {}, i: 0 },
        exam: { cert: 'pca', t0: 10, end: 10 + 10 * 60 * 60 * 1000, ids: ['q-m90-001'], ord: [[0, 1, 2, 3]], marks: {} },
        mocks: [{ cert: 'pca', t0: 1, at: 2, score: 70, n: 60, dom: { P1: [99, 11], hack: [1, 1], __proto__: [1, 1] }, mins: 1e9 }, { cert: 'xyz', t0: 1, at: 1, n: 1 }],
        rowBest: 1e9,
        runOff: 'x',
      }),
    );
    const s = parseState(hostile);
    expect(s.qs['q-m90-001']).toEqual({ seen: 1_000_000, right: 1_000_000, last: 0, at: 0, xp: 99 });
    expect(Object.keys(s.qs)).toEqual(['q-m90-001']);
    expect(s.srs['q-m90-001']).toEqual({ step: 2, due: '2026-11-10' });
    expect(Object.keys(s.srs)).toEqual(['q-m90-001']);
    expect(s.quizzes.m90).toEqual({ best: 100, passed: 0, tries: [{ at: 1, score: 15, n: 15 }] });
    expect(s.run).toBeNull(); // the same question twice
    expect(s.exam).toBeNull(); // a ten-hour clock
    expect(s.mocks).toHaveLength(1);
    expect(s.mocks[0]).toMatchObject({ score: 60, n: 60, pct: 100, mins: 240 });
    expect({ ...s.mocks[0].dom }).toEqual({ P1: [11, 11] });
    expect(s.rowBest).toBe(1000);
    expect(s.runOff).toBe(0);
  });

  it('keeps a run whose picks and orders are valid, and drops answers to questions not in it', () => {
    const s = parseState({
      run: { kind: 'step', of: 'm90-s01', t0: 5, ids: ['q-m90-001'], ord: [[2, 0, 1, 3]], ans: { 'q-m90-001': { a: [7], at: 1 }, 'q-m90-999': { a: [0], at: 1 } }, i: 40, row: 9, rowMax: 0 },
    });
    expect(s.run).toMatchObject({ kind: 'step', of: 'm90-s01', i: 0, row: 0, rowMax: 0 });
    expect({ ...s.run!.ans }).toEqual({});
  });
});

describe('module quiz runs', () => {
  it('fails, then passes, recording the best and the first pass', () => {
    const bank = quizBank();
    const by = new Map(bank.map((x) => [x.id, x]));
    const s = defaultState();
    startRun(s, 'module', 'm90', bank, T, seq());
    bank.forEach((x, i) => answerRun(s, x, i < 11 ? [0] : [1], T + i));
    expect(nextOpen(s.run!, 0)).toBe(-1);
    finishRun(s, by, T + 100);
    expect(s.quizzes.m90).toMatchObject({ best: 73, passed: 0 });
    dropRun(s);
    expect(s.runOff).toBe(T);
    startRun(s, 'module', 'm90', bank, T + MIN, seq());
    bank.forEach((x, i) => answerRun(s, x, i < 12 ? [0] : [1], T + MIN + i));
    finishRun(s, by, T + MIN + 100);
    expect(s.quizzes.m90.passed).toBe(T + MIN + 100);
    expect(s.quizzes.m90.best).toBe(80);
    expect(s.quizzes.m90.tries).toHaveLength(2);
    expect(s.rowBest).toBe(12);
  });

  it('answers a question once and counts the run of right answers', () => {
    const bank = quizBank(4);
    const s = defaultState();
    startRun(s, 'review', '', bank, T, seq());
    expect(answerRun(s, bank[0], [0], T)).toEqual({ right: true, xp: true });
    expect(answerRun(s, bank[0], [1], T)).toBeNull();
    answerRun(s, bank[1], [0], T);
    answerRun(s, bank[2], [2], T);
    expect(s.run).toMatchObject({ row: 0, rowMax: 2 });
    expect(nextOpen(s.run!, 0)).toBe(3);
    expect(s.srs[bank[2].id].due).toBe('2026-11-10');
  });
});

describe('mergeStates, version 2 rules', () => {
  it('per question, history and review come from the copy that answered it more', () => {
    const a = defaultState();
    const b = defaultState();
    a.qs['q-m90-001'] = { seen: 3, right: 1, last: 0, at: 30, xp: 1 };
    a.srs['q-m90-001'] = { step: 0, due: '2026-11-10' };
    b.qs['q-m90-001'] = { seen: 1, right: 1, last: 1, at: 50, xp: 1 };
    b.qs['q-m90-002'] = { seen: 1, right: 0, last: 0, at: 50, xp: 0 };
    b.srs['q-m90-002'] = { step: 0, due: '2026-11-11' };
    for (const m of [mergeStates(a, b), mergeStates(b, a)]) {
      expect(m.qs['q-m90-001'].seen).toBe(3);
      expect(m.srs['q-m90-001']).toEqual({ step: 0, due: '2026-11-10' });
      expect(m.qs['q-m90-002'].seen).toBe(1);
      expect(m.srs['q-m90-002']).toEqual({ step: 0, due: '2026-11-11' });
    }
  });

  it('the same question answered on two devices: the copy that answered more, then the newer answer', () => {
    const a = defaultState();
    const b = defaultState();
    // Both answered it once since they last agreed; B answered later and retired it from review.
    a.qs.x = { seen: 4, right: 3, last: 0, at: 100, xp: 2 };
    a.srs.x = { step: 0, due: '2026-11-10' };
    b.qs.x = { seen: 4, right: 4, last: 1, at: 200, xp: 3 };
    for (const m of [mergeStates(a, b), mergeStates(b, a)]) {
      expect(m.qs.x).toEqual({ seen: 4, right: 4, last: 1, at: 200, xp: 3 });
      expect('x' in m.srs).toBe(false);
    }
    // Card questions follow the same rule.
    a.answers['q-m90-s01'] = { right: false, n: 2, at: 1 };
    b.answers['q-m90-s01'] = { right: true, n: 1, at: 9 };
    expect(mergeStates(b, a).answers['q-m90-s01']).toEqual({ right: false, n: 2, at: 1 });
  });

  it('module quizzes keep the best result, the earliest pass and every try', () => {
    const a = defaultState();
    const b = defaultState();
    a.quizzes.m90 = { best: 73, passed: 0, tries: [{ at: 1, score: 11, n: 15 }] };
    b.quizzes.m90 = { best: 87, passed: 20, tries: [{ at: 2, score: 13, n: 15 }] };
    b.quizzes.m91 = { best: 80, passed: 30, tries: [{ at: 3, score: 12, n: 15 }] };
    const m = mergeStates(a, b);
    expect(m.quizzes.m90).toEqual({ best: 87, passed: 20, tries: [{ at: 1, score: 11, n: 15 }, { at: 2, score: 13, n: 15 }] });
    expect(m.quizzes.m91.passed).toBe(30);
  });

  it('the same quiz run on two devices keeps every answer and the first check of each', () => {
    const bank = quizBank(4);
    const base = defaultState();
    startRun(base, 'module', 'm90', bank, T, seq());
    const a = copy(base);
    const b = copy(base);
    answerRun(a, bank[0], [0], T + 1);
    answerRun(a, bank[1], [1], T + 2);
    answerRun(b, bank[1], [0], T + 3);
    answerRun(b, bank[2], [0], T + 4);
    a.run!.i = 3;
    const m = mergeStates(a, b);
    expect(Object.keys(m.run!.ans).sort()).toEqual([bank[0].id, bank[1].id, bank[2].id].sort());
    expect(m.run!.ans[bank[1].id]).toEqual({ a: [1], at: T + 2 });
    expect(m.run!.i).toBe(3);
  });

  it('a closed run does not come back from a device that still has it; a newer run stands', () => {
    const bank = quizBank(3);
    const base = defaultState();
    startRun(base, 'module', 'm90', bank, T, seq());
    const a = copy(base);
    const b = copy(base);
    dropRun(a);
    expect(mergeStates(a, b).run).toBeNull();
    expect(mergeStates(b, a).run).toBeNull();
    startRun(b, 'step', 'm90-s01', bank, T + MIN, seq());
    expect(mergeStates(a, b).run!.kind).toBe('step');
    expect(mergeStates(b, a).run!.t0).toBe(T + MIN);
  });

  it('the same mock exam on two devices: per question the newest change', () => {
    const bank = quizBank(4, 'mock-pca');
    const base = defaultState();
    startExam(base, 'pca', bank, T, seq());
    const a = copy(base);
    const b = copy(base);
    markExam(a, bank[0].id, { a: [0] }, T + 1);
    markExam(b, bank[0].id, { a: [2] }, T + 5);
    markExam(a, bank[1].id, { f: true }, T + 6);
    markExam(b, bank[2].id, { a: [1] }, T + 2);
    for (const m of [mergeStates(a, b), mergeStates(b, a)]) {
      expect(m.exam!.marks[bank[0].id].a).toEqual([2]);
      expect(m.exam!.marks[bank[1].id]).toMatchObject({ a: [], f: true });
      expect(m.exam!.marks[bank[2].id].a).toEqual([1]);
      expect(m.exam!.done).toBe(0);
    }
  });

  it('a mock exam finished on one device while open on another: the finished copy wins, counted once', () => {
    const bank = quizBank(4, 'mock-pca');
    const by = new Map(bank.map((x) => [x.id, x]));
    const base = defaultState();
    startExam(base, 'pca', bank, T, seq());
    const pc = copy(base);
    const phone = copy(base);
    bank.forEach((x) => markExam(pc, x.id, { a: [0] }, T + MIN));
    submitExam(pc, by, T + 2 * MIN, false);
    // The phone, still open, changes an answer after the submit.
    markExam(phone, bank[0].id, { a: [3] }, T + 3 * MIN);
    for (const m of [mergeStates(pc, phone), mergeStates(phone, pc)]) {
      expect(m.exam!.done).toBe(T + 2 * MIN);
      expect(m.exam!.marks[bank[0].id].a).toEqual([0]);
      expect(m.mocks).toHaveLength(1);
      expect(m.mocks[0]).toMatchObject({ score: 4, n: 4, pct: 100 });
    }
    // Both submit (the phone's clock ran out before it heard the news): still one result.
    submitExam(phone, by, T + 91 * MIN, true);
    const both = mergeStates(phone, pc);
    expect(both.mocks).toHaveLength(1);
    expect(both.exam!.done).toBe(T + 2 * MIN);
  });

  it('a closed mock exam does not come back', () => {
    const base = defaultState();
    startExam(base, 'otca', quizBank(2, 'mock-otca'), T, seq());
    const a = copy(base);
    const b = copy(base);
    dropExam(a);
    expect(mergeStates(b, a).exam).toBeNull();
    expect(mergeStates(a, b).examOff).toBe(T);
  });

  it('keeps the longest run of right answers and both lists of mock results', () => {
    const a = defaultState();
    const b = defaultState();
    a.rowBest = 7;
    b.rowBest = 3;
    a.mocks = [{ cert: 'pca', t0: 1, at: 2, score: 1, n: 1, pct: 100, dom: {}, mins: 1 }];
    b.mocks = [{ cert: 'otca', t0: 3, at: 4, score: 0, n: 1, pct: 0, dom: {}, mins: 1 }];
    const m = mergeStates(a, b);
    expect(m.rowBest).toBe(7);
    expect(m.mocks.map((x) => x.cert)).toEqual(['pca', 'otca']);
  });
});

describe('mock exam submit', () => {
  it('scores unanswered questions as wrong, learns only answered ones, closes at the end when time ran out', () => {
    const bank = [q('q-mock-pca-001', { pool: 'mock-pca', domain: 'P1' }), q('q-mock-pca-002', { pool: 'mock-pca', domain: 'P3' })];
    const s = defaultState();
    startExam(s, 'pca', bank, T, seq());
    markExam(s, 'q-mock-pca-001', { a: [0] }, T + MIN);
    markExam(s, 'q-mock-pca-002', { a: [0] }, T + 91 * MIN); // after the end: ignored
    submitExam(s, new Map(bank.map((x) => [x.id, x])), T + 95 * MIN, true);
    expect(s.exam).toMatchObject({ done: T + 90 * MIN, timeUp: true });
    expect(s.mocks[0]).toMatchObject({ score: 1, n: 2, pct: 50, mins: 90 });
    expect({ ...s.mocks[0].dom }).toEqual({ P1: [1, 1], P3: [0, 1] });
    expect(Object.keys(s.qs)).toEqual(['q-mock-pca-001']);
  });
});

describe('settings in a merge (settingsAt)', () => {
  const withSettings = (theme: 'light' | 'dark', labSeed: string, settingsAt?: number) =>
    parseState({ v: 2, savedAt: 1, settings: { theme, labSeed, effects: theme === 'light', sound: true }, ...(settingsAt === undefined ? {} : { settingsAt }) });
  const SEED = '0123456789abcdef';

  it('local settings changed later win as a whole', () => {
    const local = withSettings('light', SEED, 200);
    const server = withSettings('dark', '', 100);
    const m = mergeStates(local, server);
    expect(m.settings).toEqual(local.settings);
    expect(m.settingsAt).toBe(200);
  });

  it('server settings changed later win as a whole', () => {
    const local = withSettings('light', SEED, 100);
    const server = withSettings('dark', '', 200);
    const m = mergeStates(local, server);
    expect(m.settings).toEqual(server.settings);
    expect(m.settingsAt).toBe(200);
  });

  it('a copy from before the field counts as older than any copy with it', () => {
    const v1 = parseState({ v: 1, settings: { theme: 'dark', labSeed: 'ffffffffffffffff' } });
    expect(v1.settingsAt).toBe(0);
    const v2 = withSettings('light', SEED, 1);
    expect(mergeStates(v1, v2).settings.labSeed).toBe(SEED);
    expect(mergeStates(v2, v1).settings.labSeed).toBe(SEED);
    // Neither copy has a change time: the server copy, as before.
    expect(mergeStates(withSettings('light', SEED), withSettings('dark', '')).settings.theme).toBe('dark');
  });

  it('bounds settingsAt like every other time', () => {
    expect(parseState({ settingsAt: -5 }).settingsAt).toBe(0);
    expect(parseState({ settingsAt: 'soon' }).settingsAt).toBe(0);
    expect(parseState({ settingsAt: 1e20 }).settingsAt).toBe(4_102_444_800_000);
    expect(parseState({ settingsAt: 12.7 }).settingsAt).toBe(12);
  });
});
