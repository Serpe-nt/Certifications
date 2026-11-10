# Resource budget of the lab

Does the whole lab fit on the real cluster? Measured on 2026-11-10 on the owner's Hyper-V
cluster, with the platform, every LGTM release and the shop installed (profile `full`), 30
minutes after `make lab`, with the load generator running all along (`acceptance-lab.md`).

## Verdict

- **Workers (4 vCPU, 6 GB): it fits.** Requests are 78.7% of the workers' allocatable memory
  (17.9 of 22.75 GiB; 72 to 87% per worker), under the 90% the owner accepts for the lab. Real use
  is 69 to 76% per worker, with 1.4 to 2.2 GiB still available on each, no memory pressure
  (`/proc/pressure/memory` at 0), no OOM kill and no pod Pending. CPU is not a limit: 10 to 19%
  in use, 38 to 44% requested.
- **Masters: 4 GB, not 2.** With the lab installed the API server alone uses 1.2 to 1.5 GiB on
  each master, more than a 2 GB node can give it next to etcd, the other control-plane parts and
  Ubuntu. With 4 GB the masters use 59 to 71% and keep 1.4 to 1.8 GiB available. 3 GB would leave
  0.4 to 0.9 GiB, too little for the next set of custom resources. Keep 4 GB.
- **Headroom on the workers**: after five requests were raised to their measured use (below),
  the requests are about 18.9 GiB (83%), which leaves about 3.8 GiB of allocatable memory that
  nothing requests; about 7.0 GiB is not in use. That holds a lesson that scales Mimir's
  ingesters from three to six (1.5 GiB more requested, 90% in all), but not much more at the same
  time.

## The cluster

| Nodes | vCPU | Memory (VM) | Seen by Ubuntu (`free -m`) | Allocatable to pods |
|---|---|---|---|---|
| 3 control-plane nodes | 2 each | 4 GB | 3915 MiB | 3.73 GiB each |
| 4 workers | 4 each | 6 GB | 5924 MiB | 5.69 GiB each, 22.75 GiB together |

The sizes are in `vm/nodes.yml`. The masters started at kubeadm's minimum of 2 GB and the workers
at 8 GB; the owner raised the masters to 4 GB after the first `make platform` (below) and set
the workers to 6 GB to fit the PC's free memory (38 GB for all VMs). The control-plane nodes
keep kubeadm's taint; only DaemonSets run on them besides the control plane itself.

## Per node, measured

18:01 UTC, 32 minutes after the last `make lab`. "In use" is the working set from
`kubectl top nodes`; "available" is from `free -m` on the node; requests and limits are the sums
of the pods on the node (`kubectl describe node`).

| Node | Memory in use | Available | Memory requested | Memory limits | CPU in use | CPU requested |
|---|---:|---:|---:|---:|---:|---:|
| master1 | 2278 MiB (59%) | 1811 MiB | 310 MiB (8%) | 448 MiB | 153m | 730m |
| master2 | 2489 MiB (65%) | 1645 MiB | 310 MiB (8%) | 448 MiB | 166m | 730m |
| master3 | 2733 MiB (71%) | 1414 MiB | 310 MiB (8%) | 448 MiB | 201m | 730m |
| worker1 | 4076 MiB (69%) | 2192 MiB | 4226 MiB (72%) | 10203 MiB | 420m | 1600m |
| worker2 | 4192 MiB (71%) | 2029 MiB | 4382 MiB (75%) | 10922 MiB | 582m | 1590m |
| worker3 | 4447 MiB (76%) | 1518 MiB | 4610 MiB (79%) | 10870 MiB | 790m | 1530m |
| worker4 | 4404 MiB (75%) | 1418 MiB | 5116 MiB (87%) | 11566 MiB | 492m | 1760m |
| **workers** | **16.7 GiB (73%)** | **7.0 GiB** | **17.9 GiB (79%)** | **42.5 GiB** | **2.3 CPU** | **6.5 CPU** |

Peak memory in use per node during the 30 minutes of load (`kubectl top nodes`, 26 samples one
minute apart, 17:34 to 17:59), with no OOM kill, no eviction and no memory pressure in any sample:

| Node | master1 | master2 | master3 | worker1 | worker2 | worker3 | worker4 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Peak in use | 2396 MiB (62%) | 2655 MiB (69%) | 2908 MiB (76%) | 4314 MiB (74%) | 4136 MiB (71%) | 4589 MiB (78%) | 4241 MiB (72%) |

The limits are far above what the workers have, so measured use, not requests, decides whether
the lab fits; the peaks stay under the owner's ceiling of 90%.

