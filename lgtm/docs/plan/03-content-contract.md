# Content contract

The format of modules, steps and questions. The site (`lgtm/learn`) implements it as build-time schemas and `npm run check:content`, so a file that breaks it fails the build. Content workers write to it.

Version 2 (2026-11-11), owned by the planner; ask for changes in the pull request. What changed from version 1: a step is an article, not a stack of labelled boxes. The owner rejected the old form after reading the pilot and approved the new one on two specimen steps (`m02-s10`, `m02-s06`) in the design session; the decision record is `lgtm/docs/adr/dz-article-format.md`. Questions, checks, ids and the verification log are as before.

## Files

```
lgtm/learn/src/content/
  modules/m04.yaml              one file per module
  steps/m04/s07-rate.mdx        one file per step
  questions/m04.yaml            the module's quiz pool
  questions/mock-otca.yaml      mock exam pools (written, 113 and 109 questions)
  questions/mock-pca.yaml
lgtm/docs/verification/m04.md   the module's fact-check and lab-check log
```

One content session owns one module: its `modules/mNN.yaml`, its `steps/mNN/` folder, its `questions/mNN.yaml` and its verification log. Nothing else.

## Module file

```yaml
id: m04
title: PromQL
goal: Write the RED queries for any service without looking them up.
order: 4
quiz: true            # false for m00 and m18
exams: [pca]          # which exams this module mainly serves
```

## Step file

### Frontmatter

```yaml
id: m04-s07                 # module id + step number at the time of writing; never renamed or reused
title: Classic histograms and histogram_quantile()
kind: concept               # concept | lab | drill | recap
minutes: 15                 # honest estimate
order: 7                    # position in the module; this may change, the id may not
outcome: You can read a classic histogram and estimate a percentile from its buckets.
terms:                      # optional, up to 8; shown in the sidebar
  - term: Bucket
    def: A counter of observations at or below one upper bound.
exam:
  - cert: pca               # pca | otca | none
    domain: P3              # P1..P5, O1..O4
    competency: Histograms  # exact name from the curriculum
tags: [promql-histograms]   # 1 to 3, from the tag list (04-tags.md)
flags: []                   # fault flags the step turns on; it must also turn them off
check:                      # required when kind is lab or drill
  kind: exact               # exact | regex | range | choice | token
  prompt: Paste the upper bound of the bucket that holds the 95th percentile.
  answer: "0.5"
sources:
  - title: Histograms and summaries
    url: https://prometheus.io/docs/practices/histograms/
    checked: 2026-11-20
```

- `outcome` is required: one sentence that starts with "You can", at most 240 characters. It is shown under the title.
- `terms`: the words the step introduces, each defined in one plain line (term at most 40 characters, definition at most 160). Leave it out when the step introduces none.
- `check` decides the tabs: a step with a check gets Learn and Practice; a step without one is only the article.

Check kinds:

| Kind | Fields | Passes when |
|---|---|---|
| `exact` | `answer` or `answers` | the pasted text equals one of them after trimming and lower-casing |
| `regex` | `pattern` | the pasted text matches; used for shapes such as a trace id |
| `range` | `min`, `max` | the pasted number is inside the range |
| `choice` | `options`, `answer` | the learner picks the right option |
| `token` | `slot` | the pasted text equals the token for that slot (see the lab contract) |

Prefer a check that needs the skill the step teaches. Use `token` when nothing in the shop gives a stable answer. Never ask for something that differs between two healthy labs unless the check is `regex`, `range` or `token`. The answers of `exact`, `regex`, `range` and `choice` checks can be read in the page source; that is accepted for a self-study site.

### Body: an article, read from top to bottom

