# L4: the full profile on 6 GB workers and 4 GB masters

Status: accepted by worker L4 on 2026-11-10.

## Context

The plan sized the lab for workers of 9 GB, then 8 GB, and masters of 2 GB (kubeadm's minimum).
On the real cluster:

- The 2 GB masters ran out of memory during the first `make platform`. The API server alone held
  about 880 MiB on each, and master1 also carried CoreDNS and the Calico control plane. It went
  `NotReady` (`lab/docs/acceptance-lab.md`, defect 1).
- The owner then raised the masters to 4 GB and, to fit the PC's free memory, set the workers to
  6 GB (5.69 GiB allocatable each, 22.75 GiB on four).
- With the plan's sizes, the platform, the system pods, the LGTM releases and the shop requested
  18.66 GiB, 82% of the workers' allocatable memory. The planner first asked for at least 15% free
  by requests. The owner then said that up to 90% use is fine in the lab, and that nothing should
  be cut where the lessons may need it.

## Options

1. Cut second replicas of stateless parts (Mimir and Loki distributors and queriers, the Tempo
   distributor, the second collector gateway) and the Loki chunks cache: about 1.4 GiB of requests.
2. Lower only the requests that were far above measured use, and keep every part the lessons use.
3. Lower the requests of Mimir, Loki and Tempo to their measured use: about 5 GiB of requests,
   but nothing left for the lessons that push them.

## Decision

Option 2.

- The Kafka nodes asked for 1 GiB each and used 451 to 475 MiB at idle. Their heap went from
  768 MiB to 512 MiB.
- After 30 minutes of load, five pods used as much as or more than they request. Their requests
  now follow the measurement:

| Pod | Was | Now | Measured |
|---|---|---|---|
| Kafka nodes (`telemetry`) | 1Gi request, 1536Mi limit, 768m heap | 896Mi, 1280Mi, 512m heap | 768 to 827 MiB |
| Grafana | 192Mi | 384Mi (limit 768Mi) | 462 MiB for the pod |
| RustFS | 256Mi | 512Mi | 449 MiB |
| shop Kafka | 500Mi, limit 620Mi | 576Mi, limit 832Mi | 534 MiB |
| load generator | 600Mi | 704Mi | 689 MiB |

Option 1 was applied first and undone the same hour, after the owner's guidance: the lessons
teach scaling the read path, caching, and the collector gateway's duplicate scrape. Option 3
would leave Mimir, Loki and Tempo no room for the lessons on cardinality, tenants and fault flags.
`lab/docs/budget.md` lists it as the first step if the workers ever run short.

Result after 30 minutes of load:

- Requests are about 18.9 GiB, 83% of allocatable; per worker 72 to 87% before the last raise.
- Use is 69 to 76% per worker, with 1.4 to 2.2 GiB available on each, and no memory pressure.
- No OOM kill and no pod Pending.
- The masters use 59 to 71% of 4 GB.

`vm/nodes.yml` now records masters at 4 GB and workers at 4 vCPU and 6 GB.

## Consequences

- About 3.8 GiB of the workers' allocatable memory stays unrequested. That is enough for one big
  lesson change at a time, such as six Mimir ingesters (+1.5 GiB), not for several.
- Longhorn's own pods and Calico use about 3.5 GiB that no request reserves. The 10% under the
  owner's 90% absorbs it; `budget.md` shows it per namespace.
- The masters stay at 4 GB: with the lab installed, the API server uses 1.2 to 1.5 GiB.

## Sources

- Measurements: `lab/docs/budget.md` and `lab/docs/acceptance-lab.md`, from `kubectl top`,
  `kubectl describe node`, `free -m` and `/proc/pressure/memory` on the nodes, 2026-11-10.
- Longhorn settings (reserved space and over-provisioning, used in `platform.md`):
  https://longhorn.io/docs/1.13.0/references/settings/
- Tigera operator API, for the Calico Deployment overrides of `platform_control_plane`:
  https://docs.tigera.io/calico/3.31/reference/installation/api
