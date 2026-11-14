# C9: module m10 Grafana Alloy

Wave 8. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C9.

## Owns

`lgtm/learn/src/content/modules/m10.yaml`, `lgtm/learn/src/content/steps/m10/**`, `lgtm/learn/src/content/questions/m10.yaml`, `lgtm/docs/verification/m10.md`, and `lgtm/docs/adr/c9-content-notes.md` if you have something the next worker should know.

## Read, on top of the template

- Module m09 as merged (the OpenTelemetry Collector): m10 leans on it at every step. The learner knows receivers, processors, exporters and pipelines; Alloy is taught by what it shares with the Collector and where it differs.
- Module m06 step 7 (the k8s-monitoring chart) and `lgtm/lab/helm/k8s-monitoring/values.yaml`, `lgtm/lab/docs/lgtm.md` (the release `alloy`): in the lab, Alloy runs through that chart as a DaemonSet that tails pod log files and one replica that watches Kubernetes events, both to Loki as tenant `lab`. Cluster metrics are off there (Prometheus has them) and the shop's namespace is left out of file logs (its services send OTLP).
- `lgtm/docs/research/01-stack-versions.md`, the part on Alloy, Promtail and Grafana Agent. Check each point against grafana.com/docs/alloy for the version the lab runs.
- grafana.com/docs/alloy: introduction, configuration syntax, components and the component reference for the ones you use (`loki.source.*`, `loki.process`, `loki.write`, `discovery.kubernetes`, `discovery.relabel`, `prometheus.scrape`, `prometheus.remote_write`, `otelcol.*`), the UI and live debugging, clustering, `alloy convert`, and the k8s-monitoring chart's documentation.

## The learner at this point

They have done m00 to m09. They can read and change a Collector pipeline and have seen in m06 that an Alloy DaemonSet collects the lab's pod logs. They have never read or written Alloy configuration. Job ads rarely name Alloy, but it is the collector Grafana ships and the one that replaced Promtail and Grafana Agent, which they will meet in older setups.

## The module, 12 steps

It serves jobs; no exam maps to it (`cert: none`).

- Step 1 is why Alloy exists and what it replaced. Say what happened to Promtail and Grafana Agent only as a grafana.com page states it today, with the dates the page gives.
- Steps 2 and 3 teach the configuration language by reading the lab's real configuration: get the rendered configuration of the lab's log collector from the cluster and walk one pipeline from discovery to `loki.write`. A component, its arguments, its exports, and how one component's export becomes another's argument: that is the whole idea, and `<Flow>` shows it.
- Step 4, the Alloy screen: the learner reaches the UI of a lab Alloy pod with a port-forward and uses the graph and live debugging on a running component. Read-only.
- Step 5 is the first lab of their own: a small Alloy in `learn-m10` that collects the logs of one practice pod and sends them to Loki. Give every file in full. Decide with the lab's files whether it writes as tenant `lab` or as a tenant of its own, and say why.
- Step 6 (scrape and remote-write) and step 7 (OTLP with the `otelcol` components) extend that practice Alloy; the learner sees their own metric in Mimir and their own span in Tempo. Name which Collector component each `otelcol` component wraps.
- Step 8, convert a Collector configuration to Alloy: run `alloy convert` on a configuration from module m09's practice files, locally with the Alloy image, and read what it produced and what it could not convert.
- Step 9, processing logs: stages, what becomes a label and what becomes structured metadata, dropping lines. Module m12 teaches why labels cost; here it is the mechanics, on the practice Alloy.
- Step 10, clustering and deployment shapes: a concept step with the lab's own shape as the example. Do not run a cluster of Alloys.
- Step 11 goes back to the k8s-monitoring chart's values with what the learner now knows: which value turns into which components. Step 12 is the judgement: Alloy or the Collector, when, with the reasons a team would give.

Tags: the eleven that `04-tags.md` gives m10.

## The lab in this wave

- The workers have room since the rebuild: a module's practice workloads may request up to 4 GiB in all, at most 1.5 GiB on one worker (`lgtm/lab/docs/budget.md`). Yours need far less: one small Alloy and one practice pod.
- You create things only in `learn-m10` and delete the namespace at the end. The lab's own Alloy (namespace `alloy`) is read, never changed.
- Your session will refuse to change the shared cluster until the owner says so in it. In your first message ask once for all you need, then start with what needs none of it: a go-ahead to create and delete `learn-m10`; a Grafana sign-in in your session's browser pane (never type a password, never read the admin password from the cluster); the lab seed in the site's settings, or their word that you may read it, if a step uses a token.
- Keep Loki queries to short time ranges.

## Yours

- Namespace: `learn-m10`. Site port: 8097. Local port-forwards: 18100 to 18109.
- Token slots, if a step needs one: `log-m10-1` to `-9` (and `metric-`, `span-` likewise).

## Done when, on top of the template

- [ ] The 12 steps exist (or the pull request explains each split, merge or drop), at least six of them with Practice.
- [ ] Every Alloy configuration in the module was run on the lab or, for step 8, locally with the Alloy image the lab pins; `learn-m10` is gone.
- [ ] The pool has at least 30 questions, about half of them showing a piece of Alloy configuration and asking what it does or what is wrong with it.
