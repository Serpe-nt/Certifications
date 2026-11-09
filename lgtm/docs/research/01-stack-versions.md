# LGTM stack and OpenTelemetry: current versions and course-relevant changes

Verified 2026-11-09 against official release pages, documentation and repositories. GitHub release pages show day and month only. Where the year is not printed, it comes from the changelog heading, the asset timestamps or the position in the release sequence, and the table says so.

## Version summary

| Tool | Latest stable | Release date | Source |
|---|---|---|---|
| Grafana | 13.3.0 | 2026-10-27 | https://github.com/grafana/grafana/releases |
| Loki | 3.7.9 (4.0.0-rc.3 is a pre-release) | 2026-10-20 | https://github.com/grafana/loki/releases |
| Tempo | 3.1.1 | 2026-10-21 (year from page context) | https://github.com/grafana/tempo/releases |
| Mimir | 3.2.4 | 2026-10-30 (year from page context) | https://github.com/grafana/mimir/releases |
| Grafana Alloy | 1.21.3 (1.22.0-rc.0 is a pre-release) | 2026-10-28 | https://github.com/grafana/alloy/releases |
| OTel Collector core | v0.165.0 (stable modules v1.71.0) | 2026-11-06 | https://github.com/open-telemetry/opentelemetry-collector/releases |
| OTel Collector contrib | v0.165.1 (stable modules v1.4.1) | 2026-11-09 | https://github.com/open-telemetry/opentelemetry-collector-contrib/releases |
| OTel Collector distributions (otelcol, otelcol-contrib) | v0.165.0 | 2026-11-07 | https://github.com/open-telemetry/opentelemetry-collector-releases/releases |
| Prometheus | 3.16.0 (LTS line: 3.13.x, latest 3.13.5) | 2026-11-04 | https://github.com/prometheus/prometheus/releases |
| Pyroscope | 2.4.3 | 2026-11-03 | https://github.com/grafana/pyroscope/releases |
| Beyla | 3.40.0 (3.41.0 is a pre-release) | 2026-10-26 | https://github.com/grafana/beyla/releases |
| grafana/otel-lgtm image | v0.40.0 | 2026-11-06 | https://github.com/grafana/docker-otel-lgtm/releases |

