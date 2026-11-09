# OpenTelemetry Demo (Astronomy Shop) as the lab application

Verified 2026-11-09 against the repository at tag `3.1.0`, the `main` branch where noted, the opentelemetry.io docs sources, the Helm chart repository, Docker Hub and the GitHub API.

Shorthand used below:

- `T` = `https://github.com/open-telemetry/opentelemetry-demo/blob/3.1.0` (files at the latest release tag)
- `M` = `https://github.com/open-telemetry/opentelemetry-demo/blob/main` (current development branch)
- `D` = `https://github.com/open-telemetry/opentelemetry.io/blob/main/content/en/docs/demo` (source of opentelemetry.io/docs/demo)
- `H` = `https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-demo`

One general warning first: the opentelemetry.io docs track the demo's `main` branch, not the 3.1.0 release, and in several places they already describe post-3.1.0 changes (for example the recommendation service rewritten in Java and two extra feature flags). Where docs and the tag disagree, this file follows the tag and says so.

## 1. Release, cadence, licence

The latest release is **3.1.0, published 2026-09-18** (GitHub API `published_at` 2026-09-18T18:03:28Z). Source: https://github.com/open-telemetry/opentelemetry-demo/releases/tag/3.1.0 and https://api.github.com/repos/open-telemetry/opentelemetry-demo/releases

The release notes describe 3.0.0 (2026-07-24) as "problematic" and point users at 3.1.0. 3.1.0 reverts the load generator from k6 back to Locust, adds the `aiSlowResponse`, `aiRunawayAgent` and `emitRawPii` flags, removes the `loadGeneratorTraffic` and `loadGeneratorVUs` flags, adds a `redaction` processor to the collector and adds a random-flag scheduler to flagd-ui. Source: https://github.com/open-telemetry/opentelemetry-demo/releases

3.0.0 renamed custom attributes from `app.*` to `demo.*` (dashboards and queries written for 2.x break), introduced the modular Compose files, and added the agent, MCP and chatbot services and eBPF profiling. Source: https://github.com/open-telemetry/opentelemetry-demo/releases/tag/3.0.0

Recent release history (GitHub API):

| Version | Date |
| --- | --- |
| 3.1.0 | 2026-09-18 |
| 3.0.0 | 2026-07-24 |
| 2.2.0 | 2026-01-08 |
| 2.1.0 to 2.1.3 | 2025-09-19 to 2025-09-26 |
| 2.0.0 to 2.0.2 | 2025-02-19 to 2025-03-17 |
| 1.12.0 | 2024-11-04 |

Source: https://api.github.com/repos/open-telemetry/opentelemetry-demo/releases

There is no fixed cadence. The contributing guide says maintainers "can create a new release when desired" (`T/CONTRIBUTING.md`, section "Making a new release"). Observed: a minor release every two to six months, with patch releases bunched right after a minor. Changelog entries are now fragment files under `.chloggen/` folded in at release time. Source: `T/CONTRIBUTING.md`, `T/CHANGELOG.md`

`main` is active (latest commit 2026-11-07, "Update firepit to v0.3.0"). Source: https://api.github.com/repos/open-telemetry/opentelemetry-demo/commits

Licence: **Apache License 2.0**. Source: `T/LICENSE`

## 2. Services

The architecture page states that services "talk to each other over gRPC and HTTP" and that the load generator uses Locust. Source: `D/architecture.md`

### Application services at tag 3.1.0

