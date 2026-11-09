# L2: platform add-ons

Wave 2. Model Opus 5.5, high effort. Runs beside L3 and S2. The planner re-checks this card against what L1 delivered before starting it.

## Owns

`lgtm/lab/ansible/roles/platform_*/**`, `lgtm/lab/ansible/playbooks/platform.yml`, `lgtm/lab/helm/platform/**`, `lgtm/lab/mk/platform.mk`, `lgtm/lab/docs/platform.md`, `lgtm/lab/tests/platform/**`, `.github/workflows/lgtm-lab-platform.yml`, `lgtm/docs/adr/l2-*.md`

## Read first

- `lgtm/docs/plan/00-overview.md`, `02-lab-contract.md` (all of it; "Platform interfaces" is what you must provide)
- `lgtm/lab/docs/cluster.md` and `lgtm/lab/ansible/` as L1 left them
- `lgtm/docs/research/01-stack-versions.md`, section "Object storage for a local lab"

## Goal

`make platform` turns the empty cluster into one that can hold the LGTM stack: storage, object storage, a gateway, Kafka, certificates, metrics. The same playbook, with `lab_profile=kind`, prepares a kind cluster for smoke tests.

## Build

Each add-on is an Ansible role that installs one pinned Helm chart with a values file from `lgtm/lab/helm/platform/<add-on>/`, through `kubernetes.core.helm`, using `~/.kube/lgtm-lab.config` (or the kind kubeconfig). Each has a tag. A second run changes nothing.

1. **Helm itself.** Decide Helm 3 or 4 from what the charts in the overview's version table require today; pin it; download it into `lgtm/lab/.bin/`. ADR.
2. **Longhorn** as the default StorageClass `longhorn`, data on `/var/lib/longhorn`, two replicas, its screen routed at `longhorn.lab.k8s.local`. Skipped in the kind profile, where `lab_storage_class` is kind's default class.
3. **S3 store.** Choose between RustFS, Garage and `pgsty/silo` (the three that current Grafana examples and charts name). Decide from the official docs of each and a test you run: create the six buckets of the lab contract, then put, list, range-read, multipart-upload and delete with a standard S3 client. One instance with a Longhorn volume. Create the Secret `lab-s3` and copy it into `mimir`, `loki` and `tempo`. ADR with the comparison and the fallback.
4. **Gateway.** A Gateway API controller that is maintained today and fits a kubeadm cluster with Calico (check what Calico 3.31 itself offers before adding another). Gateway `lab` in namespace `gateway` on NodePorts 30080 and 30443, routes allowed from all namespaces. Check the current status of ingress-nginx before you write about it. ADR.
5. **Kafka.** An operator-managed Kafka cluster `telemetry` in namespace `kafka`, KRaft mode, three brokers on the real cluster and one in the kind profile, small volumes, reachable at `telemetry-kafka-bootstrap.kafka.svc:9092` without authentication. ADR for the operator choice.
6. **cert-manager** with a self-signed lab issuer, and **metrics-server**.
7. **Smoke test** `lgtm/lab/tests/platform/smoke.sh`: a volume binds and holds data, the S3 test of item 3 passes from inside the cluster, a sample route answers through the gateway NodePort, a message goes through Kafka. `make platform-check` runs it.
8. **Budget.** Requests and limits on everything; a table of what the platform costs per node in `docs/platform.md`, with how to open each screen.
9. **CI**: Helm lint, rendered-manifest schema check and ansible-lint for your paths.

## Test cluster

A kind cluster named `lgtm-l2` (one control plane, three workers, NodePorts 30080 and 30443 mapped). Delete it when done. Longhorn cannot be tested on kind; say so, and give the planner the exact commands to check it on the real cluster.

## Done when

- [ ] `make platform LAB_PROFILE=kind` on a fresh kind cluster ends with every pod Ready; a second run reports no changes.
- [ ] `make platform-check` passes on kind.
- [ ] Every chart and image version is pinned in one file; every choice has an ADR with source links dated today.
- [ ] The names in "Platform interfaces" exist exactly as written.
- [ ] `docs/platform.md` has the budget table and the real-cluster checks for Longhorn.
- [ ] The CI workflow passes.

## Report

The pull request link, the four choices with one line of reason each, the budget total, what could not be tested on kind.
