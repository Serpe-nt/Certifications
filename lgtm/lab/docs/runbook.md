# Lab runbook

How to run the lab from day to day: start and stop it with the VMs, upgrade one release, reset
it, find a missing signal, free disk. Commands run from `lgtm/lab` in WSL with
`export KUBECONFIG=~/.kube/lgtm-lab.config`, except the VM commands, which run in an elevated
PowerShell in `lgtm\lab\vm\hyperv`. Addresses and passwords: `reference.md`.

## Start and stop

Stop (elevated PowerShell): `powershell -ExecutionPolicy Bypass -File .\lab-vms.ps1 stop`. It
shuts the workers down first, then the control plane, then `lb`. Nothing needs to be drained
first: every volume has two replicas and Kafka, Mimir and Loki keep three copies of what they
take in.

Start: `powershell -ExecutionPolicy Bypass -File .\lab-vms.ps1 start` (lb, then the control
plane, then the workers). Then wait, with nothing done by hand (`acceptance-lab.md`): on
2026-11-10, with only the platform installed, every pod was Ready five minutes after the reboot
(15:57 to 16:02); with the whole lab installed, eight minutes (21:48:47 to 21:56:48), the Mimir
distributors last, once Kafka and the ingesters answered. For a few minutes you
see Longhorn instance managers and the Kafka pods in `Unknown`, the Longhorn CSI plugins
restarting, the Kafka entity operator in `CrashLoopBackOff` until the brokers are back, and
`kubectl top` answering "Metrics API not available". All of that clears by itself.

Check that it is back:

```bash
kubectl get nodes                                      # 5 nodes Ready
kubectl get pods -A | grep -vE 'Running|Completed'     # only the header line
make platform-check                                    # PLATFORM CHECK PASSED (profile full)
make lab-check                                         # LAB CHECK PASSED
```

If one pod stays down for more than 10 minutes after the nodes are Ready, look at it with
`kubectl -n <namespace> describe pod <pod>` and its logs before deleting it. A pod that waits on a
volume shows it in the events (`FailedAttachVolume`): open the Longhorn screen and check that the
volume has a healthy replica.

## Upgrade or change one release

Each release has its folder in `helm/<release>/`: `VERSION` (chart and version), `values.yaml`
(real cluster), `values-kind.yaml` (kind test). To change a value or move to a new chart version:

1. Read the chart's upgrade notes for the versions in between (the links are in the ADR of
   `lgtm/docs/adr/` that pinned it).
2. Edit `VERSION` or `values.yaml`. For a chart in this repository (`demo/chart`,
   `charts/lab-glue`), raise the `version` in its `Chart.yaml` with every template change: the
   playbook upgrades a local chart only when its version or its values change.
3. `make lab-lint`: the release renders, passes the schema check, and every container still has
   requests and limits.
4. `make lab TAGS=<tag>` with one of `prometheus`, `mimir`, `loki`, `tempo`, `otel-gateway`,
   `alloy`, `grafana`, `glue`, `shop`. The platform's add-ons work the same way with
   `make platform TAGS=<tag>` (`control-plane`, `metrics-server`, `cert-manager`, `gateway`,
   `longhorn`, `s3`, `kafka`) and their versions in `helm/platform/versions.yml`.
5. `make lab-check`, and `make lab` once more: it must report `changed=0`.

The partition count of Mimir's and Tempo's Kafka topics comes from their values
(`auto_create_topic_default_partitions`); `make lab` creates or grows the topic before the release.
Kafka can add partitions but never remove them. Tempo needs exactly as many partitions as
block-builders and live-stores; Mimir needs at least as many as ingesters.

## Reset

`make reset` removes every lab release (the shop first), their volumes, the objects in the six
buckets and the two ingest topics in Kafka. It keeps the cluster, the platform, the Grafana
password and the lab seed. `make lab` then installs everything again from empty; on 2026-11-10
the pair took about 25 minutes (`acceptance-lab.md`).

To start the platform again from nothing as well: `helm uninstall` each add-on (see
`helm list -A`), delete the namespaces and the Longhorn volumes, and run `make platform`. The S3
keys are then new.

## A signal is missing

Work from the source to the store. Every hop has a check:

