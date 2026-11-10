# Lab acceptance on the real cluster (card L4)

The log of the first run of `make platform` and `make lab` on the owner's Hyper-V cluster: each
command, its decisive output, and every defect found with its error text and its fix. Times are
UTC. All commands ran from `lgtm/lab` in WSL with `KUBECONFIG=~/.kube/lgtm-lab.config`
(context `lgtm-lab`).

## The cluster before the run (2026-11-10, 14:45)

Seven nodes on Kubernetes 1.35.10, containerd 2.2.1, Calico 3.31.4 and nothing else:

| Node | vCPU | Memory (`free -m`, total) | Longhorn disk |
|---|---|---|---|
| master1 to master3 | 2 | 1902 MiB | none |
| worker1 to worker4 | 4 | 7940 MiB | `/dev/sdc`, 40 GiB, at `/var/lib/longhorn` |

`vm/nodes.yml` says 6 vCPU per worker; the running VMs have 4 (`nproc`), as
`lgtm/docs/plan/00-overview.md` section 7 notes. Memory available before anything was installed:
master1 424 MiB, master2 867 MiB, master3 849 MiB; each worker about 7.2 GiB.

Tools: `make venv` (4 min 48 s on `/mnt/c`), `make collections`, `make lab-tools`.

## Platform

### First `make platform` (14:50 to 15:03)

```
PLAY RECAP
localhost : ok=27 changed=19 unreachable=0 failed=0 skipped=0 rescued=0 ignored=0
```

The play passed, but the cluster was not healthy behind it (defect 1).

### Defect 1: the first master ran out of memory

What was seen during and right after the first run:

- `kubectl top nodes`: master1 1638Mi (90%) and 1042m CPU (52%), master3 1638Mi (90%).
- On master1 (`free -m`, `/proc/pressure/memory`, `uptime`):
  `Mem: 1902 total, 1901 used, 0 available`, `some avg10=98.57 avg60=98.25`,
  `load average: 65.48, 41.93, 19.14`. Then `kubectl get nodes`: `master1 NotReady`.
- `kube-apiserver` used about 880 MiB resident on every master (`ps -eo rss`): 880764 KiB on
  master1, 893524 on master2, 911196 on master3. etcd about 110 MiB, the controller manager
  about 110 MiB, the kubelet about 60 MiB.
- Leader elections failed: `kube-controller-manager` and `kube-scheduler` on master1 and master3,
  `tigera-operator` (5 restarts), `strimzi-cluster-operator`, `envoy-gateway`, `csi-attacher`
  restarted. The Strimzi log:
  `Exception occurred while acquiring lock 'LeaseLock: kafka - strimzi-cluster-operator ...'`.
  Logs of master1's pods could not be read:
  `Get "https://10.10.0.11:10250/containerLogs/...": net/http: TLS handshake timeout`.
- `make platform-check` failed on Kafka, because CoreDNS could not answer:
  `WARN Couldn't resolve server telemetry-kafka-bootstrap.kafka.svc:9092 from bootstrap.servers as DNS resolution failed for telemetry-kafka-bootstrap.kafka.svc`
  then `FAIL Kafka produce and consume failed`, and `FAIL pods not Ready in kafka: telemetry-dual-role-0`
  (Strimzi was rolling the pod after `Pod is unschedulable or is not starting`).

Cause: master1 is the only node when `make cluster` installs Calico, so every Deployment that
tolerates the control-plane taint landed there and stayed: both CoreDNS pods, the Tigera
operator, `calico-kube-controllers`, two `calico-apiserver` pods, `calico-typha`, `goldmane` and
`whisker`. With the API server at about 880 MiB, a 2 GB master has no room for them.

