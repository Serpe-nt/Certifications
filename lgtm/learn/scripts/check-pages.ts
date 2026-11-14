// npm run check:pages (runs after every build)
// What a learner copies must be what the author wrote. For every <Cmd>, <Query> and fenced
// code block of every step, the text on the built page must equal the text in the source,
// character for character. Markdown can change it on the way: smart punctuation turns
// `--flag` into an en dash and quotes into curly ones in plain text, and a list item's indent
// is removed from the later lines of a multi-line <Cmd>. Exit code 1 when any block differs.
import fs from 'node:fs';
import path from 'node:path';
import { contentRoot } from '../src/lib/build-env.ts';
import { loadCorpus } from '../src/lib/content-load.ts';
import { maskCode, templateRaw } from '../src/lib/mdx-scan.ts';

export interface SourceBlock {
  kind: 'Cmd' | 'Query' | 'fenced block';
  line: number;
  text: string;
}

const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' };

/** The value of a template string's raw text, as JavaScript reads it. */
export function cookTemplate(raw: string): string {
  return raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r?\n|[\s\S])/g, (_, e: string) => {
    if (e[0] === 'u' && e.length > 1) return String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ''), 16));
    if (e[0] === 'x' && e.length === 3) return String.fromCharCode(parseInt(e.slice(1), 16));
    if (e === '\n' || e === '\r\n') return '';
    return ESCAPES[e] ?? e;
  });
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

/** The blocks of a step body in source order, each with the text the author meant. */
export function sourceBlocks(body: string): SourceBlock[] {
  const blocks: (SourceBlock & { at: number })[] = [];
  // A fenced block's text loses up to its fence's indent on every line (CommonMark).
  for (const m of body.matchAll(/^([ \t]*)(```|~~~)[^\n]*\n([\s\S]*?)^\1\2[ \t]*$/gm)) {
    const indent = m[1].length;
    const lines = m[3].replace(/\n$/, '').split('\n');
    const text = lines.map((l) => l.replace(new RegExp(`^ {0,${indent}}`), '')).join('\n');
    blocks.push({ kind: 'fenced block', line: lineAt(body, m.index), text, at: m.index });
  }
  const masked = maskCode(body);
  for (const m of masked.matchAll(/<(Cmd|Query)\b[^>]*>/g)) {
    const kind = m[1] as 'Cmd' | 'Query';
    const start = m.index + m[0].length;
    const end = masked.indexOf(`</${kind}>`, start);
    if (end < 0) continue;
    const inner = body.slice(start, end);
    const raw = templateRaw(inner);
    blocks.push({ kind, line: lineAt(body, m.index), text: raw === null ? inner.trim() : cookTemplate(raw), at: m.index });
  }
  return blocks.sort((a, b) => a.at - b.at).map(({ at: _, ...b }) => b);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** The text of every <pre> on a built page, in page order, as the browser shows it. */
export function pageBlocks(html: string): string[] {
  return [...html.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)].map((m) =>
    m[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, e: string) => {
        if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
        return ENTITIES[e] ?? whole;
      }),
  );
}

function show(ch: string | undefined): string {
  if (ch === undefined) return 'the end of the text';
  const code = ch.codePointAt(0)!;
  const hex = `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
  return /[\x21-\x7e]/.test(ch) ? `"${ch}" (${hex})` : hex;
}

/** Where two texts first differ, as "line L, column C: expected X, found Y", or null. */
export function firstDifference(want: string, got: string): string | null {
  if (want === got) return null;
  let i = 0;
  while (i < want.length && want[i] === got[i]) i++;
  const before = want.slice(0, i);
  const line = before.split('\n').length;
  const col = i - before.lastIndexOf('\n');
  const context = want.slice(before.lastIndexOf('\n') + 1).split('\n')[0];
  return `line ${line}, column ${col}: expected ${show(want[i])}, found ${show(got[i])} in "${context.slice(0, 80)}"`;
}

/** Compares one step's source blocks with the text of its page; one message per problem. */
export function compareStep(body: string, html: string, lineOffset = 0): string[] {
  const want = sourceBlocks(body);
  const got = pageBlocks(html);
  const problems: string[] = [];
  if (want.length !== got.length) {
    problems.push(`the source has ${want.length} blocks (commands, queries, fenced blocks), the page has ${got.length}`);
  }
  want.forEach((b, i) => {
    if (i >= got.length) return;
    const d = firstDifference(b.text, got[i]);
    if (d) problems.push(`block ${i + 1}, the ${b.kind} at line ${b.line + lineOffset}: ${d}`);
  });
  return problems;
}

if (import.meta.main) {
  const root = contentRoot();
  const dist = path.resolve(process.env.LGTM_OUT || 'dist');
  const corpus = loadCorpus(root);
  let failed = 0;
  let blocks = 0;
  let steps = 0;
  for (const s of corpus.steps) {
    const id = (s.data as { id?: unknown } | undefined)?.id;
    if (typeof id !== 'string' || s.body === undefined) continue;
    const [mod, num] = id.split('-');
    const page = path.join(dist, 'm', mod, num, 'index.html');
    if (!fs.existsSync(page)) {
      console.log(`error: ${s.file}: no built page at ${path.relative(process.cwd(), page)}; run the build first`);
      failed++;
      continue;
    }
    steps++;
    blocks += sourceBlocks(s.body).length;
    // Report lines of the file, not of the body after the frontmatter.
    const offset = fs.readFileSync(path.join(root, s.file), 'utf8').split('\n').length - s.body.split('\n').length;
    for (const p of compareStep(s.body, fs.readFileSync(page, 'utf8'), offset)) {
      console.log(`error: ${s.file} (${id}): ${p}`);
      failed++;
    }
  }
  console.log(`check:pages: ${steps} steps, ${blocks} blocks; ${failed} differ from their source.`);
  process.exit(failed ? 1 : 0);
}