| Hop | Check |
|---|---|
| The shop sends | `kubectl -n shop get pods`: all Ready. The load generator runs (http://loadgen.lab.k8s.local). |
| Collector gateway takes it in and sends it on | `kubectl -n otel logs deploy/otel-gateway --since=10m \| grep -iE 'exporting failed\|dropping'` prints nothing. |
| Mimir takes metrics | `kubectl -n mimir logs deploy/mimir-distributor --since=10m \| grep level=error`. Ingest goes through Kafka: `kubectl -n kafka get kafkatopic` shows `mimir-ingest` Ready. |
| Loki takes logs | `kubectl -n loki logs deploy/loki-distributor --since=10m \| grep level=error`. |
| Tempo takes traces | `kubectl -n tempo logs deploy/tempo-distributor --since=10m \| grep 'failed to write to kafka'` prints nothing; `tempo-traces` has 2 partitions. |
| Pod logs and events | `kubectl -n alloy get pods`; the Alloy screen (http://alloy.lab.k8s.local) shows every component healthy. The shop's own pods are left out of file collection on purpose: their logs arrive over OTLP. |
| Prometheus track | Prometheus's Targets page; `prometheus_remote_storage_samples_failed_total` stays flat; query `mimir-prom`, not `mimir`. |
| The query | The right tenant: shop data in `lab`, Kubernetes metrics in `prom`. A Grafana panel uses the data source UID of `reference.md`. |

`make lab-check` runs the whole chain in about four minutes and names the hop that fails.

Defects seen on this cluster and how they showed (`acceptance-lab.md`):

- Traces of some services missing, the rest present: a Kafka topic with fewer partitions than the
  release expects. Tempo's distributor logs `invalid record partitioning choice of 1 from 1
  available`. `make lab TAGS=tempo` recreates the topic with the right count.
- DNS errors everywhere (`DNS resolution failed for telemetry-kafka-bootstrap.kafka.svc`) and a
  master `NotReady`: a control-plane node out of memory. `make platform TAGS=control-plane` keeps
  CoreDNS and the Calico control plane on the workers.
- No new metrics in Mimir and no new traces in Tempo, while Loki and Prometheus work: Kafka is
  down. Mimir's distributors log `failed to write to partitions`, Tempo's `failed to write to
  kafka`, Prometheus `Failed to send batch, retrying`. See "Kafka's disks are full" below.

## Kafka's disks are full

How it shows: the three pods `telemetry-dual-role-*` restart every minute or so
(`CrashLoopBackOff`), the `Kafka` resource `telemetry` is `NotReady` with reason `FatalProblem`,
and the brokers log `java.io.IOException: No space left on device` and then
`Shutting down because we were unable to register with the controller quorum`.
`make lab-check` fails its last check, and the alert `LabVolumeFillingUp` fired before that.

```bash
kubectl -n kafka get kafka,pods
kubectl -n kafka logs telemetry-dual-role-0 --previous | grep -E 'No space|log dirs.*failed'
make lab-check            # check 8 names the volumes above 85%
```

A broker with a full volume cannot start, so a lower retention limit alone does not help: Kafka
applies it only once it runs. Give it room first, then let the size limit hold it.

1. Raise `storage_size` in `helm/platform/strimzi/kafka-cluster.yaml` (10Gi to 15Gi, for
   example) and check that the Longhorn disks have room for two replicas of the extra space
   (`kubectl -n longhorn-system get nodes.longhorn.io`). If the volumes filled although the size
   limit was in place, lower `log.retention.bytes` there as well (`platform.md` has the
   arithmetic).
2. `make platform TAGS=kafka`. Strimzi raises the three claims and Longhorn grows the volumes
   and their filesystems while they stay attached (`kubectl -n kafka get pvc` shows the new
   capacity, the events show `FileSystemResizeSuccessful`). Kubernetes never shrinks a volume.
3. The brokers may still not come back by themselves: each restarts after its own back-off
   delay, lives about 70 seconds waiting for the other controllers, and the three never run at
   the same time. Strimzi's rolling update gives up on them (`Pod is unschedulable or is not
   starting`). Once the claims show the new capacity, delete the three pods together; Strimzi
   recreates them at once and their volumes keep the data:

   ```bash
   kubectl -n kafka delete pod -l strimzi.io/cluster=telemetry,strimzi.io/pool-name=dual-role
   ```

   The `Kafka` resource is `Ready` about a minute later, and the playbook's wait (15 minutes)
   ends.
4. Check: `kubectl -n kafka get kafka,kafkatopic` (all Ready), then `make lab-check`. The brokers
   delete old segments on their next retention check (every 5 minutes) and log
   `due to log retention size ... breach`. The outage stays a gap in Mimir and Tempo: on
   2026-11-12 tenant `prom` had samples again only from the repair on.

Done on 2026-11-12 (`acceptance-lab.md`, "Kafka ran out of disk").

## A Longhorn disk is short of space

How it shows: `make lab-check` fails check 9, `FAIL  Longhorn disk of <worker> has ... free (..%),
under 25%`. Longhorn itself stops placing replicas on a disk below 15% free.

The usual cause is that replicas have bunched on a few workers. Longhorn places a new replica by
what is already *scheduled* on each disk, so RustFS's thin 25 GiB volume, created first, pushes
the Kafka volumes onto the other workers (`lgtm/docs/adr/l5b-rustfs-memory.md`). The role
`platform_kafka` prevents that for Kafka with data locality: each Kafka volume keeps one replica
on the worker of the broker that uses it.

See where the replicas are and what each disk has free:

```bash
kubectl -n longhorn-system get replicas.longhorn.io -o custom-columns=VOLUME:.spec.volumeName,NODE:.spec.nodeID,STATE:.status.currentState --sort-by=.spec.nodeID
kubectl -n longhorn-system get volumes.longhorn.io -o custom-columns=VOLUME:.metadata.name,PVC:.status.kubernetesStatus.pvcName,NODE:.status.currentNodeID,LOCALITY:.spec.dataLocality,ROBUSTNESS:.status.robustness
kubectl -n longhorn-system get nodes.longhorn.io -o custom-columns=NODE:.metadata.name,AVAILABLE:.status.diskStatus.*.storageAvailable,MAXIMUM:.status.diskStatus.*.storageMaximum
```

If Kafka's replicas are the ones bunched (a Kafka volume without a replica on its broker's node,
or `LOCALITY` not `best-effort`), run `make platform TAGS=kafka`. The role sets data locality on
one Kafka volume at a time and waits until it has two running replicas, one of them on its
broker's node; a volume that is already right passes at once. Expect a few minutes per volume
that moves, each volume `healthy` throughout, the Kafka pods not restarted, and the free space
of the crowded disks going up by the size of the replicas that left. The broker pods must be
running: a volume that is not attached has no node, and its wait fails after 30 minutes. Get
Kafka Ready first (`kubectl -n kafka get kafka,pods`) and run it again.

If other volumes fill the disk, see "Free disk" below.

Fallback, when the role cannot be used: move one replica of a volume by hand, keeping two
healthy ones. Raise the volume's count to 3
(`kubectl -n longhorn-system patch volumes.longhorn.io <volume> --type merge -p '{"spec":{"numberOfReplicas":3}}'`),
wait until it is healthy with three replicas running, set the count back to 2 (Longhorn removes
none of three healthy replicas by itself), then delete the replica on the crowded worker
(`kubectl -n longhorn-system delete replicas.longhorn.io <replica>`). Check the counts after each
step, and do one volume at a time.

## Free disk

The lab is planned for at most 90 GB of real disk. To see where it goes:

```bash
make lab-check                                         # check 8: every volume and how full it is
kubectl get pvc -A                                     # what each volume asked for
kubectl -n longhorn-system get volumes.longhorn.io     # actual size per volume
kubectl -n longhorn-system get nodes.longhorn.io -o custom-columns=NODE:.metadata.name,SCHEDULED:.status.diskStatus.*.storageScheduled,AVAILABLE:.status.diskStatus.*.storageAvailable
```

Ways to free it, smallest first:

1. Shorter retention (module m17): `compactor_blocks_retention_period` in `helm/mimir/values.yaml`,
   `retention_period` in `helm/loki/values.yaml`, `block_retention` in `helm/tempo/values.yaml`,
   `log.retention.hours` and `log.retention.bytes` of Kafka in
   `helm/platform/strimzi/kafka-cluster.yaml`. Apply with `make lab TAGS=<release>` or
   `make platform TAGS=kafka`.
2. Delete Longhorn snapshots you no longer need on the Longhorn screen (volume, Snapshots).
   Longhorn keeps the blocks of deleted files until a filesystem is trimmed; the Kafka volumes
   are trimmed every hour by the RecurringJob `kafka-trim` (`budget.md`), any other volume with
   **Trim Filesystem** on the Longhorn screen.
3. Unused container images on a node: `ssh -i ~/.ssh/ansible vaka@<node> sudo crictl rmi --prune`.
4. `make reset`, then `make lab`: drops all lab data and starts empty.

The VMs' disks are dynamic VHDX files: they grow, and they do not shrink by themselves when data is
deleted. Shrinking them is done on Windows with the VMs stopped (`Optimize-VHD` in an elevated
PowerShell) and is up to the owner.
