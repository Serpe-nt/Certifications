// The six figures the lessons ask for have scenes, so their pages show the scene and not the
// placeholder; a figure without a scene still gets the placeholder (Figure.astro uses hasScene).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasScene } from '../../src/figures/registry.ts';

const STEPS = path.join(import.meta.dirname, '../../src/content/steps');
const FIGURES = {
  'm02-s04-waterfall': 'm02/s04-traces-spans.mdx',
  'm02-s06-three-hops': 'm02/s06-one-request-three-signals.mdx',
  'm02-s10-series-multiply': 'm02/s10-cardinality.mdx',
  'm05-s02-explore': 'm05/s02-explore.mdx',
  'm05-s04-panel-editor': 'm05/s04-first-dashboard.mdx',
  'm05-s06-variable-editor': 'm05/s06-variables.mdx',
};

describe('lesson figures', () => {
  it.each(Object.entries(FIGURES))('%s is asked for by its step and has a scene', (id, file) => {
    expect(fs.readFileSync(path.join(STEPS, file), 'utf8')).toContain(`<Figure id="${id}"`);
    expect(hasScene(id)).toBe(true);
  });

  it('a figure without a scene keeps the placeholder', () => {
    expect(hasScene('m90-s01-later')).toBe(false);
    expect(hasScene('m99-s01-nothing')).toBe(false);
  });
});
