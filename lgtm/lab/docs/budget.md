# Resource budget of the lab

Does the whole lab fit on the real cluster with 15% of worker memory left free? The numbers below
are for the full profile (the real cluster). Every container of the LGTM releases and the shop
has CPU and memory requests and a memory limit; `make lab-lint` fails when one does not.

## The cluster

| Nodes | vCPU | Memory | Together |
|---|---|---|---|
| 4 workers | 6 each | 9 GiB each | 24 vCPU, 36 GiB |
| 3 control-plane nodes | 2 each | 3 GiB each | keep kubeadm's taint; only DaemonSets that tolerate it run there |

15% of the workers' memory free means at most **30.6 GiB** in use on the workers.

## Per release (LGTM stack and shop, full profile)

Requests are what the scheduler reserves; limits are the most a container may take before it is
throttled (CPU) or killed (memory). Generated from the rendered full profile with
`python tests/lab/budget.py .bin/lab-render/full 4` after `make lab-lint`; DaemonSet pods are
counted once per worker, and the config-reloader sidecars that the Prometheus and Alloy
operators add are included.

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

(`lab-glue` has no pods: routes, dashboards and, later, the beacon.)

What is inside the big ones:

- **Mimir**: 2 distributors, 3 ingesters (512 MiB requested, 1 GiB limit each), 2 queriers, query-frontend, query-scheduler, store-gateway, compactor, ruler, alertmanager, nginx gateway. No caches.
- **Loki**: 2 distributors, 3 ingesters (384 MiB, 1 GiB), 2 queriers, query-frontend, query-scheduler, index-gateway, compactor, ruler, nginx gateway, a 128 MiB results cache and a 256 MiB chunks cache.
- **Tempo**: 2 distributors, 2 block-builders, 2 live-stores (256 MiB, 768 MiB), querier, query-frontend, backend scheduler, backend worker, metrics-generator, a 128 MiB memcached.
- **kube-prometheus-stack**: Prometheus (768 MiB, 1.5 GiB; one day of local data), Alertmanager, operator, kube-state-metrics, node exporter on every worker.
- **shop**: card D1's sizes (`demo/TRIMMING.md`): 2.4 GiB requested, 4.5 GiB limit.

## The whole workers' memory

| Item | Requests | Limits | Source |
|---|---:|---:|---|
| LGTM stack and shop (table above) | 13.2 GiB | 31.6 GiB | this card |
| Platform: Longhorn, RustFS, Kafka `telemetry` (3 nodes), Strimzi, Envoy Gateway, cert-manager, metrics-server | 5.3 GiB | 11.8 GiB (Longhorn's own pods unset) | `docs/platform.md` (card L2) |
| Kubernetes system pods on the workers (Calico, kube-proxy, CoreDNS) | about 0.5 GiB | about 1 GiB | estimate |
| Ubuntu, kubelet and containerd outside pods, 4 workers | about 2.8 GiB (0.7 each) | | estimate |
| **Total** | **21.8 GiB** | **44.4 GiB (without the OS)** | |
| Workers' memory | 36 GiB | 36 GiB | |
| **Free** | **14.2 GiB (39%)** | | |

**It fits.** Reserved memory leaves 39% of the workers free, well above the 15% target. The
requests are above what the same pods used on the kind cluster (next section), so the real use
should stay below them; module m17 and the fault flags have room to push it up. Per worker that is about 5.5 GiB reserved of 9 GiB.

CPU is not the limit: the LGTM stack and the shop request 4.0 vCPU and the platform 2.7, about
6.7 of the workers' 24 vCPU.

## Per node

| Node | Fixed share (DaemonSets and OS) | Scheduled share | Reserved memory |
|---|---|---|---|
| each worker (9 GiB) | node exporter 32 MiB, Alloy logs 178 MiB (with its config reloader), Longhorn manager and instance manager 128 MiB, Calico and kube-proxy, OS about 0.7 GiB | about a quarter of the remaining requests (the scheduler spreads them) | about 5.5 GiB on average, 61% |
| each control-plane node (3 GiB) | node exporter and Alloy logs (both tolerate the control-plane taint), about 0.2 GiB; kubeadm's own pods | nothing else (taint) | the control plane's own use |

The three ingesters of Mimir and of Loki land on different workers (Loki's chart requires it,
Mimir's prefers it); Kafka's three nodes and the two Envoy proxies are spread too (card L2). A
worker that carries a Mimir ingester, a Loki ingester, a Kafka node and Prometheus reserves about
2.7 GiB for those four, 3.7 GiB with its fixed share, which leaves room for its quarter of the
rest below 85%.

The limits add up to more than the workers have. That is on purpose: a limit caps a single
runaway pod (the fault flags make some services grow), and not every pod reaches its limit at
the same time. If memory runs short, the kubelet evicts the pods that use most above their
requests first.

## Seen on the kind cluster

Measured on the kind cluster `lgtm-l3` (one node, kind profile: one replica of each component)
on 2026-11-10, about 25 minutes after `make lab`, with the load generator running, from the
kubelet's summary API (memory working set per namespace):

| Namespace | Pods | Memory in use |
|---|---:|---:|
| shop | 15 | 1961 MiB |
| mimir | 10 | 517 MiB |
| loki | 11 | 404 MiB |
| prom | 5 | 376 MiB |
| grafana | 1 | 329 MiB |
| tempo | 9 | 292 MiB |
| alloy | 3 | 171 MiB |
| otel | 1 | 92 MiB |
| stand-ins (kafka, s3, Envoy Gateway) | 4 | 426 MiB |
| kube-system (one node: API server, etcd, ...) | 8 | 1363 MiB |
| **All pods** | | **5941 MiB** |

The kind node as a whole (`docker stats`) used 7.5 GiB, under the 14 GiB the card allows. The
LGTM releases themselves used about 2.2 GiB with one replica each; the full profile runs 2 to 3
replicas of the busy components and reserves 13.2 GiB for them.

## If it does not fit

The first things to cut, where the lessons lose nothing:

1. Loki and Mimir queriers from 2 to 1 (about 0.2 GiB requested each, 0.5 to 0.75 GiB limit).
2. Mimir and Loki distributors from 2 to 1.
3. The two gateway replicas of `otel-gateway` to one: this also removes the duplicate scrape of
   the shop's data stores.
4. Loki's chunks cache (256 MiB) and the Tempo memcached (128 MiB).

Three ingesters in Mimir and Loki stay: the lessons on replication and ring health need them.

## Disk

Volumes on Longhorn (two copies each) for the full profile: Mimir ingesters 3 x 3 GiB,
store-gateway 2 GiB, compactor 3 GiB, alertmanager 1 GiB (15 GiB); Loki ingesters 3 x 3 GiB,
compactor 2 GiB, index-gateway 2 GiB, ruler 1 GiB (14 GiB); Prometheus 4 GiB; Grafana 1 GiB; the
shop's Kafka 2 GiB, PostgreSQL 1 GiB, Valkey 256 MiB. About 37 GiB requested, 75 GiB with
Longhorn's two copies. With the platform's 80 GiB (`docs/platform.md`) that is 155 GiB of the
four 40 GiB Longhorn disks (160 GiB): it fits, without much room. The disks are dynamic VHDX
files and Longhorn volumes are thin, so the PC's drive only pays for what is written, far less
than this (the ingesters keep 13 hours of blocks locally, Prometheus one day). Tempo keeps no volumes (Kafka is its
write-ahead log). Long-term data is in the S3 store (card L2) with the contract's retention:
logs and traces 48 hours, metrics 7 days.
