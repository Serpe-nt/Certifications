// npm run check:content [-- --final] [-- --dir <folder>]
// Checks the rules of the content contract that a schema cannot express, over the whole
// content folder. It runs before every build. Exit code 1 when any error is found.
//
// Ids are compared with the base branch (LGTM_BASE_REF, default origin/main, then main):
// a step file must keep its id, and no step id may disappear. Without git or the base
// branch this part is skipped with a notice.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { contentRoot } from '../src/lib/build-env.ts';
import { loadCorpus, splitFrontmatter } from '../src/lib/content-load.ts';
import { checkContent, formatIssue, type BaseIds } from '../src/lib/content-rules.ts';

const args = process.argv.slice(2);
const final = args.includes('--final');
const dirArg = args.indexOf('--dir');
const root = dirArg >= 0 ? path.resolve(args[dirArg + 1]) : contentRoot();

function git(argv: string[], cwd: string): string {
  return execFileSync('git', argv, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function baseIds(): BaseIds | string {
  try {
    const top = git(['rev-parse', '--show-toplevel'], root).trim();
    const candidates = process.env.LGTM_BASE_REF ? [process.env.LGTM_BASE_REF] : ['origin/main', 'main'];
    const ref = candidates.find((r) => {
      try {
        git(['rev-parse', '--verify', '--quiet', `${r}^{commit}`], top);
        return true;
      } catch {
        return false;
      }
    });
    if (!ref) return `no base branch (${candidates.join(', ')}) in this checkout`;
    const prefix = path.relative(top, path.join(root, 'steps')).split(path.sep).join('/');
    const files = git(['ls-tree', '-r', '--name-only', ref, '--', `${prefix}/`], top).split('\n').filter((f) => f.endsWith('.mdx'));
    const steps = new Map<string, string>();
    for (const f of files) {
      const text = git(['show', `${ref}:${f}`], top);
      try {
        const id = (splitFrontmatter(text).front as { id?: unknown })?.id;
        if (typeof id === 'string') steps.set(`steps/${f.slice(prefix.length + 1)}`, id);
      } catch {
        // A file that was broken on the base branch has no id to protect.
      }
    }
    return { ref, steps };
  } catch {
    return 'this folder is not in a git checkout, or git is missing';
  }
}

const base = baseIds();
if (typeof base === 'string') console.log(`check:content: id history not checked: ${base}.`);

const corpus = loadCorpus(root);
const { issues, checked } = checkContent(corpus, { final, base: typeof base === 'string' ? undefined : base });
for (const i of issues) console.log(formatIssue(i));
const errors = issues.filter((i) => i.level === 'error').length;
const where = path.relative(process.cwd(), root) || '.';
console.log(
  `check:content: ${where}: ${checked.modules.length} modules, ${checked.steps.length} steps, ${checked.questions.length} questions; ` +
    `${errors} errors, ${issues.length - errors} warnings.`,
);
process.exit(errors ? 1 : 0);
