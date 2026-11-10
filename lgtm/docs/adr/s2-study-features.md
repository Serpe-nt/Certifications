# S2: study features (quizzes, review, mock exams, rewards, merge)

Card: S2 site features (wave 2). Date: 2026-11-09. The rules, the state shape and the constants are documented in `lgtm/learn/CLAUDE.md`; this file records the choices behind them.

## Context

The card asks for the owner's saa-plan study rules (`saa-plan/docs/architecture.md`, `saa-plan/site/qcore.js`) ported to the LGTM site as new code: a pure quiz core, module quizzes, review with spaced repetition, step practice, weak spots, readiness per exam domain, two mock exams, XP with levels and badges, celebrations, and a multi-device merge. The site is a static Astro build with React islands; progress is one JSON document kept in local storage and on the server (card S1).

No new dependency was added, so no version had to be checked or pinned. The exam numbers (60 questions, 90 minutes, 75%, the domain weights) come from `lgtm/docs/plan/01-curriculum.md`, which cites the official curriculum PDFs and the Linux Foundation exam FAQ (sources in `lgtm/docs/research/02-certs-and-demand.md`).

## Decisions

### 1. Questions reach the islands through one static `bank.json`

Options: (a) pass each page's questions to its island as props; (b) build one `bank.json` with the course outline and every question, fetched once per page.

The review queue, readiness and the mock exams need questions from every module, so (a) would put most of the bank into several pages' HTML (about 700 questions by the end of the course). Decision: (b), an Astro static endpoint (`src/pages/bank.json.ts`). Question text is turned into HTML at build time with only `<b>` and `<code>` let through (`src/lib/markup.ts`), so nothing from saved state is ever rendered as HTML. The first render of every island that uses the bank is the same as the static HTML (no bank yet), so hydration always matches.

### 2. State version 2: new fields, names that do not collide

The new fields are `qs`, `srs`, `quizzes`, `run`, `runOff`, `exam`, `examOff`, `mocks`, `rowBest` and `settingsAt`. The module quiz records are called `quizzes`, not `quiz`: an S1 unit test uses a top-level `quiz` field as the example of a field written by a newer version, which must survive untouched. Version 1 had none of the new fields, so the migration only sets `v: 2`; nothing is dropped. The storage key stays `lgtm-learn-v1`.

### 3. Merge rules

Ported from saa-plan and extended for two runs (`run` for quizzes and practice, `exam` for mock exams, each with its own "closed" marker so closing a practice round never removes a mock exam that is still running). The rules are listed in `lgtm/learn/CLAUDE.md`. Points worth recording:

- Per-question history and the review entry come from the same copy (the one that answered more), so a review step is never paired with the wrong history.
- Card answers (`answers`) now merge per question too. S1 took them from the server copy, which could drop a card answer made on another device. One S1 unit test asserted the old behaviour; its assertion was changed to the new rule and its title says "settings from the server". The test count is unchanged.
- A submitted mock exam wins over a copy still running on another device, and `mocks` holds one entry per exam start, so an exam finished on two devices counts once.
- Settings carry their own change time, `settingsAt`, stamped by `Store.update()` whenever the settings differ after a change. In a merge the copy with the later `settingsAt` wins as a whole. The first version of this card took settings from the server copy (the S1 rule), so a lab seed typed on a device that then met a conflict was lost; the planner's review asked for this fix, because the owner uses three devices and types the seed once. A copy without the field counts as older than any copy with it; on a tie (two copies without it) the server copy wins, which keeps the S1 test's case. `settingsAt` joins version 2, which no released build has used, so no extra migration step is needed.

### 4. The mock exam's clock never acts on stale state

The tick waits for the first sync, skips while a pull is on its way, pulls after a gap of more than 15 seconds (the page was frozen or asleep), and pulls once more before submitting a run whose time is up; it submits only if the run is still unfinished after that pull. A run that ran out is closed at its end time, even when the device notices later.

### 5. Choices the card left open

- The module quiz can be taken before every step is complete; the page says how many steps are open. A module still counts as done only with every step complete and the quiz passed. Locking the quiz (as saa-plan does) would block a learner who has studied a topic elsewhere; the planner may ask for the lock.
- Card questions count toward readiness (in the step's first exam domain) and XP, but are not drawn into review: their text lives in the step's MDX, not in the question pools.
- In a mock exam, unanswered questions count as wrong in the score but are not added to the history or the review queue.
- XP: 10 per right answer that teaches (first time right, right after a miss, right when due: the saa-plan rule), 5 per card question right, 5 per step, 10 per check, 100 per quiz passed, 50 per module done, 25 per mock taken, 250 per mock exam passed. Level n starts at 40 n (n - 1) XP. Badges are derived, so none has a stored date.
- The mock exam draws by domain and never fills one domain from another; a domain short of questions gives what it has, and the intro says how many questions the course has so far.

### 6. Celebrations and their switches

`updateState()` compares the state before and after a change made on this device and celebrates the biggest rung finished (step, check, quiz, module, mock, all). Copies that arrive from other devices never celebrate. The banner always shows because it carries information; the canvas needs effects on and no `prefers-reduced-motion`; sounds need the sound switch. `<html data-fx-last>` and `<html data-fx-answer>` record what the last call did, which is how the browser tests prove each switch. The mock exam saves with `{ quiet: true }` while it runs. The look is deliberately plain; the design card (DZ) styles it.

## Sources

- `saa-plan/docs/architecture.md` and `saa-plan/site/qcore.js` in this repository (the rules ported).
- `lgtm/docs/plan/01-curriculum.md`, "Exam domains used for mapping" and "Question pools".
- `lgtm/docs/research/02-certs-and-demand.md` (exam duration, pass mark and weights, with their official sources).
