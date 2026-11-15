# Open items

What is known to be unfinished, unverified or broken. Owned by the planner; a line leaves this file when a pull request closes it. Rewritten on 2026-11-14, before wave 8; brought up to date that day after wave 8 and again after wave 9, and on 2026-11-15 during wave 10.

## Lesson actions not yet walked on the lab

None. Every action of m00 to m09 has been done on the lab as a learner would do it: m01, m04 and m06 in pull requests 64, 65, 66 and 68, and m07 to m09 in pull request 72 (card W2). Card W1 (pull request 71) then ran every lab check of m00 to m06 again on the lab's version 3 and corrected the numbers that had changed.

Modules m10, m11 and m12 (wave 8, pull requests 79, 82 and 81) were run on the lab by their own workers, with the owner's go-ahead in each session; no row in their logs is unverified.

Modules m13, m14 and m15 (wave 9, pull requests 93, 94 and 95) were run on the lab by their own workers, fault flags included; no row in their logs is unverified. One statement of m14 step 5 rests on Grafana's source and not on a walk: that Grafana 13.3 offers the trace-to-metrics buttons also on a span that has none of the mapped tags, with an empty filter, where Grafana's page says no link appears. It is marked `inference`; a data source of one's own with a tag no span has would settle it in five minutes with a Grafana sign-in.

Module m16 (wave 10, pull request 104) was run on the lab by its worker from the built pages, in a practice namespace that is gone again. One part is `lab-unverified`: step 6 describes lokitool from Loki's documentation and does not run it, because lokitool has no image and the worker's session refused a second download of the binary. The step's practice loads the rules into Mimir only.

