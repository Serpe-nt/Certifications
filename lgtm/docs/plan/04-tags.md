# Tags

A tag names one topic. Steps teach tags, questions carry them, and the site uses them to send a learner from a missed question back to the steps that teach it and to build weak-spot practice. `npm run check:content` fails a module pool question whose tag no step teaches.

Owned by the planner. Version 3 (2026-11-13): four tags added for m07 to m09 (wave 7). Version 2 (2026-11-12): tags for m04 to m06 added for wave 6. Version 1 (2026-11-11) was built from the pilot module and the two mock exam pools. A content worker uses the tags this list gives its module. When a module needs a tag that is not here, the worker uses it, names it in the pull request, and the planner adds it.

## Rules

- Lower-case words joined by hyphens. The first word names the family: `helm-`, `prom-`, `promql-`, `exporter-`, `dashboard-`, `alert-`, `otel-`, `collector-`, and so on for later modules (`alloy-`, `mimir-`, `loki-`, `logql-`, `tempo-`, `traceql-`).
- One tag is a topic a single step, or two or three neighbouring steps, can teach. Not one per question, and not one for a whole module.
- A step carries 1 to 3 tags, a question 1 or 2; the first tag of a question is its main topic.
- A tag has one home module. A later module may teach it again in more depth (the "Also" column); a question in that later module's pool may then carry it.
- "Mock" is the number of mock exam questions that carry the tag today. A tag with mock questions must be taught by the steps named here, or the module's pull request says why it does not fit.
- Step numbers are those of the outline in `01-curriculum.md`. If a worker splits or merges steps, the tag follows the topic.

## m00 Start here

No quiz, so no question carries these; steps still need a tag.

| Tag | Steps | Mock |
|---|---|---|
| `course` | 1 | 0 |
| `lgtm-map` | 2 | 0 |
| `lab-setup` | 3 to 7 | 0 |

## m01 Helm

| Tag | Steps | Mock |
|---|---|---|
| `helm-concepts` | 1, 2 | 0 |
| `helm-install` | 3 | 0 |
| `helm-values` | 4 | 0 |
| `helm-render` | 5 | 0 |
| `helm-upgrade-rollback` | 6 | 0 |
| `helm-chart-structure` | 7, 10 | 0 |
| `helm-templates` | 8, 9, 10 | 0 |
| `helm-dependencies` | 11 | 0 |
| `helm-repositories` | 12 | 0 |
| `helm-hooks-tests` | 13 | 0 |
| `helm-debugging` | 14 | 0 |
| `lab-install` | 15 to 18, 20 | 0 |
| `lab-tokens` | 19 | 0 |

## m02 Observability fundamentals

| Tag | Steps | Also | Mock (OTCA + PCA) |
|---|---|---|---|
| `observability` | 1 | | 0 |
| `metrics` | 2 | | 4 + 4 |
| `logs` | 3 | | 4 + 3 |
| `traces` | 4 | | 4 + 3 |
| `profiles` | 5 | | 0 |
| `correlation` | 6 | m14 | 2 + 0 |
| `golden-signals` | 7 | | 0 + 2 |
| `slo` | 8 | m15 steps 8 to 10 | 1 + 4 |
| `push-pull` | 9 | | 0 + 4 |
| `cardinality` | 10 | m11 step 9, m12 step 12, m17 step 9 | 3 + 3 |
| `semantic-conventions` | 11 | m07 step 12 | 4 + 0 |
| `instrumentation` | 12 | m03 steps 10 and 11 | 6 + 8 |
| `analysis` | 13 | | 4 + 0 |

## m03 Prometheus fundamentals

| Tag | Steps | Also | Mock (PCA) |
|---|---|---|---|
| `prom-architecture` | 1 | | 5 |
| `prom-data-model` | 2 | | 6 |
| `prom-metric-types` | 3 | | 1 |
| `prom-exposition-format` | 4 | | 4 |
| `prom-scrape-config` | 5 | | 6 |
| `prom-service-discovery` | 6 | | 3 |
| `prom-relabeling` | 7 | | 3 |
| `prom-operator` | 8 | m06 step 5 | 0 |
| `exporter-standard` | 9 | m06 steps 3 and 4 | 2 |
| `exporter-writing` | 9 | | 5 |
| `exporter-client-libraries` | 10, 11 | | 4 |
| `prom-metric-naming` | 10 | | 5 |
| `prom-storage` | 12 | | 3 |
| `prom-remote-write` | 13 | m11 step 6 | 2 |
| `prom-tools` | 14 | | 0 |

## m04 PromQL

