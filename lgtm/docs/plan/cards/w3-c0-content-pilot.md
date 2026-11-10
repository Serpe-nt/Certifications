# C0: content pilot, module m02 Observability fundamentals

Wave 3. Model Opus 5.5, high effort. Runs beside L4 and D2; shares no file with them.

This is the first lesson content of the course. The owner reads it before the other 17 modules are written, and every later content worker is told to copy its tone, card length and check style. Aim for the module you would want to be judged by.

## Owns

`lgtm/learn/src/content/modules/m02.yaml`, `lgtm/learn/src/content/steps/m02/**`, `lgtm/learn/src/content/questions/m02.yaml`, `lgtm/docs/verification/m02.md`, and `lgtm/docs/adr/c0-content-notes.md` (what you learned that the next content workers need).

## Read first

- `lgtm/docs/plan/03-content-contract.md` (all of it), `01-curriculum.md` ("How a step teaches", "Exam domains", the m02 section, and the sections of m01 and m03 so you neither repeat nor skip), `cards/content-module-template.md`, `cards/README.md`
- `lgtm/docs/research/02-certs-and-demand.md`: the exact competency names of OTCA domain O1 and PCA domain P1, and the list of recurring interview topics
- `lgtm/docs/plan/02-lab-contract.md` and `lgtm/lab/docs/` (`lgtm.md`, `demo.md`) for names, addresses, flags and data sources
- `lgtm/learn/README.md`, `lgtm/learn/CLAUDE.md`, `lgtm/docs/adr/s1-content-format.md`, and the sample module in `lgtm/learn/tests/fixtures/content/` to see every component in use
- `saa-plan/docs/keypoints.md`, section "Purpose first", and two or three finished cards in `saa-plan/site/keys/`: the voice the owner already likes. Read for the manner, do not copy text.

## Who reads it

A DevOps engineer who knows Kubernetes and Linux well, has just learned Helm in module m01, and has never used Prometheus, Grafana, Loki, Tempo or OpenTelemetry. English is not their first language: short sentences, plain words, one idea per sentence, no idioms.

## Do

Follow `cards/content-module-template.md`, with these points for the pilot:

1. All 13 steps of the m02 outline, unless the documentation tells you to split or merge; say so in the pull request.
2. The one lab step ("One request, three signals") and any other step with an action: the lab is being installed on the real cluster by another worker while you write, so write the actions from the lab's files and docs and mark them `lab-unverified` in the verification log. Do not run anything against the cluster.
3. Checks: use `choice`, `exact`, `regex` and `range` where a stable answer exists. The beacon is not built yet; if a step needs a token check, write it with a slot of `m02` and note it in the pull request.
4. The quiz pool: at least 30 questions over the module's tags, in the style of the OTCA and PCA exams (concept and scenario, no lab access), each mapped to its domain and competency, each with a source.
5. Up to three figure briefs where a picture teaches faster than text. Do not build figures.
6. `lgtm/docs/adr/c0-content-notes.md`: what took the longest, where the contract was unclear, the phrases and patterns that worked, a card you are proud of and why, and what the template should say for the next module. Keep it under a page.

## Done when

- [ ] Every step of m02 exists; `npm run check:content`, `npm run build` and `npm run check:links` pass in `lgtm/learn`.
- [ ] You walked every card of the module once in the browser (`npm run dev` in `lgtm/learn`, port 8095), passed each check with its right answer and took the quiz; the pull request says what you saw.
- [ ] Every statement has a row in the verification log; lab actions are listed as `lab-unverified`.
- [ ] The pool has at least 30 questions and covers every competency of O1 and P1 that m02 is mapped to.
- [ ] The notes file exists.

## Report

The pull request link, step and question counts, total study minutes, outline changes, the unverified lab actions, and the three things the owner should look at first when judging the pilot.
