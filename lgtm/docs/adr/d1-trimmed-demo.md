# D1: what the trimmed demo keeps, and how it is built, tested and packaged

Status: accepted by worker D1 on 2026-11-09, for review by the planner.

## Context

The lab needs a shop that produces traces, metrics and logs and that lessons can break on purpose. Card D1 asks for a trimmed copy of the OpenTelemetry Demo at tag 3.1.0: about ten application services, at most five language runtimes, no bundled backends, a Helm chart of its own, images on GHCR. The services must between them show zero-code instrumentation, library instrumentation set up in code, manual spans, a gRPC call chain, a Kafka producer and consumer, a database and a cache.

Facts below were checked on 2026-11-09 against the sources listed at the end.

## Decision 1: the kept services

The planner's list is kept as it is. Counting it against the card's limits needs one definition, so here it is:

- **Application services (9)**: frontend, product-catalog, cart, checkout, payment, recommendation, ad, fraud-detection, and load-generator (which drives them).
- **Infrastructure the shop needs (not counted as application services)**: frontend-proxy (Envoy, configuration only), image-provider (NGINX, configuration and static files), flagd and its flag screen flagd-ui, Kafka, PostgreSQL, Valkey.
- **Language runtimes of the application services (5)**: Node.js (frontend, payment), Go (checkout, product-catalog), .NET (cart), Python (recommendation, load-generator), JVM (ad in Java, fraud-detection in Kotlin). flagd-ui adds Elixir as a support tool; it is upstream's flag screen and the card keeps it.

What the kept set teaches:

| Requirement | Where |
|---|---|
| Zero-code instrumentation | payment (`@opentelemetry/auto-instrumentations-node` loaded with `--require`), recommendation (`opentelemetry-instrument`), ad and fraud-detection (OpenTelemetry Java agent) |
| Library instrumentation set up in code | checkout (otelgrpc, Sarama, runtime), product-catalog (otelgrpc, otelsql, declarative `otel-config.yml`), cart (.NET SDK with ASP.NET Core, gRPC, Redis instrumentation), frontend (Node SDK with `getNodeAutoInstrumentations()` in `Instrumentation.js`) |
| Manual spans | checkout (`prepareOrderItemsAndShippingQuoteFromCart`, the three stand-ins, the Kafka producer span), cart, ad, recommendation |
| gRPC call chain | frontend to checkout to cart, product-catalog and payment; frontend to recommendation to product-catalog |
| Kafka producer and consumer | checkout publishes to `orders`; fraud-detection consumes |
| Database and cache | product-catalog reads PostgreSQL; cart stores carts in Valkey |

Removed, as the card says: currency, email, quote, shipping, accounting, agent, chatbot, mcp, the React Native app, the OpAMP server, telemetry-docs, profiling (eBPF profiler, Firepit), and the bundled Jaeger, Prometheus, OpenSearch and Grafana.

## Decision 2: stand-ins instead of removed services, and a trimmed proto

Checkout and frontend called currency, shipping (which called quote) and email. Each call became the smallest in-process stand-in: one currency (USD, which every catalog price already uses) and a fixed shipping price of 8.99 USD. Checkout keeps a span for each stand-in (`quoteShipping`, `shipOrder`, `sendOrderConfirmation`) with the attributes `demo.stand_in=true` and `demo.stand_in.replaces`, so a trace still reads like an order. The frontend marks its `/api/currency` and `/api/shipping` spans the same way.

`pb/demo.proto` lost `CurrencyService`, `ShippingService` and `EmailService` and their own messages, and the generated code was regenerated with upstream's own genproto images, so no dead clients remain. `Money`, `Address`, `OrderItem` and `OrderResult` are unchanged, so the Kafka message format is the same as upstream's. Cart and product-catalog lost their OpAMP clients (they only ran when `OPAMP_SERVER_ENDPOINT` was set).

Option not taken: keep the services and only stop deploying them. That leaves environment variables, clients and dead routes, which the card forbids, and lessons would show calls to services that are not there.

## Decision 3: fault flags

All 14 flags in the lab contract survive, because each belongs to a kept service. The four flags of removed services (`aiRunawayAgent`, `aiSlowResponse`, `emailMemoryLeak`, `intlShippingSlowdown`) are gone. `cartMetricCardinalityOverflow` (upstream commit `a5c52c7`, about 25 lines) and `kafkaConsumerDead` (upstream commit `258466e`, about 40 lines) were small and are backported. The same commit `258466e` changed `kafkaQueueProblems` into a per-record delay of 1 to 5 seconds while checkout still produces that many extra messages per order; that change was not taken, so the flag behaves as at 3.1.0 and as the lab contract describes.

Recommendation runs with `FLAGD_CACHE=disabled`: the Python flagd provider's cache sometimes kept a changed flag for minutes, which made `recommendationCacheFailure` unreliable in a lesson. The cost is one local gRPC call per evaluation.

## Decision 4: build and test with Compose, one debug collector

