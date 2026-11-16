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

## Kafka ran out of disk (2026-11-11 17:57 to 2026-11-12 12:02, card L5)

The lab was accepted after about a day of running. Its Kafka volumes filled a few hours later.

### What happened

- From 12:15 on 2026-11-11, Prometheus's remote write to Mimir (tenant `prom`) sent about 6,100
  samples per second. The Kafka volumes, which had grown about 90 MiB an hour until then, grew
  640 MiB an hour on each node (`kubelet_volume_stats_used_bytes` of `data-0-telemetry-dual-role-0`
  went from 1288 MiB at 12:15 to 4792 MiB at 17:45). Every node holds a replica of every
  partition, so each node grows by the whole write rate.
- Retention was by time only (`log.retention.hours: 24`), so nothing was deleted. At 17:55 the
  three 5 GiB volumes were 98.9% full.
- 17:57:39: brokers 0 and 1 logged `Error while appending records to mimir-ingest-1` and
  `Shutdown broker because all log dirs in /var/lib/kafka/data-0/kafka-log0 have failed`. From
  then on the three pods crash-looped (about 200 restarts each), each run ending with
  `java.io.IOException: No space left on device` in the KRaft thread and `Shutting down because
  we were unable to register with the controller quorum`. The `Kafka` resource was `NotReady`,
  reason `FatalProblem`.
- Mimir's distributors logged `failed to write to partitions [0 1 2]`, Tempo's `failed to write
  to kafka`, Prometheus `Failed to send batch, retrying ... context deadline exceeded`. Loki and
  Prometheus itself kept working.

### Repair (2026-11-12, 11:36 to 12:03)

1. `helm/platform/strimzi/kafka-cluster.yaml`: `storage_size: 10Gi` (was 5Gi),
   `log.retention.bytes: 671088640` (640 MiB per partition, new), `log.segment.bytes: 67108864`
   (64 MiB, was 128 MiB). Why these numbers: `lgtm/docs/adr/l5-kafka-disk.md`.
2. `make platform TAGS=kafka` (11:45 to 12:02, `ok=9 changed=1 failed=0`). Strimzi raised the three
   claims at 11:49:47; Longhorn grew the volumes and their filesystems while attached
   (`FileSystemResizeSuccessful` at 11:50:00, 11:50:24 and 11:50:51; `df`: 9.8G, 50% used).
3. The brokers still did not form a quorum: each restarted on its own back-off timer, ran about
   70 seconds alone and stopped. At 12:01:28 the three pods were deleted together
   (`kubectl -n kafka delete pod -l strimzi.io/cluster=telemetry,strimzi.io/pool-name=dual-role`);
   Strimzi recreated them, and the `Kafka` resource was `Ready` at 12:02:22. The playbook's
   wait ended at 12:02:26. This manual step is in `runbook.md`, "Kafka's disks are full".
4. At 12:02:41 the brokers began deleting old segments:
   `Deleting segment LogSegment(baseOffset=0, size=134204839, ...) due to log retention size
   671088640 breach. Log size after deletion will be 1346908842.` (node 1, 18 segments of
   `mimir-ingest` in the first check). The volumes went from 50% to 27% used.
5. A second `make platform TAGS=kafka` (12:06 to 12:08): `changed=0`.
6. `make platform TAGS=kafka` with the Longhorn RecurringJob `kafka-trim` (12:16 to 12:18,
   `changed=1`); one run started by hand at 12:19 took each Kafka replica from 6.1 GB to
   3.9 GB (`budget.md`, "Volumes and buckets").

### Ingest is back

```
Kafka telemetry                Ready since 12:02:22; topics mimir-ingest and tempo-traces Ready
Mimir tenant lab               max(timestamp(lab_beacon_value)) = 12:02:49
Mimir tenant prom              max(timestamp(up)) = 12:03:22, count(up) = 21
Tempo                          beacon.slot spans at 12:02:49
Prometheus remote write        12:05:54: 18 s behind, 5,740 samples/s sent, 0 failed, 0 retried
make lab-check (12:05:45)      LAB CHECK PASSED, including check 8: every volume under 85%
```

The gap: no metrics in Mimir (either tenant) and no traces in Tempo from 2026-11-11 17:57 to
2026-11-12 12:02 UTC, except a few `up` series of tenant `lab` from 04:10 onwards. Tenant `prom`
has samples again from 12:05 (the first 5-minute step after the repair); nothing older came back
from Prometheus's queue.

### The new check and alert

```
make lab-check LAB_VOLUME_FULL_RATIO=0.30
==> 8. No volume of the lab is fuller than 0.30 of its size
  FAIL  volume prom/prometheus-prom-prometheus-db-prometheus-prom-prometheus-0 is 37% full (threshold 30%)
LAB CHECK FAILED: 1 check(s)
```

`make lab TAGS=glue` (12:04 to 12:05, `changed=1`; the beacon was not restarted) installed the
PrometheusRule `lab-tools/lab-glue-volumes`; the lab's Prometheus loaded the rule
`LabVolumeFillingUp` (group `lab-volumes`) at 12:05, and at 12:21 it reported it `health: ok`,
`state: inactive` (no volume above 85%).

