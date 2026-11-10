# The lab platform

What `make platform` adds to the empty cluster so that it can hold the LGTM stack: storage,
an S3 store, a gateway, Kafka, certificates and resource metrics. Run it after `make cluster`
(see `cluster.md`) and before `make lab`.

## What you get

| Add-on | Release (chart, version) | Namespace | What the lab uses |
|---|---|---|---|
| Longhorn | `longhorn` (longhorn 1.13.0) | `longhorn-system` | Default StorageClass `longhorn`, two replicas per volume, data on `/var/lib/longhorn` of each worker |
| RustFS | `rustfs` (rustfs 1.0.4) | `s3` | S3 API `rustfs-svc.s3.svc:9000`; buckets `mimir-blocks`, `mimir-ruler`, `mimir-alertmanager`, `loki-chunks`, `loki-ruler`, `tempo-traces`; Secret `lab-s3` in `s3`, `mimir`, `loki`, `tempo` |
| Envoy Gateway | `envoy-gateway` (gateway-helm v1.10.0) | `gateway` | Gateway `lab` (class `lab-envoy`): HTTP on NodePort 30080, HTTPS on NodePort 30443 for `*.lab.k8s.local`, routes from all namespaces |
| Strimzi and Kafka | `strimzi` (strimzi-kafka-operator 1.3.1) | `kafka` | Kafka 4.3.2 cluster `telemetry`, KRaft, 3 nodes; `telemetry-kafka-bootstrap.kafka.svc:9092`, no authentication |
| cert-manager | `cert-manager` (cert-manager v1.21.3) | `cert-manager` | ClusterIssuer `lab-ca` (a self-signed root, Secret `cert-manager/lab-root-ca`); the gateway's certificate `gateway/lab-gateway-tls` |
| metrics-server | `metrics-server` (metrics-server 3.14.0) | `kube-system` | `kubectl top`, the resource metrics API |

Every version is pinned in `helm/platform/versions.yml`; the values of each release are in
`helm/platform/<add-on>/`. Why each was chosen: `lgtm/docs/adr/l2-*.md`.

## Commands

From `lgtm/lab` in WSL:

```bash
make platform                    # everything, on the cluster in ~/.kube/lgtm-lab.config
make platform TAGS=kafka         # one add-on: control-plane, metrics-server, cert-manager, gateway, longhorn, s3, kafka
make platform-check              # the smoke test
make platform-lint               # helm lint and a schema check of every rendered chart
```

A second `make platform` changes nothing. The playbook is `ansible/playbooks/platform.yml`; it
runs on the control machine and talks to the cluster only through `LAB_KUBECONFIG`.

### The kind profile

`LAB_PROFILE=kind` installs the same add-ons with small values on a kind cluster: one Kafka
node, one proxy, small volumes on kind's StorageClass `standard`, and no Longhorn (it needs
iSCSI on real nodes).

```bash
make platform-tools                                   # helm, kubectl, kind, kubeconform into .bin
make platform-kind                                    # kind cluster lgtm-l2, NodePorts on 127.0.0.1:18080 and 18443
make platform LAB_PROFILE=kind LAB_KUBECONFIG=$PWD/.bin/lgtm-l2.kubeconfig
make platform-check LAB_PROFILE=kind LAB_KUBECONFIG=$PWD/.bin/lgtm-l2.kubeconfig
make platform-kind-delete
```

## Opening the screens

The browser reaches every screen through HAProxy on `lb` (port 80) and the Gateway `lab`.
`*.lab.k8s.local` resolves to `lb` once `lab-vms.ps1 create -ConfigureDns` has run.

| Screen | Address | Sign in |
|---|---|---|
| Longhorn | http://longhorn.lab.k8s.local | no sign-in |
| RustFS console | http://s3.lab.k8s.local | access key and secret key of `lab-s3`, see below |

```bash
export KUBECONFIG=~/.kube/lgtm-lab.config
kubectl -n s3 get secret lab-s3 -o go-template='{{.data.access_key | base64decode}}{{"\n"}}{{.data.secret_key | base64decode}}{{"\n"}}'
```

HTTPS works for every `*.lab.k8s.local` name on port 443 with a certificate from the lab CA.
To trust it in a browser or with curl, export the root certificate:

```bash
kubectl -n cert-manager get secret lab-root-ca -o go-template='{{index .data "ca.crt" | base64decode}}' > lab-root-ca.crt
curl --cacert lab-root-ca.crt https://longhorn.lab.k8s.local/
```

