# Open items

What is known to be unfinished, unverified or broken. Owned by the planner; a line leaves this file when a pull request closes it. Rewritten on 2026-11-14, before wave 8; brought up to date that day after wave 8 and again after wave 9.

## Lesson actions not yet walked on the lab

None. Every action of m00 to m09 has been done on the lab as a learner would do it: m01, m04 and m06 in pull requests 64, 65, 66 and 68, and m07 to m09 in pull request 72 (card W2). Card W1 (pull request 71) then ran every lab check of m00 to m06 again on the lab's version 3 and corrected the numbers that had changed.

Modules m10, m11 and m12 (wave 8, pull requests 79, 82 and 81) were run on the lab by their own workers, with the owner's go-ahead in each session; no row in their logs is unverified.

Modules m13, m14 and m15 (wave 9, pull requests 93, 94 and 95) were run on the lab by their own workers, fault flags included; no row in their logs is unverified. One statement of m14 step 5 rests on Grafana's source and not on a walk: that Grafana 13.3 offers the trace-to-metrics buttons also on a span that has none of the mapped tags, with an empty filter, where Grafana's page says no link appears. It is marked `inference`; a data source of one's own with a tag no span has would settle it in five minutes with a Grafana sign-in.

Left alone on purpose: `make reset` (m01 step 20, described from the owner's own run), pushing a delta metric into Mimir (m08), and changing a lab release to settle the inferences of m06, which stay marked `inference` in its log.

## Lesson defects

None open. Two faults between a lesson's source and its page were found in wave 8 by cards C9 and C10 and closed by card W3 (pull request 86): a manifest in a multi-line `<Cmd>` lost its indentation, and a command written as plain text got typographic quotes and dashes. Fifty-four blocks in m01, m03 and m06 to m09 were repaired. `npm run build` now ends with `check:pages`, which compares every command, query and fenced block on the built page with its source, and `check:content` refuses both forms.

## Lab defects

| What | Since | Notes |
|---|---|---|
| One trace of the shop grows for days and can kill Tempo's querier | found 2026-11-14 by card L9 | Payment starts its flag provider inside the first order's `charge` span, so every event stream the provider opens to flagd, one about every ten minutes, joins that order's trace. A lookup of the trace by its ID reads every block and killed the querier twice at 18:26 UTC (limit 768Mi). A search for payment's errors lists the trace, with `<root span not yet received>`; a learner of m13 or m14 can open it. The runbook has a section; card L10 (`cards/w10-l10-payment-trace.md`) is the fix. The same event-stream spans end with an error status every ten minutes in ad, fraud-detection, payment and recommendation, so a quiet shop is not free of error spans; L10 decides what the lab should show. |

Closed on 2026-11-14 by card L9 (pull request 98): a fault flag did not reach product-catalog until the pod was restarted. The Go provider gives its start 500 ms; product-catalog's container started two seconds before flagd's, the start failed, and the part that reads flag changes never ran, so every flag kept its first value for the life of the pod. Six services now ask flagd at every evaluation (`FLAGD_CACHE=disabled`), and a flag reaches each within about 15 seconds; the runbook says what to do if one does not.

Closed on 2026-11-14: new pods could not start on some nodes after the PC had slept (found on 2026-11-14 by card C11): Calico 3.31.4 renewed its 24-hour token for the CNI plugin only every 6 to 12 hours of running time, and a 14-hour pause outlasted it. Card L7 (pull request 91) moved the lab to Calico 3.31.7, which renews the token whenever kubelet rotates calico-node's own, seen on all five nodes 48 to 49 minutes after their start. A sleep of up to about 23 hours does no harm; after a longer one, `make calico-renew`. `make lab-check` names the fault. The night of 2026-11-14 proved it: the VMs were paused for 12.5 hours, every calico-node wrote a new token within seconds of the wake at 11:52 UTC, and no pod was refused. Card L7 adds that record to `acceptance-cluster.md` in a follow-up pull request.

The five of 2026-11-13 were closed by card L6 in pull requests 67 and 70: the object store killed for memory about every four hours, the collector gateway unable to scrape the shop's Kafka, the workshop service not stopping on Ctrl+C on Windows, `lgtm/lab/workshop/.venv` not git-ignored, and the workers close to their memory limit.

To watch:

- The object store. RustFS 1.0.5 has run two days without a restart. Its resident memory rose with use, 144 MiB before wave 8, 180 after it, 247 after wave 9, and was back at 206 MiB the next afternoon after a quiet night (limit 1536Mi). It gives memory back, so it is not the old leak.
- flagd answers every flag evaluation since card L9: its CPU went from 0.004 to 0.011 cores (limit 200m). Look again after a day of load.
- The control-plane node uses about 70% of its memory.
- The Loki ingesters. The burst of module m12 step 12 (5,000 streams in the tenant `learn-m12`) took each ingester from about 135 MiB to as much as 559 MiB, and three and a half hours later, with no practice stream left in memory, each still held 360 to 440 MiB (request 384Mi, limit 1Gi). Card L8's upgrade then restarted them, and they are back under 200 MiB, so how long the memory would have stayed is not known. The lesson says more than half an hour. Measure it the next time someone runs the burst and leaves the ingesters alone.
- Mimir discarded about 60,000 samples of tenant `prom` (`new-value-for-timestamp` and `sample-out-of-order` on two ingesters). Card L8 found that all of it happened in the one minute the VMs came back from the night's pause, when Prometheus's first scrapes and staleness markers met samples with the same timestamps; the counters have not moved since. A burst at each wake, not a steady loss. Nothing to fix.
- cert-manager's controller restarted once on 2026-11-14 at 11:49 UTC with exit code 0, a clean shutdown. Nothing else restarted. It happened two minutes after the VMs came back from the night's pause (Prometheus has no samples from 22:10 UTC on 2026-11-13 to 11:47 UTC on 2026-11-14), which fits a leader lease that ran out while the VM stood still. Card L7 looks at what else a pause touches.

## The lab after wave 9

Read on 2026-11-14 at 22:22 UTC.

- Five nodes Ready, every pod ready, no alert firing, every fault flag off, no `learn-` namespace, no rule group left in the rulers of Mimir or Loki, the shop at zero errors.
- Nine flag windows ran in the wave, one at a time, each within the 15 minutes allowed. One pod restarted because of them, as its lesson says it will: recommendation, killed for memory twice by `recommendationCacheFailure`.
- Memory in use: 55 to 58% on the workers, 71% on the control-plane node. Each worker has 2.7 to 3.2 GiB that no pod requests.
- The fullest volume is at 31%.
- The fault flags cannot be read from the ConfigMap `shop/shop-flags`, which only holds the defaults. The flag screen's API shows the real state.
- The practice tenants `learn-m10` to `learn-m13` and the recorded series `learn_m15:*` in tenant `lab` exist until retention removes them (48 hours for logs and traces, 7 days for metrics).

## Decisions not taken yet

- Native histograms: the lab's Prometheus scrapes classic histograms only; one setting turns native ones on (`prometheus.prometheusSpec.scrapeNativeHistograms`). Module m04 step 8 is a concept step until then.
- Done on 2026-11-14 by card L8 (pull request 90): Loki's query limits (`max_query_bytes_read` 500MB, `max_querier_bytes_read` 150MB, `tsdb_max_query_parallelism` 16, `max_query_parallelism` 8, `max_query_length` 49h, `query_timeout` 1m; `max_concurrent` stays at 4) and Mimir's cardinality API for tenant `lab`. Exemplar storage in Prometheus was not switched on: no scrape target of the lab exposes an exemplar, so it would store nothing. Module m12 step 15 and module m11 step 9 follow the lab.
- Mimir runs one ingester per partition and no zones, so reads of recent data fail for about ten seconds when an ingester restarts, while writes go on (seen by card C10 at 12:31 UTC on 2026-11-14; module m11 step 13 teaches it). Two zones would need three more ingesters. Left as it is unless the owner wants the lab to show the other behaviour.
- Nobody hears an alert of the lab. Card C14 followed each kind to its end: the rules of Prometheus go to an Alertmanager whose routes all end at the receiver `null`; rules in Mimir's ruler go to Mimir's Alertmanager, where tenant `lab` has no configuration; Loki's ruler has no Alertmanager address; Grafana's default policy ends at a contact point without an integration. Module m15 teaches with a practice Alertmanager and a webhook of its own, so no lesson needs more. If the owner wants the lab's own alerts to reach a person (a webhook, a chat, an email), that is one receiver in each of the four places.
- The display font of the site states "All rights reserved" in its file and the repository is public; the owner decided to use it.

## How the work is run

- A worker session cannot be started on a turn that an automatic event began (a usage limit reset, another session's message). Wave 7 therefore ran as background agents inside the planner's session. They share one browser pane, so only one of them can use it at a time.
- A worker is refused changes to the shared cluster unless the owner says so in that worker's own session. A card that changes the cluster should have the worker prepare files and a command list first.
- Grafana sign-in is per session and needs the owner; a sign-in expires within hours, so a worker that comes back to Grafana late in its run may need a second one.
- When the owner's usage runs out, every session stops where it is and goes on by itself only if something wakes it. After a cut the planner reads the flag screen first: a flag that a stopped worker left on would stay on. In wave 9 no flag was on at the cut.
- Fault flags are one at a time in the whole lab (the wave 9 notes in `cards/README.md`). The workers kept to it by reading the flag screen and by messaging each other; a second fault inside another card's long alert window still disturbed that card's timings once, and the planner had it use arithmetic for the affected number.
- In a new worktree `make lab-lint` needs `ansible-galaxy collection install ... --force`: Galaxy skips `kubernetes.core` as already installed when it finds the owner's copy under `~/.ansible`, while the playbook looks only in the worktree's `ansible/.ansible/collections` (seen by card L8).
- Workers test their lessons from their own files and terminals, so a fault between the source and the page escapes them: wave 8 found two (lost indentation, typographic quotes and dashes). Since card W3 the build itself compares every block on the page with its source (`check:pages`).
- An independent fact check of every step and every question, two read-only agents per module, found 7 errors in wave 8 and 6 in wave 9 that the workers' own checks of five steps had missed. Four of the thirteen were statements the vendor's documentation makes and the software does not do; the lab or the source settled each. For a module that leans on a demo application, give the checker the application's source: half of wave 9's findings in m14 came from reading it.
