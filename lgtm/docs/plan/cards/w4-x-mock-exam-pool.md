# X1 and X2: the mock exam pools

Wave 4. Model Opus 5.5, high effort. Two sessions from this one card: X1 writes the OTCA pool, X2 the PCA pool. They run beside the design session DZ and share no file with it or with each other.

Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

## Owns

| Worker | Files |
|---|---|
| X1 | `lgtm/learn/src/content/questions/mock-otca.yaml`, `lgtm/docs/verification/mock-otca.md` |
| X2 | `lgtm/learn/src/content/questions/mock-pca.yaml`, `lgtm/docs/verification/mock-pca.md` |

Nothing else. In particular nothing under `lgtm/learn/src/` outside those two question files: the design worker is rebuilding the site there.

## Read first

- `lgtm/docs/plan/03-content-contract.md`: only the sections "Question file", "Writing rules", "Verification log" and "Automatic checks" apply to you. The note at its top about the form of a step being on hold does not touch questions.
- `lgtm/docs/research/02-certs-and-demand.md`, part A: the exam's format, its domains with weights, and the exact competency names. Check them once against the official curriculum PDF it links, and use the names exactly.
- `lgtm/docs/plan/01-curriculum.md`: "Exam domains used for mapping" and the modules that serve your exam, so your tags can name the module that will teach them.
- `lgtm/docs/adr/c0-content-notes.md`: what the pilot learned about writing questions. All of it applies.
- `lgtm/learn/src/content/questions/m02.yaml`: 39 questions the owner has seen. Match their format. Do not repeat them: a mock question on the same fact must ask it another way.
- `lgtm/learn/CLAUDE.md`, the table "Constants": how a mock exam is drawn from your pool.

## Goal

A pool the site can draw several different 60-question mock exams from, in the style and at the level of the real exam, with every fact checked against an official page.

## What the real exam is

Both exams: 60 multiple-choice questions, 90 minutes, pass at 75%, no access to a lab or to documentation. So every question must be answerable from understanding alone: concepts, what a piece of configuration or a query does, what to do in a described situation. Never "run this and paste the result".

## How many, and where

At least one and a half times what one exam draws from each domain, and at least three questions on every competency of the curriculum.

| X1, OTCA | Drawn per exam | In the pool, at least |
|---|---|---|
| O1 Fundamentals of Observability | 11 | 17 |
| O2 The OpenTelemetry API and SDK | 28 | 42 |
| O3 The OpenTelemetry Collector | 15 | 24 |
| O4 Maintaining and Debugging Observability Pipelines | 6 | 9 |

| X2, PCA | Drawn per exam | In the pool, at least |
|---|---|---|
| P1 Observability Concepts | 11 | 17 |
| P2 Prometheus Fundamentals | 12 | 18 |
| P3 PromQL | 17 | 26 |
| P4 Instrumentation and Exporters | 9 | 14 |
| P5 Alerting & Dashboarding | 11 | 17 |

That is 92 questions each. More is welcome where a domain is broad.

## Rules for a question

