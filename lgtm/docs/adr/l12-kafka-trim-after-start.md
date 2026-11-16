# L12: a start of the lab leaves no failed kafka-trim Job

Status: accepted by worker L12 on 2026-11-16.

## Context

Longhorn's RecurringJob `kafka-trim` trims the three Kafka volumes every hour at minute 7
(`l5-kafka-disk.md`). Longhorn runs it as a Kubernetes CronJob of the same name in
`longhorn-system`. The owner shuts the PC down every night. On 2026-11-16 the lab came up with a
failed Job `kafka-trim-29913907`, and Prometheus's `KubeJobFailed` would fire for it until
someone deleted the Job. The same leftover followed the worker drill of 2026-11-15
(`kafka-trim-29912827`, `runbook.md`).

## The cause

What the lab showed on 2026-11-16 (events in `longhorn-system`, the CronJob's status):

- The trim last succeeded at 00:07:19 UTC (`status.lastSuccessfulTime`). The PC was shut down at
  about 00:24.
- The nodes booted at 13:21:21 to 13:21:31 (`node_boot_time_seconds`). `kube-controller-manager`
  started at 13:21:36 and created
  `kafka-trim-29913907` at 13:22:01. The number is the scheduled time in minutes since 1970:
  13:07, the run the lab had missed while it was off.
- The trim got `502 Bad Gateway` from `http://longhorn-backend:9500/v1/volumes/...?action=trimFilesystem`
  and then `500 Internal Server Error` with `unable to trim filesystem for volume ...: failed to
  find valid mountpoint` (events `FailedFilesystemTrim` on `recurringjob/kafka-trim`). Longhorn's
  managers were still starting, and the Kafka pods had not mounted their volumes yet.
- The Job failed at 13:23:22 with `BackoffLimitExceeded` (Longhorn sets `backoffLimit: 3` and
  `restartPolicy: OnFailure`). The CronJob keeps one failed Job (`failedJobsHistoryLimit: 1`).

Why the run starts at boot. The CronJob has no `startingDeadlineSeconds`. Kubernetes: "If you
don't specify startingDeadlineSeconds for a CronJob, the Job occurrences have no deadline", and
the controller "checks how many schedules it missed in the duration from its last scheduled time
until now". The page's example has the controller down for about two hours: "When the controller
is back, it ... starts one Job, for the most recent schedule"
(https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/). The lab did the same: the
Job's name, 29913907, is 13:07 in minutes since 1970, the latest of the 13 hours it missed. So
when the controller starts after a night off, it runs the missed hour within seconds, before
Longhorn and Kafka are up. That happens at every start that missed at least one minute 7, which is
every night.

Why the Job stays. A CronJob keeps `failedJobsHistoryLimit` failed Jobs, "the default value is 1"
(same page). Longhorn writes both history limits into the CronJob from its settings `Cronjob
Failed Jobs History Limit` and `Cronjob Successful Jobs History Limit`, default 1
(https://longhorn.io/docs/1.13.0/references/settings/). The page describes them for "backup or
snapshot job histories"; on the lab they also set the limits of the `filesystem-trim` job (the
CronJob showed `failedJobsHistoryLimit: 1`, and `0` after the change). A successful run later
does not remove a failed Job, because the two histories are counted apart. `KubeJobFailed` in the
lab's Prometheus (kube-prometheus-stack, read from Prometheus's `/api/v1/rules`) is
`kube_job_failed{job="kube-state-metrics",namespace=~".*"} > 0` with `for: 15m`, so it fires from
15 minutes after the failure for as long as the failed Job object exists. Its runbook says what
it means: "Job failed complete"
(https://runbooks.prometheus-operator.dev/runbooks/kubernetes/kubejobfailed/).

A worker's outage ends the same way when the trim runs while the worker is away: on 2026-11-15
the run of 19:07, during card C16's drill with worker4 stopped, failed with `BackoffLimitExceeded`
at 19:08 and was kept (`lgtm/docs/verification/m17.md`).

## Options

1. **Longhorn keeps no failed Job: `recurringFailedJobsHistoryLimit: 0`** (chosen). Longhorn
   writes `failedJobsHistoryLimit: 0` into the CronJob, and Kubernetes then "will not keep any
   failed jobs". A run that fails is deleted as soon as it has failed, long before the 15
   minutes of `KubeJobFailed`. One value in `helm/platform/longhorn/values.yaml`; no pod
   restarts. Cost: a failed run leaves no Job or pod to read with `kubectl`. Its events
   (`FailedFilesystemTrim`) stay in the cluster for an hour, and Alloy keeps them in Loki
   (`{namespace="longhorn-system", reason="FailedFilesystemTrim"}` returned the run of
   2026-11-16); the pod's own log was not in Loki. Today `kafka-trim` is the lab's only
   RecurringJob, so the setting touches nothing else.
2. **A deadline or more retries for the CronJob.** `startingDeadlineSeconds` would skip a missed
   run that is too late instead of running it at boot, and a larger `backoffLimit` would give
   Longhorn time to start. Longhorn owns the CronJob: it builds the spec from the RecurringJob
   and its settings and writes it back (annotation `longhorn.io/last-applied-cronjob-spec`), and
   neither the RecurringJob nor the settings have these fields. A patch by hand would be undone.
   A worker's outage would still leave a failed Job.
3. **A lab rule in place of `KubeJobFailed` for this Job.** Turn the default rule off in
   kube-prometheus-stack and add a copy that leaves `kafka-trim` out. The failed Job would still
   be there (`kubectl get jobs` shows it, the runbook would still tell people to delete it), and
   the lab would carry a modified copy of an upstream rule.
4. **Keep the Job and delete it after the start** (a step in the runbook, or a Job of our own).
   That is the hand work this card removes, or more code that does the same as option 1.

## A trim that has stopped is still seen

With option 1, `KubeJobFailed` no longer reports the trim at all, and a trim that fails for hours
lets a Kafka replica grow towards its whole volume (`l5-kafka-disk.md`). The lab therefore gets
its own alert, `LabKafkaTrimNotSucceeding` in lab-glue 0.4.0, and `make lab-check` gets check 11
(`tests/lab/kafka-trim.sh`) on the same expression. Both read two series of kube-state-metrics,
`kube_cronjob_status_last_successful_time` and `kube_cronjob_created`
(https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/cronjob-metrics.md):

```promql
(
  time() - max by (namespace, cronjob) (
    kube_cronjob_status_last_successful_time{namespace="longhorn-system", cronjob="kafka-trim"}
    or
    kube_cronjob_created{namespace="longhorn-system", cronjob="kafka-trim"}
  ) > 3 * 3600
)
and
(
  max by (namespace, cronjob) (
    count_over_time(kube_cronjob_created{namespace="longhorn-system", cronjob="kafka-trim"}[3h:10m])
  ) >= 18
)
```

The first half is the time since the last success. A CronJob that has never succeeded has no
`kube_cronjob_status_last_successful_time` at all, so the half falls back to the time since the
CronJob was created; a success is always later than the creation, so `max` takes the success
whenever there is one. On the lab on 2026-11-16 the `or` expression returned the age of the last
success.

The second half asks that Prometheus had the CronJob's `kube_cronjob_created` at each of the 18
ten-minute steps of the last three hours, so the lab was running the whole time. That series
exists from the CronJob's creation, success or not. The age alone would fire after every start of
the lab: the last success is then from before the stop, 13 hours old on 2026-11-16, until the
first run after the start succeeds. The subquery `count_over_time(...[3h:10m])` counts the steps
at which the series had a sample within Prometheus's lookback of five minutes, so it gives the
same count for any scrape interval up to five minutes.

The alert has `for: 10m`. The age passes three hours a few seconds before the third run after the
last success finishes, so without the wait a run that succeeds 20 seconds late could fire the
alert for an instant. `make lab-check` evaluates the expression without the wait, so it fails up
to ten minutes before the alert fires.

| Case | What happens |
|---|---|
| The trim fails every hour while the lab runs | Fires about 3 hours 10 minutes after the last success |
| The trim stops running: a Job hangs (`concurrencyPolicy: Forbid` then skips the next schedules) or the CronJob is suspended | The same: only the last success counts |
| A night off, the run at boot fails, the next succeeds (2026-11-16) | Quiet |
| A night off, the trim keeps failing | Fires about 3 hours 10 minutes after the start |
| A stop of two to three hours, the run at boot and the next fail | Quiet: Prometheus has not watched the last three hours |
| A worker is down for one run | Quiet: the last success is two hours old at most |
| A new lab whose trim never succeeds | Fires about 3 hours 10 minutes after the CronJob was created |
| A new lab whose first run succeeds | Quiet; `make lab-check` passes before the first run too (`has not succeeded since its CronJob was created ... hours ago`) |
| The CronJob or the RecurringJob is deleted | Quiet: both series are gone. `make lab-check` fails with `Prometheus reports no CronJob kafka-trim in longhorn-system`; this is the one case where the check and the alert differ |

`make lab-rule-test` runs `tests/lab/kafka-trim-rule.test.yml` with `promtool test rules`, from the
image of the lab's Prometheus version. It covers the first, third, fourth, fifth, seventh and
eighth cases, the fifth with samples from before the stop.

A first version of the rule asked instead for at least three changes of
`kube_cronjob_status_last_schedule_time` in four hours. This card's independent check found that
it fires after a stop of about two and a half hours, because the change to the last successful
run, from before the stop, still counts, and that it never fires for a trim that stops running.
A second version read only `kube_cronjob_status_last_successful_time` in both halves; the
planner's review found that it never fires for a trim that has never succeeded, and that
`make lab-check` failed on a lab built less than an hour before. The version above has none of
these faults.

## Decision

- `helm/platform/longhorn/values.yaml`: `defaultSettings.recurringFailedJobsHistoryLimit: 0`
  (chart value of Longhorn 1.13.0, setting `recurring-failed-jobs-history-limit`). Successful
  runs are still kept (1).
- lab-glue 0.4.0: alert `LabKafkaTrimNotSucceeding`, threshold `alerts.kafkaTrimMaxHours: 3`,
  `for: 10m`.
- `make lab-check` check 11, `LAB_KAFKA_TRIM_MAX_HOURS ?= 3`.
- `KubeJobFailed` stays as it is for every other Job of the lab.

## Consequences

- After a cold start and after a worker's outage nothing is left to delete. The Job of a failed
  run disappears; the next hour's run does the trim. On the running lab a failed Job owned by the
  CronJob was deleted the second it failed; the next cold start is the first real proof
  (`lgtm/lab/docs/acceptance-lab.md`, card L12).
- A failed run can be read only from its events (one hour), from Loki, and from the CronJob's
  `lastSuccessfulTime`. `kubectl get jobs` no longer shows it.
- A trim that has really stopped is reported about three hours late by `make lab-check` and
  ten minutes after that by the alert; after a start of the lab, not before three hours have
  passed. At the rates of `l5-kafka-disk.md` a replica gains about 0.7 GiB an hour
  without a trim, so three hours cost about 2 GiB of Longhorn disk; the disk check of
  `make lab-check` (25% free) is still the last guard.
- Should the lab get a second RecurringJob, its failed Jobs are not kept either, and it needs a
  rule like this one.
