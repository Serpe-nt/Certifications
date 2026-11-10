import { describe, expect, it } from 'vitest';
import {
  QUIZ_SIZE,
  READY_MIN,
  addDays,
  drawByDomain,
  drawByTags,
  dueIds,
  isRight,
  learn,
  localDay,
  mockSplit,
  needed,
  optionOrder,
  passes,
  pickMock,
  pickModuleQuiz,
  pickReview,
  pickStep,
  pickWeak,
  rank,
  readiness,
  readinessItems,
  runResult,
  splitByWeight,
  validOrder,
  weakTags,
  type BankQuestion,
  type Srs,
  type Stats,
} from '../../src/lib/quiz.ts';
import { dict } from '../../src/lib/state.ts';

/** A seeded random source, so draws are repeatable. */
function seeded(seed = 1): () => number {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const q = (id: string, over: Partial<BankQuestion> = {}): BankQuestion => ({ id, pool: 'm01', tags: ['t1'], cert: 'pca', domain: 'P1', n: 4, a: [0], ...over });
const day = (d: string, h = 12) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime();

function bigBank(): BankQuestion[] {
  const out: BankQuestion[] = [];
  const domains = { otca: ['O1', 'O2', 'O3', 'O4'], pca: ['P1', 'P2', 'P3', 'P4', 'P5'] } as const;
  for (const cert of ['otca', 'pca'] as const) {
    for (const d of domains[cert]) {
      for (let i = 0; i < 40; i++) out.push(q(`q-mock-${cert}-${d}${i}`.toLowerCase(), { pool: `mock-${cert}`, cert, domain: d, tags: [`${d.toLowerCase()}-tag`] }));
      for (let i = 0; i < 5; i++) out.push(q(`q-m05-${d}${i}`.toLowerCase(), { pool: 'm05', cert, domain: d, tags: [`${d.toLowerCase()}-tag`] }));
    }
  }
  return out;
}

describe('dates', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-11-09', 4)).toBe('2026-11-13');
  });
  it('reads the local day of a moment', () => {
    expect(localDay(day('2026-11-09', 23))).toBe('2026-11-09');
    expect(localDay(day('2026-11-10', 0))).toBe('2026-11-10');
  });
});