| Tag | Steps | Mock (PCA) |
|---|---|---|
| `promql-selectors` | 1, 2 | 5 |
| `promql-rate` | 3 | 5 |
| `promql-aggregation` | 4 | 6 |
| `promql-over-time` | 5, 11 | 4 |
| `promql-binary-ops` | 6 | 5 |
| `promql-histograms` | 7, 8 | 8 |
| `promql-time` | 9 | 4 |
| `promql-functions` | 10 | 2 |
| `promql-recording-rules` | 12 | 0 |
| `promql-red` | 13 | 0 |
| `promql-mistakes` | 14 | 0 |

## m05 Grafana core

| Tag | Steps | Mock (PCA) |
|---|---|---|
| `grafana-data-sources` | 1 | 0 |
| `grafana-explore` | 2, 3 | 0 |
| `dashboard-panels` | 4, 5 | 2 |
| `dashboard-variables` | 6 | 2 |
| `dashboard-transformations` | 7 | 0 |
| `dashboard-design` | 8 | 2 |
| `dashboard-schema` | 9 | 0 |
| `dashboard-links` | 10 | 0 |
| `grafana-access` | 11 | 0 |
| `dashboard-sharing` | 12 | 0 |

## m06 Kubernetes monitoring

| Tag | Steps | Also | Mock |
|---|---|---|---|
| `k8s-what-to-watch` | 1 | | 0 |
| `k8s-kubelet-cadvisor` | 2 | | 0 |
| `k8s-kube-state-metrics` | 3 | carries `exporter-standard` too | 0 |
| `k8s-node-exporter` | 4 | carries `exporter-standard` too | 0 |
| `k8s-prometheus-stack` | 5, 6 | | 0 |
| `k8s-monitoring-chart` | 7 | m10 step 11 | 0 |
| `k8s-logs-events` | 8 | | 0 |
| `k8s-use-red` | 9 | | 0 |
| `k8s-control-plane` | 10 | | 0 |
| `k8s-resources` | 11 | | 0 |
| `k8s-probes` | 12 | | 0 |

## m07 OpenTelemetry: the model and tracing

| Tag | Steps | Mock (OTCA) |
|---|---|---|
| `otel-overview` | 1 | 0 |
| `otel-api-sdk` | 2 | 4 |
| `otel-resources` | 3 | 4 |
| `otel-instrumentation-scope` | 4 | 2 |
| `otel-spans` | 5 | 9 |
| `otel-context-propagation` | 6, 9 | 10 |
| `otel-sampling` | 10 | 6 |
| `otel-sdk-pipeline` | 11 | 5 |

## m08 OpenTelemetry: metrics, logs and configuration

| Tag | Steps | Also | Mock (OTCA) |
|---|---|---|---|
| `otel-metric-instruments` | 1 | | 4 |
| `otel-metrics-sdk` | 2, 3 | | 6 |
| `otel-logs-api` | 5 | | 1 |
| `otel-otlp` | 7 | | 4 |
| `otel-env-config` | 8 | | 7 |
| `otel-declarative-config` | 9 | | 2 |
| `otel-zero-code` | 11 | m07 step 7 | 5 |
| `otel-operator` | 11 | | 2 |
| `otel-sdk-extension` | 10 | | 0 |
| `otel-sdk-debugging` | 13 | | 0 |
| `otel-error-handling` | 14 | | 3 |

## m09 OpenTelemetry Collector

| Tag | Steps | Mock (OTCA) |
|---|---|---|
| `collector-deployment` | 1, 4 | 4 |
| `collector-config` | 2 | 7 |
| `collector-pipelines` | 2, 3 | 6 |
| `collector-processors` | 5, 7 | 7 |
| `collector-ottl` | 6 | 3 |
| `collector-connectors` | 8 | 2 |
| `collector-tail-sampling` | 9 | 2 |
| `collector-kubernetes` | 10 | 4 |
| `collector-scaling` | 11 | 5 |
| `collector-reliability` | 12 | 6 |
| `collector-debugging` | 13 | 6 |
| `otel-schemas` | 14 | 3 |
| `collector-opamp` | 15 | 0 |

## m15 Alerting, SLOs and on-call

| Tag | Steps | Mock (PCA) |
|---|---|---|
| `alert-design` | 1 | 4 |
| `alert-rules` | 2 | 8 |
| `alert-alertmanager` | 3, 4 | 6 |
| `alert-grafana-managed` | 5 | 1 |

## Modules without tags yet

m10 to m14, m16 to m18. The planner adds their tags when their cards are written; no mock question depends on them.