The masters' requests are the control plane's own (kubeadm sets them on the API server, the
controller manager, the scheduler and etcd) plus node exporter and Alloy. Their use is mostly the
API server: 1220, 1377 and 1472 MiB; etcd 137 to 172 MiB; the controller manager and the scheduler
under 130 MiB each.

The limits add up to almost twice the workers' memory on purpose: a limit stops one runaway pod
(the fault flags make some services grow), and not every pod reaches its limit at once. If memory
runs short, the kubelet evicts the pods that use most above their requests first.

## Per namespace, measured beside requested

Same moment. Requested and limits are the sums over the namespace's running pods; "in use" is
`kubectl top pods`. `kube-system` includes the three masters' control planes.

| Namespace | Pods | Memory requested | Memory in use | Memory limits | CPU in use |
|---|---:|---:|---:|---:|---:|
| mimir | 14 | 3232 MiB | 1149 MiB | 7040 MiB | 140m |
| kafka (`telemetry`, 3 nodes, operators) | 5 | 3072 MiB | 3010 MiB | 4992 MiB | 166m |
| loki | 15 | 2816 MiB | 852 MiB | 7488 MiB | 99m |
| shop | 15 | 2488 MiB | 2295 MiB | 4597 MiB | 445m |
| tempo | 12 | 2144 MiB | 741 MiB | 6720 MiB | 41m |
| alloy (7 log collectors, events, operator) | 9 | 1456 MiB | 576 MiB | 3200 MiB | 53m |
| prom | 11 | 1280 MiB | 877 MiB | 2688 MiB | 52m |
| longhorn-system | 28 | 640 MiB | 2160 MiB | 2560 MiB | 322m |
| otel (2 collector gateways) | 2 | 512 MiB | 189 MiB | 1024 MiB | 45m |
| kube-system | 22 | 504 MiB | 5357 MiB | 532 MiB | 336m |
| gateway | 3 | 448 MiB | 165 MiB | 1920 MiB | 7m |
| grafana | 1 | 256 MiB | 462 MiB | 640 MiB | 11m |
| s3 | 1 | 256 MiB | 449 MiB | 1024 MiB | 21m |
| cert-manager | 3 | 160 MiB | 102 MiB | 480 MiB | 3m |
| calico-system, tigera-operator | 23 | 0 | 2045 MiB | 0 | 256m |

What the table says:

- **Longhorn and Calico use memory that no request reserves.** Longhorn's chart sizes only its
  managers and UI; its instance managers, CSI plugins, CSI sidecars and engine images (28 pods)
  use 2160 MiB against 640 MiB requested. Calico sets no requests at all and uses about 2 GiB,
  calico-node about 200 MiB on every node. Together about 3.5 GiB of real use on top of the
  requests; the 10% left under the owner's 90% is what absorbs it.
- **Mimir, Loki and Tempo request two to three times what they use** with the shop's load. The
  requests leave room for the lessons that push them (cardinality, module m17's tenants, the
  fault flags), and the owner asked not to cut where the lessons may need it. If the workers ever
  run short, these are the first requests to lower, to about 1.5 times the use above.
- **Five pods used as much as or more than they request** and were raised after this
  measurement: Grafana 384Mi (was 192Mi; 462 MiB for the pod with its sidecar), RustFS 512Mi
  (was 256Mi; 449 MiB), the Kafka nodes 896Mi (was 768Mi; 768 to 827 MiB with a 512 MiB heap,
  the rest is page cache of the log segments), the shop's Kafka 576Mi with an 832Mi limit (was
  500Mi and 620Mi; 534 MiB, 86% of its old limit), the load generator 704Mi (was 600Mi; 689 MiB).
  That adds about 1.0 GiB of requests, to about 18.9 GiB (83%).

Per pod, the biggest users: Prometheus 739 MiB, the load generator 689 MiB, the three Kafka nodes
768 to 827 MiB, the shop's Kafka 534 MiB, Grafana 462 MiB, RustFS 449 MiB, the Strimzi operators
294 and 347 MiB, each Mimir ingester about 250 MiB, each Loki ingester about 115 MiB, each Tempo
live-store about 110 MiB.

## Per release, as requested (full profile)

From the rendered full profile, `python tests/lab/budget.py .bin/lab-render/full 4` after
`make lab-lint` (DaemonSet pods counted once per worker; the operators' config-reloader sidecars
included). This is what the charts ask for, before the measured changes above.

