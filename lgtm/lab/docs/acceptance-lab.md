# Lab acceptance on the real cluster (card L4)

The log of the first run of `make platform` and `make lab` on the owner's Hyper-V cluster: each
command, its decisive output, and every defect found with its error text and its fix. Times are
UTC. All commands ran from `lgtm/lab` in WSL with `KUBECONFIG=~/.kube/lgtm-lab.config`
(context `lgtm-lab`).

## The cluster before the run (2026-11-10, 14:45)

Seven nodes on Kubernetes 1.35.10, containerd 2.2.1, Calico 3.31.4 and nothing else:

| Node | vCPU | Memory (`free -m`, total) | Longhorn disk |
|---|---|---|---|
| master1 to master3 | 2 | 1902 MiB | none |
| worker1 to worker4 | 4 | 7940 MiB | `/dev/sdc`, 40 GiB, at `/var/lib/longhorn` |

`vm/nodes.yml` says 6 vCPU per worker; the running VMs have 4 (`nproc`), as
`lgtm/docs/plan/00-overview.md` section 7 notes. Memory available before anything was installed:
master1 424 MiB, master2 867 MiB, master3 849 MiB; each worker about 7.2 GiB.

Tools: `make venv` (4 min 48 s on `/mnt/c`), `make collections`, `make lab-tools`.

## Platform

### First `make platform` (14:50 to 15:03)

```
PLAY RECAP
localhost : ok=27 changed=19 unreachable=0 failed=0 skipped=0 rescued=0 ignored=0
```

The play passed, but the cluster was not healthy behind it (defect 1).

### Defect 1: the first master ran out of memory

What was seen during and right after the first run:

- `kubectl top nodes`: master1 1638Mi (90%) and 1042m CPU (52%), master3 1638Mi (90%).
- On master1 (`free -m`, `/proc/pressure/memory`, `uptime`):
  `Mem: 1902 total, 1901 used, 0 available`, `some avg10=98.57 avg60=98.25`,
  `load average: 65.48, 41.93, 19.14`. Then `kubectl get nodes`: `master1 NotReady`.
- `kube-apiserver` used about 880 MiB resident on every master (`ps -eo rss`): 880764 KiB on
  master1, 893524 on master2, 911196 on master3. etcd about 110 MiB, the controller manager
  about 110 MiB, the kubelet about 60 MiB.
- Leader elections failed: `kube-controller-manager` and `kube-scheduler` on master1 and master3,
  `tigera-operator` (5 restarts), `strimzi-cluster-operator`, `envoy-gateway`, `csi-attacher`
  restarted. The Strimzi log:
  `Exception occurred while acquiring lock 'LeaseLock: kafka - strimzi-cluster-operator ...'`.
  Logs of master1's pods could not be read:
  `Get "https://10.10.0.11:10250/containerLogs/...": net/http: TLS handshake timeout`.
- `make platform-check` failed on Kafka, because CoreDNS could not answer:
  `WARN Couldn't resolve server telemetry-kafka-bootstrap.kafka.svc:9092 from bootstrap.servers as DNS resolution failed for telemetry-kafka-bootstrap.kafka.svc`
  then `FAIL Kafka produce and consume failed`, and `FAIL pods not Ready in kafka: telemetry-dual-role-0`
  (Strimzi was rolling the pod after `Pod is unschedulable or is not starting`).

Cause: master1 is the only node when `make cluster` installs Calico, so every Deployment that
tolerates the control-plane taint landed there and stayed: both CoreDNS pods, the Tigera
operator, `calico-kube-controllers`, two `calico-apiserver` pods, `calico-typha`, `goldmane` and
`whisker`. With the API server at about 880 MiB, a 2 GB master has no room for them.

Fix: the new role `ansible/roles/platform_control_plane` runs first in `make platform` (tag
`control-plane`, profile `full` only). It gives CoreDNS, the Tigera operator and the Calico
Deployments a required node affinity `node-role.kubernetes.io/control-plane DoesNotExist`: for
CoreDNS and the operator as a patch of the Deployment, for Calico through the operator's own
override fields (`calicoKubeControllersDeployment` and `typhaDeployment` in the Installation,
`apiServerDeployment`, `goldmaneDeployment`, `whiskerDeployment`; see
https://docs.tigera.io/calico/3.31/reference/installation/api). The DaemonSets (`calico-node`,
`kube-proxy`, the Calico CSI driver) stay on every node.

