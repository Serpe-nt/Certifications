# L3: LGTM releases

Wave 2. Model Opus 5.5, high effort. Runs beside L2 and S2. Re-checked against what wave 1 delivered on 2026-11-09.

## Owns

`lgtm/lab/helm/**` except `lgtm/lab/helm/platform/`, `lgtm/lab/charts/lab-glue/**`, `lgtm/lab/ansible/roles/lab_*/**`, `lgtm/lab/ansible/playbooks/lab.yml`, `lgtm/lab/mk/lab.mk`, `lgtm/lab/mk/demo.mk`, `lgtm/lab/docs/lgtm.md`, `lgtm/lab/docs/budget.md`, `lgtm/lab/tests/lab/**`, `.github/workflows/lgtm-lab-helm.yml`, `lgtm/docs/adr/l3-*.md`

You do not edit `lgtm/lab/ansible/requirements.yml` or `requirements-dev.txt`: L2 may, you may not, so the two pull requests cannot collide. If you need a collection or a tool that is not pinned there, say so in the pull request. You do not edit anything under `lgtm/lab/demo/`.

## Read first

- `lgtm/docs/plan/00-overview.md` (sections 3, 5, 6, 7), `02-lab-contract.md` (all of it, above all "Platform interfaces" and "The shop chart"), `cards/README.md` (the machine notes and your host ports)
- `lgtm/docs/research/01-stack-versions.md` (all of it: charts moved, modes were removed, Kafka became part of the write path)
- `lgtm/lab/docs/demo.md`, `lgtm/lab/demo/TRIMMING.md`, `lgtm/docs/adr/d1-trimmed-demo.md` and `lgtm/lab/demo/chart/` as D1 left them
- `lgtm/lab/demo/otel-config.yml` and `lgtm/lab/demo/src/otel-collector/`: the collector configuration the shop was tested with, and what upstream scraped
- `lgtm/lab/mk/cluster.mk`, `lgtm/lab/docs/cluster.md` and `lgtm/lab/ansible/.ansible-lint`: the make and lint conventions L1 set

## What wave 1 gives you

- The shop chart, its 13 images on GHCR as `ghcr.io/serpe-nt/lgtm-demo:3.1.0-lab.1-<service>`, and 16 working fault flags. The GHCR package may still be private: for kind, build the images with `lgtm/lab/demo/Makefile` and load them, the way `lgtm/lab/demo/scripts/kind-test.sh` does.
- `make venv`, `make collections` and `make lint` from `mk/cluster.mk`; `kubernetes.core` 6.6.0 is pinned. Your roles and playbook must pass `make lint`; add them to what it covers from your own `mk/lab.mk`.
- `mk/demo.mk` is yours to add: it forwards the shop's targets (`build`, `smoke`, `kind-test`, `chart-lint` and the like) to `lgtm/lab/demo/Makefile`, so they can be run from `lgtm/lab`.
- The real cluster does not exist yet: the owner has not run the acceptance checklist. Everything you prove, you prove on kind.

## Goal

`make lab` installs the whole observability stack in microservices mode and the shop, wired so that a shop request can be followed from a metric to a trace to a log in Grafana. `make lab TAGS=<component>` installs or upgrades one release. The same playbook with `lab_profile=kind` installs a small version for smoke tests.

