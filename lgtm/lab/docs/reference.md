# Lab reference

Everything you look up while working in the lab: addresses, sign-ins, namespaces, tenants, data
source UIDs and fault flags. Checked on the real cluster on 2026-11-10 (`acceptance-lab.md`).
`make status` prints the addresses and the lab seed at any time.

## Addresses

Every address is plain HTTP on port 80, through HAProxy on `lb` (10.10.0.5) and the Gateway `lab`.
HTTPS on port 443 works for the same names with a certificate from the lab CA (see "HTTPS" below).

| Address | What is behind it | Sign-in |
|---|---|---|
| http://grafana.lab.k8s.local | Grafana 13.3 (namespace `grafana`) | user `admin`, password in Secret `grafana/grafana-admin` |
| http://shop.lab.k8s.local | The shop's front end, through its frontend proxy (`shop`) | none |
| http://flags.lab.k8s.local | The flag screen (flagd UI) for the fault flags; `/` redirects to `/feature` (`shop`) | none |
| http://loadgen.lab.k8s.local | The load generator's screen (Locust); `/` redirects to `/loadgen/` (`shop`) | none |
| http://prometheus.lab.k8s.local | Prometheus of the Prometheus track (`prom`) | none |
| http://alertmanager.lab.k8s.local | Alertmanager (`prom`) | none |
| http://mimir.lab.k8s.local | Mimir's nginx gateway: `/prometheus/api/v1/...`, `/api/v1/push`, `/otlp/v1/metrics` (`mimir`) | header `X-Scope-OrgID: lab` or `prom` |
| http://loki.lab.k8s.local | Loki's nginx gateway: `/loki/api/v1/...`, `/otlp/v1/logs` (`loki`) | header `X-Scope-OrgID: lab` |
| http://tempo.lab.k8s.local | Tempo's query-frontend: `/api/search`, `/api/v2/traces/<id>` (`tempo`) | header `X-Scope-OrgID: lab` |
| http://alloy.lab.k8s.local | The Alloy screen of the event collector `alloy-singleton` (`alloy`) | none |
| http://otlp.lab.k8s.local | OTLP over HTTP into the collector gateway: `/v1/traces`, `/v1/metrics`, `/v1/logs` (`otel`) | none |
| http://longhorn.lab.k8s.local | The Longhorn screen: volumes, replicas, nodes (`longhorn-system`) | none |
| http://s3.lab.k8s.local/rustfs/console/ | The RustFS console of the S3 store (`s3`); `/` itself is the S3 API | access key and secret key of Secret `s3/lab-s3` |

Four to open first in a Windows browser, where the names resolve through the lab DNS:

1. http://grafana.lab.k8s.local: sign in as `admin`. Explore shows the data sources `mimir`, `loki`
   and `tempo` with data from the shop; the folder "Shop" holds one dashboard per service.
2. http://shop.lab.k8s.local: the astronomy shop; buy something, and your own trace appears in Tempo.
3. http://flags.lab.k8s.local: sixteen fault flags, all off.
4. http://longhorn.lab.k8s.local: every volume `Healthy` with two replicas.

### Secrets you need

```bash
export KUBECONFIG=~/.kube/lgtm-lab.config
# Grafana's admin password
kubectl -n grafana get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d; echo
# The lab seed for the site's settings (16 hex characters)
kubectl -n lab-tools get secret lab-seed -o jsonpath='{.data.seed}' | base64 -d; echo
# The S3 keys for the RustFS console
kubectl -n s3 get secret lab-s3 -o go-template='{{.data.access_key | base64decode}}{{"\n"}}{{.data.secret_key | base64decode}}{{"\n"}}'
```

The password and the seed are made by the first `make lab` and never change afterwards, not even
with `make reset`. The S3 keys are made by the first `make platform`.

### From WSL

Windows resolves `*.lab.k8s.local` through the lab DNS on `lb`; WSL does not. Either send the
name in a `Host:` header:

```bash
curl -H 'Host: grafana.lab.k8s.local' http://10.10.0.5/api/health
curl -H 'Host: loki.lab.k8s.local' -H 'X-Scope-OrgID: lab' http://10.10.0.5/loki/api/v1/labels
```

or add this one line to `/etc/hosts` in WSL (by hand, with sudo; the lab never edits it):

```
10.10.0.5 grafana.lab.k8s.local shop.lab.k8s.local flags.lab.k8s.local loadgen.lab.k8s.local prometheus.lab.k8s.local alertmanager.lab.k8s.local mimir.lab.k8s.local loki.lab.k8s.local tempo.lab.k8s.local alloy.lab.k8s.local otlp.lab.k8s.local longhorn.lab.k8s.local s3.lab.k8s.local
```

### HTTPS

```bash
kubectl -n cert-manager get secret lab-root-ca -o go-template='{{index .data "ca.crt" | base64decode}}' > lab-root-ca.crt
curl --cacert lab-root-ca.crt --resolve grafana.lab.k8s.local:443:10.10.0.5 https://grafana.lab.k8s.local/api/health
```

Import `lab-root-ca.crt` into the Windows certificate store (Trusted Root Certification
Authorities, current user) if you want the browser to trust the lab's HTTPS names.

## Inside the cluster

