# How the lab copy differs from the OpenTelemetry Demo 3.1.0

Upstream: tag `3.1.0`, commit `dedc0178918e260823323b8d95005a8cb924b007` (see `UPSTREAM.md`). The reasons behind these choices are in `lgtm/docs/adr/d1-trimmed-demo.md`.

## Services

### Kept

| Service | Language | Instrumentation | Role |
|---|---|---|---|
| frontend | TypeScript (Next.js) | Node SDK with auto-instrumentations set up in code, manual spans, browser SDK | web shop and its API |
| frontend-proxy | Envoy | native tracer and OTLP access log | single entry point |
| image-provider | NGINX | NGINX OpenTelemetry module | product images |
| ad | Java | Java agent (zero-code), manual spans | ads |
| cart | C# (.NET) | SDK and instrumentation libraries in code, manual spans | carts in Valkey |
| checkout | Go | SDK, otelgrpc, Sarama in code, manual spans | orders, Kafka producer |
| payment | JavaScript (Node.js) | zero-code (`--require` auto-instrumentations) | card charges |
| product-catalog | Go | SDK from declarative config, otelgrpc, otelsql | products in PostgreSQL |
| recommendation | Python | zero-code (`opentelemetry-instrument`), manual spans and metrics | recommendations |
| fraud-detection | Kotlin | Java agent (zero-code) | Kafka consumer |
| load-generator | Python (Locust) | SDK in the locustfile | traffic |
| flagd, flagd-ui | Go (upstream image), Elixir | built-in, Phoenix instrumentation | fault flags and the flag screen |
| kafka, PostgreSQL, Valkey | | Java agent on Kafka | data stores |

### Removed

| Removed | What it was | What replaced it |
|---|---|---|
| accounting | .NET Kafka consumer writing orders to PostgreSQL | nothing; fraud-detection is the Kafka consumer. Its schema is gone from `src/postgresql/init.sql` |
| currency | C++ currency conversion | one currency (USD) in checkout and frontend |
| shipping | Rust shipping quote and tracking id | fixed price and generated tracking id in checkout and frontend |
| quote | PHP quote, called by shipping | as shipping |
| email | Ruby order confirmation | a span and a log line in checkout |
| agent, chatbot, mcp | AI assistant (agentic mode) | nothing; the load generator no longer calls the agent |
| react-native-app | mobile client | nothing |
| opamp-server | OpAMP reference server | nothing; cart and product-catalog lost their OpAMP clients |
| telemetry-docs | generated telemetry docs | nothing |
| otel-ebpf-profiler, Firepit | profiling | nothing; no profiles pipeline |
| Jaeger, Prometheus, OpenSearch, Grafana | bundled backends | the lab's LGTM stack, reached through the `otel-gateway` collector |