Previous majors that a course must know about: Grafana 13.0.0 was tagged on 14 April 2026 (https://github.com/grafana/grafana/releases/tag/v13.0.0). Tempo 3.0.0 was released on 28 May 2026 (https://github.com/grafana/tempo/releases/tag/v3.0.0). Mimir 3.0.0 was released on 31 October 2025, with the announcement post dated 3 November 2025 (https://github.com/grafana/mimir/releases/tag/mimir-3.0.0, https://grafana.com/blog/grafana-mimir-3-0-release-all-the-latest-updates/). Loki 3.7.0 was released on 26 March 2026 (https://github.com/grafana/loki/releases/tag/v3.7.0).

### Helm chart versions

| Chart | Repository today | Latest version seen | Source |
|---|---|---|---|
| grafana | grafana-community/helm-charts | 14.4.0 (app 13.3.0) | https://github.com/grafana-community/helm-charts/tree/main/charts |
| loki | grafana-community/helm-charts | 21.0.0 (app 3.7.9) | https://github.com/grafana-community/helm-charts/tree/main/charts |
| tempo (single binary) | grafana-community/helm-charts | 3.2.1 (app 3.1.1) | https://github.com/grafana-community/helm-charts/tree/main/charts |
| tempo-distributed | grafana-community/helm-charts | 3.27.0 (app 3.1.1) | https://github.com/grafana-community/helm-charts/tree/main/charts |
| mimir-distributed | grafana/mimir repo, being moved to grafana-community | 6.2.1 released; 6.3.0 announced as last release in the old location | https://raw.githubusercontent.com/grafana/mimir/main/operations/helm/charts/mimir-distributed/CHANGELOG.md |
| k8s-monitoring | grafana/k8s-monitoring-helm | 4.6.0 (2026-10-30) | https://github.com/grafana/k8s-monitoring-helm/releases |
| lgtm-distributed | grafana/helm-charts | deprecated | https://github.com/grafana/helm-charts/tree/main/charts/lgtm-distributed |
| kube-prometheus-stack | prometheus-community/helm-charts | 93.1.1 (2026-11-09) | https://github.com/prometheus-community/helm-charts/releases |

## Cross-cutting change: Helm charts moved to grafana-community

Grafana Labs moved most of its open source Helm charts to a community-maintained repository in early 2026. The grafana chart README says it "has been migrated to grafana-community/helm-charts" and that after 30 January 2026 updates and support come from the new repository (https://github.com/grafana/helm-charts/tree/main/charts/grafana). The tempo-distributed chart carries the same notice (https://github.com/grafana/helm-charts/tree/main/charts/tempo-distributed). The Loki chart moved on 16 March 2026 (https://grafana.com/docs/loki/latest/release-notes/v3-7/). The community repository today holds grafana, loki, tempo, tempo-distributed, tempo-vulture, grafana-mcp and synthetic-monitoring-agent (https://github.com/grafana-community/helm-charts/tree/main/charts).

The new Helm repository URL is `https://grafana-community.github.io/helm-charts`, and the README calls the OCI registry `oci://ghcr.io/grafana-community/helm-charts/<chart-name>` the preferred option (https://github.com/grafana-community/helm-charts).

The mimir-distributed chart is also being deprecated and moved. Its unreleased changelog says "Deprecate and move the chart to the community-maintained grafana-community/helm-charts repository" (https://raw.githubusercontent.com/grafana/mimir/main/operations/helm/charts/mimir-distributed/CHANGELOG.md). The relocation notice in grafana/helm-charts says "The `mimir-distributed` chart is deprecated" and names 6.3.0 as its last release there (https://github.com/grafana/helm-charts/tree/main/charts/mimir-distributed). The chart was not yet in the community repository's chart list on 2026-11-09.

The k8s-monitoring chart stays in grafana/k8s-monitoring-helm.

Course impact: every `helm repo add grafana https://grafana.github.io/helm-charts` instruction for Grafana, Loki and Tempo is now outdated. Use the grafana-community repository instead.

## Grafana

- **Latest:** 13.3.0, released 2026-10-27, alongside patches 13.2.5, 13.1.9, 13.0.12 and 12.4.14 (https://github.com/grafana/grafana/releases).
- **Grafana 13.0** was tagged on 14 April 2026 (https://github.com/grafana/grafana/releases/tag/v13.0.0).
- **Git Sync is GA in 13.0.** It works for dashboards and folders, on Cloud and self-managed, with GitHub, GitLab, Bitbucket or any git repository. 13.0.0 had a migration bug that could lose dashboards for early adopters upgrading from 12.x with Git Sync enabled. Restore the database first, then upgrade (https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v13/whats-new-in-v13-0/).
- **Dynamic dashboards (dashboard schema v2) are GA and on by default in 13.0.** Existing dashboards migrate to the new schema when opened (same source). In 12.0 they were experimental, and a dashboard migrated to schema v2 could not be migrated back (https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v12/whats-new-in-v12-0/).
- **Grafana Drilldown went GA in 12.0.** It is the new name for Explore Metrics, Logs and Traces, and covers Metrics Drilldown, Logs Drilldown and Traces Drilldown. 12.0 also removed the Tempo "Aggregate by" feature in favour of Traces Drilldown (https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v12/whats-new-in-v12-0/).
- **Angular was removed in 12.0.** Dashboards with Angular panels are force-migrated to React panels (same source).
- **Alerting:**
  - 12.0 added an alert rule migration tool that imports data-source-managed Prometheus rules as Grafana-managed rules. It also added a "Recovering" state that reduces flapping and a way to restore deleted rules (12.0 source).
  - 13.0 removed or restricted the legacy Alertmanager configuration endpoints (13.0 source).
  - 13.3 adds an Alertmanager configuration import (public preview) and Alert Advisor (public preview). It also adds an experimental Prometheus Alerting plugin for data-source-managed Prometheus, Mimir and Loki rules, while Grafana-managed alerting stays in core (https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v13/whats-new-in-v13-3/).
- **Other 13.x items:**
  - 13.0 removes `grafana-cli` and `grafana-server` in favour of `grafana cli` and `grafana server`, and removes Image Renderer plugin support. The `/api` path is deprecated in favour of `/apis`. Grafana Assistant is in public preview for OSS and Enterprise (13.0 source).
  - 13.3 brings a visual UI refresh (public preview), Notebooks (public preview) and cross-dashboard variables (public preview) (13.3 source).
  - The 13.3.0 release itself renames the `marketplace` config.ini section to `plugins_marketplace` and turns on auto grid layout by default (https://github.com/grafana/grafana/releases).
- **Correlations:** The Tempo data source has "Trace to logs", "Trace to metrics" and "Trace to profiles" settings (https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/). Exemplars are supported for the Prometheus data source only and are configured in its Exemplars settings (https://grafana.com/docs/grafana/latest/fundamentals/exemplars/). Loki derived fields can match a regex on the log line, or a label, parsed label or structured metadata such as `trace_id` (https://grafana.com/docs/grafana/latest/datasources/loki/configure/, located through search; the page itself was not fetched).
- **Licence and packaging:** Grafana remains AGPL-3.0 (https://github.com/grafana/grafana/blob/main/LICENSE). The install docs list two official images. `grafana/grafana-enterprise` is the "recommended and default edition", free and including all open source features. `grafana/grafana` is the open source edition. Both are Alpine based by default (https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/).

## Loki

- **Latest:** 3.7.9, released 2026-10-20. Loki 4.0.0 is in release candidates (rc.1 to rc.3, early November 2026) (https://github.com/grafana/loki/releases).
- **Promtail:**
  - Promtail was deprecated in 3.0, and its commercial support ended on 28 February 2026 (https://grafana.com/docs/loki/latest/release-notes/v3-6/).
  - It was removed in 3.7.3, and its code now lives in Alloy, which has a migration guide and a config converter (https://grafana.com/docs/loki/latest/release-notes/v3-7/).
  - Loki 4.0.0-rc.1 removes Promtail support and Promtail packages (https://github.com/grafana/loki/releases/tag/v4.0.0-rc.1).
  - Status confirmed: Promtail is end of life, so teach Alloy or the OTel Collector instead.
- **Deployment modes:**
  - The docs describe monolithic, simple scalable (SSD) and microservices modes. They state: "Simple Scalable Deployment (SSD) mode is being deprecated and will be removed with the Loki 4.0 release."
  - Monolithic is recommended for small setups, up to roughly 20 GB per day (https://grafana.com/docs/loki/latest/get-started/deployment-modes/).
  - 4.0.0-rc.1 lists "Remove targets for Simple Scalable Deployment (SSD)" as a breaking change (https://github.com/grafana/loki/releases/tag/v4.0.0-rc.1).
  - The community Loki chart now defaults to `deploymentMode: Monolithic`, and its values file marks SimpleScalable as "deprecated, removed in Loki 4" (https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/loki/values.yaml).
  - Status confirmed: SSD is deprecated, and the course should teach monolithic, then microservices ("Distributed" in the chart).
- **Native OTLP ingestion:**
  - Loki accepts OTLP over HTTP at `/otlp`. Use the Collector's `otlphttp` exporter.
  - 17 resource attributes become index labels by default, including `service.name` (stored as `service_name`), `k8s.namespace.name` and `k8s.cluster.name`. Other attributes become structured metadata.
  - `allow_structured_metadata` must be true, which is the default since 3.0 (https://grafana.com/docs/loki/latest/send-data/otel/).
- **Structured metadata** needs schema v13 or later and the `tsdb` index (https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/).
- **Storage schema:** Use `store: tsdb` and `schema: v13`. The docs call `tsdb` "the current and only recommended value for store". `boltdb-shipper` is deprecated and is removed in Loki 4.0 (https://grafana.com/docs/loki/latest/operations/storage/schema/). 4.0.0-rc.1 removes BoltDB, renames the `loki_boltdb_shipper_*` metrics to `loki_tsdb_shipper_*`, and drops the BigTable, DynamoDB and Cassandra backends (https://github.com/grafana/loki/releases/tag/v4.0.0-rc.1).
- **Bloom filters:** Query acceleration with blooms is still "an experimental feature. Engineering and on-call support is not available. No SLA is provided." (https://grafana.com/docs/loki/latest/operations/bloom-filters/). Keep it out of a core course.
- **New query engine and data objects:**
  - 4.0.0-rc.1 contains a lot of work on "dataobj" storage, including a dataobj compactor, an indexer and querier reads from data objects.
  - It also contains a breaking change, "Unplug the V2 query engine from the config and modules".
  - Kafka-based ingest work continues, for example the pattern ingester supporting Kafka (https://github.com/grafana/loki/releases/tag/v4.0.0-rc.1).
  - The final 4.0 architecture should be re-checked when 4.0.0 ships.
- **Other 3.6/3.7 items:**
  - The Loki UI moved to a Grafana plugin.
  - Docker images no longer contain busybox, so there is no shell to exec into.
  - The meta-monitoring role moved to the k8s-monitoring chart.
  - The community charts loki-distributed, loki-simple-scalable, loki-canary and lgtm-distributed are deprecated (https://grafana.com/docs/loki/latest/release-notes/v3-6/).

## Tempo

- **Latest:** 3.1.1, released 21 October. 3.1.0 was released on 29 September, and 3.0.0 on 28 May 2026 (https://github.com/grafana/tempo/releases, https://github.com/grafana/tempo/releases/tag/v3.0.0).
- **New architecture in 3.0** (https://grafana.com/docs/tempo/latest/release-notes/v3-0/):
  - Tempo 3.0 replaces ingesters with separate write and read paths. This design was "previously known as 'Project Rhythm'" and was experimental in 2.9 and 2.10. It is now the only ingest path.
  - Block-builders cut blocks, live-stores serve recent data, and a backend scheduler with backend workers replaces the compactor.
  - The ingester, the compactor, v2 block encoding, the OpenCensus receiver and the `scalable-single-binary` target are removed.
- **Kafka:** Kafka is required in microservices mode only. In monolithic mode, "Tempo runs all components in-process without Kafka" (same source). The tempo-distributed chart has an `ingest.kafka.address` value marked "Required for Tempo 3.0 microservices mode" and does not bundle a Kafka (https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/tempo-distributed/values.yaml). The official distributed docker-compose example uses Redpanda as the Kafka-compatible broker (https://github.com/grafana/tempo/tree/main/example/docker-compose/distributed).
- **vParquet:**
  - In 3.0, vParquet4 stayed the default and vParquet5 was production-ready but opt-in (3.0 source).
  - In 3.1, vParquet5 is the default for new blocks.
  - Tempo refuses to start if it is configured to write vParquet3 (https://grafana.com/docs/tempo/latest/release-notes/v3-1/).
- **TraceQL and TraceQL metrics:**
  - TraceQL metrics are GA in 3.0, but alerting on them is experimental.
  - `!=` and `!~` changed meaning on array attributes (3.0 source).
  - 3.1 adds arithmetic between TraceQL metrics and an experimental `with(extrapolate=true)` hint for head-sampled data (3.1 source).
  - TraceQL metrics on recent data are served by the live-store, so the metrics-generator is not required for them (https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/).
- **Metrics-generator:** It provides the service graphs, span metrics and host info processors. The local-blocks processor was removed in 3.0. It remote-writes to Prometheus or Mimir (same source). 3.0 added per-label cardinality limits and span-name sanitisation, among other features (3.0 source).
- **Other 3.x items:** Trace redaction through `tempo-cli redact`, an MCP server, and legacy flat overrides blocking startup unless `enable_legacy_overrides: true` is set (3.0 and 3.1 sources).

## Mimir

- **Latest:** 3.2.4, released 30 October. 3.2.0 was released on 19 August (https://github.com/grafana/mimir/releases). Mimir 3.0 was released on 31 October 2025 (https://github.com/grafana/mimir/releases/tag/mimir-3.0.0).
- **Ingest storage architecture (Kafka):** Mimir 3.0 introduced a Kafka-based ingest storage layer that separates reads from writes (https://grafana.com/docs/mimir/latest/release-notes/v3.0/). The classic architecture page says: "Classic architecture is still supported in Grafana Mimir version 3.0. However, this architecture is set to be deprecated in a future release." It also says to use ingest storage for new deployments as a best practice (https://grafana.com/docs/mimir/latest/get-started/about-grafana-mimir-architecture/about-classic-architecture/).
- **Mimir Query Engine (MQE)** is the default for all queriers and query-frontends in 3.0. The read-write deployment mode was removed in 3.0 (v3.0 release notes).
- **Monolithic mode for a lab:**
  - The deployment modes page lists monolithic (`-target=all`) and microservices. It says monolithic "is ideal for getting started or running Grafana Mimir in a development environment" (https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/).
  - The get-started guide runs Mimir monolithic with filesystem storage and no Kafka (https://grafana.com/docs/mimir/latest/get-started/).
  - The "play with Mimir" docker-compose tutorial runs `target: all` with an S3 backend served by `pgsty/silo` and no Kafka (https://github.com/grafana/mimir/tree/main/docs/sources/mimir/get-started/play-with-grafana-mimir).
  - So monolithic mode on the classic architecture is still the documented lab path.
- **Helm:** mimir-distributed 6.0 deploys ingest storage by default and "deploys a single-node Kafka cluster for demo purposes". The chart still bundles a MinIO subchart, but since 6.2.1 its default image is `pgsty/silo`, because "MinIO community edition images are no longer available in public container registries". The chart is being deprecated and moved to grafana-community (https://raw.githubusercontent.com/grafana/mimir/main/operations/helm/charts/mimir-distributed/CHANGELOG.md).
- **Native OTLP:**
  - Use the Collector's `otlphttp` exporter with endpoint `http://<mimir>/otlp`.
  - Resource attributes go to `target_info`, and `-distributor.otel-promote-resource-attributes` is experimental.
  - Exponential histograms need native histogram ingestion enabled (https://grafana.com/docs/mimir/latest/configure/configure-otel-collector/).
  - Native OTLP delta ingestion is experimental and off by default (v3.0 release notes).

## Grafana Alloy

- **Latest:** 1.21.3, released 28 October 2026. 1.22.0-rc.0 is a pre-release, and there is no 2.x. Alloy 1.21 bundles OTel Collector v0.162.0 and Beyla 3.38.0 (https://github.com/grafana/alloy/releases).
- **Grafana Agent:** "Grafana Agent Static, Grafana Agent Flow, and Grafana Agent Operator reached End-of-Life (EOL) on November 1, 2025." (https://grafana.com/docs/loki/latest/setup/migrate/migrate-to-alloy/). Long-term support ended on 31 October 2025 (https://grafana.com/docs/loki/latest/release-notes/v3-6/). Status confirmed.
- **Promtail** is merged into Alloy. See the Loki section.
- **OTel Engine:** `alloy otel` runs standard OpenTelemetry Collector YAML inside Alloy. It is "a public preview feature" (https://grafana.com/docs/alloy/latest/set-up/otel_engine/).
- **Docker image:** `grafana/alloy`, used in the official Loki and Tempo compose examples (https://raw.githubusercontent.com/grafana/loki/main/examples/getting-started/docker-compose.yaml, https://github.com/grafana/tempo/tree/main/example/docker-compose/single-binary).

## OpenTelemetry Collector (core and contrib)

- **Latest:**
  - Core v0.165.0, with stable modules at v1.71.0, released 6 November 2026 (https://github.com/open-telemetry/opentelemetry-collector/releases).
  - Contrib v0.165.1, with stable modules at v1.4.1, released 9 November 2026. Contrib began dual versioning with "v1.0.0/v0.161.0" on 15 September (https://github.com/open-telemetry/opentelemetry-collector-contrib/releases).
  - Distributions v0.165.0 (https://github.com/open-telemetry/opentelemetry-collector-releases/releases).
- **Collector 1.0:** The distribution is still versioned 0.x. Only some modules carry 1.x versions. The status page says "The collector status is: mixed" (https://opentelemetry.io/status/). The GA roadmap proposes a stable distribution limited to the OTLP receiver and the OTLP and OTLP HTTP exporters (https://github.com/open-telemetry/opentelemetry-collector/blob/main/docs/ga-roadmap.md). Status: no Collector 1.0 yet.
- **OTTL:** Stable for traces, metrics and logs, and in development for profiles. It is used by the transform and filter processors, the tail sampling processor and the routing connector (https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md). In contrib v0.161.0, the k8sattributes processor was promoted to stable for logs, metrics and traces (https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.161.0).
- **OpAMP:** The specification status is Beta (https://opentelemetry.io/docs/specs/opamp/). An `opampsupervisor` is released with the distributions (https://github.com/open-telemetry/opentelemetry-collector-releases/releases).

## OpenTelemetry signals, configuration and semantic conventions

- **Signal status in the specification** (https://opentelemetry.io/docs/specs/status/):

  | Signal | API | SDK | Protocol |
  |---|---|---|---|
  | Tracing | stable | stable | stable |
  | Metrics | stable | mixed | stable |
  | Logs | stable (Bridge API) | stable | stable |
  | Baggage | stable | stable | N/A |
  | Profiles | not given | not given | development |

  Per-language SDK status varies. For example, Go logs is a release candidate, and Python and JavaScript logs are in development (https://opentelemetry.io/status/).
- **Profiles:** Entered public Alpha in March 2026 (https://opentelemetry.io/blog/2026/profiles-alpha/, located through search; the post itself was not fetched).
- **Declarative configuration:** The configuration data model page shows "Status: Stable" (https://opentelemetry.io/docs/specs/otel/configuration/data-model/).
- **Semantic conventions:** The latest version is 1.45.0, released 2 November (https://github.com/open-telemetry/semantic-conventions/releases).
  - HTTP spans are Stable "unless otherwise specified" (https://opentelemetry.io/docs/specs/semconv/http/http-spans/).
  - Database spans are Stable "unless otherwise specified" (https://opentelemetry.io/docs/specs/semconv/database/database-spans/).
  - Messaging spans are still Development (https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/).
  - A core set of Kubernetes and container resource attributes graduated to stable in v1.42.0, and RPC spans and duration metrics became stable in v1.45.0 (semantic conventions releases page).

## Prometheus

- **Latest:** 3.16.0, released 2026-11-04. The current LTS is 3.13, released 2026-07-01 and supported until 2027-07-31. The 3.5 LTS ended on 2026-07-31 (https://github.com/prometheus/prometheus/releases, https://prometheus.io/docs/introduction/release-cycle/).
- **Native histograms:** "Starting with v3.8.0, native histograms are supported as a stable feature." Scraping is enabled with the `scrape_native_histograms` config setting, and the feature flag is a no-op from v3.9. Prometheus v4 plans to default both scraping and sending to true (https://prometheus.io/docs/specs/native_histograms/).
- **OTLP receiver:**
  - Enable it with `--web.enable-otlp-receiver`. The endpoint is `/api/v1/otlp/v1/metrics`.
  - Translation strategies are `UnderscoreEscapingWithSuffixes` (the default), `NoUTF8EscapingWithSuffixes` and `NoTranslation`.
  - No resource attributes are promoted by default, so set `otlp.promote_resource_attributes`.
  - Delta temporality is experimental (https://prometheus.io/docs/guides/opentelemetry/).
- **UTF-8 metric and label names** are supported in v3. Set `metric_name_validation_scheme: legacy` to keep the old rules (https://prometheus.io/docs/prometheus/latest/migration/).
- **Remote write 2.0:** The spec is still "Status: Experimental" (version 2.0-rc.6) (https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/).
- **Other 3.16 items:** Smoothed and anchored vector selectors are now stable (https://github.com/prometheus/prometheus/releases).

## Pyroscope and Beyla (brief)

- **Pyroscope:** The latest release is 2.4.3, from 3 November 2026 (https://github.com/grafana/pyroscope/releases). Profiles can be sent with SDK instrumentation or with auto-instrumentation through Alloy (https://grafana.com/docs/pyroscope/latest/). Pyroscope ships inside `grafana/otel-lgtm`.
- **Beyla:**
  - The latest stable release is 3.40.0, from 26 October 2026 (https://github.com/grafana/beyla/releases).
  - "Grafana Labs donated Beyla to the OpenTelemetry project in 2025 as OpenTelemetry eBPF Instrumentation (OBI)". Beyla "is the Grafana Labs distribution of OBI" and can run as part of Alloy (https://grafana.com/docs/beyla/latest/).

## Install methods

- **Docker images in official examples:**
  - `grafana/grafana` (or `grafana/grafana-enterprise`), `grafana/loki`, `grafana/tempo`, `grafana/mimir` and `grafana/alloy`.
  - `prom/prometheus` (https://github.com/grafana/tempo/tree/main/example/docker-compose/single-binary, https://github.com/grafana/mimir/tree/main/docs/sources/mimir/get-started/play-with-grafana-mimir).
  - The Collector ships as the `otelcol` and `otelcol-contrib` distributions. The exact Docker Hub image names were not confirmed on an official page (see "Not verified").
- **Helm:** See the chart table above. The course should use:
  - grafana-community for grafana, loki, tempo and tempo-distributed.
  - mimir-distributed from its current location, noting the move.
  - k8s-monitoring 4.x for cluster collection. It covers what the separate Alloy, OTel Collector and Operator charts would otherwise do and sends to Prometheus-, Loki-, OTLP- and Pyroscope-compatible backends (https://github.com/grafana/k8s-monitoring-helm).
  - lgtm-distributed is deprecated (https://github.com/grafana/helm-charts/tree/main/charts/lgtm-distributed).
  - kube-prometheus-stack is actively released (93.1.1 on 2026-11-09) and is still the standard Prometheus Operator bundle (https://github.com/prometheus-community/helm-charts/releases).
- **grafana/otel-lgtm:**
  - The image "is an open source backend for OpenTelemetry that's intended for development, demo, and testing environments".
  - It bundles the OTel Collector, Prometheus (not Mimir), Tempo, Loki, Pyroscope and Grafana, with optional OBI.
  - Grafana is on port 3000, and OTLP on 4317 and 4318 (https://github.com/grafana/docker-otel-lgtm).
  - v0.40.0 ships Prometheus 3.16.0 and Pyroscope 2.4.3 (https://github.com/grafana/docker-otel-lgtm/releases).
  - Use it for the first "hello telemetry" lab, not as the lab architecture.

## Object storage for a local lab

- **MinIO:** The Grafana docs no longer use upstream MinIO images. The Mimir chart changelog states "MinIO community edition images are no longer available in public container registries". It switched the default MinIO image to `pgsty/silo`, a MinIO fork maintained by PGSTY (https://raw.githubusercontent.com/grafana/mimir/main/operations/helm/charts/mimir-distributed/CHANGELOG.md).
- **Loki chart:** The MinIO subchart was deprecated in chart 17.0.0 and removed in 20.0.0. The chart README names RustFS and Garage as self-hosted S3-compatible options to evaluate (https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/loki/README.md).
- **Loki docker-compose getting-started:** Uses `pgsty/silo` as its S3 store (https://raw.githubusercontent.com/grafana/loki/main/examples/getting-started/docker-compose.yaml).
- **Tempo examples:**
  - The single-binary example uses `backend: local` (filesystem).
  - The distributed example uses `rustfs/rustfs` for object storage and Redpanda for Kafka (https://github.com/grafana/tempo/tree/main/example/docker-compose).
  - The tempo charts default to `backend: local` (community chart values files).
- **Mimir:** The get-started guide uses filesystem storage. The play tutorial and the chart use `pgsty/silo` (Mimir sources above).
- **SeaweedFS:** No current official Loki, Mimir or Tempo page or chart was found that uses SeaweedFS.
- **Recommendation for the lab:** Use filesystem storage for the first Docker Compose labs. When object storage is introduced, use an S3-compatible server that the official examples use: `pgsty/silo` for MinIO-compatible behaviour, or RustFS.

## Query languages and signal correlation

- **PromQL:**
  - PromQL is current in Prometheus 3.x and is executed in Mimir by MQE.
  - The experimental `info()` function joins `target_info` resource attributes and needs `promql-experimental-functions` (https://prometheus.io/docs/guides/opentelemetry/).
  - Unquoted UTF-8 names are behind the `promql-unquoted-utf8-names` flag (https://prometheus.io/docs/prometheus/latest/feature_flags/).
- **LogQL:** LogQL is current. Structured metadata is queryable without creating streams. 4.0 removes the experimental `variants()` LogQL queries (https://github.com/grafana/loki/releases/tag/v4.0.0-rc.1).
- **TraceQL and TraceQL metrics:** TraceQL metrics are GA since Tempo 3.0, and arithmetic between them was added in 3.1 (Tempo sources above).
- **Moving between signals in Grafana:**
  - Exemplars run from the Prometheus data source to Tempo.
  - Tempo offers trace to logs, trace to metrics and trace to profiles.
  - Loki derived fields link logs to traces, by regex or by a structured-metadata label (Grafana section sources).
  - Drilldown apps cover metrics, logs and traces.

## Not verified

These claims could not be confirmed on an official page, or were confirmed only indirectly:

- The release year for Tempo 3.1.1, Mimir 3.2.4 and other GitHub dates shown without a year. 2026 was inferred from the page context and the release sequence.
- The final contents and release date of Loki 4.0.0. Only the release candidate notes were read, and the rc.1 notes were truncated. Whether the new query engine and data objects become the default in 4.0 is unknown.
- When mimir-distributed 6.3.0 will appear in grafana-community/helm-charts. It was not listed there on 2026-11-09.
- Whether ingest storage (Kafka) is required, or the default, in Mimir monolithic mode. The docs reviewed do not say. The tutorials still use the classic architecture.
- Whether Grafana 13 changed the Drilldown apps, including whether a Profiles Drilldown app is GA. The 12.0 notes cover only Metrics, Logs and Traces.
- Grafana correlations as a feature (the Correlations admin page) in Grafana 13. It was not checked.
- The Loki derived-fields structured-metadata option. It came from a search snippet of https://grafana.com/docs/grafana/latest/datasources/loki/configure/, and the page itself was not fetched.
- The Profiles Alpha date. It came from the search result for https://opentelemetry.io/blog/2026/profiles-alpha/, and the post itself was not fetched.
- The schema version number of OTel declarative configuration (opentelemetry-configuration) and its per-language SDK support.
- The exact official Collector Docker image names (`otel/opentelemetry-collector`, `otel/opentelemetry-collector-contrib`, `otel/opentelemetry-collector-k8s`). They were not printed on the pages read.
- Native OTLP profile ingestion in Pyroscope. The docs page returned an error.
- k8s-monitoring 4.x internals (Alloy Operator) and the migration from 3.x. The README does not say.
- The upstream MinIO community edition change itself (binary-only distribution, console removal). It is known here only through Grafana's changelog wording, and minio.io was not consulted.
- Whether `grafana/grafana-oss` still exists as an image name. The install docs no longer mention it.
