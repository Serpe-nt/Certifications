# L7: new pods start after the PC has slept

Status: proposed by worker L7 on 2026-11-14; applied to the running lab only with the owner's word
(see "On the running lab" at the end).

## Context

On 2026-11-14 at 12:50 UTC new pods stopped starting on worker2, worker3 and worker4 with
`plugin type="calico" failed (add): error getting ClusterInformation: connection is unauthorized:
Unauthorized`. The PC had slept overnight. The lab's Prometheus has no samples from 21:09:32 UTC on
2026-11-13 to 11:48:32 UTC on 2026-11-14, a pause of 14.65 hours (query `max(up{job="apiserver"})`
at a 60 s step, read at 17:48 UTC). Each node's `node_boot_time_seconds` now reads about 03:23 UTC
on 2026-11-14, 14.65 hours later than the real boot: the guest clocks stood still and were set
forward when the VMs came back. No node changed its `Ready` condition during the pause (the last
transition of each is 2026-11-13 12:47 to 12:49 UTC).

How calico-node 3.31.4 renews the token of the CNI plugin, from
https://raw.githubusercontent.com/projectcalico/calico/v3.31.4/node/pkg/cni/token_watch.go:

- It asks the API server for a token of the service account `calico-cni-plugin`, valid
  `defaultCNITokenValiditySeconds = 24 * 60 * 60`, writes it into
  `/etc/cni/net.d/calico-kubeconfig` on the node and logs `Wrote updated CNI kubeconfig file.`
- It then waits a quarter of the time left (`defaultRefreshFraction = 4`), plus a random part of up
  to as much again, so 6 to 12 hours. If `CNI_TOKEN_REFRESH_INTERVAL` is set (a Go duration), that
  interval replaces the quarter; the random part still applies.
- The wait is `time.After`. A Go timer counts the time the process runs. While Hyper-V has the VM
  paused, it does not count. A token is valid by the API server's clock, which is set forward
  after the pause.

So with 3.31.4 a token is renewed 6 to 12 running hours after the last one. A pause that starts
just after a renewal can last up to 12 hours before the token runs out, and a pause that starts late
in a wait, much less: on 2026-11-14 a pause of 14.65 hours was too long for three of the five nodes.
After the pause, new pods fail until each node's timer fires, which can take up to 12 hours.

## Options

