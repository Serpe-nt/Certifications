// The content contract's rules, checked over the whole content folder at once.
// Each problem names the file and the rule, so a content worker knows what to fix.
import { DOMAINS, LAB_HOSTS } from './exams.ts';
import { moduleSchema, questionFileSchema, stepSchema, SLOT_ID, STEP_ID, type ModuleData, type QuestionData, type StepData } from './schema.ts';
import { plainText, scanBody, splitQuestion } from './mdx-scan.ts';
import type { RawCorpus } from './content-load.ts';

export interface Issue {
  file: string;
  rule: string;
  message: string;
  level: 'error' | 'warning';
}

export interface RuleOptions {
  /** End-of-project coverage: pool sizes and competency coverage become errors. */
  final?: boolean;
  /** Ids per file on the base branch (see scripts/check-content.ts); omitted when unknown. */
  base?: BaseIds;
}

export interface BaseIds {
  ref: string;
  /** Step file path (relative to the content root) to its id. */
  steps: Map<string, string>;
}

/** Body components in the order the contract gives them. */
export const BODY_ORDER = ['Why', 'Idea', 'Points', 'Do', 'Done', 'Trap', 'Question'] as const;
const INLINE = ['Point', 'LabLink', 'Cmd', 'Query', 'Figure'];
const KNOWN = new Set<string>([...BODY_ORDER, ...INLINE]);
const WHY_MIN = 80;
const WHY_MAX = 420;
const MAX_POINTS = 6;
const MAX_FIGURES_PER_MODULE = 3;
export const POOL_MIN = 30;
const QUESTIONS_PER_COMPETENCY = 3;
const POSITIONAL = /\b(first|second|third|fourth|fifth|last|previous|next|above|below) (option|answer|choice)s?\b|\b(all|none|both) of the (above|options|answers)\b|\boption [a-e]\b/i;

function zodMessages(err: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return err.issues.map((i) => (i.path.length ? `${i.path.map(String).join('.')}: ${i.message}` : i.message));
}

export interface CheckedCorpus {
  modules: { file: string; data: ModuleData }[];
  steps: { file: string; data: StepData; body: string }[];
  questions: { file: string; data: QuestionData }[];
}

