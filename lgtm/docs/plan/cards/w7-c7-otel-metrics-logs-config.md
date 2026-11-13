# C7: module m08 OpenTelemetry: metrics, logs and configuration

Wave 7. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C7.

## Owns

`lgtm/learn/src/content/modules/m08.yaml`, `lgtm/learn/src/content/steps/m08/**`, `lgtm/learn/src/content/questions/m08.yaml`, `lgtm/docs/verification/m08.md`.

## Read, on top of the template

- `lgtm/docs/plan/01-curriculum.md`, modules m07 and m08: C6 writes m07 beside you. You do not see its text; write m08 so that it stands on the outline of m07 (API and SDK, resources, spans, propagation, samplers, the SDK pipeline for traces) without repeating it.
- Module m03 s03 (Prometheus metric types) and m04 s07 and s08 (classic and native histograms) as merged: the learner comes to OpenTelemetry's metrics knowing Prometheus's. Say where the two models differ; do not teach Prometheus again.
- `lgtm/lab/docs/workshop.md` and `lgtm/lab/workshop/`: `solutions/04-metrics` and `05-logs` are the finished states of steps 4 and 6. `lgtm/lab/demo/src/` for step 12: the shop's services, to read how three of them are instrumented.
- `lgtm/learn/src/content/questions/mock-otca.yaml`, the questions with the tags `04-tags.md` gives m08, and `lgtm/docs/verification/mock-otca.md`: do not repeat them.
- opentelemetry.io: the metrics and logs concepts and specifications (instruments, the metrics SDK with readers, views, aggregation and temporality, exponential histograms, cardinality limits, the logs bridge API), OTLP, the SDK environment variables, declarative configuration, zero-code agents per language, the Operator's injection, the error handling principles of the specification, and the Python pages for the lab steps.

## The learner at this point

They have done m00 to m07: they have instrumented the workshop service for traces by hand and know the API, the SDK and its pipeline for spans. Metrics and logs in OpenTelemetry are new to them, and so is configuring an SDK without touching code.

## The module, 14 steps

Mapped to OTCA domain O2. Use the competency names exactly.

- Steps 1 to 3 are the metrics model: instruments (and which is synchronous, which observable), then the SDK: readers, views, aggregation, temporality, exponential histograms, cardinality limits. Temporality and its meaning for a Prometheus backend is the point candidates lose: give it room, with the lab's real path (OTLP to Mimir).
- Step 4 is the lab on the workshop service: a counter, an up-down counter and a histogram. The learner then finds each in Mimir and sees what name and what labels it got there.
- Steps 5 and 6 are logs: the bridge API (why there is no logging API for application code to call), then correlated logs from the workshop service, found in Loki with their trace id.
- Steps 7 to 9: OTLP over gRPC and HTTP (ports, paths, encodings), configuration by environment variables, declarative configuration. Name a status only as its page states it today; declarative configuration has moved fast.
- Step 10, composability: where a propagator, a processor, an exporter and a resource detector plug in. `<Flow>` or `<Layers>` fits.
- Step 11, agents and the Operator: the lab has no OpenTelemetry Operator, so this is a concept step; say what the Operator's Instrumentation resource does and what the learner already did by hand in m07 step 7.
- Step 12 reads the code of three shop services (one zero-code, one with an agent plus manual spans, one set up in code). Quote short pieces of the lab's own code by file path.
- Step 13, debugging an SDK: the console exporter and the SDK's own diagnostics, done on the workshop service.
- Step 14 is new in the curriculum: the error handling principles of the API and SDK (they must not throw into the application; what happens to telemetry that cannot be exported; OTLP's retryable and non-retryable responses, back-off). The OTCA mock pool has three questions on it (tag `otel-error-handling`).

Tags: the nine that `04-tags.md` gives m08, plus `otel-sdk-extension` (step 10), `otel-sdk-debugging` (step 13) and `instrumentation` (step 12).

## The lab in this wave

- The workshop service listens on port 8000 by default and C6 runs it too. Use the port your card gives you while you test, and write the lesson for the default.
- Evidence that a metric or a log line arrived can be read from Mimir's and Loki's APIs through the lab gateway, without Grafana. The Grafana actions of a step need the owner's sign-in in your session's browser pane: never type a password and never read the admin password from the cluster. If Grafana shows its sign-in page, say so in your session, go on, and log what you could not do as `lab-unverified`.
- You change nothing on the cluster, and you create nothing in it: the workers are close to their memory limit.
- Mimir and Tempo have a gap from 2026-11-11 17:57 UTC to 2026-11-12 12:02 UTC. Build nothing on that range.

## Yours

- Workshop port while testing: 8002. Site port: 8098. Local port-forwards: 18110 to 18119.
- Token slots, if a step needs one: `metric-m08-1` to `-9` and `log-m08-1` to `-9`.

## Done when, on top of the template

- [ ] The 14 steps exist (or the pull request explains each split, merge or drop), at least five of them with Practice.
- [ ] Steps 4, 6 and 13 were done on the workshop service from its starting state; the metrics were found in Mimir and the log lines in Loki, and the log has their decisive fields.
- [ ] The pool covers every competency of O2 that the module teaches, with at least three questions on error handling, and no question that repeats a mock question.
