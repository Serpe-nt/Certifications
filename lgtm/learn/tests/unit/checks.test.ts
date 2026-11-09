import { describe, expect, it } from 'vitest';
import { grade, MAX_INPUT } from '../../src/lib/checks.ts';
import { checkSchema } from '../../src/lib/schema.ts';

const pass = { ok: true };

describe('exact', () => {
  const c = checkSchema.parse({ kind: 'exact', prompt: 'p', answers: ['Ready', '0.5'] });
  it('trims and ignores case', async () => {
    expect(await grade(c, '  READY \n')).toEqual(pass);
    expect(await grade(c, '0.5')).toEqual(pass);
  });
  it('refuses anything else', async () => {
    expect(await grade(c, 'ready!')).toEqual({ ok: false, reason: 'wrong' });
    expect(await grade(c, '   ')).toEqual({ ok: false, reason: 'empty' });
  });
  it('a single answer works too', async () => {
    expect(await grade(checkSchema.parse({ kind: 'exact', prompt: 'p', answer: 'x' }), 'X')).toEqual(pass);
  });
});

describe('regex', () => {
  const c = checkSchema.parse({ kind: 'regex', prompt: 'p', pattern: '[0-9a-f]{32}' });
  it('matches the whole trimmed text', async () => {
    expect(await grade(c, ` ${'a'.repeat(32)} `)).toEqual(pass);
    expect(await grade(c, `x${'a'.repeat(32)}`)).toEqual({ ok: false, reason: 'wrong' });
    expect(await grade(c, 'a'.repeat(31))).toEqual({ ok: false, reason: 'wrong' });
  });
  it('a pattern with alternatives is still anchored as a whole', async () => {
    const alt = checkSchema.parse({ kind: 'regex', prompt: 'p', pattern: 'ab|cd' });
    expect(await grade(alt, 'abx')).toEqual({ ok: false, reason: 'wrong' });
    expect(await grade(alt, 'cd')).toEqual(pass);
  });
});

describe('range', () => {
  const c = checkSchema.parse({ kind: 'range', prompt: 'p', min: 0.1, max: 0.5 });
  it('includes both bounds', async () => {
    expect(await grade(c, '0.1')).toEqual(pass);
    expect(await grade(c, '0.5')).toEqual(pass);
    expect(await grade(c, '.25')).toEqual(pass);
    expect(await grade(c, '2.5e-1')).toEqual(pass);
  });
  it('refuses numbers outside and text', async () => {
    expect(await grade(c, '0.51')).toEqual({ ok: false, reason: 'wrong' });
    expect(await grade(c, '0.3s')).toEqual({ ok: false, reason: 'not-a-number' });
    expect(await grade(c, 'Infinity')).toEqual({ ok: false, reason: 'not-a-number' });
  });
});

describe('choice', () => {
  it('accepts the answer given as text or as an index', async () => {
    const byText = checkSchema.parse({ kind: 'choice', prompt: 'p', options: ['a', 'b'], answer: 'b' });
    const byIndex = checkSchema.parse({ kind: 'choice', prompt: 'p', options: ['a', 'b'], answer: 1 });
    expect(await grade(byText, 'b')).toEqual(pass);
    expect(await grade(byIndex, 'b')).toEqual(pass);
    expect(await grade(byIndex, 'a')).toEqual({ ok: false, reason: 'wrong' });
  });
});

describe('token', () => {
  const log = checkSchema.parse({ kind: 'token', prompt: 'p', slot: 'log-m12-3' });
  const metric = checkSchema.parse({ kind: 'token', prompt: 'p', slot: 'metric-m12-3' });
  const seed = '0123456789abcdef';
  it('needs a seed', async () => {
    expect(await grade(log, '3c7b30fb')).toEqual({ ok: false, reason: 'no-seed' });
    expect(await grade(log, '3c7b30fb', { seed: 'short' })).toEqual({ ok: false, reason: 'no-seed' });
  });
  it('compares log and span tokens without case', async () => {
    expect(await grade(log, ' 3C7B30FB ', { seed })).toEqual(pass);
    expect(await grade(log, '3c7b30fc', { seed })).toEqual({ ok: false, reason: 'wrong' });
  });
  it('compares metric tokens as numbers', async () => {
    expect(await grade(metric, '966435', { seed })).toEqual(pass);
    expect(await grade(metric, '966435.0', { seed })).toEqual(pass);
    expect(await grade(metric, '966436', { seed })).toEqual({ ok: false, reason: 'wrong' });
  });
  it('accepts a seed typed in upper case', async () => {
    expect(await grade(log, '3c7b30fb', { seed: ' 0123456789ABCDEF ' })).toEqual(pass);
  });
});

it('refuses overlong input without parsing it', async () => {
  const c = checkSchema.parse({ kind: 'regex', prompt: 'p', pattern: '.*' });
  expect(await grade(c, 'x'.repeat(MAX_INPUT + 1))).toEqual({ ok: false, reason: 'wrong' });
});

describe('check schema', () => {
  it('rejects broken checks', () => {
    expect(checkSchema.safeParse({ kind: 'regex', prompt: 'p', pattern: '(' }).success).toBe(false);
    expect(checkSchema.safeParse({ kind: 'range', prompt: 'p', min: 2, max: 1 }).success).toBe(false);
    expect(checkSchema.safeParse({ kind: 'choice', prompt: 'p', options: ['a', 'b'], answer: 'c' }).success).toBe(false);
    expect(checkSchema.safeParse({ kind: 'token', prompt: 'p', slot: 'log-x-1' }).success).toBe(false);
    expect(checkSchema.safeParse({ kind: 'exact', prompt: 'p' }).success).toBe(false);
    expect(checkSchema.safeParse({ kind: 'magic', prompt: 'p' }).success).toBe(false);
  });
});
