# D2: the beacon's language, SDK and image

Date: 2026-11-10. Card: D2 (beacon and workshop service).

## Context

The beacon (`lgtm/lab/tools/beacon`) publishes the lab's check tokens as OTLP logs, metrics and traces (lab contract, "Check tokens"). The card asks for a small static image and stable OpenTelemetry support for all three signals in the language's SDK, and for bounded memory while the collector gateway is away.

## Options

The status table on the OpenTelemetry site (fetched on 2026-11-10) gives, for traces, metrics and logs:

| Language | Traces | Metrics | Logs | Image |
|---|---|---|---|---|
| Go | Stable | Stable | Release candidate | static binary on a distroless base, about 30 MB |
| Rust | Beta | Stable | Stable | static binary, small, but tracing is still beta |
| C++, PHP | Stable | Stable | Stable | C++ needs a heavy build for a small gain; PHP needs a runtime |
| Java, .NET | Stable | Stable | Stable | a JVM or the .NET runtime: 100 MB or more and much more memory than a 64 MiB limit allows comfortably |
| Python, JavaScript | Stable | Stable | Development | an interpreter in the image; logs not stable |

## Decision

Go. Traces and metrics are stable; logs are a release candidate, and the Go logs SDK (`go.opentelemetry.io/otel/sdk/log`) and API (`go.opentelemetry.io/otel/log`) are published at v1.47.0, the same version as the rest of the SDK. The binary is static, so the image is `gcr.io/distroless/static-debian13:nonroot` plus one file (29 MB in total) and runs as a non-root user with a read-only root file system.

Pinned on 2026-11-10:

| What | Version | Where |
|---|---|---|
| Go toolchain | 1.27.3 (image `golang:1.27.3-trixie`, by digest) | `lgtm/lab/tools/beacon/Dockerfile`; `go.mod` says `go 1.27.1`, the local toolchain the module was made with |
| OpenTelemetry Go | v1.47.0 (`otel`, `sdk`, `sdk/metric`, `sdk/log`, `log`, the OTLP HTTP trace and metric exporters) | `go.mod` |
| OTLP HTTP log exporter | v0.23.0 (`otlploghttp`, released with v1.47.0) | `go.mod` |
| Runtime base | `gcr.io/distroless/static-debian13:nonroot`, by digest | `Dockerfile` |

Design choices that follow from the contract and the card:

- OTLP over HTTP (`OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-gateway.otel.svc:4318`), the same endpoint L3 left in the chart values. HTTP keeps gRPC out of the binary.
- Bounded memory: the span and log batch processors have a queue of 2048 records and drop when it is full; the metric reader keeps one value per slot. The exporters' own retry with back-off (on by default) covers short outages. `BEACON_MEMORY_LIMIT` (the container's memory limit, from the Downward API) sets the Go runtime's soft memory limit to 90% of it.
- The gauge `lab_beacon_value` has no unit, so Mimir's OTLP translation (`otel_metric_suffixes_enabled: true` in `lgtm/lab/helm/mimir/values.yaml`) adds no suffix and the name stays as the contract writes it.
- The beacon prints only start, stop and error lines on standard output. Alloy tails pod logs in `lab-tools`; printing the tokens would store every log token twice, under a second stream.
- `beacon.tick` and `beacon.slot` are internal spans without HTTP, database or messaging attributes, so the gateway's `set_semconv_span_name` processor leaves their names alone. The kind test runs that processor and checks it.

## Sources

- OpenTelemetry language status table: https://opentelemetry.io/docs/languages/
- Latest Go release: https://go.dev/VERSION?m=text (go1.27.3)
- Module versions from the Go module proxy: https://proxy.golang.org/go.opentelemetry.io/otel/@latest (v1.47.0), https://proxy.golang.org/go.opentelemetry.io/otel/sdk/log/@latest (v1.47.0), https://proxy.golang.org/go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp/@latest (v0.23.0)
- Image digests: `docker buildx imagetools inspect golang:1.27.3-trixie` and `gcr.io/distroless/static-debian13:nonroot`, run on 2026-11-10