| Service | Language | What it does | Called via | Instrumentation |
| --- | --- | --- | --- | --- |
| accounting | .NET | Consumes orders from Kafka, sums them, writes to PostgreSQL | Kafka (TCP) | Auto: .NET Automatic Instrumentation (`instrument.sh` entrypoint) |
| ad | Java | Text ads for given context words | gRPC | Auto: Java agent via `JAVA_TOOL_OPTIONS=-javaagent:...`, plus manual spans and attributes |
| agent | Python | LangGraph AI assistant using shop tools (agentic mode only) | HTTP | Instrumentation libraries set up in code (FastAPI, HTTPX, Traceloop LangChain/OpenAI/MCP), not `opentelemetry-instrument` |
| cart | .NET | Cart storage in Valkey | gRPC | .NET SDK in code with instrumentation libraries plus manual spans |
| chatbot | Python | Gradio chat UI that forwards to agent (agentic mode only) | HTTP | Instrumentation libraries in code (requests, HTTPX) |
| checkout | Go | Orchestrates cart, payment, shipping, email, publishes order to Kafka | gRPC | Go SDK in code with otelgrpc, Sarama and runtime instrumentation libraries plus manual spans |
| currency | C++ | Currency conversion, highest QPS service | gRPC | Manual SDK only (no instrumentation libraries; manual context propagation) |
| email | Ruby | Mock order confirmation emails | HTTP | Ruby SDK with auto-instrumentation gems configured in code, plus manual spans |
| flagd-ui | Elixir | Feature flag editor UI | HTTP | Phoenix and Bandit instrumentation libraries |
| fraud-detection | Kotlin | Consumes orders from Kafka, mock fraud check | Kafka (TCP) | Auto: Java agent |
| frontend | TypeScript (Next.js) | Web shop and browser telemetry | HTTP | Node SDK with `getNodeAutoInstrumentations()` loaded via `--require`, plus manual spans; browser SDK with web auto-instrumentations |
| frontend-proxy | Envoy (C++) | Single entry point on port 8080 for shop and UIs | HTTP | Envoy native tracing and OTLP access logs |
| image-provider | NGINX | Serves product images | HTTP | NGINX OTel module (metrics scraped by collector `nginx` receiver) |
| load-generator | Python (Locust) | Simulated shopping traffic | HTTP | SDK initialised in the locustfile plus requests/urllib3/jinja2 instrumentors |
| mcp | Python | Exposes shop tools over Model Context Protocol (agentic mode only) | HTTP | Instrumentation libraries in code |
| payment | JavaScript (Node) | Mock card charge | gRPC | Zero-code: `node --require @opentelemetry/auto-instrumentations-node/register`, plus manual attributes |
| product-catalog | Go | Product list and lookup, backed by PostgreSQL | gRPC | Go SDK with otelgrpc and runtime instrumentation |
| quote | PHP (Slim) | Shipping cost calculation | HTTP | PHP extension with SDK autoload (`OTEL_PHP_AUTOLOAD_ENABLED=true`), plus manual spans |
| recommendation | Python (at 3.1.0) | Product recommendations | gRPC | Auto: `opentelemetry-instrument` entrypoint, plus manual spans and metrics |
| shipping | Rust | Shipping quotes and mock shipping, calls quote | HTTP | Rust SDK with `opentelemetry-instrumentation-actix-web`, plus manual spans |
| react-native-app | TypeScript | Mobile client (not a container in Compose) | HTTP to frontend-proxy | React Native SDK |

Sources: service table `D/services/_index.md`; call graph and protocols `D/architecture.md`; instrumentation coverage `D/telemetry-features/trace-coverage.md`, `D/telemetry-features/metric-coverage.md`, `D/telemetry-features/log-coverage.md`; per-service pages `D/services/accounting.md`, `D/services/ad.md`, `D/services/agent.md`, `D/services/payment.md`, `D/services/frontend.md`, `D/services/email.md`, `D/services/quote.md`, `D/services/load-generator.md`, `D/services/shipping.md`, `D/services/currency.md`; entrypoints `T/src/recommendation/Dockerfile`, `T/src/accounting/Dockerfile`.

Recommendation language discrepancy: at tag 3.1.0 `src/recommendation` contains `recommendation_server.py` and its Dockerfile runs `/venv/bin/opentelemetry-instrument` (`T/src/recommendation/Dockerfile`). On `main` it is a Spring Boot 4 Java service using the OpenTelemetry Spring Boot starter (`M/src/recommendation/`, `D/services/recommendation.md`). The services table on opentelemetry.io already says Java.

Count of the 20 container-based application services at 3.1.0 by language: Python 5 (agent, chatbot, load-generator, mcp, recommendation), .NET 2, Go 2, Java 1, Kotlin 1, C++ 1 (currency), Ruby 1, Elixir 1, TypeScript 1, JavaScript 1, PHP 1, Rust 1, plus Envoy (frontend-proxy) and NGINX (image-provider). Agent, chatbot and mcp only run in agentic mode. Derived from the table above and `T/compose.yaml`, `T/compose.full.yaml`, `T/compose.agent.yaml`.

### Data stores, queue and support services

| Component | Image / tech | Used by | Source |
| --- | --- | --- | --- |
| valkey-cart | `ghcr.io/valkey-io/valkey:9.0.4-alpine3.23` | cart | `T/.env`, `T/compose.yaml` |
| astronomy-db | PostgreSQL `postgres:18.4` (custom Dockerfile) | product-catalog, accounting | `T/.env`, `D/architecture.md` |
| kafka | demo-built image `...-kafka`, topic `orders` | checkout produces; accounting and fraud-detection consume | `T/.env`, `T/compose.full.yaml` |
| flagd | `ghcr.io/open-feature/flagd:v0.16.0` | most services (gRPC), load-generator (HTTP) | `T/.env`, `D/architecture.md` |
| opamp-server | demo-built OpAMP reference server | collector, cart, product-catalog (observability mode) | `T/compose.observability.yaml` |
| telemetry-docs | Weaver-generated telemetry documentation at `/telemetry/` | readers | `T/compose.yaml`, `D/docker-deployment.md` |
| firepit + otel-ebpf-profiler | profiling UI and eBPF profiler (profiling mode only) | profiles | `T/compose.profiling.yaml` |

