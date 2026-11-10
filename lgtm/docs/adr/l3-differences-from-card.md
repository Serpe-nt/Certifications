# L3: Where the LGTM releases differ from the card, and why

Status: accepted by worker L3 on 2026-11-09.

## Context

Card rule 8: when something in the card turns out to be wrong or impossible, do the closest
correct thing and record the difference. These are the places where `w2-l3-lgtm-releases.md` and
what was built differ, or where the card left a choice open.

## Decisions

1. **Tenant set-up lives in the releases, not in `lab-glue`.** Mimir, Loki and Tempo create a
   tenant when the first request with its `X-Scope-OrgID` header arrives; there is nothing to
   create. What a tenant needs is limits, and those are Mimir's runtime overrides
   (`runtimeConfig.overrides` in `helm/mimir/values.yaml`, reloaded without a restart), where
   module m17 adds `team-a` and `team-b`. `lab-glue` holds the routes, the dashboards and the
   beacon switch.

2. **The shop namespace is left out of Alloy's pod-log collection.** The shop's services send their
   logs over OTLP through the gateway, with the trace id in structured metadata. Tailing their
   log files as well would store every line twice under the same `service_name`. Alloy collects
   every other namespace and the Kubernetes events. The price: the stdout of the shop's Kafka,
   PostgreSQL and Valkey is not in Loki; a lesson removes `excludeNamespaces` to compare the two
   routes.

3. **Infrastructure receivers on a two-replica gateway.** The card asks for two gateway replicas
   and for the upstream demo's infrastructure receivers (PostgreSQL, Valkey, Kafka, NGINX, plus
   Envoy's HTTP check and the ad service's Prometheus port). Both replicas scrape, so each such
   series exists twice; the `metrics/scraper` pipeline sets `service.instance.id` to the pod name,
   which Mimir turns into the `instance` label, so the copies stay apart instead of colliding.
   Moving the scrapers into a single-replica collector is a good lesson, not a default.

4. **Tempo keeps no volumes.** Block-builders, live-stores and the metrics-generator use
   `emptyDir`: Kafka is Tempo 3's write-ahead log, so a restarted pod reads its partition again.
   Fewer Longhorn volumes means less disk, the tight resource of the lab.

5. **OTLP metric names get Prometheus suffixes.** Mimir's `otel_metric_suffixes_enabled` is on, so
   `otelcol_exporter_sent_spans` becomes `otelcol_exporter_sent_spans_total`, as with Prometheus's
   own OTLP receiver. The PCA track expects these names.

6. **Span metrics carry `service_name` as well as `service`.** Tempo names the service label
   `service`; the lab contract says `service.name` appears as `service_name`. A
   `dimension_mappings` entry in the metrics-generator adds `service_name`, and `service` stays
   for Grafana's own features (service graph, Traces Drilldown).

7. **Controller manager, scheduler, etcd and kube-proxy are not scraped.** kubeadm binds their
   metrics to localhost, so kube-prometheus-stack would only show them as down and fire
   `TargetDown`. They are off in `helm/kube-prometheus-stack/values.yaml`; a lesson opens the bind
   addresses and turns them on.

8. **Prometheus is pinned to 3.13.5, not the chart's 3.16.0.** The overview pins the 3.13 long-term
   support line.

9. **`make status` and `make reset` are tags of `lab.yml`.** `status` runs the read-only `report`
   tag (plus `helm list` and a pod listing); `reset` is a `never` tag that uninstalls the releases,
   deletes their volumes and empties the six buckets with a one-off Job. The Grafana password and
   the lab seed survive a reset on purpose, so the seed in the learner's site settings stays valid.

10. **`make lab-tools` reuses card D1's `demo/scripts/tools.sh`** for Helm, kubectl, kind and
    kubeconform with checksums, instead of a second downloader. Card L2's `platform_tools` role
    pins the same versions, so either fills `.bin` the same way.

11. **Gateway HTTPS listener on kind.** The kind stand-in Gateway has only the HTTP listener on
    NodePort 30080; the HTTPS listener on 30443 is the platform's (card L2). Nothing in the lab
    releases depends on it.

12. **`longhorn` and `s3` routes** are left to the platform card, which owns those Services.

13. **A chart in this repository needs its version bumped to be upgraded.** The playbook uses the
    `kubernetes.core.helm` module, which upgrades when the chart version or the values change.
    `shop` and `lab-glue` are local charts, so a change to their templates must come with a new
    `version` in their `Chart.yaml`. `docs/lgtm.md` says so.

## Requests to the planner

- Lab contract, "Telemetry flow": add that span metrics carry both `service` and `service_name`,
  and that OTLP metric names carry the Prometheus suffixes.
- Lab contract, "Platform interfaces": write down the format of Secret `lab-s3` that both cards
  use: `endpoint` is `host:port` without a scheme (`rustfs-svc.s3.svc:9000` on the real cluster),
  plain HTTP, path-style addressing. Card L2 confirmed this in the shared notes on 2026-11-10; the
  releases set `insecure: true` and path-style addressing to match.
