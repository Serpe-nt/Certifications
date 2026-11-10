# The check-token beacon

Some lesson checks ask for a token that only the running lab can show. The site cannot reach the lab, so both sides compute the token from the lab seed: the site in the browser, and the beacon inside the lab, which publishes it as a log line, a metric and a span. The learner finds the token with LogQL, PromQL or TraceQL and pastes it into the step.

The rules are in `lgtm/docs/plan/02-lab-contract.md`, section "Check tokens". This page says what the beacon sends, where it lands and how to find a token.

## What it is

| Thing | Value |
|---|---|
| Source | `lgtm/lab/tools/beacon` (Go, OpenTelemetry Go SDK; why Go: `lgtm/docs/adr/d2-beacon-language.md`) |
| Image | `ghcr.io/serpe-nt/lgtm-beacon:<tag>`, tag in `lgtm/lab/tools/beacon/VERSION`, built by `.github/workflows/lgtm-beacon.yml` |
| Runs as | Deployment `beacon` in namespace `lab-tools`, from the `lab-glue` chart (`templates/beacon.yaml`), one replica |
| Reads | the lab seed from Secret `lab-tools/lab-seed`, key `seed` (made by the `lab_secrets` role) |
| Sends | OTLP over HTTP to `http://otel-gateway.otel.svc:4318`, every minute |
| Resource | `service.name=beacon`, `service.namespace=lab-tools`, `service.version=<tag>`; the gateway adds `cluster=lgtm-lab` |
| Health | `GET /healthz` on port 8080: 200 while it keeps publishing, 503 when the loop has stalled for three intervals; the body shows the tick count and the heap size |

## What it sends

A slot id is `<channel>-<module>-<n>`: channel `log`, `metric` or `span`, module `m00` to `m18`, n 1 to 9. That is 171 slots per channel. Once a minute the beacon sends, for every slot of its channel:

| Channel | What | Where the token is |
|---|---|---|
| `log` | one log record, severity INFO; body is a JSON line such as `{"msg":"beacon token","slot":"log-m12-3","payload":{"token":"3c7b30fb"}}`; attribute `slot` | `payload.token` in the body |
| `metric` | gauge `lab_beacon_value` with the attribute `slot`, one series per metric slot | the value: the decimal token, for example `966435` |
| `span` | one trace: root span `beacon.tick` (attribute `beacon.slot`) with one child span `beacon.slot` (attributes `beacon.slot` and `beacon.token`) | `beacon.token` on the child span |

The beacon writes only start, stop and error lines on its standard output, so Alloy's copy of the pod's output never holds a token.

## Where it lands

| Signal | Backend, Grafana data source | Names there |
|---|---|---|
| Logs | Loki, data source `loki` (tenant `lab`) | stream label `service_name="beacon"` (also `service_namespace="lab-tools"`, `cluster="lgtm-lab"`); `slot` is structured metadata, not a label |
| Metrics | Mimir, data source `mimir` (tenant `lab`) | `lab_beacon_value{slot="metric-m12-3", service_name="beacon", job="lab-tools/beacon", cluster="lgtm-lab"}` |
| Traces | Tempo, data source `tempo` (tenant `lab`) | `resource.service.name = "beacon"`, span names `beacon.tick` and `beacon.slot` |

## One query per channel that returns a token

The examples use the slots of the shared test vectors (`lgtm/learn/tests/fixtures/token-vectors.json`). With the seed `0123456789abcdef` they return `3c7b30fb`, `966435` and `73470561`. Run them in Grafana, Explore, with the data source named above.

LogQL (data source `loki`):

```logql
{service_name="beacon"} | slot="log-m12-3" | json | line_format "{{.payload_token}}"
```

`| slot="log-m12-3"` filters on the structured metadata; `| json` turns `payload.token` into the field `payload_token`; `line_format` shows only the token.

PromQL (data source `mimir`):

```promql
lab_beacon_value{slot="metric-m12-3"}
```

The value of the one series is the token.

TraceQL (data source `tempo`):

```traceql
{ resource.service.name = "beacon" && name = "beacon.slot" && span.beacon.slot = "span-m09-1" } | select(span.beacon.token)
```

`select` adds the token as a column in the result table.

A lesson does not have to use these queries: it chooses the skill (a label filter, a parser, a selector) and the beacon only publishes the token. A step uses a slot of its own module, and no slot is used twice (`lgtm/docs/plan/03-content-contract.md`).

## Switching it on

The chart's default is `beacon.enabled: false`. To switch it on in the lab, set in `lgtm/lab/helm/lab-glue/values.yaml`:

```yaml
beacon:
  enabled: true
```

and bump the chart version in `lgtm/lab/charts/lab-glue/Chart.yaml`, so the Helm role upgrades the release. The other values have working defaults:

| Value | Default | Meaning |
|---|---|---|
| `beacon.image`, `beacon.tag` | `ghcr.io/serpe-nt/lgtm-beacon`, `0.1.0` | registry and repository, then the tag |
| `beacon.pullPolicy` | `IfNotPresent` | |
| `beacon.pullSecrets` | `[]` | image pull Secrets in `lab-tools`, while the GHCR package is private |
| `beacon.seedSecret` | `lab-seed`, key `seed` | the Secret the playbook creates |
| `beacon.otlpEndpoint` | `http://otel-gateway.otel.svc:4318` | OTLP over HTTP |
| `beacon.interval` | `1m` | how often every token is published |
| `beacon.resources` | requests 10m CPU, 32Mi; limits 200m CPU, 64Mi | see below |

The image is pushed to GHCR when the workflow runs on `main`. A new GHCR package is private until the owner makes it public (overview, section 11, item 4); until then, set `beacon.pullSecrets`.

## Running it and how it behaves

- Memory: measured on kind (`test/kind-test.sh`, 2026-11-10): a working set of 8 to 11 MiB, and at most 11.3 MiB with the collector away for five minutes while the beacon published every 10 seconds, six times the lab's load. The limit is 64 MiB. The Go runtime keeps its heap under 90% of the memory limit (`BEACON_MEMORY_LIMIT`, from the Downward API).
- Gateway away: the exporters retry with back-off; the span and log queues hold at most 2048 records each and then drop new ones, so memory stays bounded and the pod is not restarted. When the gateway is back, the next minute's tokens arrive as usual. A dropped minute does not matter: the same tokens come again a minute later.
- Shutdown: on SIGTERM the beacon stops publishing and flushes what is queued for at most 10 seconds (the pod's grace period is 30 seconds).
- Changing the seed: the beacon reads the seed when it starts. After the Secret changes, restart it: `kubectl -n lab-tools rollout restart deployment/beacon`.
- Load on the stack: 171 log records, 171 series and 342 spans a minute.

## Testing it

From `lgtm/lab/tools/beacon`. The unit test needs Go 1.27 (on Windows or in CI); the kind test runs in WSL.

```bash
go test -v ./...                 # the token function against the six shared vectors
bash ../../demo/scripts/tools.sh # the pinned helm, kind, kubectl and kubeconform, into lgtm/lab/.bin
bash test/kind-test.sh           # kind cluster lgtm-d2 with a debug collector as otel-gateway.otel.svc
bash test/kind-test.sh delete
```

The kind test installs the chart's `beacon.yaml` with a debug-only collector that runs the gateway's span-name and redaction processors, checks the log, metric and span tokens for every seed of the shared vectors, takes the collector away for five minutes while the beacon publishes every 10 seconds, and checks the shutdown.
