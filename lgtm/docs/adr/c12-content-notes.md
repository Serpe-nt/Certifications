# C12: notes for the next content workers

Card C12, module m13 Tempo, 2026-11-14. What this module taught, on top of the earlier content notes.

## Reaching Tempo on the lab

- The lab's address `http://10.10.0.5` with `Host: tempo.lab.k8s.local` reaches the query frontend directly (the chart's gateway is off). It needs `X-Scope-OrgID`; a read without it answers 401 `no org id`, a write to the distributor without it 503 `no org id`. `lab|learn-m13` in the header queries both tenants.
- `/status/config`, `/status/runtime_config`, `/status/overrides/TENANT` and `/status/endpoints` answer on the same address without a tenant. Each component's own `/status/config` and `/metrics` answer through the API server proxy on port 3200: `kubectl get --raw /api/v1/namespaces/tempo/pods/POD:3200/proxy/status/config`.
- `/api/v2/traces/ID` for a trace that is not in your tenant answers 200 with `{"trace":{},"metrics":{}}`, not 404. `/api/traces/ID` answers 404.
- Search results drop the leading zeros of trace IDs (30 or 31 characters). Both forms resolve.
- Spans can be written as OTLP JSON with curl from a `curlimages/curl:8.23.0` pod to `tempo-distributor.tempo.svc:4318/v1/traces`. busybox `od` makes a random trace ID.

## Facts that surprised me

- TraceQL metrics work on the lab without any change; Tempo 3 serves recent data from the live-stores. The lab's query frontend limits a metrics query to 3 hours (`metrics.max_duration: 3h0m0s`); the docs give 24 hours as the default.
- The live-store consumer group is called `tempo-live-store` in the metrics, while the docs write `live-store`.
- The span metric buckets on the lab (0.002 to 4.1 seconds, 12 bounds) come from the default values of the chart `tempo-distributed` 3.27.0; Tempo's own default has 14 bounds to 16.384 seconds.
- `max_bytes_per_trace` (5,000,000) is enforced by the live-stores and block-builders, after the distributor has answered 200. A 6 MB trace of three spans with 1,000 attributes of 2,000 characters each is enough to see `tempo_discarded_spans_total{reason="trace_too_large"}`; attributes over 2,048 bytes would be truncated first.
- Unscoped `service.name` without a leading dot is a parse error; `span:kind = "server"` is a type error. A string compared with an integer attribute, a wrong scope or an unanchored regular expression just returns nothing.
- `{ checkout server span } > { ... }` misses cart and product-catalog: checkout calls them through the internal span `prepareOrderItemsAndShippingQuoteFromCart`. Use `>>`.
- Under `productCatalogLockContention`, the `LOCK TABLE` statement is its own trace (root product-catalog `astronomy-db`), about 0.5 ms long; the waiting SELECTs are 12 to 28 seconds; `frontend-proxy` (Envoy) ends the request with an error at 15 seconds.
- `tempo-querier` was OOMKilled twice at 18:26 UTC with the default 768Mi limit. Keep every search short.

## The fault flags on this lab

- The first run of `productCatalogLockContention` had no effect: flagd evaluated it as on, but product-catalog serves static flags from its flagd provider cache, which was stale about 30 hours after the pod started. One restart of product-catalog (the owner's go-ahead) fixed it at once. Check the effect within the first minute after a switch; the flag API is not proof. C13 saw checkout, also Go, pick up its static flags without a restart. Step 12 has a practice trap with the restart for learners.
- flagd's own metrics (`feature_flag_flagd_impression_total`, through the API server proxy on the flagd pod's port 8014) show which flags a service evaluates through flagd and which it serves from cache.
- The shared notes folder of the wave worked for coordinating flags: each card keeps one `cNN-flag-now.md` with its real times.

## Writing for the site

- In a step's `<Question>`, use Markdown backticks, not `<code>`: `check:content` refuses raw HTML in MDX (`raw-html`). In a question pool's YAML it is the other way round.
- A shell script inside a manifest belongs in a fenced block: there a backslash such as in `tr '\0' x` stays as written, while in a `<Cmd>` template string JavaScript would drop it.