Fix: the new role `ansible/roles/platform_control_plane` runs first in `make platform` (tag
`control-plane`, profile `full` only). It gives CoreDNS, the Tigera operator and the Calico
Deployments a required node affinity `node-role.kubernetes.io/control-plane DoesNotExist`: for
CoreDNS and the operator as a patch of the Deployment, for Calico through the operator's own
override fields (`calicoKubeControllersDeployment` and `typhaDeployment` in the Installation,
`apiServerDeployment`, `goldmaneDeployment`, `whiskerDeployment`; see
https://docs.tigera.io/calico/3.31/reference/installation/api). The DaemonSets (`calico-node`,
`kube-proxy`, the Calico CSI driver) stay on every node.

```
make platform TAGS=control-plane
TASK [platform_control_plane : Keep the Calico control plane off the control-plane nodes]
changed: [localhost] => (item=Installation) (item=APIServer) (item=Goldmane) (item=Whisker)
TASK [platform_control_plane : Keep CoreDNS and the Tigera operator off the control-plane nodes]
changed: [localhost] => (item=kube-system/coredns) (item=tigera-operator/tigera-operator)
```

A minute later every Calico Deployment carried the affinity, the pods ran on the workers and
master1 was `Ready` again. Memory available on the masters afterwards: master1 684 MiB, master2
116 MiB, master3 184 MiB (`kubectl top nodes`: 66%, 87%, 82%). The masters remain short; see
`budget.md`.

### Defect 2: Longhorn could not schedule the lab's volumes

`kubectl -n longhorn-system get nodes.longhorn.io` after the first run, per worker disk:

```
NODE      PATH                RESERVED      MAX           SCHED
worker1   /var/lib/longhorn   12587070259   41956900864   26843545600
worker2   /var/lib/longhorn   12587070259   41956900864   16173236224
```

Longhorn keeps 30 percent of a default disk in reserve (setting
`storage-reserved-percentage-for-default-disk`, default 30), and with
`storageOverProvisioningPercentage: 100` a disk accepts replicas only up to its maximum minus the
reserve: 29.4 GB per worker, about 117 GB on four. The platform and the lab ask for about 155 GiB
with two copies each (`budget.md`). RustFS's 25 GiB volume had already taken 25 of the 29 GB on
worker1 and worker4. Source: https://longhorn.io/docs/1.13.0/references/settings/

Fix: `storageOverProvisioningPercentage: 200` in `helm/platform/longhorn/values.yaml`. The volumes
are thin, so a replica takes only what was written; `storageMinimalAvailablePercentage: 15` still
stops scheduling on a disk that is really full.

```
make platform TAGS=longhorn
localhost : ok=9 changed=1 ...
kubectl -n longhorn-system get settings.longhorn.io storage-over-provisioning-percentage
storage-over-provisioning-percentage   200     true
```

### `make platform-check` and the Longhorn checks (15:13)

```
PASS every pod in kafka is Ready
PASS every pod in longhorn-system is Ready
PASS volume pvc-ad534359-... on longhorn kept its data across pods
PASS Longhorn volume has 2 healthy replicas
PASS S3 test: six buckets, put, list, range read, multipart upload, delete
PASS HTTP route answers through 10.10.0.5:80 (NodePort 30080)
PASS HTTPS route answers through 10.10.0.5:443 (NodePort 30443) with a certificate from lab-ca
PASS a message went through telemetry-kafka-bootstrap.kafka.svc:9092 without authentication
PLATFORM CHECK PASSED (profile full)
```

The checks of `docs/platform.md`, "Checks on the real cluster":

```
kubectl get storageclass
longhorn (default)   driver.longhorn.io   Delete   Immediate   true
longhorn-static      driver.longhorn.io   Delete   Immediate   true
kubectl -n longhorn-system get nodes.longhorn.io
worker1..worker4   READY True   ALLOWSCHEDULING true   SCHEDULABLE True
kubectl -n longhorn-system get volumes.longhorn.io
RustFS (25 GiB) and the three Kafka volumes (5 GiB): attached, healthy
curl -H 'Host: longhorn.lab.k8s.local' http://10.10.0.5/   ->  200
```

