# D1: trimmed demo

Wave 1. Model Opus 5.5, high effort. Runs beside S1 and L1; shares no file with them.

## Owns

`lgtm/lab/demo/**`, `lgtm/lab/docs/demo.md`, `.github/workflows/lgtm-demo.yml`, `lgtm/docs/adr/d1-*.md`

## Read first

- `lgtm/docs/plan/00-overview.md`, `02-lab-contract.md` (sections "Telemetry flow", "Fault flags", "Images", "Platform interfaces")
- `lgtm/docs/research/03-otel-demo.md`: the upstream demo at tag 3.1.0, service by service, with its flags, Compose layout, collector configuration and Windows caveats. Re-check anything you rely on against the tag itself.

## Goal

A smaller copy of the OpenTelemetry Demo shop that we build ourselves: about ten application services, the fault flags the lessons need, no bundled observability backends, a Helm chart of its own, images on GHCR.

## Build

1. **Copy the source** of the kept services from github.com/open-telemetry/opentelemetry-demo at tag `3.1.0` into `lgtm/lab/demo/src/`. Keep `LICENSE` (Apache-2.0) and add `NOTICE`. `UPSTREAM.md` records the tag, the commit and the date. `TRIMMING.md` records every service kept and removed, every code change with its reason, and the final flag list.
2. **Keep** (the planner's target; argue in the ADR if you change it): `frontend`, `frontend-proxy`, `image-provider`, `product-catalog` with PostgreSQL, `cart` with Valkey, `checkout`, `payment`, `recommendation` (the Python version at 3.1.0), `ad`, `fraud-detection` with Kafka, `load-generator`, `flagd` and the flag screen.
   **Remove**: `currency`, `email`, `quote`, `shipping`, `accounting`, `agent`, `chatbot`, `mcp`, the React Native app, the OpAMP server, the telemetry docs, profiling, and every bundled backend (Jaeger, Prometheus, OpenSearch, Grafana).
   Limits: at most 10 application services and 5 language runtimes. Between them the kept services must show zero-code instrumentation, library instrumentation set up in code, and manual spans; a gRPC call chain; a Kafka producer and consumer; a database and a cache.
3. **Cut the dependencies cleanly.** Where `checkout` or `frontend` called a removed service, replace the call with the smallest in-process stand-in (a fixed shipping price, one currency) and keep a span that says what happened, so traces still read well. Do not leave dead clients, environment variables or routes.
4. **Flags.** Keep every flag in the lab contract list whose service survives. Try to bring `cartMetricCardinalityOverflow` and `kafkaConsumerDead` over from upstream `main`; if either is more than a small change, leave it and say so. Remove flags of removed services.
5. **Telemetry out.** Services read `OTEL_EXPORTER_OTLP_ENDPOINT`. Nothing in this folder configures a real backend. Keep the upstream attribute names (`demo.*`) and resource attributes.
6. **Local smoke test.** `lgtm/lab/demo/compose.yaml` builds and runs the trimmed shop with one OpenTelemetry Collector that only has the `debug` exporter (mind the Windows `memory_limiter` problem in the research file). `make smoke` waits for health, lets the load generator run for two minutes, and fails unless traces, metrics and logs arrived from every kept service. This Compose file is for builds and tests only; the lab itself runs on Kubernetes.
7. **Helm chart** `lgtm/lab/demo/chart` (chart name `shop`): one template set for the services, the flag configuration as a ConfigMap, Kafka, PostgreSQL and Valkey as single instances with volumes, requests and limits on every container, Kubernetes resource attributes through the downward API, Gateway API routes for `shop`, `flags` and `loadgen` behind a values switch, values for registry, tag, storage class and OTLP endpoint (default `http://otel-gateway.otel.svc:4317`). `helm lint` clean; rendered manifests pass a schema check.
8. **Images.** Version in `lgtm/lab/demo/VERSION` as `3.1.0-lab.<n>`. `.github/workflows/lgtm-demo.yml` builds every service on pull requests (no push) and pushes `ghcr.io/serpe-nt/lgtm-demo:<version>-<service>` on `main`, amd64, with a build cache. All builds happen in Docker; nothing needs a language toolchain on the PC.
9. **Docs.** `lgtm/lab/docs/demo.md`: the service map as it is now, how a request flows, each flag and what it breaks, how to build and test.

## Test cluster

You may create a kind cluster named `lgtm-d1` on Docker Desktop to install the chart, with images loaded from the local build, and you delete it when done. Download `kind` and `helm` pinned and checksum-checked into `lgtm/lab/.bin/`.

## Done when

- [ ] `make smoke` passes locally; the pull request shows which services reported which signals.
- [ ] The chart installs on the kind cluster with every pod Ready and the shop page loading through a port-forward; the load generator produces orders end to end, including the Kafka consumer.
- [ ] Each kept flag was switched on once and its effect seen in the collector's debug output or the service logs; a table in `TRIMMING.md` records it.
- [ ] No reference to a removed service remains (search output in the pull request).
- [ ] The CI workflow builds all images on the pull request.
- [ ] `UPSTREAM.md`, `TRIMMING.md`, `NOTICE`, the ADR and `demo.md` exist; a table lists image sizes and memory limits, with their sum.

## Report

The pull request link, the kept service list with language and instrumentation style, the flag table, memory total, anything upstream that surprised you.