```
make platform TAGS=control-plane
TASK [platform_control_plane : Keep the Calico control plane off the control-plane nodes]
changed: [localhost] => (item=Installation) (item=APIServer) (item=Goldmane) (item=Whisker)
TASK [platform_control_plane : Keep CoreDNS and the Tigera operator off the control-plane nodes]
changed: [localhost] => (item=kube-system/coredns) (item=tigera-operator/tigera-operator)
```

A minute later every Calico Deployment carried the affinity, the pods ran on the workers and
master1 was `Ready` again. Memory available on the masters afterwards: master1 684 MiB, master2
116 MiB, master3 184 MiB (`kubectl top nodes`: 66%, 87%, 82%). The masters remain short; see
`budget.md`.

### Defect 2: Longhorn could not schedule the lab's volumes

`kubectl -n longhorn-system get nodes.longhorn.io` after the first run, per worker disk:

```
NODE      PATH                RESERVED      MAX           SCHED
worker1   /var/lib/longhorn   12587070259   41956900864   26843545600
worker2   /var/lib/longhorn   12587070259   41956900864   16173236224
```

Longhorn keeps 30 percent of a default disk in reserve (setting
`storage-reserved-percentage-for-default-disk`, default 30), and with
`storageOverProvisioningPercentage: 100` a disk accepts replicas only up to its maximum minus the
reserve: 29.4 GB per worker, about 117 GB on four. The platform and the lab ask for about 155 GiB
with two copies each (`budget.md`). RustFS's 25 GiB volume had already taken 25 of the 29 GB on
worker1 and worker4. Source: https://longhorn.io/docs/1.13.0/references/settings/

Fix: `storageOverProvisioningPercentage: 200` in `helm/platform/longhorn/values.yaml`. The volumes
are thin, so a replica takes only what was written; `storageMinimalAvailablePercentage: 15` still
stops scheduling on a disk that is really full.

```
make platform TAGS=longhorn
localhost : ok=9 changed=1 ...
kubectl -n longhorn-system get settings.longhorn.io storage-over-provisioning-percentage
storage-over-provisioning-percentage   200     true
```

### `make platform-check` and the Longhorn checks (15:13)

```
PASS every pod in kafka is Ready
PASS every pod in longhorn-system is Ready
PASS volume pvc-ad534359-... on longhorn kept its data across pods
PASS Longhorn volume has 2 healthy replicas
PASS S3 test: six buckets, put, list, range read, multipart upload, delete
PASS HTTP route answers through 10.10.0.5:80 (NodePort 30080)
PASS HTTPS route answers through 10.10.0.5:443 (NodePort 30443) with a certificate from lab-ca
PASS a message went through telemetry-kafka-bootstrap.kafka.svc:9092 without authentication
PLATFORM CHECK PASSED (profile full)
```

The checks of `docs/platform.md`, "Checks on the real cluster":

```
kubectl get storageclass
longhorn (default)   driver.longhorn.io   Delete   Immediate   true
longhorn-static      driver.longhorn.io   Delete   Immediate   true
kubectl -n longhorn-system get nodes.longhorn.io
worker1..worker4   READY True   ALLOWSCHEDULING true   SCHEDULABLE True
kubectl -n longhorn-system get volumes.longhorn.io
RustFS (25 GiB) and the three Kafka volumes (5 GiB): attached, healthy
curl -H 'Host: longhorn.lab.k8s.local' http://10.10.0.5/   ->  200
```

`longhorn-static` is a second, non-default class that the Longhorn chart always creates.

### Second `make platform` (15:16 to 15:19)

```
PLAY RECAP
localhost : ok=29 changed=0 unreachable=0 failed=0 skipped=1 rescued=0 ignored=0
```

`make lint` and `make platform-lint` pass (`RENDER CHECK PASSED`).
