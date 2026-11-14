# The LGTM stack in the lab

How the observability stack and the shop are installed on the lab cluster, how the telemetry
flows, and how to change or upgrade one piece. One command installs everything after the
platform (`make platform`): `make lab`.

## What runs where

Every component is its own Helm release, installed by the playbook `ansible/playbooks/lab.yml`
with one tag per release. Each release has a folder under `helm/` with three files:
`values.yaml` (the real cluster), `values-kind.yaml` (a small overlay for the kind smoke test)
and `VERSION` (where the chart comes from, the chart version and the application version).

| Tag | Release | Namespace | What it is |
|---|---|---|---|
| `prometheus` | `kube-prometheus-stack` | `prom` | The Prometheus Operator, one Prometheus (3.13, the long-term support line), Alertmanager, node exporter, kube-state-metrics and the default rules. Prometheus keeps one day locally and remote-writes everything to Mimir as tenant `prom`. Its own Grafana is off; its dashboards go to the lab's Grafana, folder Kubernetes. |
| `mimir` | `mimir` | `mimir` | Mimir 3 in microservices mode with the ingest storage architecture: distributors write to the Kafka topic `mimir-ingest`, three ingesters read their partitions, blocks go to the bucket `mimir-blocks`. Multi-tenancy, native histograms, exemplars and OTLP are on, and the cardinality API is on for tenant `lab`; metrics are kept 7 days. |
| `loki` | `loki` | `loki` | Loki 3.7 in microservices mode (`deploymentMode: Distributed`): distributors, three ingesters, queriers, query-frontend and scheduler, index-gateway, compactor, ruler, two small memcached caches. TSDB index with schema v13, structured metadata, OTLP ingest, 48 hours of retention applied by the compactor. Query limits refuse a query that would read more than 500MB or span more than 49 hours (`lgtm/docs/adr/l8-query-limits-and-switches.md`). |
| `tempo` | `tempo` | `tempo` | Tempo 3 in microservices mode: distributors write to the Kafka topic `tempo-traces`, block-builders write blocks to `tempo-traces`, live-stores serve the last minutes, the backend scheduler and workers compact and apply the 48 hours of retention. The metrics-generator writes span metrics and service graphs to Mimir, tenant `lab`. |
| `otel-gateway` | `otel-gateway` | `otel` | The OpenTelemetry Collector (contrib) gateway, two replicas. The shop sends it OTLP; it adds Kubernetes attributes and `cluster="lgtm-lab"`, redacts payment data, and exports to Mimir, Loki and Tempo as tenant `lab`. It also scrapes the shop's PostgreSQL, Valkey, Kafka, NGINX and Envoy and its own metrics. |
| `alloy` | `k8s-monitoring` | `alloy` | Grafana Alloy through the k8s-monitoring chart: a DaemonSet that tails pod log files and one replica that watches Kubernetes events, both to Loki, tenant `lab`. Cluster metrics are off (the Prometheus stack has them). The shop namespace is left out of file-based logs because its services already send their logs over OTLP. |
| `grafana` | `grafana` | `grafana` | Grafana 13 with the data sources of the lab contract and the links between them; dashboards from ConfigMaps; the admin password in Secret `grafana/grafana-admin`. |
| `glue` | `lab-glue` | `lab-tools` | Our own chart (`charts/lab-glue`): the Gateway API routes, a RED dashboard per shop service, a dashboard for the collector gateway, and the switch for the check-token beacon (off until card D2). |
| `shop` | `shop` | `shop` | The trimmed OpenTelemetry Demo (`demo/chart`, card D1), pulling `ghcr.io/serpe-nt/lgtm-demo:3.1.0-lab.1-<service>`, sending OTLP to `otel-gateway.otel.svc`. |

The platform (card L2) provides the StorageClass, the S3 store with Secret `lab-s3` in `mimir`,
`loki` and `tempo`, the Kafka cluster `telemetry` and the Gateway `lab`; see `platform.md`.

