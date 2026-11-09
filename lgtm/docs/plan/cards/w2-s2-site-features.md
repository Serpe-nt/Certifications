# S2: site features

Wave 2. Model Opus 5.5, high effort. Runs beside L2 and L3. The planner re-checks this card against what S1 delivered before starting it.

## Owns

`lgtm/learn/**`, `lgtm/docs/adr/s2-*.md`

## Read first

- `lgtm/docs/plan/00-overview.md`, `01-curriculum.md` (sections "How a step teaches", "Exam domains", "Question pools"), `03-content-contract.md`
- `lgtm/learn/README.md`, `lgtm/learn/CLAUDE.md` and the ADRs S1 wrote
- `saa-plan/docs/architecture.md` and `saa-plan/site/qcore.js`: the quiz rules, spaced repetition, weak spots, merge rules and celebration ladder the owner already uses and likes. Port the rules; write new code.

## Goal

The study features on top of S1's engine: quizzes, review, weak spots, readiness, two mock exams, XP with badges and celebrations, and a merge that keeps three devices in step.

## Build

1. **Quiz core**, a pure module with no page code, fully unit-tested: drawing by tag and by exam domain, shuffling options, grading, per-question history, spaced repetition after 1, 2 and 4 days, weak spots by tag.
2. **Module quiz.** 15 questions from the module's pool, pass at 80%, Previous and Next, an explanation per option after answering, results with links back to the steps that teach each missed tag. A module is done only when all its steps are complete and its quiz is passed.
3. **Review and practice.** A review queue of due questions; three-question practice from a step; weak-spot practice.
4. **Readiness.** Per exam and per domain, from question history: seen, correct, due. Shown on the overview.
5. **Mock exams.** OTCA and PCA: 60 questions drawn by the domain counts in the curriculum, 90 minutes, pass at 75%, flag for review, no effects and no explanations until the end, then a result per domain. A run survives a reload and continues on another device. The clock never acts on stale state (see "Several devices" in the saa-plan architecture document).
6. **XP, levels, badges.** Derived from the state every time, never stored. Badges for things earned (a streak of right answers, a module, an exam passed).
7. **Celebrations** as a ladder, each rung bigger than the one below: step, check passed, quiz passed, module, mock exam passed, everything. They respect the effects and sound switches and `prefers-reduced-motion`. The mock exam screen stays quiet.
8. **Merge.** When two devices changed the state: union of completed steps and passed checks, best quiz result, per-question history from the copy that answered more, both sides of the same mock run. Pull every 30 seconds while the page is in view and on focus; send unsaved changes on leaving; show a quiet notice when changes cannot reach the server. Nothing saves at start-up before the first sync.
9. **Safety.** Every new field has a default and a validation rule; numbers that feed loops or the page are bounded; imported state is validated; ids from state never index plain objects.
10. **Sample content** extended so every feature can be tested: a pool large enough for a quiz, and a small mock pool with the domain tags.
11. **Tests.** Unit tests for the quiz core and the merge (include the awkward cases: same question answered on two devices, a mock run finished on one device while open on another). Playwright tests for a full quiz, a review round, a mock exam with a reload in the middle, and three contexts converging.

## Not in this card

Visual design (DZ). Real content. A focus timer: the owner chose not to carry it over.

## Done when

- [ ] `npm ci && npm test && npm run build` pass.
- [ ] With the sample content: a module quiz can be failed, then passed; missed questions come due on the right days (clock mocked in tests); readiness changes with answers.
- [ ] A mock exam draws the right count per domain, survives a reload, and ends with a per-domain result.
- [ ] Three browser contexts changed offline in different ways converge to the documented result.
- [ ] Effects off, sound off and reduced motion each silence what they should.
- [ ] `lgtm/learn/CLAUDE.md` documents the state shape, the merge rules and the constants (quiz size, pass marks, review days).

## Report

The pull request link, test counts, the merge rules as implemented, anything in the content contract that the features need changed.
