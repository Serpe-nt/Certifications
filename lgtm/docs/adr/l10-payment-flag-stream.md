# L10: payment's flag stream is no longer traced

Status: decided by worker L10 on 2026-11-15. The change is in payment's source, so it reaches the
lab with the images of shop version `3.1.0-lab.2`, which the demo workflow publishes after the
merge. The record of the lab is in `lgtm/lab/docs/acceptance-lab.md`.

## Context

On 2026-11-14 at 18:26 UTC Tempo's querier (limit 768Mi) was killed twice for memory while it
looked up one trace by its ID. Card L9 found that the trace was payment's flagd event stream: every
stream the provider opens to flagd joined the trace of the shop's first order after payment
started, and that trace grew for as long as the pod lived. A lookup by trace ID reads every block
that holds the trace, and after a day this one had spans in every block Tempo kept
(`lgtm/docs/adr/l9-flag-cache.md`, pull request 98).

What the lab showed on 2026-11-15 between 16:30 and 17:00 UTC (TraceQL searches with
`select(span:parentID)`, tenant `lab`; no trace was opened by its ID):

| Service | Where its `flagd.evaluation.v2.Service/EventStream` spans sit |
|---|---|
| ad, fraud-detection, recommendation | Each stream is a root span with a parent ID of zeros, so each stream is its own trace: the client span in the service and the server span in flagd, about 600 seconds long. A new trace begins every 10 minutes. |
| payment | Each stream's span is the child of the stream before it: `56239754aec28ee8` at 15:52:23, `cbde5deaac937204` at 16:02:28 with that span as its parent, `80bb1dc529c4b112` at 16:12:33 below that one, and so on. All of them are in trace `1b9843164d5423b88ba041cee6303b88`, shown as `<root span not yet received>`, which began when payment restarted at 23:03 UTC on 2026-11-14. |

No other span sat below a stream span (`{ name = "flagd.evaluation.v2.Service/EventStream" } >> { name != "flagd.evaluation.v2.Service/EventStream" }` over one hour returned nothing).

## Cause

Two things together.

1. `charge.js` called `OpenFeature.setProviderAndWait(flagProvider)` inside every charge. Only the
   first call starts the provider, and it runs in the context of the first charge request, so the
   first stream became a child of that request's server span.
2. The provider opens each new stream from the callback of the stream before. In
   `@openfeature/flagd-provider` 0.16.1, `GRPCService.listen` opens the stream with the deadline
   `streamDeadlineMs` (600000 ms by default, `FLAGD_STREAM_DEADLINE_MS`). When the deadline ends the
   stream, its `error` handler calls `handleError`, which calls `reconnect`, which calls `listen`
   again through `setTimeout` (`src/lib/service/grpc/grpc-service.ts`). OpenTelemetry's gRPC
   instrumentation for Node.js binds a streaming call's event emitter to the context of the call
   (`context.bind(context.active(), call)` in `patchResponseStreamEvents`, `clientUtils.ts`). So
   the `error` handler, the timer and the next stream all run with the old stream's span active,
   and the next stream becomes its child. The same handler ends the span with status error, since
   the stream ended with gRPC status 4, DEADLINE_EXCEEDED.

The Java agent (ad, fraud-detection) and Python's zero-code instrumentation (recommendation) start
each stream as a new root span, as the table shows. Cart (.NET), checkout and product-catalog (Go)
leave no stream spans in Tempo, and the frontend reads flags in the browser. Payment is the only
service whose streams chain.

Point 2 also means that starting the provider outside a request is not enough. Started at module
load, the first stream would be a root span, and every later stream its descendant: one trace
that again grows for the life of the pod, now with a root span.

## Options

| Option | Result |
|---|---|
| 1. Start payment's provider once at module load, in a context with tracing suppressed | No span for any stream, and the reconnects inherit the suppressed context, so none of the later streams is traced either. Evaluations (`ResolveFloat`, `ResolveBoolean`) run in the charge's context and are traced as before. Needs new images; flagd still records its own server span for each stream, as a trace of one span. |
| 2. Start the provider at module load under the root context only | The chain stays: the first stream is a root span and each later stream its child (point 2 of the cause). |
| 3. Drop the stream spans in the collector gateway (a `filter` processor on `span.name`) | Covers every service at once and needs no image. But module m09 step 3 teaches the gateway's traces pipeline processor by processor, "Processors 4 to 7" and the order of each, and module m10 step 8 converts that configuration to Alloy; both would become untrue, and this card may not change them. It also hides telemetry the shop really sends. |
| 4. Turn off the gRPC instrumentation in payment | Also removes payment's server span and its evaluation spans, which modules m13 and m14 read. |
| 5. Both 1 and 3 | 3 adds nothing once payment's streams no longer chain: the other services' streams are traces of two spans that end after 10 minutes. |

## Decision

Option 1. `charge.js` now calls

```js
context.with(suppressTracing(ROOT_CONTEXT), () => OpenFeature.setProvider(flagProvider));
```

