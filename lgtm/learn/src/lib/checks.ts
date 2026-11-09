// Grades what the learner pasted into a step's check (content contract, "Check kinds").
import type { CheckData } from './schema.ts';
import { SEED_PATTERN, normaliseSeed, tokenFor } from './token.ts';

export type Verdict =
  | { ok: true }
  | { ok: false; reason: 'wrong' | 'empty' | 'not-a-number' | 'no-seed' };

/** Longest input any check looks at; anything longer is wrong without being parsed. */
export const MAX_INPUT = 2000;

const norm = (s: string) => s.trim().toLowerCase();

function parseNumber(raw: string): number | null {
  const t = raw.trim().replace(/_/g, '');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export async function grade(check: CheckData, input: string, ctx: { seed?: string } = {}): Promise<Verdict> {
  if (typeof input !== 'string' || !input.trim()) return { ok: false, reason: 'empty' };
  if (input.length > MAX_INPUT) return { ok: false, reason: 'wrong' };
  switch (check.kind) {
    case 'exact': {
      const answers = check.answers ?? (check.answer ? [check.answer] : []);
      return answers.some((a) => norm(a) === norm(input)) ? { ok: true } : { ok: false, reason: 'wrong' };
    }
    case 'regex': {
      // Anchored: the whole pasted text (trimmed) must match the pattern.
      const re = new RegExp(`^(?:${check.pattern})$`);
      return re.test(input.trim()) ? { ok: true } : { ok: false, reason: 'wrong' };
    }
    case 'range': {
      const n = parseNumber(input);
      if (n === null) return { ok: false, reason: 'not-a-number' };
      return n >= check.min && n <= check.max ? { ok: true } : { ok: false, reason: 'wrong' };
    }
    case 'choice': {
      const right = typeof check.answer === 'number' ? check.options[check.answer] : check.answer;
      return input === right ? { ok: true } : { ok: false, reason: 'wrong' };
    }
    case 'token': {
      const seed = normaliseSeed(ctx.seed ?? '');
      if (!SEED_PATTERN.test(seed)) return { ok: false, reason: 'no-seed' };
      const expected = await tokenFor(seed, check.slot);
      if (check.slot.startsWith('metric-')) {
        // A metric token is a decimal integer; Grafana may show it as 966435 or 966435.0.
        const n = parseNumber(input);
        return n !== null && n === Number(expected) ? { ok: true } : { ok: false, reason: 'wrong' };
      }
      return norm(input) === expected ? { ok: true } : { ok: false, reason: 'wrong' };
    }
  }
}