Load generator: Locust, 5 users by default (`LOCUST_USERS=5`), autostart on, web UI port 8089, 9:1 weighting of HTTP users to browser users. Source: `T/.env`

## 3. Compose layout at 3.1.0

The single `docker-compose.yml` and `docker-compose.minimal.yml` are gone at 3.1.0 (they existed at 2.2.0: `https://github.com/open-telemetry/opentelemetry-demo/blob/2.2.0/docker-compose.minimal.yml`). The layout since 3.0.0 is a set of layered files. Source: `T/compose.yaml` header comment, `T/Makefile` lines 16 to 33.

| File | Contents |
| --- | --- |
| `.env` | Versions, ports, hosts, collector config paths |
| `.env.override` | Your local overrides, loaded second (`--env-file .env --env-file .env.override`) |
| `compose.yaml` | Core services (20 containers including otel-collector, flagd, flagd-ui, valkey, Postgres, telemetry-docs). Collector exports to `debug` only |
| `compose.full.yaml` | Adds kafka, accounting, fraud-detection; adds `otelcol-config-full.yml` |
| `compose.observability.yaml` | Adds jaeger, grafana, prometheus, opensearch, opamp-server; adds `otelcol-config-observability.yml` |
| `compose.extras.yaml` | Empty on purpose; "always loaded last" seam for forks |
| `compose.agent.yaml` | agent, mcp, chatbot |
| `compose.profiling.yaml` | otel-ebpf-profiler (privileged, host PID) and firepit |
| `compose.tests.yaml` | Test runners |

Sources: `T/compose.yaml`, `T/compose.full.yaml`, `T/compose.observability.yaml`, `T/compose.extras.yaml`, `T/compose.agent.yaml`, `T/compose.profiling.yaml`, `T/Makefile`

Make targets and the files they combine (all also pass both env files):

| Target | Files |
| --- | --- |
| `make start` | compose + full + observability + extras |
| `make start-minimal` | compose + observability + extras (drops kafka, accounting, fraud-detection) |
| `make start-no-o11y` | compose + full + extras |
| `make start-minimal-no-o11y` | compose + extras |
| `make start-profiling` | full + observability + profiling + extras |
| `make start-agentic` | full + observability + extras + agent |

Source: `T/Makefile` lines 314 to 371; `D/docker-deployment.md` "Deployment modes". The docs warn that a bare `docker compose up` loads only `compose.yaml`, with no Kafka and no backends. Source: `D/docker-deployment.md`

For our lab the relevant targets are `start-no-o11y` and `start-minimal-no-o11y`: no bundled backends, and `otelcol-config-extras.yml` still applied last.

### Image naming and tagging

Images are `${IMAGE_NAME}:${DEMO_VERSION}-<service>`, for example `ghcr.io/open-telemetry/demo:3.1.0-cart`. Source: `T/compose.yaml` (e.g. line 81 `image: ${IMAGE_NAME}:${DEMO_VERSION}-cart`), `T/.env`

At tag 3.1.0 `.env` sets `IMAGE_NAME=ghcr.io/open-telemetry/demo`, **`DEMO_VERSION=latest`** and `IMAGE_VERSION=3.0.0` (the last is used only for `service.version` and build cache, and was not bumped at the tag; `main` now has `IMAGE_VERSION=3.1.0`). Source: `T/.env`, `M/.env`

The `latest-*` tags on the Docker Hub mirror `otel/demo` were updated on 2026-11-09, i.e. they track ongoing builds, not the release. All 25 `3.1.0-*` tags exist, dated 2026-09-18. Source: https://hub.docker.com/v2/repositories/otel/demo/tags?name=latest and https://hub.docker.com/v2/repositories/otel/demo/tags?name=3.1.0 . Consequence for the lab: set `DEMO_VERSION=3.1.0` in `.env.override`, otherwise students pull moving `latest` images that may not match the 3.1.0 configs (for example the Java recommendation service).

Pinned third-party images in `T/.env`: collector contrib `0.159.0`, Grafana `13.1.0`, Jaeger `2.19.0`, Prometheus `v3.13.1`, flagd `v0.16.0`, Postgres `18.4`, Valkey `9.0.4`. OpenSearch is built from `src/opensearch/Dockerfile`.

