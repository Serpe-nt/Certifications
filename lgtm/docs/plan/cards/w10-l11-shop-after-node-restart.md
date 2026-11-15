# L11: the shop keeps its speed after a worker restarts

Beside wave 10 and before wave 11. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

Card C16 stopped one worker for twelve minutes on 2026-11-15, as module m17 step 13 teaches. The lab came back by itself and `make lab-check` passed, but the shop has been about ten times slower since, with every fault flag off. This card makes the shop survive a restarted worker, lets the lab's own check see such a state, and writes down what a stopped worker does.

## Owns

`lgtm/lab/demo/chart/**` (the resources in `values.yaml`, the chart version), `lgtm/lab/helm/shop/**`, `lgtm/lab/tests/lab/**`, `lgtm/lab/docs/**` where the shop's resources, the lab check or a stopped worker are described, and `lgtm/docs/adr/l11-*.md`. In the lessons: only the sentences of m17 step 13 that describe what drill 3 left behind, with their log rows, and any sentence of m13 to m17 that states a memory limit this card changes. Not the plan, not the demo's source (no new images), no other release.

## Read first

- Pull request 107 (`gh pr view 107 --repo Serpe-nt/Certifications`), the parts "What the drills showed that the lab's documents do not say yet" and the table of drills; module m17 step 13 and its log in `lgtm/docs/verification/m17.md`; `lgtm/docs/adr/c16-content-notes.md`.
- `lgtm/lab/demo/chart/values.yaml` (every service's requests, limits and `GOMEMLIMIT`), `lgtm/lab/tests/lab/budget.py`, `check_resources.py` and `smoke.sh`.
- `lgtm/lab/docs/runbook.md`, "Start and stop" and "Upgrade or change one release"; `lgtm/lab/docs/demo.md`.
- The kernel's documentation of the cgroup v2 memory controller (which cgroup a page of the page cache is charged to, and what `memory.stat` shows), the Kubernetes pages on memory limits and on what the kubelet counts as working set, and Go's guide to `GOMEMLIMIT`. Fetch them on the day.

## What is known

Measured by the planner on 2026-11-15, read-only, from Prometheus and Mimir. Check each point yourself before you build on it.

| product-catalog pod | Usage | RSS | File cache | Major page faults |
|---|---|---|---|---|
| `7fbd5bdd84-2jhcf` on worker1, until 18:16 UTC | 11.5 to 11.9 MiB | 10.7 to 11.1 MiB | 0.13 MiB | 0 a second |
| `849ff854db-pqx4g` on worker4, 18:16 to 19:05 | 10.9 to 11.7 MiB | 10.3 to 11.1 MiB | 0 | 0 |
| `849ff854db-rjfg8` on worker2, from 19:10 (worker4 was stopped) | 19.6 to 19.7 MiB | 10.3 to 10.5 MiB | 8.5 to 8.7 MiB | about 600 |
| `78f8879865-ckrm8` on worker4, from 19:53 (a restart, to see if it helps) | 19.5 MiB | 10.8 MiB | 8.1 MiB | 380 to 750 |

- The limit is 20Mi and `GOMEMLIMIT` is 16MiB. The Go process did not grow: `go_memory_used_bytes` stayed at 14.5 MiB and the goroutines at 53 to 55, with 4 `GetProduct` and 1 `ListProducts` a second before and after.
- product-catalog's server p95 went from 6.5 ms to about 220 ms, and checkout's `PlaceOrder` p95 from about 27 ms to about 230 ms. Its database spans went from 1.9 ms to about 50 ms, measured inside the stalled process. Prometheus fires `NodeMemoryMajorPagesFaults` for the node that holds the pod.
- A restart of the deployment did not help: the new pod was at its limit within minutes.
- The planner's reading, not proven: about 8.5 MiB of file pages, the program's own code, are now charged to the container. The earlier pods were not charged for them, probably because the pages were already in the node's page cache, read first by the image pull. A pod that starts after its node restarted, or on a node that no longer holds those pages, reads its program itself, and with them it does not fit into 20Mi. checkout has the same limit and showed 10.6 MiB of usage with 0.4 MiB of file cache at 20:04 UTC.
- `make lab-check` passed at 19:22 UTC while the shop was in this state.

## What to build

1. **The cause, confirmed or corrected.** Read the memory accounting of every container of the shop: limit, usage, RSS, file cache, major page faults, when the pod started and whether its node restarted before. Say in an ADR what charges the file pages to a container and when, with the kernel's documentation and the lab's numbers, and which of the shop's services can end the same way.
2. **Limits that hold.** Change the memory limits (and requests, and `GOMEMLIMIT` where it is set) of product-catalog and of every other service that the first point names, by the smallest amount that holds with the file pages charged. Keep `tests/lab/budget.py` passing and say how much the workers' requests grow. No new image: this is a change of the chart's values and its version.
3. **The lab check sees it.** `make lab-check` fails, and names the container, when a container of the shop is at its memory limit and reads pages back from disk. Choose the rule from what you measured, so that a healthy lab never trips it.
4. **Applied, with the owner.** `make lab TAGS=shop` from your branch. Say first which pods restart and for how long.
5. **Proof.** After the upgrade, for thirty minutes: usage below the limit with the file pages charged, major page faults near zero, product-catalog's p95 and checkout's `PlaceOrder` p95 back at about 6.5 ms and 27 ms, no alert besides Watchdog, `make lab-check` passing and `make lab` reporting `changed=0`. Then the cold case: ask the owner once whether to stop and start one worker again for this proof (ten minutes, the owner's own action). If the owner says no, say in the record that the cold case rests on the pod that was measured before the fix.
6. **What a stopped worker does, in the runbook.** A section for one worker that is down or was restarted: what stops (recent Mimir reads for a partition whose only ingester sat there, for the whole outage), what restarts by itself (product-catalog while its database is away), what does not heal by itself (a Job that failed in the outage and its `KubeJobFailed` alert; pods that moved and do not move back), and what to check afterwards. Card C16 listed five findings for the lab's documents in pull request 107; put each where it belongs (`runbook.md`, `platform.md`, `demo.md`), also the two that are not about a worker: what the stores log while the object store is away, and that Strimzi's NetworkPolicy opens port 9092 to any source.
7. **The lessons.** m17 step 13 says today that the shop stays slow after drill 3 and that this card fixes it. After the fix, make those sentences true again, keep ids and frontmatter, and log each change. Search m13 to m17 for a stated memory limit of a service you changed.

## On the lab, with the owner

Your session will refuse to change the shared cluster until the owner says so in it. Prepare the files first, with `make lab-lint` passing, then ask once: which release restarts and for how long. No other card is on the lab now; if one starts, tell it before the shop restarts and when it is back.

## Limits

- No change to `~/.kube/config`, Windows or WSL settings, `/etc/hosts`, the saa-plan app. A VM is stopped or started only by the owner.
- No fault flag. No kind cluster. No sub-agents, except one read-only agent to check the ADR and the changed lesson sentences.
- Never print the lab seed, Grafana's password, a certificate, a key or a token.
- Do not open trace `1b9843164d5423b88ba041cee6303b88` by its ID (`lgtm/lab/docs/runbook.md`).
- Host ports, all on 127.0.0.1: 8107 for the site, port-forwards 18170 to 18179.
- The owner reads little: lead every question with what they must decide, in two or three lines.

## Done when

- [ ] An ADR `l11-*.md` gives the cause with its sources and the lab's numbers, the options, and the limits chosen for each service.
- [ ] On the running lab product-catalog and checkout are back at their old latencies for thirty minutes, no container of the shop is at its memory limit, and no alert fires besides Watchdog; the record is in `acceptance-lab.md`, with the cold case proven or named as not proven.
- [ ] `make lab-check` fails on a container of the shop that is at its limit and faulting, and passes on the healthy lab; the record shows both.
- [ ] `runbook.md` has the section on a stopped worker, and card C16's five findings are in the lab's documents.
- [ ] m17 step 13 and its log say what is true after the fix; the pull request lists each changed sentence and the search that found it; the site's checks pass.
- [ ] `make lint` and `make lab-lint` pass; `make lab-check` passes; `make lab` reports `changed=0`.

## Report

The pull request link; the cause in two sentences; the limits you changed and what they cost; what the lab check now catches; whether the cold case was proven; which lesson sentences changed.