Left alone on purpose: `make reset` (m01 step 20, described from the owner's own run), pushing a delta metric into Mimir (m08), and changing a lab release to settle the inferences of m06, which stay marked `inference` in its log.

## Lesson defects

None open. Two faults between a lesson's source and its page were found in wave 8 by cards C9 and C10 and closed by card W3 (pull request 86): a manifest in a multi-line `<Cmd>` lost its indentation, and a command written as plain text got typographic quotes and dashes. Fifty-four blocks in m01, m03 and m06 to m09 were repaired. `npm run build` now ends with `check:pages`, which compares every command, query and fenced block on the built page with its source, and `check:content` refuses both forms.

A third fault of that kind was found on 2026-11-15 by the planner's QA of m16, and no check sees it yet: a single backslash inside the template string of a `<Cmd>` or `<Query>`. The page shows a line break for `\n` and drops the backslash before other characters. Two `kubectl ... -o jsonpath` commands of m16 step 2 failed as copied, and a `grep` of m01 step 17 matched nothing on the page; both are repaired in pull request 104, and a scan of every step found no other place. The rule is in `03-content-contract.md`. Owed: a `check:content` rule that refuses a single backslash there, except before `u`, a backtick or `$`. It belongs to the final sweep of wave 11.

## Lab defects

None open.

Closed on 2026-11-15 by card L10 (pull requests 101 and 105): one trace of the shop grew for days and a lookup of it could kill Tempo's querier. Payment now starts its flag provider once, with tracing suppressed (shop version `3.1.0-lab.2`, chart 0.3.0), so an order's trace holds only its own spans; the first order after the upgrade had the same 96 spans thirty minutes later. The old trace, `1b9843164d5423b88ba041cee6303b88`, stopped growing at 18:13 UTC and leaves Tempo at about 20:15 UTC on 2026-11-17; nobody opens it by its ID before that. The cause, the options and the proof are in `lgtm/docs/adr/l10-payment-flag-stream.md` and in `lgtm/lab/docs/acceptance-lab.md`.

Closed on 2026-11-14 by card L9 (pull request 98): a fault flag did not reach product-catalog until the pod was restarted. The Go provider gives its start 500 ms; product-catalog's container started two seconds before flagd's, the start failed, and the part that reads flag changes never ran, so every flag kept its first value for the life of the pod. Six services now ask flagd at every evaluation (`FLAGD_CACHE=disabled`), and a flag reaches each within about 15 seconds; the runbook says what to do if one does not.

Closed on 2026-11-14: new pods could not start on some nodes after the PC had slept (found on 2026-11-14 by card C11): Calico 3.31.4 renewed its 24-hour token for the CNI plugin only every 6 to 12 hours of running time, and a 14-hour pause outlasted it. Card L7 (pull request 91) moved the lab to Calico 3.31.7, which renews the token whenever kubelet rotates calico-node's own, seen on all five nodes 48 to 49 minutes after their start. A sleep of up to about 23 hours does no harm; after a longer one, `make calico-renew`. `make lab-check` names the fault. The night of 2026-11-14 proved it: the VMs were paused for 12.5 hours, every calico-node wrote a new token within seconds of the wake at 11:52 UTC, and no pod was refused. Card L7 adds that record to `acceptance-cluster.md` in a follow-up pull request.

The five of 2026-11-13 were closed by card L6 in pull requests 67 and 70: the object store killed for memory about every four hours, the collector gateway unable to scrape the shop's Kafka, the workshop service not stopping on Ctrl+C on Windows, `lgtm/lab/workshop/.venv` not git-ignored, and the workers close to their memory limit.

To watch:

- The object store. RustFS 1.0.5 has run two days without a restart. Its resident memory rose with use, 144 MiB before wave 8, 180 after it, 247 after wave 9, and was back at 206 MiB the next afternoon after a quiet night (limit 1536Mi). It gives memory back, so it is not the old leak.
- flagd answers every flag evaluation since card L9: its CPU went from 0.004 to 0.011 cores (limit 200m). Look again after a day of load.
- The control-plane node uses about 70% of its memory.
- A quiet shop is not free of error spans, on purpose (card L10, `lgtm/lab/docs/demo.md`): the flag providers of ad, fraud-detection and recommendation each end a 600-second stream to flagd every ten minutes with status error, as a trace of two spans. A search for a service's errors leaves them out with `&& name != "flagd.evaluation.v2.Service/EventStream"`. The capstone module should say so where it searches errors.
- Grafana keeps practice dashboards that were deleted through the API or by Terraform in **Recently deleted** for 12 months (`m16-orders`, `m16-generated`, and those of earlier modules). The page offers only Restore.
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
- Git Sync inside the lab. Grafana 13.3 has Git Sync on, but refuses a Git server inside the cluster: a token over `http://` and a host that resolves to a private address are both refused (HTTP 422). Module m16 step 3 has the learner read that refusal and explains the GitHub path. If the owner wants the lab to show a working sync from its own Git server, Grafana's values need `[provisioning] allowed_git_urls` with the Git host and `allow_insecure = true`, or a Git server on HTTPS. Found by card C15.
- Whether the practice dashboards in Grafana's Recently deleted should be purged, or may stay the 12 months.
- lokitool in m16 step 6 is described and not run. A later card could build a small image for it, or the owner could run it once and report.
- The display font of the site states "All rights reserved" in its file and the repository is public; the owner decided to use it.

## How the work is run

- A worker session cannot be started on a turn that an automatic event began (a usage limit reset, another session's message). Wave 7 therefore ran as background agents inside the planner's session. They share one browser pane, so only one of them can use it at a time.
- A worker is refused changes to the shared cluster unless the owner says so in that worker's own session. A card that changes the cluster should have the worker prepare files and a command list first.
- Grafana sign-in is per session and needs the owner; a sign-in expires within hours, so a worker that comes back to Grafana late in its run may need a second one.
- When the owner's usage runs out, every session stops where it is and goes on by itself only if something wakes it. After a cut the planner reads the flag screen first: a flag that a stopped worker left on would stay on. In wave 9 no flag was on at the cut.
- Fault flags are one at a time in the whole lab (the wave 9 notes in `cards/README.md`). The workers kept to it by reading the flag screen and by messaging each other; a second fault inside another card's long alert window still disturbed that card's timings once, and the planner had it use arithmetic for the affected number.
- In a new worktree `make lab-lint` needs `ansible-galaxy collection install ... --force`: Galaxy skips `kubernetes.core` as already installed when it finds the owner's copy under `~/.ansible`, while the playbook looks only in the worktree's `ansible/.ansible/collections` (seen by card L8).
- Workers test their lessons from their own files and terminals, so a fault between the source and the page escapes them: wave 8 found two (lost indentation, typographic quotes and dashes). Since card W3 the build itself compares every block on the page with its source (`check:pages`).
- A worker's session refuses to create a Grafana service account token through the API, also when the value would go straight into a Secret. The owner creates it on the screen and stores it with the step's own `read -rs` command. A card that needs a token asks the owner for it early (card C15).
- A worker does not edit a `CLAUDE.md` because the planner asks; the owner's yes is needed, and then the planner makes the edit (card FG, pull request 103).
- The approval cards of the browser pane belong to the app. The lab's sites are saved there as allowed and trusted; the planner cannot change the owner's permission settings, and gave the owner one command to add an allow rule for the browser tools.
- A command counts as run from the built page only when its text came out of the page's `<pre>` element. Card C15 saved every `<pre>` to a file and ran it, which found seven faults; two commands still slipped through, because their log rows were taken from the source.
- When a look or a rule of a card is changed by the owner in a worker's session, the planner checks the owner's words in that session's transcript before accepting it, and then changes the plan to match (card FG: Grafana's look for the figures).
- An independent fact check of every step and every question, two read-only agents per module, found 7 errors in wave 8 and 6 in wave 9 that the workers' own checks of five steps had missed; in m16 of wave 10 it found 4 small errors and 5 doubtful sentences, and every answer key was right. Four of the thirteen were statements the vendor's documentation makes and the software does not do; the lab or the source settled each. For a module that leans on a demo application, give the checker the application's source: half of wave 9's findings in m14 came from reading it.