export function checkContent(corpus: RawCorpus, opts: RuleOptions = {}): { issues: Issue[]; checked: CheckedCorpus } {
  const issues: Issue[] = [];
  const err = (file: string, rule: string, message: string) => issues.push({ file, rule, message, level: 'error' });
  const warn = (file: string, rule: string, message: string) => issues.push({ file, rule, message, level: 'warning' });
  const checked: CheckedCorpus = { modules: [], steps: [], questions: [] };

  // 1. Every file parses and matches its schema.
  for (const f of corpus.modules) {
    if (f.parseError) { err(f.file, 'parse', f.parseError); continue; }
    const r = moduleSchema.safeParse(f.data);
    if (!r.success) { for (const m of zodMessages(r.error)) err(f.file, 'schema', m); continue; }
    const stem = f.file.replace(/^modules\//, '').replace(/\.yaml$/, '');
    if (r.data.id !== stem) err(f.file, 'module-file-name', `module id "${r.data.id}" must match the file name "${stem}.yaml"`);
    checked.modules.push({ file: f.file, data: r.data });
  }
  for (const f of corpus.steps) {
    if (f.parseError) { err(f.file, 'parse', f.parseError); continue; }
    const r = stepSchema.safeParse(f.data);
    if (!r.success) { for (const m of zodMessages(r.error)) err(f.file, 'schema', m); continue; }
    checked.steps.push({ file: f.file, data: r.data, body: f.body ?? '' });
  }
  for (const f of corpus.questions) {
    if (f.parseError) { err(f.file, 'parse', f.parseError); continue; }
    const r = questionFileSchema.safeParse(f.data ?? []);
    if (!r.success) { for (const m of zodMessages(r.error)) err(f.file, 'schema', `question ${m}`); continue; }
    for (const q of r.data) checked.questions.push({ file: f.file, data: q });
  }

  const moduleIds = new Set(checked.modules.map((m) => m.data.id));
  const dupModules = new Map<string, string>();
  for (const m of checked.modules) {
    const prev = dupModules.get(m.data.id);
    if (prev) err(m.file, 'duplicate-id', `module id "${m.data.id}" is also used by ${prev}`);
    dupModules.set(m.data.id, m.file);
  }

  // 2. Steps: ids, place, body.
  const stepIds = new Map<string, string>();
  const slots = new Map<string, string>();
  const figuresPerModule = new Map<string, number>();
  const figureIds = new Map<string, string>();
  for (const s of checked.steps) {
    const { id, kind } = s.data;
    const mod = STEP_ID.exec(id)?.[1] ?? '';
    const parts = s.file.split('/');
    const prev = stepIds.get(id);
    if (prev) err(s.file, 'duplicate-id', `step id "${id}" is also used by ${prev}`);
    stepIds.set(id, s.file);
    if (parts.length !== 3 || parts[1] !== mod) err(s.file, 'step-folder', `step "${id}" must live in steps/${mod}/`);
    const num = id.slice(mod.length + 1);
    if (!parts[parts.length - 1].startsWith(`${num}-`)) err(s.file, 'step-file-name', `the file name must start with "${num}-" to match the id "${id}"`);
    if (!moduleIds.has(mod)) err(s.file, 'unknown-module', `step "${id}" belongs to module "${mod}", which has no modules/${mod}.yaml`);

    if (s.data.check?.kind === 'token') {
      const slot = s.data.check.slot;
      const slotModule = SLOT_ID.exec(slot)?.[2];
      if (slotModule !== mod) err(s.file, 'token-slot-module', `token slot "${slot}" belongs to module ${slotModule}, not to this step's module ${mod}`);
      const used = slots.get(slot);
      if (used) err(s.file, 'token-slot-unique', `token slot "${slot}" is already used by ${used}`);
      slots.set(slot, s.file);
    }

    const { tags, rawHtml } = scanBody(s.body);
    for (const h of rawHtml) err(s.file, 'raw-html', `line ${h.line}: <${h.tag}> is raw HTML; use only the contract's components`);
    for (const t of tags) if (!KNOWN.has(t.name)) err(s.file, 'unknown-component', `line ${t.line}: <${t.name}> is not a contract component`);

    const blocks = tags.filter((t) => t.depth === 0 && (BODY_ORDER as readonly string[]).includes(t.name));
    const required = ['Why', 'Idea', 'Question', ...(kind === 'lab' || kind === 'drill' ? ['Do', 'Done'] : [])];
    for (const name of required) {
      if (!blocks.some((b) => b.name === name)) err(s.file, `missing-${name.toLowerCase()}`, `a ${kind} step needs a <${name}> block`);
    }
    const seen = new Set<string>();
    let lastRank = -1;
    for (const b of blocks) {
      if (seen.has(b.name)) err(s.file, 'block-once', `line ${b.line}: <${b.name}> appears more than once`);
      seen.add(b.name);
      const rank = BODY_ORDER.indexOf(b.name as (typeof BODY_ORDER)[number]);
      if (rank < lastRank) err(s.file, 'block-order', `line ${b.line}: <${b.name}> is out of order; the order is ${BODY_ORDER.join(', ')}`);
      lastRank = Math.max(lastRank, rank);
    }
    const why = blocks.find((b) => b.name === 'Why');
    if (why) {
      const n = plainText(why.inner).length;
      if (n < WHY_MIN || n > WHY_MAX) err(s.file, 'why-length', `<Why> has ${n} characters; it must have ${WHY_MIN} to ${WHY_MAX}`);
    }
    const points = tags.filter((t) => t.name === 'Point');
    if (points.length > MAX_POINTS) err(s.file, 'points-count', `${points.length} points; at most ${MAX_POINTS}`);
    for (const p of points) if (!p.attrs.label) err(s.file, 'point-label', `line ${p.line}: <Point> needs a label`);
    for (const t of tags.filter((x) => x.name === 'LabLink')) {
      if (!(LAB_HOSTS as readonly string[]).includes(t.attrs.to ?? '')) {
        err(s.file, 'lablink-target', `line ${t.line}: <LabLink to="${t.attrs.to ?? ''}"> must be one of ${LAB_HOSTS.join(', ')}`);
      }
      if (t.attrs.path && !t.attrs.path.startsWith('/')) err(s.file, 'lablink-path', `line ${t.line}: path must start with /`);
    }
    for (const t of tags.filter((x) => x.name === 'Query')) {
      if (!['promql', 'logql', 'traceql'].includes(t.attrs.lang ?? '')) err(s.file, 'query-lang', `line ${t.line}: <Query> needs lang="promql|logql|traceql"`);
    }
    for (const f of tags.filter((x) => x.name === 'Figure')) {
      const fid = f.attrs.id ?? '';
      if (!fid.startsWith(`${id}-`) || !/^[a-z0-9-]+$/.test(fid)) err(s.file, 'figure-id', `line ${f.line}: figure id "${fid}" must start with "${id}-" and use only a-z, 0-9 and -`);
      if (!f.attrs.alt?.trim()) err(s.file, 'figure-alt', `line ${f.line}: <Figure> needs alt text`);
      if (!f.attrs.brief?.trim()) err(s.file, 'figure-brief', `line ${f.line}: <Figure> needs a brief`);
      const other = figureIds.get(fid);
      if (other) err(s.file, 'figure-unique', `figure id "${fid}" is also used by ${other}`);
      figureIds.set(fid, s.file);
      figuresPerModule.set(mod, (figuresPerModule.get(mod) ?? 0) + 1);
    }

    const qs = tags.filter((t) => t.name === 'Question');
    for (const q of qs) {
      if (q.attrs.id !== `q-${id}`) err(s.file, 'question-id', `the card question id must be "q-${id}", not "${q.attrs.id ?? ''}"`);
      const parts = splitQuestion(q.inner);
      const n = parts.options.length;
      if (!parts.stem) err(s.file, 'question-stem', 'the card question needs its question text before the options');
      if (n !== 4) err(s.file, 'question-options', `the card question has ${n} options; it needs 4`);
      parts.options.forEach((o, i) => {
        if (!o.why) err(s.file, 'question-why', `option ${'abcd'[i] ?? i + 1} needs an explanation (a second paragraph in the list item)`);
      });
      const answer = q.attrs.answer ?? '';
      if (!/^[a-d]$/.test(answer) || 'abcd'.indexOf(answer) >= n) err(s.file, 'question-answer', `answer="${answer}" must be a letter from a to d that names one of the options`);
      if (POSITIONAL.test(parts.stem) || parts.options.some((o) => POSITIONAL.test(o.text))) {
        err(s.file, 'question-positional', 'options are shuffled on screen, so the question must not refer to positions');
      }
    }

    if (opts.base) {
      const was = opts.base.steps.get(s.file);
      if (was && was !== id) err(s.file, 'id-changed', `this file had step id "${was}" on ${opts.base.ref}; ids key saved progress and are never renamed`);
    }
  }
  for (const [mod, n] of figuresPerModule) {
    if (n > MAX_FIGURES_PER_MODULE) err(`steps/${mod}/`, 'figures-per-module', `module ${mod} asks for ${n} figures; at most ${MAX_FIGURES_PER_MODULE}`);
  }
  if (opts.base) {
    for (const [file, id] of opts.base.steps) {
      if (!stepIds.has(id)) err(file, 'id-removed', `step id "${id}" exists on ${opts.base.ref} but not here; ids key saved progress and are never removed or renamed`);
    }
  }

  // 3. Questions.
  const questionIds = new Map<string, string>();
  const taughtTags = new Set(checked.steps.flatMap((s) => s.data.tags));
  const poolSize = new Map<string, number>();
  const report = opts.final ? err : warn;
  for (const { file, data: q } of checked.questions) {
    const stem = file.replace(/^questions\//, '').replace(/\.yaml$/, '');
    const prev = questionIds.get(q.id);
    if (prev) err(file, 'duplicate-id', `question id "${q.id}" is also used in ${prev}`);
    questionIds.set(q.id, file);
    if (!q.id.startsWith(`q-${stem}-`)) err(file, 'question-file', `question "${q.id}" must start with "q-${stem}-" to live in ${stem}.yaml`);
    if (/^m\d\d$/.test(stem) && !moduleIds.has(stem)) err(file, 'unknown-module', `there is no modules/${stem}.yaml`);
    const mock = /^mock-(otca|pca)$/.exec(stem)?.[1];
    if (mock && q.exam.cert !== mock) err(file, 'mock-cert', `question "${q.id}" is in the ${mock} mock pool but maps to ${q.exam.cert}`);
    const n = q.options.length;
    const two = q.answer.length === 2;
    if (two !== (n === 5)) err(file, 'question-options', `question "${q.id}": one answer needs 4 options, two answers need 5`);
    if (two !== q.q.includes('(Choose two.)')) err(file, 'question-choose-two', `question "${q.id}": "(Choose two.)" must be in the question exactly when it has two answers`);
    if (q.answer.some((a) => a >= n)) err(file, 'question-answer', `question "${q.id}": answer index out of range (0 to ${n - 1})`);
    if (new Set(q.answer).size !== q.answer.length) err(file, 'question-answer', `question "${q.id}": the same answer index is given twice`);
    if (POSITIONAL.test(q.q) || q.options.some((o) => POSITIONAL.test(o.text) || POSITIONAL.test(o.why))) {
      err(file, 'question-positional', `question "${q.id}": options are shuffled on screen, so nothing may refer to positions`);
    }
    // A mock pool may be written before the modules whose steps teach its tags, so there a
    // missing tag is a warning until the end of the project. In a module pool it is an error.
    for (const t of q.tags) if (!taughtTags.has(t)) (mock ? report : err)(file, 'tag-coverage', `question "${q.id}": tag "${t}" is not taught by any step`);
    poolSize.set(stem, (poolSize.get(stem) ?? 0) + 1);
  }
  for (const m of checked.modules) {
    const n = poolSize.get(m.data.id) ?? 0;
    if (m.data.quiz && n < POOL_MIN) report(`questions/${m.data.id}.yaml`, 'pool-size', `module ${m.data.id} has ${n} quiz questions; it needs at least ${POOL_MIN}`);
  }

  // 4. Competency coverage (complete only at the end of the project, so a warning until then).
  const gaps: string[] = [];
  for (const [domain, d] of Object.entries(DOMAINS)) {
    for (const c of d.competencies) {
      const steps = checked.steps.filter((s) => s.data.exam.some((e) => e.domain === domain && e.competency === c)).length;
      const questions = checked.questions.filter((q) => q.data.exam.domain === domain && q.data.exam.competency === c).length;
      if (steps < 1 || questions < QUESTIONS_PER_COMPETENCY) gaps.push(`${domain} "${c}" (${steps} steps, ${questions} questions)`);
    }
  }
  if (opts.final) {
    for (const g of gaps) err('(all content)', 'competency-coverage', `${g}; each competency needs 1 step and ${QUESTIONS_PER_COMPETENCY} questions`);
  } else if (gaps.length && checked.steps.length) {
    warn('(all content)', 'competency-coverage', `${gaps.length} competencies do not yet have 1 step and ${QUESTIONS_PER_COMPETENCY} questions (run with --final to list them)`);
  }

  return { issues, checked };
}

export function formatIssue(i: Issue): string {
  return `${i.level === 'error' ? 'error' : 'warning'}: ${i.file}: ${i.rule}: ${i.message}`;
}