| Option | Result |
|---|---|
| 1. Set `CNI_TOKEN_REFRESH_INTERVAL` on calico-node through the operator's `Installation` | Not possible. The Installation API lets an override of the calico-node container set only `name` and `resources` (`CalicoNodeDaemonSetContainer`, https://docs.tigera.io/calico/3.31/reference/installation/api). The operator builds calico-node's environment itself (`nodeEnvVars` in https://raw.githubusercontent.com/tigera/operator/v1.40.7/pkg/render/node.go; v1.40.7 is the operator of Calico 3.31.4). |
| 2. Patch the variable into the DaemonSet with `kubectl set env` | Undone. The operator replaces the DaemonSet with its own and keeps only the labels and annotations of the pod template (`mergeState` in https://raw.githubusercontent.com/tigera/operator/v1.40.7/pkg/controller/utils/component.go). |
| 3. Option 2 plus the annotation `unsupported.operator.tigera.io/ignore` on the DaemonSet | Works, but the operator then leaves calico-node alone for good: no later change of the Installation and no upgrade reaches it (`IgnoreObject` in the same file). Rejected: the name says unsupported, and it would trap the next person who changes Calico. |
| 4. A CronJob or a timer on each node that restarts calico-node | More parts to keep, a restart of every calico-node a few times a day that shows in the lab's metrics, and a CronJob's schedule is again kept by a controller in a paused VM. Rejected. |
| 5. Calico 3.31.7, the newest patch of the same minor | Chosen. Since 3.31.6, calico-node watches the folder of its own service account token and renews the CNI token at once when kubelet rotates that token. |

What option 5 is, with its sources:

- The change: "calico/node now refreshes the CNI plugin's kubeconfig immediately when the pod's
  projected ServiceAccount token is rotated" (release notes of 3.31.6,
  https://github.com/projectcalico/calico/blob/release-v3.31/release-notes/v3.31.6-release-notes.md;
  pull requests https://github.com/projectcalico/calico/pull/12595 and, for 3.31,
  https://github.com/projectcalico/calico/pull/12941). In
  https://raw.githubusercontent.com/projectcalico/calico/v3.31.7/node/pkg/cni/token_watch.go,
  calico-node logs `Watching service account token directory for rotation` when it starts and
  `Projected service account token changed; refreshing CNI kubeconfig immediately` on each
  rotation, followed by the same `Wrote updated CNI kubeconfig file.` The 6 to 12 hour timer stays
  as a fallback.
- When kubelet rotates the token: "The kubelet proactively requests rotation for the token if it is
  older than 80% of its total time-to-live (TTL), or if the token is older than 24 hours"
  (https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/). calico-node's
  token is the usual `kube-api-access` projection with `expirationSeconds: 3607` (read from the
  lab's calico-node pods on 2026-11-14), so kubelet rotates it about every 48 minutes. Kubelet
  compares the token's expiry time with the clock, not with a timer (`requiresRefresh` in
  https://raw.githubusercontent.com/kubernetes/kubernetes/v1.35.0/pkg/kubelet/token/token_manager.go),
  so after a pause it sees an old token and rotates it at its next pass over the pod.
- Other changes from 3.31.4 to 3.31.7 (release notes of 3.31.5, 3.31.6 and 3.31.7 in the same
  folder): bug fixes, and in 3.31.7 a CNI configuration that declares `cniVersion` 1.0.0, which
  "Requires containerd v1.6+ or CRI-O v1.24+". The lab runs containerd 2.2.1. The operator moves
  from v1.40.7 to v1.40.15 (the `image:` line of
  https://raw.githubusercontent.com/projectcalico/calico/v3.31.7/manifests/tigera-operator.yaml).

## Arithmetic

With 3.31.7, while the VMs run, each node gets a new CNI token about every 48 minutes (kubelet's
rotation), so its token is at most about 50 minutes old when a pause starts.

- Longest pause without any failed pod: 24 hours minus that age, about 23 hours. A night of 16
  hours leaves more than 7 hours to spare.
- After a longer pause the token has run out when the VMs come back. New pods on that node fail
  until kubelet next passes over calico-node's pod and rotates its token; calico-node then writes a
  new CNI token at once. This delay is expected to be a few minutes and is to be measured on the
  lab after a real sleep (the morning record in `lgtm/lab/docs/acceptance-cluster.md`). If the
  watch fails, the old timer still renews within 12 running hours, and `make calico-renew` does it
  in about two minutes.

For comparison, 3.31.4: tokens renewed every 6 to 12 running hours; a pause is survived for sure
only up to 12 hours; after a longer one, pods fail for up to 12 hours.

Option 1 would not have done better: with an interval `I`, the wait is `I` to `2I` of running
time, so the longest safe pause is 24 hours minus `2I` (22 hours for one hour), and after a longer
pause pods fail for up to `2I`.

## The command for after a long pause

`make calico-renew` (in `lgtm/lab/mk/lab.mk`) runs
`kubectl -n calico-system rollout restart daemonset/calico-node`, waits for
`rollout status`, then runs the check below. A restarted calico-node writes a new token as it
starts. The rollout replaces one node's pod at a time (`maxUnavailable: 1`, `maxSurge: 0`, read
from the lab), so only one node at a time has its Calico agent down, for a few seconds. The
operator keeps the template annotation `kubectl.kubernetes.io/restartedAt` that the restart sets
(it merges template annotations, `mergeState` above), so it does not undo the restart. It is safe
on a healthy lab: the only effect is new tokens. Longhorn reports `CalicoIsDown` node pressure
for the moments calico-node is down on a node (seen at 17:37 UTC on 2026-11-14, when all five
calico-node pods were deleted at once); that clears by itself.

## The check

`make lab-check` runs `lgtm/lab/tests/lab/cni-token.sh` first, before it waits for the load
generator. It only reads. For each node it takes the time of the last
`Wrote updated CNI kubeconfig file.` line of calico-node (`kubectl logs --timestamps --since=25h`),
or the start of the calico-node container when there is no line (a starting calico-node writes a
token). It fails when that time is 24 hours old or more, or when an event
`FailedCreatePodSandBox` whose message holds `unauthorized` came from that node after that time.
Each failure is one sentence that names the node, the cause and `make calico-renew`. It never reads
the token: the file on the node is a secret. calico-node logged about 1 kB a minute per node on
2026-11-14 after its start-up, so 25 hours of log stay well inside the container log file. The
other lab checks have no tests of their own in `lgtm/lab/tests`, so this one has none either; it
was run on the lab (all five nodes PASS) and against a stub `kubectl` that gave each failure once.

## What else the pause touched

From the pause of 2026-11-13 21:09 UTC to 2026-11-14 11:48 UTC, read on 2026-11-14 at about
17:50 UTC.

| What | What happened | Does it matter |
|---|---|---|
| Calico CNI token | Ran out on worker2, worker3 and worker4 at 12:49 UTC | Yes: no new pod there. This ADR. |
| cert-manager's controller | Exited with code 0 at 11:49:40 UTC and restarted; its lease `kube-system/cert-manager-controller` shows one transition | No. It lost its leader lease while paused, stepped down and took it again. Certificates were not touched. |
| Strimzi's cluster operator | `Stopped being a leader => exiting` at 11:47:27 UTC, exit code 1, restarted at once | No. Same cause; the Kafka brokers did not restart. |
| Kafka (KRaft) | The quorum controller moved at 11:48:38 UTC (`Renouncing the leadership`, `No controller appears to be active`), active again at 11:48:40 | No. Two seconds; no broker restarted. |
| Mimir, tenant `prom` | About 60,000 samples discarded in the minute 11:47 UTC (`new-value-for-timestamp`, `sample-out-of-order`), none before or since (card L8's reading) | No. One burst as Prometheus resumes; module m11 may meet it in `cortex_discarded_samples_total`. |
| Prometheus | No samples for the 14.65 hours | Expected: every graph has a hole for the time the PC slept. |
| `node_boot_time_seconds` | Moved 14.65 hours later on every node | Only for a learner who reads uptime from it: uptime looks shorter by the time the PC slept. |
| Control plane, node leases | `kube-controller-manager` and `kube-scheduler` leases: no transition. No node went `NotReady` | No. master1 was paused with the workers, so nothing saw a node go silent. |
| kubelet certificates | Not touched | No. kubeadm's client certificates are valid one year and kubelet renews its own (https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/); a night is far from either limit. |

Only the CNI token stops a learner, so it is the only thing changed.

## The VMs when Windows sleeps or shuts down

`lab-vms.ps1 create` sets every VM to `-AutomaticStopAction ShutDown -AutomaticStartAction Nothing`
(`Set-VM` in `lgtm/lab/vm/hyperv/LabVms.psm1`). Microsoft's `Set-VM` page gives
`-AutomaticStopAction Shutdown` as the way to make a VM "shut down when the Hyper-V host shuts
down" (https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vm). So:

- Windows shuts down or restarts (an update included): each guest shuts down cleanly and stays off
  until `lab-vms.ps1 start`. Every calico-node starts again with the VMs and writes a new token, so
  this case never had the fault.
- Windows sleeps: the PC offers Standby (S3) and Hibernate (`powercfg /a`, 2026-11-14). The VMs do
  not shut down; they stop where they are and go on after the wake, which is what Prometheus and
  `node_boot_time_seconds` show for 2026-11-14. No VM setting changes that.

Shutting down on a Windows shutdown is already the default for new VMs, so the script is not
changed. The owner can confirm it for the running VMs in an elevated PowerShell:
`Get-VM | Select-Object Name, AutomaticStopAction, AutomaticStartAction` (ShutDown and Nothing on
all six). A session without administrator rights cannot read it.

## On the running lab

Changing `calico_version` changes what `make cluster` installs on a new cluster. `master_init`
installs the operator only when it is missing, so the running lab is upgraded by hand, with
Calico's own steps for an operator installation
(https://docs.tigera.io/calico/3.31/operations/upgrading/kubernetes-upgrade), from `lgtm/lab` in
WSL:

```bash
kubectl apply --server-side --force-conflicts -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.7/manifests/operator-crds.yaml
kubectl apply --server-side --force-conflicts -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.7/manifests/tigera-operator.yaml
kubectl get tigerastatus                        # every row AVAILABLE True, after a few minutes
kubectl get installation default -o jsonpath='{.status.calicoVersion}'   # v3.31.7
```

The operator then replaces every Calico pod: calico-node one node at a time, Typha, the kube
controllers, the Calico API server, the CSI node driver, Goldmane and Whisker. Each node's network
is interrupted for a few seconds while its calico-node restarts, so a request in flight on that
node can fail. The Installation, APIServer, Goldmane and Whisker resources and their affinity
overrides (role `platform_control_plane`) are not touched by the two files.
