import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadCorpus } from '../../src/lib/content-load.ts';
import { checkContent, type Issue } from '../../src/lib/content-rules.ts';
import { scanBody, splitQuestion } from '../../src/lib/mdx-scan.ts';
import { splitRenderedQuestion } from '../../src/lib/question-html.ts';

const fixtures = path.resolve(import.meta.dirname, '../fixtures');
const errors = (issues: Issue[]) => issues.filter((i) => i.level === 'error');
const temps: string[] = [];

/** Copies the sample content into a temporary folder and applies changes to it. */
function sampleWith(changes: Record<string, string | null>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgtm-content-'));
  temps.push(dir);
  fs.cpSync(path.join(fixtures, 'content'), dir, { recursive: true });
  for (const [file, text] of Object.entries(changes)) {
    const full = path.join(dir, file);
    if (text === null) fs.rmSync(full);
    else {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, text);
    }
  }
  return dir;
}

function edit(file: string, from: string | RegExp, to: string): string {
  const text = fs.readFileSync(path.join(fixtures, 'content', file), 'utf8');
  const out = text.replace(from, to);
  if (out === text) throw new Error(`edit did not apply to ${file}`);
  return out;
}

afterEach(() => {
  for (const d of temps.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('the sample module', () => {
  it('passes every rule', () => {
    const { issues, checked } = checkContent(loadCorpus(path.join(fixtures, 'content')));
    expect(errors(issues)).toEqual([]);
    expect(checked.steps.length).toBe(8);
    expect(new Set(checked.steps.map((s) => s.data.kind))).toEqual(new Set(['concept', 'lab', 'drill', 'recap']));
    expect(new Set(checked.steps.map((s) => s.data.check?.kind).filter(Boolean))).toEqual(new Set(['exact', 'regex', 'range', 'choice', 'token']));
  });

  it('an empty content folder passes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgtm-empty-'));
    temps.push(dir);
    expect(checkContent(loadCorpus(dir)).issues).toEqual([]);
  });
});

describe('the broken fixture (Done when: names the file and the rule)', () => {
  it('reports a missing Why, a duplicate id and a token slot of another module', () => {
    const found = errors(checkContent(loadCorpus(path.join(fixtures, 'broken'))).issues).map((i) => `${i.file} ${i.rule}`);
    expect(found).toEqual([
      'steps/m90/s01-no-why.mdx missing-why',
      'steps/m90/s02-second.mdx duplicate-id',
      'steps/m90/s04-foreign-slot.mdx token-slot-module',
    ]);
  });
});