## Version 3: the lab rebuilt from nothing (2026-11-13, card L6)

The lab was destroyed and built again from `main` (commit 610f51c) on one control-plane node with
4 GB and four workers with 8 GB. The VM and cluster steps are in `acceptance-cluster.md`,
"Rebuild for version 3". Nothing needed fixing by hand.

```
make platform        12:50:12 to 13:01:10   localhost: ok=42 changed=21 failed=0
make platform-check  13:04:17               PLATFORM CHECK PASSED (profile full)
make lab             13:04:29 to 13:13:24   localhost: ok=32 changed=14 failed=0
make lab-check       13:15:29               LAB CHECK PASSED
make lab-check       14:17:01, after an hour  LAB CHECK PASSED
```

From the first `make cluster` to `LAB CHECK PASSED`: 32 minutes. RustFS runs
`docker.io/rustfs/rustfs:1.0.5` on worker2. `make status` printed the addresses and a new lab
seed (not recorded here).

Restarts: during the install, `longhorn-system/longhorn-manager` restarted once,
`shop/checkout` once and `shop/product-catalog` three times, while the services they depend on
were still starting. No pod restarted in the hour that followed.

### An hour of measurements (13:16 to 14:16)

Sampled every five minutes: `kubectl top nodes`, `kubectl top pods` summed per namespace, RustFS's
memory from the lab's Prometheus, the Kafka volumes, and the collector gateway's log.

| Node | Memory in use, first sample | Memory in use, range over the hour | Allocatable |
|---|---:|---:|---:|
| master1 | 2814 MiB (73%) | 2779 to 2899 MiB (72 to 75%) | 3.73 GiB |
| worker1 | 4751 MiB (60%) | 4751 to 5279 MiB (60 to 67%) | 7.66 GiB |
| worker2 | 4900 MiB (62%) | 4798 to 5141 MiB (61 to 65%) | 7.66 GiB |
| worker3 | 4300 MiB (54%) | 4300 to 4946 MiB (54 to 63%) | 7.66 GiB |
| worker4 | 5146 MiB (65%) | 5007 to 5416 MiB (63 to 69%) | 7.66 GiB |

Memory in use per namespace at 14:16, in MiB: kafka 2941, shop 2412, longhorn-system 1915,
kube-system 1830, calico-system 1228, mimir 1130, loki 862, tempo 796, prom 753, alloy 543,
grafana 427, otel 216, tigera-operator 127, gateway 117, s3 85, cert-manager 83, lab-tools 8.
Requests per node are in `budget.md`.

The Kafka volumes of `telemetry` went from 0.6% to 6.0% full in the hour (10 GiB each), about
550 MiB per hour on each node. Card L5's size limit (640 MiB per partition) stops them at about
57%, as before.

### The three defects of card L6, on the running lab

**The collector gateway scrapes the shop's Kafka.** The shop's Kafka now advertises
`PLAINTEXT://kafka.shop.svc:9092` (read from the StatefulSet). Neither gateway pod logged
`Error scraping metrics` from 13:16 to 14:16, and Mimir (tenant `lab`) has
`kafka_brokers` from both gateway pods, one series each (`instance` is the pod name).
Both pods did log 32 such lines between 13:10:43 and 13:13:13: `make lab` installs the gateway
before the shop, so until about 13:12 every shop address failed with `no such host`, and the
shop's Kafka refused connections until it had started at 13:13:01. Nothing after that.

**The object store's memory.** RustFS 1.0.5, `container_memory_rss` and
`container_memory_working_set_bytes` of container `rustfs`:

| Time | 13:16 | 13:26 | 13:36 | 13:46 | 13:56 | 14:06 | 14:16 |
|---|---:|---:|---:|---:|---:|---:|---:|
| RSS (MiB) | 26.6 | 33.0 | 35.9 | 42.1 | 41.9 | 42.9 | 43.6 |
| Working set (MiB) | 28.5 | 35.6 | 39.8 | 49.6 | 57.0 | 59.4 | 85.9 |

No restart. RustFS 1.0.4 used 239 to 430 MiB right after a restart on the old lab
(`lgtm/docs/adr/l6-rustfs-memory.md`). The working set grows with page cache as the buckets fill;
RSS rose 17 MiB in the hour and was level for the last half hour. The buckets are nearly empty
an hour after a rebuild, so this does not yet show the steady state: the check that counts is
RSS after a day or two of normal use, against the 1.0.4 pattern of a climb to the 1536Mi limit
within hours.

**The workshop on Windows.** Shown on the owner's PC in part 1 (pull request 67): with a real
console Ctrl+C event, `run.py solutions/01-zero-code` stays in the foreground while the service
runs, exits with 130 on Ctrl+C and leaves no process.
The owner's own run in a PowerShell window (step 11 of the rebuild list) had not been done when
this was written.

## Query limits and the cardinality API (2026-11-14, card L8)