describe('grading and pass marks', () => {
  it('needs exactly the right options', () => {
    expect(isRight({ a: [0] }, [0])).toBe(true);
    expect(isRight({ a: [0] }, [1])).toBe(false);
    expect(isRight({ a: [0, 2] }, [2, 0])).toBe(true);
    expect(isRight({ a: [0, 2] }, [0])).toBe(false);
    expect(isRight({ a: [0, 2] }, [0, 1])).toBe(false);
    expect(isRight({ a: [0] }, undefined)).toBe(false);
  });
  it('passes a 15-question quiz at 12 and a 60-question mock at 45', () => {
    expect(needed(15)).toBe(12);
    expect(passes(11, 15)).toBe(false);
    expect(passes(12, 15)).toBe(true);
    expect(needed(60, 0.75)).toBe(45);
    expect(passes(44, 60, 0.75)).toBe(false);
    expect(passes(45, 60, 0.75)).toBe(true);
    expect(passes(0, 0)).toBe(false);
  });
  it('shuffles options into a permutation', () => {
    const o = optionOrder(5, seeded(3));
    expect([...o].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(validOrder(o, 5)).toBe(true);
    expect(validOrder([0, 0, 1, 2], 4)).toBe(false);
    expect(validOrder([0, 1, 2], 4)).toBe(false);
  });
});

describe('drawing', () => {
  it('ranks unseen first, then misses, then the oldest right answers', () => {
    const qs = [q('q-m01-001'), q('q-m01-002'), q('q-m01-003'), q('q-m01-004')];
    const stats: Stats = dict();
    stats['q-m01-001'] = { seen: 1, right: 1, last: 1, at: 200, xp: 1 };
    stats['q-m01-002'] = { seen: 1, right: 0, last: 0, at: 300, xp: 0 };
    stats['q-m01-004'] = { seen: 2, right: 2, last: 1, at: 100, xp: 1 };
    expect(rank(qs, stats, seeded()).map((x) => x.id)).toEqual(['q-m01-003', 'q-m01-002', 'q-m01-004', 'q-m01-001']);
  });

  it('draws a module quiz of 15 from its own pool only', () => {
    const bank = [...Array.from({ length: 40 }, (_, i) => q(`q-m01-${100 + i}`)), ...Array.from({ length: 20 }, (_, i) => q(`q-m02-${100 + i}`, { pool: 'm02' }))];
    const quiz = pickModuleQuiz(bank, 'm01', dict(), seeded());
    expect(quiz).toHaveLength(QUIZ_SIZE);
    expect(new Set(quiz.map((x) => x.id)).size).toBe(QUIZ_SIZE);
    expect(quiz.every((x) => x.pool === 'm01')).toBe(true);
    expect(pickModuleQuiz(bank.slice(0, 5), 'm01', dict(), seeded())).toHaveLength(5);
  });

  it('draws by tag, main tag first', () => {
    const bank = [q('q-m01-001', { tags: ['b', 'a'] }), q('q-m01-002', { tags: ['a'] }), q('q-m01-003', { tags: ['c'] })];
    expect(drawByTags(bank, ['a'], 5, dict(), seeded()).map((x) => x.id)).toEqual(['q-m01-002', 'q-m01-001']);
  });

  it('draws by domain counts and gives what a short domain has', () => {
    const bank = [q('q-m01-001', { domain: 'P1' }), q('q-m01-002', { domain: 'P1' }), q('q-m01-003', { domain: 'P2' })];
    const got = drawByDomain(bank, { P1: 1, P2: 3 }, dict(), seeded());
    expect(got.filter((x) => x.domain === 'P1')).toHaveLength(1);
    expect(got.filter((x) => x.domain === 'P2')).toHaveLength(1);
  });

  it('step practice takes study questions before mock pool questions', () => {
    const bank = [q('q-mock-pca-001', { pool: 'mock-pca', tags: ['a'] }), q('q-m01-001', { tags: ['a'] }), q('q-m01-002', { tags: ['b', 'a'] }), q('q-m01-003', { tags: ['z'] })];
    expect(pickStep(['a'], bank, dict(), 3, seeded()).map((x) => x.id)).toEqual(['q-m01-001', 'q-m01-002', 'q-mock-pca-001']);
    expect(pickStep(['a'], bank, dict(), 2, seeded()).map((x) => x.id)).toEqual(['q-m01-001', 'q-m01-002']);
  });

  it('weak-spot practice prefers missed topics and caps each topic', () => {
    const bank = [...Array.from({ length: 8 }, (_, i) => q(`q-m01-10${i}`, { tags: ['weak'] })), ...Array.from({ length: 8 }, (_, i) => q(`q-m01-20${i}`, { tags: ['strong'] }))];
    const stats: Stats = dict();
    for (let i = 0; i < 4; i++) stats[`q-m01-10${i}`] = { seen: 2, right: 0, last: 0, at: 1, xp: 0 };
    for (let i = 0; i < 4; i++) stats[`q-m01-20${i}`] = { seen: 2, right: 2, last: 1, at: 1, xp: 1 };
    const got = pickWeak(bank, stats, 6, seeded());
    expect(got).toHaveLength(6);
    expect(got.filter((x) => x.tags[0] === 'weak')).toHaveLength(4);
    expect(weakTags(bank, stats).map((t) => t.tag)).toEqual(['weak', 'strong']);
  });
});

describe('mock exams', () => {
  it('splits 60 questions by the official weights', () => {
    expect(mockSplit('otca')).toEqual({ O1: 11, O2: 28, O3: 15, O4: 6 });
    expect(mockSplit('pca')).toEqual({ P1: 11, P2: 12, P3: 17, P4: 9, P5: 11 });
    for (const cert of ['otca', 'pca'] as const) expect(Object.values(mockSplit(cert)).reduce((a, b) => a + b, 0)).toBe(60);
    expect(splitByWeight({ a: 1, b: 1, c: 1 }, 10)).toEqual({ a: 4, b: 3, c: 3 });
  });

  it('draws the right count per domain, mock pool first, never the other exam', () => {
    const bank = bigBank();
    for (const cert of ['otca', 'pca'] as const) {
      const got = pickMock(cert, bank, dict(), seeded(7));
      expect(got).toHaveLength(60);
      expect(new Set(got.map((x) => x.id)).size).toBe(60);
      for (const [d, n] of Object.entries(mockSplit(cert))) expect(got.filter((x) => x.domain === d)).toHaveLength(n);
      expect(got.every((x) => x.cert === cert && x.pool === `mock-${cert}`)).toBe(true);
    }
  });

  it('fills a short domain from study questions of the same domain', () => {
    const keep = new Set(['q-mock-otca-o40', 'q-mock-otca-o41', 'q-mock-otca-o42']);
    const bank = bigBank().filter((x) => !(x.domain === 'O4' && x.pool === 'mock-otca' && !keep.has(x.id)));
    const got = pickMock('otca', bank, dict(), seeded(2)).filter((x) => x.domain === 'O4');
    expect(got.length).toBe(6);
    expect(got.filter((x) => x.pool === 'mock-otca')).toHaveLength(3);
    expect(got.filter((x) => x.pool === 'm05')).toHaveLength(3);
  });

  it('scores per domain', () => {
    const qs = [q('q-m01-001', { domain: 'P1' }), q('q-m01-002', { domain: 'P1' }), q('q-m01-003', { domain: 'P3', tags: ['x'] })];
    const r = runResult(qs, (id) => (id === 'q-m01-001' ? [0] : [1]));
    expect(r).toMatchObject({ score: 1, n: 3, pct: 33, byDomain: { P1: [1, 2], P3: [0, 1] } });
    expect(r.missedTags).toEqual(['t1', 'x']);
  });
});

describe('spaced repetition', () => {
  it('brings a miss back after 1, then 2, then 4 days, then retires it', () => {
    const stats: Stats = dict();
    const srs: Srs = dict();
    const id = 'q-m01-001';
    learn(stats, srs, id, false, day('2026-11-09'));
    expect(srs[id]).toEqual({ step: 0, due: '2026-11-10' });
    expect(pickReview([q(id)], srs, '2026-11-09')).toHaveLength(0);
    expect(pickReview([q(id)], srs, '2026-11-10')).toHaveLength(1);
    // A right answer before it is due does not move it on.
    learn(stats, srs, id, true, day('2026-11-09', 18));
    expect(srs[id]).toEqual({ step: 0, due: '2026-11-10' });
    learn(stats, srs, id, true, day('2026-11-10'));
    expect(srs[id]).toEqual({ step: 1, due: '2026-11-12' });
    learn(stats, srs, id, true, day('2026-11-12'));
    expect(srs[id]).toEqual({ step: 2, due: '2026-11-16' });
    learn(stats, srs, id, true, day('2026-11-16'));
    expect(id in srs).toBe(false);
    expect(stats[id]).toMatchObject({ seen: 5, right: 4, last: 1 });
  });

  it('a late answer counts, and a miss on the way starts over', () => {
    const stats: Stats = dict();
    const srs: Srs = dict();
    learn(stats, srs, 'q-m01-001', false, day('2026-11-01'));
    learn(stats, srs, 'q-m01-001', true, day('2026-11-05'));
    expect(srs['q-m01-001']).toEqual({ step: 1, due: '2026-11-07' });
    learn(stats, srs, 'q-m01-001', false, day('2026-11-07'));
    expect(srs['q-m01-001']).toEqual({ step: 0, due: '2026-11-08' });
  });

  it('XP only for answers that teach: first right, right after a miss, right when due', () => {
    const stats: Stats = dict();
    const srs: Srs = dict();
    expect(learn(stats, srs, 'a', true, day('2026-11-01')).xp).toBe(true);
    expect(learn(stats, srs, 'a', true, day('2026-11-01')).xp).toBe(false);
    expect(learn(stats, srs, 'a', false, day('2026-11-01')).xp).toBe(false);
    expect(learn(stats, srs, 'a', true, day('2026-11-01')).xp).toBe(true);
    expect(stats.a.xp).toBe(2);
  });

  it('orders due questions by how overdue they are', () => {
    const srs: Srs = dict();
    srs.b = { step: 0, due: '2026-11-05' };
    srs.a = { step: 1, due: '2026-11-03' };
    srs.c = { step: 0, due: '2026-11-20' };
    expect(dueIds(srs, '2026-11-09')).toEqual(['a', 'b']);
  });

  it('ignores prototype keys in ids', () => {
    const stats: Stats = dict();
    const srs: Srs = dict();
    learn(stats, srs, 'constructor', false, day('2026-11-01'));
    expect(stats.constructor).toMatchObject({ seen: 1 });
    expect(Object.getPrototypeOf(stats)).toBeNull();
  });
});

describe('readiness', () => {
  it('needs enough answers per domain, then bands by the last answers', () => {
    const bank = Array.from({ length: 30 }, (_, i) => q(`q-m01-${100 + i}`, { domain: i < 20 ? 'P1' : 'P2' }));
    const stats: Stats = dict();
    const srs: Srs = dict();
    let r = readiness('pca', readinessItems(bank, stats, srs, '2026-11-09'));
    expect(r.domains.find((d) => d.domain === 'P1')).toMatchObject({ total: 20, met: 0, band: 'unmeasured' });
    for (let i = 0; i < READY_MIN; i++) learn(stats, srs, `q-m01-${100 + i}`, i < 8, day('2026-11-09'));
    r = readiness('pca', readinessItems(bank, stats, srs, '2026-11-09'));
    expect(r.domains.find((d) => d.domain === 'P1')).toMatchObject({ met: 10, right: 8, acc: 0.8, due: 0, band: 'ready' });
    r = readiness('pca', readinessItems(bank, stats, srs, '2026-11-10'));
    expect(r.domains.find((d) => d.domain === 'P1')!.due).toBe(2);
    learn(stats, srs, 'q-m01-100', false, day('2026-11-10'));
    r = readiness('pca', readinessItems(bank, stats, srs, '2026-11-10'));
    expect(r.domains.find((d) => d.domain === 'P1')).toMatchObject({ right: 7, band: 'close' });
    expect(r.overall).toBeNull();
  });
});
