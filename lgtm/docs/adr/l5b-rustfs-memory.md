# L5b: RustFS gets the memory it uses; Kafka's replicas and Longhorn

Status: proposed by worker L5 on 2026-11-12. The changes are in the lab's files; they are not
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
`loki-chunks/lab/...` in one minute, the reader closing the streams before the end. The planner
identified it: two read-only Loki queries during QA, at about 11:14 and 11:16, each a regex line
filter over 90 minutes of the namespace `kafka` (the crash-looping brokers had logged a lot),
through a port-forward closed as soon as the answer came, which cut the reads off. One heavy log
query, of the kind learners run in the Loki module, took RustFS from about 670 to about 900 MiB. Network, disk reads and CPU stayed near zero before and
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
whole day, at most 668 MiB), limit 1536Mi (was 1Gi). One heavy query added about 300 MiB of RSS
that stayed; the limit holds the steady state, the page cache and two such queries in a row (668
+ 2 x 300 = about 1270 MiB) before the kernel has to reclaim cache. That adds 256 MiB of requests on the worker that runs RustFS. On
2026-11-12 the workers had 77 to 88% of their memory requested; worker4, where RustFS runs, would
go from 88% to 93%, over the 90% the owner accepts, so after the restart RustFS should land on
worker2 (77%) or worker3 (79%); the default scheduler scores less requested nodes higher, but this is not certain. Check it after the apply.

### Would Loki's limits be the better place?

For the load, yes; for RustFS's memory, only partly. The lab's Loki runs with the defaults of
these limits (https://grafana.com/docs/loki/v3.7.x/configure/):

- `tsdb_max_query_parallelism` 128 and `max_query_parallelism` 32: how many pieces the
  query-frontend splits one query into and schedules at once.
- `max_concurrent` 4 per querier, with 2 queriers: at most 8 pieces run at the same time, each
  fetching chunks from S3. This is what RustFS sees as concurrent `GetObject` calls.
- `max_query_bytes_read` 0 (no limit): the most bytes one query may fetch. It applies to log
  queries with a filter and to metric queries on TSDB, which covers the query of 11:14.
- `max_chunks_per_query` 2,000,000.

A cap on `max_query_bytes_read` (a few hundred MB fits the lab's 4 GiB of chunks) would stop one
query from reading most of the bucket, and the learner would get a clear error instead of a slow
query; a lower `max_concurrent` or parallelism would spread the reads out over time. Neither
bounds RustFS itself: Mimir's store-gateway and compactor and Tempo's queriers read from it too.
So the RustFS limit stays sized for a heavy query, and Loki's limits are a separate choice for the
Loki module, which may want to show these very errors. Nothing is changed in Loki here.

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
about 5.5 GiB of its 25 GiB, so the score does not see the space worker1 and worker4 really
have free. A
rebuilt lab would do the same.

What does not help: Replica Auto Balance (setting `replica-auto-balance`, or
`volume.spec.replicaAutoBalance`) balances the replicas of one volume across nodes and zones
(https://longhorn.io/docs/1.13.0/high-availability/auto-balance-replicas/). Every Kafka volume
already has its two replicas on two different nodes, so it would move nothing. Its "disk pressure
threshold" moves replicas between disks of the same node, and each worker has one disk.

What does: data locality. Longhorn's page names this case: for distributed applications "in
which high availability is achieved at the application level", "each volume should be scheduled
on the same node as the pod that uses it", and with `best-effort` Longhorn "will try to keep a
replica on the same node as the attached volume"
(https://longhorn.io/docs/1.13.0/high-availability/data-locality/). The three brokers run on
three different workers (worker4, worker1, worker3 today, by the pod anti-affinity of the
KafkaNodePool), so each Kafka volume keeps one replica there and the second wherever the balance
score puts it.

Decision: the role `platform_kafka` sets `dataLocality: best-effort` on each Kafka volume in turn
after the cluster is Ready (real cluster only), and waits until that volume has two running
replicas, one on its broker's node, before it moves to the next. A rebuilt lab gets it from the
same run of `make platform`. It does not touch the StorageClass or Longhorn's global settings, so
no other volume changes. A server-side dry run of the patch was accepted on 2026-11-12.

Expected on today's lab: the volume of broker 0 gets a replica on worker4 and the volume of
broker 1 one on worker1, each losing one on worker2 or worker3; the volume of broker 2 already
has one on worker3. Longhorn's page does not say whether it builds the local replica before it
removes another; the role's wait checks the end state (two running, one local), and the commands
in the pull request watch that each volume stays `healthy` in between.

## Not done

My session's permission rules blocked `make platform TAGS=s3` as a change to the shared
cluster, and the replica moves are changes to the cluster too. Both wait for the owner to run
them or to allow them.
