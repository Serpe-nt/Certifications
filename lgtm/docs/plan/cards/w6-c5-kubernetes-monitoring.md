# C5: module m06 Kubernetes monitoring

Wave 6. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C5.

## Owns

`lgtm/learn/src/content/modules/m06.yaml`, `lgtm/learn/src/content/steps/m06/**`, `lgtm/learn/src/content/questions/m06.yaml`, `lgtm/docs/verification/m06.md`.

## Read, on top of the template

- Module m03 as merged, above all s06 (service discovery), s08 (the Prometheus Operator, ServiceMonitor) and s09 (exporters): m06 builds on them and must not repeat them.
- `lgtm/lab/docs/lgtm.md`: the releases `prometheus` (kube-prometheus-stack in the namespace `prom`: the operator, Prometheus, Alertmanager, node exporter, kube-state-metrics, the default rules and dashboards) and `alloy` (the k8s-monitoring chart: Alloy tails pod logs and watches Kubernetes events, both to Loki; its cluster metrics are off because Prometheus has them). Then their values files under `lgtm/lab/helm/`.
- `lgtm/lab/docs/reference.md` (addresses, data sources, fault flags), `lgtm/lab/docs/budget.md` (what each workload requests and uses).
- The official pages, fetched today: Kubernetes (the metrics a cluster exposes, the resource metrics pipeline, kubelet and cAdvisor endpoints, kube-state-metrics, probes, resource requests and limits), the kube-prometheus-stack chart and the kube-prometheus project, the monitoring mixins (kubernetes-mixin, node-mixin), the k8s-monitoring chart, node exporter.

## The learner at this point

They run Kubernetes for a living and have done m00 to m05: they can read a `/metrics` page, write PromQL and build a dashboard. What they lack is the map: which component produces which cluster metric, and how to use those metrics to explain a sick pod. Kubernetes appears in about a third of observability job ads, and "kube-prometheus-stack" by name in many.

## The module, 12 steps

It serves jobs first. Map a step to PCA only where a competency really fits (P4 Exporters for kube-state-metrics and node exporter, P2 Configuration and Scraping for how the stack scrapes the kubelet); the rest carry `cert: none`.

- Step 1 is the map: nodes, pods, workloads, control plane, and for each the component that reports on it. `<Layers>` or `<Flow>` fits. Every later step fills in one box of it.
- Steps 2 to 4: for each source say what it knows and what it cannot know. kube-state-metrics knows what the API says about an object, not how much CPU it uses; cAdvisor knows usage, not the desired state. The learner finds one metric of each on the lab and says which component it came from.
- Step 5 names every piece kube-prometheus-stack installed on the lab, from the lab itself (`helm get manifest`, the pods in `prom`, the ServiceMonitors). Step 6 opens the dashboards and rules the mixins brought and reads one alert rule back to its recording rules.
- Step 7, the k8s-monitoring chart: say what it installs here and what the lab switched off, from the values file. Module m10 teaches Alloy itself; do not go there.
- Step 8, pod logs and events in Loki: the learner finds the log lines of one pod and the events of one namespace in Explore, with the exact query given. Module m12 teaches LogQL; here it is a tool, as PromQL was in m02.
- Step 9 is the drill: USE for one node and RED for one workload, from the lab's data.
- Step 10, control plane and etcd: write what this kubeadm cluster really exposes and what Prometheus really scrapes. If a target is down or missing on the lab (etcd and the scheduler often bind to localhost on kubeadm), say so in the step as the thing a real cluster does, and say what would fix it; do not fix the lab.
- Step 11, requests against usage: a throttled container and an OOM kill. The learner runs a small workload of your design in `learn-m06` with limits low enough to show both, and finds each in the metrics. Keep it tiny and delete it at the end of the step.
- Step 12 uses the fault flag `failedReadinessProbe`. It takes more than a minute to show (lab contract). The learner switches it on, finds the failing pod from the metrics and the events, and switches it off as the last action. When you run it: keep the flag on for at most 15 minutes, switch it off, check that it is off, and write the start and end time (UTC) into your pull request, because the owner and two other sessions use the shop's data.

Tags: the eleven that `04-tags.md` gives m06. All are new. Steps 3 and 4 also carry `exporter-standard`.

## The lab in this wave

- This module needs Prometheus and Loki, and both work. Kafka was down from 2026-11-11 17:57 UTC and card L5 repairs it while you work; until it reports, Mimir and Tempo have no fresh data. Use the data source `prometheus` for cluster metrics.
- Grafana needs a sign-in. Do not type a password, and do not read the admin password from the cluster. The owner signs in once in the app's browser pane. If Grafana asks you to sign in, say so in your session, go on with the steps that use the Prometheus screen and `kubectl`, and come back to the Grafana actions later. Actions you could not do are `lab-unverified`.
- You create things only in the namespace `learn-m06`. You change nothing in `prom`, `alloy` or `kube-system`.

## Yours

- Namespace on the lab: `learn-m06`.
- Fault flag: `failedReadinessProbe`, for step 12 only, under the rule above.
- Site port: 8100. Local port-forwards: 18120 to 18129.
- Token slots, if a step needs one: `metric-m06-1` to `-9` (and `log-`, `span-` likewise).

## Done when, on top of the template

- [ ] The 12 steps exist (or the pull request explains each split, merge or drop), at least five of them with Practice.
- [ ] Every lab action was run on the live lab; `learn-m06` is gone; the flag is off, with the times it was on.
- [ ] The pool has at least 30 questions, about half of them a symptom to explain (a pod restarts, a container is slow, a target is down) from the metric that shows it.