## How the telemetry flows

```
shop services --OTLP gRPC/HTTP--> otel-gateway.otel.svc:4317/4318
    otel-gateway --OTLP HTTP /otlp (tenant lab)--> mimir-gateway.mimir.svc --> distributor --> Kafka --> ingesters --> S3
    otel-gateway --OTLP HTTP /otlp (tenant lab)--> loki-gateway.loki.svc   --> distributor --> ingesters --> S3
    otel-gateway --OTLP gRPC (tenant lab)-------> tempo-distributor.tempo.svc:4317 --> Kafka --> block-builders --> S3
                                                                                      Kafka --> live-stores (recent traces)
                                                                                      Kafka --> metrics-generator
    metrics-generator --remote write (tenant lab)--> mimir-gateway: traces_spanmetrics_*, traces_service_graph_*
pod log files, Kubernetes events --Alloy (tenant lab)--> loki-gateway /loki/api/v1/push
kube-state-metrics, node exporter, kubelet, ... --Prometheus remote write (tenant prom)--> mimir-gateway /api/v1/push
Grafana --> mimir-gateway /prometheus (tenants lab and prom), loki-gateway, tempo-query-frontend:3200,
            prom-prometheus:9090, prom-alertmanager:9093
```

- Tenants come from the `X-Scope-OrgID` header. `lab` holds the shop, Alloy's logs and Tempo's
  span metrics; `prom` holds what Prometheus remote-writes. No series reaches one tenant by two
  routes. Per-tenant limits are in Mimir's `runtimeConfig` (`helm/mimir/values.yaml`).
- Every signal carries `cluster="lgtm-lab"`: the gateway adds the resource attribute `cluster`,
  which Mimir promotes to a label and Loki indexes; Tempo's metrics-generator, Prometheus and
  Alloy add it as an external label.
- `service.name` becomes the label `service_name` in Mimir (promoted resource attribute) and in
  Loki (default index label). Tempo's span metrics carry both `service` (Tempo's own name) and
  `service_name`.
- OTLP metric names get the Prometheus suffixes (`_total`, `_seconds`, ...), as Prometheus's own
  OTLP receiver does by default.
