# L5b: RustFS gets the memory it uses; Kafka's replicas and Longhorn

Status: accepted by worker L5 and the planner on 2026-11-12; applied to the lab the same day,
21:02 to 21:14 UTC, with the owner's go-ahead (see "Applied").

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
3. 2026-11-12 about 19:42 and 20:30:15 UTC, exit 137 twice more, with RSS at 1007 to 1014 MiB
   (30-minute maxima), against the same 1Gi limit, before the new limit was applied.

The memory, from the lab's Prometheus (`container_memory_rss` and
`container_memory_working_set_bytes`, container `rustfs`, 30-minute steps):

| When (UTC) | RSS | Working set (RSS and page cache) |
|---|---:|---:|
| 2026-11-10, 30 minutes of load (L4) | | 449 MiB |
| 2026-11-11 20:00 to 2026-11-12 11:10 | 430 to 480 MiB | 530 to 668 MiB |
| 2026-11-12 11:40 | 772 MiB | 918 MiB |
| 2026-11-12 12:02 | | 993 MiB |
| 2026-11-12 12:10 to 13:10, after the restart | 365 to 430 MiB | 480 to 620 MiB |
| 2026-11-12 16:00 to 19:30 | 565 to 640 MiB | 733 to 885 MiB |
| 2026-11-12 20:00 to 21:00 | 1007 to 1014 MiB | 1023 MiB, at the limit |

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
+ 2 x 300 = about 1270 MiB) before the kernel has to reclaim cache. That adds 256 MiB of requests on the worker that runs RustFS. On 2026-11-12 the workers had 77
to 88% of their memory requested. After the apply RustFS runs on worker2, which went to 90%
(5266Mi), exactly the owner's ceiling; worker4, where it ran before, went to 80%. If worker2 must
take more, moving RustFS back to worker4 or lowering a request on worker2 is the next step.

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

What happened on the lab (21:05:46 to 21:08:58 UTC): the volume of broker 0 got a replica on
worker4 and the volume of broker 1 one on worker1; the volume of broker 2 already had one on
worker3. For each volume Longhorn built the local replica first (three running for about half a
minute) and then removed one, both times the replica on worker3. Every volume stayed `healthy`,
each move took about a minute (the hourly trim keeps the replicas near 4 GB), and the Kafka pods
did not restart.

A check backs it up, whatever places the replicas: `make lab-check` check 9
(`tests/lab/longhorn-disks.sh`) fails when a Longhorn disk has less than 25% free; Longhorn stops
scheduling at 15%. `runbook.md`, "A Longhorn disk is short of space", says what to do.

Options not chosen:

- A StorageClass for Kafka with Longhorn node or disk tags (`nodeSelector`, `diskSelector`; the
  scheduling page above). The tags have to be kept right when workers change, and Strimzi changes
  a pool's storage class only by adding a new pool, "currently ... only possible for broker-only
  node pools" (https://strimzi.io/docs/operators/latest/deploying); this pool is dual-role, so it
  would mean rebuilding Kafka.
- One Longhorn replica per Kafka volume, with data locality: Kafka already keeps three copies,
  and the data locality page describes this for applications that replicate themselves. It would
  halve Kafka's Longhorn space, but losing a worker then loses that broker's disk, and Kafka
  copies the partitions back when the broker returns. It needs a StorageClass with
  `numberOfReplicas: "1"`, so the same Strimzi limit applies. The first choice if the lab is ever
  rebuilt for another reason.

## Applied

The worker's session first could not change the shared cluster; the owner then said "go ahead"
in it. In order, on 2026-11-12 (UTC):

1. `make platform TAGS=s3`, 21:02:08 to 21:05:07, `changed=1`. RustFS was down for about a
   minute and back at about 21:04:20 on worker2, request 768Mi and limit 1536Mi, no restart. No
   upload, flush or error lines in the Mimir and Loki ingesters or the Tempo block-builders in
   the ten minutes after. Worker2 then had 90% of its memory requested (5266Mi), the owner's
   ceiling; worker4, where RustFS ran before, went from 88% to 80%.
2. `make lab-check`, 21:05: `LAB CHECK PASSED`, checks 8 and 9 included.
3. `make platform TAGS=kafka`, 21:05:46 to 21:08:58, `changed=3` (the three volumes).
4. `make platform TAGS=s3` and `make platform TAGS=kafka` again, 21:09 to 21:14: both
   `changed=0`. `make lab-check`, 21:13:53: `LAB CHECK PASSED`.

Longhorn's disks, free space (`storageAvailable`, GiB of 39.1):

| | worker1 | worker2 | worker3 | worker4 |
|---|---:|---:|---:|---:|
| Kafka replicas before | 0 | 3 | 3 | 0 |
| Free before, 21:01 | 19.2 (49%) | 16.0 (41%) | 15.1 (39%) | 23.8 (61%) |
| Kafka replicas after | 1 | 3 | 1 | 1 |
| Free after, 21:09 | 16.1 (41%) | 17.4 (44%) | 22.7 (58%) | 20.7 (53%) |

The lowest disk went from 39% to 41% free, and the spread from 22 to 17 points. Worker2 kept its
three Kafka replicas because Longhorn removed the worker3 copies both times; it is the disk and
the node to watch.
