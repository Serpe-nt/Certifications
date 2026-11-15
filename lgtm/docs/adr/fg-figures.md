# FG: the six lesson figures

Card: FG (wave 10). Date: 2026-11-15. The scenes are in `learn/src/figures/<figure id>/index.tsx`.

## Context

Six steps (m02 steps 4, 6 and 10; m05 steps 2, 4 and 6) ask for an animated figure with a `<Figure id alt brief>` tag and showed a "Figure to come" placeholder. The card asked for the scenes to be built with the `stageshow` skill in the site's own ink and paper, and for the owner to approve the look on the first one before the other five were built.

## What the owner decided

- The first version of `m02-s04-waterfall` was drawn in the site's ink and paper. On 2026-11-15 the owner answered: "more grafana like look, or straight copy from it (but nicely animated)".
- The second version copies Grafana's dark trace view. The owner approved it the same day: "Yes, this look". The other five scenes follow it.

## Decisions

1. **Grafana's look, not the site's.** The scenes draw Grafana's dark theme: canvas `#111217`, panels `#181b1f`, text `#ccccdc`, Grafana's blue, red, green and yellow, and the colour of each service in a trace. This replaces the card's rule that a fake Grafana screen takes the site's ink and paper. The theme's colours live in `learn/src/figures/grafana.css`; each scene keeps its own few series and service colours in its own files. None are added to `learn/src/styles/tokens.css`, because they belong to the pictures of Grafana and not to the site. The reference for the trace view was the screenshot on Grafana's documentation page for the traces visualization, looked at in the session and not copied into the repository.
2. **No brand marks.** No Grafana logo, no product icon, no data source logo. Icons are simple strokes drawn in the scenes (a caret, a chevron, an error circle).
3. **Names and numbers come from the steps and the lab.** Span and service names come from `lab/demo/src/checkout/main.go` and the lessons; data source names come from `lab/helm/grafana/values.yaml`; the node count is 5, as the lab has had since version 3. Where a step gives no number, the scene shows none (the series count of `user_id` reads "20 × users").
4. **Only part of the Stageshow kit is copied.** `learn/src/figures/kit/` holds the stage, its script API, the cursor, keycaps, measuring, the clock, easing and the Connector, from Stageshow 1.1.1 (MIT, its licence beside them). The kit's parts folder is left out because its icons need `lucide-react`, which the site does not have; no dependency was added.
5. **When a scene moves.** A scene plays once when its figure comes into view (the island loads it only then). It stops and shows its first frame when the figure leaves the screen or the tab is hidden; it shows its finished frame, with no motion, under reduced motion and when Effects is off in Settings (`learn/src/figures/motion.ts` watches `data-motion` on `<html>`, which `FigureIsland.tsx` does not). The site's own kill rules in `global.css` also stop every transition then.
6. **Phones.** Each scene has a second design below 480 pixels of width, as the skill asks, laid out for the phone column instead of shrunk.
7. **Tests.** The sample build cannot ask for the real figure ids (a figure id must start with its step's id), so a fixture figure, `m91-s01-scenes`, shows all six scenes. `tests/e2e/scenes.spec.ts` checks on it that each scene renders, plays on screen, stops off screen, and shows its finished frame under reduced motion and with Effects off. `tests/unit/figures.test.ts` checks that the six steps ask for their figures and that each has a scene, so their pages show it in place of the placeholder, while a figure without a scene keeps it.

## What a page with a figure loads

Only when the figure comes into view: the shared kit and Grafana styles (about 15 KB of JavaScript and 4.6 KB of CSS, gzipped) and the scene's own file (1.6 to 3.5 KB of JavaScript and 1.1 to 1.7 KB of CSS, gzipped). In all, about 22 to 25 KB gzipped per page, 62 to 71 KB before compression. React is already on the page for the figure's island.