- Each of the two gateway replicas scrapes the shop's data stores, so those metrics exist once per
  replica, told apart by the `instance` label (the replica's pod name).

## Moving between signals in Grafana

| From | To | How it is wired |
|---|---|---|
| A latency panel | the trace | Exemplars: data source `mimir`, `exemplarTraceIdDestinations` for the labels `traceID` (Tempo's span metrics) and `trace_id` (OTLP metrics), both to `tempo`. The RED dashboards query `traces_spanmetrics_latency_bucket` with exemplars on. |
| A trace | its logs | Data source `tempo`, trace to logs: `{service_name="<span's service.name>"} \| trace_id="<trace id>"` on `loki`. |
| A trace | its metrics | Data source `tempo`, trace to metrics: request rate and p95 latency from the span metrics on `mimir`. Service graph from `traces_service_graph_*`. |
| A log line | its trace | Data source `loki`, derived field `TraceID` on the structured metadata `trace_id`, linking to `tempo`. |

Data source UIDs: `mimir` (tenant `lab`), `mimir-prom` (tenant `prom`), `loki`, `tempo`,
`prometheus`, `alertmanager`. Module m14 takes these links apart and rebuilds them.

## Addresses

All through the Gateway `lab`, `http://<name>.lab.k8s.local`: `grafana`, `prometheus`,
`alertmanager`, `mimir`, `loki`, `tempo`, `alloy`, `otlp` (from `lab-glue`), `shop`, `flags`,
`loadgen` (from the shop chart). `longhorn` and `s3` come from the platform. Mimir, Loki and
Tempo want the header `X-Scope-OrgID`. `make lab` ends by printing them with the lab seed.

## Commands

From `lgtm/lab` in WSL, after `make venv` once:

| Command | Does |
|---|---|
| `make lab` | Install or upgrade every release, in dependency order. Creates the Grafana password and the lab seed the first time, and prints the addresses, the seed and where the password is. |
| `make lab TAGS=loki` | Install or upgrade one release (tags: `prometheus`, `mimir`, `loki`, `tempo`, `otel-gateway`, `alloy`, `grafana`, `glue`, `shop`). |
| `make status` | Helm releases, pods that are not running, the addresses and the seed. |
| `make reset` | Uninstall the releases, delete their volumes and empty the six buckets. Keeps the cluster, the platform, the Grafana password and the lab seed. Kafka still holds what its retention keeps (a day, or 640 MiB per partition, whichever comes first), which Mimir and Tempo read again after the next `make lab`. |
| `make lab-check` | The smoke test, `tests/lab/smoke.sh`: every signal arrives, and one shop request can be followed from a metric to a trace to a log. |
| `make lab-lint` | yamllint, helm lint, and every release rendered for both profiles, checked against the Kubernetes 1.35 and CRD schemas, with requests and limits on every container. |
| `make demo-<target>` | The shop's own targets (`demo-build`, `demo-smoke`, `demo-chart-lint`, `demo-kind-test`, ...), forwarded to `demo/Makefile`. |

The kubeconfig is `LAB_KUBECONFIG`, by default `~/.kube/lgtm-lab.config`; the playbook refuses
`~/.kube/config`. The Grafana password, once: `kubectl --kubeconfig ~/.kube/lgtm-lab.config -n
grafana get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d`.

## Upgrading one component

1. Look up the new chart version in the chart's repository index (the `repository` in
   `helm/<release>/VERSION`) and read the chart's changelog or upgrade notes between the two
   versions. Read the application's release notes too: for example Loki 4.0 removes simple
   scalable mode and BoltDB, Tempo 3 removed the ingester and the compactor.
2. Change `version` and `app_version` in `helm/<release>/VERSION`, and the image tag in
   `values.yaml` if the lab overrides it (Mimir, the collector gateway, Prometheus).
3. `make lab-lint`: it renders the release with the new chart for both profiles and checks it.
4. `make lab TAGS=<tag>`: Helm upgrades only that release and waits for its pods.
5. `make lab-check`.

A chart that lives in this repository (`shop`, `lab-glue`) is upgraded when its `Chart.yaml`
version changes; bump it with every change, because the playbook compares chart version and values
to decide whether to upgrade.

## The kind smoke test

The kind profile installs the same releases with one replica of each component and small
volumes. Endpoints, tenants, data source UIDs, Kafka topics, buckets and routes are the same as on
the real cluster.

```bash
make venv collections lab-tools
make lab-kind-up
make lab LAB_PROFILE=kind LAB_KUBECONFIG=$PWD/.bin/lgtm-l3.kubeconfig
make lab-check LAB_PROFILE=kind LAB_KUBECONFIG=$PWD/.bin/lgtm-l3.kubeconfig
make lab-kind-down
```

`tests/lab/kind-up.sh` creates the kind cluster `lgtm-l3` (gateway on 127.0.0.1:28080) and stands
in for the platform: Envoy Gateway with Gateway `lab`, one RustFS pod with the six buckets and
Secret `lab-s3`, one Kafka node behind `telemetry-kafka-bootstrap.kafka.svc:9092`, and kind's
StorageClass `standard`. Grafana is then at `http://grafana.lab.k8s.local:28080` once that name
points at 127.0.0.1 (or with `curl -H 'Host: grafana.lab.k8s.local' http://127.0.0.1:28080`).

What the kind profile cannot prove: the three-ingester Mimir and Loki rings with replication
factor 3, Tempo with two Kafka partitions, two gateway replicas, Longhorn volumes, the HTTPS
listener, and the memory budget of `budget.md`, which is for the real cluster.