### Published ports

Only the frontend proxy has fixed host ports: `${ENVOY_PORT}:${ENVOY_PORT}` (8080) and `${ENVOY_ADMIN_PORT}` (10000). In observability mode Prometheus also publishes `9090:9090`. Every other service lists a bare container port (for example `- "${CART_PORT}"`), which Compose publishes on a random host port. Source: `T/compose.yaml` lines 334 to 336, `T/compose.observability.yaml`. Change the main port with `ENVOY_PORT=8081`. Source: `D/docker-deployment.md`

### Frontend proxy routes

Envoy routes defined in `T/src/frontend-proxy/envoy.tmpl.yaml`:

| Path | Target |
| --- | --- |
| `/` | frontend (catch-all) |
| `/loadgen/` | Locust UI |
| `/feature` | flagd-ui |
| `/flagservice/` | flagd (OFREP for the browser) |
| `/otlp-http/` | collector OTLP/HTTP (browser spans) |
| `/jaeger/` | Jaeger UI (`/jaeger/ui/`) |
| `/grafana/` | Grafana |
| `/opamp/` | OpAMP UI |
| `/telemetry/` | Weaver telemetry docs |
| `/images/` | image-provider |
| `/profiles/` | Firepit (profiling mode) |
| `/chatbot/` | chatbot (agentic mode) |

Source: `T/src/frontend-proxy/envoy.tmpl.yaml`; URLs listed in `D/docker-deployment.md` "Verify the web store and Telemetry".

## 4. Telemetry flow and the collector hook

All services send OTLP to `otel-collector` (`OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317`, HTTP on 4318); the browser sends to `http://localhost:8080/otlp-http/v1/traces`. Source: `T/.env`

Collector image: `opentelemetry-collector-contrib:0.159.0`, memory limit 400M, `GOMEMLIMIT=160MiB`, runs as root and mounts the host filesystem at `/hostfs` and the Docker socket. Source: `T/.env`, `T/compose.yaml` lines 842 to 876

Config files, merged in order with repeated `--config` flags:

| File | Loaded when | Role |
| --- | --- | --- |
| `src/otel-collector/otelcol-config.yml` | always | Base: receivers, processors, `debug` exporter, pipelines |
| `src/otel-collector/otelcol-config-full.yml` | full mode | Adds `kafkametrics` receiver to metrics pipeline |
| `src/otel-collector/otelcol-config-observability.yml` | observability mode | Bundled backend exporters and the `opamp` extension |
| `src/otel-collector/otelcol-config-extras.yml` | always, last | Your additions |
| `src/otel-collector/otelcol-ebpf-profiling.yml` | profiling mode | Separate eBPF profiler collector |

Sources: `T/compose.yaml`, `T/compose.full.yaml`, `T/compose.observability.yaml`, `D/docker-deployment.md` "Bring your own backend"

Base config components (`T/src/otel-collector/otelcol-config.yml`):

- Receivers: `otlp` (gRPC and HTTP with CORS), `http_check/frontend-proxy`, `nginx`, `docker_stats`, `redis` (valkey-cart), `postgresql`, `prometheus/ad`, `host_metrics` (root path `/hostfs`).
- Processors: `memory_limiter` (80% / 25%), `resource_detection` (env, docker, system), `transform/sanitize_spans`, `gen_ai_normalizer`, `transform/redact_sensitive_data`, `redaction`, `transform/sanitize_logs`, `filter/sanitize_profiles`. No batch processor (removed in 2.2.0; batching now via exporter `sending_queue`).
- Connector: `span_metrics` (traces to metrics).
- Exporter: `debug` only.
- Pipelines: traces, metrics, logs and profiles. Collector self-telemetry (metrics and logs) goes back into its own OTLP receiver.

Note that 0.159.0 uses snake_case component names (`resource_detection`, `span_metrics`, `host_metrics`, `otlp_grpc`, `otlp_http`), not the older `resourcedetection`, `spanmetrics`, `otlp`, `otlphttp`. Source: `T/src/otel-collector/otelcol-config.yml`, `H/UPGRADING.md` "To 0.42"

Observability layer exporters (`T/src/otel-collector/otelcol-config-observability.yml`): `otlp_grpc/jaeger` (jaeger:4317), `otlp_http/prometheus` (`http://prometheus:9090/api/v1/otlp`), `opensearch` (index `otel-logs`), `otlp_grpc/firepit`. Pipelines: traces to debug, jaeger, span_metrics; metrics to debug, prometheus; logs to debug, opensearch; profiles to debug, firepit.

