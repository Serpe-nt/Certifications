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
kubectl get nodes                                      # 7 nodes Ready
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

## Free disk

The lab is planned for at most 90 GB of real disk. To see where it goes:

```bash
kubectl get pvc -A                                     # what each volume asked for
kubectl -n longhorn-system get volumes.longhorn.io     # actual size per volume
kubectl -n longhorn-system get nodes.longhorn.io -o custom-columns=NODE:.metadata.name,SCHEDULED:.status.diskStatus.*.storageScheduled,AVAILABLE:.status.diskStatus.*.storageAvailable
```

Ways to free it, smallest first:

1. Shorter retention (module m17): `compactor_blocks_retention_period` in `helm/mimir/values.yaml`,
   `retention_period` in `helm/loki/values.yaml`, `block_retention` in `helm/tempo/values.yaml`,
   `log.retention.hours` of Kafka in `helm/platform/strimzi/kafka-cluster.yaml`. Apply with
   `make lab TAGS=<release>` or `make platform TAGS=kafka`.
2. Delete Longhorn snapshots you no longer need on the Longhorn screen (volume, Snapshots).
3. Unused container images on a node: `ssh -i ~/.ssh/ansible vaka@<node> sudo crictl rmi --prune`.
4. `make reset`, then `make lab`: drops all lab data and starts empty.

The VMs' disks are dynamic VHDX files: they grow, and they do not shrink by themselves when data is
deleted. Shrinking them is done on Windows with the VMs stopped (`Optimize-VHD` in an elevated
PowerShell) and is up to the owner.
