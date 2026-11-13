# C7: notes for the next content workers

Card C7, module m08, 2026-11-13. What this module learned, on top of `c0-content-notes.md` and `c1-content-notes.md`.

## The lab, seen from the workshop service

- The collector gateway's `k8s_attributes` processor associates pods by the connection too, and it extracts `service.namespace`, `service.name`, `service.version` and `service.instance.id`. Telemetry from the PC arrives through the Envoy gateway pod, so workshop series carry `k8s_namespace_name="gateway"` and the Envoy pod's name, and a resource without `service.namespace` gets `service.namespace=gateway` (job `gateway/workshop`). Module m09 may want to show this; module m14 should know it before it filters by `k8s_*` labels.
- Mimir 3.2 rejects delta OTLP metrics unless `otel_native_delta_ingestion` is on (it is not on the lab). Do not test delta temporality against the shared gateway: one rejected batch could drop other services' metrics too.
- Loki keeps `trace_id`, `span_id`, `severity_*`, scope and record attributes as structured metadata; the header `X-Loki-Response-Encoding-Flags: categorize-labels` on the query API shows which fields are stream labels. Keep Loki queries at 15 minutes or less.
- The shop's SDKs already export self-observability metrics (`otel_sdk_*`) to Mimir; product-catalog uses declarative configuration (`OTEL_CONFIG_FILE`, Go `otelconf`).

## The workshop service as a test bed

- Copy `lgtm/lab/workshop` to the scratchpad and run it there: `run.py` creates `.venv` inside the solution folder, and `.venv` is not git-ignored in the workshop folder.
- `run.py` lets your own environment win over `lab.env` and `workshop.env`, so every SDK variable can be tried without editing files. With `OTEL_EXPORTER_OTLP_PROTOCOL` empty, the agent picks its gRPC exporter, which the workshop does not install, and the service runs on without telemetry: a ready example of an SDK failing at initialization.
- `OTEL_PYTHON_SDK_INTERNAL_METRICS_ENABLED=true` with `OTEL_METRICS_EXPORTER=console` prints the SDK's own `otel.sdk.*` metrics, including `error.type` on failed exports. Pointing the endpoint at a closed port shows the retry warning and the dropped batch within ten seconds.
- On Windows the venv's launcher leaves a child `python.exe`; stop it by its command line (it contains the scratchpad path), not only by the port.

## Writing

- In MDX, a unit in braces such as `{checkout}` outside backticks is a JavaScript expression and breaks the build with "checkout is not defined". `check:content` does not catch it.
- In question YAML, values with `inject-java: "true"` or `Retry-After: 30` inside `<code>` still contain ": "; quote the whole value.
- The OpenTelemetry pages disagree about the Logs API: the specification now allows direct calls from applications, while the status page and the Python docs say end users do not call it. Say both, with their sources.