`longhorn-static` is a second, non-default class that the Longhorn chart always creates.

### Second `make platform` (15:16 to 15:19)

```
PLAY RECAP
localhost : ok=29 changed=0 unreachable=0 failed=0 skipped=1 rescued=0 ignored=0
```

`make lint` and `make platform-lint` pass (`RENDER CHECK PASSED`).

## The VMs are resized, and the first restart

After the platform run the owner raised the masters to 4 GB and, to fit the PC's free memory,
lowered the workers to 6 GB (`vm/nodes.yml` now matches: masters 2 vCPU and 4 GB, workers 4 vCPU
and 6 GB). That meant stopping and starting every VM: the lab's first real restart.

```
kubectl get nodes -o custom-columns=N:.metadata.name,MEM:.status.capacity.memory,CPU:.status.capacity.cpu
master1..master3   4009268Ki   2
worker1..worker4   6066796Ki   4
kubectl get events -A --field-selector reason=Rebooted
master1..master3 rebooted at 15:57:10, worker1..worker4 at 15:57:30
```

The platform came back by itself, with nothing done by hand. Pods not Ready, sampled every 30
seconds:

```
15:59:28 5 not ready: kafka/telemetry-dual-role-0..2 (Unknown), telemetry-entity-operator (CrashLoopBackOff), s3/rustfs (Unknown)
16:00:29 4 not ready
16:01:00 2 not ready
16:01:30 1 not ready: kafka/telemetry-dual-role-1 (Running)
16:02:00 0 not ready: ALL READY
```

About five minutes from the reboot to every pod Ready. With 4 GB the masters used 1665 to
2057 MiB (43 to 53%) with the platform installed.

### Fitting the lab on 6 GB workers

Allocatable memory per worker is 5964396Ki (5.69 GiB), 22.75 GiB on four. Requests then: the
platform and the system pods 5.42 GiB, the LGTM releases and the shop 13.24 GiB (`budget.py`),
18.66 GiB in all, 82%. The owner accepts up to 90% use in the lab, so the only cut is where a
request was far above use: the Kafka nodes asked for 1 GiB each and used 451 to 475 MiB. Their
heap is now 512 MiB, request 768Mi, limit 1280Mi (`helm/platform/strimzi/kafka-cluster.yaml`;
`make platform TAGS=kafka`, and Strimzi rolled the three nodes one at a time). A first attempt
that also removed second replicas, the Loki chunks cache and the second collector gateway was
undone within the hour, because the lessons use them. Details: `budget.md` and
`lgtm/docs/adr/l4-fit-6gb-workers.md`.

## Lab

### First `make lab` (16:21 to 16:30)

```
PLAY RECAP
localhost : ok=28 changed=12 unreachable=0 failed=0 skipped=18 rescued=0 ignored=0
```