Kafka, metrics-server and cert-manager have no screen. Look at them with
`kubectl -n kafka get kafka,kafkanodepool,pods`, `kubectl top nodes` and
`kubectl get clusterissuer,certificate -A`.

## What the other cards use

These names are the "Platform interfaces" of `lgtm/docs/plan/02-lab-contract.md`:

- StorageClass: the variable `lab_storage_class` (`longhorn`, or `standard` on kind).
- S3: Secret `lab-s3` in `mimir`, `loki` and `tempo` with `endpoint` (`rustfs-svc.s3.svc:9000`,
  host and port, plain HTTP, so `insecure: true` in Mimir, Loki and Tempo), `region`
  (`us-east-1`), `access_key`, `secret_key`, and an extra key `endpoint_url`
  (`http://rustfs-svc.s3.svc:9000`) for clients that want a URL. Use path-style addressing.
  The keys are generated on the first run and never written to disk.
- Kafka: `telemetry-kafka-bootstrap.kafka.svc:9092`, plain text, no authentication.
- Gateway: `parentRefs: [{name: lab, namespace: gateway}]`; add `sectionName: http` or `https`
  to use one listener only.
- Certificates: `issuerRef: {kind: ClusterIssuer, name: lab-ca}`.

## Resource budget

Every container has CPU and memory requests and limits. The values set them for each add-on;
a LimitRange `platform-defaults` in `cert-manager`, `gateway`, `s3` and `kafka` gives any
container that has none (init containers, jobs) 50m/64Mi requested and 500m/256Mi as limit.
The smoke test fails if a container in those namespaces, or metrics-server, lacks either.
Longhorn is the exception: it creates its CSI, engine-image and instance-manager pods itself,
and only reserves CPU for the instance managers; `make platform-check` lists those containers.

Real cluster (profile `full`), what Kubernetes reserves (requests) and the most each may take
(limits):

| Component | Pods | Request per pod (CPU, memory) | Limit per pod (CPU, memory) | Requests in total | Limits in total |
|---|---|---|---|---|---|
| metrics-server | 1 | 50m, 64Mi | 500m, 192Mi | 50m, 64Mi | 500m, 192Mi |
| cert-manager controller, cainjector, webhook | 3 | 20m/10m/10m, 64Mi/64Mi/32Mi | 500m/200m/200m, 192Mi/192Mi/96Mi | 40m, 160Mi | 900m, 480Mi |
| Envoy Gateway controller | 1 | 50m, 128Mi | 500m, 384Mi | 50m, 128Mi | 500m, 384Mi |
| Envoy proxy (envoy and shutdown-manager) | 2 | 110m, 160Mi | 1500m, 768Mi | 220m, 320Mi | 3000m, 1536Mi |
| RustFS | 1 | 100m, 256Mi | 1, 1Gi | 100m, 256Mi | 1, 1Gi |
| Strimzi operator | 1 | 100m, 384Mi | 1, 384Mi | 100m, 384Mi | 1, 384Mi |
| Kafka `telemetry` (dual-role nodes, 512 MiB heap) | 3 | 200m, 768Mi | 1, 1280Mi | 600m, 2.25Gi | 3, 3.75Gi |
| Kafka entity operator (topic and user operators) | 1 | 100m, 384Mi | 1, 768Mi | 100m, 384Mi | 1, 768Mi |
| Longhorn manager (one per worker) | 4 | 50m, 128Mi | 1, 512Mi | 200m, 512Mi | 4, 2Gi |
| Longhorn global manager | 2 | 20m, 64Mi | 500m, 256Mi | 40m, 128Mi | 1, 512Mi |
| Longhorn UI | 1 | 10m, 32Mi | 200m, 128Mi | 10m, 32Mi | 200m, 128Mi |
| Longhorn instance managers (one per worker) | 4 | 200m (5% of 4 vCPU), memory not set | not set | 800m | not set |
| Longhorn CSI sidecars (4 kinds, 2 each), CSI plugin and engine image (one per worker), driver deployer | 17 | not set by the chart | not set | measure | measure |
| **Total (set values)** | | | | **2310m, 4.55 GiB** | **16.1 CPU, 11.05 GiB** |

