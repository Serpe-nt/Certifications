# Lab contract

The names every part of the project agrees on, so the lab, the site and the lesson text can be written at the same time. Version 3 (2026-11-13: one control-plane node and 8 GB workers, by the owner's decision; version 2 of 2026-11-10 folded in what wave 2 delivered and the real cluster), owned by the planner. A worker who needs a change asks for it in the pull request and does not edit this file.

## Machines and network

| Name | Address | Role |
|---|---|---|
| Windows host | 10.10.0.1 | Hyper-V internal switch `lgtm-lab`, NAT to the internet |
| lb | 10.10.0.5 | HAProxy and dnsmasq |
| master1 | 10.10.0.11 | control plane, one node (10.10.0.12 and .13 stay free for more) |
| worker1 to worker4 | 10.10.0.30 to 10.10.0.33 | workloads |

- Network 10.10.0.0/24. One network card per VM, static address from cloud-init.
- DNS zone `k8s.local`, served by dnsmasq on `lb`. `cluster-endpoint.k8s.local` points at `lb`. `*.lab.k8s.local` points at `lb`.
- HAProxy on `lb`: 6443 to the API server on master1 (and to any control-plane node added later); 80 to worker NodePort 30080; 443 to worker NodePort 30443 (as in the copied `haproxy.cfg`). The health check on the two ingress ports is a plain TCP check, so whatever listens on the NodePorts needs no `/healthz` route.
- Inventory groups: `load_balancer` (host `lb`), `control_plane`, `workers`; the last two are children of `k8s_cluster`.
- Guest OS: Ubuntu Server 24.04 cloud image. SSH user `vaka` with the key `~/.ssh/ansible`, as in the copied `ansible.cfg`; both are variables.
- One file, `lgtm/lab/vm/nodes.yml`, lists the machines (name, address, vCPU, memory, disks). The Hyper-V script and the Ansible inventory are both generated from it.
- The Ansible roles never mention a hypervisor. Given SSH-reachable Ubuntu machines and an inventory, they must work on Hyper-V, KVM or bare metal.
- Kubeconfig for the lab is written to `~/.kube/lgtm-lab.config` on the control machine. Nothing overwrites `~/.kube/config`.
- Names on the control machine. Windows sends `.k8s.local` to the lab DNS through a name resolution rule, so a browser on Windows resolves every lab address. WSL does not: its `/etc/hosts` is kept by hand and has `cluster-endpoint.k8s.local` (10.10.0.5) but none of the `lab.k8s.local` names. From WSL, reach a lab address as `http://10.10.0.5` with a `Host:` header, or add the names to `/etc/hosts`; the reference page that card L4 writes gives the line to add.
- The cluster from card L6 on: five nodes on Kubernetes 1.35.10 and containerd 2.2.1; one master with 2 vCPU and 4 GB; four workers with 4 vCPU and 8 GB; the `lb` VM is not a node (sizes: `00-overview.md`, section 7). Until L6 has rebuilt the lab, the running cluster still has three masters and 6 GB workers.

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
- Tempo's metrics-generator writes span metrics and service graphs to Mimir, tenant `lab`. Span metrics carry both Tempo's `service` label and `service_name`.
- Every signal carries `cluster="lgtm-lab"`. `service.name` appears as `service_name` in Mimir and Loki.
- OTLP metric names arrive in Mimir with Prometheus suffixes (a counter ends in `_total`).
- Alloy does not tail pod logs in the `shop` namespace: the shop sends its logs over OTLP with the trace id, and tailing the files too would store every line twice.
- The two gateway replicas both scrape the shop's PostgreSQL, Valkey, Kafka and NGINX; the copies differ by `instance` (the pod name).
- kube-proxy, the scheduler, the controller manager and etcd are not scraped: kubeadm binds their metrics to localhost.
- Tenant limits are Mimir runtime overrides in `lgtm/lab/helm/mimir/values.yaml`; a tenant exists as soon as data arrives with its `X-Scope-OrgID`.

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
| S3 endpoint and keys | Secret `lab-s3` with keys `endpoint`, `endpoint_url`, `region`, `access_key`, `secret_key`, copied by the platform playbook into `mimir`, `loki` and `tempo`. `endpoint` is host and port with no scheme (`rustfs-svc.s3.svc:9000`), plain HTTP inside the cluster, path-style; `endpoint_url` is the same with `http://` in front. The keys are generated on the first run and kept |
| Kafka bootstrap | `telemetry-kafka-bootstrap.kafka.svc:9092`, no authentication inside the cluster |
| Gateway | Gateway `lab` in namespace `gateway`, listeners on NodePorts 30080 (HTTP) and 30443 (HTTPS), routes allowed from all namespaces |
| Profile switch | Ansible variable `lab_profile`: `full` (real cluster) or `kind` (smoke test: small values, no Longhorn). From make: `LAB_PROFILE=kind` |
| Kubeconfig | make variable `LAB_KUBECONFIG`, default `~/.kube/lgtm-lab.config` (already in `mk/cluster.mk`); a kind test passes its own file, never `~/.kube/config` |
| Tool binaries | pinned `helm`, `kubectl`, `kind` and similar downloaded with checksum into `lgtm/lab/.bin/` (git-ignored); nothing is installed system-wide |
| Ansible tooling | `make venv` and `make collections` from `mk/cluster.mk` give the pinned ansible-core, linters and collections (`kubernetes.core` 6.6.0 is already in `ansible/requirements.yml`). Lint settings are `ansible/.ansible-lint` and `ansible/.yamllint`; new roles must pass them. Only L2 may add to `requirements.yml` and `requirements-dev.txt` in wave 2 |
| Make targets | `lgtm/lab/Makefile` only includes `mk/*.mk`; each card adds its own fragment: `cluster.mk` (L1, exists), `platform.mk` (L2), `lab.mk` and `demo.mk` (L3; `demo.mk` forwards to `lgtm/lab/demo/Makefile`) |
| Playbooks outside `site.yml` | `playbooks/platform.yml` and `playbooks/lab.yml` run against `localhost` with `ANSIBLE_ROLES_PATH=ansible/roles`; a release is a role with a tag, and `lab_release` renders or installs one chart |
| Local charts | The Helm module upgrades a local chart (`shop`, `lab-glue`) only when its `Chart.yaml` version or its values change; bump the chart version with every template change |
| Docs | `lgtm/lab/docs/bootstrap-windows11.md` (B1), `cluster.md` (L1), `platform.md` (L2), `lgtm.md` and `budget.md` (L3), `demo.md` (D1), `reference.md` and `runbook.md` (L4), `beacon.md` and `workshop.md` (D2) |

## The shop chart (delivered by D1)

- Chart `shop` in `lgtm/lab/demo/chart`, images `ghcr.io/serpe-nt/lgtm-demo:3.1.0-lab.1-<service>` (version in `lgtm/lab/demo/VERSION`), 13 images, amd64.
- Values that matter to the lab: `otlp.endpoint` (default `http://otel-gateway.otel.svc:4317`) and `otlp.httpEndpoint` (`:4318`), `storageClass`, `gateway.enabled` with `gateway.domain` (routes for `shop`, `flags`, `loadgen`), `image.registry`, `image.tag`, `image.pullSecrets`.
- Browser spans go to the shop's own proxy at `/otlp-http/`, which forwards them to the gateway; the gateway needs no public route for them.
- The shop sends only what its SDKs produce. Metrics of its PostgreSQL, Valkey, Kafka and NGINX come from receivers on the lab's collector gateway; `lgtm/lab/demo/otel-config.yml` and `lgtm/lab/demo/src/otel-collector/` show what upstream scraped and which processors it ran.
- Memory: requests 2.4 GiB, limits 4.5 GiB in total.

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

Sixteen flags, all switched on once and seen to work by D1 (`lgtm/lab/demo/TRIMMING.md` has the evidence and what each one breaks), toggled on the flag screen: `adFailure`, `adHighCpu`, `adManualGc`, `cartFailure`, `cartMetricCardinalityOverflow`, `emitRawPii`, `failedReadinessProbe`, `imageSlowLoad`, `kafkaConsumerDead`, `kafkaQueueProblems`, `loadGeneratorFloodHomepage`, `paymentFailure`, `paymentUnreachable`, `productCatalogFailure`, `productCatalogLockContention`, `recommendationCacheFailure`.

Things a lesson must know:
- `kafkaQueueProblems` keeps its 3.1.0 meaning (extra messages and a one-second consumer delay), not the 1, 3 and 5 second variants in upstream's current docs.
- `productCatalogFailure` is switched through its targeting rule, as the flag screen does it.
- `cartFailure` and `failedReadinessProbe` take more than a minute to show.
- A lesson uses only flags in this list.

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
