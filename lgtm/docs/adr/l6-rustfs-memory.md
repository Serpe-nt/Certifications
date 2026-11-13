# L6: RustFS 1.0.5 for the object store's memory

Status: accepted by worker L6 on 2026-11-13. To be confirmed on the rebuilt lab (card L6, part 2).

## Context

The lab's object store, RustFS 1.0.4 (one pod, one Longhorn volume, namespace `s3`), is
OOM-killed every few hours. Card L5b raised its limit from 1Gi to 1536Mi
(`l5b-rustfs-memory.md`); that only moved the kill later. What the lab's Prometheus shows
(`container_memory_rss`, container `rustfs`, hourly samples, read on 2026-11-13):

| When (UTC) | RSS |
|---|---:|
| 2026-11-12 12:07, after the kill of 12:06 | 239 MiB |
| 2026-11-12 13:07 to 23:07 | 318 to 583 MiB |
| 2026-11-13 00:07 | 1025 MiB |
| 2026-11-13 01:07 | 1478 MiB, then killed at 01:10 at the 1536Mi limit |
| 2026-11-13 10:07 to 12:07, a pod started at about 10:00 | 779 to 916 MiB |

Three restarts in 36 hours, all at the limit. Network and disk traffic stay small (L5b measured
under 0.3 MiB/s), and nothing unusual ran before the kill of 01:10. The memory goes up in steps
with ordinary work (Loki, Mimir and Tempo writing, listing and deleting blocks) and does not come
back down until the process restarts.

## Cause

This is a known retention in RustFS 1.0.4 on a single drive, reported upstream with the same
shape as the lab's:

- rustfs/rustfs#9145 (open, 2026-11-03), "Single drive 1.0.4: anonymous memory accumulates across
  list / PUT / DeleteObjects and is never released, OOM at 1.5 GiB after two rounds": each step
  starts from the previous step's high-water mark, and "Raising the limit from 1 GiB to 1.5 GiB
  only delayed the OOM by one round". A second reporter sees the same on a much larger single
  volume. https://github.com/rustfs/rustfs/issues/9145
- rustfs/rustfs#9086 (closed 2026-11-04), resident memory grows with each write burst on 1.0.4 and
  is released only by a restart. A maintainer found one cause, invalidation predicates of the
  file-descriptor cache that are never cleaned up, and fixed it in pull request 9112.
  https://github.com/rustfs/rustfs/issues/9086

The maintainers have not reproduced #9145 exactly, and found two more defects while looking for
it (buffer pool accounting, pull request 9171). So the cause is known in part: some of the
retention is fixed, the rest is not proven.

## What RustFS 1.0.5 changes

RustFS 1.0.5 was released on 2026-11-10, with chart `rustfs` 1.0.5 on https://charts.rustfs.com
(index read on 2026-11-13). Its release notes
(https://github.com/rustfs/rustfs/releases/tag/1.0.5) include, among others:

- 9112 `fix(ecstore): release retained file descriptor cache invalidations`, the fix from #9086;
- 9171 `fix(io-core): preserve pooled capacity and accounting`, the buffer pool defects;
- 9211 `fix(runtime): release retained replay and allocator memory`: on Linux the allocator now
  gives free memory back at once by default (immediate purge);
- 9232 `fix(cache): respect process cgroup memory limits`, for the sizing of the automatic object
  cache under nested cgroup limits;
- 8971 `fix(scanner): reduce memory retention and redundant scan work` and 9193
  `fix(scanner): bound wide bucket-root fanout memory`.

The chart's diff from 1.0.4 to 1.0.5 adds optional scanner settings, `minReadySeconds` (45 s)
and documentation; nothing the lab sets changes meaning.

Known open issues of 1.0.5, from the issue tracker on 2026-11-13: listing a bucket of 622,000
small objects returns 503 (#9395), and stalls of tens of seconds on an idle node mark the only
drive faulty (#9365). The lab's buckets hold far fewer objects, and #9365 depends on drive
timeouts the lab does not change. Both are worth watching after the rebuild.

## Options

1. **A RustFS setting that bounds memory.** The environment reference
   (https://docs.rustfs.com/reference/environment-variables, read on 2026-11-13) still has no
   memory cap. Not available.
2. **A higher limit now that the workers have 8 GB.** The data above, and #9145, show the memory
   climbing to whatever limit it has. A higher limit only moves the kill later. Not chosen alone.
3. **RustFS 1.0.5** (chosen). It carries the fixes for the retention paths that upstream has
   found, and the rebuild installs it anyway.
4. **A scheduled restart** (a CronJob that restarts the Deployment at night). It works with any
   version, but it makes S3 unavailable for a minute on a timer and hides the problem. Kept as
   the fallback.
5. **Another store** (Garage, Silo; `l2-s3-store.md`). A larger change to the platform and to
   every lesson that mentions RustFS. Not now.

## Decision

Chart and image `rustfs` 1.0.5 (`lgtm/lab/helm/platform/versions.yml`). Request 768Mi and limit
1536Mi stay as they are: with the same limit, the measurement after the rebuild shows whether
1.0.5 holds its memory, instead of a larger limit hiding the climb for a few more hours.

How it is judged, in card L6 part 2: RSS of `rustfs` over the hour after `make lab-check`, and
again after a few hours of normal use. If it climbs in steps and stays up as 1.0.4 did, the next
step is the scheduled restart of option 4, and a note on #9145 with the lab's numbers.