Upstream test assets that were not copied: `test/` (trace-based tests), `compose.tests.yaml`, the root `Makefile`, `.env` and Compose files (replaced by this directory's own), and the frontend's Cypress tests.

## Code changes, file by file

Paths are relative to `lgtm/lab/demo`.

| File | Change | Why |
|---|---|---|
| `pb/demo.proto` | Removed `ShippingService`, `CurrencyService`, `EmailService` and the messages only they used (`GetQuoteRequest`, `GetQuoteResponse`, `ShipOrderRequest`, `ShipOrderResponse`, `GetSupportedCurrenciesResponse`, `CurrencyConversionRequest`, `SendOrderConfirmationRequest`). | No dead clients. `Money`, `Address`, `OrderItem`, `OrderResult` unchanged, so the Kafka message is the same. |
| `src/checkout/genproto/**`, `src/product-catalog/genproto/**`, `src/frontend/protos/demo.ts`, `src/recommendation/demo_pb2*.py` | Regenerated from the trimmed proto with upstream's genproto images. | Follows the proto. |
| `docker-gen-proto.sh` | Dropped the C++ (currency) generator and the `.env` it read; image names prefixed `lgtm-demo-genproto-`. | currency is gone; no clash with other images. |
| `src/checkout/main.go` | Removed the shipping, currency and email clients and their `*_ADDR` variables and the HTTP client. Added `quoteShipping` (fixed 8.99 USD), `shipOrder` (tracking id from a UUID) and `sendOrderConfirmation` (span and log line) as in-process stand-ins, each with its own span and `demo.stand_in=true`, `demo.stand_in.replaces=shipping` or `email`. Totals are in `USD`; catalog prices are used as they are. | Card: smallest stand-in, keep a span that says what happened. |
| `src/checkout/main_test.go` | Replaced the email timeout test with a test of the three stand-ins. | The email client is gone. |
| `src/checkout/go.mod`, `go.sum` | `go mod tidy` (drops `otelhttp`). | Unused after the change. |
| `src/frontend/utils/standIn.ts` (new), `pages/api/currency.ts`, `pages/api/shipping.ts` | `/api/currency` returns `["USD"]`, `/api/shipping` returns the fixed 8.99 USD; both mark their span with `demo.stand_in`. | Stand-ins for currency and shipping. |
| `src/frontend/services/ProductCatalog.service.ts`, `pages/api/{cart,checkout,recommendations}.ts`, `pages/api/products/**` | No price conversion; the unused `currencyCode` parameters are gone. | One currency. |
| `src/frontend/gateways/rpc/Currency.gateway.ts`, `gateways/http/Shipping.gateway.ts` | Deleted. | Their services are gone. |
| `src/frontend/next.config.js` | Removed `CURRENCY_ADDR`, `SHIPPING_ADDR`. | Dead variables. |
| `src/frontend/Dockerfile` | Copies `utils/standIn.ts`. | The Dockerfile copies `utils/` file by file. |
| `src/frontend/cypress/**`, `cypress.config.ts`, `Dockerfile.cypress`, Cypress in `package.json` and `package-lock.json` | Removed (lock file pruned with `npm uninstall cypress --package-lock-only`). | The tests drove the currency switcher; they were never part of the image. |
| `src/cart/src/Program.cs`, `src/cart/src/OpAmpClientSetup.cs`, `cart.csproj`, `Directory.Packages.props` | OpAMP client removed. | No OpAMP server. |
| `src/product-catalog/main.go`, `opamp.go`, `opamp_test.go`, `Dockerfile`, `go.mod`, `go.sum` | OpAMP client removed; `go mod tidy`. | No OpAMP server. |
| `src/load-generator/locustfile.py` | Removed the agent prompts and the `ask_agent` task; the browser task `open_cart_page_and_change_currency` became `open_cart_page` (no currency switch). | agent is gone; one currency. |
| `src/load-generator/people.json` | The one shopper with `userCurrency: CAD` now uses `USD`. | One currency. |
| `src/frontend-proxy/envoy.tmpl.yaml` | Removed the `/jaeger`, `/grafana`, `/opamp`, `/telemetry`, `/profiles`, `/chatbot` routes and their clusters. | Their targets are gone. |
| `src/postgresql/init.sql` | Removed the `accounting` schema and tables. | accounting is gone. |
| `src/kafka/README.md`, `src/fraud-detection/.../main.kt` comment | No longer mention accounting. | accounting is gone. |
| `src/otel-collector/` | One test configuration, `otelcol-config.yml`: OTLP receiver, `debug` exporter (`verbosity: normal`), `memory_limiter` with fixed limits (320 MiB, spike 100 MiB), the redaction processors kept. Removed: the `full`, `observability`, `extras` and eBPF profiling files; the `docker_stats`, `host_metrics`, `nginx`, `redis`, `postgresql`, `prometheus/ad`, `http_check` and `kafkametrics` receivers; the `span_metrics` connector; the `gen_ai_normalizer` processor; the profiles pipeline. | Tests only; the lab's gateway is card L3's. Percentage limits fail on Docker Desktop with WSL 2 (upstream issue 4061). |
| `src/flagd/demo.flagd.json` | Flags of removed services removed; two flags backported (below). | |
| `src/cart/src/Program.cs`, `src/cart/src/cartstore/ValkeyCartStore.cs` | Backport of upstream `a5c52c7`: `cartMetricCardinalityOverflow`. | Card: bring it over if small (it is about 25 lines). |
| `src/fraud-detection/src/main/kotlin/frauddetection/main.kt` | Backport of upstream `258466e`: `kafkaConsumerDead` and `max.poll.records=30`. The commit's new meaning for `kafkaQueueProblems` was left out. | Card: bring it over if small (about 40 lines). |
| `src/ad/gradlew.bat`, `src/fraud-detection/gradlew.bat` | Not copied. | Builds run in Docker. |

New files: `compose.yaml`, `.env`, `Makefile`, `VERSION`, `scripts/`, `chart/`, `test/kind/`, `NOTICE`, `UPSTREAM.md`, this file.

## Flags

16 flags: the 14 of the lab contract, which all survived, plus 2 backported from upstream `main`. Removed with their services: `aiRunawayAgent`, `aiSlowResponse` (agent), `emailMemoryLeak` (email), `intlShippingSlowdown` (shipping).

Each flag was switched on in the Compose shop with `scripts/flag-check.sh`, which switches it off again afterwards, and its effect was looked for in the debug collector's output (where every service's logs and spans arrive) or, for `failedReadinessProbe`, in the container's health; `failedReadinessProbe` was also checked on the kind cluster. Results on 2026-11-09:

| Flag | Service | Variant tested | Effect seen | Run |
|---|---|---|---|---|
| `adFailure` | ad | on | ad log `GetAds Failed with status Status{code=UNAVAILABLE…}` | 1 |
| `adHighCpu` | ad | on | ad log `High CPU-Load problempattern enabled` | 1 |
| `adManualGc` | ad | on | ad log `Triggering a manual garbage collection, next one in 10 seconds.` | 1 |
| `cartFailure` | cart | 100% | cart log `Error status code 'FailedPrecondition' … Detail=Can't access cart storage` | 2 |
| `cartMetricCardinalityOverflow` (backported) | cart | on | metric data point `demo.cart.get_cart.latency{demo.cart.trace_id=f3d871ef…}` | 1 |
| `emitRawPii` | checkout, payment | on | checkout span with `user.hash=f7c8e2e4…` (the collector hashed the raw `user.email`) | 1 |
| `failedReadinessProbe` | cart | on | Compose: cart health `unhealthy`. kind: `Readiness probe failed: service unhealthy (responded with "NOT_SERVING")`, cart's EndpointSlice entry `ready=false` after 30 s, Ready again 10 s after the flag went off | 2, kind |
| `imageSlowLoad` | frontend, frontend-proxy | 5sec | Envoy access log `/images/products/RoofBinoculars.jpg` status 200, response flag `DI` (delay injected), 4999 ms | 3 |
| `kafkaConsumerDead` (backported) | fraud-detection | on | fraud-detection log `FeatureFlag 'kafkaConsumerDead' is enabled, unsubscribing from 'orders' (group goes Empty, members -> 0)` | 1 |
| `kafkaQueueProblems` | checkout, fraud-detection | on | fraud-detection log `FeatureFlag 'kafkaQueueProblems' is enabled, sleeping 1 second` | 1 |
| `loadGeneratorFloodHomepage` | load-generator | on | load-generator log `User flooding homepage 100 times` | 1 |
| `paymentFailure` | payment | 100% | `Payment request failed. Invalid token. demo.user_context.loyalty_level=gold` returned to checkout | 1 |
| `paymentUnreachable` | checkout | on | frontend log `Checkout failed to place order` (gRPC code 14, Unavailable) | 1 |
| `productCatalogFailure` | product-catalog | on (targeting rule) | frontend span `GET /api/recommendations` status 500, `13 INTERNAL: Error: Product Catalog Fail Feature Flag Enabled` | 2 |
| `productCatalogLockContention` | product-catalog | on | product-catalog log `lock contention scenario active: holding ACCESS EXCLUSIVE lock on catalog.products` | 1 |
| `recommendationCacheFailure` | recommendation | on | recommendation span `get_product_list` with `demo.feature_flag.recommendation_cache=true` and `demo.recommendation.cache_hit` | 4 (twice) |

Runs, all on the Compose shop started by `make smoke` (project `lgtm-d1`):

