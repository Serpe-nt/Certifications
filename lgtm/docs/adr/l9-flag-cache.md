# L9: every flag evaluation asks flagd

Status: decided by worker L9 on 2026-11-14 and applied to the lab the same day with the owner's
go-ahead (shop chart 0.2.0, `acceptance-lab.md`, "Fault flags reach every service").

## Context

On 2026-11-14 at 18:40 UTC card C12 switched `productCatalogLockContention` on. flagd evaluated it
as on, but product-catalog did not act on it until its pod was restarted at 19:03 UTC. flagd's
impression counters showed that product-catalog never asked flagd for the flag: it served the value
from its provider's cache. Checkout, which runs the same Go provider, took five flag changes that
evening without a restart. Recommendation has run with `FLAGD_CACHE=disabled` since card D1 saw its
Python provider keep a changed flag for minutes.

### How a flag reaches each service

| Service | Language | Provider and version | Resolver | Cache before L9 | Cache after L9 |
|---|---|---|---|---|---|
| ad | Java | `dev.openfeature.contrib.providers:flagd` 0.14.1 | RPC (default) | LRU (default) | disabled |
| fraud-detection | Kotlin | `dev.openfeature.contrib.providers:flagd` 0.14.1 | RPC | LRU | disabled |
| checkout | Go | `github.com/open-feature/go-sdk-contrib/providers/flagd` v0.6.0 | RPC | LRU | disabled |
| product-catalog | Go | `github.com/open-feature/go-sdk-contrib/providers/flagd` v0.6.0 | RPC | LRU | disabled |
| payment | Node.js | `@openfeature/flagd-provider` 0.16.1 | RPC | LRU | disabled |
| cart | .NET | `OpenFeature.Providers.Flagd` 0.7.3 | RPC | none: this provider caches only when `FLAGD_CACHE=lru` | none, unchanged |
| recommendation | Python | `openfeature-provider-flagd` 0.5.2 | RPC | disabled since card D1 (the default is LRU) | disabled, unchanged |
| load-generator | Python | `openfeature-provider-ofrep` 0.3.0 | OFREP: one HTTP request to flagd per evaluation | none | none, unchanged |
| frontend, in the browser | TypeScript | `@openfeature/flagd-web-provider` 0.7.4 | reads the flags through the frontend proxy when the page loads | the page's own copy, for the life of the page | unchanged |

