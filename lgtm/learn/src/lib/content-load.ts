// Reads the content folder from disk for scripts/check-content.ts and the unit tests.
// The site itself reads content through Astro's collections (src/content.config.ts).
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export interface RawFile<T = unknown> {
  /** Path relative to the content root, with forward slashes. */
  file: string;
  data: T;
  /** MDX body (steps only). */
  body?: string;
  /** Set when the file could not be parsed at all. */
  parseError?: string;
}

export interface RawCorpus {
  root: string;
  modules: RawFile[];
  steps: RawFile[];
  questions: RawFile[];
}

function walk(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out.sort();
}

function rel(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

function parseYaml(text: string): unknown {
  return YAML.parse(text, { prettyErrors: true });
}

/** Splits an MDX file into its YAML frontmatter and its body. */
export function splitFrontmatter(text: string): { front: unknown; body: string } {
  const normalised = text.replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(normalised);
  if (!m) throw new Error('the file does not start with a --- frontmatter block');
  return { front: parseYaml(m[1]), body: normalised.slice(m[0].length) };
}

export function loadCorpus(root: string): RawCorpus {
  const read = (sub: string, ext: string, parse: (text: string) => Omit<RawFile, 'file'>): RawFile[] =>
    walk(path.join(root, sub), ext).map((full) => {
      const file = rel(root, full);
      try {
        return { file, ...parse(fs.readFileSync(full, 'utf8')) };
      } catch (err) {
        return { file, data: undefined, parseError: (err as Error).message };
      }
    });
  return {
    root,
    modules: read('modules', '.yaml', (t) => ({ data: parseYaml(t) })),
    steps: read('steps', '.mdx', (t) => {
      const { front, body } = splitFrontmatter(t);
      return { data: front, body };
    }),
    questions: read('questions', '.yaml', (t) => ({ data: parseYaml(t) })),
  };
}
