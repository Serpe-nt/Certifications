# C3: module m04 PromQL

Wave 6. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C3.

## Owns

`lgtm/learn/src/content/modules/m04.yaml`, `lgtm/learn/src/content/steps/m04/**`, `lgtm/learn/src/content/questions/m04.yaml`, `lgtm/docs/verification/m04.md`.

## Read, on top of the template

- Module m03 as merged (`steps/m03/`), above all s02 (data model), s03 (metric types) and s14 (the Prometheus screen): m04 builds on them and must not repeat them.
- `lgtm/learn/src/content/questions/mock-pca.yaml`, the 31 questions of domain P3, and `lgtm/docs/verification/mock-pca.md`: do not repeat them.
- `lgtm/lab/docs/reference.md` (data sources, tenants) and `lgtm/lab/docs/beacon.md` (the metric `lab_beacon_value`, one series per slot).
- prometheus.io: querying basics, operators, functions, examples, recording rules, the native histograms specification, and the practices pages on histograms and rules.

## The learner at this point

They have done m00 to m03: they can read a `/metrics` page, they know the data model and the four metric types, and they have run a metric name with a label matcher on the Prometheus query page. This is the first module where they write queries. PromQL is 28% of the PCA exam, the largest domain, and the skill job ads ask for by name.

## The module, 14 steps

Mapped to PCA domain P3 (PromQL). Use the competency names exactly as the research file gives them.

- Teach every construct by a question someone would ask about a running system, then the query that answers it, then why it has that shape. Not a tour of the function list.
- Almost every step can have Practice: the learner runs queries and pastes a result. Make at least eight of the fourteen steps lab or drill steps. The values of live series change, so use checks that still have one answer on every healthy lab: a label value, a count of series that is fixed by the lab's shape (seven nodes, three masters), a `range`, or a token.
- Tokens fit this module well. `lab_beacon_value{slot="metric-m04-1"}` returns the token of that slot; a step can make the learner reach it with the skill it teaches (a regex matcher, an aggregation that leaves one series, an `offset`). Slots `metric-m04-1` to `-9`, each used once.
- Where the data is: the lab's Prometheus (the query page from m03, and the Grafana data source `prometheus`) holds one day of cluster metrics: node exporter, kube-state-metrics, kubelet, Prometheus itself. Mimir (data source `mimir`, tenant `lab`) holds the shop's metrics, which arrive over OTLP. Read the real metric names from the lab before you write a query; do not assume the names of the upstream demo.
- Step 3 (`rate`, `irate`, `increase`) and step 7 (classic histograms and `histogram_quantile`) carry the most exam weight. Give them room, and show the mistakes: `rate` of a gauge, `sum` before `rate`, a quantile without `le`.
- Step 8, native histograms. The lab's Prometheus scrapes classic histograms only today (m03 step 3 says so). Card L5 reports in its pull request what one setting would turn native histograms on. Write step 8 as a concept step from the specification. If you want a lab action in it, say in your pull request exactly what the lab must change; do not change the lab.
- Step 12, recording rules: the lab's Prometheus already loads rule files (m03 step 14 counts them). Read real rules from it. The learner does not add a rule to the lab in this module; module m15 does that for alerts.
- Step 13 is the drill the module's goal names: rate, errors and duration for one shop service, written without looking them up. It needs the shop's metrics in Mimir.
- Step 14, the usual mistakes, draws on the traps of the steps before it. It is a good place for a `<Compare>` of a wrong query and the right one.

Tags: the eleven that `04-tags.md` gives m04. Three are new and have no mock question: `promql-recording-rules`, `promql-red`, `promql-mistakes`.

## The lab in this wave

- Kafka was down from 2026-11-11 17:57 UTC and card L5 repairs it while you work. Until it reports, Mimir has no fresh data: the shop's metrics and `lab_beacon_value` return nothing new. Write and run the steps that use Prometheus's own data first; run the steps that need Mimir (the tokens, step 13) after the planner tells you ingest is back. Expect a gap in Mimir's data over those hours and do not build a check on that time range.
- Grafana needs a sign-in. Do not type a password, and do not read the admin password from the cluster. The owner signs in once in the app's browser pane; if Grafana still asks you to sign in, say so in your session, go on with the Prometheus query page (it needs no sign-in), and come back to the Grafana actions later.

## Yours

- Namespace on the lab, if a step needs one: `learn-m04`. You should not need it.
- Site port: 8097. Local port-forwards: 18100 to 18109.
- Token slots: `metric-m04-1` to `-9`.

## Done when, on top of the template

- [ ] The 14 steps exist (or the pull request explains each split, merge or drop), at least eight of them with Practice.
- [ ] Every query in the module was run on the live lab and returned what the text says; the log has the query and the decisive part of the result.
- [ ] The pool covers every competency of P3, with no question that repeats a mock question; at least half the questions show a query and ask what it returns or what is wrong with it.