`compose.yaml` folds upstream's `compose.yaml` and `compose.full.yaml` into one file without backends. Changes that matter on the owner's PC:

- Only the frontend proxy is published, on `127.0.0.1:8098`. Ports 8095 and 8096 were in use by worker S1's site at the time, and Docker leaves a port silently unpublished when a WSL process already holds it, so the smoke test checks the binding.
- No fixed container names and no fixed network name, so the Compose project name (`lgtm-demo`, or `lgtm-d1` in testing) keeps it apart from anything else on Docker Desktop.
- The flag file lives in a named volume seeded once from `src/flagd`, so the flag screen never writes into the repository and flagd sees changes at once (file events across the Windows bind mount are not reliable).
- The collector has the `otlp` receiver and the `debug` exporter only, with `verbosity: normal` (one line per record, resource attributes on the resource line), which the smoke test reads. `memory_limiter` uses `limit_mib` because the percentage form fails on Docker Desktop with WSL 2 (upstream issue 4061). The upstream scrapers (`docker_stats`, `host_metrics`, `nginx`, `redis`, `postgresql`, `prometheus/ad`, `http_check`, `kafkametrics`), the `span_metrics` connector, the profiles pipeline and the AI normaliser are not in this test collector; the lab's gateway (card L3) decides which of them to run. Without `span_metrics` the smoke test can tell which service really sent metrics.

## Decision 5: the Helm chart

`chart/` (name `shop`) is written for the lab, not derived from the upstream chart, which is built around its bundled backends:

- One template renders a Deployment and a Service for each entry of `components` in `values.yaml`. Service names are the plain component names, as upstream, so one release per namespace (`shop`).
- flagd and flagd-ui share a pod; an init container copies the flag file from a ConfigMap into an `emptyDir`, as upstream's chart does. Flag changes made on the flag screen last until the pod restarts.
- Kafka, PostgreSQL and Valkey are StatefulSets with one replica and a volume each; the StorageClass is a value (empty means the cluster default; the lab sets `longhorn`).
- Every container has CPU and memory requests and limits; memory limits follow upstream's Compose limits.
- Kubernetes resource attributes (`k8s.namespace.name`, `k8s.pod.name`, `k8s.pod.uid`, `k8s.node.name`, `k8s.deployment.name` or `k8s.statefulset.name`, `k8s.container.name`) come from the downward API.
- OTLP goes to `http://otel-gateway.otel.svc:4317` (gRPC) or `:4318` (HTTP), both values.
- Gateway API `HTTPRoute`s for `shop`, `flags` and `loadgen` under `gateway.domain`, attached to Gateway `lab` in namespace `gateway`, behind `gateway.enabled`.
- The flag screen's cookie key is generated per install and kept across upgrades; the PostgreSQL passwords are upstream's fixed demo passwords, in a Secret.

## Decision 6: images and tools

Images are `ghcr.io/serpe-nt/lgtm-demo:<VERSION>-<service>`, `VERSION` being `3.1.0-lab.1`. `.github/workflows/lgtm-demo.yml` builds all 13 on pull requests and pushes them from `main`, amd64 only, with a GitHub Actions cache per service.

Pinned tools, downloaded by `scripts/tools.sh` into `lgtm/lab/.bin` with SHA-256 checks: Helm v4.3.1, kind v0.33.0 with node image `kindest/node:v1.35.8` (by digest), kubectl v1.35.10, kubeconform v0.8.0. The collector image in the tests stays at upstream's 0.159.0 (pinned by digest), because the copied configuration was written for it.

## Sources

- Tag and commit: https://github.com/open-telemetry/opentelemetry-demo/releases/tag/3.1.0, `git ls-remote https://github.com/open-telemetry/opentelemetry-demo.git refs/tags/3.1.0`
- Services, Compose files, flags, collector configuration: the files at https://github.com/open-telemetry/opentelemetry-demo/tree/3.1.0
- Backports: https://github.com/open-telemetry/opentelemetry-demo/commit/a5c52c7c86a7cbbd91b0357f3f859d35d59fa76a and https://github.com/open-telemetry/opentelemetry-demo/commit/258466eedeb06974ca16a97432c58f1c7d76c089
- Windows `memory_limiter` problem: https://github.com/open-telemetry/opentelemetry-demo/issues/4061
- Upstream chart patterns (flagd sidecar, init container): https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-demo (chart 0.42.6)
- Tool releases and checksums: https://github.com/helm/helm/releases/tag/v4.3.1 (https://get.helm.sh/helm-v4.3.1-linux-amd64.tar.gz.sha256sum), https://github.com/kubernetes-sigs/kind/releases/tag/v0.33.0, https://dl.k8s.io/release/stable-1.35.txt, https://github.com/yannh/kubeconform/releases/tag/v0.8.0
- GitHub Actions versions: https://github.com/actions/checkout/releases, https://github.com/docker/build-push-action/releases, https://github.com/docker/setup-buildx-action/releases, https://github.com/docker/login-action/releases
- Research summary: `lgtm/docs/research/03-otel-demo.md`