once, when the module loads, and `charge` no longer calls `setProviderAndWait`. This is the start
the OpenFeature server SDK describes: register the provider once, then create clients and evaluate
(`setProvider` registers it without waiting, `setProviderAndWait` waits for it to be ready).
`suppressTracing` comes from `@opentelemetry/core` 2.11.0, now a dependency of payment; it was
already in the lock file as a development dependency. It sets a context key that the SDK's tracer
checks before it creates a span. The key is made with `Symbol.for`, so the Operator's
instrumentation in the image, which loads its own copy of the SDK, sees it too.

The shop's version goes from `3.1.0-lab.1` to `3.1.0-lab.2` and its chart from 0.2.0 to 0.3.0;
only payment's image changes in substance. The lab's collector gateway is not changed.

Two side effects:

- An order placed in the first moment after payment starts, before the provider is ready, gets
  the default value of each flag (off) instead of waiting. Before, the first order waited for the
  provider. If flagd does not answer at start, the SDK logs `Error during provider initialization:
  Error: Failed to connect before the deadline`, the provider keeps trying, and evaluations reach
  flagd once it answers.
- Payment's streams leave no span of payment's own. flagd still records a server span for each
  of them, a trace of one span.

## What a quiet shop shows

With every flag off, the error spans in Tempo are the streams of the providers that open a new
trace for each stream: ad, fraud-detection and recommendation, one trace each every 10 minutes,
with a client span of about 600 seconds and status error in the service and a server span in
flagd. They stay on purpose. Each of them is a trace of two spans that ends after 10 minutes, and
they show how a gRPC instrumentation records a long-lived stream that ends at its deadline.
Changing them would mean changing the Java agent or the Python instrumentation of three services
for no gain in safety. `lgtm/lab/docs/demo.md` says what a learner sees and how to leave them out
of a search.

## Proof off the lab

On 2026-11-15, on 127.0.0.1 only, flagd v0.16.0 was built with
`go install github.com/open-feature/flagd/flagd@v0.16.0` (the lab's flagd image is v0.16.0), and
payment ran from its own `package.json` and lock with
`node --require @opentelemetry/auto-instrumentations-node/register index.js`, the console span
exporter, `FLAGD_CACHE=disabled` as on the lab, and `FLAGD_STREAM_DEADLINE_MS=3000`, so a stream
ended every 3 seconds instead of every 10 minutes. Five charges were sent, 2 seconds apart.

| Code | Order | Spans of payment |
|---|---|---|
| before | flagd first | The first `EventStream` span's parent was the first charge's server span `grpc.oteldemo.PaymentService/Charge`; the second stream's parent was the first stream, the third stream's the second. All three were in the first charge's trace. |
| after | flagd first | No `EventStream` span. Each charge was its own trace of four spans: `Charge`, `charge`, `ResolveFloat`, `ResolveBoolean`. flagd logged its three stream spans, each with a parent ID of zeros. |
| after | payment first, flagd 2 s later | The provider logged `Failed to connect before the deadline` and the process kept running. The five charges again had four spans each, every `Resolve` span with status unset, and no `EventStream` span. |
| after | flagd first, `paymentFailure` on at `100%` in the flag file | All five charges failed with `Payment request failed. Invalid token.`: the flag still reaches payment. |

The lab's image loads the OpenTelemetry Operator's Node.js instrumentation 0.78.0 instead of the
package `@opentelemetry/auto-instrumentations-node` 0.80.0 used here, so the proof that counts is
the lab's own (`acceptance-lab.md`).

## Sources

Read on 2026-11-15:

- flagd provider for Node.js 0.16.1, `src/lib/service/grpc/grpc-service.ts` and `src/lib/configuration.ts`: https://github.com/open-feature/js-sdk-contrib/tree/flagd-provider-v0.16.1/libs/providers/flagd
- OpenFeature server SDK 1.23.0, README, "Providers" (Awaitable and Synchronous) and "Usage": https://github.com/open-feature/js-sdk/blob/server-sdk-v1.23.0/packages/server/README.md
- `@opentelemetry/core` 2.11.0, `src/trace/suppress-tracing.ts`: https://github.com/open-telemetry/opentelemetry-js/blob/v2.11.0/packages/opentelemetry-core/src/trace/suppress-tracing.ts
- `@opentelemetry/api` 1.9.1, `src/context/context.ts` (`createContextKey` returns `Symbol.for(description)`, so that several copies of a package share a key): https://github.com/open-telemetry/opentelemetry-js/blob/api/v1.9.1/api/src/context/context.ts
- OpenTelemetry gRPC instrumentation for Node.js, `src/clientUtils.ts` (`patchResponseStreamEvents`), at commit `661cd84` of 2026-02-26: https://github.com/open-telemetry/opentelemetry-js/blob/661cd84a25b2cef68169e7ffa4b811cea7406a10/experimental/packages/opentelemetry-instrumentation-grpc/src/clientUtils.ts
- The lab's spans: Tempo searches of 2026-11-15 above; `lgtm/lab/demo/src/payment/package.json` and `Dockerfile` for the versions.