### Adding your own backend

The documented mechanism is still `src/otel-collector/otelcol-config-extras.yml`, now paired with `compose.extras.yaml` for adding containers. Arrays are replaced, not appended, when configs merge; the `span_metrics` connector must stay in the traces exporters (and metrics receivers) or the collector crashes. Source: `D/docker-deployment.md` "Bring your own backend", `T/src/otel-collector/otelcol-config-extras.yml`, `T/compose.extras.yaml`

Docs example, with bundled backends kept (`D/docker-deployment.md`):

```yaml
exporters:
  otlp_http/example:
    endpoint: <your-endpoint-url>
service:
  pipelines:
    traces:
      exporters: [debug, otlp_grpc/jaeger, span_metrics, otlp_http/example]
```

Minimal version for our lab, with the demo started in a `*-no-o11y` mode (so `otlp_grpc/jaeger` and friends are not defined and must not be referenced). This is derived from the files above and not tested:

```yaml
exporters:
  otlp_http/lgtm:
    endpoint: http://alloy:4318   # our Alloy or collector OTLP/HTTP receiver
service:
  pipelines:
    traces:
      exporters: [debug, span_metrics, otlp_http/lgtm]
    metrics:
      exporters: [debug, otlp_http/lgtm]
    logs:
      exporters: [debug, otlp_http/lgtm]
```

Two things to watch. First, the commented example in `otelcol-config-extras.yml` overrides the metrics `receivers` list without `postgresql` and `prometheus/ad`, so copying it silently drops those metrics. Source: `T/src/otel-collector/otelcol-config-extras.yml`. Second, the demo network is named `opentelemetry-demo` (`T/compose.yaml` lines 21 to 24), so an LGTM stack in a separate Compose project must join that network as external, or be added through `compose.extras.yaml`, for `alloy` to resolve.

## 5. Bundled backends and dashboards

Compose observability layer: **Jaeger 2.19.0** (traces, in memory, 25,000 traces), **Prometheus v3.13.1** (metrics, OTLP receiver and exemplar storage enabled, 7 day retention), **OpenSearch** (logs), **Grafana 13.1.0** with the OpenSearch plugin, and an **OpAMP server**. Source: `T/compose.observability.yaml`, `T/.env`. Profiling mode adds **Firepit**. Source: `T/compose.profiling.yaml`

Grafana data sources: Prometheus (uid `webstore-metrics`, default), Jaeger (uid `webstore-traces`), OpenSearch (uid `webstore-logs`, index `otel-logs-*`). Grafana is served from `/grafana/`. Source: `T/src/grafana/provisioning/datasources/default.yaml`, `jaeger.yaml`, `opensearch.yaml`, `T/src/grafana/grafana.ini`

Dashboards in `T/src/grafana/provisioning/dashboards/demo/`:

| File | Title |
| --- | --- |
| `demo-dashboard.json` | Demo Dashboard (uid `W2gX2zHVk`) |
| `apm-dashboard.json` | APM Dashboard (Jaeger, Prometheus, OpenSearch) |
| `spanmetrics-dashboard.json` | Spanmetrics Demo Dashboard |
| `exemplars-dashboard.json` | Cart Service Exemplars |
| `opentelemetry-collector.json` | OpenTelemetry Collector |
| `self-observability.json` | Self-Observability (SDK self-telemetry) |
| `linux-dashboard.json` | Linux |
| `postgresql-dashboard.json` | PostgreSQL |
| `NGINX-metrics.json` | [Image-Provider] NGINX Metrics |
| `events-by-name.json` | Events by Name (logs) |

Alert rules ship in `T/src/grafana/provisioning/alerting/` (cart service, collector rules, default email contact point).

Reuse tip (derived, not tested): most panels reference datasource uids directly, so provisioning our Mimir data source with uid `webstore-metrics` lets the metric dashboards load unchanged. The trace and log panels are built for Jaeger and OpenSearch query languages and need rewriting for Tempo (TraceQL) and Loki (LogQL).

Switching the backends off:

- Compose: start without `compose.observability.yaml` (`make start-no-o11y` or `make start-minimal-no-o11y`). The collector then loads no backend exporters and the Grafana, Jaeger and OpAMP routes are not available. Source: `T/Makefile`, `D/docker-deployment.md`
- Helm: set `jaeger.enabled`, `prometheus.enabled`, `grafana.enabled` and `opensearch.enabled` to `false` (all default `true`). Source: `H/README.md` values table, `H/Chart.yaml` dependency conditions. The collector pipelines in `values.yaml` still reference `otlp_grpc/jaeger`, `otlp_http/prometheus` and `opensearch`, so the pipeline exporter lists must be overridden too (see section 7).