1. `<Problem>`: the problem this thing was made to solve, told as a short scene. 80 to 420 characters. Always first.
2. A sentence or two of running text that leads from the problem to the idea (optional, often useful).
3. `<Idea>`: the answer in two or three plain sentences.
4. Two to five sections, each a `## Heading` with running text. Information parts sit inside the section they illustrate.
5. `<InLab>`, `<Trap>` and `<Remember>`, in that order, where the step has something for them.
6. On a lab or drill step: `<Do>`, `<Done>`, and `<Trap practice>` when the trap is about the lab work.
7. `<Question>`, last.

The page numbers the sections and lists the `##` headings in the sidebar as "In this article", so a heading says what its section says ("Labels multiply series", not "Details"). Authors write no numbers.

Running text carries the explanation. A part or an information part never holds the only copy of a fact the text needs: it marks, shows or sums up what the text explains.

### Article parts

| Part | Purpose | Use when | Do not use | Length |
|---|---|---|---|---|
| `<Problem>` | The scene that makes the step needed | Every step, first | For a definition | 80 to 420 characters |
| `<Idea>` | The answer, stated once | Every step, once | For a list of facts | 2 or 3 sentences |
| `<InLab>` | Where the idea shows up in this lab, with real names | A concept touches something the lab has | For instructions (those go in `<Do>`) | 1 or 2 sentences |
| `<Trap>` | The usual mistake | A belief the step could create, or a common slip | For a new fact | 1 to 3 sentences |
| `<Trap practice>` | A mistake made while doing the lab work | The trap is about an action | On a concept step | 1 to 3 sentences |
| `<Remember>` | What to keep after the step | At most once | To repeat the idea word for word | 1 or 2 sentences |
| `<Do>` | Numbered actions in the lab, exact command or click | Lab and drill steps | On a concept step | about 8 actions at most |
| `<Done>` | How you know it worked | Lab and drill steps | | 1 or 2 sentences |
| `<Question>` | The step's knowledge check | Every step, last | | see below |

Also: `<LabLink to="grafana" path="/explore">` for anything in the lab (never a hard-coded address), `<Cmd>` for a command to copy, `<Query lang="promql|logql|traceql">` for a query to copy. In MDX a brace starts a JavaScript expression, so a query or command with braces is written as a template string: ``<Query lang="promql">{`rate(http_requests_total{job="shop"}[5m])`}</Query>``.

### Information parts

They take the place of pictures. The author fills them with data from the step; no drawing is needed. Use one where it shows something the text would otherwise list; at most three per step.

| Part | Items | Shows | Use when |
|---|---|---|---|
| `<Flow caption>` | 2 to 4 `<Stage title kicker>` with one line each | A path through steps or components, left to right; the last stage is highlighted | Something moves from one place to the next |
| `<Compare caption>` | 2 or 3 `<Col title hot>` with one line or a short list | Things side by side; `hot` marks the one the step recommends | The reader must choose between options |
| `<Figures caption unit>` | 2 to 5 `<Stat label value amount max hot note>` | Numbers with a bar to scale; `amount` and `max` set the bar, `value` is printed | The point is a size or a ratio |
| `<Layers caption>` | 2 to 5 `<Layer title hot>` with one line | A stack from top to bottom | Things sit on each other, or go from general to specific |
| `<Timeline caption>` | 2 to 6 `<Event at title>` with one line | Moments in order; `at` is a time or a position | Order in time matters |

Every number, name and label in an information part is a fact like any other: it needs its row in the verification log.

Three things the first modules ran into:

- The page prints the `label` of a `<Stat>` in capitals. Do not put text there whose case matters, such as a label name or a piece of a query (`le="0.1"` would read `LE="0.1"`); put it in `value` or in the text.
- A practice trap opens with `<Trap practice>` and closes with `</Trap>`. `check:content` does not catch a wrong closing tag; the build does. Open each step in the site after writing it.
- Inside a `<Cmd>` or `<Query>` template string, a word in angle brackets is read as HTML. Write a placeholder in capitals (`REVISION`) and say what to put there.