With the RPC resolver a provider asks flagd for each evaluation, caches the answers for static
flags (reason `STATIC`, no targeting rule), and keeps an event stream open to flagd. flagd sends a
`configuration_change` message on that stream when the flag file changes, and the provider then
drops the changed flags from its cache (flagd's provider specification, sections "Flag Evaluation
Caching" and "Stream Reconnection"). The cache is right only as long as the provider reads that
stream.

## Cause

The Go provider stops reading its event stream for good when it starts before flagd answers.

From the source of `providers/flagd` v0.6.0:

- `Provider.Init` waits at most `DeadlineMs` for the stream, 500 ms by default
  (`defaultInitDeadlineMs = 500` in `pkg/configuration.go`). If the first connection fails or the
  deadline passes, `Init` returns an error.
- Only a successful `Init` starts `handleEvents`, the goroutine that reads the service's event
  channel (`pkg/provider.go`).
- The service's stream goroutine keeps running after a failed `Init`, retries, and connects once
  flagd is up. Each message it gets is put on an event channel of capacity 1
  (`events: make(chan of.Event, 1)` in `pkg/service/rpc/service.go`). Nothing reads that channel.
  The first event fills it; at the next one `sendEvent` blocks for good, and from then on no
  `configuration_change` message is read and no cached flag is ever dropped.
- The SDK marks the provider as in error, but go-sdk v1.18.0 still sends evaluations to a provider
  in the error state (it stops only at `NotReadyState` and `FatalState`, `openfeature/client.go`).
  So every static flag is answered once by flagd and then from the cache, for the life of the pod.

What the lab's logs show for 2026-11-13, when the shop was installed (Kubernetes events in Loki):

| Time (UTC) | Event |
|---|---|
| 13:12:31 | checkout's first container starts while Kafka is not up yet; kubelet restarts it at 13:13:25 |
| 13:13:05 | product-catalog's fourth container starts (the first three waited for PostgreSQL) and sets its flagd provider |
| 13:13:07 | flagd's container starts |
| 13:13:08, 13:13:09 | flagd's readiness probe fails: nothing listens yet |
| 13:13:25 | checkout's second container starts and sets its flagd provider, with flagd up |

So product-catalog's provider started two seconds before flagd and failed its `Init`; checkout's
started twenty seconds after. That explains why the same code failed in one service and worked in
the other. The night's pause and the Calico restarts, the first guess, played no part.

The same fault was reproduced away from the lab on 2026-11-14 with flagd v0.16.0 (built with
`go install github.com/open-feature/flagd/flagd@v0.16.0`) and a 40-line Go program that uses go-sdk
v1.18.0 and the provider v0.6.0, the versions in product-catalog's `go.mod`. The program evaluates
one static flag every 500 ms; the flag file was switched four times, three seconds apart.

| Start order | `FLAGD_CACHE` | What the program saw |
|---|---|---|
| program first, flagd 3 s later | default (LRU) | `Init` failed (`connection refused`); after flagd came up the value was `false`, reason `CACHED`, through all four changes |
| program first, flagd 3 s later | `disabled` | each change within 0.5 s, reason `STATIC` |
| flagd first, then the program | default (LRU) | each change at once, with a `CONFIGURATION_CHANGED` event |
| flagd first, then the program; flagd stopped and started again mid-run | default (LRU) | after the restart the provider reconnected within 4 s and took the next changes |

An interrupted connection on its own does no harm: the provider sees the stream end, empties its
cache and connects again. A start before flagd is up does. The shop meets that whenever flagd and a
Go service start at the same time: a fresh install, `make reset` followed by `make lab`, an upgrade
that restarts every pod, or a node that comes back with both on it.

The other caching providers (Java and Node.js) were not seen to fail. They depend on the same
stream, and both keep a stream at most 10 minutes before they open a new one
(`FLAGD_STREAM_DEADLINE_MS`, default 600000, in the Java `Config.java` and the Node.js
`configuration.ts`). A stream that broke without either side noticing could therefore keep a stale
value for up to 10 minutes.

## Options

| Option | Result |
|---|---|
| 1. `FLAGD_CACHE=disabled` for every service whose provider caches | Every evaluation asks flagd, so a change applies at the next evaluation, whatever state the stream is in. One environment variable per service in the chart; no code and no image change. Costs one call to flagd per evaluation (see "Cost"). |
| 2. Raise `FLAGD_DEADLINE_MS` for the Go services | Helps only when flagd comes up within the new deadline. The same variable is the deadline of every evaluation call, and the defect is still there for a longer outage. |
| 3. A newer Go provider | Not a fix: v0.8.0, the newest tag on 2026-11-14, still starts `handleEvents` only after a successful `Init` (`pkg/provider.go` at `providers/flagd/v0.8.0`). It would also mean new images. |
| 4. The in-process resolver (`FLAGD_RESOLVER=in-process`) | The provider evaluates from a copy of the flag rules that a sync stream keeps current. A stuck stream would then leave every flag stale, not only the static ones. |
| 5. Make the Go services wait for flagd (an init container) | Covers the start of the pod only. It adds a template change for a defect in the provider. |

## Decision

Option 1. `FLAGD_CACHE: disabled` is set in the chart's values for ad, checkout, fraud-detection,
payment and product-catalog, as it already was for recommendation. Cart's provider does not cache
unless asked to, and the load generator and the browser do not use the RPC resolver, so they are
left as they are. The chart moved from 0.1.0 to 0.2.0.

## Cost

Cart already asked flagd on every evaluation. After the change fraud-detection asks for
`kafkaConsumerDead` on every turn of its poll loop (100 ms when the topic is quiet), ad asks for its
three flags on every request, and product-catalog asks for its lock flag every 10 seconds. flagd's
CPU use went from 0.0037 to 0.011 cores (limit 200m) and its memory stayed near 40 MiB (limit 75Mi);
the readings are in `acceptance-lab.md`.

## Measured on the lab

After the upgrade and a restart of the flagd pod, one flag per service reached the service without a
restart, 0.7 to 12.6 seconds after the switch. Each service applies a change at its next evaluation,
so the time depends on how often the service evaluates: product-catalog checks its lock flag every
10 seconds, and checkout and payment act on the next order. The table is in `acceptance-lab.md`.

## Sources

Read on 2026-11-14:

- flagd provider specification: https://github.com/open-feature/flagd/blob/main/docs/reference/specifications/providers.md
- Go provider v0.6.0: https://github.com/open-feature/go-sdk-contrib/tree/providers/flagd/v0.6.0/providers/flagd (`pkg/provider.go`, `pkg/configuration.go`, `pkg/service/rpc/service.go`, `pkg/service/rpc/retryCounter.go`)
- Go provider v0.8.0: https://github.com/open-feature/go-sdk-contrib/blob/providers/flagd/v0.8.0/providers/flagd/pkg/provider.go
- go-sdk v1.18.0: https://github.com/open-feature/go-sdk/blob/v1.18.0/openfeature/client.go
- Java provider 0.14.1: https://github.com/open-feature/java-sdk-contrib/tree/dev.openfeature.contrib.providers.flagd-v0.14.1/providers/flagd (`Config.java`, `FlagdOptions.java`)
- Node.js provider 0.16.1: https://github.com/open-feature/js-sdk-contrib/tree/flagd-provider-v0.16.1/libs/providers/flagd (`src/lib/configuration.ts`, `src/lib/service/grpc/grpc-service.ts`)
- .NET provider 0.7.3: https://github.com/open-feature/dotnet-sdk-contrib/blob/OpenFeature.Providers.Flagd-v0.7.3/src/OpenFeature.Providers.Flagd/FlagdConfig.cs
- Python provider 0.5.2: https://github.com/open-feature/python-sdk-contrib/blob/openfeature-provider-flagd/v0.5.2/providers/openfeature-provider-flagd/src/openfeature/contrib/provider/flagd/config.py
- Python OFREP provider 0.3.0: https://github.com/open-feature/python-sdk-contrib/blob/openfeature-provider-ofrep/v0.3.0/providers/openfeature-provider-ofrep/src/openfeature/contrib/provider/ofrep/__init__.py
- The versions in the shop: `lgtm/lab/demo/src/*/go.mod`, `build.gradle`, `build.gradle.kts`, `package.json`, `Directory.Packages.props`, `requirements.txt`.
