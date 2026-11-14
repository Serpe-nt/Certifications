# Open items

What is known to be unfinished, unverified or broken. Owned by the planner; a line leaves this file when a pull request closes it. Rewritten on 2026-11-14, before wave 8; brought up to date the same day, after it.

## Lesson actions not yet walked on the lab

None. Every action of m00 to m09 has been done on the lab as a learner would do it: m01, m04 and m06 in pull requests 64, 65, 66 and 68, and m07 to m09 in pull request 72 (card W2). Card W1 (pull request 71) then ran every lab check of m00 to m06 again on the lab's version 3 and corrected the numbers that had changed.

Modules m10, m11 and m12 (wave 8, pull requests 79, 82 and 81) were run on the lab by their own workers, with the owner's go-ahead in each session; no row in their logs is unverified.

Left alone on purpose: `make reset` (m01 step 20, described from the owner's own run), pushing a delta metric into Mimir (m08), and changing a lab release to settle the inferences of m06, which stay marked `inference` in its log.

## Lesson defects

None open. Two faults between a lesson's source and its page were found in wave 8 by cards C9 and C10 and closed by card W3 (pull request 86): a manifest in a multi-line `<Cmd>` lost its indentation, and a command written as plain text got typographic quotes and dashes. Fifty-four blocks in m01, m03 and m06 to m09 were repaired. `npm run build` now ends with `check:pages`, which compares every command, query and fenced block on the built page with its source, and `check:content` refuses both forms.

## Lab defects

| What | Since | Notes |
|---|---|---|
| After the PC sleeps, new pods cannot start on some nodes | found 2026-11-14, 12:50 UTC, by card C11 | New pods stay in ContainerCreating with `plugin type="calico" failed (add): error getting ClusterInformation: connection is unauthorized`. Running pods are not affected. calico-node (v3.31.4) writes a token for the CNI plugin that is valid 24 hours and renews it after 6 to 12 hours (`node/pkg/cni/token_watch.go`: a quarter of the validity plus as much again at random), counted by a timer that stands still while a VM is paused. The VMs were paused about 14 hours overnight, so on worker2, worker3 and worker4 the token ran out before the renewal came; master1 and worker1 renewed 30 and 15 minutes before theirs ran out. It heals by itself when each node's timer fires, and at once when calico-node is restarted on the node: the planner did that on the three nodes at 13:13 to 13:15 UTC with the owner's word, and no pod has failed to start since. It will come back after any long sleep until card L7 (`cards/w8-l7-pods-start-after-sleep.md`) is done: a shorter renewal (calico-node reads `CNI_TOKEN_REFRESH_INTERVAL`), a `make` target to run after the PC wakes, a check in `make lab-check`, and a line in the runbook and in module m00 step 7. Until then, after a sleep: `kubectl -n calico-system delete pod -l k8s-app=calico-node`. |

The five of 2026-11-13 were closed by card L6 in pull requests 67 and 70: the object store killed for memory about every four hours, the collector gateway unable to scrape the shop's Kafka, the workshop service not stopping on Ctrl+C on Windows, `lgtm/lab/workshop/.venv` not git-ignored, and the workers close to their memory limit.

To watch:

- The object store. RustFS 1.0.5 has run 27 hours without a restart, where 1.0.4 reached 1.5 GiB in about four. Its resident memory was level at about 144 MiB before wave 8 and stood at 180 MiB four hours after the wave's log bursts, with 236 MiB the highest reading. That may be the new level for more objects or a slow climb: read it again the morning after.
- The Loki ingesters. The burst of module m12 step 12 (5,000 streams in the tenant `learn-m12`) took each ingester from about 135 MiB to as much as 559 MiB. Three and a half hours later no practice stream is left in memory (51 streams, all of tenant `lab`), yet each ingester still holds 360 to 440 MiB, with 320 to 390 MiB of its heap in use. Their request is 384Mi and their limit 1Gi. The lesson says they stayed near 400 MiB for more than half an hour, which is true and too mild. Read them again the morning after; then either the lesson says how long it lasts, or `budget.md` counts it.
- Mimir discards samples of tenant `prom`: about 30,000 per ingester since the rebuild with the reason `new-value-for-timestamp`, and about 130 as `sample-out-of-order` (`cortex_discarded_samples_total` on the ingesters, read during the QA of m11). Two senders or two series that end up with the same labels would explain it. Nobody has looked yet.
- cert-manager's controller restarted once on 2026-11-14 at 11:49 UTC with exit code 0, a clean shutdown. Nothing else restarted. It happened two minutes after the VMs came back from the night's pause (Prometheus has no samples from 22:10 UTC on 2026-11-13 to 11:47 UTC on 2026-11-14), which fits a leader lease that ran out while the VM stood still. Card L7 looks at what else a pause touches.

## The lab after wave 8

Read on 2026-11-14 at 16:48 UTC.

- Five nodes Ready, every pod ready, no alert firing, every fault flag off, no `learn-` namespace, no practice rule group or delete request left in Loki or Mimir.
- Memory in use: 55 to 61% on the workers, 65% on the control-plane node. Each worker has 2.7 to 3.0 GiB that no pod requests. The cap of 1 GiB of practice requests per module held with three modules at once.
- The fullest volume is at 30%.
- The fault flags cannot be read from the ConfigMap `shop/shop-flags`, which only holds the defaults. The flag screen's API shows the real state.
- The practice tenants `learn-m10`, `learn-m11` and `learn-m12` exist in Loki, Mimir and Tempo until retention removes their data (48 hours for logs, 7 days for metrics).

## Decisions not taken yet

- Native histograms: the lab's Prometheus scrapes classic histograms only; one setting turns native ones on (`prometheus.prometheusSpec.scrapeNativeHistograms`). Module m04 step 8 is a concept step until then.
- Loki's query limits are the defaults, except `query_timeout: 5m` and `split_queries_by_interval: 15m` from the chart. On 2026-11-12 one heavy log query pushed the object store, then RustFS 1.0.4, over its memory limit. Card C11 proposes, in the text of pull request 81 with the reason and the page for each: `max_query_bytes_read` 500MB (0, off, today), `max_querier_bytes_read` 150MB (150GB), `tsdb_max_query_parallelism` 16 (128), `max_query_parallelism` 8 (32), `max_query_length` 49h (30d1h), `query_timeout` 1m (5m), and optionally `querier.max_concurrent` 2 (4). The first alone would have stopped that query. If the lab takes them, one sentence and the check of module m12 step 15 follow, because the step teaches that the limit is off on this lab.
- Mimir's cardinality API is off for every tenant of the lab, so module m11 step 9 finds the expensive metrics with PromQL. `cardinality_analysis_enabled: true` for tenant `lab` in the runtime overrides would let the step use the API (card C10's suggestion).
- Tenant `prom` holds no exemplars: the lab's Prometheus sends them (`sendExemplars`) but does not store any, for lack of `--enable-feature=exemplar-storage`. Module m11 step 12 follows an exemplar of tenant `lab`. Switching the feature on is one value of the Prometheus release (card C10's suggestion).
- Mimir runs one ingester per partition and no zones, so reads of recent data fail for about ten seconds when an ingester restarts, while writes go on (seen by card C10 at 12:31 UTC on 2026-11-14; module m11 step 13 teaches it). Two zones would need three more ingesters. Left as it is unless the owner wants the lab to show the other behaviour.
- The display font of the site states "All rights reserved" in its file and the repository is public; the owner decided to use it.

## How the work is run

- A worker session cannot be started on a turn that an automatic event began (a usage limit reset, another session's message). Wave 7 therefore ran as background agents inside the planner's session. They share one browser pane, so only one of them can use it at a time.
- A worker is refused changes to the shared cluster unless the owner says so in that worker's own session. A card that changes the cluster should have the worker prepare files and a command list first.
- Grafana sign-in is per session and needs the owner.
- Workers test their lessons from their own files and terminals, so a fault between the source and the page escapes them: wave 8 found two (lost indentation, typographic quotes and dashes). Since card W3 the build itself compares every block on the page with its source (`check:pages`).
- An independent fact check of every step and every question, two read-only agents per module, found 7 errors in wave 8 that the workers' own checks of five steps had missed. Three of them were statements the vendor's documentation makes and the software does not do; the lab settled each.
