# L3: Chart and image versions of the LGTM releases

Status: accepted by worker L3 on 2026-11-09.

## Context

Card rule 6 and the overview (section 6): the worker who installs a component re-checks its
version on the day and records the pin. Every chart version below was read from the chart
repository's `index.yaml` on 2026-11-09 and is the newest stable release there; the images were
checked with `docker manifest inspect` the same day. The pins live in `lgtm/lab/helm/<release>/VERSION`
(chart) and, where the lab overrides the chart's image, in that folder's `values.yaml`.

## Decisions

| Release | Chart (repository) | Chart version | Application | Note |
|---|---|---|---|---|
| `mimir` | `mimir-distributed` (`https://grafana.github.io/helm-charts`) | 6.2.2 | Mimir 3.2.4 (image override; chart appVersion 3.2.3) | Repository choice in `l3-mimir-chart-source.md`. |
| `loki` | `loki` (`https://grafana-community.github.io/helm-charts`) | 21.1.0 | Loki 3.7.9 | 21.1.0 was published on 2026-11-09; the plan named 21.x. |
| `tempo` | `tempo-distributed` (`https://grafana-community.github.io/helm-charts`) | 3.27.0 | Tempo 3.1.1 | |
| `grafana` | `grafana` (`https://grafana-community.github.io/helm-charts`) | 14.4.0 | Grafana 13.3.0 | Image `grafana/grafana:13.3.0-distroless` (the chart's default). |
| `otel-gateway` | `opentelemetry-collector` (`https://open-telemetry.github.io/opentelemetry-helm-charts`) | 0.178.2 | Collector contrib 0.165.0 (image override; chart appVersion 0.163.2) | Contrib 0.165.1 was tagged on 2026-11-09 but `otel/opentelemetry-collector-contrib:0.165.1` was not published yet; 0.165.0 is the newest image. |
| `k8s-monitoring` | `k8s-monitoring` (`https://grafana.github.io/helm-charts`) | 4.6.0 | Alloy Operator 1.14.4, which runs Grafana Alloy | The chart's source repository is grafana/k8s-monitoring-helm; it is published through the grafana Helm repository. |
| `kube-prometheus-stack` | `kube-prometheus-stack` (`https://prometheus-community.github.io/helm-charts`) | 93.1.1 | Prometheus Operator v0.95.1, Prometheus v3.13.5 (image override; chart default v3.16.0), Alertmanager v0.34.2 | Prometheus 3.13 is the long-term support line (supported until 2027-07-31), as the overview asks; `quay.io/prometheus/prometheus:v3.13.5-distroless` exists. |
| `shop` | `shop` (`lgtm/lab/demo/chart`) | 0.1.0 | 3.1.0-lab.1 | Card D1's chart, used as it is. |
| `lab-glue` | `lab-glue` (`lgtm/lab/charts/lab-glue`) | 0.1.0 | 0.1.0 | This card's chart. |

Tools: the playbook uses Helm, kubectl and kind from `lgtm/lab/.bin`, downloaded with their SHA-256
checked by `demo/scripts/tools.sh` (card D1: Helm v4.3.1, kubectl v1.35.10, kind v0.33.0,
kubeconform v0.8.0; card L2 pins the same versions). `kubernetes.core` 6.6.0 supports Helm 4 (its
changelog announces "Helm v4 compatibility across the Helm modules"), and the kind runs used it with Helm v4.3.1. No new
collection or Python package was needed, so `requirements.yml` and `requirements-dev.txt` are
unchanged.

The kind stand-ins use the images card L2 pins for the real platform where possible:
`envoyproxy/gateway-helm` v1.10.0, `rustfs/rustfs:1.0.4`, `amazon/aws-cli:2.39.7`. The Kafka
stand-in is `apache/kafka-native:4.1.0`, the image the Mimir chart uses for its own demo Kafka
(the real cluster runs Strimzi).

## Sources

- https://grafana.github.io/helm-charts/index.yaml
- https://grafana-community.github.io/helm-charts/index.yaml
- https://open-telemetry.github.io/opentelemetry-helm-charts/index.yaml
- https://prometheus-community.github.io/helm-charts/index.yaml
- https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- https://prometheus.io/docs/introduction/release-cycle/
- `lgtm/docs/research/01-stack-versions.md` for the application versions and their release pages