Three lab changes the owner said yes to on 2026-11-14; reasons and sources in
`lgtm/docs/adr/l8-query-limits-and-switches.md`. Applied with the owner's go-ahead, one release
at a time.

### Loki's query limits

`make lab TAGS=loki`, 17:58:52 to 18:02:10 UTC, `changed=1`. The ingesters restarted one at a
time (ingester-2 17:59:37, ingester-1 18:00:27, ingester-0 18:01:17); the distributors, queriers,
query-frontend, scheduler, index-gateway, compactor and ruler restarted at 17:59 to 18:00. The
gateway and the two caches did not. Every pod ready, no restart count above 0.

`/config` afterwards (`curl -s -H 'Host: loki.lab.k8s.local' http://10.10.0.5/config`):

```
  max_concurrent: 4
  max_query_length: 2d1h
  max_query_parallelism: 8
  tsdb_max_query_parallelism: 16
  query_timeout: 1m
  max_query_bytes_read: 500MB
  max_querier_bytes_read: 150MB
```

The index's size of tenant `lab` at 18:03 UTC (`/loki/api/v1/index/stats`), which is what the
limit is checked against: every service (`{service_name=~".+"}`) 194 MB over 1 hour, 667 MB over
6 hours, 1,021 MB over 24 hours (the VMs were paused from 22:10 on 2026-11-13 to 11:47 UTC, so
the day holds about 15 hours of logs). Alloy's pod logs alone (`{namespace=~".+"}`) 33 MB over 1
hour and 134 MB over 6 hours.

A query that passes: `sum(count_over_time({namespace=~".+"} |= "error" [6h]))` at 18:02:42,
HTTP 200 in 0.21 s, `totalBytesProcessed` 193,729,909, 723 chunks, all from the chunk cache.

The refused query, at 18:03:31 UTC (module m12 step 15, action 5):

```
$ curl -s -w ' (HTTP %{http_code})' -G -H 'Host: loki.lab.k8s.local' -H 'X-Scope-OrgID: lab' http://10.10.0.5/loki/api/v1/query --data-urlencode 'query=sum(count_over_time({service_name=~".+"} |= "error" [24h]))'; echo
the query would read too many bytes (query: 973 MiB, limit: 500 MiB); consider adding more specific stream selectors or reduce the time range of the query (HTTP 400)
```

How Loki refused it: the answer came in 0.0096 s with status 400. The query frontend logged
`msg="executing query" type=instant`, asked the index for the size of `{service_name=~".+"}` over
the range (two `query_type=stats` lines on a querier, 2 to 3 ms each), then logged
`msg="Query exceeds limits" status=rejected limit_name=MaxQueryBytesRead limit_bytes="500 MiB"
resolved_bytes="973 MiB"`. No `metrics.go` line with `query_type=metric` followed, and neither
querier logged the metric query: it read no chunk. Loki reads `500MB` in the configuration as
500 MiB.

`make lab-check` at 18:02:26: `LAB CHECK PASSED`.

### Mimir's cardinality API for tenant `lab`

Before, at 17:38 UTC: `cardinality analysis is disabled for the tenant: lab`.

`make lab TAGS=mimir`, 18:03:56 to 18:04:47 UTC, `changed=1`. The rendered `checksum/config` of
the Mimir pods equals the running one, so no pod restarted (every pod kept its age of 28 hours,
ingester-1 its 5 hours). The runtime configuration showed `cardinality_analysis_enabled: true`
for tenant `lab` on every distributor, ingester, querier, query-frontend and ruler by 18:06:21,
about 90 seconds after the upgrade; until the last querier had it, `active_series` answered
`error merging partial responses ... cardinality analysis is disabled for the tenant: lab`.

The API's answers for tenant `lab`, 18:05 to 18:09 UTC:

- `label_names?limit=5`: `label_values_count_total` 1359, `label_names_count` 148; first
  `__name__` with 417 values, then `slot` 171, `span_name` 82, `le` 65, `device` 24.
- `label_values?label_names[]=__name__&count_method=active&limit=5`: `series_count_total` 5876;
  `traces_spanmetrics_latency_bucket` 1469, `traces_service_graph_request_client_seconds_bucket`
  270, `traces_service_graph_request_server_seconds_bucket` 270,
  `otel_sdk_exporter_operation_duration_seconds_bucket` 232, `lab_beacon_value` 171.
- `label_values` with `selector=traces_spanmetrics_latency_bucket`: `le` 13 values, `service_name`
  15 (top `frontend` 390), `span_kind` 5, `span_name` 82, `status_code` 2.
- `active_series?selector=traces_spanmetrics_latency_bucket{service_name="checkout"}`: 130 series.
- Tenant `prom`: `cardinality analysis is disabled for the tenant: prom`, as intended.

`make lab-check`, ending 18:06:34: `LAB CHECK PASSED`.

### Exemplars in Prometheus: none to store

