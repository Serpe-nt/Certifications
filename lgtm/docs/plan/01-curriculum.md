# Curriculum

19 modules, about 245 steps. One step is one short article. The learner knows Kubernetes but not Helm, Prometheus, PromQL or Grafana, so the course opens with Helm: the whole lab is installed with it. The step lists below are outlines: the content worker for a module checks each topic against the current official docs and may split, merge, rename or drop a step when the product has changed, and says so in the pull request. Module ids and their order are fixed.

## How a step teaches

A step is an article, read from top to bottom (the owner's decision of 2026-11-11; the exact format is in `03-content-contract.md`, version 2):

1. **The problem**: what this thing was made to solve, told as a short scene.
2. **The idea**: the answer in two or three plain sentences.
3. **Two to five sections** of running text, each under a heading that says what the section says. Where an article would carry a picture, a section carries an information part: a flow, a comparison, figures to scale, layers or a timeline.
4. **In the lab**, **the trap** and **what to remember**, where the step has them.
5. **Practice** (lab and drill steps, on a tab of its own): numbered actions with the exact command or click, how you know it worked, and a check that asks for something only the finished lab can give (a value, a name, a token).
6. **The question**: one knowledge-check question.

A module ends with a quiz: 15 questions drawn from a pool of at least 30, pass at 80%. Missed questions come back after 1, 2 and 4 days. Readiness is shown per exam domain.

## Exam domains used for mapping

OTCA (60 questions, 90 minutes, pass 75%; weights from the official curriculum PDF):
- O1 Fundamentals of Observability, 18%
- O2 The OpenTelemetry API and SDK, 46%
- O3 The OpenTelemetry Collector, 26%
- O4 Maintaining and Debugging Observability Pipelines, 10%

PCA (60 questions, 90 minutes, pass 75%):
- P1 Observability Concepts, 18%
- P2 Prometheus Fundamentals, 20%
- P3 PromQL, 28%
- P4 Instrumentation and Exporters, 16%
- P5 Alerting & Dashboarding, 18%

Competency names under each domain are in `../research/02-certs-and-demand.md`. Every step and every question carries the domain and the competency it serves. Steps that serve jobs but no exam carry `exam: none`.

## Weighting by employer demand

Job-ad counts and surveys (same research file) rank the skills in this order: Grafana, Prometheus and PromQL, Kubernetes monitoring, Terraform and infrastructure as code, OpenTelemetry (rising fastest), alerting and SLOs, cost and cardinality control. Loki, Tempo, Mimir and Alloy are rarely named in ads but are the stack itself. So the Prometheus, PromQL, Grafana, Kubernetes monitoring, OpenTelemetry and alerting modules are the long ones, and cardinality shows up in four modules, not one. Helm is taught first because the learner needs it for every later lab, and because Kubernetes appears in a third of observability job ads.

## Modules

### m00 Start here (no quiz)
Goal: an empty Kubernetes cluster is running on the PC and `kubectl` reaches it.
1. How this course works: cards, checks, quizzes, review
2. The map: what Loki, Grafana, Tempo, Mimir, Alloy and OpenTelemetry each do
3. The lab on paper: VMs, cluster, namespaces, data flow
4. Create the VMs
5. Build the cluster with Ansible
6. Look around the empty cluster with `kubectl`
7. Stop and start the VMs safely

### m01 Helm (jobs)
Goal: install, change, roll back and debug a Helm release, read any chart, and install the whole lab release by release. The learner has never used Helm.
1. Why Helm: what goes wrong with a folder of manifests
2. Three words: chart, release, repository
3. Install a first release from a small public chart (lab)
4. Values: defaults, `-f` files, `--set`, and which one wins
5. See before you apply: `helm template`, dry runs, and reading rendered manifests
6. Upgrade, history and rollback (lab)
7. Inside a chart: `Chart.yaml`, `values.yaml`, `templates/`
8. The template language: values, pipelines, functions, named templates
9. Flow control and scope: `if`, `range`, `with`
10. Write a small chart of your own (lab)
11. Dependencies, sub-charts and global values
12. Repositories and OCI registries; pinning a chart version
13. Hooks, chart tests and `helm lint`
14. A release that fails: `status`, `get`, `--debug`, stuck and half-applied releases (lab)
15. How this lab drives Helm from Ansible, and where each values file lives
16. Install the platform add-ons, reading their values first (lab)
17. Install the LGTM stack and the shop, one release at a time (lab)
18. Open Grafana, the shop and the flag screen
19. Enter your lab seed and pass the first token check
20. Reset the lab without rebuilding the cluster

### m02 Observability fundamentals (O1, P1)
Goal: name the signals, say what each is good for, and follow one request through all of them.
1. Monitoring versus observability: the 3 a.m. question
2. Metrics: numbers over time
3. Logs and events
4. Traces and spans
5. Profiles in one card: where Pyroscope and eBPF fit
6. One request, three signals (lab)
7. RED, USE and the four golden signals
8. SLI, SLO, SLA and error budget: first look
9. Push versus pull
10. Cardinality: why labels cost money
11. Semantic conventions: agreeing on names
12. Instrumentation: manual, library, zero-code
13. From data to outcome: dashboards, alerts, debugging

### m03 Prometheus fundamentals (P2, P4)
Goal: read a `/metrics` page, explain how a target gets scraped in Kubernetes, and say what Prometheus cannot do alone.
1. Why Prometheus exists; the architecture
2. Data model: name, labels, samples
3. Metric types: counter, gauge, histogram, summary
4. The exposition format: read a `/metrics` page (lab)
5. Scrape configuration: jobs, targets, intervals
6. Service discovery in Kubernetes
7. Relabeling targets and metrics
8. Prometheus Operator: ServiceMonitor and PodMonitor (lab)
9. Exporters: node exporter, kube-state-metrics, blackbox
10. Client libraries and naming metrics well
11. Add a metric to a small service (lab)
12. Storage: TSDB, WAL, retention, and the limits of one server
13. Remote write: where Mimir comes in
14. The Prometheus screen, the HTTP API and promtool

### m04 PromQL (P3)
Goal: write the RED queries for any service without looking them up.
1. Instant vectors, range vectors, scalars
2. Selectors and matchers
3. Counters and `rate()`, `irate()`, `increase()`
4. Aggregation: `sum`, `avg`, `max`, `by`, `without`
5. Aggregating over time: the `_over_time` family
6. Binary operators and vector matching
7. Classic histograms and `histogram_quantile()`
8. Native histograms
9. Time: `offset`, `@`, timestamps
10. `absent()`, `changes()`, `resets()`, `predict_linear()`
11. Subqueries
12. Recording rules
13. RED for the shop in PromQL (lab drill)
14. The usual PromQL mistakes

### m05 Grafana core (P5)
Goal: build a dashboard a team would keep.
1. What Grafana is: data sources, not a database
2. Explore: ask one question
3. Drilldown apps: metrics, logs and traces without a query
4. First dashboard: panels and visualisations
5. Units, thresholds, legends, and picking the right panel
6. Variables and repeating panels
7. Transformations and expressions
8. A RED dashboard for one service (lab)
9. Dynamic dashboards: the new dashboard schema
10. Annotations and links between dashboards
11. Folders, teams, roles, service accounts
12. Sharing and exporting

### m06 Kubernetes monitoring (P2, P4, jobs)
Goal: know where every cluster metric and log comes from, and use them to explain a sick pod.
1. What to watch: nodes, pods, workloads, control plane
2. kubelet and cAdvisor metrics
3. kube-state-metrics
4. Node exporter
5. kube-prometheus-stack: what it installs and why employers ask for it
6. Mixins: ready-made dashboards and alerts
7. The k8s-monitoring chart and Alloy
8. Pod logs and cluster events in Loki
9. USE for a node, RED for a workload (lab)
10. Control plane and etcd
11. Requests versus usage: throttling and OOM kills (lab)
12. A pod that fails its readiness probe (lab, flag `failedReadinessProbe`)

### m07 OpenTelemetry: the model and tracing (O2, O1)
Goal: instrument a service for traces by hand and explain every object the SDK creates.
1. What OpenTelemetry is: specification, API, SDK, OTLP, Collector
2. API and SDK: why two layers
3. Resources and resource attributes
4. Instrumentation scope
5. Spans: context, kind, status, events, links
6. Context propagation: W3C Trace Context and Baggage
7. Zero-code instrumentation of the workshop service (lab)
8. Manual spans and attributes (lab)
9. Propagation across services and through Kafka (lab)
10. Samplers: always on, ratio, parent-based
11. The SDK pipeline: span processors and exporters
12. Semantic conventions for HTTP, databases and messaging

### m08 OpenTelemetry: metrics, logs and configuration (O2)
Goal: add metrics and correlated logs to a service and configure the SDK without touching code.
1. Metric instruments: counter, up-down counter, histogram, gauge, observable
2. The metrics SDK: readers, views, aggregation, temporality
3. Exponential histograms and cardinality limits
4. Metrics in the workshop service (lab)
5. Logs: the bridge API and trace correlation
6. Correlated logs from the workshop service (lab)
7. OTLP: gRPC and HTTP
8. Configuration by environment variables
9. Declarative configuration
10. Composability and extension: propagators, processors, exporters, resource detectors
11. Agents: Java, .NET, Python, Node, and injection by the Operator
12. How three shop services are instrumented: read the code
13. Debugging an SDK: console exporter and self-diagnostics
14. When telemetry fails: the error handling rules of the API and SDK, and OTLP retries (added 2026-11-11: the OTCA mock pool has three questions on it, tag `otel-error-handling`, and no step covered it)

### m09 OpenTelemetry Collector (O3, O4)
Goal: read, change and debug a Collector pipeline in production shape.
1. Why a collector; agent and gateway patterns
2. Configuration anatomy: receivers, processors, exporters, connectors, extensions, service
3. Read the lab gateway's configuration (lab)
4. Core, contrib and custom distributions
5. Processors that matter: memory limiter, batching, resource, attributes, filter
6. OTTL and the transform processor: redact personal data (lab, flag `emitRawPii`)
7. Kubernetes attributes and resource detection
8. Connectors: span metrics, service graph, routing
9. Tail sampling and the load-balancing exporter
10. Deployment on Kubernetes: daemonset, deployment, sidecar, Operator
11. Scaling stateless and stateful collectors
12. Reliability: queues, retries, back-pressure
13. Debugging a pipeline: debug exporter, zpages, internal telemetry (lab)
14. Schema management: schema URLs and renamed conventions
15. OpAMP in one card

### m10 Grafana Alloy (jobs)
Goal: write an Alloy pipeline for logs, metrics and OTLP, and say when to choose Alloy or the Collector.
1. Why Alloy: what replaced Promtail and Grafana Agent
2. Configuration syntax: blocks, attributes, expressions
3. Components and how they connect
4. The Alloy screen and live debugging (lab)
5. Pod logs to Loki (lab)
6. Scrape metrics and remote-write them
7. Receive OTLP with the `otelcol` components
8. Convert a Collector configuration to Alloy (lab)
9. Processing logs: stages, labels, structured metadata, drops
10. Clustering and deployment shapes
11. The k8s-monitoring chart values, revisited
12. Alloy or Collector: which one when

### m11 Mimir (jobs)
Goal: explain the write and read path of Mimir 3 and operate tenants, limits and rules.
1. The problem: Prometheus at scale
2. Write path with Kafka: ingest storage
3. Read path: query-frontend, scheduler, querier, store-gateway
4. Blocks, the compactor and object storage
5. Tour the Mimir pods (lab)
6. Sending data: remote write and OTLP
7. Tenants and `X-Scope-OrgID`
8. Limits and overrides: hit one on purpose (lab)
9. Cardinality: find the expensive metrics (lab, flag `cartMetricCardinalityOverflow` if backported)
10. Rules in the ruler and mimirtool
11. Mimir Alertmanager
12. Exemplars and native histograms
13. Replication and zones: lose an ingester (lab)
14. Classic versus ingest-storage architecture: reading older docs safely

### m12 Loki (jobs)
Goal: write LogQL fluently and avoid the label mistakes that sink Loki.
1. The idea: index the labels, not the text
2. Streams, labels and structured metadata
3. Sending logs with Alloy and OTLP: what becomes a label
4. LogQL: stream selectors and line filters
5. Parsers: json, logfmt, pattern, regexp
6. Label filters and line formatting
7. Metric queries: rates, counts, unwrap, quantiles
8. Architecture: distributor, ingester, querier, index gateway, compactor
9. Deployment modes: monolithic and microservices, and why simple scalable is gone
10. Storage: TSDB index, schema v13, chunks
11. Retention and deletion
12. Label cardinality: the classic mistakes (lab)
13. Rules and alerts on logs
14. Logs Drilldown and patterns
15. A slow query: find out why (lab)

### m13 Tempo (jobs)
Goal: find any trace, write TraceQL, and explain what Tempo 3 does with a span.
1. Why a trace store; debugging trace-first
2. Tempo 3 architecture: distributor, Kafka, block-builder, live-store, backend workers
3. Sending traces through the gateway
4. Find a trace: by id, by search, from a log line
5. TraceQL: spans, attributes, scopes
6. TraceQL: structural operators and aggregates
7. TraceQL metrics
8. Metrics-generator: span metrics and service graphs
9. Sampling: head, tail, and what Tempo sees
10. Blocks, vParquet and retention
11. Traces Drilldown
12. A slow checkout (lab, flag `productCatalogLockContention`)
13. Tenants and limits

### m14 Correlation and incident debugging (O1, jobs)
Goal: go from an alert to a cause across metrics, traces and logs, five times.
1. The loop: alert, metric, trace, log, cause
2. Exemplars: from a latency spike to one trace (lab)
3. Trace to logs
4. Logs to trace: derived fields
5. Trace to metrics and the service map
6. Correlations in Grafana
7. Incident: payments fail (flag `paymentFailure`)
8. Incident: a memory leak (flag `recommendationCacheFailure`)
9. Incident: Kafka lag (flag `kafkaQueueProblems`)
10. Incident: a dependency cannot be reached (flag `paymentUnreachable`)
11. Incident: one product breaks (flag `productCatalogFailure`)
12. Writing the incident note: timeline, cause, evidence

### m15 Alerting, SLOs and on-call (P5, P1, jobs)
Goal: build alerts a team would not mute, from an SLO down to a runbook.
1. What deserves an alert: symptoms, not causes
2. Prometheus alerting rules
3. Alertmanager: routing, grouping, inhibition, silences
4. Receivers and templates (lab)
5. Grafana-managed alerts: rules, contact points, notification policies
6. Data-source-managed or Grafana-managed: which and why
7. Alerts on logs and on traces
8. An SLI and an SLO for checkout (lab)
9. Error budget and burn rate
10. Multi-window, multi-burn-rate alerts
11. Recording rules for SLOs
12. Alert fatigue and how to cut it
13. Runbooks and annotations
14. On-call drill: a random fault, found from the page (lab)

### m16 Observability as code (jobs)
Goal: every dashboard, rule and pipeline in the lab comes from Git.
1. Why: review, repeat, roll back
2. Grafana provisioning files
3. Git Sync for dashboards (lab)
4. The Terraform Grafana provider (lab)
5. Dashboards as code: the current options
6. Rules as code: promtool, mimirtool, lokitool
7. Collector and Alloy configuration in Git, with validation
8. Helm values as the source of truth; diff before upgrade
9. CI checks for dashboards and rules
10. Secrets and credentials
11. Promote one change from a branch to the lab (lab)

### m17 Running it at scale (jobs)
Goal: operate the stack: size it, protect it, upgrade it, and survive a failure.
1. Deployment modes compared, and when to move
2. Reading the big charts: Mimir, Loki, Tempo values
3. Object storage: buckets, prefixes, lifecycle
4. Kafka for ingest: partitions, lag, retention
5. Replication factor, zones and rolling updates
6. Multi-tenancy end to end
7. Limits per tenant
8. Retention per signal and per tenant
9. Cardinality and cost control: drop, relabel, aggregate, sample
10. Meta-monitoring: monitor the monitoring
11. Capacity planning: ingest rate, active series, query load
12. Upgrade one component (lab)
13. Failure drills: lose a node, a broker, the object store (lab)
14. Backup and recovery: where the state is
15. Security: network policies, TLS, authentication
16. Managed alternatives and their trade-offs

### m18 Capstone, interviews and exams
Goal: prove it.
1. Game days: the random fault scheduler, three rounds (lab)
2. Portfolio: write up the lab so an interviewer can read it in five minutes
3. Interview bank: 30 recurring topics with model answers
4. OTCA: format, domains, booking, readiness
5. OTCA mock exam (60 questions, 90 minutes, 75%; 11/28/15/6 by domain)
6. PCA: format, domains, booking, readiness
7. PCA mock exam (60 questions, 90 minutes, 75%; 11/12/17/9/11 by domain)
8. What next: Pyroscope, Beyla and OBI, k6, Grafana Cloud

## Question pools

| Pool | Size | Notes |
|---|---|---|
| Module quiz, m01 to m17 | at least 30 each | drawn 15 at a time |
| OTCA mock | at least 90 | drawn 60 by domain weight; separate from module pools |
| PCA mock | at least 90 | drawn 60 by domain weight; separate from module pools |

A note for the exam modules: the official curriculum PDFs and exam pages give the weights used here. Different weights appeared in README files in the `cncf/curriculum` repository on 2025-11-28 with no announcement. The exam cards say so and link both.
