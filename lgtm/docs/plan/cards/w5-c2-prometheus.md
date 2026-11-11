# C2: module m03 Prometheus fundamentals

Wave 5. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C2.

## Owns

`lgtm/learn/src/content/modules/m03.yaml`, `lgtm/learn/src/content/steps/m03/**`, `lgtm/learn/src/content/questions/m03.yaml`, `lgtm/docs/verification/m03.md`.

## Read, on top of the template

- `lgtm/lab/docs/lgtm.md` (the release `prometheus`) and `lgtm/lab/helm/kube-prometheus-stack/values.yaml`: the lab runs the Prometheus Operator, one Prometheus 3.13, Alertmanager, node exporter and kube-state-metrics in the namespace `prom`. Prometheus keeps one day locally and remote-writes to Mimir as tenant `prom`. It selects ServiceMonitors and PodMonitors from every namespace.
- `lgtm/lab/docs/workshop.md` and `lgtm/lab/workshop/`: the small Python service the learner instruments. The folder `solutions/` holds the finished states; see which one is for this module.
- `lgtm/learn/src/content/questions/mock-pca.yaml`, the questions of domains P2 and P4, and `lgtm/docs/verification/mock-pca.md`: do not repeat them; a module question on the same fact asks it another way.
- prometheus.io for Prometheus 3.x, and the Prometheus Operator's documentation for step 8.

## The learner at this point

They have done m00 to m02: the lab runs, they can use Helm, and they know what a metric is, why Prometheus pulls, and what a label costs (m02 steps 2, 9 and 10). They have never opened Prometheus. m04 teaches PromQL after this module, so in m03 a query is at most a metric name with a label matcher; say that m04 goes further.

## The module, 14 steps

Mapped to PCA domains P2 (Prometheus Fundamentals) and P4 (Instrumentation and Exporters), with the service discovery competency of P1. Use the competency names exactly as the research file gives them.

- The PCA curriculum dates from 2022 and the lab runs Prometheus 3. Where versions 2 and 3 differ, teach 3 and say in one sentence what older material shows, only as prometheus.io states it.
- Step 1 is the reason Prometheus exists and what it is made of. `<Flow>` fits the path from a target to a query; do not draw the whole architecture in one part.
- Step 3 (metric types): the tag has only one mock question, yet every later module leans on it. Give it full weight, and at least four pool questions.
- Step 4 is a lab: the learner reads a real `/metrics` page from the lab (a shop service or node exporter) and finds a counter, a gauge and a histogram in it.
- Steps 5 to 7 (scrape configuration, service discovery, relabeling) are where candidates lose points. Use the lab's real scrape configuration as the example: it can be read from the Prometheus screen (targets, service discovery, configuration).
- Step 8 is a lab on the Operator: the learner writes a ServiceMonitor for something small in their own namespace and watches the target appear. Everything it creates lives in `learn-m03`.
- Step 11 is a lab on the workshop service with the Prometheus client library. The service runs on the PC, not in the cluster: read `workshop.md` for how its metrics reach the lab, and use that path. If it turns out the lab cannot scrape it without a change to the lab, write the step so that the learner checks the result on the service's own `/metrics` page, and say so in the pull request.
- Step 13 (remote write) names Mimir only as the place the data goes; module m11 explains it.
- Step 14: the Prometheus screen, the HTTP API and `promtool`. If `promtool` is not among the lab's pinned tools, the learner can run it inside the Prometheus pod; check that it is there.
- Cardinality comes back here (labels on your own metrics, step 10): build on m02 step 10, do not repeat it.

Tags: the fifteen that `04-tags.md` gives m03. `prom-operator` and `prom-tools` are new and have no mock question.

## Yours

- Namespace on the lab: `learn-m03`. Read everything in `prom`; change nothing there.
- Site port: 8099. Local port-forwards: 18110 to 18119. The workshop service uses its own port (8000); run it only while you test, and stop it.
- Token slots, if a step needs one: `metric-m03-1` to `-9` (and `log-`, `span-` likewise).

## Done when, on top of the template

- [ ] The 14 steps exist (or the pull request explains each split, merge or drop). Steps 4, 8 and 11 have Practice; step 14 too if you make it a drill.
- [ ] Every lab action was run on the live lab, and `learn-m03` is gone.
- [ ] The pool covers every competency of P2 and P4, with no question that repeats a mock question.