1. `WAIT=60 ./scripts/flag-check.sh`, every flag on for 60 s. Eleven flags showed their effect inside the window.
2. `cartFailure`, `failedReadinessProbe` and `productCatalogFailure` again with longer windows. `cartFailure` needs one: the bad cart store retries its connection before it fails. `failedReadinessProbe` needs one: Compose marks cart unhealthy after 20 failed probes 5 s apart. `productCatalogFailure` has a targeting rule (fail only for product `OLJCESPC7Z`), so its `defaultVariant` does nothing; `scripts/set-flag.sh` now switches the rule's first branch, as the flag screen does.
3. `imageSlowLoad`: the browser reads flags late and Envoy logs an image only when it completes, so the delayed images appear after the flag is off; the script now waits longer and matches Envoy's `DI` response flag.
4. `recommendationCacheFailure`: the Python flagd provider's flag cache sometimes kept the old value for minutes (seen in run 2, missed in run 3), so recommendation now runs with `FLAGD_CACHE=disabled` (an environment variable in `compose.yaml` and the chart, no code change). After that the effect showed in two runs out of two.

`scripts/flag-check.sh` holds the final per-flag windows; a full run takes about 35 minutes.


## Image sizes and memory limits

Sizes are the local image sizes reported by `docker images` (Docker Desktop, containerd image store) after `make build` on 2026-11-09. Limits are the chart's (`chart/values.yaml`); the Compose file uses the same memory limits as upstream's Compose files.

| Container | Image | Image size | Memory request (MiB) | Memory limit (MiB) |
|---|---|---|---|---|
| ad | `ghcr.io/serpe-nt/lgtm-demo:3.1.0-lab.1-ad` | 620 MB | 300 | 400 |
| cart | `…-cart` | 201 MB | 100 | 160 |
| checkout | `…-checkout` | 57.5 MB | 16 | 20 |
| fraud-detection | `…-fraud-detection` | 476 MB | 250 | 300 |
| frontend | `…-frontend` | 927 MB | 180 | 250 |
| frontend-proxy | `…-frontend-proxy` | 294 MB | 50 | 90 |
| image-provider | `…-image-provider` | 133 MB | 30 | 120 |
| load-generator | `…-load-generator` | 1.94 GB | 600 | 1500 |
| payment | `…-payment` | 405 MB | 80 | 140 |
| product-catalog | `…-product-catalog` | 55.9 MB | 16 | 20 |
| recommendation | `…-recommendation` | 157 MB | 100 | 500 |
| flagd | `ghcr.io/open-feature/flagd:v0.16.0` | 166 MB | 40 | 75 |
| flagd-ui (sidecar of flagd) | `…-flagd-ui` | 237 MB | 150 | 250 |
| kafka | `…-kafka` | 733 MB | 500 | 620 |
| astronomy-db | `postgres:18.4` | 650 MB | 60 | 120 |
| valkey-cart | `ghcr.io/valkey-io/valkey:9.0.4-alpine3.23` | 63.5 MB | 16 | 32 |
| **Sum** | | 6.24 GB for the 13 own images | **2488** | **4597** (about 4.5 GiB) |

The flagd pod's init container (`copy-flags`, 8 to 16 MiB) runs only at start and is not in the sum. `…` stands for `ghcr.io/serpe-nt/lgtm-demo:3.1.0-lab.1`. In Compose the memory limits are upstream's. The chart gives four containers more room than upstream: ad (400 MiB instead of 300; it used 294 MiB in the smoke test), flagd-ui (250 instead of 200), PostgreSQL (120 instead of 80) and Valkey (32 instead of 20).

Measured use, `docker stats` during the Compose flag check on 2026-11-09 (MiB): ad 294, astronomy-db 43, cart 58, checkout 10, flagd 51, flagd-ui 169, fraud-detection 239, frontend 115, frontend-proxy 54, image-provider 7, kafka 536, load-generator 509, payment 68, product-catalog 13, recommendation 53, valkey-cart 7; about 2.2 GiB for the shop, plus 75 MiB for the debug collector. The whole kind node (Kubernetes itself, the shop and the debug gateway) used 4.2 GiB.
