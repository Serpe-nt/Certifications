# C3: notes for the next content workers

Card C3, module m04 PromQL, 2026-11-12. What this module taught, on top of `c0-content-notes.md` and `c1-content-notes.md`.

## Reaching the lab's query APIs

- From Windows (Git Bash or Python), `http://10.10.0.5` with the header `Host: prometheus.lab.k8s.local` reaches the lab's Prometheus directly; no WSL and no port-forward are needed. `/api/v1/query`, `/api/v1/status/config`, `/api/v1/status/flags` and `/api/v1/rules` answer everything a PromQL lesson needs.
- Mimir answers on the same address with `Host: mimir.lab.k8s.local`, path `/prometheus/api/v1/query`, and the header `X-Scope-OrgID: lab` (shop, beacon, span metrics) or `prom` (Prometheus's remote write).
- To read Mimir's data from before an outage, pass the API parameter `time` with a Unix time. That is how step 13 was drafted while Kafka was down.
- A small Python script that posts the query and prints `metric` and `value` per series was enough; keep it in the scratchpad.

## Checks that stay right on every healthy lab

PromQL steps can check numbers that come from the lab's shape and configuration rather than from traffic:

- series counts fixed by the cluster: seven nodes, 21 kubelet targets (three metrics paths per node), a `sum by (job, metrics_path) (up)` of 10 rows;
- numbers fixed by intervals: a 5-minute range of a 30-second target holds 10 samples, the cadvisor job (10 s) gives 30, `increase()` of a rule group's iteration counter over 10 minutes is 20, the gap between `timestamp(x)` and `timestamp(x offset 1m)` is 60;
- labels fixed by the VMs: `nodename` of `10.10.0.31:9100` is worker2;
- names in the lab's rules: `instance:node_num_cpu:sum`.

Use `range` checks with a small margin for anything computed with `rate()` or `increase()`: extrapolation and scrape jitter move them a little.

## Shell traps

- The Bash tool on this machine turns `\\` into `\` inside heredocs and some quoted strings. A PromQL regex such as `10\\.10\\.0\\.30` then reaches Prometheus as `10\.10...` and fails with "unknown escape sequence". Write files that hold backslashes with the Write or Edit tool, and test such queries from a Python string.
- A `|` inside a Markdown table cell must be written `\|` in the verification log.

## Writing PromQL lessons

- prometheus.io "latest" describes the newest 3.x release. Several things there are newer than or behind a flag on the lab's 3.13.5 (`anchored` and `smoothed` range selectors, `fill()` modifiers, `limitk`, `step()`, `start()` in expressions, `info()`). Module m04 leaves them out.
- The lab's Prometheus stores classic histograms only (`scrape_native_histograms: false`, `always_scrape_classic_histograms: true`); native histograms are taught as a concept.
- The shop's metrics are not on the Prometheus query page; they are in Mimir. A lab step that needs them goes through Grafana Explore with the data source `mimir`.