Per node: the control-plane nodes run none of this (they keep kubeadm's taint), and the first
role, `platform_control_plane` (tag `control-plane`), moves CoreDNS, the Tigera operator and the
Calico Deployments off them too: with the API server at about 880 MiB, a 2 GB master had no room
for them (`acceptance-lab.md`, defect 1). The four workers (4 vCPU and 6 GB each, 22.75 GiB
allocatable together) carry it all. The Longhorn manager and instance manager run on every
worker (250m and 128Mi requested each); the rest is spread by the scheduler, with the three
Kafka nodes and the two proxies on different workers where possible. On average one worker
reserves about 580m CPU and 1.1 GiB for the platform, 20% of its memory, before the LGTM stack.
Measured numbers on the real cluster are in `budget.md`. The limits add up to more than the requests on purpose; they cap a
runaway pod.

Measured on the kind cluster with `kubectl top pods` after the smoke test (idle, profile
`kind`): Kafka node 425Mi, Kafka entity operator 294Mi, Strimzi operator 247Mi, RustFS 64Mi,
Envoy Gateway controller and proxy 35Mi each, cert-manager 25Mi + 31Mi + 13Mi, metrics-server
26Mi. About 1.2 GiB in total, so the requests above leave room for load.

On the real cluster, measure the Longhorn pods that the chart does not size after the first
run, and add them here:

```bash
kubectl top pods -n longhorn-system --sum
```

Disk: Longhorn keeps two copies of each volume. The platform asks for RustFS 25 GiB and Kafka
3 x 5 GiB, so up to 80 GiB of the four 40 GiB Longhorn disks (160 GiB) once they fill. They are
dynamic VHDX files, so the PC's drive only pays for what is written.

Longhorn keeps 30% of each disk in reserve (its default for a node's default disk), so with
over-provisioning at 100% only about 117 GiB of replicas fit on four workers, less than the
platform and the lab ask for together (about 155 GiB). The values set
`storageOverProvisioningPercentage: 200`: volumes are thin, and
`storageMinimalAvailablePercentage: 15` still stops scheduling on a disk that is really full.

The kind profile reserves less: one Kafka node (100m, 768Mi), one proxy, RustFS 50m/128Mi,
no Longhorn; about 600m CPU and 2.1 GiB in requests.

## Checks on the real cluster

`make platform-check` on the real cluster (profile `full`) runs everything below except the
Longhorn screen. Longhorn cannot run on kind, so these checks have only ever run on the real
cluster. Run them once after the first `make platform`:

```bash
export KUBECONFIG=~/.kube/lgtm-lab.config
# 1. Longhorn is up, and longhorn is the only default StorageClass.
kubectl -n longhorn-system get pods
kubectl get storageclass
# 2. Every worker is a Longhorn node with its disk at /var/lib/longhorn, schedulable.
kubectl -n longhorn-system get nodes.longhorn.io
kubectl -n longhorn-system get nodes.longhorn.io -o custom-columns=NODE:.metadata.name,PATH:.spec.disks.*.path,READY:.status.conditions[?(@.type==\"Ready\")].status
# 3. The smoke test: a volume keeps its data across pods and has 2 healthy replicas,
#    S3, gateway (through lb on 80 and 443), Kafka, metrics.
make platform-check
# 4. The volumes of the platform itself are healthy (RustFS and the three Kafka nodes).
kubectl -n longhorn-system get volumes.longhorn.io
kubectl get pvc -A
# 5. The Longhorn screen answers through the gateway.
curl -s -o /dev/null -w '%{http_code}\n' http://longhorn.lab.k8s.local/
```

Expected: every pod Running and Ready; `longhorn (default)` as the only default class; four
Longhorn nodes Ready; `PLATFORM CHECK PASSED (profile full)`; every volume `healthy` with two
replicas; HTTP 200 from the Longhorn screen.

If a volume stays `degraded`, check the worker's data disk (`df -h /var/lib/longhorn` on the
worker) and that `iscsid` runs (`systemctl status iscsid`). Longhorn 1.13.0 must not run with
open-iscsi 2.1.12; Ubuntu 24.04 ships 2.1.9.

## Lab simplifications

- metrics-server runs with `--kubelet-insecure-tls`, because the kubelets serve self-signed
  certificates (kubeadm's default).
- Kafka and the S3 store take plain-text connections inside the cluster without TLS.
- The lab CA's root key lives in a Secret in the cluster; it is a study CA, not a real one.