## 6. Fault injection with flagd

Flags live in `src/flagd/demo.flagd.json`. All default to `off`. Source: `T/src/flagd/demo.flagd.json`

| Flag | Service | Effect | Variants |
| --- | --- | --- | --- |
| `adFailure` | ad | `GetAds` errors 1 in 10 times | on/off |
| `adHighCpu` | ad | High CPU load | on/off |
| `adManualGc` | ad | Full manual GCs | on/off |
| `aiRunawayAgent` | agent | Agent keeps calling tools until recursion limit | on (20)/off |
| `aiSlowResponse` | agent | Delays LLM call | 5 s, 10 s, off |
| `cartFailure` | cart | `EmptyCart` fails for a percentage of calls | 10% to 100%, off |
| `emailMemoryLeak` | email | Memory leak, email body padded | 1x to 10000x, off |
| `emitRawPii` | checkout, payment | Emits raw `user.email`, card number, CVV (not a failure; for the redaction example) | on/off |
| `failedReadinessProbe` | cart | Readiness probe fails (Kubernetes only) | on/off |
| `imageSlowLoad` | frontend (Envoy fault injection) | Slow product images | 5 s, 10 s, off |
| `intlShippingSlowdown` | shipping | Delays non-US shipping | 5 s, 10 s, off |
| `kafkaQueueProblems` | checkout, fraud-detection | Floods Kafka and slows consumer, lag spike | on (100)/off |
| `loadGeneratorFloodHomepage` | load-generator | Floods the frontend homepage | on (100)/off |
| `paymentFailure` | payment | `charge` fails for a percentage of calls | 10% to 100%, off |
| `paymentUnreachable` | checkout | Uses a bad payment address | on/off |
| `productCatalogFailure` | product-catalog | `GetProduct` fails for product `OLJCESPC7Z` | on/off |
| `productCatalogLockContention` | product-catalog | Holds `ACCESS EXCLUSIVE` lock on `catalog.products` | on/off |
| `recommendationCacheFailure` | recommendation | Exponentially growing cache (memory leak) | on/off |

Sources: `T/src/flagd/demo.flagd.json` (names, descriptions, variants); service mapping and detailed effects from `D/feature-flags/_index.md`.

That is 18 flags at 3.1.0. On `main` there are 20: `cartMetricCardinalityOverflow` (cart adds trace ID to `demo.cart.get_cart.latency` to trigger SDK cardinality overflow) and `kafkaConsumerDead` (fraud-detection leaves the consumer group, lag grows). Source: `M/src/flagd/demo.flagd.json`. The docs table lists `kafkaConsumerDead`, plus `loadGeneratorTraffic` and `loadGeneratorVUs` which 3.1.0 removed, and omits `emitRawPii` and `loadGeneratorFloodHomepage`. Source: `D/feature-flags/_index.md`

Toggling:

- flagd-ui at `http://localhost:8080/feature`, with a Basic view (pick default variant) and an Advanced view (edit raw JSON with schema checking). Source: `D/feature-flags/_index.md`
- File edit: Compose bind-mounts `./src/flagd` into flagd (`/etc/flagd`) and flagd-ui (`/app/data`); flagd starts with `--uri file:./etc/flagd/demo.flagd.json`. Source: `T/compose.yaml` lines 697 to 760
- New in 3.1.0: a flagd-ui scheduler that activates random flags for random durations, with configurable interval, hold time, concurrency, variant choice and seed. Source: `T/.chloggen/2375-flagd-ui-flag-scheduler.yaml`

Documented troubleshooting material:

- "Using Metrics and Traces to diagnose a memory leak" walkthrough for `recommendationCacheFailure` (setup, diagnosis, confirmation). Source: `D/feature-flags/recommendation-cache/index.md`
- Collector Data Flow Dashboard page and Self-Observability Dashboard page. Source: `D/collector-data-flow-dashboard/index.md`, `D/self-observability-dashboard/index.md`
- Tail-sampling sample configuration by service criticality. Source: `D/sample-configurations/tail-sampling-service-criticality.md`

## 7. Kubernetes and Helm