L2 builds the platform at the same time. Code against the names in "Platform interfaces"; for your own tests on kind, stand in for them with the simplest thing that works (kind's StorageClass, a single-pod S3 store and Kafka that your test script installs) and keep those stand-ins under `tests/lab/`.

## Build

One Ansible role and one values folder per release. In each folder: `values.yaml` (the real cluster), `values-kind.yaml` (a small overlay), and `VERSION` with chart source, chart version and app version, checked on the day.

1. **Mimir** (`mimir-distributed`), ingest storage through the `telemetry` Kafka, blocks in the S3 store, three ingesters, multi-tenancy on, native histograms and exemplars on, OTLP ingest on. The chart is moving repositories: pin where it comes from and say so in the ADR.
2. **Loki** (`loki` chart from grafana-community), `deploymentMode: Distributed`, TSDB index with schema v13, structured metadata on, OTLP ingest on, 48 hours retention through the compactor.
3. **Tempo** (`tempo-distributed` from grafana-community), Kafka address set, metrics-generator writing span metrics and service graphs to Mimir, 48 hours retention.
4. **Grafana** (`grafana` from grafana-community): data sources with the fixed UIDs of the lab contract, including trace to logs, trace to metrics, exemplars and the Loki derived field; dashboards loaded from ConfigMaps; admin password from a Secret the playbook creates; alerting left at defaults for module m15 to configure.
5. **OpenTelemetry Collector gateway** (`opentelemetry-collector` chart) named `otel-gateway` in `otel`: two replicas; OTLP in; the processors the shop expects, plus Kubernetes attributes; exports to Mimir, Loki and Tempo as tenant `lab`; its own telemetry scraped. Start from the upstream demo's collector configuration and its infrastructure receivers for the shop's PostgreSQL, Valkey, Kafka and NGINX. Leave the span-metrics connector off: Tempo's metrics-generator already produces them.
6. **k8s-monitoring** (Alloy) in `alloy`: pod logs and cluster events to Loki. Cluster metrics stay off here, because the Prometheus stack already collects them; a lesson turns them on.
7. **kube-prometheus-stack** in `prom`: Prometheus, Alertmanager, node exporter, kube-state-metrics, default rules; its Grafana off; remote write to Mimir as tenant `prom`.
8. **Shop**: D1's chart with a values file here (registry, tag, OTLP endpoint, routes on).
9. **`lab-glue` chart**: Gateway API routes for every address in the lab contract, tenant set-up, a RED dashboard per shop service and one for the collector, a switch for the beacon (D2 adds the beacon itself later).
10. **Playbook** `lab.yml`: releases in dependency order, a tag per release, creates the lab seed and the Grafana password if absent, and ends by printing the addresses, the seed and where the password is. `make lab`, `make status`, `make reset`.
11. **Budget.** Requests and limits on every container. `docs/budget.md`: memory and CPU per release and per node for the real cluster, against 4 workers of 9 GB, with 15% left free. If it does not fit, cut replicas where the lessons lose nothing and say what you cut.
12. **Smoke test** `tests/lab/smoke.sh`, run by `make lab-check`: after the load generator has run for three minutes, queries through the APIs must show shop metrics in Mimir, shop logs in Loki with a trace id, a checkout trace in Tempo with spans from at least four services, span metrics in Mimir, Kubernetes metrics in tenant `prom`, and pod logs from Alloy.
13. **CI**: Helm lint and a schema check of the rendered manifests for both profiles.

## Test cluster

A kind cluster named `lgtm-l3`, gateway NodePorts mapped to 127.0.0.1:28080 and 127.0.0.1:28443, with its own kubeconfig file passed through `LAB_KUBECONFIG`. L2 runs a second kind cluster at the same time and Docker Desktop has about 30 GB for both, so size the kind profile to stay under about 14 GB. The kind profile may run single replicas and monolithic or single-binary settings where the full shape does not fit, but the wiring (endpoints, tenants, UIDs, routes) must be the same as in the full profile. Delete the cluster when done.

## Done when

- [ ] `make lab LAB_PROFILE=kind` on a fresh kind cluster ends with every pod Ready; a second run reports no changes; `make lab-check` passes.
- [ ] Both profiles render and pass the schema check; versions are pinned in `VERSION` files.
- [ ] In Grafana on kind: an exemplar on a latency panel opens a trace, the trace opens its logs, a log line opens its trace (screenshots or API evidence).
- [ ] `docs/budget.md` shows the full profile fits, or says exactly what does not.
- [ ] `docs/lgtm.md` explains each release in a few lines, the data flow, and how to upgrade one component.
- [ ] ADRs exist for the Mimir chart source and for anything that differs from this card.

## Report

The pull request link, the version table, the budget total, the smoke test output, the list of full-profile settings that kind could not prove.
