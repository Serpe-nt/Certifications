# Lab contract

The names every part of the project agrees on, so the lab, the site and the lesson text can be written at the same time. Version 0, owned by the planner. A worker who needs a change asks for it in the pull request and does not edit this file.

## Machines and network

| Name | Address | Role |
|---|---|---|
| Windows host | 10.10.0.1 | Hyper-V internal switch `lgtm-lab`, NAT to the internet |
| lb | 10.10.0.5 | HAProxy and dnsmasq |
| master1 to master3 | 10.10.0.11 to 10.10.0.13 | control plane |
| worker1 to worker4 | 10.10.0.30 to 10.10.0.33 | workloads |

- Network 10.10.0.0/24. One network card per VM, static address from cloud-init.
- DNS zone `k8s.local`, served by dnsmasq on `lb`. `cluster-endpoint.k8s.local` points at `lb`. `*.lab.k8s.local` points at `lb`.
- HAProxy on `lb`: 6443 to the three API servers; 80 to worker NodePort 30080; 443 to worker NodePort 30443 (as in the copied `haproxy.cfg`).
- Guest OS: Ubuntu Server LTS cloud image. SSH user `vaka` with the key `~/.ssh/ansible`, as in the copied `ansible.cfg`; both are variables.
- One file, `lgtm/lab/vm/nodes.yml`, lists the machines (name, address, vCPU, memory, disks). The Hyper-V script and the Ansible inventory are both generated from it.
- The Ansible roles never mention a hypervisor. Given SSH-reachable Ubuntu machines and an inventory, they must work on Hyper-V, KVM or bare metal.
- Kubeconfig for the lab is written to `~/.kube/lgtm-lab.config` on the control machine. Nothing overwrites `~/.kube/config`.

## Namespaces

| Namespace | Holds |
|---|---|
| `longhorn-system` | Longhorn |
| `s3` | the S3-compatible store |
| `gateway` | Gateway API controller |
| `cert-manager` | cert-manager |
| `kafka` | Kafka operator and the `telemetry` Kafka cluster |
| `mimir`, `loki`, `tempo`, `grafana` | one component each |
| `otel` | OpenTelemetry Collector gateway (and the Operator, when a lesson installs it) |
| `alloy` | k8s-monitoring chart and its Alloy instances |
| `prom` | kube-prometheus-stack: Prometheus, Alertmanager, exporters |
| `shop` | the trimmed demo, its Kafka, PostgreSQL and Valkey, flagd, load generator |
| `lab-tools` | beacon, lab seed Secret |

## Addresses in the browser

All under `lab.k8s.local`, HTTP on port 80 through the gateway:

`grafana`, `shop`, `flags` (the flag screen), `loadgen`, `prometheus`, `alertmanager`, `mimir`, `loki`, `tempo`, `alloy`, `otlp` (OTLP over HTTP into the Collector gateway), `longhorn`, `s3`.

Example: `http://grafana.lab.k8s.local`. Lesson text never hard-codes the domain: it uses the `<LabLink to="grafana" path="/explore">` component, and the site has one setting for the lab domain.

## Telemetry flow

- Shop services send OTLP to `otel-gateway.otel.svc:4317` (gRPC) or `:4318` (HTTP). The service name `otel-gateway` is fixed.
- The gateway exports metrics to Mimir (`/otlp`), logs to Loki (`/otlp`), traces to Tempo (OTLP), all as tenant `lab`.
- Alloy sends pod logs and cluster events to Loki and, where a lesson turns it on, metrics to Mimir, as tenant `lab`.
- Prometheus in `prom` remote-writes to Mimir as tenant `prom`. The same series never reach one tenant by two routes.
- Tempo's metrics-generator writes span metrics and service graphs to Mimir, tenant `lab`.
- Every signal carries `cluster="lgtm-lab"`. `service.name` appears as `service_name` in Mimir and Loki.

## Grafana

- Data source UIDs are fixed: `mimir`, `mimir-prom` (tenant `prom`), `loki`, `tempo`, `prometheus`, `alertmanager`.
- Trace to logs, trace to metrics, exemplars and the Loki derived field for trace ids are provisioned from the start; module m14 takes them apart and rebuilds them.
- Admin password lives in a Secret created by the playbook and printed once at the end of the run. It is never committed.

## Storage and retention

- Default StorageClass: `longhorn`. In the kind smoke-test profile the StorageClass is kind's default, selected by one variable.
- Buckets: `mimir-blocks`, `mimir-ruler`, `mimir-alertmanager`, `loki-chunks`, `loki-ruler`, `tempo-traces`.
- Retention: logs 48 hours, traces 48 hours, metrics 7 days. Module m17 changes them.

