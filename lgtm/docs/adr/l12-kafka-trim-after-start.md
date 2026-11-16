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
- The VMs started at about 13:20. `kube-controller-manager` started at 13:21:36 and created
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
until now" and "still starts a Job for the most recent missed schedule"
(https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/). So when the controller
starts after a night off, it runs the missed hour within seconds, before Longhorn and Kafka are
up. That happens at every cold start that misses at least one minute 7, which is every night.

Why the Job stays. A CronJob keeps `failedJobsHistoryLimit` failed Jobs, "the default value is 1"
(same page). Longhorn writes both history limits from its settings `Cronjob Failed Jobs History
Limit` and `Cronjob Successful Jobs History Limit`, default 1
(https://longhorn.io/docs/1.13.0/references/settings/). A successful run later does not remove
a failed Job, because the two histories are counted apart. `KubeJobFailed` is
`kube_job_failed{job="kube-state-metrics"} > 0` for 15 minutes in the lab's Prometheus, so it
fires as long as the Job object exists
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
`kube_cronjob_status_last_successful_time` and `kube_cronjob_status_last_schedule_time`
(https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/cronjob-metrics.md):

```promql
(time() - max by (namespace, cronjob) (kube_cronjob_status_last_successful_time{namespace="longhorn-system", cronjob="kafka-trim"}) > 3 * 3600)
and
(max by (namespace, cronjob) (changes(kube_cronjob_status_last_schedule_time{namespace="longhorn-system", cronjob="kafka-trim"}[4h])) >= 3)
```

The trim has not succeeded for three hours, and Prometheus has seen at least three runs start in
the last four hours. The age alone would fire after every cold start: the last success is then
from before the shutdown, 13 hours old on 2026-11-16, until the first run after the start
succeeds. The second condition waits until Prometheus has watched three runs come and go without
a success. Prometheus has no samples from while the lab was off, so the run at boot is its first
sample and does not count as a change; after a short stop the samples from before it do count,
which is why the window is one hour longer than the age and the count is three.

| Case | What happens |
|---|---|
| The trim stops working while the lab runs | Fires about three hours after the last success, with the third failed run |
| Cold start, the run at boot fails, the next succeeds (2026-11-16) | Quiet |
| Cold start, the trim keeps failing | Fires with the fourth failed run after the start, about three hours after it |
| Stop of two to three hours, two runs fail while Longhorn starts | Quiet |
| A worker is down for one run | Quiet: the last success is two hours old at most |

The rule has no `for`, so the alert and `make lab-check` agree at every moment.
`tests/lab/kafka-trim-rule.test.yml` checks the first four cases with `promtool test rules`.

## Decision

- `helm/platform/longhorn/values.yaml`: `defaultSettings.recurringFailedJobsHistoryLimit: 0`
  (chart value of Longhorn 1.13.0, setting `recurring-failed-jobs-history-limit`). Successful
  runs are still kept (1).
- lab-glue 0.4.0: alert `LabKafkaTrimNotSucceeding`, threshold `alerts.kafkaTrimMaxHours: 3`.
- `make lab-check` check 11, `LAB_KAFKA_TRIM_MAX_HOURS ?= 3`.
- `KubeJobFailed` stays as it is for every other Job of the lab.

## Consequences

- After a cold start and after a worker's outage nothing is left to delete. The Job of a failed
  run disappears; the next hour's run does the trim.
- A failed run can be read only from its events (one hour), from Loki, and from the CronJob's
  `lastSuccessfulTime`. `kubectl get jobs` no longer shows it.
- A trim that has really stopped is reported three to four hours late, and again on every
  `make lab-check`. At the rates of `l5-kafka-disk.md` a replica gains about 0.7 GiB an hour
  without a trim, so three hours cost about 2 GiB of Longhorn disk; the disk check of
  `make lab-check` (25% free) is still the last guard.
- Should the lab get a second RecurringJob, its failed Jobs are not kept either, and it needs a
  rule like this one.
