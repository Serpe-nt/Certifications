# Open items

What is known to be unfinished, unverified or broken. Owned by the planner; a line leaves this file when a pull request closes it. Rewritten on 2026-11-14, before wave 8; brought up to date the same day, after it.

## Lesson actions not yet walked on the lab

None. Every action of m00 to m09 has been done on the lab as a learner would do it: m01, m04 and m06 in pull requests 64, 65, 66 and 68, and m07 to m09 in pull request 72 (card W2). Card W1 (pull request 71) then ran every lab check of m00 to m06 again on the lab's version 3 and corrected the numbers that had changed.

Modules m10, m11 and m12 (wave 8, pull requests 79, 82 and 81) were run on the lab by their own workers, with the owner's go-ahead in each session; no row in their logs is unverified.

Left alone on purpose: `make reset` (m01 step 20, described from the owner's own run), pushing a delta metric into Mimir (m08), and changing a lab release to settle the inferences of m06, which stay marked `inference` in its log.

## Lesson defects

None open. Two faults between a lesson's source and its page were found in wave 8 by cards C9 and C10 and closed by card W3 (pull request 86): a manifest in a multi-line `<Cmd>` lost its indentation, and a command written as plain text got typographic quotes and dashes. Fifty-four blocks in m01, m03 and m06 to m09 were repaired. `npm run build` now ends with `check:pages`, which compares every command, query and fenced block on the built page with its source, and `check:content` refuses both forms.

## Lab defects

None open. New pods could not start on some nodes after the PC had slept (found on 2026-11-14 by card C11): Calico 3.31.4 renewed its 24-hour token for the CNI plugin only every 6 to 12 hours of running time, and a 14-hour pause outlasted it. Card L7 (pull request 91) moved the lab to Calico 3.31.7, which renews the token whenever kubelet rotates calico-node's own, seen on all five nodes 48 to 49 minutes after their start. A sleep of up to about 23 hours does no harm; after a longer one, `make calico-renew`. `make lab-check` names the fault. Still owed: the record after a real night's sleep, which card L7 adds to `acceptance-cluster.md` in a follow-up pull request.

The five of 2026-11-13 were closed by card L6 in pull requests 67 and 70: the object store killed for memory about every four hours, the collector gateway unable to scrape the shop's Kafka, the workshop service not stopping on Ctrl+C on Windows, `lgtm/lab/workshop/.venv` not git-ignored, and the workers close to their memory limit.

To watch:

- The object store. RustFS 1.0.5 has run 27 hours without a restart, where 1.0.4 reached 1.5 GiB in about four. Its resident memory was level at about 144 MiB before wave 8 and stood at 180 MiB four hours after the wave's log bursts, with 236 MiB the highest reading. That may be the new level for more objects or a slow climb: read it again the morning after.
- The Loki ingesters. The burst of module m12 step 12 (5,000 streams in the tenant `learn-m12`) took each ingester from about 135 MiB to as much as 559 MiB, and three and a half hours later, with no practice stream left in memory, each still held 360 to 440 MiB (request 384Mi, limit 1Gi). Card L8's upgrade then restarted them, and they are back under 200 MiB, so how long the memory would have stayed is not known. The lesson says more than half an hour. Measure it the next time someone runs the burst and leaves the ingesters alone.
- Mimir discarded about 60,000 samples of tenant `prom` (`new-value-for-timestamp` and `sample-out-of-order` on two ingesters). Card L8 found that all of it happened in the one minute the VMs came back from the night's pause, when Prometheus's first scrapes and staleness markers met samples with the same timestamps; the counters have not moved since. A burst at each wake, not a steady loss. Nothing to fix.
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
- Done on 2026-11-14 by card L8 (pull request 90): Loki's query limits (`max_query_bytes_read` 500MB, `max_querier_bytes_read` 150MB, `tsdb_max_query_parallelism` 16, `max_query_parallelism` 8, `max_query_length` 49h, `query_timeout` 1m; `max_concurrent` stays at 4) and Mimir's cardinality API for tenant `lab`. Exemplar storage in Prometheus was not switched on: no scrape target of the lab exposes an exemplar, so it would store nothing. Module m12 step 15 and module m11 step 9 follow the lab.
- Mimir runs one ingester per partition and no zones, so reads of recent data fail for about ten seconds when an ingester restarts, while writes go on (seen by card C10 at 12:31 UTC on 2026-11-14; module m11 step 13 teaches it). Two zones would need three more ingesters. Left as it is unless the owner wants the lab to show the other behaviour.
- The display font of the site states "All rights reserved" in its file and the repository is public; the owner decided to use it.

## How the work is run

- A worker session cannot be started on a turn that an automatic event began (a usage limit reset, another session's message). Wave 7 therefore ran as background agents inside the planner's session. They share one browser pane, so only one of them can use it at a time.
- A worker is refused changes to the shared cluster unless the owner says so in that worker's own session. A card that changes the cluster should have the worker prepare files and a command list first.
- Grafana sign-in is per session and needs the owner.
- In a new worktree `make lab-lint` needs `ansible-galaxy collection install ... --force`: Galaxy skips `kubernetes.core` as already installed when it finds the owner's copy under `~/.ansible`, while the playbook looks only in the worktree's `ansible/.ansible/collections` (seen by card L8).
- Workers test their lessons from their own files and terminals, so a fault between the source and the page escapes them: wave 8 found two (lost indentation, typographic quotes and dashes). Since card W3 the build itself compares every block on the page with its source (`check:pages`).
- An independent fact check of every step and every question, two read-only agents per module, found 7 errors in wave 8 that the workers' own checks of five steps had missed. Three of them were statements the vendor's documentation makes and the software does not do; the lab settled each.