- Repo: `https://open-telemetry.github.io/opentelemetry-helm-charts`, chart `open-telemetry/opentelemetry-demo`. Source: `D/kubernetes-deployment.md`
- Latest chart version **0.42.6**, appVersion **3.1.0**, published 2026-10-21. Source: https://open-telemetry.github.io/opentelemetry-helm-charts/index.yaml, `H/Chart.yaml`
- Sub-chart dependencies: opentelemetry-collector 0.173.1 (plus a second aliased instance `otel-ebpf-profiler`, disabled), jaeger 4.13.1, prometheus 29.30.2, grafana 13.2.5 (from `grafana-community` charts), opensearch 3.8.0. Source: `H/Chart.yaml`
- The collector runs as a **daemonset** with presets `hostMetrics`, `kubernetesAttributes`, `kubeletMetrics`, `clusterMetrics` and annotation discovery. Source: `H/values.yaml` lines 1244 to 1275
- Upgrades are not supported; uninstall and reinstall. Source: `D/kubernetes-deployment.md`, `H/UPGRADING.md`
- Prerequisites: Kubernetes 1.24+, 6 GB free RAM, Helm 3.14+ according to the docs page (`D/kubernetes-deployment.md`); the chart README says Helm 4.0+ (`H/README.md`).
- Default image is `ghcr.io/open-telemetry/demo` with tag defaulting to the chart appVersion. Source: `H/values.yaml` lines 24 to 33

Values to drop the bundled backends and export to an external OTLP endpoint (assembled from `H/values.yaml` and `D/kubernetes-deployment.md`; not rendered or tested):

```yaml
jaeger:
  enabled: false
prometheus:
  enabled: false
grafana:
  enabled: false
opensearch:
  enabled: false
opentelemetry-collector:
  config:
    exporters:
      otlp_http/lgtm:
        endpoint: http://alloy.monitoring.svc.cluster.local:4318
    service:
      pipelines:
        traces:
          exporters: [otlp_http/lgtm, debug, span_metrics]
        metrics:
          exporters: [otlp_http/lgtm, debug]
        logs:
          exporters: [otlp_http/lgtm, debug]
```

The docs page still shows the old names `otlphttp/example` and `spanmetrics` (`D/kubernetes-deployment.md`); the chart itself now uses `span_metrics` and `otlp_grpc/...` (`H/values.yaml`). Services find the collector through `OTEL_COLLECTOR_NAME=otel-collector` in `default.env` (`H/values.yaml`), which is another hook if you want apps to send straight to Alloy.

Resource statements: "The entire installation is restricted to ~4 Gigabytes of memory, but may use less", with tuned per-component memory limits. Source: `https://github.com/open-telemetry/opentelemetry.io/blob/main/content/en/docs/platforms/kubernetes/helm/demo.md`. Sub-chart limits in the README: collector 200Mi, Jaeger 400Mi, Prometheus 200Mi, Grafana 175Mi, OpenSearch 1100Mi (`H/README.md`); note `values.yaml` sets the collector to 400Mi.

## 8. Windows and Docker Desktop caveats

- Docs only say the system must meet Docker Desktop requirements and that Linux, macOS and Windows should work. Source: `D/requirements/system.md`
- Collector crash loop on Windows 11 + WSL2 + Docker Desktop: `memory_limiter` with percentage limits fails with "invalid format for MountPoint" (path containing `C:\Program Files\Docker\...`). Workaround: replace `limit_percentage`/`spike_limit_percentage` with `limit_mib: 320` and `spike_limit_mib: 100` for the 400 MiB collector. Source: https://github.com/open-telemetry/opentelemetry-demo/issues/4061 (closed 2026-10-15), upstream https://github.com/open-telemetry/opentelemetry-collector/issues/16174 (open). The workaround comment is on `main` (`M/src/otel-collector/otelcol-config.yml`), not in 3.1.0. Because `otelcol-config-extras.yml` loads last, the override can go there instead of editing the base file.
- Gradle issues on Windows when building `ad` locally. Source: `T/CONTRIBUTING.md` "Gradle Issues (Windows)"
- Multi-platform builds need the containerd image store enabled in Docker Desktop. Source: `T/CONTRIBUTING.md` "Multi-platform Builds"
- The Makefile needs `make`; on Windows without it, use the long `docker compose --env-file ... -f ...` commands from `D/docker-deployment.md`.

## 9. Grafana-side material

**Grafana fork of the demo.** `github.com/grafana/opentelemetry-demo` now redirects to `grafana-cold-storage/opentelemetry-demo`, a fork of the upstream demo described as "the Grafana way". It is **archived**, last push 2024-10-02, so it predates the 3.x layout and attribute rename. Useful only as historical reference. Source: https://api.github.com/repos/grafana/opentelemetry-demo