`<Figure id="m05-s03-explore" alt="..." brief="...">` asks for an animated illustration of a screen. The `id` starts with the step id and is never renamed. The author writes `alt` (what the picture shows) and `brief` (the scene, the one thing that happens, what the learner should notice) and does not build it; the site shows a labelled placeholder until a later session builds the scene. At most three per module, and the article must make sense without it.

### Learn and Practice

- Learn is the article: everything except what belongs to practice.
- Practice holds `<Do>`, `<Done>`, `<Trap practice>`, the lab check and, on a step with Practice, the question. The page places the check after `<Done>`; authors do not place it.
- Mark complete waits for the check on lab and drill steps. A passed check stays passed on every device.

### The question on a step

```mdx
<Question id="q-m04-s07" answer="b">
Which function gives a correct per-second rate across a counter reset?

- deriv()

  deriv() is for gauges and reads a reset as a steep fall.

- rate()

  rate() detects counter resets and adjusts for them.

- delta()

  delta() is for gauges and goes negative across a reset.

- idelta()

  idelta() looks at the last two samples of a gauge.
</Question>
```

The question text, then a list of exactly four items; each item is the option, a blank line, and its explanation indented under it. `answer` is the letter of the right item as written in the file (a to d); the options are shuffled on screen. Its id is `q-<step id>`. The page prints "Right." or "Not quite." above an explanation, so an explanation never starts with "Right:" or "Correct.".

A step's address is `/m/<module>/<step number>/`, for example `/m/m04/s07/`; it comes from the id, so it never changes when a step moves.

### Two finished examples

`lgtm/learn/src/content/steps/m02/s10-cardinality.mdx` (a concept step) and `s06-one-request-three-signals.mdx` (a lab step, with Practice). Read both before writing; copy their manner, not their sentences. `lgtm/learn/tests/fixtures/content/steps/m90/s01-concept.mdx` shows every part once.

The old form (`<Why>`, `<Points>`, `<Point>`) still builds, so that module m02 could be moved step by step. Write no new step in it, and never mix the two forms in one step.

## Question file

```yaml
- id: q-m04-017             # never renamed or reused; retire a question by deleting it
  tags: [promql-rate]       # 1 or 2, from the tag list; the first is the main topic
  exam: {cert: pca, domain: P3, competency: Rates and Derivatives}
  q: A counter resets when its pod restarts. Which function still gives a correct per-second rate?
  options:
    - text: rate()
      why: rate() detects counter resets and adjusts for them.
    - text: deriv()
      why: deriv() is for gauges and treats a reset as a steep fall.
    - text: delta()
      why: delta() is for gauges and returns a negative number across a reset.
    - text: idelta()
      why: idelta() uses the last two samples of a gauge and does not handle resets.
  answer: [0]               # one index, or two with "(Choose two.)" in the question and five options
  source: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
```

Rules for every question, on a step or in a pool:

1. Four options (five with two answers), one explanation per option. Options are shuffled on screen, so nothing refers to a position, and there is no "all of the above" or "none of the above".
2. One clearly best answer. Wrong options are things a learner with a real misconception would choose, each explained by what is wrong with it.
3. The right answer does not stand out by length or by careful wording. Measure the option lengths over the pool and even them out; in the pilot's first draft 25 of 39 right answers were the longest option.
4. `source` is the page that states the fact the right answer depends on, not a page near the topic. A wrong option's explanation that states how a product behaves needs a page too, named in the log.
5. An explanation never starts with "Correct." or "Right:"; the site prints that.
6. In YAML only `<b>` and `<code>`, never backticks. Mind YAML: a plain value with a colon and a space breaks the file, a competency with commas inside `{...}` must be quoted, an option that is a bare number must be quoted.
7. A module pool has at least 30 questions over the module's tags and the competencies it is mapped to, about half of them scenarios. Do not repeat a mock pool question; ask the fact another way.

## Tags

