# Lab runbook

How to run the lab from day to day: start and stop it with the VMs, bring it back after the PC
has slept or after one worker was down, upgrade Calico or one release, reset it, find a missing signal, free disk. Commands
run from `lgtm/lab` in WSL with `export KUBECONFIG=~/.kube/lgtm-lab.config`, except the VM
commands, which run in an elevated PowerShell in `lgtm\lab\vm\hyperv`. Addresses and passwords: `reference.md`.

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

Longhorn's hourly `kafka-trim` also runs the hour it missed while the lab was off, a few seconds
after the control plane is up. Longhorn and Kafka are not ready that early, so that run fails
(`FailedFilesystemTrim` events with `502 Bad Gateway` or `failed to find valid mountpoint`).
Longhorn keeps no failed Job of it, so nothing is left behind and `KubeJobFailed` does not fire;
the next run at minute 7 does the trim (`lgtm/docs/adr/l12-kafka-trim-after-start.md`).

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

## After the PC has slept

When Windows sleeps, the VMs do not shut down: they stop where they are and go on when the PC
wakes, with their clocks set forward. Running pods carry on. What can break is starting new pods.

What you see: a new pod stays in `ContainerCreating`, and `kubectl describe pod` shows events
`FailedCreatePodSandBox` with
`plugin type="calico" failed (add): error getting ClusterInformation: connection is unauthorized: Unauthorized`.
Pods that are being deleted on that node can hang as well.

Why: Calico's CNI plugin, which gives each new pod its network, talks to the API server with a
token that calico-node writes on each node. The token is valid 24 hours. Since Calico 3.31.6
calico-node renews it whenever kubelet rotates calico-node's own token, about every 48 minutes
and again soon after a wake, so a sleep of up to about 23 hours does no harm. After a longer
sleep the token has run out when the PC wakes, and new pods on that node fail until the renewal
comes. On Calico 3.31.4, which the lab had until card L7, the renewal came only every 6 to 12
hours of running time, and a 14-hour sleep was enough. Details and the arithmetic:
`lgtm/docs/adr/l7-calico-cni-token.md`.

The command, from `lgtm/lab` in WSL:

```bash
make calico-renew     # restarts calico-node one node at a time, waits, then checks; about 2 minutes
```

Each node's calico-node is down for a few seconds, one node at a time; Longhorn may report
`CalicoIsDown` on that node for that moment. It is safe to run on a healthy lab.

How to check: `make calico-renew` ends with one `PASS` line per node, and `make lab-check` runs the
same check first (`tests/lab/cni-token.sh`). It fails with a sentence that names the node and this
command when a node's token is 24 hours old or when the API server refused it after its last
renewal. To read the renewals yourself:

```bash
kubectl -n calico-system logs -l k8s-app=calico-node -c calico-node --prefix --timestamps --tail=-1 --since=25h | grep 'Wrote updated CNI kubeconfig file'
```

Shutting Windows down is different: the VMs shut down with it and stay off until
`lab-vms.ps1 start`, and every calico-node writes a new token when it starts.

## One worker is down or was restarted

This is what card C16's third drill showed on 2026-11-15, when the owner stopped worker4 at 19:05
UTC and started it again; the node was away about 12 minutes in all (module m17 step 13, `lgtm/docs/verification/m17.md`).
To stop or start one worker, in an elevated PowerShell: `Stop-VM -Name worker4`,
`Start-VM -Name worker4` (the VM's name is the node's name; `lab-vms.ps1` stops and starts all VMs only).

What happens, in order:

- The node turns `Unknown` within about 40 seconds (19:05:44). Its pods stay bound to it for 5
  minutes: Kubernetes gives every pod that sets no toleration of its own a toleration of 300 seconds
  for `node.kubernetes.io/unreachable`; DaemonSet pods are never evicted for it
  (https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/). Then they are
  marked `Terminating` (19:11:05). A Deployment's pod starts again on another worker. A StatefulSet's
  pod does not: its name is free only when the node answers again, when the Node object is deleted,
  or when someone force-deletes the pod
  (https://kubernetes.io/docs/tasks/run-application/force-delete-stateful-set-pod/). Do not
  force-delete them; wait for the node.
- **Recent Mimir reads fail for the whole outage** if the worker holds a Mimir ingester. Each
  partition of `mimir-ingest` has one ingester, which is a StatefulSet pod, so nothing else can
  answer for that partition. On 2026-11-15 worker4 held `mimir-ingester-1`, and queries over the
  last 13 hours failed from 19:05:29 to 19:18:22 with `partition 1: too many unhealthy instances
  in the ring`. Loki answered throughout.
- **product-catalog restarts until its database is back** when the worker holds `astronomy-db-0`
  (a StatefulSet). It restarted 7 times and went into `CrashLoopBackOff`; it recovered by itself
  once the node returned. checkout restarted once.
- worker4 was `Ready` again at 19:17:31. The StatefulSet pods started there again, and every check passed at 19:22:05 with nothing done by hand.
- **Longhorn's hourly `kafka-trim` may fail** if it runs while the worker is away. On 2026-11-15 its
  run of 19:07 failed. Until card L12 the failed Job stayed and Prometheus's `KubeJobFailed` fired
  until someone deleted it. Longhorn now keeps no failed Job of it
  (`recurringFailedJobsHistoryLimit: 0`), so nothing is left behind; the next hour's run does
  the trim.

What does not heal by itself:

- **Pods that moved do not move back.** After the drill worker4 held 21 pods and the other workers 38
  to 41. Nothing is wrong with that, but the other workers carry more memory than the budget planned
  (`budget.md`), and Prometheus fired `NodeMemoryMajorPagesFaults` for worker2 at 19:40. To spread the
  pods again, restart the Deployments that moved one at a time with `kubectl -n <namespace> rollout
  restart deployment/<name>`; the scheduler tends to place the new pods on the emptier worker.
- **Until card L11, product-catalog stayed ten times slower.** A pod that starts on a node whose page
  cache does not hold its program, for example after the node restarted, is charged for its own code.
  With the old 20Mi limit that did not fit, and the pod read its code back from disk hundreds of times
  a second. The limit is 40Mi since shop chart 0.3.1, and check 10 of `make lab-check` fails when any
  container of the shop is at its limit and reading its pages back from disk
  (`lgtm/docs/adr/l11-shop-memory-limits.md`).

Check afterwards:

```bash
kubectl get nodes                                      # 5 nodes Ready
kubectl get pods -A | grep -vE 'Running|Completed'     # only the header line
kubectl get jobs -A --field-selector status.successful=0
make lab-check                                         # LAB CHECK PASSED
```

Then look at Alertmanager (`reference.md`) for anything besides `Watchdog`.

## Upgrade Calico

Calico is not a Helm release. Its version is `calico_version` in
`ansible/inventory/group_vars/all.yml`; `make cluster` installs that version on a new cluster but
never touches the operator of a running one. To move a running lab to the version in that file,
follow Calico's steps for an operator installation
(https://docs.tigera.io/calico/3.31/operations/upgrading/kubernetes-upgrade), with `VERSION` the
value of `calico_version`:

```bash
kubectl apply --server-side --force-conflicts -f https://raw.githubusercontent.com/projectcalico/calico/vVERSION/manifests/operator-crds.yaml
kubectl apply --server-side --force-conflicts -f https://raw.githubusercontent.com/projectcalico/calico/vVERSION/manifests/tigera-operator.yaml
kubectl get tigerastatus                       # every row AVAILABLE True, after a few minutes
```

The operator then replaces every pod in `calico-system`, calico-node one node at a time.

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

## A fault flag does nothing

How it shows: the flag screen and its API (`GET /feature/api/read` on `flags.lab.k8s.local`)
show the flag on, but the service it belongs to goes on as before, longer than the 15 seconds a
change takes on this lab (`acceptance-lab.md`, "Fault flags reach every service").

The one command, with the flag still on (`<service>` is the Deployment the flag belongs to, see
`demo.md`, "Fault flags"):

```bash
kubectl -n shop rollout restart deployment/<service> && kubectl -n shop rollout status deployment/<service>
```

The new pod reads the flag from flagd at its first evaluation.

Why it could happen: a service whose flagd provider caches flag values and has stopped reading
flagd's event stream serves its old values. Before shop chart 0.2.0 this happened to product-catalog
when it started while flagd did not answer yet (`lgtm/docs/adr/l9-flag-cache.md`). Every service
whose provider caches now runs with `FLAGD_CACHE=disabled`, so it should not happen any more. No
check can see the fault in advance: the stuck provider logs nothing and exposes nothing, and flagd
still counts its event stream as open. If it happens, check that the service's Deployment still has
`FLAGD_CACHE=disabled`:

```bash
kubectl -n shop get deployment <service> -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="FLAGD_CACHE")].value}'; echo
```

## Tempo's querier is killed for memory

How it shows: `kubectl -n tempo get pods` shows the querier with restarts and `OOMKilled` as its last
state; at the same moment the query frontend logs `not ready: number of queriers connected to
query-frontend is 0`, its liveness probe fails once, and the query that was running ends with
`context canceled`.

On 2026-11-14 at 18:26 UTC the querier (limit 768Mi) was killed twice within seconds while it looked
up one trace by its id: `69c22a0fcce4dfdf1184996cdc4cc838`, tenant `lab`. Before that request it
used 62 MiB. A lookup by trace id reads every block that holds a span of the trace, and this trace
had spans in every block Tempo kept. It was payment's flagd event stream. Until shop version
`3.1.0-lab.2` payment started its flagd provider inside its first order, and the provider opens each
new stream (one every 10 minutes, its stream deadline) from the callback of the stream before, so
every stream's span was the child of the one before and the trace grew for the life of the pod.
Since `3.1.0-lab.2` payment starts the provider once, with tracing suppressed, and no trace of the
shop outlives its request (`lgtm/docs/adr/l10-payment-flag-stream.md`). The streams of ad,
fraud-detection and recommendation are traces of their own that end after 10 minutes
(`demo.md`, "Error spans with every flag off").

How to recognise such a trace without opening it:

- In a search it shows `<root span not yet received>`, and its duration is far longer than any
  request: hours or days instead of seconds.
- Its spans are long and the same each time, for example 600-second spans named
  `flagd.evaluation.v2.Service/EventStream`, and each has the one before as its parent. A search
  shows that without a lookup by id, for example over the last hour:
  `{ name = "flagd.evaluation.v2.Service/EventStream" } | select(resource.service.name, span:parentID)`.
  A service's stream span should have the parent id `0000000000000000`, and flagd's span of the
  same stream that service span as its parent. A stream span whose parent is another stream of the
  same service, or a span of an order, is the chain again.

What to do:

1. Do not open that trace by its id, in Grafana or with `/api/v2/traces/<id>`. If the querier was
   killed, it comes back by itself within seconds; nothing else needs doing.
2. Leave it out of searches: `&& name != "flagd.evaluation.v2.Service/EventStream"`, or a name that
   matches what the chained spans are called.
3. Find the service whose spans chain (`resource.service.name` in the search above) and its image:
   `kubectl -n shop get deploy <service> -o jsonpath='{.spec.template.spec.containers[0].image}'; echo`.
   For payment, an image older than `3.1.0-lab.2` brings the chain back; `make lab TAGS=shop` from
   `main` installs the current one. A restart alone ends one chain and starts the next.
4. The trace stays in Tempo until retention removes its blocks, about 48 to 50 hours after its last
   span. The trace of 2026-11-14 23:03 UTC, `1b9843164d5423b88ba041cee6303b88`, stopped growing when
   payment was upgraded on 2026-11-15 at 18:16 UTC: its last span ended at 18:13:28 UTC, so it is
   gone between about 18:15 and 20:15 UTC on 2026-11-17 (`acceptance-lab.md`, "An order's trace
   holds only its own spans").

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

## The Kafka trim keeps failing

What you see: the alert `LabKafkaTrimNotSucceeding` (lab-glue), or `make lab-check` failing check 11
with `kafka-trim last succeeded ... hours ago`. Both fire when Longhorn's hourly `kafka-trim` has not
succeeded for 3 hours while Prometheus watched it the whole time; the alert waits 10 minutes more.
Without the trim, Longhorn keeps every block Kafka has deleted, and the Kafka replicas grow towards
their whole 10 GiB (`lgtm/docs/adr/l5-kafka-disk.md`). The hours while the lab was off do not
count, so neither alert nor check can fire before the lab has run for 3 hours
(`lgtm/docs/adr/l12-kafka-trim-after-start.md`).

Longhorn keeps no failed Job of the trim, so `kubectl get jobs` shows nothing. Read the CronJob's
last success and the events of the failed runs (one hour in the cluster, longer in Loki):

```bash
kubectl -n longhorn-system get cronjob kafka-trim -o jsonpath='{.status.lastSuccessfulTime}{"
"}'
kubectl -n longhorn-system get events --field-selector involvedObject.name=kafka-trim
```

In Grafana's Explore, with the data source `loki`:
`{namespace="longhorn-system", reason="FailedFilesystemTrim"}`.

A `502` or `failed to find valid mountpoint` means Longhorn's API or a Kafka volume was not ready:
check that the Longhorn pods and the three Kafka pods run (`kubectl -n longhorn-system get pods`,
`kubectl -n kafka get pods`) and that the three volumes are healthy on the Longhorn screen. A
`kafka-trim` Job that stays `Running` for hours holds the next runs back (`concurrencyPolicy:
Forbid`); look at its pod. The next run at minute 7 tries again; the alert ends with the first
success. To trim one volume at once,
use **Trim Filesystem** on the Longhorn screen.

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