**`grafana/otel-lgtm`** (repository `grafana/docker-otel-lgtm`). A single Docker image bundling the OpenTelemetry Collector, Prometheus (metrics, not Mimir), Tempo, Loki, Pyroscope and Grafana, with optional OBI eBPF auto-instrumentation. Intended for "development, demo, and testing environments"; data goes to `/data` and can be persisted with a volume; it can forward to another OTLP endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT`; has a PowerShell runner and Kubernetes manifests. Actively maintained: v0.40.0 released 2026-11-06, last push 2026-11-09. Source: https://github.com/grafana/docker-otel-lgtm/blob/main/README.md, https://api.github.com/repos/grafana/docker-otel-lgtm/releases

**`grafana/intro-to-mltp`.** Companion repo for Grafana's metrics, logs, traces and profiles sessions: a Docker Compose sandbox with Grafana, Mimir, Loki, Tempo, Pyroscope, Alloy, Beyla, k6 and Faro, driving its own "Mythical Beasts" microservices (not the Astronomy Shop), with optional Grafana Cloud and OpenTelemetry Collector variants. Its README points users who only need a backend to `docker-otel-lgtm`. Maintained: last push 2026-11-09, no GitHub releases. Source: https://github.com/grafana/intro-to-mltp/blob/main/README.md, https://api.github.com/repos/grafana/intro-to-mltp

**Grafana docs and Alloy scenarios.** No current Grafana-published guide for running the Astronomy Shop against Alloy or LGTM was found. Closest material: the Alloy page "Collect OpenTelemetry data and forward to Grafana", which uses `otelcol.receiver.otlp`, `otelcol.processor.memory_limiter`/`batch`, `otelcol.exporter.otlp` to Tempo, `otelcol.exporter.prometheus` to `prometheus.remote_write` for Mimir, and `otelcol.exporter.loki` to `loki.write` (https://grafana.com/docs/alloy/latest/collect/opentelemetry-to-lgtm-stack/). Also `grafana/alloy-scenarios`, actively maintained (last push 2026-11-09), with scenarios such as `otel-collector-to-alloy-migration`, `otel-span-metrics`, `otel-tail-sampling`, `otel-tracing-service-graphs` and `kafka` (https://github.com/grafana/alloy-scenarios).

## 10. Resource estimates

| Variant | Stated by docs | Sum of Compose memory limits at 3.1.0 |
| --- | --- | --- |
| Full (`make start`) | 6 GB RAM, 14 GB disk | about 7.9 GB (core 4.2 GB + full 1.1 GB + observability 2.7 GB) |
| Minimal (`make start-minimal`) | about 3 GB | about 6.8 GB (core + observability) |
| Full, no observability | not stated | about 5.2 GB |
| Minimal, no observability | not stated | about 4.2 GB |
| Agentic add-on | not stated | +1.5 GB |
| Helm default | about 4 GB, "may use less"; 6 GB free RAM prerequisite | not summed |

Docs: `D/docker-deployment.md` "Prerequisites", `D/kubernetes-deployment.md`, Helm demo page cited in section 7. Limit sums computed from the `memory:` limits in `T/compose.yaml`, `T/compose.full.yaml`, `T/compose.observability.yaml` and `T/compose.agent.yaml`. Limits are ceilings, not measured usage; the biggest are load-generator 1500M, Jaeger 1200M, OpenSearch 1G, Kafka 620M, recommendation 500M. No CPU limits are set in any Compose file. Either way the demo fits easily on a 64 GB, 32-thread PC.

## Not verified

- No container was started; nothing here is measured. Actual RAM and CPU use, startup time and whether the lab YAML snippets in sections 4 and 7 load cleanly are untested.
- Whether the WSL2 `memory_limiter` crash still happens with collector 0.159.0 on this PC's Docker Desktop version.
- Whether `host_metrics` (`/hostfs`) and `docker_stats` (Docker socket) produce sensible data under Docker Desktop on Windows.
- Whether flagd picks up edits to `demo.flagd.json` made from Windows through the bind mount (file-change notification across the Windows to Linux VM boundary).
- Whether `latest-*` image tags are built from `main` (inferred from Docker Hub update dates, not from the CI workflow).
- Per-service instrumentation details come from the docs, which track `main`; only the recommendation, accounting, cart, email and quote Dockerfiles were checked at the tag.
- The cart service docs page was not read (not present in the docs tree fetched); cart instrumentation is taken from the coverage tables.
- Whether the Helm values override in section 7 renders and runs, whether unused bundled exporters left in the config cause errors, and how the chart's frontend-proxy behaves with Jaeger and Grafana disabled.
- Whether collector 0.159.0 still accepts the old `otlphttp`/`spanmetrics` names used in the Kubernetes docs page.
- The Helm 3.14+ versus 4.0+ requirement conflict was not resolved.
- The languages of opamp-server and telemetry-docs were not checked.
- The Packt book chapter and third-party blog posts about the demo with Grafana were not read.
