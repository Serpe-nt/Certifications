# L5: Kafka ran out of disk; make the lab's ingest path hold

Wave 6. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

This card works on the live lab cluster. In wave 6 it is the only card that may change anything on it; the content sessions that run beside it only read.

## Owns

- `lgtm/lab/helm/platform/strimzi/**`, `lgtm/lab/ansible/roles/platform_kafka/**`
- `lgtm/lab/charts/lab-glue/**`: only for an alert rule on volumes that fill up
- `lgtm/lab/mk/**` and the scripts `make lab-check` and `make status` run: only for the new check
- `lgtm/lab/tests/**` where a test must follow your change
- `lgtm/lab/docs/platform.md`, `runbook.md`, `budget.md`, `acceptance-lab.md`
- `lgtm/docs/adr/l5-kafka-disk.md`

## Read first

- `lgtm/docs/plan/02-lab-contract.md`, `lgtm/lab/docs/platform.md`, `lgtm.md`, `budget.md`, `runbook.md`, `acceptance-lab.md`
- `lgtm/lab/helm/platform/strimzi/kafka-cluster.yaml`, the role `platform_kafka`, and the `ingest_storage` sections of `lgtm/lab/helm/mimir/values.yaml` and `lgtm/lab/helm/tempo/values.yaml`
- The official pages, fetched today: Strimzi (storage, resizing persistent volumes, KRaft node pools, recovering a cluster), Apache Kafka (retention by time and by size, segments, what retention deletes and when), Mimir (ingest storage: what it needs from Kafka's retention) and Tempo 3 (the same question)

## What happened

Measured by the planner on 2026-11-12, read-only. Check it before you build on it; if you find something else, your finding wins and the pull request says so.

- 2026-11-11 17:57:39 UTC: brokers 0 and 1 log `Error while appending records to mimir-ingest-1 in dir /var/lib/kafka/data-0/kafka-log0` and then `Shutdown broker because all log dirs in /var/lib/kafka/data-0/kafka-log0 have failed` (Loki, tenant `lab`, `{namespace="kafka"}`).
- At 17:55 UTC the three volumes `data-0-telemetry-dual-role-0`, `-1` and `-2` (5 Gi each, Longhorn) were 98.9% used (`kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes` in the lab's Prometheus). The pods were created on 2026-11-10 at 21:51 UTC, so the volumes filled in about 20 hours.
- Since then all three pods crash-loop: about 200 restarts each, every run lasts about 70 seconds and ends with `Shutting down because we were unable to register with the controller quorum`. The `Kafka` resource `telemetry` is `NotReady`, reason `FatalProblem`.
- Mimir's distributors log `failed to write to partitions [0 1 2]`, Tempo's `failed to write to kafka`. Prometheus has not reached Mimir since: no metrics and no traces are stored after 17:57 UTC. Loki and Prometheus itself work.
- The settings: `log.retention.hours: 24`, `log.segment.bytes: 134217728`, no limit by size; topics `mimir-ingest` (6 partitions, 3 replicas) and `tempo-traces` (2 partitions, 3 replicas) with no settings of their own; the storage class `longhorn` allows expansion.
- Nobody caused it. The lab was accepted after about a day of running, just before the volumes were full.

## Goal

The lab stores metrics and traces again, and Kafka's disk use has a ceiling that is set by size, proven by measurement, and watched. A lab built from scratch with `make platform` and `make lab` gets the same fix.

## Do

1. **Confirm the cause** on the cluster and in the logs. Record how much each topic and the internal topics hold, if you can still read it.
2. **Design the ceiling from the documentation, with numbers.** Retention by size is per partition, and Kafka only deletes closed segments, so the segment size matters as much as the limit. Work out the worst case: every partition of every topic at its limit plus one open segment, times the replicas on a node, plus the internal topics and the KRaft metadata. That sum must stay under about 70% of the volume. Find out from the Mimir and Tempo documentation how long Kafka must keep data for their consumers to be safe after a restart, and do not go below it. Then choose: smaller limits on the 5 Gi volumes, larger volumes, or both. Larger volumes cost Longhorn space twice (two replicas): check `budget.md` and what the workers' disks hold.
3. **Put the fix into the lab's files first** (the Strimzi values and the role), so that the live cluster is repaired by the lab's own command (`make platform TAGS=<the kafka tag>`), not by hand. If the brokers cannot start with full disks and a manual step is needed to get out, do the smallest one, write it down exactly, and put it into `runbook.md` as the recovery for "Kafka's disks are full".
4. **Recover the live cluster.** Data that sits in Kafka is telemetry on its way; losing it is acceptable. Data already stored by Mimir, Tempo, Loki, Longhorn and RustFS is not yours to lose: touch nothing outside the namespace `kafka`. Before you delete a Kafka volume or a topic, read what Strimzi says about it, and prefer expanding a volume to deleting it.
5. **Prove that it works again.** The `Kafka` resource is Ready; a fresh `lab_beacon_value` sample is in Mimir (tenant `lab`); a fresh `beacon.slot` span is in Tempo; Prometheus's remote write to Mimir sends again (tenant `prom`); `make lab-check` passes. The gap in metrics and traces from 2026-11-11 17:57 UTC to your repair stays; write its start and end into `acceptance-lab.md`.
6. **Prove the ceiling.** You cannot wait a day. Measure the growth per hour for each topic, show the arithmetic, and show Kafka deleting segments when a limit is reached (a temporary low limit on one topic is fine; set it back). The pull request has the numbers: bytes per hour, the limit, the worst case, the size of the volume.
7. **Watch it.** Add a check to `make lab-check` (or `make status`) that fails when any volume of the lab is more than 85% full, and one alert rule for the same in the lab's Prometheus. Then list every volume of the lab and every RustFS bucket with its use today and its growth per day, and say which of them has a ceiling and which could fill up. Fix nothing outside Kafka: report it.
8. **Report one more thing, without changing it:** `lgtm/lab/helm/kube-prometheus-stack/values.yaml` says in a comment that classic and native histograms are scraped, yet the running Prometheus has `scrape_native_histograms: false`. Say in the pull request why, and what one setting would turn it on. Module m04 teaches native histograms and its card will decide.

## Limits

- You may change the namespace `kafka` and what your owned files install. Nothing else on the cluster. Never `make reset`, `make cluster` or `make forget-host-keys`.
- Three content sessions read the lab while you work, and the owner studies in it. Do not restart, upgrade or reinstall Mimir, Tempo, Loki, Grafana, Prometheus or the shop. If the repair needs one of them restarted, say why in the session before you do it, and restart only that workload.
- VMs are the owner's. If a disk of a VM must grow or a VM must restart, stop and say so in the pull request and in your report.
- No kind cluster: the VMs leave Docker Desktop too little memory. `make platform-lint` and `make lab-lint` must pass.
- No sub-agents.

## Done when

- [ ] The cause is confirmed or corrected, with the log lines and the measurements.
- [ ] The fix is in the lab's files and was applied to the live cluster with the lab's own command; any manual step is in `runbook.md`.
- [ ] Kafka is Ready; fresh metrics are in Mimir for both tenants and fresh traces are in Tempo; `make lab-check` passes. The output is in the pull request.
- [ ] The ceiling is shown with numbers, and Kafka was seen deleting segments at a limit.
- [ ] The new check fails on a volume above 85% (show it failing against a threshold you lower for the test) and the alert rule is loaded in Prometheus.
- [ ] The table of every volume and bucket, with use, growth and ceiling, is in `budget.md`.
- [ ] `platform.md`, `runbook.md`, `budget.md` and `acceptance-lab.md` say what is true now; `lgtm/docs/adr/l5-kafka-disk.md` records the options and the decision with source links.
- [ ] `make lint`, `make platform-lint` and `make lab-lint` pass; CI is green.

## Report

The pull request link; the cause in two lines; what you changed on the cluster, in order; the numbers of the ceiling; the time ingest came back; the volumes that could still fill up; anything the owner must do.
