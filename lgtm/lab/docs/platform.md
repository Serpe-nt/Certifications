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
make platform TAGS=kafka         # one add-on: metrics-server, cert-manager, gateway, longhorn, s3, kafka
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

BUDGET_TABLE

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