## Platform interfaces (what L2 provides and L3 consumes)

| Thing | Name |
|---|---|
| StorageClass | variable `lab_storage_class`, `longhorn` on the real cluster |
| S3 endpoint and keys | Secret `lab-s3` with keys `endpoint`, `region`, `access_key`, `secret_key`, copied by the platform playbook into `mimir`, `loki` and `tempo` |
| Kafka bootstrap | `telemetry-kafka-bootstrap.kafka.svc:9092`, no authentication inside the cluster |
| Gateway | Gateway `lab` in namespace `gateway`, listeners on NodePorts 30080 (HTTP) and 30443 (HTTPS), routes allowed from all namespaces |
| Profile switch | Ansible variable `lab_profile`: `full` (real cluster) or `kind` (smoke test: small values, no Longhorn) |
| Tool binaries | pinned `helm`, `kubectl`, `kind` and similar downloaded with checksum into `lgtm/lab/.bin/` (git-ignored); nothing is installed system-wide |
| Make targets | `lgtm/lab/Makefile` only includes `mk/*.mk`; each card adds its own fragment |
| Docs | `lgtm/lab/docs/cluster.md` (L1), `platform.md` (L2), `lgtm.md` (L3), `demo.md` (D1) |

## Tenants

`lab` (shop and cluster telemetry), `prom` (Prometheus track). Module m17 creates `team-a` and `team-b`.

## Check tokens

The site cannot reach the lab, so some checks use tokens that both sides can compute.

- **Lab seed**: 16 lower-case hex characters, generated once by `lab.yml`, stored in Secret `lab-tools/lab-seed`, printed at the end of the run. The learner types it into the site settings once.
- **Slot id**: `<channel>-<module>-<n>`, where channel is `log`, `metric` or `span`, module is `m00` to `m18`, and n is 1 to 9. Example: `log-m12-3`.
- **Token**: the first 8 hex characters of HMAC-SHA256 with the seed (as UTF-8 text) as key and the slot id as message. For the `metric` channel the token is that 8-character value read as a hexadecimal number, modulo 1,000,000, written as a decimal integer.
- **Where the beacon puts them** (service name `beacon`, namespace `lab-tools`):
  - `log`: one JSON log line a minute per slot, with `slot` and `payload.token` fields; `slot` is structured metadata, not a label.
  - `metric`: gauge `lab_beacon_value{slot="<slot id>"}` whose value is the decimal token.
  - `span`: a trace a minute per slot; the root span is `beacon.tick`, and a child span `beacon.slot` carries the attributes `beacon.slot` and `beacon.token`.
- A step uses a slot of its own module. The step decides what skill is needed to find the token; the beacon only publishes it.

The site computes the expected token in the browser from the stored seed and the step's slot id.

## Fault flags available to lessons

From the trimmed demo, toggled on the flag screen: `adFailure`, `adHighCpu`, `adManualGc`, `cartFailure`, `failedReadinessProbe`, `imageSlowLoad`, `kafkaQueueProblems`, `loadGeneratorFloodHomepage`, `paymentFailure`, `paymentUnreachable`, `productCatalogFailure`, `productCatalogLockContention`, `recommendationCacheFailure`, `emitRawPii`. Worker D1 says in `TRIMMING.md` which of these survived the trim and whether `cartMetricCardinalityOverflow` and `kafkaConsumerDead` were backported from upstream `main`. A lesson uses only flags that file lists.

## Images

- Site: `ghcr.io/serpe-nt/lgtm-learn:<tag>`.
- Shop: `ghcr.io/serpe-nt/lgtm-demo:<version>-<service>`, the upstream naming pattern.
- Beacon: `ghcr.io/serpe-nt/lgtm-beacon:<tag>`.
- Registry and tag are chart values, so a private registry can replace GHCR later.

## Commands the learner runs

From `lgtm/lab` in WSL:

| Command | Does |
|---|---|
| `make cluster` | `ansible-playbook site.yml`: Kubernetes on the VMs |
| `make platform` | storage, S3 store, gateway, Kafka, cert-manager |
| `make lab` | the LGTM stack, collectors, Prometheus stack, shop, beacon |
| `make lab TAGS=loki` | install or upgrade one component |
| `make status` | what is running, addresses, seed |
| `make reset` | remove the lab releases and their data, keep the cluster |

VMs are created, started and stopped from an elevated PowerShell with `lgtm\lab\vm\hyperv\lab-vms.ps1`.