At 17:40 UTC every kind of scrape target of the lab's Prometheus (8 ServiceMonitors in namespace
`prom`, no PodMonitor) was asked through `kubectl proxy` for OpenMetrics text and for protobuf:
Prometheus, Alertmanager, kube-state-metrics, node exporter, kubelet, cAdvisor, the API server,
CoreDNS and the operator. Only kube-state-metrics answered in OpenMetrics; no answer held an
exemplar (no ` # {` in any text, no trace id in any protobuf answer). Exemplar storage would keep
nothing, so it stays off and the Prometheus release was not changed. Tenant `prom` holds no
exemplars; tenant `lab` has them from the OpenTelemetry side (the exemplar PASS line of
`make lab-check`).

### Afterwards

`make lab` at 18:06:34 to 18:08:00 UTC: `ok=29 changed=0 unreachable=0 failed=0`.

## Fault flags reach every service (2026-11-14, card L9)

On 2026-11-14 a flag switched on at 18:40 UTC did not reach product-catalog until its pod was
restarted. The cause and the fix are in `lgtm/docs/adr/l9-flag-cache.md`: the Go flagd provider
stops reading flagd's event stream when it starts before flagd answers, and then serves its cached
values for the life of the pod. Since shop chart 0.2.0 every service whose provider caches runs
with `FLAGD_CACHE=disabled`, so every evaluation asks flagd. Applied with the owner's go-ahead.

### Upgrade

`make lab TAGS=shop`, 23:02:34 to 23:04:36 UTC, `changed=1`; release `shop` revision 2, chart
`shop-0.2.0`. The chart's version is in the labels of every pod template, so every pod of the shop
restarted, Kafka, PostgreSQL and Valkey included. As on a fresh install, product-catalog restarted
four times until PostgreSQL took connections and checkout once until Kafka did. Every pod was ready
at 23:04:38. `FLAGD_CACHE` read from the Deployments afterwards: `disabled` for ad, checkout,
fraud-detection, payment, product-catalog and recommendation; not set for cart, whose provider does
not cache unless it is set to `lru`.

### The interrupted connection

The flagd pod was deleted at 23:05:03 UTC (`kubectl -n shop delete pod <flagd pod>`); the
Deployment's new pod was ready at 23:05:25. This breaks the event stream of every service at once,
as a crash or a move of flagd to another node would, and it restarts nothing else. A
restarted flagd starts from the ConfigMap, so every flag was off afterwards. Twenty seconds later
flagd counted seven open event streams of the current protocol
(`http_server_active_requests{http_route="/flagd.evaluation.v2.Service/EventStream"} 7` on its
metrics port 8014: ad, cart, checkout, fraud-detection, payment, product-catalog, recommendation)
and one of the older protocol (the browser on the load generator). No service restarted.

The fault itself, a Go service that starts while flagd does not answer yet, was reproduced off the
lab (ADR, "Cause"). A restart of flagd alone does not bring it back: a provider that is already
running sees its stream end and connects again.

### One flag per service

One flag at a time, switched on through the flag screen's API (`POST /feature/api/write`), and
switched off as soon as its effect showed. Before each switch `GET /feature/api/read` showed every
flag off, and after each switch off it did again. The effect is the first log line, span or metric
that only the flag produces, found in Loki, Tempo or Mimir. No service was restarted between the
upgrade and the end of this table.

| Service | Flag (variant) | On | Off | First effect | After |
|---|---|---|---|---|---|
| product-catalog | `productCatalogLockContention` (on) | 23:05:53 | 23:06:03 | log `lock contention scenario active` at 23:06:02.551 | 9.6 s |
| checkout | `emitRawPii` (on) | 23:06:30 | 23:07:26 | `PlaceOrder` span with `demo.payment.card_number` (masked by the gateway) and `user.hash`, at 23:06:42.618 | 12.6 s |
| payment | `emitRawPii` (on), the same window | 23:06:30 | 23:07:26 | `charge` span with `demo.payment.card_number`, at 23:06:42.631 | 12.6 s |
| ad | `adManualGc` (on) | 23:08:28 | 23:08:41 | log `Triggering a manual garbage collection` at 23:08:36.868 | 8.9 s |
| fraud-detection | `kafkaConsumerDead` (on) | 23:09:11 | 23:09:15 | log `FeatureFlag 'kafkaConsumerDead' is enabled, unsubscribing from 'orders'` at 23:09:11.672; `is disabled, re-subscribing` at 23:09:15.679 | 0.7 s |
| cart | `cartMetricCardinalityOverflow` (on) | 23:09:42 | 23:10:19 | `demo_cart_get_cart_latency_seconds` with a `demo_cart_trace_id` label in Mimir at 23:10:19 (cart exports metrics periodically); the earliest of those 31 trace ids is a `GetCart` span at 23:09:43.282 | 1.3 s |
| recommendation | `recommendationCacheFailure` (on) | 23:10:52 | 23:10:55 | log `get_product_list: cache ...` at 23:10:52.886 | 0.9 s |
| load-generator | `loadGeneratorFloodHomepage` (on) | 23:11:26 | 23:11:35 | log `User flooding homepage 100 times` at 23:11:33.403 | 7.4 s |
| frontend, in the browser | `imageSlowLoad` (5sec) | 23:12:00 | 23:12:16 | Envoy access log of a `/images/products/` request with response flag `DI` (delay injected), started at 23:12:07.456 | 7.5 s |

