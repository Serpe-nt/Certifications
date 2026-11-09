# Upstream source

| | |
|---|---|
| Project | OpenTelemetry Demo (Astronomy Shop) |
| Repository | https://github.com/open-telemetry/opentelemetry-demo |
| Tag | `3.1.0` (release published 2026-09-18) |
| Commit | `dedc0178918e260823323b8d95005a8cb924b007` (committed 2026-09-18T06:35:33Z) |
| Copied on | 2026-11-09 |
| Licence | Apache License 2.0 (`LICENSE`, copied unchanged) |

The tag was checked with `git ls-remote https://github.com/open-telemetry/opentelemetry-demo.git refs/tags/3.1.0` on 2026-11-09; it points at the commit above.

## What was copied

From the tag, unchanged at first (git commit `6c39066` in this repository), then trimmed:

- `LICENSE`, `docker-gen-proto.sh`, `otel-config.yml`, `pb/demo.proto`
- `src/ad`, `src/cart`, `src/checkout`, `src/flagd`, `src/flagd-ui`, `src/fraud-detection`, `src/frontend`, `src/frontend-proxy`, `src/image-provider`, `src/kafka`, `src/load-generator`, `src/payment`, `src/postgresql`, `src/product-catalog`, `src/recommendation`, `src/otel-collector`

The Windows-only `gradlew.bat` wrappers of `ad` and `fraud-detection` were not copied: every build runs in Docker.

Line endings were kept as upstream stores them (LF); the clone was made with `core.autocrlf=false` and `core.eol=lf`.

## Backported from upstream `main`

| Upstream commit | Date | What | Where |
|---|---|---|---|
| `a5c52c7` (PR 4087) | 2026-10-13 | `cartMetricCardinalityOverflow` flag | `src/cart/src/Program.cs`, `src/cart/src/cartstore/ValkeyCartStore.cs`, `src/flagd/demo.flagd.json` |
| `258466e` (PR 4014) | 2026-10-07 | `kafkaConsumerDead` flag and `max.poll.records=30` | `src/fraud-detection/src/main/kotlin/frauddetection/main.kt`, `src/flagd/demo.flagd.json` |

The same PR 4014 also changed what `kafkaQueueProblems` means (a per-record delay in milliseconds with 1 to 5 second variants, while checkout still sends that many extra messages per order). That part was not taken: `kafkaQueueProblems` behaves as at 3.1.0. See `TRIMMING.md`.

## Tracking upstream

There is no plan to follow upstream after 3.1.0. To compare, clone the tag and diff a service directory against `src/<service>`; `TRIMMING.md` explains every difference.
