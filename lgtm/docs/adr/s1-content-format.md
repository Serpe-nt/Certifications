# S1: details of the content format the contract leaves open

Card: S1 site engine (wave 1). Date: 2026-11-09. The planner may fold these into `docs/plan/03-content-contract.md`.

## 1. The card question's options

The contract shows `<Question id="q-m04-s07" answer="b">` with "four options and an explanation for each" inside, but not how they are written. Decision: the question text, then a Markdown list of four items; each item holds the option, a blank line, and its explanation indented under it.

```mdx
<Question id="q-m04-s07" answer="b">
Which function gives a correct per-second rate across a counter reset?

- deriv()

  deriv() is for gauges and reads a reset as a steep fall.

- rate()

  Right: rate() detects counter resets and adjusts for them.

- delta()

  delta() is for gauges and goes negative across a reset.

- idelta()

  idelta() looks at the last two samples of a gauge.
</Question>
```

`answer` is the letter of the item in the file (a to d). Options are shuffled on screen. `check:content` enforces four items, an explanation per item, a valid letter, the id `q-<step id>`, and no positional wording.

## 2. Queries and commands with braces

In MDX, braces start a JavaScript expression, so a PromQL selector breaks the file. Write queries and commands as a template string: ``<Query lang="promql">{`rate(http_requests_total{job="shop"}[5m])`}</Query>`` and ``<Cmd>{`kubectl get pods -n shop`}</Cmd>``.

## 3. Where the lab check appears, and what it gates

The check is defined in the frontmatter (`check:`), so the page renders it after the MDX body, as a "Lab check" box. On lab and drill steps, Mark complete stays disabled until the check has passed. A passed check is saved, so it stays passed on every device.

## 4. Which content folder a build reads

`src/content/` for the real course. `LGTM_CONTENT=sample` reads `tests/fixtures/content/` (the sample module), and `LGTM_CONTENT_DIR=<folder>` reads any folder. The production build must work with empty folders, and it contains no sample content.

## 5. Step addresses

A step's address is `/m/<module>/<step number>/`, for example `/m/m04/s07/` for step `m04-s07`. The module's start page is `/m/m04/` and its end page `/m/m04/done/`. Addresses come from ids, so they never change when a step moves.