Each service applies a change at its next evaluation. product-catalog checks its lock flag every 10
seconds; checkout and payment check theirs on each order, and the first order after the switch came
12 seconds later; ad checks on each ad request. So a flag reaches a service of this shop within
about 15 seconds of the switch, and the browser at its next page load.

The Tempo searches looked at the start of each matching span. The start of the trace is earlier: a
load-generator checkout trace begins 20 to 40 seconds before its `PlaceOrder` span.

### Afterwards

Every flag off at 23:14:07 (`GET /feature/api/read`). `make lab-check` 23:12:32 to 23:12:39:
`LAB CHECK PASSED`. `make lab` 23:12:39 to 23:13:47: `ok=29 changed=0 unreachable=0 failed=0`.

flagd's cost (Prometheus, `rate(container_cpu_usage_seconds_total[10m])` and
`container_memory_working_set_bytes` of the container `flagd`): 0.0037 CPU cores and 41 MiB at
22:55 UTC, before the change; 0.011 cores and 39 MiB at 23:15 UTC, after it. The limits are 200m
and 75Mi.

## An order's trace holds only its own spans (2026-11-15, card L10)

Until shop version `3.1.0-lab.2`, payment's flagd event streams chained into one trace that grew for
the life of the pod, and a lookup of that trace killed Tempo's querier on 2026-11-14. The cause and
the fix are in `lgtm/docs/adr/l10-payment-flag-stream.md`: payment now starts its flagd provider
once, with tracing suppressed. Applied with the owner's go-ahead. Every Tempo reading below is a
search, tenant `lab`, or a lookup by ID of a normal order; the old trace was never opened.

### Before

At 18:15:45 UTC payment ran `ghcr.io/serpe-nt/lgtm-demo:3.1.0-lab.1-payment`, and Tempo's querier
used 41Mi with 2 restarts, both from 2026-11-14. Payment's stream spans each had the stream before
as parent, all in trace `1b9843164d5423b88ba041cee6303b88`: for example `5c9ff49e799e1ab6` at
17:33:13, `0ade832d9b7c5086` at 17:43:18 as its child, and the last one, `72165432e4aa483b`, from
18:03:28 to 18:13:28.

### Upgrade

`make lab TAGS=shop` from `main` (`98d684e`), 18:16:05 to 18:17:24 UTC, `changed=1`; release
`shop` revision 3, chart `shop-0.3.0`, app version `3.1.0-lab.2`. Every pod of the shop restarted,
as with card L9; checkout restarted once and product-catalog three times until Kafka and PostgreSQL
took connections. Payment's container started at 18:16:49, flagd's at 18:16:53. Every flag was off
afterwards (`GET /feature/api/read`: 16 times `"defaultVariant":"off"`). `make lab-check` 18:19:38:
`LAB CHECK PASSED`. Cards C15 and C16 were told before the upgrade and when the shop was back.

The stream that payment had open at the restart ended with the pod and was not exported, so the old
trace's last span is `72165432e4aa483b`, ended at 18:13:28. With a retention of 48 hours, and a
compacted block kept one more hour, it leaves Tempo between about 18:15 and 20:15 UTC on 2026-11-17.

### The first order after the upgrade

Payment's first charge was at 18:17:10, trace `9c9b39a0c4e79d872401766966185224`. Under the old
code, this is the trace every later stream would have joined. Looked up by its ID:

| Time (UTC) | Lookup | Trace | Querier memory before, 15 s after |
|---|---|---|---|
| 18:20:16 | HTTP 200 in 0.029 s | 96 spans from 18:17:10.724 to 18:17:10.937; no `EventStream` span; payment's spans: `oteldemo.PaymentService/Charge`, `charge`, `ResolveFloat`, `ResolveBoolean`, `tcp.connect` | 65Mi, 67Mi |
| 18:48:00, 30 minutes after the upgrade | HTTP 200 in 0.129 s | the same: 96 spans, same first and last time, no `EventStream` span | 184Mi, 201Mi |

A fresh order at 18:44:39, trace `0beec1c9c0b263ce2d74fab76bb794c7`, looked up by ID at 18:48:16:
HTTP 200 in 0.024 s, 77 spans within 32 ms from 18:44:39.647, no `EventStream` span; querier 201Mi
before and after. The querier's restart count stayed at 2 throughout. Between 18:20 and 18:48 its memory rose
from 67Mi to 184Mi while other cards ran their own queries; the limit is 768Mi.

Card C16 ran its value changes and failure drills from 18:33 to 19:02 UTC, inside this window: Mimir's
overrides, a roll of Mimir's queriers, one Kafka broker, and the object store at zero from 18:54:29
to 18:57:29. Each was taken back with `make lab-check` passing. None touched the shop or Tempo's
querier, and the searches below found every stream trace expected in the window. `make lab` below
ran after C16 had restored its Mimir change and before the object store drill.

