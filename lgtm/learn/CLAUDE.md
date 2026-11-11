# lgtm/learn: notes for the next agent

Read `../CLAUDE.md` first, then `README.md`, `PRODUCT.md` and `DESIGN.md` here. Decisions: `../docs/adr/s1-*.md`, `../docs/adr/s2-*.md` and `../docs/adr/dz-*.md` (the article form of a step and the design system).

## Layout

- `src/content/` the course (modules, steps, questions); empty until the content cards. `tests/fixtures/content/` is the sample module, built only by `build:sample` and `dev:sample`.
- `src/content.config.ts` the collections; `src/lib/schema.ts` the contract as Zod schemas; `src/lib/content-rules.ts` the rules a schema cannot express (run by `scripts/check-content.ts` before every build).
- `src/pages/` overview, module start (`/m/<id>/`), step (`/m/<id>/<sNN>/`), module end (`/m/<id>/done/`), module quiz (`/m/<id>/quiz/`), practice (`/practice/`, `?step=<id>` for step practice), mock exams (`/exam/otca/`, `/exam/pca/`), settings, 404, and `bank.json` (the course outline and every question, for the islands).
- `src/components/mdx/` the contract's components (Astro); `src/components/islands/` the interactive parts (React).
- `src/lib/state.ts` the progress document: shape, `parseState()` (validates and bounds every input), migrations, `mergeStates()`. `src/lib/store.ts` local storage and the sync with the server. `src/lib/checks.ts` and `token.ts` the five check kinds.
- `src/lib/quiz.ts` the quiz core: pure functions, no page code, time and chance passed in. `src/lib/runs.ts` what starting, answering, finishing and closing a quiz, practice round or mock exam does to the state. `src/lib/rewards.ts` XP, levels, badges and the celebration rung, derived from the state. `src/lib/fx.ts` the celebrations themselves. `src/lib/bank.ts` loads `bank.json` in the browser.
- `src/figures/registry.ts` figure scenes by id; scenes go in `src/figures/<figure id>/index.tsx`.
- `src/styles/tokens.css` every colour, font, type size (`--lg-text-*`), space, radius and motion value (one theme). `global.css` maps them into Tailwind and holds the shell; `head.css` the page header every page opens with; `step.css` the step page, its article parts, information parts and lab check; `home.css` the overview, module start and end, 404 and settings; `quiz.css` the quiz, practice and mock exam; `pages.css` older shared page rules. `src/assets/` the self-hosted display font and the decoration (side rails, globe, the overview's hero drawing, one icon per module in `deco/modules/`).
- `src/components/PageHead.astro` the header (tag, crumb, title, lead, chips, the `Matrix.astro` plate, the globe or the module's `ModuleIcon.astro`); pages using `Base` pass it in the `head` slot.
- `src/lib/fx-ui.ts` the pointer crosshair, click pings and decoding labels; `src/styles/motion.css` the motion of the shared controls and the shell (see DESIGN.md, Motion).
- `src/lib/dialogs.ts` Settings, Practice and (on a step page) the module outline as dialogs over the page; the open one lives in the address (`#settings`, `#practice`, `#practice=<step id>`, `#module`). `src/lib/toc.ts` marks the section being read in the step's contents list.
- `server/` the Node server: static files with the base path filled in, `/api/state`, guards, CSP. Plain JavaScript, no build step.

## Rules

- One step per screen, as an article with a sidebar; no list of steps beside it; only the page scrolls (an open dialog scrolls itself). Which step, which tab (`?tab=practice`) and which dialog are on screen live in the URL, not in the state.
- A step with a check has Learn and Practice tabs: parts marked `data-practice` (Do, Done, `<Trap practice>`, the lab check) and, on such steps, the card question show on Practice only. The lab check renders right after `<Done>` (`Done.astro` reads it from `Astro.locals.stepCheck`); Back and Next end both tabs, and Learn shows "Go to practice" while the check is open. The form is `../docs/adr/dz-article-format.md`; `check:content` tells the article form (opens with `<Problem>`) from the old one.
- The design follows `DESIGN.md`. Before changing the interface, read it and `PRODUCT.md`; record detector exceptions with `impeccable hooks ignore-value` so they land in `.impeccable/config.json`.
- Every way into the state goes through `parseState()`. New fields get a default in `defaultState()` and bounds in `parseState()`; a new shape gets `STATE_VERSION` + 1 and a step in `MIGRATIONS`. Never drop progress; never rename the storage key.
- `mergeStates()` follows the merge rules below. A new field needs a rule there too.
- Automatic changes (the mock exam's clock) wait for `store.firstSync` and never act while `store.isPulling()`; nothing saves at start-up before the first sync.
- Celebrations go through `updateState()`, which works out the rung from the state before and after a change on this device. The mock exam passes `{ quiet: true }` while it runs.
- Nothing from the state reaches the page as HTML. React escapes; `dangerouslySetInnerHTML` is only for build-time HTML from the course's own MDX.
- Components use tokens through Tailwind classes or `var(--lg-*)`; never a hard-coded colour. No CDN scripts or fonts, no inline styles in the static HTML (the CSP forbids them), no third-party origins.
- Controls in islands stay disabled until hydrated (`useHydrated()`), so a click before hydration is not lost.
- Tests: `npm test` must pass without the network. Test servers use ports 8095 and 8096 only.

## The progress document (version 2)

Key `lgtm-learn-v1` in local storage (never renamed), the same JSON on the server. `STATE_VERSION` is 2; version 1 documents migrate with every new field at its default.

| Field | Shape | Meaning |
|---|---|---|
| `v`, `savedAt` | number | version; last local change (ms) |
| `done` | `{stepId: ms}` | completed steps |
| `checks` | `{stepId: ms}` | passed lab checks |
| `answers` | `{q-<stepId>: {right, n, at}}` | card questions (the one on each step) |
| `settings` | `{labDomain, labSeed, theme, effects, sound}` | `effects` switches the celebrations and the page's motion, `sound` the sound; `theme` is kept but unused since the site has one theme |
| `settingsAt` | ms | when a setting last changed (0 = never); `Store.update()` stamps it whenever the settings differ after a change, an import included |
| `qs` | `{questionId: {seen, right, last, at, xp}}` | per-question history of pool and mock questions; `xp` counts right answers that taught something |
| `srs` | `{questionId: {step, due}}` | missed questions waiting for review; `due` is a local day `YYYY-MM-DD` |
| `quizzes` | `{moduleId: {best, passed, tries: [{at, score, n}]}}` | module quizzes: best percent, first pass (ms, 0 = not yet), the newest 50 tries keyed by the run's start |
| `run` | object or null | the quiz or practice round in progress or on its results: `kind` (module, review, step, weak), `of`, `t0`, `ids`, `ord` (option order per question), `ans` (`{id: {a, at}}`), `i`, `done`, `row`, `rowMax`, `best0` |
| `runOff` | ms | start of the latest closed or dropped run; a copy of it does not come back |
| `exam` | object or null | the mock exam in progress or on its results: `cert`, `t0`, `end`, `ids`, `ord`, `marks` (`{id: {a, f, at}}`, `f` = flagged), `i`, `done`, `timeUp` |
| `examOff` | ms | start of the latest closed or dropped mock exam |
| `mocks` | `[{cert, t0, at, score, n, pct, dom: {domain: [right, asked]}, mins}]` | finished mock exams, the newest 100 |
| `rowBest` | number | most right answers in a row ever (quizzes and practice) |

Bounds: at most 5,000 ids per map, ids match `^[a-z0-9][a-z0-9-]*$` and are at most 64 characters, times are whole ms up to 2100, answer counts up to a million with `right <= seen` and `xp <= right`, a run has 1 to 60 distinct questions with a valid option order each, picks are distinct indices below 6 (at most two), a mock clock is at most 4 hours, `rowBest` at most 1,000. A value outside its rule is dropped or clamped, never trusted. Ids from the state are looked up in `Map`s or prototype-free objects.

XP, levels and badges are never stored: `rewards.ts` works them out from the fields above every time.

## Merge rules (`mergeStates(local, server)`)

When both copies changed since they last agreed:

- `done`, `checks`: the union; the earliest time wins.
- `answers`, and `qs` with `srs`: per question, the copy that answered it more often (on a tie, the one that answered last). A question's history and its review entry always come from the same copy.
- `quizzes`: the best result, the earliest pass, every try of both copies (by start time, newest 50).
- `run`: a run that started at or before `runOff` (the later of both copies) is gone. Two different runs: the later start stands. The same run: every checked answer of both copies (the first check of a question counts), finished if either finished, the question on screen from this device.
- `exam`: gone at or before `examOff`. Two different exams: the later start stands. The same exam: a submitted copy wins over a running one (answers given elsewhere after the submit do not count); both submitted, the earlier submit; both running, per question the newer change, the question on screen from this device.
- `mocks`: the union, one entry per exam start. `rowBest`, `runOff`, `examOff`, `savedAt`: the maximum.
- `settings`: the copy with the later `settingsAt` wins as a whole, and `settingsAt` follows it. A copy without the field (version 1) has 0, so it is older than any copy with it; on a tie the server copy wins.
- Fields this version does not know: from the server copy.

The client pulls every 30 seconds while the page is in view, on focus, when the network returns and at start; it pushes 800 ms after a change and at once when the page is hidden or left. The header shows "Offline: saved on this device" or "Not synced" when changes cannot reach the server.

## Constants

| Constant | Value | Where |
|---|---|---|
| Module quiz size, pass mark | 15 questions, 80% (12 of 15) | `QUIZ_SIZE`, `QUIZ_PASS` in `quiz.ts` |
| Review days | a miss comes back after 1 day, then 2, then 4; the next right answer on time retires it | `SRS_DAYS` |
| Review round, step practice, weak-spot practice | up to 15, 3, 10 questions (at most 4 per weak tag) | `REVIEW_SIZE`, `STEP_PRACTICE`, `WEAK_SIZE`, `WEAK_PER_TAG` |
| Weak spot | a tag with at least 3 answers, weakest share right first | `WEAK_MIN_SEEN` |
| Readiness | a domain needs 10 questions met; ready from 80%, close from 70% | `READY_MIN`, `READY_BANDS` |
| Mock exams | 60 questions split by the domain weights (OTCA 11/28/15/6, PCA 11/12/17/9/11), 90 minutes, pass at 75% (45 of 60) | `EXAMS` in `exams.ts`, `mockSplit()` |
| Mock clock | asks for news after a gap of 15 s, and pulls once more before submitting | `GAP_MS` in `MockExam.tsx` |
| XP | 10 per right answer that teaches, 5 per card question right, 5 per step, 10 per check, 100 per quiz passed, 50 per module done, 25 per mock taken, 250 per mock exam passed | `XP` in `rewards.ts` |
| Levels | level n starts at 40 n (n - 1) XP | `LEVEL_STEP` |
| Celebration ladder | step, check, quiz, module, mock, all | `RUNGS` in `rewards.ts`, `SIZE` in `fx.ts` |
