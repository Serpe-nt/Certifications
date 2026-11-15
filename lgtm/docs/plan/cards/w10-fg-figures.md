# FG: the six figures the lessons ask for

Wave 10. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker, and `stageshow`: this is the one card that uses it.

Six lesson steps ask for an animated illustration and show a placeholder, "Figure to come", until someone builds it. This card builds the six scenes.

Changed by the owner on 2026-11-15, in the worker's session: the scenes copy Grafana's dark look and do not take the site's ink and paper. Wherever this card says the site's tokens or colours, read Grafana's look; no logo, product icon or brand mark, as before. The record is `lgtm/docs/adr/fg-figures.md` (pull request 102).

## Owns

- `lgtm/learn/src/figures/**`: one folder per scene, and the Stageshow kit copied in beside them.
- In the six steps below, only the `alt` and `brief` attributes of the `<Figure>` tag, and only where a number or a name in them no longer matches the lesson or the lab.
- Tests for the scenes under `lgtm/learn/tests/**`.
- `lgtm/docs/adr/fg-*.md`.

Not the lessons' text, not the site's pages or components outside `src/figures`, not the plan, not the lab. If a scene cannot work without a change to `Figure.astro`, `FigureIsland.tsx` or `registry.ts`, stop and say so in the pull request; do not make it.

## Read first

- `lgtm/learn/PRODUCT.md` and `lgtm/learn/DESIGN.md`, all of both: the scenes are part of this site and take its colours, type, shapes and motion rules, not their own.
- `lgtm/docs/plan/00-overview.md`, the paragraph on `stageshow` in the work plan, and `lgtm/CLAUDE.md` on the design skills: no CDN script or font in `lgtm/learn`, no third-party brand asset in the repository.
- How a scene is plugged in: `lgtm/learn/src/figures/registry.ts` (a scene is `src/figures/<id>/index.tsx`, a React component with the props `playing` and `still`), `src/components/mdx/Figure.astro`, `src/components/islands/FigureIsland.tsx`, the sample scene `tests/fixtures/figures/m90-s01-flow/index.tsx` and its test `tests/e2e/figure.spec.ts`.
- `lgtm/docs/plan/03-content-contract.md`, the paragraph on `<Figure>`.
- The six steps, whole, so that each scene shows what its step teaches and uses the step's own names and numbers.

## The six scenes

| Id | Step | What the brief asks for |
|---|---|---|
| `m02-s04-waterfall` | m02 step 4, traces and spans | a trace waterfall that builds from the root span down; the payment bar is long and turns red |
| `m02-s06-three-hops` | m02 step 6, one request in three signals | from an exemplar on a latency graph to its trace to its log lines, one trace ID on all three |
| `m02-s10-series-multiply` | m02 step 10, cardinality | series boxes that multiply with each label added, until a user ID label fills the frame |
| `m05-s02-explore` | m05 step 2, Explore | data source picker, a query in Code mode, an instant query, a split pane |
| `m05-s04-panel-editor` | m05 step 4, the first dashboard | the panel editor: a query, the preview, Table view, the visualization picker |
| `m05-s06-variable-editor` | m05 step 6, variables | a query variable built from label values, then used in a dashboard's drop-down |

The full `brief` and `alt` of each are in its step. The brief says what happens and what the learner should notice; how it looks is yours, within the site's design.

## What to build

1. **One scene first, then the owner.** Build `m02-s04-waterfall` completely. Show it to the owner in your session with one still and one short film from the skill's own tools, and ask one question: is this the look for all six? Wait for the answer before you build the others. The owner reads little: one picture, one sentence, one question.
2. **The other five**, in the look that was agreed.
3. **Each scene keeps the site's rules.**
   - It takes the site's tokens for colour, type, radius and spacing. A fake Grafana screen is drawn in the site's ink and paper, not in Grafana's colours, and carries no logo, product icon or brand mark of anyone.
   - It obeys `playing`: when it is false, every animation and timer stops. It obeys `still`: one meaningful frame, no motion at all. It also stops under the site's own Effects switch, as `DESIGN.md` describes for motion.
   - It makes sense without sound, without colour alone, and at phone width.
   - It loads only when its figure comes into view, and adds no dependency to `package.json`.
   - It works in the production build served by the site's own server, which sends a content security policy: test there, not only in `astro dev`.
4. **Numbers and names are facts.** A scene shows a query, a count or a service name only as its step or the lab has it today. One brief is known to be stale: `m05-s02-explore` says the instant query returns 7, and the lab's `count(kube_node_info)` has been 5 since the lab's version 3. Correct such a brief when you find one, and say which in the pull request.
5. **Tests.** Each scene: it renders, it stops when `playing` is false, and it shows its still under reduced motion. The placeholder is gone on the six pages and still there on any other page that asks for a figure.

## Limits

- Nothing on the cluster. To look at the real Grafana screens you may ask the owner once for a sign-in in your session's browser pane; never type a password. Nothing is copied from a screenshot into the repository.
- The skill's bundled app icons and third-party brand marks are not copied into the repository.
- No sub-agents, except the ones the `stageshow` skill itself uses for a film or a review.
- Host port, on 127.0.0.1: 8105 for the site.

## Done when

- [ ] The six scenes exist under `src/figures/<id>/index.tsx`, and their six pages show them in place of the placeholder.
- [ ] The owner approved the look on the first scene, and the pull request says so with the date.
- [ ] Every scene stops with `playing` false, shows a still with `still` true, and stops under the Effects switch; the tests show it.
- [ ] `package.json` has no new dependency; no file under `lgtm/learn` loads anything from another host; no brand asset is in the pull request.
- [ ] `npm test`, `npm run check:content`, `npm run build` (it ends with `check:pages`) and `npm run check:links` pass; the scenes were looked at in the production build with the site's server.
- [ ] The pull request has one still of each scene and one film, says how many kilobytes the scenes add to a page that shows one, and lists every `alt` or `brief` that was corrected.

## Report

The pull request link; what the look is, in two sentences; what each scene adds in size; any brief that asked for something the scene could not do, and what it does instead.
