# D2: the workshop service's stack and the shape of its solutions

Date: 2026-11-10. Card: D2 (beacon and workshop service).

## Context

The plan (overview, section 3, item 7) asks for one small Python service with no telemetry, which the learner instruments by hand in modules m07 and m08 and with a Prometheus client library in module m03. It runs on the learner's PC, in Docker or with plain Python, and sends OTLP to the lab's collector gateway. The lessons will say "make it look like `solutions/03-...`", so the solutions must be small, readable steps.

## Decisions

1. **Flask and requests.** Both have official OpenTelemetry instrumentation libraries, so zero-code instrumentation (m07 step 7) gives server spans, client spans to the shop and, with the `sqlite3` instrumentation, database spans without touching the code. Flask's own server is enough for one learner; it keeps the service one file and one command.
2. **Python 3.14** (`python:3.14.10-slim-trixie`, by digest). Every pinned package installs on it without conflict (`pip check`).
3. **Pinned packages** (PyPI, 2026-11-10): `flask` 3.1.3, `requests` 2.34.2, `opentelemetry-distro` 0.66b2, `opentelemetry-exporter-otlp-proto-http` 1.45.2 (it brings `opentelemetry-sdk` 1.45.2), `opentelemetry-instrumentation-flask`, `-requests`, `-sqlite3` and `-logging` 0.66b2, `prometheus-client` 0.26.0. The instrumentation packages are listed by hand rather than installed by `opentelemetry-bootstrap -a install`, so `requirements.txt` shows exactly what the agent uses; a lesson can still show the bootstrap command.
4. **Logs in Python changed in 1.40.** Since OpenTelemetry Python 1.40.0 the logging handler lives in `opentelemetry-instrumentation-logging` and is on by default (`OTEL_PYTHON_LOG_AUTO_INSTRUMENTATION`); before 1.40.0 it was in the SDK, off by default, and switched on with `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true`, which older tutorials still show. The Python logs SDK is still marked "Development" on the status table. Solutions 01 to 04 therefore set `OTEL_LOGS_EXPORTER=none` and do not install the logging package; solution 05 installs it and switches the logs exporter on.
5. **Stable semantic conventions.** The Python instrumentations 0.66b2 still write the old HTTP and database attribute names unless `OTEL_SEMCONV_STABILITY_OPT_IN` names the domain (`opentelemetry-instrumentation/_semconv.py`). Every OpenTelemetry solution sets `OTEL_SEMCONV_STABILITY_OPT_IN=http,database`, so the spans carry `http.request.method`, `url.full`, `server.address` and `db.system.name`, as module m07 step 12 teaches, and solution 03's hand-made client span uses the same names.
6. **One signal at a time.** Each solution's `workshop.env` switches on only what its name says: 01 to 03 send traces, 04 adds metrics, 05 adds logs. The Prometheus variant sends no OTLP and serves `/metrics`.
7. **Cumulative OpenTelemetry solutions, a separate Prometheus branch.** `01-zero-code` to `05-logs` each build on the one before, so `diff solutions/02-manual-spans/app.py solutions/03-propagation/app.py` is the lesson. `prometheus-client` builds on the starting point, because module m03 comes before the OpenTelemetry modules.
8. **Propagation by hand in 03.** Zero-code instrumentation already propagates the context through `requests`, so solution 03 switches the `requests` instrumentation off (`OTEL_PYTHON_DISABLED_INSTRUMENTATIONS=requests`) and injects W3C Trace Context and Baggage itself, in a client span of its own. The learner sees what the instrumentation library did for them, and the trace continues in the shop.
9. **One launcher for both ways of running.** `run.py` (standard library only) reads `lab.env`, then the variant's `workshop.env`, then the user's environment, creates a virtual environment in the variant's folder on the first run, and starts the variant's command. The Docker image runs the same launcher, so the two ways cannot drift apart.
10. **Lab names in containers.** Docker Desktop containers do not use the Windows name resolution rule for `.k8s.local`, so `compose.yaml` maps `otlp.lab.k8s.local` and `shop.lab.k8s.local` to the load balancer address (`LAB_LB_ADDRESS`, default 10.10.0.5) with `extra_hosts`.
11. **Default port 8000** on 127.0.0.1. The owner's saa-plan app holds 8080, 8091 and 8181; `WORKSHOP_PORT` changes it.

## Sources

- Python agent configuration, including the logging variables and the 1.40.0 change: https://opentelemetry.io/docs/zero-code/python/configuration/
- Logs auto-instrumentation example (the `opentelemetry-instrumentation-logging` package): https://opentelemetry.io/docs/zero-code/python/logs-example/
- Status of the Python SDK per signal: https://opentelemetry.io/docs/languages/
- The semantic-convention switch, in the instrumentation package 0.66b2: https://github.com/open-telemetry/opentelemetry-python-contrib/blob/main/opentelemetry-instrumentation/src/opentelemetry/instrumentation/_semconv.py (read from the installed package on 2026-11-10)
- Package versions: https://pypi.org/pypi/<package>/json for each package above, read on 2026-11-10
- Image digest: `docker buildx imagetools inspect python:3.14-slim`, run on 2026-11-10
