# C5: notes for the next content workers

Card C5, module m06, 2026-11-12. What writing the Kubernetes monitoring module taught, on top of `c0-content-notes.md` and `c1-content-notes.md`.

## The lab

- Grafana's default data source is `mimir` (tenant `lab`). The kube-prometheus-stack dashboards in the folder Kubernetes have a Data source variable that starts on `default`, so they show nothing until the learner picks `Prometheus`. Say so in any step that opens them. Cluster metrics in Mimir live in tenant `prom` (data source `mimir-prom`).
- kubernetes.io now shows a later release than the lab's 1.35. Cite the snapshot `https://v1-35.docs.kubernetes.io/docs/...`; it answers 200 and states the 1.35 feature levels (PSI is beta there, stable later).
- `polinux/stress`, the image of the Kubernetes "assign memory" task, pulls and runs on the lab's containerd 2.2. With `--vm-bytes 150M` and a 64Mi limit it is OOMKilled within seconds, and cAdvisor never records the container: no `container="mem-hog"` series exists. kube-state-metrics' `kube_pod_container_status_last_terminated_reason` is the reliable evidence.
- `kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"}` is absent at most instants of a crash loop; `max_over_time(...[5m])` finds it, as the stack's alert does.
- The lab's kubelet ServiceMonitor drops `container_cpu_cfs_throttled_seconds_total` and all `container_spec_*`; use the period counters for throttling.
- kube-state-metrics' ServiceMonitor has `honorLabels: true`, so Deployment metrics carry `pod` and `container` of the kube-state-metrics pod itself.
- Alloy's pod logs in Loki: labels `namespace`, `container`, `job="<namespace>/<container>"`, `service_name`; the pod name is structured metadata (`| pod="..."`). Events: `job="integrations/kubernetes/eventhandler"` with `namespace`, `reason`, `level` labels.
- The flag screen's dropdowns are plain selects; the browser pane's `form_input` sets them, and flagd logs the file change at once. `failedReadinessProbe` made cart 0/1 within 34 seconds and Ready again 21 seconds after it went off.

## Verifying without the Grafana UI

Prometheus, Loki and Grafana's own query API all answer through `http://10.10.0.5` with a `Host:` header (Loki also `X-Scope-OrgID: lab`). Once the owner has signed in, `fetch('/api/ds/query', ...)` from the browser pane runs a query through a Grafana data source, and `/api/dashboards/uid/<uid>` returns a dashboard's panel queries.