A tag names a topic that the steps of one module teach. Tags tie a missed question to the steps to go back to, feed weak-spot practice, and are checked: every tag on a module pool's question must be on at least one step. The list of tags, with the module that teaches each, is `04-tags.md`. Use a tag from it; when your module needs a new one, add it in your pull request text and the planner adds it to the list. The mock pools already carry tags for most modules: your steps must teach the tags the list gives your module, or your pull request says why one does not fit.

## Writing rules

1. **Purpose first.** Every step opens with the problem, then the idea, then the explanation. The reader knows Kubernetes and Linux, has learned Helm in module m01, and knows nothing about the tool the step is on.
2. **One step, one article of two to five sections.** If a step needs more, split it and say so in the pull request.
3. **An article, not a list.** Sections follow each other as one explanation: each starts from what the one before left open. No section that is only a list of facts; no heading such as "Details" or "More".
4. **Plain English.** English is the reader's second language. Short sentences, common words, one idea per sentence, no idioms. Define a term the first time it appears and put it in `terms`.
5. **Checked facts only.** Every technical statement comes from an official page fetched in this session: grafana.com/docs, prometheus.io, opentelemetry.io, kubernetes.io, helm.sh, the projects' GitHub repositories, and sre.google for SLO vocabulary and the golden signals. Put the page in `sources` with the date. A blog post may point you to a page; it is not a source. Fetch the pages at the start, keep them as text, and search them while you write. If a page contradicts the outline in `01-curriculum.md`, the page wins and the pull request says so.
6. **Words about status match a page.** Stable, beta, alpha, experimental, deprecated, GA, in development: only as a cited page says it. For OpenTelemetry signals the status page is the source, and the sentence says which part is meant (API, SDK or protocol).
7. **Versions.** Write for the versions pinned in the lab's `VERSION` files (`00-overview.md`, section 6). Name a version only where behaviour depends on it. Names of buttons and screens come from the version in the lab; record that version in the log, not in the text.
8. **Lab steps are run.** Run every action on the lab and paste the decisive output into the verification log. If the lab is down, mark the rows `lab-unverified` and say so in the pull request.
9. **Clean up.** A step that turns a fault flag on turns it off in its last action and says how to check it is off. Anything a step creates in the cluster goes into a namespace of its own and is removed at the end of the step or the module.
10. **Through the humanizer.** Pass the finished text through the `humanizer` skill, then check every fact, number, name, command and query against the log again.
11. **Ids.** Never rename or reuse a step id or a question id. They key the learner's saved progress.
12. **No copied text.** Explain in your own words; link the source. Nothing from documentation, courses, books or exam-preparation sites is pasted or adapted.

## Verification log

`lgtm/docs/verification/mNN.md`, one table per step:

| Statement or action | Source or evidence | Date | Status |
|---|---|---|---|
| `rate()` adjusts for counter resets | https://prometheus.io/docs/prometheus/latest/querying/functions/#rate | 2026-11-20 | checked |
| Action 3 returns one series per service | output pasted below | 2026-11-20 | run on the lab |

Statuses: `checked`, `run on the lab`, `lab-unverified`, `inference` (say what it is inferred from). A fact from the lab's own files is logged by file path; `sources` in the frontmatter takes only web pages.

## Automatic checks (run by every content worker)

- Schema: every file parses and matches this contract.
- Form: `<Problem>` first and its length; `outcome` present; `<Problem>`, `<Idea>` and `<Question>` present, with `<Do>` and `<Done>` on lab and drill steps; no old-form part mixed in; each information part has at least two items, and a `<Stat>` has a label, a value and `0 <= amount <= max`. More than three information parts on a step is a warning.
- Ids: unique, never changed against `main`, step ids match their module.
- Questions: option count, answer index in range, an explanation per option, no positional wording, pool size per module.
- Coverage: every tag on a question is taught by at least one step (in a mock pool this is a warning until the end of the project, because the pools were written before the modules); every exam competency has at least one step and three questions by the end of the project.
- Tokens: a `token` check uses a slot of its own module, and no slot is used twice.
- Links: every source URL answers 200 (`npm run check:links`, needs the network).
