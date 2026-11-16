# L12: a start of the lab leaves no failed Job and no alert

After wave 11, on the owner's decision. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

The owner shuts the PC down at night. On 2026-11-16 the lab was started cold for the first time since the hourly `kafka-trim` exists, and it came up with a failed Job and a `KubeJobFailed` alert that fires until someone deletes the Job by hand. The same leftover followed the worker drill of 2026-11-15. This card makes a start of the lab end clean by itself, without hiding a trim that has really stopped working.

## Owns

`lgtm/lab/ansible/roles/platform_kafka/**` and the role that installs Longhorn and its settings, `lgtm/lab/helm/**` only where an alert rule of the lab is defined, `lgtm/lab/tests/lab/**`, `lgtm/lab/docs/**` where the trim, a start of the lab or a stopped worker are described, `lgtm/lab/ansible/CHANGES.md` if a copied role changes, and `lgtm/docs/adr/l12-*.md`. In the lessons: only the sentences of m17 step 13 and of m00 step 7 that describe a failed Job or what a learner sees after a start, with their log rows. Not the plan, not the shop, no other release.

## Read first

- `lgtm/docs/adr/l5-kafka-disk.md` (why the trim exists) and `lgtm/lab/ansible/roles/platform_kafka/templates/kafka.yaml.j2` (the RecurringJob).
- `lgtm/lab/docs/runbook.md`: "Start and stop", and in the section on a stopped worker the point "A Job that failed during the outage stays failed". `lgtm/lab/docs/platform.md` on the trim.
- Module m17 step 13 (drill 3 and what it leaves) and m00 step 7 (starting the lab), with their logs in `lgtm/docs/verification/`.
- Longhorn's documentation for the lab's version (1.13.0) on recurring jobs and on the settings `recurring-failed-jobs-history-limit` and `recurring-successful-jobs-history-limit`; the Kubernetes pages on CronJob (missed schedules, `startingDeadlineSeconds`, history limits) and on Job (`ttlSecondsAfterFinished`); the runbook of the alert `KubeJobFailed` in kube-prometheus. Fetch them on the day.

## What is known

Read by the planner on 2026-11-16, read-only. Check each point yourself before you build on it.

- The PC was shut down at about 00:24 UTC. The trim last succeeded at 00:07:19.
- The VMs were started at about 13:20 UTC. `kube-controller-manager` started at 13:21:36 and created the Job `kafka-trim-29913907`, the missed run of 13:07, at 13:22:01. The CronJob has no `startingDeadlineSeconds`, `concurrencyPolicy: Forbid`, `backoffLimit: 3`, `restartPolicy: OnFailure` and both history limits at 1.
- Longhorn's managers were still starting (their containers started between 13:22:31 and 13:23:05, after one to five restarts). The trim got `502 Bad Gateway` and `500 Internal Server Error` from Longhorn's API (events `FailedFilesystemTrim`), and the Job failed with `BackoffLimitExceeded` at 13:23:22.
- Every pod of the lab was ready at 13:27 and the boot's other alerts were gone at 13:32. The failed Job stays, and `KubeJobFailed` fires for it from about 13:37 until the Job is deleted. The next hour's run is a new Job and does its work.
- The planner's reading, not proven: this happens at every cold start, because the controller always runs the missed schedule a few seconds after it starts and Longhorn is never ready that early.
- Lessons and game days say that a quiet lab has no alert besides Watchdog. With this leftover that sentence is false after every start, until the Job is deleted by hand.

## What to build

1. **The cause, confirmed or corrected**, from the Kubernetes and Longhorn documentation and the lab's own events: why the run starts at boot, why it fails, and whether a node outage ends the same way.
2. **A start that ends clean.** Choose the smallest change that leaves no failed `kafka-trim` Job and no `KubeJobFailed` after a cold start and after a worker's outage, with nothing done by hand. Weigh at least these: Longhorn's failed-jobs history limit at 0; a change to the RecurringJob or to what Longhorn makes of it; an alert rule of the lab's own in place of `KubeJobFailed` for this Job. Write the options and the choice in an ADR.
3. **A trim that stopped is still seen.** Whatever you choose, the lab must still tell when the trim has not succeeded for some hours, because a Kafka volume then fills up (`l5-kafka-disk.md`). An alert on the time of the last success is one way. `make lab-check` should fail on it too.
4. **Applied, with the owner.** Say first what restarts, if anything, and for how long.
5. **Proof.** On the running lab: the change is in place, `make lab-check` passes, `make lab` reports `changed=0`, no alert besides Watchdog. Then the cold case: ask the owner once whether to stop and start the lab's VMs for it (about ten minutes, their own action in an elevated PowerShell). If the owner says no, say in the record that the cold case is not proven; the planner reads it at the owner's next start.
6. **The documents and the lessons follow.** The runbook's point on a failed Job, `platform.md`, and the sentences of m17 step 13 and m00 step 7, so that each says what is true after the change. Keep ids and frontmatter, and log each changed sentence.

## On the lab, with the owner

Your session will refuse to change the shared cluster until the owner says so in it. Prepare the files first, with `make lab-lint` passing, then ask once. If the failed Job `kafka-trim-29913907` is still there when you start, leave it until your change is applied and say what happened to it.

## Limits

- No change to `~/.kube/config`, Windows or WSL settings, `/etc/hosts`, the saa-plan app. A VM is stopped or started only by the owner.
- No fault flag. No kind cluster. No sub-agents, except one read-only agent to check the ADR and the changed lesson sentences.
- Never print the lab seed, Grafana's password, a certificate, a key or a token.
- Do not open trace `1b9843164d5423b88ba041cee6303b88` by its ID (`lgtm/lab/docs/runbook.md`).
- Host ports, all on 127.0.0.1: 8107 for the site, port-forwards 18170 to 18179.
- The owner reads little: lead every question with what they must decide, in two or three lines.

## Done when

- [ ] An ADR `l12-*.md` gives the cause with its sources and the lab's events, the options, and the choice.
- [ ] On the running lab the change is applied; `make lab-check` passes; `make lab` reports `changed=0`; no alert fires besides Watchdog; the record is in `acceptance-lab.md`, with the cold case proven or named as not proven.
- [ ] The lab still reports a trim that has not succeeded for some hours, in an alert and in `make lab-check`; the record shows the rule tripping on a test and passing on the healthy lab.
- [ ] `runbook.md`, `platform.md`, m17 step 13 and m00 step 7 say what is true after the change; the pull request lists each changed sentence; the site's checks pass.
- [ ] `make lint` and `make lab-lint` pass.

## Report

The pull request link; the cause in two sentences; what you changed and what it costs; how a stopped trim is still seen; whether the cold case was proven; which sentences changed.
