# W3: what a learner copies from a lesson is what the lesson tested

Beside wave 8. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

Cards C9 and C10 found on 2026-11-14 that text copied from a lesson page is not always the text the author wrote. A manifest loses its indentation, and a command gets typographic quotes and dashes. The planner confirmed both on the built pages. Fifty-four blocks in six merged modules are affected. This card repairs them, and adds the test that would have caught both.

## Owns

- The site: `lgtm/learn/scripts/check-content.ts`, a new check script if you add one, `lgtm/learn/tests/unit/**`, `lgtm/learn/package.json` for a new script entry, what draws a command, a query or a code block inside a step (`lgtm/learn/src/components/mdx/**`, their styles and the small script of the Copy button), and `lgtm/learn/astro.config.mjs` if the fix belongs there. One end-to-end test in `lgtm/learn/tests/e2e/` if you add one.
- These steps under `lgtm/learn/src/content/steps/`, and only their commands, queries and files: m01 `s10`; m03 `s08`, `s11`, `s14`; m06 `s08`, `s10`, `s11`; m07 `s07`, `s08`, `s09`; m08 `s04`, `s06`, `s08`, `s12`; m09 `s03`, `s05`, `s06`, `s08`, `s12`, `s13`. Any other merged step that your new test shows to be affected.
- The logs `lgtm/docs/verification/m01.md`, `m03.md`, `m06.md`, `m07.md`, `m08.md`, `m09.md`: one dated section each.

Not the plan, not the lab. Modules m10, m11 and m12 are in review with their own workers; do not touch them, and tell the planner if your test fails on one of them after it is merged.

## Read first

- `lgtm/docs/plan/03-content-contract.md`: the parts of a step, the line on `<Cmd>` and `<Query>`, and "things the first modules ran into".
- `lgtm/learn/PRODUCT.md` and `lgtm/learn/DESIGN.md`, before you change anything a reader sees.
- `lgtm/learn/scripts/check-content.ts` and its tests; the components that draw `<Cmd>` and `<Query>` and their Copy button; `astro.config.mjs`.
- Module m11 (`steps/m11/`, once merged; until then on the branch of pull request 82): every command is a template string and every file a fenced block. It has neither fault.

## The two faults

**Indentation.** A `<Cmd>` with a template string that runs over several lines, placed inside a numbered action of `<Do>`. Markdown treats the later lines as part of the list item and removes the item's indent from each of them, three spaces after `2. `, also inside the template string. A line indented by two spaces arrives with none. `dist/m/m06/s11/index.html` shows `metadata:` and `name: cpu-hog` in the same column; the chart of m01 step 10 comes out flat. Twelve blocks, by the line where each `<Cmd>` opens on `main` at `792c17a`:

| Step | Line | What it holds |
|---|---|---|
| m01 s10 | 76, 127, 144 | heredocs that write the chart's files and templates |
| m03 s08 | 93, 132 | a Deployment with its Service, a ServiceMonitor |
| m06 s08 | 76 | a Pod |
| m06 s11 | 82 | a Pod |
| m09 s05, s06, s08, s12, s13 | 100, 90, 88, 88, 87 | a ConfigMap with a Collector configuration |

A fenced code block under the list item keeps its indentation.

**Smart punctuation.** A `<Cmd>` or `<Query>` whose content is plain text, not a template string, goes through the site's smart punctuation like any sentence. `--for=condition=Ready` reaches the page as `–for=condition=Ready` with an en dash, and `grep 'name'` with curly quotes. Forty-two blocks in eighteen steps: m03 `s08` (1), `s11` (2), `s14` (2); m06 `s08` (1), `s10` (3); m07 `s07` (3), `s08` (2), `s09` (3); m08 `s04` (3), `s06` (4), `s08` (1), `s12` (3); m09 `s03` (3), `s05` (2), `s06` (1), `s08` (2), `s12` (3), `s13` (3). A template string is not touched.

`check:content` and the build pass on both. The lessons were tested from the workers' own files and terminals, not from the page.

## What to build

1. **The test.** For every `<Cmd>`, every `<Query>` and every fenced code block of every step, the text on the built page equals the text in the source, character for character. Write it so that it runs without a browser, on the built pages, and so that CI runs it. Its failure message names the step, the block and the first character that differs. This test is the main thing: it must fail on `main` as it is today, on exactly the blocks listed above or more.
2. **Make it pass, and keep authors out of the trap.** For the smart punctuation choose one and say why in the pull request: make the two components give back what the author wrote whatever form it has, or turn every plain-text block into a template string. Either way `check:content` refuses the form that is still unsafe, with a message that says what to write instead, and has tests for it. Do not switch smart punctuation off for the lesson text without the owner's word: the look of the articles was approved with it.
3. **The twelve files.** Rewrite each as a sentence that names the file, then a fenced block with the file's text, then the command that uses it. For m01 step 10 keep one action per file or per pair of files, whichever reads better. Change no fact, no name and no command; keep step ids, frontmatter and every other part of the step as they are.
4. **The Copy button.** A fenced code block inside a step has no Copy button today and is drawn differently from a command block. Give it the frame and the Copy button of the command block, in the site's own design; add no dependency and no CDN asset. The copied text is the block's text exactly, with its indentation and without a trailing blank line added.
5. **The proof for the files.** `helm lint` and `helm template` for the chart of m01 step 10, built from the text of the page, with the Helm the lab pins; for each manifest, a YAML parser reads the text of the page and the keys sit where the lesson says; for each Collector configuration of m09, `otelcol-contrib validate` in the image the lab pins if Docker is running, and say so if it is not. Nothing is applied to the cluster.
6. **The logs.** One dated section in each of the six logs: which blocks changed form, and the proof.

## Limits

- Nothing on the cluster. No kind cluster. No sub-agents, except one read-only agent to compare the built pages with the sources if you want a second pair of eyes.
- No change to the saa-plan app, `~/.kube/config`, Windows or WSL settings.
- Host ports, all on 127.0.0.1: 8102 for the site.

## Done when

- [ ] The test exists, runs in CI, failed on `main` before your change (the pull request quotes its output) and passes after it.
- [ ] `check:content` refuses the unsafe forms and has tests for them.
- [ ] The twelve files are fenced blocks; the chart of m01 step 10 passes `helm lint` when built from the page.
- [ ] A fenced block in a step has the command block's frame and a working Copy button; the pull request has a screenshot of one block in the light and the dark theme.
- [ ] `npm run check:content`, `npm run build`, `npm run check:links` and the unit tests pass; the end-to-end tests pass in CI.
- [ ] The six logs have their section.

## Report

The pull request link; the number of blocks repaired per module and by which fault; what the new test and the check now refuse; anything it flagged in a module you did not own.
