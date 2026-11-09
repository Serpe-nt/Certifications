// npm run check:links [-- --dir <folder>]
// Checks that every source URL in the content (step sources, question sources) answers 200,
// following redirects. Needs the network, so it is not part of `npm test`.
import path from 'node:path';
import { contentRoot } from '../src/lib/build-env.ts';
import { loadCorpus } from '../src/lib/content-load.ts';
import { checkContent } from '../src/lib/content-rules.ts';

const args = process.argv.slice(2);
const dirArg = args.indexOf('--dir');
const root = dirArg >= 0 ? path.resolve(args[dirArg + 1]) : contentRoot();
const { checked } = checkContent(loadCorpus(root));

const uses = new Map<string, string[]>();
const add = (url: string, where: string) => uses.set(url, [...(uses.get(url) ?? []), where]);
for (const s of checked.steps) for (const src of s.data.sources) add(src.url, s.file);
for (const q of checked.questions) add(q.data.source, `${q.file} ${q.data.id}`);

async function status(url: string): Promise<number | string> {
  const opts = { redirect: 'follow' as const, signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'lgtm-learn-link-check' } };
  try {
    const head = await fetch(url, { ...opts, method: 'HEAD' });
    if (head.status === 200) return 200;
    // Some sites refuse HEAD; ask again with GET before calling the link broken.
    const get = await fetch(url, { ...opts, method: 'GET' });
    await get.body?.cancel();
    return get.status;
  } catch (err) {
    return (err as Error).name === 'TimeoutError' ? 'timeout' : (err as Error).message;
  }
}

const urls = [...uses.keys()].sort();
let broken = 0;
const queue = [...urls];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const s = await status(url);
      if (s !== 200) {
        broken++;
        console.log(`error: ${url}: answered ${s}; used by ${uses.get(url)!.join(', ')}`);
      }
    }
  }),
);
console.log(`check:links: ${urls.length} URLs, ${broken} broken.`);
process.exit(broken ? 1 : 0);
