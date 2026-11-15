# L11: memory limits that hold the program's own code

Status: decided by worker L11 on 2026-11-15. The change is in the shop chart's values (chart
0.3.1, app version unchanged, no new image). The record of the lab is in
`lgtm/lab/docs/acceptance-lab.md`.

## Context

Card C16 stopped worker4 from 19:05 to about 19:17 UTC on 2026-11-15. Since then the shop was
about ten times slower with every fault flag off: product-catalog's p95 went from about 6.5 ms to
about 210 ms, and checkout's `PlaceOrder` p95 from about 27 ms to about 240 ms
(`lgtm/docs/verification/m17.md`, read at 19:46). A restart of the
deployment at 19:53 did not help, and `make lab-check` passed at 19:22 all the same.

## What the lab showed

Read from the lab's Prometheus (cAdvisor and kube-state-metrics) and from the Kubernetes events
that Alloy keeps in Loki, on 2026-11-15. "File" is the page cache charged to the container
(`container_memory_cache`); "RSS" is its anonymous memory.

| product-catalog pod | Node, start | Limit | RSS | File | Major page faults |
|---|---|---|---|---|---|
| `7fbd5bdd84-2jhcf` | worker1, 2026-11-14 23:03, image already on the node | 20Mi | 10.7 to 11.1 MiB | 0.13 MiB at most | 0 a second |
| `849ff854db-pqx4g` | worker4, 18:16, image pulled at 18:16:45 | 20Mi | 10.3 to 11.1 MiB | 0 | 0 |
| `849ff854db-rjfg8` | worker2, 19:10 while worker4 was away, image pulled at 19:10:59; crash-looped until 19:21 while its database was away | 20Mi | 6.6 MiB at 19:22, then 10.2 to 11.5 | 12.6 MiB at 19:22, then 7.6 to 8.9 | 450 to 720 from 19:25 |
| `78f8879865-ckrm8` | worker4, 19:53, after worker4 restarted at 19:17; image already on the node | 20Mi | 8.3 MiB at 19:54, then 9.9 to 11.3 | 10.7 MiB at 19:54, then 7.7 to 9.1 | 450 to 840 from 19:57 |

At 20:18 UTC the pod `ckrm8` used 19.64 MiB of its 20 MiB: 10.48 MiB RSS and 8.46 MiB of file
pages, of which 6.53 MiB were mapped into the process, with about 690 major page faults a second.
The Go runtime did not grow: `go_memory_used_bytes` stayed at 14.5 MiB, with the same request rate
as before.

checkout has the same build, the same `GOMEMLIMIT: 16MiB` and the same 20Mi limit. Until the fix it
was never charged for its program: its file pages stayed between 0 and 3.6 MiB in every pod
Prometheus held. Its pod `668c76fd86-xbxjl` was pulled onto worker2 at 19:10:57, two seconds before
product-catalog, and held 0.36 MiB of file pages. After the fix it was charged twice on worker4
(`acceptance-lab.md`): 20.96 MiB of file pages and 29.8 MiB of usage at 22:03, and 21.19 MiB and
28.96 MiB in the first container after worker4 restarted at about 22:50. With the old limit both
would have been far past 20Mi.

The programs are large next to their limits. The image layers on GHCR hold
`/usr/src/app/product-catalog` with 22,180,000 bytes (21.15 MiB) and `/usr/src/app/checkout` with
23,257,248 bytes (22.18 MiB). Both are static Go binaries built with `-ldflags "-s -w"`.

worker2 had 2.8 to 3.6 GiB of memory available from 19:00 to 19:30, so the node itself was not
short of memory. The faults came from the container's own limit.

## Cause