| Name | Address |
|---|---|
| OTLP into the collector gateway | `otel-gateway.otel.svc:4317` (gRPC), `:4318` (HTTP) |
| Mimir write and read | `mimir-gateway.mimir.svc` (port 80) |
| Loki write and read | `loki-gateway.loki.svc` (port 80) |
| Tempo OTLP in | `tempo-distributor.tempo.svc:4317` and `:4318` |
| Tempo queries | `tempo-query-frontend.tempo.svc:3200` |
| Kafka | `telemetry-kafka-bootstrap.kafka.svc:9092`, plain text, no authentication; topics `mimir-ingest` (6 partitions) and `tempo-traces` (2), replication factor 3 |
| S3 store | `rustfs-svc.s3.svc:9000`, plain HTTP, path style, region `us-east-1`; buckets `mimir-blocks`, `mimir-ruler`, `mimir-alertmanager`, `loki-chunks`, `loki-ruler`, `tempo-traces` |

## Namespaces

| Namespace | Holds |
|---|---|
| `kube-system` | the control plane, CoreDNS, kube-proxy, metrics-server |
| `calico-system`, `tigera-operator` | Calico and its operator |
| `longhorn-system` | Longhorn (StorageClass `longhorn`, two replicas per volume) |
| `s3` | RustFS, the S3 store |
| `gateway` | Envoy Gateway and the Gateway `lab` |
| `cert-manager` | cert-manager and the ClusterIssuer `lab-ca` |
| `kafka` | Strimzi and the Kafka cluster `telemetry` |
| `mimir`, `loki`, `tempo`, `grafana` | one component each |
| `otel` | the OpenTelemetry Collector gateway `otel-gateway` |
| `alloy` | the k8s-monitoring chart: `alloy-logs` (pod logs, one per node), `alloy-singleton` (events) |
| `prom` | kube-prometheus-stack: Prometheus, Alertmanager, the operator, kube-state-metrics, node exporter |
| `shop` | the shop, its Kafka, PostgreSQL and Valkey, flagd, the load generator |
| `lab-tools` | the lab seed Secret and the check-token beacon |

## Tenants

| Tenant | Holds | Written by |
|---|---|---|
| `lab` | the shop's metrics, logs and traces; pod logs and Kubernetes events; span metrics and service graphs | the collector gateway, Alloy, Tempo's metrics-generator |
| `prom` | Kubernetes and node metrics of the Prometheus track | Prometheus `remote_write` |

Module m17 adds `team-a` and `team-b`. Per-tenant limits are in `helm/mimir/values.yaml`
(`runtimeConfig.overrides`). Every signal carries `cluster="lgtm-lab"`, and `service.name`
appears as the label `service_name`.

## Check tokens

The beacon (`beacon.md`, namespace `lab-tools`) publishes, once a minute, a token for every slot
`<channel>-<module>-<n>`. These three queries, run in Grafana's Explore, return the token of one
slot; they were checked on the lab cluster against the token computed from the lab seed
(`acceptance-lab.md`). Change the slot id to the one a step names.

| Channel | Data source | Query |
|---|---|---|
| log | `loki` | `{service_name="beacon"} \| slot="log-m12-3" \| json \| line_format "{{.payload_token}}"` |
| metric | `mimir` | `lab_beacon_value{slot="metric-m12-3"}` (the value is the token) |
| span | `tempo` | `{ resource.service.name = "beacon" && name = "beacon.slot" && span.beacon.slot = "span-m09-1" } \| select(span.beacon.token)` |

In Loki, `slot` is structured metadata, not a stream label: filter it after the stream selector,
as above, not inside `{...}`.

## Grafana data sources

| UID | Type | Points at |
|---|---|---|
| `mimir` | Prometheus | Mimir, tenant `lab` |
| `mimir-prom` | Prometheus | Mimir, tenant `prom` |
| `loki` | Loki | Loki, tenant `lab` |
| `tempo` | Tempo | Tempo, tenant `lab` |
| `prometheus` | Prometheus | the Prometheus server in `prom` |
| `alertmanager` | Alertmanager | Alertmanager in `prom` |

Trace to logs, trace to metrics, exemplars and the Loki derived field for trace ids are
provisioned; `make lab-check` follows a request from metric to trace to log through them.

## Fault flags

Switched on the flag screen (http://flags.lab.k8s.local). What each one breaks is in
`demo/TRIMMING.md`.

`adFailure`, `adHighCpu`, `adManualGc`, `cartFailure`, `cartMetricCardinalityOverflow`,
`emitRawPii`, `failedReadinessProbe`, `imageSlowLoad`, `kafkaConsumerDead`, `kafkaQueueProblems`,
`loadGeneratorFloodHomepage`, `paymentFailure`, `paymentUnreachable`, `productCatalogFailure`,
`productCatalogLockContention`, `recommendationCacheFailure`.

`cartFailure` and `failedReadinessProbe` take more than a minute to show; `productCatalogFailure`
is switched through its targeting rule, as the flag screen does it.

## Machines

| Machine | Address | vCPU | Memory |
|---|---|---|---|
| lb | 10.10.0.5 | 2 | 2 GB |
| master1 | 10.10.0.11 | 2 | 4 GB |
| worker1 to worker4 | 10.10.0.30 to 10.10.0.33 | 4 | 8 GB, plus a 40 GB Longhorn disk |

Sizes are in `vm/nodes.yml`; what the lab uses of them is in `budget.md`. SSH:
`ssh -i ~/.ssh/ansible vaka@10.10.0.30`. HAProxy statistics: http://10.10.0.5:8404/stats.
