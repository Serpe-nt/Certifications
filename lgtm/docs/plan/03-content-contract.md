# Content contract

The format of modules, steps and questions. The site engine (`lgtm/learn`) implements it as build-time schemas, so a file that breaks it fails the build. Content workers write to it. Version 1 (2026-11-09: the decisions in `lgtm/docs/adr/s1-content-format.md` are folded in), owned by the planner; ask for changes in the pull request.

## Files

```
lgtm/learn/src/content/
  modules/m04.yaml              one file per module
  steps/m04/s07-rate.mdx        one file per step
  questions/m04.yaml            the module's quiz pool
  questions/mock-otca.yaml      mock exam pools
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

Frontmatter:

```yaml
id: m04-s07                 # module id + step number at the time of writing; never renamed or reused
title: Classic histograms and histogram_quantile()
kind: concept               # concept | lab | drill | recap
minutes: 15                 # honest estimate
order: 7                    # position in the module; this may change, the id may not
exam:
  - cert: pca               # pca | otca | none
    domain: P3              # P1..P5, O1..O4
    competency: Histograms  # exact name from the curriculum
tags: [promql-histogram]    # 1 to 3; these tie steps to questions for review and weak spots
flags: []                   # fault flags the step turns on; it must also turn them off
check:                      # required when kind is lab or drill
  kind: exact               # exact | regex | range | choice | token
  prompt: Paste the p95 latency bucket boundary you found.
  answer: "0.5"             # exact: string, compared after trimming and lower-casing
sources:
  - title: Histograms and summaries
    url: https://prometheus.io/docs/practices/histograms/
    checked: 2026-11-20
```

Check kinds:

| Kind | Fields | Passes when |
|---|---|---|
| `exact` | `answer` or `answers` | the pasted text equals one of them after trimming and lower-casing |
| `regex` | `pattern` | the pasted text matches; used for shapes such as a trace id |
| `range` | `min`, `max` | the pasted number is inside the range |
| `choice` | `options`, `answer` | the learner picks the right option |
| `token` | `slot` | the pasted text equals the token for that slot (see the lab contract) |

Prefer a check that needs the skill the step teaches. Use `token` when nothing in the shop gives a stable answer. Never ask for something that differs between two healthy labs unless the check is `regex`, `range` or `token`.

Body: MDX with these components, in this order. `Why`, `Idea` and `Question` are required on every step; `Do`, `Done` and a check are required on lab and drill steps.

```mdx
<Why>A short scene: the problem this thing was made to solve. 80 to 420 characters.</Why>
<Idea>The answer in two or three plain sentences.</Idea>
<Points>
  <Point label="What the label says">One point. Up to six, in story order.</Point>
</Points>
<Do>
  1. Numbered actions with the exact command or click.
</Do>
<Done>How you know it worked.</Done>
<Trap>The usual mistake. Optional.</Trap>
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

The card question is the question text, then a list of exactly four items; each item is the option, a blank line, and its explanation indented under it. `answer` is the letter of the right item as written in the file (a to d); the options are shuffled on screen. Its id is `q-<step id>`.

Other components: `<LabLink to="grafana" path="/explore">` for anything in the lab (never a hard-coded address), `<Cmd>` for a command to copy, `<Query lang="promql|logql|traceql">` for a query to copy.

In MDX a brace starts a JavaScript expression, so a query or command that contains braces is written as a template string: ``<Query lang="promql">{`rate(http_requests_total{job="shop"}[5m])`}</Query>`` and ``<Cmd>{`kubectl get pods -n shop`}</Cmd>``.

The lab check comes from the frontmatter, so the page shows it after the body, in a "Lab check" box. On lab and drill steps Mark complete stays disabled until the check has passed, and a passed check stays passed on every device. The answers of `exact`, `regex`, `range` and `choice` checks can be read in the page source; that is accepted for a self-study site.

A step's address is `/m/<module>/<step number>/`, for example `/m/m04/s07/` for step `m04-s07`; it comes from the id, so it never changes when a step moves.