The kernel's cgroup v2 documentation, "Memory Ownership": "A memory area is charged to the cgroup
which instantiated it and stays charged to the cgroup until the area is released." It also says
which cgroup a shared area ends up in "is in-deterministic". The page cache that holds a program's
code is such an area. If the node's page cache already holds those pages when the container starts,
because the image pull wrote them or an earlier container read them, the new container is not
charged for them. If it does not, the container's own reads load them, and they count against its
limit. `memory.stat` shows them as `file` (and `file_mapped` for the part the process maps), and
cAdvisor reports them as `container_memory_cache`, and the counter `pgmajfault` of the same file
as `container_memory_failures_total{failure_type="pgmajfault"}` (cAdvisor's
`lib/container/libcontainer/handler.go` and `lib/metrics/prometheus.go`).

A container at `memory.max` must reclaim its own memory before it can grow. Go's heap is anonymous
memory and there is no swap, so the only memory the kernel can take back is the file pages: the
program's own code. The next call needs that code again, so the kernel reads it back from disk (a
major page fault) and charges it to the same container, which is still at its limit. product-catalog
needs about 10.5 MiB of anonymous memory and more than 12.6 MiB of its program (the most it held
before its heap grew, already at the limit), so 20Mi cannot hold both. Every request then waits for
the disk, which is the tenfold latency. A restart does not help while the node's page cache does
not hold the program: the new container reads it again and is charged again.

Which service ends this way depends on luck as the kernel's documentation says: after worker4
restarted its page cache was empty, so `ckrm8` was certain to be charged; on worker2 the image had
just been pulled and checkout was not charged, yet product-catalog was. The lab cannot control
this, so a limit must hold the case where the container pays for its whole program.

Kubernetes hands `resources.limits.memory` to the kernel as the container's limit, and the kernel
enforces it (the "Resource Management for Pods and Containers" page). The working set that the
kubelet and cAdvisor report is the usage less `inactive_file` (cAdvisor's
`lib/container/libcontainer/handler.go`; Kubernetes' "Resource metrics pipeline" page calls it an
estimate), so the working set of `ckrm8` stayed near 15.5 MiB, below its limit, while it thrashed. Only usage, which includes all file pages, shows the
container at its limit.

## Which services can end the same way

The rule: a container is at risk when its limit, less the most anonymous memory it used, is
smaller than the code it may have to hold. Maximums over the last days, for every container of the
shop (MiB):

| Container | Limit | Most RSS | Room | Most file pages seen | At risk |
|---|---:|---:|---:|---:|---|
| product-catalog | 20 | 12.1 | 7.9 | 12.6 (program 21.15) | yes, seen |
| checkout | 20 | 12.2 | 7.8 | 3.6 before the fix, 21.19 after it (program 22.18) | yes, the same build and limit |
| valkey | 32 | 3.1 | 28.9 | 11.0 | no |
| flagd | 75 | 41.9 | 33.1 | 39.4 | no: it has run charged for its file pages, at 1.5 major faults a second or fewer |
| frontend-proxy | 90 | 22.9 | 67.1 | 44.1 | no |
| image-provider | 120 | 4.1 | 115.9 | 20.6 | no |
| postgresql | 120 | 44.2 | 75.8 | 61.6 | no |
| payment | 140 | 61.0 | 79.0 | 43.9 | no |
| cart | 160 | 42.8 | 117.2 | 31.1 | no |
| frontend | 250 | 115.2 | 134.8 | 53.0 | no |
| flagd-ui | 250 | 102.4 | 147.6 | 64.4 | no |
| fraud-detection | 300 | 254.0 | 46.0 | 76.2 | no: it has run charged, at 0.7 major faults a second or fewer |
| ad | 400 | 343.0 | 57.0 | 25.2 | no |
| recommendation | 500 | 106.5 | 393.5 | 38.3 | no |
| kafka | 832 | 618.8 | 213.2 | 180.0 | no |
| load-generator | 1500 | 842.1 | 657.9 | 386.0 | no |

flagd and fraud-detection hold more file pages than their room, but most of those pages are files
read once (configuration, jars), and both ran with them charged without faulting.

## Options

1. Raise the two limits so that they hold Go's own limit and the whole program. Chosen.
2. Raise them only by the code seen so far (12.6 MiB), to about 32Mi. Smaller, but 12.6 MiB was
   measured at a full limit, so the real need is not known, and a wrong guess brings back the same
   silent slowness.
