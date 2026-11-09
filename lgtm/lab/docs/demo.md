# The shop: the lab's trimmed OpenTelemetry Demo

The lab's application is a smaller copy of the OpenTelemetry Demo's Astronomy Shop at tag 3.1.0. It lives in `lgtm/lab/demo`, runs in the `shop` namespace, and sends all its telemetry to the lab's collector gateway, `otel-gateway.otel.svc`. Lessons break it on purpose with fault flags.

Where it came from and what changed: `lgtm/lab/demo/UPSTREAM.md` and `lgtm/lab/demo/TRIMMING.md`. Why it looks like this: `lgtm/docs/adr/d1-trimmed-demo.md`.

## Service map

```
                 browser (frontend-web spans)            load-generator (Locust + headless Chromium)
                        |                                          |
                        v                                          v
               frontend-proxy (Envoy) :8080  ----------------------+
                |        |         |          \             \
           /images/   /feature  /loadgen/   /otlp-http/    / (everything else)
                |        |         |            |              |
        image-provider  flagd-ui  load-generator  otel-gateway   frontend (Next.js) :8080
           (NGINX)        |                       (OTLP/HTTP)     |  gRPC
                          |                                       +--> ad (Java) :9555
                        flagd :8013 / :8016  <-- every service    +--> cart (.NET) :7070 ----------> valkey-cart :6379
                        reads its flags                           +--> recommendation (Python) :9001 --> product-catalog
                                                                  +--> product-catalog (Go) :3550 --> astronomy-db (PostgreSQL) :5432
                                                                  +--> checkout (Go) :5050
                                                                          |  gRPC: cart, product-catalog, payment (Node.js) :50051
                                                                          |  Kafka topic "orders"
                                                                          v
                                                                        kafka :9092 --> fraud-detection (Kotlin)
```

Every service also sends OTLP to `otel-gateway.otel.svc` (gRPC 4317 or HTTP 4318).

| Service | Language | Instrumentation | Signals it sends |
|---|---|---|---|
| frontend | TypeScript, Next.js | Node SDK with auto-instrumentations, set up in code; manual spans; browser SDK | traces, metrics, logs (browser: traces as `frontend-web`) |
| frontend-proxy | Envoy | Envoy's native OpenTelemetry tracer and access log | traces, logs |
| image-provider | NGINX | NGINX OpenTelemetry module | traces |
| ad | Java | OpenTelemetry Java agent (zero-code) plus manual spans | traces, metrics, logs |
| cart | C#, .NET | .NET SDK with instrumentation libraries, set up in code; manual spans | traces, metrics, logs |
| checkout | Go | Go SDK with otelgrpc and Sarama instrumentation in code; manual spans | traces, metrics, logs |
| payment | JavaScript, Node.js | Zero-code: auto-instrumentations loaded with `--require` | traces, metrics, logs |
| product-catalog | Go | Go SDK from a declarative configuration file, otelgrpc, otelsql | traces, metrics, logs |
| recommendation | Python | Zero-code: `opentelemetry-instrument`; manual spans and metrics | traces, metrics, logs |
| fraud-detection | Kotlin | OpenTelemetry Java agent (zero-code) | traces, metrics, logs |
| load-generator | Python, Locust | SDK set up in the locustfile | traces, metrics, logs |
| flagd, flagd-ui | Go, Elixir | flagd's built-in OpenTelemetry; Phoenix instrumentation | traces |
| kafka | Java | OpenTelemetry Java agent | metrics, logs (Kafka spans come from checkout and fraud-detection) |

The shop has no currency, shipping, quote or email service. Checkout charges a fixed shipping price of 8.99 USD, makes up the tracking id and records the order confirmation in process; each of these steps still has its own span (`quoteShipping`, `shipOrder`, `sendOrderConfirmation`) with the attribute `demo.stand_in=true`. The shop has one currency, USD.

## How a request flows

Placing an order, as the load generator does about once a minute per user:

1. The browser (or Locust) posts to `/api/checkout` on frontend-proxy, which forwards it to frontend.
2. frontend calls `CheckoutService/PlaceOrder` on checkout over gRPC. The trace context travels in the gRPC metadata, so every step below is in the same trace.
3. checkout gets the cart from cart (which reads Valkey), looks up each product in product-catalog (which queries PostgreSQL), quotes the fixed shipping price, and charges the card through payment.
4. checkout empties the cart, records the confirmation, and publishes the order to the Kafka topic `orders`. The trace context goes into the Kafka message headers.
5. fraud-detection consumes the order; its consumer span links back to checkout's producer span.

Browsing works the same way with fewer hops: `/api/products` (frontend to product-catalog), `/api/recommendations` (frontend to recommendation to product-catalog), `/api/data` (frontend to ad), product images from image-provider through `/images/`.

## Fault flags

Flags are served by flagd and changed on the flag screen: `http://flags.lab.k8s.local` in the lab (it redirects to `/feature`). Every flag is off by default. The lab contract allows lessons to use only the flags in this table.