| Release | Pods | CPU requests | Memory requests | CPU limits | Memory limits |
|---|---:|---:|---:|---:|---:|
| grafana | 1 | 0.06 | 0.25 GiB | 1.2 | 0.62 GiB |
| k8s-monitoring | 6 | 0.29 | 0.90 GiB | 3.0 | 2.24 GiB |
| kube-prometheus-stack | 8 | 0.39 | 1.16 GiB | 5.9 | 2.44 GiB |
| loki | 15 | 0.85 | 2.75 GiB | 12.5 | 7.31 GiB |
| mimir | 14 | 0.96 | 3.16 GiB | 12.5 | 6.88 GiB |
| otel-gateway | 2 | 0.20 | 0.50 GiB | 2.0 | 1.00 GiB |
| shop | 15 | 0.69 | 2.43 GiB | 10.9 | 4.49 GiB |
| tempo | 12 | 0.54 | 2.09 GiB | 11.0 | 6.56 GiB |
| **Total** | **73** | **3.98** | **13.24 GiB** | **59.0** | **31.55 GiB** |

On the real cluster Alloy's log collector and node exporter also run on the three masters (they
tolerate the control-plane taint), so `alloy` and `prom` hold more pods than the table counts.

What is inside the big ones:

- **Mimir**: 2 distributors, 3 ingesters (512 MiB requested, 1 GiB limit each), 2 queriers, query-frontend, query-scheduler, store-gateway, compactor, ruler, alertmanager, nginx gateway. No caches.
- **Loki**: 2 distributors, 3 ingesters (384 MiB, 1 GiB), 2 queriers, query-frontend, query-scheduler, index-gateway, compactor, ruler, nginx gateway, a 128 MiB results cache and a 256 MiB chunks cache.
- **Tempo**: 2 distributors, 2 block-builders and 2 live-stores (one per Kafka partition; 256 MiB, 768 MiB), querier, query-frontend, backend scheduler, backend worker, metrics-generator, a 128 MiB memcached.
- **kube-prometheus-stack**: Prometheus (768 MiB, 1.5 GiB; one day of local data), Alertmanager, operator, kube-state-metrics, node exporter on every node.
- **shop**: card D1's sizes (`demo/TRIMMING.md`), with the Kafka and load generator sizes above.

The platform's own requests are in `platform.md`: about 4.6 GiB with the Kafka nodes at 768Mi,
about 5.2 GiB with the measured sizes.

## The control plane at 2 GB

What happened before the masters were raised, for the record (`acceptance-lab.md`, defect 1):
with only the platform installed, the API server held about 880 MiB on each 2 GB master. master1
also carried CoreDNS and the Calico control plane, because it is the only node when
`make cluster` installs them; it reached 0 MiB available with memory pressure at 98% and went
`NotReady`. The platform's first role, `platform_control_plane`, now moves those Deployments to
the workers. Even so, master2 and master3 were left with 116 and 184 MiB, before the lab added the
Prometheus Operator's resources that took the API server to 1.2 to 1.5 GiB.

## If it does not fit

When the workers run short, in this order, where the lessons lose least:

1. Lower the requests of Mimir, Loki and Tempo towards 1.5 times their measured use (about
   2.5 GiB of requests freed).
2. Loki and Mimir queriers from 2 to 1, then their distributors from 2 to 1.
3. One `otel-gateway` replica instead of two: this also ends the double scrape of the shop's data
   stores (a lesson shows it on purpose).
4. Loki's chunks cache (256 MiB) and the Tempo memcached (128 MiB).

Three ingesters in Mimir and Loki, Kafka in the write path and the Tempo 3 components stay: the
lessons on replication, ring health and ingest need them. Or give the workers 7 GB each.

## Disk

Volumes on Longhorn, two replicas each. Requested: Mimir ingesters 3 x 3 GiB, store-gateway
2 GiB, compactor 3 GiB, alertmanager 1 GiB; Loki ingesters 3 x 3 GiB, compactor 2 GiB,
index-gateway 2 GiB, ruler 1 GiB; Prometheus 4 GiB; Grafana 1 GiB; the shop's Kafka 2 GiB,
PostgreSQL 1 GiB, Valkey 256 MiB; the platform's RustFS 25 GiB and Kafka 3 x 5 GiB. About
77 GiB, 155 GiB with both replicas, which is why Longhorn may over-provision its disks to 200%
(`platform.md`).

Written so far, after 30 minutes: 1.8 to 4.0 GiB on each worker's Longhorn disk (`df`), 11.7 GiB
together. The largest volumes: the three Kafka nodes about 1 GB each (24 hours of ingest), RustFS
780 MB, Prometheus 230 MB, each Mimir ingester 207 MB, each Loki ingester about 170 MB. They will
grow until retention holds them: 24 hours in Kafka, 48 hours of logs and traces and 7 days of
metrics in the S3 store, one day in Prometheus.
