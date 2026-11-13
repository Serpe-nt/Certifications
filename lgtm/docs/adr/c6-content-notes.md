# C6: notes for the next content workers

Card C6, module m07 OpenTelemetry: the model and tracing, 2026-11-13. What this module taught, on top of `c0-content-notes.md`, `c1-content-notes.md`, `c3-content-notes.md` and `c5-content-notes.md`.

## Reading traces without Grafana

- Tempo answers from Windows at `http://10.10.0.5` with `Host: tempo.lab.k8s.local` and `X-Scope-OrgID: lab`. `/api/search?q=<TraceQL>` finds traces, `/api/v2/traces/<id>` returns the whole trace as OTLP JSON with resources, scopes, span kinds, statuses, events and links. Span and trace IDs in that JSON are base64; decode them to hex before you compare them with a `traceparent`.
- `/api/search` without `start` and `end` only looks at recent data. Pass both, as Unix seconds, to search the last hours.
- TraceQL compares types strictly: `{ span.workshop.order.total_usd > 300 }` found nothing on a float attribute, `> 300.0` worked.
- `select(instrumentation:name, instrumentation:version)` shows the scope of each span. The scope is the easiest way to tell which library made a span.

## The gateway changes what the learner sees

- The collector gateway runs `set_semconv_span_name("1.43.0", "original_span_name")` on every span. HTTP, RPC, messaging and database spans arrive renamed by the conventions, with the old name in `original_span_name`: the workshop's SQLite spans become `sqlite`, product-catalog's `sql.conn.query` becomes `astronomy-db`, Envoy's `ingress` becomes `GET`, checkout's `orders publish` becomes `publish orders`. Write lessons with the names Tempo shows.
- Its Kubernetes attributes processor matches pods by the connection's IP. Telemetry from the PC (the workshop) arrives through the Envoy gateway, so it carries `k8s.pod.name` and `k8s.namespace.name=gateway` of the Envoy pod. Module m09 can use this as a real example of a wrong association.

## The workshop service on Windows

- `opentelemetry-instrument` replaces its process with `os.execl`. On Windows that starts a new process and the old one exits, so `python run.py` returns to the prompt at once while the service keeps running, and Ctrl+C does not stop it. m07 step 7 tells the learner to stop it with `Get-Process python | Where-Object Path -like '*\workshop\.venv\*' | Stop-Process`. The lab may want to change `run.py` so that it starts the agent the same way on every platform; that file belongs to the lab, not to a content card.
- Several sessions on one PC send the same `service.name="workshop"`. Filter your own traces by `span.server.port` when you test on another port.
- To show the effect of `OTEL_SEMCONV_STABILITY_OPT_IN` without the lab, run `opentelemetry-instrument` with `OTEL_TRACES_EXPORTER=console` on a two-line SQLite script: without the opt-in the sqlite3 instrumentation 0.66b2 sends `db.system` and `db.statement`, with `database` it sends `db.system.name` and `db.query.text`.

## The shop as a source of examples

- Checkout (Go) injects its context into Kafka record headers; fraud-detection (Java agent) starts a new trace with `receive orders` and a child `process orders` that links to checkout's `publish orders`. That is the messaging conventions' default, and the only Kafka consumer left in the trimmed shop.
- Envoy (`frontend-proxy`) has `telemetry.sdk.name=envoy`: a good example of a resource that is not from the OpenTelemetry SDK.
- Checkout sets its propagators in code (`otel.SetTextMapPropagator`), and the beacon sets its sampler (`AlwaysSample`) and batch limits in code: examples of SDK configuration in code for module m08.

## Status words in 2026

- `TraceIdRatioBased` is deprecated in the trace SDK specification in favour of `ProbabilitySampler` (Development); SDKs must keep it unchanged until at least January 1, 2027.
- The semantic convention page for exceptions on spans is marked Deprecated and points to exceptions in logs; instrumentations still emit span events by default.
- HTTP and database span conventions are Stable; messaging is Development (semantic conventions 1.45.0).

## The browser pane is shared

Several sessions can drive the same browser pane. Pass `tabId` on every call, and check `tabs_context` before clicking: in this run another session's tab became the active one in the middle of the quiz, and clicks stopped reaching this session's page.