1. The format of the contract: `id` (`q-mock-otca-001`, `q-mock-pca-001`, counting up; never renamed or reused), `tags`, `exam` with domain and exact competency, `q`, `options` with a `why` each, `answer`, `source`. Four options with one answer, or five with two answers and "(Choose two.)" in the question; keep choose-two questions under a fifth of the pool.
2. **Checked facts only.** Every fact the right answer and each explanation rest on comes from an official page you fetched in this session: opentelemetry.io and the OpenTelemetry specification and repositories for X1; prometheus.io and the Prometheus repositories for X2; grafana.com/docs where a competency is about dashboards or Grafana alerting; sre.google for SLO vocabulary. `source` is the page that states the fact the right answer depends on, not a page near the topic.
3. **Words about status must match the page.** Stable, beta, alpha, experimental, deprecated, in development: only as an official page says it, and for OpenTelemetry signals the status page is the source. Prefer questions whose answer does not depend on a status that may change next month.
4. **Versions.** Write for the current releases (OpenTelemetry as on its site today; Prometheus 3.x). The PCA curriculum dates from 2022: where Prometheus 2 and 3 behave differently, either name the version in the question or ask about what is true in both. Do not build a question on a feature that is experimental today.
5. **Fair options.** Wrong options are things a learner with a real misconception would choose, each explained by what is wrong with it. The right answer must not stand out by length or by careful wording: measure the option lengths over the pool and even them out. No "all of the above", no "none of the above", no reference to an option's position (they are shuffled).
6. **Scenario and concept, mixed.** About half the pool should describe a situation (a symptom, a snippet of configuration, a query, a design choice) and ask what happens or what to do. Snippets are short and correct; put them in `<code>`.
7. **Plain English** for a reader whose first language is not English: short sentences, one question per question. Pass the pool through `humanizer` at the end, then check again that no fact, number, name, flag or query changed.
8. **Your own questions.** Do not copy or adapt questions from exam dumps, practice-exam sites, courses or books. Do not paste sentences from the documentation; explain in your own words.
9. **Markup.** In YAML strings only `<b>` and `<code>`, never backticks. Mind the YAML traps in the pilot's notes (a plain value with a colon and a space, competencies with commas, options that are bare numbers).

## Tags

Each question has one or two tags. A tag names a topic that one module's steps will teach, so that later a missed question can send the learner back to those steps.

- Where one of the pilot's tags fits, use it: `observability`, `metrics`, `logs`, `traces`, `profiles`, `correlation`, `golden-signals`, `slo`, `push-pull`, `cardinality`, `semantic-conventions`, `instrumentation`, `analysis`.
- Otherwise make a tag, lower-case words joined by hyphens, with these first words: X1 uses `otel-` for the API, the SDK, signals, propagation and configuration, and `collector-` for the Collector and pipelines; X2 uses `prom-` for Prometheus itself, `promql-` for the query language, `exporter-` for exporters and client libraries, `alert-` for alerting and Alertmanager, `dashboard-` for dashboards. Aim for a tag per topic a single step could teach (for example `promql-rate`, `collector-processors`, `otel-context-propagation`), about 25 to 40 tags for the pool, not one per question.
- At the end of your verification log, list every tag you made, how many questions carry it, and the module of the curriculum that should teach it. The planner turns the two lists into the course's tag registry.

`npm run check:content` warns that these tags are not taught by any step yet. That is expected for a mock pool until the modules exist; every other rule must pass with no error.

## Verification log

One table for the pool: question id, the fact its right answer rests on, the source, the date, the status (`checked` or `inference`, with what an inference is drawn from). Then the tag list. Fill it as you write.

## Check your work

- `npm ci`, then `npm run check:content` and `npm run build` in `lgtm/learn`. In PowerShell use `npm.cmd`.
- Take one full mock exam in the browser and read every question as a candidate would. The design worker holds ports 8095 and 8096: start your own server with `npx astro dev --port 8097` (X1) or `--port 8098` (X2), and stop it when done. The site's look is being redesigned; judge the questions, not the page.
- You may start one read-only sub-agent at the very end for an independent check of 15 questions picked across the domains: give it the question file and tell it to fetch the sources itself and judge each right answer, each wrong option and each explanation. Fix what it finds, then look for the same kind of fault in the rest of the pool.
- `npm run check:links` once at the end.

## Done when

- [ ] The pool has at least the counts above per domain, and at least three questions on every competency.
- [ ] `check:content` reports no error (the tag warnings aside), `build` passes, `check:links` passes.
- [ ] One full mock exam was taken in the browser: it drew 60 questions with the right count per domain and ended with a result per domain.
- [ ] The verification log has a row for every question and the tag list.
- [ ] The independent check ran; the pull request gives its counts and what was fixed.
- [ ] The pull request states the share of scenario questions, the share of choose-two questions, and how the right answers' lengths compare with the wrong ones.

## Report

The pull request link, the count per domain, the tag list in one line, what the independent check found, and the three questions you are least sure of, with why.