### What a quiet shop shows

TraceQL searches from 18:17:30 to 18:48, every flag off:

| Search | Result |
|---|---|
| `{ resource.service.name = "payment" && name = "flagd.evaluation.v2.Service/EventStream" }` | nothing |
| `{ resource.service.name = "payment" && status = error }` | nothing |
| `{ status = error && name != "flagd.evaluation.v2.Service/EventStream" }` | nothing |
| `{ name = "flagd.evaluation.v2.Service/EventStream" } >> { name != "flagd.evaluation.v2.Service/EventStream" }` | nothing |
| `{ name = "flagd.evaluation.v2.Service/EventStream" } \| select(resource.service.name, span:parentID, span:status)` | 13 traces: for each of ad, fraud-detection and recommendation one trace at about 18:17, 18:27 and 18:37, each of two 600-second spans, the service's client span with parent `0000000000000000` and status error and flagd's server span below it; for payment's streams one trace of one flagd span of 600 seconds at 18:17:15, 18:27:20 and 18:37:25, parent `0000000000000000`; and one flagd span of 13.4 seconds at 18:17:22, status unset, whose client span is not in Tempo. flagd's own stream spans ended with status error 8 times and unset 5 times |

That is what `demo.md`, "Error spans with every flag off", says.

### Afterwards

`make lab-check` 18:49:09 to 18:49:16: `LAB CHECK PASSED`. `make lab` from `main`, every release,
18:52:18 to 18:53:29: `ok=29 changed=0 unreachable=0 failed=0`. `make lab-check` 18:53:36:
`LAB CHECK PASSED`.

## The shop keeps its speed after a worker restarts (2026-11-15, card L11)