3. Lower `GOMEMLIMIT` so that the heap leaves room for the code inside 20Mi. Go's guide to the
   garbage collector says the limit covers the runtime's own memory (`Sys - HeapReleased`) and
   advises 5 to 10% of headroom for memory the runtime does not know about; here that memory is up
   to 22 MiB of code, more than the 20Mi limit leaves. The heap would have to shrink to almost
   nothing and the collector would run without pause, which the same guide calls thrashing.
4. Warm the page cache, or pin the pods to nodes. It would depend on the kernel's choice of owner,
   which its documentation calls nondeterministic.

## Decision

| Service | Requests (memory) | Limit | `GOMEMLIMIT` |
|---|---|---|---|
| product-catalog | 16Mi to 32Mi | 20Mi to 40Mi | 16MiB, unchanged |
| checkout | 16Mi to 32Mi | 20Mi to 40Mi | 16MiB, unchanged |

40Mi holds `GOMEMLIMIT` (16 MiB) plus the whole program file (21.15 and 22.18 MiB). That leaves
about 1.8 MiB for the kernel memory that also counts against the limit, and Go may pass its soft
limit a little, so a state that reaches 40Mi is unlikely, not impossible. The most either service
used after the fix was 31.3 MiB (checkout, charged for 21 MiB of its program). `GOMEMLIMIT` stays:
it keeps the heap where it was, and the code is outside it. The request of 32Mi is about what a
charged container uses: checkout used 29 to 31 MiB with 21 MiB of its program charged.

What it costs: the workers' memory requests grow by 32 MiB in all (16 MiB a service), and the
limits by 40 MiB. The workers' requests were about 19.2 GiB of 30.6 GiB (`lgtm/lab/docs/budget.md`).

The chart's version goes from 0.3.0 to 0.3.1. The chart puts its version in the labels of every pod
template, so `make lab TAGS=shop` restarts every pod of the shop once.

## The lab check

`make lab-check` now fails, and names the container, when a container of the shop is at its limit
and reads its pages back from disk (`lgtm/lab/tests/lab/memory.sh`, check 10). Both must hold for
the same container:

- usage at least 95% of its limit (`LAB_MEMORY_FULL_RATIO`), and
- major page faults over five minutes that, at one 4 KiB page each, read back at least 1% of its
  limit a second (`LAB_MEMORY_REREAD_RATIO`).

Measured on the lab: product-catalog at its limit read back 9 to 16% of its 20 MiB a second. The
healthy container closest to the rule, the load generator, sat at 99.9% of its limit with 60 to 66
major faults a second, which is 0.02% of its 1500 MiB. flagd reached 99.9% and faulted 1.5 times a
second at most while it was that full. No other container came near either value. A rule on major faults alone would trip on the
load generator, and a rule on the working set would miss product-catalog, whose working set
stayed below 90% of its limit.

## Sources

- Linux kernel, Control Group v2, the memory controller: "Memory Ownership", `memory.max`,
  `memory.stat` (`file`, `file_mapped`, `pgmajfault`), https://docs.kernel.org/admin-guide/cgroup-v2.html,
  fetched on 2026-11-15.
- Kubernetes, Resource Management for Pods and Containers,
  https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/, and Node-pressure
  Eviction (the working set excludes `inactive_file`),
  https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/, fetched on
  2026-11-15.
- Kubernetes, Resource metrics pipeline (the working set is an estimate),
  https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/, fetched on 2026-11-15.
- cAdvisor, `lib/container/libcontainer/handler.go` (working set = usage less `inactive_file`;
  `pgmajfault` from `memory.stat`) and `lib/metrics/prometheus.go`
  (`container_memory_failures_total`), https://github.com/google/cadvisor, branch `master`, read on
  2026-11-15.
- Go, A Guide to the Go Garbage Collector, "Memory limit" and "Suggested uses",
  https://go.dev/doc/gc-guide, fetched on 2026-11-15.
