# W3: a file copied from a lesson keeps its indentation

Beside wave 8. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

Card C9 found on 2026-11-14 that a manifest shown in a lesson loses its indentation on the page. A learner who copies it gets a file that Kubernetes or Helm refuses. Twelve blocks in four merged modules have the fault. This card repairs them, makes the content check refuse the mistake, and gives the form that replaces it a Copy button.

## Owns

- The site: `lgtm/learn/scripts/check-content.ts`, `lgtm/learn/tests/unit/content-rules.test.ts`, and what draws a code block inside a step (`lgtm/learn/src/components/mdx/**`, the styles and the small script of the existing command block). One end-to-end test in `lgtm/learn/tests/e2e/` if you add one.
- These steps, and only the blocks named below in them: `m01/s10-write-a-small-chart.mdx`, `m03/s08-operator-servicemonitor.mdx`, `m06/s08-logs-events-loki.mdx`, `m06/s11-requests-usage-throttling-oom.mdx`, `m09/s05-processors-that-matter.mdx`, `m09/s06-ottl-redaction.mdx`, `m09/s08-connectors.mdx`, `m09/s12-reliability.mdx`, `m09/s13-debugging-a-pipeline.mdx`, all under `lgtm/learn/src/content/steps/`.
- The logs `lgtm/docs/verification/m01.md`, `m03.md`, `m06.md` and `m09.md`: one dated section each.

Not the plan, not the lab, no other step. Modules m10, m11 and m12 are in review with their own workers; do not touch them.

## Read first

- `lgtm/docs/plan/03-content-contract.md`: the parts of a step, and the line on files and `<Cmd>` in "things the first modules ran into".
- `lgtm/learn/PRODUCT.md` and `lgtm/learn/DESIGN.md`, before you change anything a reader sees.
- `lgtm/learn/scripts/check-content.ts` and its tests; the component that draws `<Cmd>` and its Copy button.
- Module m10 step 5 (`m10/s05-pod-logs-to-loki.mdx`, once merged; until then on the branch of pull request 79): the form that works.

## The fault

A `<Cmd>` with a template string that runs over several lines, placed inside a numbered action of `<Do>`. Markdown treats the later lines as part of the list item and removes the item's indent from each of them, three spaces after `2. `, also inside the template string. A line indented by two spaces arrives with none, a line indented by four with one.

Seen on the built pages on 2026-11-14: `dist/m/m06/s11/index.html` shows `metadata:` and `name: cpu-hog` in the same column; `dist/m/m01/s10/index.html` shows the chart's templates flat. `check:content` and the build pass.

The blocks, by the line where each `<Cmd>` opens on `main` at `792c17a`:

| Step | Line | What it holds |
|---|---|---|
| m01 s10 | 76, 127, 144 | heredocs that write `Chart.yaml`, `values.yaml`, `_helpers.tpl` and the chart's templates |
| m03 s08 | 93, 132 | a Deployment with its Service, a ServiceMonitor |
| m06 s08 | 76 | a Pod |
| m06 s11 | 82 | a Pod |
| m09 s05, s06, s08, s12, s13 | 100, 90, 88, 88, 87 | a ConfigMap with a Collector configuration |

A fenced code block under the list item keeps its indentation, because Markdown removes exactly the item's indent from it and no more. Module m10 is written that way.

## What to build

1. **The check.** `check:content` fails a `<Cmd>` or `<Query>` template string that runs over several lines inside a list item when one of its later lines starts with a space. The message names the file and line and says what to write instead. Add tests for it beside the other content rules: the faulty form fails; a one-line `<Cmd>`, a multi-line one whose lines all start in the first column, and a fenced block pass.
2. **The Copy button.** A fenced code block inside a step has no Copy button today and is drawn differently from a command block. Give it the frame and the Copy button of the command block, in the site's own design; add no dependency and no CDN asset. The copied text is the block's text exactly, with its indentation and without a trailing blank line added.
3. **The twelve blocks.** Rewrite each as a sentence that names the file, then a fenced block with the file's text, then the command that uses it. For m01 step 10 the learner writes several files: keep it one action per file or per pair of files, whichever reads better, and keep the files' text as it is. Change no fact, no name and no command; keep step ids, frontmatter and every other part of the step as they are.
4. **The proof, per block.** After `npm run build`, take the text of the block from the built page and compare it with the text in the step's source: the same, byte for byte. Then show that the file is what the lesson needs: `helm lint` and `helm template` for the chart of m01 step 10 with the Helm the lab pins; for each manifest, a YAML parser reads it and the keys sit where the lesson's text says; for each Collector configuration of m09, `otelcol-contrib validate` in the image the lab pins if Docker is running, and say so if it is not. Nothing is applied to the cluster.
5. **The logs.** One dated section in each of the four logs: which blocks changed form, and the proof.

## Limits

- Nothing on the cluster. No kind cluster. No sub-agents, except one read-only agent to compare the twelve files on the built pages with the sources if you want a second pair of eyes.
- No change to the saa-plan app, `~/.kube/config`, Windows or WSL settings.
- Host ports, all on 127.0.0.1: 8102 for the site.

## Done when

- [ ] `check:content` fails on the faulty form and has tests; it reports no such block on `main` after your change.
- [ ] A fenced block in a step has the command block's frame and a working Copy button; the pages of m10 look right with it once m10 is merged, and the pull request has a screenshot of one block in the light and the dark theme.
- [ ] The twelve blocks are fenced blocks; each built page gives back the source text byte for byte; the chart of m01 step 10 passes `helm lint`.
- [ ] `npm run check:content`, `npm run build`, `npm run check:links` and the unit tests pass; the end-to-end tests pass in CI.
- [ ] The four logs have their section.

## Report

The pull request link; the number of blocks changed per module; what the check now refuses; anything in another module that the new check flags and you did not own.
