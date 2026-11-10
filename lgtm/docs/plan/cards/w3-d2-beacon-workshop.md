# D2: beacon and workshop service

Wave 3. Model Opus 5.5, high effort. Runs beside L4 and C0.

## Owns

`lgtm/lab/tools/beacon/**`, `lgtm/lab/workshop/**`, `lgtm/lab/charts/lab-glue/templates/beacon.yaml`, the `beacon:` block of `lgtm/lab/charts/lab-glue/values.yaml`, `.github/workflows/lgtm-beacon.yml`, `lgtm/lab/docs/beacon.md`, `lgtm/lab/docs/workshop.md`, `lgtm/docs/adr/d2-*.md`.

Not yours, because L4 is changing them at the same time on the real cluster: every other file under `lgtm/lab/`, including `lgtm/lab/charts/lab-glue/Chart.yaml` (do not bump the chart version; L4 does it when it switches the beacon on), `lgtm/lab/helm/**`, the playbooks and the make fragments.

## Read first

- `lgtm/docs/plan/00-overview.md` (section 3, items 6 and 7), `02-lab-contract.md` (above all "Check tokens", "Telemetry flow", "Addresses in the browser", "Images"), `cards/README.md`
- `lgtm/learn/src/lib/token.ts` and `lgtm/learn/tests/fixtures/token-vectors.json`: the site's side of the token algorithm and its six test vectors
- `lgtm/lab/charts/lab-glue/templates/beacon.yaml` and the `beacon:` values L3 left as a placeholder; `lgtm/lab/ansible/roles/lab_secrets/tasks/main.yml` (how the lab seed Secret is made)
- `lgtm/lab/demo/scripts/kind-test.sh` and `tools.sh` (a kind test with a debug-only collector, and pinned tools) and `.github/workflows/lgtm-demo.yml` (the image workflow pattern)
- `lgtm/docs/plan/01-curriculum.md`, modules m03 (step 11), m07 and m08: the lessons the workshop service serves

## Goal

Two small things the lessons depend on: the beacon that publishes check tokens in all three signals, and the workshop service the learner instruments by hand.

## Build

### Beacon

1. A small service in `lgtm/lab/tools/beacon/` (choose the language in an ADR: a small static image and stable OpenTelemetry logs, metrics and traces support in that language's SDK today decide it). It reads the lab seed from the environment (the chart takes it from Secret `lab-tools/lab-seed`) and sends OTLP to the gateway.
2. For every slot id `<channel>-<module>-<n>` (channel `log`, `metric`, `span`; module `m00` to `m18`; n 1 to 9), once a minute, exactly as the lab contract says: the JSON log line with `slot` and `payload.token`, the gauge `lab_beacon_value{slot=...}`, and the trace with the root span `beacon.tick` and the child span `beacon.slot`. Resource attributes: `service.name=beacon`, `service.namespace=lab-tools`.
3. The token function must give the same values as the site: a unit test reads `lgtm/learn/tests/fixtures/token-vectors.json` and passes all six vectors. Do not copy the file; read it from its place.
4. Requests and limits, a health endpoint, no restarts when the gateway is away (queue and retry, bounded memory), a clean shutdown.
5. The image `ghcr.io/serpe-nt/lgtm-beacon:<version>` built by `.github/workflows/lgtm-beacon.yml` (build on pull requests, push on `main`, amd64), version in `lgtm/lab/tools/beacon/VERSION`.
6. Finish `lgtm/lab/charts/lab-glue/templates/beacon.yaml` and the `beacon:` values: a Deployment in `lab-tools`, the seed from the Secret, the OTLP endpoint value, off by default as L3 left it.
7. `lgtm/lab/docs/beacon.md`: what it emits and where to find each channel in Grafana, with one LogQL, one PromQL and one TraceQL query that return a token.

### Workshop service

8. `lgtm/lab/workshop/`: a small Python web service with a few endpoints that do real work a trace can show (an outgoing HTTP call to the shop, a local SQLite query, a loop that can be made slow, an error path), and no telemetry at all. It runs on the learner's PC with one command, in Docker and with plain Python, and a tiny load script calls it.
9. Beside it, `solutions/` with the finished state after each lesson group, each runnable: zero-code instrumentation, manual spans and attributes, context propagation to the shop, metrics, correlated logs, and a Prometheus client-library variant for the Prometheus module. The lessons will say "make it look like `solutions/03-...`"; keep the steps small and the diffs readable.
10. Telemetry goes to the lab's gateway over OTLP/HTTP at the `otlp` address of the lab contract. Check which route `lab-glue` gives it and write in `workshop.md` the exact environment variables for a learner on Windows (where the lab names resolve) and in WSL (where they do not unless a hosts line is added).
11. `lgtm/lab/docs/workshop.md`: how to run it, what each endpoint does, the solutions and which module uses which.

## Test

A kind cluster named `lgtm-d2` with a debug-only collector as `otel-gateway.otel.svc` and a seed Secret you create: the beacon's three channels show the right tokens for the test vectors' seeds. The workshop service and each solution start and answer; each solution's telemetry reaches a local debug collector. Host port 8097 only. Delete the cluster when done. You do not touch the real cluster.

## Done when

- [ ] The beacon's unit test passes the six shared vectors; on kind the debug collector shows a log, a metric and a span carrying the expected token for at least one slot of each channel.
- [ ] The beacon survives the collector being away for five minutes without growing past its memory limit.
- [ ] The image workflow passes on the pull request.
- [ ] `helm lint` and a schema check of `lab-glue` pass with the beacon on and off.
- [ ] The workshop service runs with one command in Docker and with Python; every solution runs and sends what its name says.
- [ ] `beacon.md`, `workshop.md` and the ADR exist.

## Report

The pull request link, the language choice in one line, the three queries that find a token, what L4 must set to switch the beacon on, and what was not tested.
