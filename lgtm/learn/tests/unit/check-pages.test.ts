import { describe, expect, it } from 'vitest';
import { compareStep, cookTemplate, pageBlocks, sourceBlocks } from '../../scripts/check-pages.ts';

const page = (...blocks: string[]) => blocks.map((b) => `<div class="codeblock"><pre><code>${b}</code></pre></div>`).join('\n');

describe('check:pages', () => {
  it('reads the text an author meant, in source order', () => {
    const body = [
      '<Do>',
      '1. Run <Cmd>{`kubectl wait --for=condition=Ready pod/x`}</Cmd>',
      '2. Save this as `a.yaml`:',
      '',
      '   ```yaml',
      '   a:',
      '     b: 1',
      '   ```',
      '3. Query <Query lang="promql">{`sum(rate(x{job="a\\\\b"}[5m]))`}</Query> and <Cmd>grep \'name\' a.yaml</Cmd>',
      '</Do>',
    ].join('\n');
    expect(sourceBlocks(body)).toEqual([
      { kind: 'Cmd', line: 2, text: 'kubectl wait --for=condition=Ready pod/x' },
      { kind: 'fenced block', line: 5, text: 'a:\n  b: 1' },
      { kind: 'Query', line: 9, text: 'sum(rate(x{job="a\\b"}[5m]))' },
      { kind: 'Cmd', line: 9, text: "grep 'name' a.yaml" },
    ]);
  });

  it('cooks template strings as JavaScript does', () => {
    expect(cookTemplate('a\\nb\\\\c\\`d\\$e\\u0041\\x42')).toBe('a\nb\\c`d$eAB');
  });

  it('reads the page text with tags removed and entities decoded', () => {
    expect(pageBlocks('<pre><code><span>a &amp;&amp; &quot;b&quot; &lt;c&gt; &#39;d&#x27;</span></code></pre>')).toEqual([`a && "b" <c> 'd'`]);
  });

  it('passes when the page shows what the source holds', () => {
    const body = '1. Run <Cmd>{`echo "a" --b`}</Cmd>';
    expect(compareStep(body, page('echo &quot;a&quot; --b'))).toEqual([]);
  });

  it('names the block and the first character that differs: smart punctuation', () => {
    const body = '1. Wait: <Cmd>kubectl wait --for=condition=Ready pod/x</Cmd>';
    expect(compareStep(body, page('kubectl wait \u2013for=condition=Ready pod/x'))).toEqual([
      'block 1, the Cmd at line 1: line 1, column 14: expected "-" (U+002D), found U+2013 in "kubectl wait --for=condition=Ready pod/x"',
    ]);
  });

  it('names the line that lost its indentation', () => {
    const body = '2. Save it: <Cmd>{`kind: Pod\nmetadata:\n  name: cpu-hog`}</Cmd>';
    expect(compareStep(body, page('kind: Pod\nmetadata:\nname: cpu-hog'))).toEqual([
      'block 1, the Cmd at line 1: line 3, column 1: expected U+0020, found "n" (U+006E) in "  name: cpu-hog"',
    ]);
  });

  it('reports a page with a different number of blocks', () => {
    expect(compareStep('<Cmd>{`a`}</Cmd>', '')).toEqual(['the source has 1 blocks (commands, queries, fenced blocks), the page has 0']);
  });
});
