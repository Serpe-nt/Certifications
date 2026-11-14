# C13: module m14 Correlation and incident debugging

Wave 9. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C13.

## Owns

`lgtm/learn/src/content/modules/m14.yaml`, `lgtm/learn/src/content/steps/m14/**`, `lgtm/learn/src/content/questions/m14.yaml`, `lgtm/docs/verification/m14.md`, and `lgtm/docs/adr/c13-content-notes.md` if you have something the next worker should know.

## Read, on top of the template

- Module m02 steps 6 and 13 (one request in three signals; analysis), m08 step 6 (correlated logs), m11 step 12 (exemplars) and m12 as merged. Module m13 (Tempo and TraceQL) is being written beside you: use only what its outline in `01-curriculum.md` promises the learner, and give every TraceQL query in full.
- `lgtm/lab/docs/lgtm.md`, section "Moving between signals in Grafana", and `lgtm/lab/helm/grafana/values.yaml`: the four links the lab wires between its data sources (exemplars to a trace, a trace to its logs, a trace to its metrics and the service graph, a log line to its trace). This module takes them apart.
- `lgtm/lab/demo/TRIMMING.md`, the table of fault flags: what each flag breaks and the evidence seen when it was tried, and the notes below it on flags that need time to show. `lgtm/lab/docs/reference.md`, "Fault flags".
- `lgtm/learn/src/content/questions/mock-otca.yaml`, the questions that carry the tags `correlation` and `analysis`, and `lgtm/docs/verification/mock-otca.md`: do not repeat them.
- grafana.com/docs/grafana for the version the lab runs: exemplars, trace to logs, trace to metrics, the service graph, derived fields, and Correlations. opentelemetry.io for what links a log record to a span.

## The learner at this point

They have done m00 to m13. They can query each store on its own. What they cannot do yet is the thing an interviewer and a night on call both ask for: start from "checkout is failing" and end at a cause, with evidence, in a few minutes.

## The module, 12 steps

Mapped to OTCA domain O1 (Fundamentals of Observability) where a step serves it, and to jobs otherwise. Use the competency names exactly.

- Step 1 is the loop: alert or complaint, metric, trace, log, cause. One `<Flow>`. Each later step is one move of that loop or one whole turn of it.
- Steps 2 to 5 are the four links, each on the lab as it is: from a latency spike to one trace through an exemplar; from a trace to its logs; from a log line to its trace; from a trace to its metrics and the service graph. For each: do it, then read in the data source's settings what makes it work, and say what would break it (a renamed label, a missing attribute, a tenant that holds no exemplars). The lab's data sources are provisioned and read-only: the learner reads them and changes nothing.
- Step 6, Correlations in Grafana: the learner builds one link of their own. Find out on the lab what Grafana lets a learner create against provisioned data sources; whatever is created is named with `m14` and removed in the same step.
- Steps 7 to 11 are five incidents, one flag each: payments fail (`paymentFailure`), a memory leak (`recommendationCacheFailure`), Kafka lag (`kafkaQueueProblems`), a dependency cannot be reached (`paymentUnreachable`), one product breaks (`productCatalogFailure`). Each is written as a case: the symptom the learner is given, the loop walked on the lab with the query for every move, the cause, and the one piece of evidence that proves it. Do not name the cause before the learner has found it; the step's title may name the symptom only.
  - Run each incident yourself first, under the flag rules of the wave notes, and write what you saw with the times. A flag that needs longer than 15 minutes to show its symptom (read `TRIMMING.md`) is shown as far as it gets in that time; say in the step how long the learner waits.
  - Use a different way in for each: a dashboard panel, an exemplar, a log search, the service graph, a TraceQL query.
  - The check of each incident asks for a fact that only the investigation finds and that is the same on every lab: an error message, a span name, a product id, a status code. Not a number that changes with the load.
- Step 12, the incident note: timeline, cause, evidence, what was done. The learner writes one for the incident of step 7 from their own evidence; a `<Timeline>` shows the shape. A concept step with a model note.

Tags: the eleven that `04-tags.md` gives m14, and `correlation` and `analysis` where a question fits them.

## The lab in this wave

- This module lives in Grafana. Every click of every step is done on the lab's Grafana with the owner signed in to your session's browser pane; the same queries through the APIs are evidence for the log, not a replacement for the walk.
- You change no data source, dashboard or setting of the lab. What a step creates in Grafana (step 6) is removed in that step. You need no namespace; if a step needs a pod, it goes into `learn-m14`, which you delete at the end.
- Five fault flags, one at a time, under the flag rules of the wave notes in `README.md`. You have first call on the flags in this wave: the two other cards need one or two windows each.
- Keep log and trace searches to short time ranges.
- Your session will refuse to change the shared cluster until the owner says so in it. In your first message ask once for all you need, then start with what needs none of it: a go-ahead to switch each of your five flags on once for at most 15 minutes; a Grafana sign-in in your session's browser pane (never type a password, never read the admin password from the cluster); the lab seed in the site's settings, or their word that you may read it, if a step checks a token.

## Yours

- Fault flags: `paymentFailure`, `recommendationCacheFailure`, `kafkaQueueProblems`, `paymentUnreachable`, `productCatalogFailure`. Namespace, if needed: `learn-m14`. Grafana names: anything with `m14`.
- Site port: 8098. Local port-forwards: 18110 to 18119.
- Token slots, if a step needs one: `log-m14-1` to `-9`, `span-m14-1` to `-9`, `metric-m14-1` to `-9`.

## Done when, on top of the template

- [ ] The 12 steps exist (or the pull request explains each split, merge or drop), at least nine of them with Practice.
- [ ] Each of the five incidents was run on the live lab and walked in Grafana; the log has the times each flag was on and off and what was seen at each move; every flag is off; nothing with `m14` is left in Grafana.
- [ ] The pool has at least 30 questions and covers every competency of O1 the module is mapped to; at least two thirds are cases (a symptom and what was observed) that ask for the next move or the cause; none repeats a mock question.
- [ ] The pull request names anything in the lab's wiring between signals that does not work as `lgtm.md` says.
