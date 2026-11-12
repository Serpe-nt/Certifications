# L5: Kafka gets a ceiling by size

Status: accepted by worker L5 on 2026-11-12.

## Context

The lab's Kafka cluster `telemetry` (Strimzi 1.3.1, Kafka 4.3.2, three dual-role nodes, one
5 GiB Longhorn volume each) filled its volumes on 2026-11-11 and stopped at 17:57 UTC. From then
on Mimir and Tempo stored nothing. Retention was set by time only (`log.retention.hours: 24`,
`log.segment.bytes: 128 MiB`), so nothing was deleted until a record was a day old, whatever
the volumes held.

The write rate changed under it. Prometheus's remote write to Mimir (tenant `prom`) began
sending at 12:15 UTC on 2026-11-11, about 6,100 samples per second, and the Kafka volumes went
from about 90 MiB to about 640 MiB per hour on each node. Each node holds a replica of every
partition (replication factor 3 on 3 nodes), so every node grows by the whole topic's rate.
At that rate 5 GiB lasts about seven hours, far less than the 24 hours of the time limit.

## Facts checked on 2026-11-12

- `retention.bytes` "controls the maximum size a partition ... can grow to before we will
  discard old log segments"; "this limit is enforced at the partition level, multiply it by the
  number of partitions to compute the topic retention in bytes". The broker default is
  `log.retention.bytes`, -1 (no limit). Both it and `log.segment.bytes` can be changed on a
  running cluster (update mode "cluster-wide").
  https://kafka.apache.org/43/configuration/topic-configs/,
  https://kafka.apache.org/43/configuration/broker-configs/
- `segment.bytes`: "Retention and cleaning is always done a file at a time so a larger segment
  size means fewer files but less granular control over retention." The segment being written
  is not deleted, and Kafka deletes the oldest segment only while the partition stays above the
  limit without it ("Log size after deletion will be 671122307"), so a partition can hold its
  limit plus one segment.
  https://kafka.apache.org/43/configuration/topic-configs/
- `log.retention.check.interval.ms` is 5 minutes by default: a partition can pass its limit by
  five minutes of writes before the next check deletes. Same page (broker configs).
- Mimir: each ingester "persists the partition offset up to which it has consumed records in a
  dedicated Kafka consumer group"; after a restart it replays its local WAL and then the Kafka
  backlog since its last committed offset. Kafka therefore has to keep what an ingester has not
  consumed yet, that is, at least the longest time an ingester may be down. Mimir's pages give
  no fixed number.
  https://grafana.com/docs/mimir/latest/get-started/about-grafana-mimir-architecture/about-ingest-storage-architecture/
- Tempo: "Set it high enough to cover the block-builder's consumption cycle time (plus buffer
  for failures and restarts) and the live-store's replay window on startup." The block-builder's
  `consume_cycle_duration` is 5 minutes by default; the live-store keeps completed blocks for
  `complete_block_timeout`, 20 minutes by default.
  https://grafana.com/docs/tempo/latest/reference-tempo-architecture/components/kafka/,
  https://grafana.com/docs/tempo/latest/configuration/
- Strimzi: "Persistent volumes can be resized by changing the size storage property without any
  risk of data loss, as long as the storage infrastructure supports it"; the operator then
  restarts the pods that use them. Volumes cannot shrink.
  https://strimzi.io/docs/operators/latest/deploying (1.3.1, "Resizing persistent volumes")
- Longhorn 1.13 expands an attached volume online, block device first, then the filesystem.
  The StorageClass `longhorn` allows expansion.
  https://longhorn.io/docs/1.13.0/nodes-and-volumes/volumes/expansion/

## Options

1. **Keep 5 GiB and add a size limit.** About 3.5 GiB (70%) for 8 partitions: at most 320 MiB
   per partition with 64 MiB segments, about 1.5 hours of Mimir data at today's rate. It does
   not get the full brokers going again: they need free space to start, so it needs a manual
   step inside a crash-looping pod first.
2. **Larger volumes only.** Puts the problem off: at 640 MiB per hour, 24 hours need 15 GiB per
   node, and the next lesson that adds load fills it again.
3. **Larger volumes and a size limit** (chosen). Growing the volumes is also what gets the full
   brokers out of the crash loop, with the lab's own command. One manual step was still needed:
   deleting the three pods together so that they form a quorum (`runbook.md`).

## Decision

- `storage_size: 10Gi` (was 5Gi) for the three nodes.
- `log.retention.bytes: 671088640` (640 MiB per partition), `log.segment.bytes: 67108864`
  (64 MiB, was 128 MiB), `log.retention.hours: 24` stays as a second limit.
- The kind profile (one node, 2 GiB): 100 MiB per partition, 32 MiB segments.
- On the real cluster, a Longhorn RecurringJob `kafka-trim` trims the three volumes every hour
  (section "Longhorn and trimming").

The arithmetic for one node of the real cluster, where every partition has a replica:

| Part | Size |
|---|---:|
| `mimir-ingest`, 6 partitions x (640 + 64) MiB | 4224 MiB |
| `tempo-traces`, 2 partitions x (640 + 64) MiB | 1408 MiB |
| Five minutes of writes between two retention checks, at 680 MiB per hour | 57 MiB |
| `__consumer_offsets` (50 partitions) and the KRaft metadata log `__cluster_metadata`, measured | 22 MiB |
| **Worst case** | **5711 MiB** |
| Filesystem of a 10 GiB volume (`df`) | 9993 MiB |
| **Share of the volume** | **57%**, under the 70% the card asks for |

On kind (one node, 2 GiB): 8 x (100 + 32) MiB = 1056 MiB, about 55% of the volume.

## Measured on 2026-11-12

Segment files on node 0, read every five minutes from 12:04 to 13:14 UTC (`stat` of every
`*.log` file; growth is what the files gained, so deleted segments do not count against it):

| Topic | Written per hour on one node | Per partition | Time the size limit keeps |
|---|---:|---:|---:|
| `mimir-ingest` | 590 MiB (794 in the first five minutes, while Prometheus caught up; 571 to 578 from 12:34 on) | 196 to 197 MiB in each of partitions 0, 1, 2; partitions 3 to 5 receive nothing (three ingesters) | about 3.2 hours (640 MiB / 197 MiB) |
| `tempo-traces` | 89 MiB | 44 to 45 MiB | about 14 hours |
| `__consumer_offsets`, `__cluster_metadata` | 2 MiB | | compacted, not limited by size |

Tenant `prom` (Prometheus's remote write, about 5,700 samples per second) is most of
`mimir-ingest`. Three hours is far longer than Tempo's 5-minute consumption cycle and 20-minute
replay window, and longer than an ingester is normally down in the lab (a pod restart takes
minutes; with the VMs stopped nothing is written). An ingester down for more than about three
hours loses the oldest records it had not read.

Until the segments written before the change are gone, the oldest segment of a partition is a
128 MiB one, and a partition holds up to 640 + 128 MiB (754 to 765 MiB at 13:14). The worst case
in those first hours is 8 x 768 MiB + 79 MiB = 6223 MiB, 62% of the volume; at today's rate the
old segments are gone about 3.5 hours after the change.

Kafka at the limit: the first retention check after the change (12:02:41) logged
`Deleting segment LogSegment(baseOffset=0, size=134204839, ...) due to log retention size
671088640 breach. Log size after deletion will be 1346908842.` and deleted 18 segments of
`mimir-ingest` on node 1; nodes 0 and 2 deleted the same segments a moment later (`Deleting
segments due to log start offset ... breach`). From then on the volumes stayed between 28% and 31% used (12:04 to
13:14), and every retention check deleted a segment or two (`... due to log retention size
671088640 breach. Log size after deletion will be 671122307.` at 13:17:41). No temporary low limit was needed: the real limit was
reached at once, because the volumes still held the data from before the outage.

## Longhorn and trimming

Growing the volumes created a Longhorn system snapshot of about 4.4 GiB on each of them
(`expand-10737418240-...`), and Longhorn never gives back a block the filesystem has freed until
the filesystem is trimmed. A Kafka replica would therefore grow towards 10 GiB plus that
snapshot, and all six replicas sit on worker2 and worker3, whose Longhorn disks had 11.5 and
9.8 GiB free. Longhorn trims "the volume head" and the "preceding continuous chain of snapshots
created by the system or marked as removed", and a RecurringJob can do it on a schedule
(https://longhorn.io/docs/1.13.0/nodes-and-volumes/volumes/trim-filesystem/,
https://longhorn.io/docs/1.13.0/snapshots-and-backups/scheduling-backups-and-snapshots/).
The role `platform_kafka` installs the RecurringJob `kafka-trim` (task `filesystem-trim`, every
hour at minute 7, group `kafka`), and the KafkaNodePool labels the claims
`recurring-job.longhorn.io/source: enabled` and `recurring-job-group.longhorn.io/kafka: enabled`,
so Longhorn copies the group to the volumes. The first run (12:19) took the replicas from
6.1 GB to 3.9 GB, marked the expansion snapshots removed, and gave worker2 and worker3 16.1 and
14.5 GiB free. After the second run (13:07) the replicas were 3.7 to 4.2 GB, the expansion
snapshots 2.5 to 3.0 GiB, and worker2 and worker3 had 17.2 and 15.6 GiB free.

## Consequences

- Kafka keeps less than 24 hours when the lab writes a lot. An ingester or block-builder that is
  down for longer than the time the size limit keeps loses the records it has not read; Mimir and
  Tempo still store everything they had consumed.
- Longhorn holds two replicas of each volume: the three volumes may now take 60 GiB of Longhorn
  space instead of 30 GiB on paper. With the size limit and the hourly trim, a replica holds
  about what Kafka keeps plus an hour of writes, about 6.5 GiB at most.
- The Longhorn RecurringJob lives in `longhorn-system`, outside the namespace `kafka`, but only
  the volumes of the group `kafka` join it.
- A third limit watches all volumes: `make lab-check` fails above 85%, and the alert
  `LabVolumeFillingUp` (lab-glue) fires at the same threshold.
