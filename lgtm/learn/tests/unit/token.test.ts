import { describe, expect, it } from 'vitest';
import { tokenFor } from '../../src/lib/token.ts';
import vectors from '../fixtures/token-vectors.json' with { type: 'json' };

describe('check tokens (lab contract)', () => {
  for (const v of vectors.vectors) {
    it(`${v.seed} ${v.slot} -> ${v.token}`, async () => {
      expect(await tokenFor(v.seed, v.slot)).toBe(v.token);
    });
  }

  it('metric tokens are the hex value modulo 1,000,000 in decimal', async () => {
    for (const v of vectors.vectors.filter((x) => x.slot.startsWith('metric-'))) {
      expect(v.token).toBe(String(parseInt(v.hex8, 16) % 1_000_000));
    }
  });

  it('log and span tokens are 8 lower-case hex characters', async () => {
    expect(await tokenFor('0123456789abcdef', 'span-m01-9')).toMatch(/^[0-9a-f]{8}$/);
  });
});
