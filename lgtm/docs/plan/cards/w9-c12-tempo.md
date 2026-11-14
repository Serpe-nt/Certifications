# C12: module m13 Tempo

Wave 9. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C12.

## Owns

`lgtm/learn/src/content/modules/m13.yaml`, `lgtm/learn/src/content/steps/m13/**`, `lgtm/learn/src/content/questions/m13.yaml`, `lgtm/docs/verification/m13.md`, and `lgtm/docs/adr/c12-content-notes.md` if you have something the next worker should know.

## Read, on top of the template

- Module m07 steps 5, 6 and 10 (spans, context propagation, sampling), m09 steps 8 and 9 (the span metrics connector, tail sampling), m11 steps 9 and 12 (the most expensive metric of tenant `lab` is a span metric; exemplars) and m12 as merged: m13 is the third store and is written as their sibling. In those modules the learner opened traces that someone handed them; this module teaches them to find one.
- `lgtm/lab/helm/tempo/values.yaml` and `lgtm/lab/docs/lgtm.md` (the release `tempo`): Tempo 3 in microservices mode. Distributors write to the Kafka topic `tempo-traces`; two block-builders write blocks to the bucket `tempo-traces`; two live-stores serve the last minutes; the backend scheduler and worker compact and apply 48 hours of retention; the metrics-generator writes span metrics and service graphs to Mimir as tenant `lab`; multi-tenancy is on; the chart's gateway is off, so the lab's address `tempo.lab.k8s.local` reaches the query frontend.
- `lgtm/lab/helm/grafana/values.yaml`: the data source `tempo` and what it links to.
- `lgtm/docs/plan/02-lab-contract.md`, "Check tokens": the beacon sends a trace a minute per slot, with the root span `beacon.tick` and a child span `beacon.slot` that carries the attributes `beacon.slot` and `beacon.token`.
- `lgtm/docs/research/01-stack-versions.md`, the part on Tempo 3. Check each point against grafana.com/docs/tempo for the version the lab runs.
- grafana.com/docs/tempo for that version: the architecture and each component, sending traces and the OTLP endpoints, the search and trace-by-id API, TraceQL (intrinsics, attribute scopes, comparison and structural operators, aggregates, `select`), TraceQL metrics and what they need, the metrics-generator with its processors, sampling guidance, the block format and compaction, retention, multi-tenancy, the overrides and limits with the error for each, and Traces Drilldown in Grafana's documentation.

## The learner at this point

They have done m00 to m12. They can read a trace waterfall, know what a span and its attributes are, and have written PromQL and LogQL. TraceQL is new. Job ads rarely name Tempo, but "find the slow request and say why" is asked in every interview, and TraceQL is how it is done here.

## The module, 13 steps

It serves jobs; no exam maps to it (`cert: none`).

- Step 1 is the problem: a slow request crosses six services, and neither a metric nor a log line shows where the time went. Trace-first debugging as a habit.
- Step 2 is the architecture as the lab runs it, one `<Flow>` for the write path and one for the read path. Every component named is a pod the learner sees, and the learner reads one metric of its own from each, as module m11 step 5 does for Mimir. Say what Kafka is doing here in one paragraph and point to m11 step 2; do not teach it again.
- Step 3, sending traces: the road a span of the shop takes through the collector gateway to the distributor, and a trace of the learner's own. Practice traces go to a tenant of their own, `learn-m13`, never to `lab`: send a handful of spans from a small pod in `learn-m13` straight to the distributor with that tenant, and read them back with curl through the lab's address with the header. Say why Grafana does not show them.
- Step 4, find a trace three ways: by its id, by search, and from a log line. Tokens fit steps 4 to 6: the learner reaches `beacon.token` with exactly the skill the step teaches. Slots `span-m13-1` to `-9`, each used once.
- Steps 5 and 6 are TraceQL, in the order a person learns it: a span set, intrinsics and attributes with their scopes, comparisons; then structural operators and aggregates. Every step is a drill on the lab's real traces of the last 15 minutes. Run each query on the lab and say what it returned; where the documentation and the lab disagree, the lab decides and the step says so.
- Step 7, TraceQL metrics. Find out on the lab first whether they work: the lab's metrics-generator runs the processors `service-graphs` and `span-metrics` only, and the documentation says what TraceQL metrics need in the version the lab runs. If they do not work on this lab, the step shows the query, the answer the lab gives and the setting that is missing, and the pull request names it as a change for the lab; do not change the lab.
- Step 8, the metrics-generator: span metrics and service graphs, read from the lab's values and found again in Mimir. Module m11 step 9 found that `traces_spanmetrics_latency_bucket` is the most expensive metric of tenant `lab`; say why, with the dimensions the lab sets.
- Step 9, sampling: head, tail, and what Tempo then holds. A concept step that builds on m07 step 10 and m09 step 9: what a sampled store does to a TraceQL search, to span metrics and to TraceQL metrics. Read from the lab's gateway whether the lab samples at all.
- Step 10, blocks, the block format and retention: what a block-builder writes, what the backend worker compacts, how the 48 hours are applied. Read-only on the lab; no reading of object-store credentials.
- Step 11, Traces Drilldown. Check on the lab's Grafana that it is there and what it shows before you write about it.
- Step 12, a slow checkout. The learner switches the flag `productCatalogLockContention` on, finds the slow traces with TraceQL, finds the span that waits and the reason, and switches the flag off. Run it once under the flag rules of the wave notes, and write the times into the log.
- Step 13, tenants and limits: the header, what the lab's overrides set, and one limit reached on purpose as the practice tenant with a few spans (choose one the learner can reach without load, read the real value from the lab, send, and read the refusal in the answer and in Tempo's own metrics). Do not change the lab's limits and do not flood.

Tags: the thirteen that `04-tags.md` gives m13.

## The lab in this wave

- Keep every search of your own to a short time range.
- Practice data goes to the tenant `learn-m13`. You create things only in the namespace `learn-m13` and delete it at the end. The release `tempo` is read, never changed.
- The fault flag `productCatalogLockContention`, for step 12 only, under the flag rules of the wave notes in `README.md`.
- Your session will refuse to change the shared cluster until the owner says so in it. In your first message ask once for all you need, then start with what needs none of it: a go-ahead to create and delete `learn-m13`, to write to the practice tenant, and to switch your flag on once for at most 15 minutes; a Grafana sign-in in your session's browser pane (never type a password, never read the admin password from the cluster); the lab seed in the site's settings, or their word that you may read it, for the token checks.

## Yours

- Namespace and tenant: `learn-m13`. Fault flag: `productCatalogLockContention`. Site port: 8097. Local port-forwards: 18100 to 18109.
- Token slots: `span-m13-1` to `-9`.

## Done when, on top of the template

- [ ] The 13 steps exist (or the pull request explains each split, merge or drop), at least seven of them with Practice.
- [ ] Every TraceQL query in the module was run on the live lab on a short time range and returned what the text says; `learn-m13` is gone; every flag is off, with the times yours was on.
- [ ] The pool has at least 30 questions, at least half of them showing a TraceQL query and asking what it returns, what is wrong with it, or which of two finds the trace.
- [ ] The pull request says whether TraceQL metrics work on the lab and, if not, which setting the lab should change.
