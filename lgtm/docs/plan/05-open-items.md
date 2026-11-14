# Open items

What is known to be unfinished, unverified or broken. Owned by the planner; a line leaves this file when a pull request closes it. Rewritten on 2026-11-14, before wave 8.

## Lesson actions not yet walked on the lab

None. Every action of m00 to m09 has been done on the lab as a learner would do it: m01, m04 and m06 in pull requests 64, 65, 66 and 68, and m07 to m09 in pull request 72 (card W2). Card W1 (pull request 71) then ran every lab check of m00 to m06 again on the lab's version 3 and corrected the numbers that had changed.

Left alone on purpose: `make reset` (m01 step 20, described from the owner's own run), pushing a delta metric into Mimir (m08), and changing a lab release to settle the inferences of m06, which stay marked `inference` in its log.

## Lab defects

| What | Since | Notes |
|---|---|---|
| After the PC sleeps, new pods cannot start on some nodes | found 2026-11-14, 12:50 UTC, by card C11 | New pods stay in ContainerCreating with `plugin type="calico" failed (add): error getting ClusterInformation: connection is unauthorized`. Running pods are not affected. calico-node (v3.31.4) writes a token for the CNI plugin that is valid 24 hours and renews it after 6 to 12 hours (`node/pkg/cni/token_watch.go`: a quarter of the validity plus as much again at random), counted by a timer that stands still while a VM is paused. The VMs were paused about 14 hours overnight, so on worker2, worker3 and worker4 the token ran out before the renewal came; master1 and worker1 renewed 30 and 15 minutes before theirs ran out. It heals by itself when each node's timer fires, and at once when calico-node is restarted on the node: the planner did that on the three nodes at 13:13 to 13:15 UTC with the owner's word, and no pod has failed to start since. It will come back after any long sleep until card L7 (`cards/w8-l7-pods-start-after-sleep.md`) is done: a shorter renewal (calico-node reads `CNI_TOKEN_REFRESH_INTERVAL`), a `make` target to run after the PC wakes, a check in `make lab-check`, and a line in the runbook and in module m00 step 7. Until then, after a sleep: `kubectl -n calico-system delete pod -l k8s-app=calico-node`. |

The five of 2026-11-13 were closed by card L6 in pull requests 67 and 70: the object store killed for memory about every four hours, the collector gateway unable to scrape the shop's Kafka, the workshop service not stopping on Ctrl+C on Windows, `lgtm/lab/workshop/.venv` not git-ignored, and the workers close to their memory limit.

To watch:

- The object store. RustFS 1.0.5 has run 23 hours without a restart. Its resident memory went 69, 128, 139, 142, 144 MiB and levelled off, with 157 MiB the highest reading, where 1.0.4 reached 1.5 GiB in about four hours. The PC slept part of that time. Look again after wave 8, the first wave that loads Mimir and Loki with practice data.
- cert-manager's controller restarted once on 2026-11-14 at 11:49 UTC with exit code 0, a clean shutdown. Nothing else restarted. It happened two minutes after the VMs came back from the night's pause (Prometheus has no samples from 22:10 UTC on 2026-11-13 to 11:47 UTC on 2026-11-14), which fits a leader lease that ran out while the VM stood still.

## The lab before wave 8

Read on 2026-11-14 at 12:03 UTC.

- Five nodes Ready, every pod ready, no alert firing, every fault flag off, no `learn-` namespace.
- Memory in use: 51 to 56% on the workers, 65% on the control-plane node. Each worker has 2.7 to 3.0 GiB that no pod requests, 11.5 GiB in all. Three modules practise at once in wave 8, so the wave notes hold each of them to 1 GiB.
- The fullest volume is at 29%. The Longhorn disks are 73 to 79% free and every volume is healthy.
- The fault flags cannot be read from the ConfigMap `shop/shop-flags`, which only holds the defaults. The flag screen's API shows the real state.

## Decisions not taken yet

- Native histograms: the lab's Prometheus scrapes classic histograms only; one setting turns native ones on (`prometheus.prometheusSpec.scrapeNativeHistograms`). Module m04 step 8 is a concept step until then.
- Loki's query limits are the defaults. On 2026-11-12 one heavy log query pushed the object store, then RustFS 1.0.4, over its memory limit. Card C11 (module m12) names the limits the lab should set; the owner decides after its pull request.
- The display font of the site states "All rights reserved" in its file and the repository is public; the owner decided to use it.

## How the work is run

- A worker session cannot be started on a turn that an automatic event began (a usage limit reset, another session's message). Wave 7 therefore ran as background agents inside the planner's session. They share one browser pane, so only one of them can use it at a time.
- A worker is refused changes to the shared cluster unless the owner says so in that worker's own session. A card that changes the cluster should have the worker prepare files and a command list first.
- Grafana sign-in is per session and needs the owner.