`<Figure id="m05-s03-explore" alt="..." brief="...">` asks for an illustration. The `id` starts with the step id and is never renamed. `alt` says what the picture shows, for a reader who cannot see it. `brief` tells the illustrator what the scene is, the one thing that happens in it, and what the learner should notice. The content author writes the brief and does not build the picture: a later session builds it as an animated scene with the Stageshow skill, and until then the site shows a labelled placeholder. At most three figures per module, and a card must still make sense without its figure.

## Question file

```yaml
- id: q-m04-017             # never renamed or reused; retire a question by deleting it
  tags: [promql-rate]       # 1 or 2; the first is the main topic
  exam: {cert: pca, domain: P3, competency: Rates and Derivatives}
  q: A counter resets when its pod restarts. Which function still gives a correct per-second rate?
  options:
    - text: rate()
      why: Correct. rate() detects counter resets and adjusts for them.
    - text: deriv()
      why: deriv() is for gauges and treats a reset as a steep fall.
    - text: delta()
      why: delta() is for gauges and returns a negative number across a reset.
    - text: idelta()
      why: idelta() uses the last two samples of a gauge and does not handle resets.
  answer: [0]               # one index, or two with "(Choose two.)" in the question and five options
  source: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
```

Rules: four options (five with two answers), one explanation per option, options are shuffled on screen so no positional wording ("the first option", "all of the above"), one clearly best answer, wrong options that a learner with a real misconception would pick. Mock exam questions copy the style of the real exams: concept and scenario questions, no lab access.

## Writing rules

1. **Purpose first.** Every card opens with the problem, then the idea, then details. Short plain sentences. The reader knows Kubernetes and Helm and nothing about the tool on the card.
2. **One step, one screen of thought.** If a card needs more than six points or more than about eight actions, split it.
3. **Checked facts only.** Every technical statement comes from an official page fetched in this session (grafana.com/docs, prometheus.io, opentelemetry.io, kubernetes.io, the projects' GitHub repositories). Put the page in `sources` with the date. A blog post may point you to a page; it is not a source. If a page contradicts the outline in `01-curriculum.md`, the page wins and the pull request says so.
4. **Versions.** Write for the versions pinned in `00-overview.md`. Name a version only where behaviour depends on it.
5. **Lab steps are run.** When the lab is up, run every action and paste the result into the verification log. When it is not, mark the step `lab-unverified` in the log; the planner runs it later.
6. **Clean up.** A step that turns a fault flag on turns it off in its last action, and says how to check it is off.
7. **Labels.** Sentence case. No all-capital labels, no "A · B · C" strings, no "Word — fragment" labels.
8. **Markup.** In YAML strings only `<b>` and `<code>`. No raw HTML in MDX beyond the components above.
9. **Ids.** Never rename or reuse a step id or a question id. They key the learner's saved progress.
10. **No copied text.** Explain in your own words; link the source. Do not paste paragraphs from the docs or from exam-preparation sites.

## Verification log

`lgtm/docs/verification/mNN.md`, one table per step:

| Statement or action | Source or evidence | Date | Status |
|---|---|---|---|
| `rate()` adjusts for counter resets | https://prometheus.io/docs/prometheus/latest/querying/functions/#rate | 2026-11-20 | checked |
| Action 3 returns one series per service | output pasted below | 2026-11-20 | run on the lab |

Statuses: `checked`, `run on the lab`, `lab-unverified`, `inference` (say what it is inferred from).

## Automatic checks (built by S1, run by every content worker)

- Schema: every file parses and matches this contract.
- Ids: unique, never changed against `main`, step ids match their module.
- Questions: option count, answer index in range, an explanation per option, no positional wording, pool size per module.
- Coverage: every tag on a question is taught by at least one step; every exam competency has at least one step and three questions by the end of the project.
- Tokens: a `token` check uses a slot of its own module, and no slot is used twice.
- Links: every source URL answers 200 (a separate tool, needs the network).