describe('rules', () => {
  const rulesFor = (changes: Record<string, string | null>, opts = {}) => errors(checkContent(loadCorpus(sampleWith(changes)), opts).issues).map((i) => `${i.file} ${i.rule}`);

  it('schema errors name the file', () => {
    expect(rulesFor({ 'steps/m90/s02-exact.mdx': edit('steps/m90/s02-exact.mdx', 'kind: lab', 'kind: lecture') })).toEqual(['steps/m90/s02-exact.mdx schema']);
  });

  it('a lab step needs a check, Do and Done', () => {
    const noCheck = edit('steps/m90/s02-exact.mdx', /check:\n(  .*\n)+/, '');
    expect(rulesFor({ 'steps/m90/s02-exact.mdx': noCheck })).toEqual(['steps/m90/s02-exact.mdx schema']);
    const noDo = edit('steps/m90/s02-exact.mdx', /<Do>[\s\S]*?<\/Do>/, '');
    expect(rulesFor({ 'steps/m90/s02-exact.mdx': noDo })).toEqual(['steps/m90/s02-exact.mdx missing-do']);
  });

  it('the Why length, the block order and raw HTML', () => {
    expect(rulesFor({ 'steps/m90/s07-recap.mdx': edit('steps/m90/s07-recap.mdx', /<Why>[\s\S]*?<\/Why>/, '<Why>Too short.</Why>') })).toEqual(['steps/m90/s07-recap.mdx why-length']);
    const swapped = edit('steps/m90/s07-recap.mdx', /(<Why>[\s\S]*?<\/Why>)\s*(<Idea>[\s\S]*?<\/Idea>)/, '$2\n\n$1');
    expect(rulesFor({ 'steps/m90/s07-recap.mdx': swapped })).toEqual(['steps/m90/s07-recap.mdx block-order']);
    const html = edit('steps/m90/s07-recap.mdx', '<Idea>', '<div>x</div>\n\n<Idea>');
    expect(rulesFor({ 'steps/m90/s07-recap.mdx': html })).toEqual(['steps/m90/s07-recap.mdx raw-html']);
  });

  it('the article form: Problem first, outcome, items and stat scales', () => {
    const f = 'steps/m90/s01-concept.mdx';
    expect(rulesFor({ [f]: edit(f, /^outcome: .*\n/m, '') })).toEqual([`${f} missing-outcome`]);
    const ideaFirst = edit(f, /(<Problem>[\s\S]*?<\/Problem>)([\s\S]*?)(<Idea>[\s\S]*?<\/Idea>)/, '$3$2$1');
    expect(rulesFor({ [f]: ideaFirst })).toEqual([`${f} problem-first`]);
    expect(rulesFor({ [f]: edit(f, '<Idea>', '<Why>A why block that belongs to the old form, long enough to pass the length rule of the old form.</Why>\n\n<Idea>') })).toEqual([`${f} mixed-form`]);
    expect(rulesFor({ [f]: edit(f, /\s*<Stage title="Second"[^\n]*/, '') })).toEqual([`${f} info-items`]);
    expect(rulesFor({ [f]: edit(f, 'amount={4} max={100}', 'amount={400} max={100}') })).toEqual([`${f} stat-scale`]);
  });

  it('HTML inside code does not count', () => {
    const code = edit('steps/m90/s07-recap.mdx', '<Idea>\n', '<Idea>\nUse `<div>` and\n\n```html\n<span>x</span>\n```\n\n');
    expect(rulesFor({ 'steps/m90/s07-recap.mdx': code })).toEqual([]);
  });

  it('the card question', () => {
    const three = edit('steps/m90/s07-recap.mdx', /- Every kind\n\n {2}Concept and recap steps have none\.\n/, '');
    expect(rulesFor({ 'steps/m90/s07-recap.mdx': three })).toEqual(['steps/m90/s07-recap.mdx question-options']);
    const noWhy = edit('steps/m90/s07-recap.mdx', '\n  Concept and recap steps have none.\n', '');
    expect(rulesFor({ 'steps/m90/s07-recap.mdx': noWhy })).toEqual(['steps/m90/s07-recap.mdx question-why']);
    const wrongId = edit('steps/m90/s07-recap.mdx', 'q-m90-s07', 'q-m90-s08');
    expect(rulesFor({ 'steps/m90/s07-recap.mdx': wrongId })).toEqual(['steps/m90/s07-recap.mdx question-id']);
    const positional = edit('steps/m90/s07-recap.mdx', '- Every kind', '- All of the above');
    expect(rulesFor({ 'steps/m90/s07-recap.mdx': positional })).toEqual(['steps/m90/s07-recap.mdx question-positional']);
  });

  it('token slots are unique', () => {
    const copy = edit('steps/m90/s06-token.mdx', 'id: m90-s06', 'id: m90-s08').replaceAll('q-m90-s06', 'q-m90-s08');
    expect(rulesFor({ 'steps/m90/s08-token.mdx': copy })).toEqual(['steps/m90/s08-token.mdx token-slot-unique']);
  });

  it('a step lives in its module folder and its file name starts with its number', () => {
    const moved = fs.readFileSync(path.join(fixtures, 'content/steps/m91/s01-only.mdx'), 'utf8');
    expect(rulesFor({ 'steps/m91/s01-only.mdx': null, 'steps/m90/s01-only.mdx': moved })).toEqual([
      'steps/m90/s01-only.mdx step-folder',
    ]);
    expect(rulesFor({ 'steps/m91/s01-only.mdx': null, 'steps/m91/s02-only.mdx': moved })).toEqual(['steps/m91/s02-only.mdx step-file-name']);
  });

  it('lab links and figures', () => {
    const badLink = edit('steps/m90/s01-concept.mdx', 'to="grafana"', 'to="google"');
    expect(rulesFor({ 'steps/m90/s01-concept.mdx': badLink })).toEqual(['steps/m90/s01-concept.mdx lablink-target']);
    const badFigure = edit('steps/m90/s01-concept.mdx', 'id="m90-s01-later"', 'id="m90-s02-later"');
    expect(rulesFor({ 'steps/m90/s01-concept.mdx': badFigure })).toEqual(['steps/m90/s01-concept.mdx figure-id']);
  });

  it('question pools', () => {
    const q = fs.readFileSync(path.join(fixtures, 'content/questions/m90.yaml'), 'utf8');
    expect(rulesFor({ 'questions/m90.yaml': q.replace('answer: [0]', 'answer: [4]') })).toEqual(['questions/m90.yaml question-answer']);
    expect(rulesFor({ 'questions/m90.yaml': q.replace('tags: [sample-metrics]', 'tags: [never-taught]') })).toEqual(['questions/m90.yaml tag-coverage']);
    expect(rulesFor({ 'questions/m90.yaml': q.replace(' (Choose two.)', '') })).toEqual(['questions/m90.yaml question-choose-two']);
    expect(rulesFor({ 'questions/m90.yaml': q.replace('id: q-m90-002', 'id: q-m90-001') })).toEqual(['questions/m90.yaml duplicate-id']);
    expect(rulesFor({ 'questions/m90.yaml': q.replace('id: q-m90-002', 'id: q-m04-002') })).toEqual(['questions/m90.yaml question-file']);
  });

  it('a mock pool may name a tag no step teaches yet, until --final', () => {
    const mock = edit('questions/mock-pca.yaml', 'tags: [sample-lab]', 'tags: [taught-later]');
    expect(rulesFor({ 'questions/mock-pca.yaml': mock })).toEqual([]);
    expect(rulesFor({ 'questions/mock-pca.yaml': mock }, { final: true })).toContain('questions/mock-pca.yaml tag-coverage');
  });

  it('pool size and competency coverage become errors with --final', () => {
    const final = rulesFor({}, { final: true });
    expect(final).toContain('questions/m90.yaml pool-size');
    expect(final).toContain('(all content) competency-coverage');
  });

  it('ids never change against the base branch', () => {
    const base = { ref: 'origin/main', steps: new Map([['steps/m90/s07-recap.mdx', 'm90-s07'], ['steps/m90/s09-gone.mdx', 'm90-s09']]) };
    expect(rulesFor({}, { base })).toEqual(['steps/m90/s09-gone.mdx id-removed']);
    const renamed = edit('steps/m90/s07-recap.mdx', 'id: m90-s07', 'id: m90-s08').replace('s07-recap', 's08-recap').replaceAll('q-m90-s07', 'q-m90-s08');
    expect(rulesFor({ 'steps/m90/s07-recap.mdx': null, 'steps/m90/s08-recap.mdx': renamed }, { base: { ref: 'origin/main', steps: new Map([['steps/m90/s07-recap.mdx', 'm90-s07']]) } })).toEqual([
      'steps/m90/s07-recap.mdx id-removed',
    ]);
  });
});

describe('scanners', () => {
  it('reads attributes that contain > and quotes', () => {
    const { tags } = scanBody('<Figure id="a-b" alt="x > y" brief=\'say "hi"\' />');
    expect(tags[0].attrs).toMatchObject({ id: 'a-b', alt: 'x > y', brief: 'say "hi"' });
  });

  it('splits a question written as the README says', () => {
    const q = splitQuestion('Stem?\n\n- One\n\n  Why one.\n\n- Two\n\n  Why two.\n');
    expect(q).toEqual({ stem: 'Stem?', options: [{ text: 'One', why: 'Why one.' }, { text: 'Two', why: 'Why two.' }] });
  });

  it('splits rendered question HTML', () => {
    const r = splitRenderedQuestion('<p>Stem?</p>\n<ul>\n<li><p>One <code>a</code></p><p>Why one.</p></li>\n<li><p>Two</p><p>Why two.</p></li>\n</ul>');
    expect(r.stem).toBe('<p>Stem?</p>');
    expect(r.options).toEqual([
      { html: 'One <code>a</code>', whyHtml: '<p>Why one.</p>' },
      { html: 'Two', whyHtml: '<p>Why two.</p>' },
    ]);
  });
});