| Flag | Service | Variants | What it breaks |
|---|---|---|---|
| `adFailure` | ad | on, off | `GetAds` fails with an error status about 1 call in 10 |
| `adHighCpu` | ad | on, off | ad burns CPU in extra threads; latency rises |
| `adManualGc` | ad | on, off | ad triggers full garbage collections; pause times and latency rise |
| `cartFailure` | cart | 10% to 100%, off | `EmptyCart` fails for that share of calls (checkout logs a warning, the order still goes through) |
| `cartMetricCardinalityOverflow` | cart | on, off | cart adds the trace id as attribute `demo.cart.trace_id` to `demo.cart.get_cart.latency`; once over 2,000 series the SDK reports overflow (`otel.metric.overflow`). Backported from upstream `main` |
| `emitRawPii` | checkout, payment | on, off | spans carry raw `user.email`, card number and CVV; the collector's redaction processors hash or mask them |
| `failedReadinessProbe` | cart | on, off | cart's gRPC health check reports NOT_SERVING; on Kubernetes the pod leaves the Service's endpoints |
| `imageSlowLoad` | frontend, frontend-proxy | 5 s, 10 s, off | the browser asks Envoy to delay product images by that time (Envoy fault filter) |
| `kafkaConsumerDead` | fraud-detection | on, off | fraud-detection leaves the consumer group and stops polling; consumer lag grows. Backported from upstream `main` |
| `kafkaQueueProblems` | checkout, fraud-detection | on (100), off | checkout sends 100 extra copies of each order and fraud-detection sleeps 1 s per record; lag spikes |
| `loadGeneratorFloodHomepage` | load-generator | on (100), off | each Locust user requests the home page 100 extra times per task |
| `paymentFailure` | payment | 10% to 100%, off | `Charge` fails for that share of calls; checkout returns an error and the order is not placed |
| `paymentUnreachable` | checkout | on, off | checkout calls payment at a bad address; every order fails with `Unavailable` |
| `productCatalogFailure` | product-catalog | on, off | `GetProduct` fails for product `OLJCESPC7Z` |
| `productCatalogLockContention` | product-catalog | on, off | a background transaction holds an `ACCESS EXCLUSIVE` lock on `catalog.products`; queries wait |
| `recommendationCacheFailure` | recommendation | on, off | recommendation's cache grows without bound (a memory leak); memory and latency climb |

`lgtm/lab/demo/TRIMMING.md` records how each flag was tested and what was seen.

To change a flag without the screen:

- Compose: `make flag F=paymentFailure V=50%` from `lgtm/lab/demo`.
- Kubernetes: the flag screen's changes last until the flagd pod restarts. For a default that survives restarts, edit the `shop-flags` ConfigMap (`kubectl -n shop edit configmap shop-flags`) and restart flagd (`kubectl -n shop rollout restart deployment/flagd`).

`productCatalogFailure` has a targeting rule (fail only for product `OLJCESPC7Z`), so its `defaultVariant` does nothing: the flag screen and `make flag` switch the rule's first branch (`"if": [<condition>, "on", "off"]`). Edit that branch when you change the ConfigMap by hand. Services see a change within seconds; the browser and the headless-browser load generator read flags less often, so `imageSlowLoad` takes effect (and wears off) up to a minute late.

On a fresh install product-catalog restarts a few times until PostgreSQL accepts connections, as upstream's does; the pods settle within about a minute.

## Build and test

Everything builds in Docker; no Go, .NET, Java, Node.js, Python or Elixir toolchain is needed. From `lgtm/lab/demo` in WSL:

| Command | Does |
|---|---|
| `make build` | builds the 13 images, tagged `ghcr.io/serpe-nt/lgtm-demo:<VERSION>-<service>` (cart and flagd-ui run their unit tests during the build) |
| `make smoke` | starts the shop in Compose with a collector that only prints (debug exporter), checks the shop page, lets the load generator run for two minutes, and fails unless every service sent the signals listed above and orders reached fraud-detection. The shop stays up at `http://localhost:8098` |
| `make flag F=<flag> V=<variant>` | switches a flag in the running Compose shop |
| `make down` | removes the Compose shop and its volume |
| `make tools` | downloads pinned Helm, kind, kubectl and kubeconform into `lgtm/lab/.bin` |
| `make chart-lint` | `helm lint --strict` and a schema check of the rendered chart, with and without the Gateway routes |
| `make kind-test` | creates the kind cluster `lgtm-d1`, loads the images, installs a debug-only `otel-gateway` and the chart, and checks the shop and an order end to end |
| `make kind-delete` | deletes that cluster |
| `make proto` | regenerates the gRPC code after a change to `pb/demo.proto` |

The Compose file is for builds and tests only. The lab installs the chart:

```
helm upgrade --install shop lgtm/lab/demo/chart --namespace shop --create-namespace \
  --set storageClass=longhorn --set gateway.enabled=true
```

Chart values that matter: `image.registry`, `image.repository`, `image.tag` (default: the chart's appVersion, the content of `VERSION`), `otlp.endpoint` and `otlp.httpEndpoint`, `storageClass`, `gateway.*`, `loadGenerator.users`. Images are published by `.github/workflows/lgtm-demo.yml` when `lgtm/lab/demo` changes on `main`.

To release a change: edit the code, raise `VERSION` (`3.1.0-lab.<n+1>`) and the chart's `appVersion` together (`make chart-lint` checks they match), and merge to `main`.