After card C16 stopped worker4 (19:05 to about 19:17 UTC), product-catalog was charged for the page
cache of its own program, sat at its 20Mi memory limit, and read its code back from disk hundreds of
times a second. The cause, the measurements and the new limits are in
`lgtm/docs/adr/l11-shop-memory-limits.md`. Applied with the owner's go-ahead. p95 values below are
from Tempo's span metrics in Mimir, tenant `lab`
(`histogram_quantile(0.95, sum by (le) (rate(traces_spanmetrics_latency_bucket{...}[W])))`, server
spans of product-catalog, and checkout's server spans whose name ends in `PlaceOrder`); memory and
page faults from cAdvisor through Prometheus.

### Before

| Time | product-catalog p95 | checkout `PlaceOrder` p95 | Window |
|---|---|---|---|
| 12:00, 15:00, 17:00, 18:15, 19:00 | 6.4 to 6.6 ms | 18.7 to 28.5 ms | 30 minutes |
| 20:30 | 198.5 ms | 232.2 ms | 30 minutes |
| 22:01:19 | 177.5 ms | 185.6 ms | 5 minutes |

At 20:18 the pod `product-catalog-78f8879865-ckrm8` on worker4 used 19.64 MiB of its 20 MiB: 10.48
MiB RSS and 8.46 MiB of file pages, with about 690 major page faults a second.

`make lab-check` with the new check 10, 20:27:43 to 20:27:50, `LAB CHECK FAILED: 1 check(s)`:

```
==> 10. No container of the shop is at its memory limit and reading its pages back from disk
  FAIL  container product-catalog (pod product-catalog-78f8879865-ckrm8) uses 99% of its memory limit and reads back 11.76% of it a second: at its limit and reading its pages back from disk
```

Every other check passed, and every other container of the shop passed check 10; the load
generator, for example, read back 0.02% of its limit a second.

### Upgrade

`make lab TAGS=shop` from the card's branch, 22:01:31 to 22:03:24 UTC: `ok=9 changed=1`; release
`shop` revision 4, chart `shop-0.3.1`, app version `3.1.0-lab.2` unchanged. Every pod of the shop
restarted, because the chart's version is in every pod template; the scheduler placed all of them on
worker4, the emptiest worker since drill 3. checkout restarted once and product-catalog twice until
Kafka and PostgreSQL took connections; the load generator once (a gRPC error at start).

The new checkout pod showed the case the card is about: at 22:03:48 it held 20.96 MiB of file pages,
almost all of its 22.18 MiB program, and used 29.8 MiB. With the old 20Mi limit it would have
thrashed like product-catalog.

### Thirty minutes after

Every two minutes from 22:07:49 to 22:36:01 (p95 over 5 minutes):

| | Range |
|---|---|
| product-catalog p95 | 8.0 to 10.8 ms |
| checkout `PlaceOrder` p95 | 15.6 to 28.5 ms |
| product-catalog usage | 15.1 to 17.9 MiB of 40 MiB (RSS 10.5 to 11.5, file pages 4.0 to 5.8) |
| checkout usage | 30.0 to 31.3 MiB of 40 MiB (RSS 9.2 to 10.6, file pages 18.9 to 21.0) |
| Major page faults, both | 0.18 a second at most at 22:07:49 (a window that still held the start), 0 to 0.04 from 22:09:50 |
| Alerts firing | `Watchdog` only (`NodeMemoryMajorPagesFaults` cleared before 22:05:48, `InfoInhibitor` before 22:07:49) |

Over 30 minutes at 22:36, the same queries give 9.3 ms and 17.6 ms. checkout is back in its old
range. product-catalog is about 3 ms slower than before the drill, and the page cache does not
explain it: it has no major faults, no CPU throttling, and worker4 used 0.66 of its 4 CPUs. The
difference is in its database calls: the p95 of its `astronomy-db` client spans went from 1.9 ms
(19:00) to 2.9 ms (22:36), and the share of its server spans under 2 ms from 78% to 52%. PostgreSQL
read nothing from disk and had no major faults. This is not explained.

`make lab-check` 22:39:36 to 22:39:45: `LAB CHECK PASSED`; check 10 shows checkout at 74% of its
limit and product-catalog at 42%, both reading back 0.00% a second.

### The cold case

The owner restarted worker4 at about 22:50 (`Restart-VM`), with every pod of the shop on it. The
node came back fast enough that its pods stayed bound to it, and the kubelet started their
containers again on worker4 with an empty page cache. Every pod of the shop was Running at 22:54:15.
`astronomy-db-0` came back on worker2.

- checkout's first container after the restart (from 22:51:19) was charged for its program: at most
  21.19 MiB of file pages and 28.96 MiB of usage, under the 40Mi limit. It exited while Kafka was not
  ready yet; the next container (from 22:52:33) found the program in the page cache and holds 0.95
  MiB of file pages.
- product-catalog's containers after the restart crash-looped while its database moved to worker2,
  each for less than a scrape interval, so no reading of a cold product-catalog exists after the fix.
  Its container from 22:54:04 holds about 1.3 MiB of file pages. For product-catalog the cold case
  rests on the pod measured before the fix (12.6 MiB of its program charged at 19:22, `ckrm8` 10.7
  MiB at 19:54) and on its program's size, 21.15 MiB, which 40Mi holds beside `GOMEMLIMIT`.

Every two minutes from 22:55:51 to 23:15:59 (p95 over 5 minutes), with every fault flag off:

| | Range |
|---|---|
| product-catalog p95 | 7.8 to 9.9 ms |
| checkout `PlaceOrder` p95 | 74.2 and 76.8 ms at 22:55:51 and 22:57:52, windows that still held the restart; 15.6 to 27.2 ms from 22:59:53 |
| product-catalog usage | 11.8 to 13.4 MiB of 40 MiB |
| checkout usage | 10.6 to 12.1 MiB of 40 MiB |
| Major page faults, both | 0.70 a second at most at 22:55:51, 0.06 or less from 22:57:52 |
| Alerts firing | `Watchdog` only |

`make lab-check` 23:18:11 to 23:18:18: `LAB CHECK PASSED`; check 10 shows checkout at 33% of its
limit and product-catalog at 32%.

### Afterwards

`make lab` from the card's branch, every release, 22:54:35 to 22:55:46: `ok=29 changed=0
unreachable=0 failed=0`.

## A start of the lab leaves no failed kafka-trim Job (2026-11-16, card L12)

Why and what changed: `lgtm/docs/adr/l12-kafka-trim-after-start.md`. Applied with the owner's
go-ahead, said in the card's session.

### Before

The owner started the VMs after a night switched off. The nodes booted at 13:21:21 to 13:21:31
UTC (`node_boot_time_seconds`), `kube-controller-manager` started at 13:21:36, the first pod was
Ready at 13:21:39 and the last at 13:27:02 (`loki-compactor-0`), with nothing done by hand.

- The trim had last succeeded at 00:07:19. At 13:22:01 the CronJob created
  `kafka-trim-29913907`, the missed run of 13:07. It got `502 Bad Gateway` and then `500 ...
  failed to find valid mountpoint` from Longhorn's API (events `FailedFilesystemTrim`) and failed
  with `BackoffLimitExceeded` at 13:23:22. The CronJob kept it (`failedJobsHistoryLimit: 1`).
- Alerts after the start (Prometheus `ALERTS`): `Watchdog` firing from 13:25, and `KubeJobFailed`
  for `kafka-trim-29913907` pending from 13:24:45 and firing from 13:39:15 to 13:46:00 (the
  planner's reading; one-minute steps showed 13:40 to 13:46). The Job was deleted by hand at
  about 13:46, before this card changed anything; the card did not delete it.

### Change

1. `make platform TAGS=longhorn`, 14:07:17 to 14:09:20: `ok=10 changed=4 failed=0` (three tool
   downloads into `.bin` and the Longhorn release). The rendered chart differs from `main` in one
   line of the ConfigMap `longhorn-default-setting`, `recurring-failed-jobs-history-limit: "0"`.
   No pod restarted: every container in `longhorn-system` had started between 13:22:28 and
   13:23:05.
2. Longhorn applied it: setting `recurring-failed-jobs-history-limit` is `0`, `APPLIED true`, and
   the CronJob `kafka-trim` has `failedJobsHistoryLimit: 0`, `successfulJobsHistoryLimit: 1`.
3. `make lab TAGS=glue`, to 14:10:14: `ok=9 changed=1 failed=0`, lab-glue 0.4.0 with the
   first version of the rule (at least three changes of the schedule time in four hours).
4. The independent check found two faults in that version (ADR, last paragraph of "A trim that
   has stopped is still seen"). The rule now asks that Prometheus watched the CronJob for the
   whole three hours, with `for: 10m`. The chart's version stayed 0.4.0, so the Ansible helm
   module saw nothing to upgrade (`make lab TAGS=glue` at 14:24:39, `changed=0`); the new template
   went in with `.bin/helm upgrade lab-glue charts/lab-glue -n lab-tools --reuse-values --wait`
   at 14:27:55 (revision 3), and `make lab TAGS=glue` after it reported `changed=0`, so the
   values are the role's. Prometheus evaluated the new `LabKafkaTrimNotSucceeding` at 14:28:47:
   query with `count_over_time(...[3h:10m])) >= 18`, `duration` 600, state `inactive`, health
   `ok`.
5. The planner's review found that this version never fires for a trim that has never succeeded
   (`kube_cronjob_status_last_successful_time` exists only after the first success) and that
   check 11 failed on a lab built less than an hour before. The rule now counts the age from the
   CronJob's creation when there is no success (`... or kube_cronjob_created`) and reads
   `kube_cronjob_created` for the watched steps. `.bin/helm upgrade ... --reuse-values` at
   14:53:40 (revision 4); `make lab TAGS=glue` after it: `changed=0`. Prometheus at 14:54:47:
   query `(time() - max by (namespace, cronjob) (kube_cronjob_status_last_successful_time{...} or
   kube_cronjob_created{...}) > 3 * 3600) and (max by (namespace, cronjob)
   (count_over_time(kube_cronjob_created{...}[3h:10m])) >= 18)`, `duration` 600, state
   `inactive`, health `ok`. The `or` half at 14:56:32 returned 2953 s, the age of the success of
   14:07:20.

### A failed run leaves nothing

The run of 14:07 succeeded (`kafka-trim-29913967`, 20 s, `lastSuccessfulTime` 14:07:20). To see a
failed run without a cold start, a Job `kafka-trim-l12-test` was created at 14:12:31 in
`longhorn-system`, owned by the CronJob `kafka-trim` (controller reference), `backoffLimit: 0`,
its container `exit 1`. Events: `BackoffLimitExceeded` at 14:12:35, and from the CronJob at
14:12:35 `UnexpectedJob` (it did not create the Job itself) and `SuccessfulDelete`: `Deleted job
kafka-trim-l12-test`. Afterwards `kubectl -n longhorn-system get jobs` listed only
`kafka-trim-29913967`, `Complete`. `KubeJobFailed` needs the Job for 15 minutes; it never fired.

### The rule and the check

- `make lab-rule-test` (`promtool test rules tests/lab/kafka-trim-rule.test.yml` from
  prom/prometheus:v3.13.5, the lab's Prometheus version, in Docker on the PC), final rule:
  `SUCCESS`. Six cases: a trim that never succeeds again while the lab runs is quiet at 179 and
  185 minutes and fires at 192; a night off whose first run after the start succeeds stays quiet;
  a night off after which the trim keeps failing is quiet at 960 minutes and fires at 1000, about
  3 hours 26 minutes after the start; a stop of two and a half hours, with samples from before it
  and two failed runs after it, stays quiet; a new lab whose trim never succeeds is quiet at 185
  minutes and fires at 192; a new lab whose trim works stays quiet.
- Check 11 alone, final rule, 14:55:01: `PASS  kafka-trim last succeeded 0.8 hours ago (threshold
  3 hours)`. With `LAB_KAFKA_TRIM_MAX_HOURS=0.5`: `FAIL  kafka-trim last succeeded 0.8 hours ago,
  while Prometheus watched it (threshold 0.5 hours; ...)`, exit 1.

### Afterwards

- `make lab-check` 14:55:04, final rule: `LAB CHECK PASSED`, check 11 `PASS  kafka-trim last
  succeeded 0.8 hours ago (threshold 3 hours)`.
- `make lab` from the card's branch, every release, 14:55:14 to 14:56:20: `ok=29 changed=0
  unreachable=0 failed=0`.
- Alerts at 14:56:20: `Watchdog` only.
- Step 13's action 5 of m17, `kubectl get jobs -A | grep -v Complete`, at 14:39:18: the header
  line only.

### Not proven: the cold case

Stopping and starting the VMs is the owner's own action, and the lab was not started cold again
after the change. Whether the next cold start ends with no failed Job and no alert is therefore
not proven on the lab; the test Job above shows the mechanism. To read it at the next start, after
every pod is Ready:

```bash
kubectl -n longhorn-system get events --field-selector involvedObject.kind=CronJob   # SuccessfulDelete of the run at boot
kubectl -n longhorn-system get jobs                                                 # no Failed Job
make lab-check                                                                      # LAB CHECK PASSED
```
