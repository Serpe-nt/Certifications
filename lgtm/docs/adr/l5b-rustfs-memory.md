# L5b: RustFS gets the memory it uses; Kafka's replicas and Longhorn

Status: proposed by worker L5 on 2026-11-12. The values are in the lab's files; they are not
applied to the lab yet (see "Not done").

## RustFS memory

### What happened

`s3/rustfs` restarted twice. Kubernetes keeps only the last termination; the earlier one is in
Loki (tenant `lab`, `{namespace="s3"}` and the Kubernetes events of
`{job="integrations/kubernetes/eventhandler"}`).

1. 2026-11-11 15:09:05 UTC, not memory. RustFS spent about 50 seconds listing
   `tempo-traces/lab/` (`Metacache reader peek timed out`, `Metacache listing quorum failed`,
   `Disk operation is still pending ... op: walk_dir`, requests answered 503 after 47 to 49
   seconds). Its health endpoint stopped answering in time, the kubelet logged `Readiness probe
   failed` and `Liveness probe failed`, then `Container rustfs failed liveness probe, will be
   restarted`, and RustFS logged `RustFS Received SIGTERM signal`. The chart's probe allows 3
   failures 5 seconds apart with a 3-second timeout.
2. 2026-11-12 12:06:20 UTC, `OOMKilled` (exit 137) at the 1Gi limit.

The memory, from the lab's Prometheus (`container_memory_rss` and
`container_memory_working_set_bytes`, container `rustfs`, 30-minute steps):

| When (UTC) | RSS | Working set (RSS and page cache) |
|---|---:|---:|
| 2026-11-10, 30 minutes of load (L4) | | 449 MiB |
| 2026-11-11 20:00 to 2026-11-12 11:10 | 430 to 480 MiB | 530 to 668 MiB |
| 2026-11-12 11:40 | 772 MiB | 918 MiB |
| 2026-11-12 12:02 | | 993 MiB |
| 2026-11-12 12:10 to 13:10, after the restart | 365 to 430 MiB | 480 to 620 MiB |

The jump started at 11:13, 30 minutes before the Kafka repair changed anything, with a burst of
reads from Loki: 40 warnings `GetObject streaming body dropped before expected length` on
`loki-chunks/lab/...` in one minute, the reader closing the streams before the end (most likely a
large Loki query that was cancelled). Network, disk reads and CPU stayed near zero before and
after, yet RSS stayed near 770 MiB for 50 minutes: the memory taken for the burst was not given
back. The work that came back with ingest at 12:02 (Mimir and Tempo writing blocks again, a
scanner cycle at 12:03:41) added the last part. Tenant `prom`'s 6,000 samples per second are not
what grows it: RustFS's traffic stays under 0.3 MiB/s.

### Options

1. **A RustFS setting that bounds its memory.** The reference of environment variables
   (https://docs.rustfs.com/reference/environment-variables, read on 2026-11-12) lists a buffer
   profile (`RUSTFS_BUFFER_PROFILE`), scanner and heal concurrency, and probe caches, but no cap
   on memory or on concurrent object reads. Not available.
2. **A larger request and limit** (chosen). The limit has to hold the steady state plus a burst
   like the one at 11:13 plus the page cache the kernel can reclaim.

### Decision

`helm/platform/rustfs/values.yaml`: memory request 768Mi (was 512Mi; covers the working set of a
whole day, at most 668 MiB), limit 1536Mi (was 1Gi; the peak RSS of 772 MiB with room for a
second burst on top). That adds 256 MiB of requests on the worker that runs RustFS. On
2026-11-12 the workers had 77 to 88% of their memory requested; worker4, where RustFS runs, would
go from 88% to 93%, over the 90% the owner accepts, so after the restart RustFS should land on
worker2 (77%) or worker3 (79%); the default scheduler scores less requested nodes higher, but this is not certain. Check it after the apply.

The liveness probe that killed RustFS on 2026-11-11 is not changed here; if long listings of
`tempo-traces` recur, a longer probe timeout is the next thing to try.

## Kafka's Longhorn replicas

All six Kafka replicas sit on worker2 and worker3 (`budget.md`, "Volumes and buckets").

Why: Longhorn picks the node for a new replica with a balance score over the disks' usable
storage, computed from what is *scheduled* on each disk, not from what is written
(https://longhorn.io/docs/1.13.0/nodes-and-volumes/nodes/scheduling/, "Balance Factor Formula by
Usable Storage"). `make platform` creates RustFS's 25 GiB volume before Kafka's, and its two
replicas went to worker1 and worker4. When the Kafka volumes came, worker1 and worker4 already had
25 GiB scheduled, so all six Kafka replicas went to worker2 and worker3. RustFS has written only
about 5.5 GiB of its 25 GiB, so the score sees space worker1 and worker4 really have free. A
rebuilt lab would do the same.

What does not help: Replica Auto Balance (setting `replica-auto-balance`, or
`volume.spec.replicaAutoBalance`) balances the replicas of one volume across nodes and zones
(https://longhorn.io/docs/1.13.0/high-availability/auto-balance-replicas/). Every Kafka volume
already has its two replicas on two different nodes, so it would move nothing. Its "disk pressure
threshold" moves replicas between disks of the same node, and each worker has one disk.

What would: for each Kafka volume in turn, raise its replica count from 2 to 3 (Longhorn puts the
third on a node without a replica of it, worker1 or worker4), wait until it is healthy, delete
the replica on worker2 or worker3, and set the count back to 2. Two healthy replicas exist at
every step. For a rebuilt lab, the lab's files need to place them the same way, for example with
Longhorn node and disk tags on a StorageClass for Kafka. That choice is open.

## Not done

My session's permission rules blocked `make platform TAGS=s3` as a change to the shared
cluster, and the replica moves are changes to the cluster too. Both wait for the owner to run
them or to allow them.