165 pods, all Ready; `checkout` restarted once while the shop's Kafka was starting. No pod was
Pending and no container was OOM-killed in the 40 minutes that followed (`kubectl top nodes` and
the containers' last termination reasons, sampled every minute): workers at 65 to 76% memory,
masters at 54 to 69%.

`make status` prints the release list and the addresses (`changed=0`).

### Defect 3: Tempo lost the traces of half its Kafka partitions

`make lab-check` passed 24 of 25 checks:

```
FAIL  no checkout PlaceOrder trace in the last 15 minutes
PASS  span metrics for 5 services
PASS  service graph with 5 edges
LAB CHECK FAILED: 1 check(s)
```

Tempo's search knew only 7 services (`/api/v2/search/tag/resource.service.name/values`), none of
them `checkout`, `payment`, `ad` or `recommendation`. The topic had one partition where Tempo
expects two:

```
kafka-topics.sh --describe --topic tempo-traces
Topic: tempo-traces  PartitionCount: 1  ReplicationFactor: 3
kubectl -n tempo logs deploy/tempo-distributor
level=error msg="failed to write to kafka" err="invalid record partitioning choice of 1 from 1 available" tenant=lab
kubectl -n tempo logs tempo-block-builder-0
level=error msg="consumeCycle failed" err="no partitions assigned"
kubectl -n tempo logs tempo-live-store-1
level=error msg="metric lag failed:" err="UNKNOWN_TOPIC_OR_PARTITION: This server does not host this topic-partition."
```

Cause: Tempo and Mimir rely on auto-creation for their topics (`auto_create_topic_enabled`).
Whichever client asks for the topic first creates it, and a consumer's metadata request creates
it with the broker's default of one partition. `mimir-ingest` got its six partitions by the order
of events; `tempo-traces` did not. On kind, Tempo runs with one partition, so it never showed.

Fix: `lab_release` creates a Strimzi `KafkaTopic` for a release that names the path of its Kafka
block (`kafka_topic` in `lab_mimir` and `lab_tempo`), with the topic name and partition count
read from the release's values, and waits for it to be Ready before the Helm release. `make reset`
deletes the two topics. Proof on the running lab:

```
make lab TAGS=mimir,tempo
TASK [lab_release : Create the Kafka topic of the release tempo]  changed
kubectl -n kafka get kafkatopic
mimir-ingest   telemetry   6   3   True
tempo-traces   telemetry   2   3   True
```

A minute later Tempo knew 13 services and `tempo-block-builder-1` consumed partition 1, and
`make lab-check` printed `trace 519e74ad... has spans from 8 services: cart checkout flagd
frontend frontend-proxy load-generator payment product-catalog` and `LAB CHECK PASSED`. The proof
from empty topics is the reset path below.

### Second `make lab`

```
PLAY RECAP
localhost : ok=25 changed=0 unreachable=0 failed=0 skipped=21 rescued=0 ignored=0
```

## The lab survives losing one pod

One pod was deleted at a time. Every 20 seconds the script sampled three counts over the last
minute, all through Grafana at `http://10.10.0.5`:

- span-metric samples in Mimir (`sum(count_over_time(traces_spanmetrics_calls_total[1m]))`),
  written by Tempo's metrics-generator through Mimir's Kafka ingest;
- log lines in Loki (`sum(count_over_time({cluster="lgtm-lab"}[1m]))`);
- traces in Tempo (a search for `{}`, capped at 500).

```
### delete mimir/mimir-ingester-2
17:14:23 mimir_samples_1m=324 loki_lines_1m=2913 tempo_traces_1m=500
deleted at 17:14:23
17:14:43 mimir_samples_1m=432 loki_lines_1m=2996 tempo_traces_1m=500
17:15:44 mimir_samples_1m=432 loki_lines_1m=2911 tempo_traces_1m=500
17:16:44 mimir_samples_1m=432 loki_lines_1m=3009 tempo_traces_1m=500
mimir-ingester-2 Ready again at 17:17:25

### delete loki/loki-ingester-1
17:07:49 loki_lines_1m=2885 tempo_traces_1m=500
deleted at 17:07:49
17:08:09 loki_lines_1m=3132
17:08:50 loki_lines_1m=2953
17:09:50 loki_lines_1m=2996
loki-ingester-1 Ready again at 17:10:51

### delete kafka/telemetry-dual-role-2
17:17:25 mimir_samples_1m=324 loki_lines_1m=2837 tempo_traces_1m=500
deleted at 17:17:25
17:17:45 mimir_samples_1m=432 loki_lines_1m=7483 tempo_traces_1m=500
17:18:46 mimir_samples_1m=432 loki_lines_1m=2669 tempo_traces_1m=500
17:19:46 mimir_samples_1m=432 loki_lines_1m=3006 tempo_traces_1m=500
telemetry-dual-role-2 Ready again at 17:20:27

### errors in the last 15 minutes
mimir distributor push errors: 0
loki distributor errors: 0
tempo distributor errors: 0
otel-gateway export failures: 0
```

No count dropped. The extra Loki lines during the Kafka drill are the brokers' own logs about the
lost member. A first run of the same drill, on `mimir-ingester-1` and `telemetry-dual-role-1`,
used a wrong Mimir query path in the sampling script; Loki and Tempo kept their counts there too,
and every distributor logged 0 errors.

## Through the front door

From WSL, `curl -H 'Host: <name>.lab.k8s.local' http://10.10.0.5<path>`:

```
grafana       /api/health                              200  {"database": "ok", "version": "13.3.0", ...
shop          /                                        200  text/html
flags         /                                        302  to http://flags.lab.k8s.local/feature
loadgen       /                                        302  to http://loadgen.lab.k8s.local/loadgen/
prometheus    /-/ready                                 200  Prometheus Server is Ready.
alertmanager  /-/ready                                 200  OK
mimir         /                                        200  OK
mimir         /prometheus/api/v1/query?query=count(up) 200  {"status":"success",...   (X-Scope-OrgID: prom)
loki          /                                        200  OK
loki          /loki/api/v1/labels                      200  {"status":"success",...   (X-Scope-OrgID: lab)
tempo         /ready                                   200  ready
tempo         /api/search?q=%7B%7D&limit=1             200  {"traces":[...            (X-Scope-OrgID: lab)
alloy         /-/ready                                 200  Alloy is ready.
otlp          /v1/logs (POST {})                       200  {"partialSuccess":{}}
longhorn      /                                        200  text/html
s3            /rustfs/console/                         200  text/html
grafana over HTTPS with --cacert lab-root-ca.crt       200
```

`http://s3.lab.k8s.local/` itself is the S3 API and answers 403 `AccessDenied` without keys.

## Reset path (17:20 to 17:34)

```
make reset
TASK [lab_reset : Uninstall the lab releases, the shop first]  changed: shop, lab-glue, grafana,
  k8s-monitoring, otel-gateway, tempo, loki, mimir, kube-prometheus-stack
TASK [lab_reset : Delete the releases' volumes]                 changed: shop, loki, mimir, prom
TASK [lab_reset : Delete the Kafka topics of the releases]      changed
TASK [lab_reset : Empty the lab buckets with a one-off Job in namespace mimir]  changed
localhost : ok=7 changed=5 unreachable=0 failed=0
pods left in the lab namespaces: 0
kubectl -n kafka get kafkatopic: No resources found in kafka namespace.
PVCs left: 3 in kafka, 1 in s3 (the platform's own)

make lab
localhost : ok=29 changed=11 unreachable=0 failed=0 skipped=35

make lab-check
PASS  trace 471e2d8d778046d1393d307c43997c4a has spans from 8 services: cart checkout flagd frontend frontend-proxy load-generator payment product-catalog
PASS  span metrics for 13 services
PASS  service graph with 29 edges
PASS  metric to trace: exemplar on traces_spanmetrics_latency_bucket opens trace e8dc9f583b7c3207e71f28b915e3f60f
PASS  log to trace: trace f43d8642b944f9e1a9e615708a09d669 of a checkout log line is in Tempo
PASS  trace to log: 4 checkout log lines for trace f43d8642b944f9e1a9e615708a09d669
LAB CHECK PASSED

make lab        (second run)
localhost : ok=29 changed=0 unreachable=0 failed=0 skipped=35
```

The reset, the new install, the check and the second run took 14 minutes together. `make lab`
created both topics from nothing, which proves the fix of defect 3 on a clean start.

## 30 minutes of load (17:29 to 18:01)

The load generator ran from the reset install on. Sampled every minute for 26 minutes, then
measured (`budget.md` has every number):

- No pod Pending, in a crash loop or evicted, and no container with `OOMKilled` as its last
  termination reason.
- Every pod Ready. Restarts since the reset install: `checkout` 2 and `product-catalog` 3, all
  within 45 seconds of their start at 17:29:42 (`checkout`: `panic: runtime error: invalid memory
  address or nil pointer dereference` before its Kafka producer was connected; `product-catalog`
  exited until PostgreSQL answered), none in the 31 minutes after. Every other restart count
  dates from the VM restart at 15:57.
- Workers 69 to 76% memory in use, 1.4 to 2.2 GiB available each, `/proc/pressure/memory` at 0;
  CPU 10 to 19%. Masters 59 to 71%; the API server 1220 to 1472 MiB.

Five pods used as much as or more than they request; their requests now follow the measurement
(Grafana, RustFS, the Kafka nodes, the shop's Kafka with a higher limit, the load generator).
Applied with `make platform TAGS=s3,kafka` (`changed=2`) and `make lab TAGS=grafana,shop`
(`changed=2`); `make platform-lint` and `make lab-lint` pass.

## Final state (18:10 to 18:16)

```
make platform   localhost : ok=29 changed=0 unreachable=0 failed=0 skipped=1
make lab        localhost : ok=29 changed=0 unreachable=0 failed=0 skipped=35
make lab-check  PASS  trace dc72e7c671d78c7501f2ccdc48a9d38f has spans from 8 services: cart checkout flagd frontend frontend-proxy load-generator payment product-catalog
                LAB CHECK PASSED
pods not Ready: none; containers last terminated by OOMKilled: 0
kubectl top nodes: masters 62 to 72%, workers 68 to 75%
```

## What stays unverified

- A run of `make platform` on a cluster with only Calico, with the two platform fixes in place
  from the start. The fixes were applied to the running cluster (`make platform TAGS=...`) and
  the full second run reports no changes, but the first full run had neither.
- `make cluster` on the resized VMs: the cluster was not rebuilt, only the VMs' memory changed.

## Second restart, with the whole lab (2026-11-10, 21:48)

The owner stopped the VMs in the evening and started them again. Every pod came back by itself:
reboot at 21:48:47, all Ready at 21:56:48, eight minutes. The last to become Ready were the two
Mimir distributors, once Kafka and the ingesters answered.

## The beacon (card step 8, 21:57 to 22:00)

Card D2's pull request is merged. The image `ghcr.io/serpe-nt/lgtm-beacon:0.1.0` pulls without
a secret (an anonymous request for its manifest answers 200). With `beacon.enabled: true` in
`helm/lab-glue/values.yaml` and `lab-glue` 0.2.0:

```
make lab TAGS=glue
changed: [localhost]
localhost : ok=9 changed=1 unreachable=0 failed=0
deployment "beacon" successfully rolled out      beacon-5c78788fdb-7lmp4  1/1 Running  worker3
```

The expected tokens were computed from the lab seed with HMAC-SHA256, as `tools/beacon/token.go`
and `learn/src/lib/token.ts` do. The same code gives the shared test vectors (seed
`0123456789abcdef`: `log-m12-3` `3c7b30fb`, `metric-m12-3` `966435`, `span-m09-1` `73470561`).
The lab's own tokens are not written here: they are the answers to the owner's lab checks.
Then the three queries of `beacon.md`, through Grafana at `http://10.10.0.5`, after two minutes:

| Channel | Query | Result |
|---|---|---|
| log | `{service_name="beacon"} \| slot="log-m12-3" \| json \| line_format "{{.payload_token}}"` | one distinct value, equal to the expected token |
| metric | `lab_beacon_value{slot="metric-m12-3"}` | 1 series (`job="lab-tools/beacon"`, `service_name="beacon"`, `cluster="lgtm-lab"`), value equal to the expected token |
| span | `{ resource.service.name = "beacon" && name = "beacon.slot" && span.beacon.slot = "span-m09-1" } \| select(span.beacon.token)` | three traces (root `beacon.tick`), `beacon.token` equal to the expected token in each |

`slot` is structured metadata in Loki, not a label, as the lab contract says:
`/loki/api/v1/labels` does not list `slot`; the stream labels of a beacon line are `cluster`,
`k8s_*`, `service_instance_id`, `service_name`, `service_namespace`; with
`X-Loki-Response-Encoding-Flags: categorize-labels` the line carries `"slot": "log-m12-3"` under
`structuredMetadata`. The line itself is
`{"msg":"beacon token","slot":"log-m12-3","payload":{"token":"..."}}`.

The beacon pod uses 8 MiB (`kubectl top`), within its 64Mi limit. `beacon.md` and the beacon
template needed no change; the queries are now also in `reference.md`.

## Lab step m02-s06 walked on the lab (22:05 to 22:15)

The eight actions of `learn/src/content/steps/m02/s06-one-request-three-signals.mdx`, as written,
in Grafana 13.3.0 in a browser, signed in as `admin`:

| Action | What the lab showed | Matches |
|---|---|---|
| 1. Open `Shop / checkout (RED)`, last 15 minutes | The dashboard opens (folder Shop); its default range is 30 minutes, so setting 15 is needed, as the step says | yes |
| 2. Read the three panels, all from Mimir | Rate, Errors and Duration from `mimir`, plus a fourth panel, "Logs of checkout", from Loki. Errors showed "No data" when no span had failed | partly: four panels; Errors was empty (fixed, below) |
| 3. Hover a highlighted star near p99, click **Query with Tempo** | Exemplars are drawn as green diamonds scattered across the latency range, not stars; the tooltip shows `traceID` and a **Query with Tempo** link | yes, except "stars" |
| 4. Trace opens in Explore, ID in the header; rows of checkout, cart, product-catalog, payment | Trace `5631eb2750421f808f7179c07b3c8b02`, root `load-generator user_checkout_multi`, 8 services, 162 spans. Rows name services `opentelemetry-demo/checkout` and so on; the checkout spans sit far down a long trace | yes; the service names carry the namespace |
| 5. Click a checkout span, find `service.name` in the resource attributes | `oteldemo.CheckoutService/PlaceOrder`, Resource attributes, Service: `service.name` `checkout` | yes |
| 6. Click **Logs for this span** | The span details offer **Related logs**, **Request rate** and **Latency p95**; there is no "Logs for this span". **Related logs** opens Loki beside the trace with `{service_name="checkout"} \| trace_id="5631eb..."`, 4 lines | yes, but the button is "Related logs" |
| 7. Expand a line: `trace_id` equals the copied ID and has an **Open trace** link | `trace_id` `5631eb2750421f808f7179c07b3c8b02`, the same ID. **Open trace** is not on the field: it is in a separate "Links" section, named after the derived field (`TraceID`, renamed below). It opens the same trace in Tempo | partly |
| 8. Paste the trace ID | 32 hexadecimal characters, matches the check's pattern | yes |

Fixed in the lab, applied with `make lab TAGS=grafana,glue` (`changed=2`, second run
`changed=0`, then `LAB CHECK PASSED`):

- The Errors panel of every shop RED dashboard now reads 0 when no span failed:
  `(sum(rate(...status_code="STATUS_CODE_ERROR"...)) or vector(0)) / sum(rate(...))`
  (`charts/lab-glue/dashboards/shop-service-red.json`, `lab-glue` 0.2.1).
- Loki's derived field is named `trace_id` instead of `TraceID` (`helm/grafana/values.yaml`), so
  the log details show the link as `trace_id` with **Open trace**.

For the content worker: "highlighted stars" are diamonds; "Logs for this span" is **Related
logs** in Grafana 13.3; the dashboard has a fourth (logs) panel; **Open trace** sits under
"Links" in the log details. Trace ids from Tempo's search API and from exemplar labels can
lose leading zeros (seen: a 31-character `traceID` label); the 32-character id in the trace
header is the one to paste.
