# L8: Loki's query limits, Mimir's cardinality API, no exemplar storage in Prometheus

Status: accepted by worker L8 on 2026-11-14, after the owner said yes to the three changes the same
day. Applied to the lab: see "Applied".

## 1. Loki's query limits

Until now a Loki query could read any amount: `/config` showed `max_query_bytes_read: 0B`. On
2026-11-12 two queries with a regular expression over 90 minutes of the namespace `kafka` took the
object store from about 670 to about 900 MiB of memory (`l5b-rustfs-memory.md`). Card C11 proposed
limits in the text of pull request 81, section "Loki query limits for the lab". Every key, default
and unit below was checked against Loki's configuration reference for 3.7, the version the lab
runs.

All are in `loki.limits_config` of `lgtm/lab/helm/loki/values.yaml`, so they are the defaults of
every tenant (`lab` and the practice tenants).

| Limit | Loki's default | Lab before | Lab now | Why |
|---|---|---|---|---|
| `max_query_bytes_read` | 0B (off) | 0B | 500MB | Stops a query that would read a large part of the 48 hours. Card C11 measured about 360 MB of log lines an hour from `/loki/api/v1/index/volume`. On 2026-11-14 at 18:03 UTC the TSDB index, which is what the limit is checked against, gave 194 MB for the last hour of every service (`{service_name=~".+"}`) and 667 MB for the last six, so a filtered or metric query over every service for more than a few hours is refused. Alloy's pod logs alone (`{namespace=~".+"}`) were 33 MB an hour. One service for a day still passes. The query frontend compares the limit with the index's estimate before it runs anything. Not enforced on log queries without a filter. Loki reads `500MB` as 500 MiB (its refusal says `limit: 500 MiB`). |
| `max_querier_bytes_read` | 150GB | 150GB | 150MB | The same for each piece after splitting by 15 minutes and sharding. Fifteen minutes of every namespace is about 90 MB, so one piece of any query fits. |
| `tsdb_max_query_parallelism` | 128 | 128 | 16 | How many pieces of one query the frontend schedules at once. Two queriers run 4 pieces each, so 16 still keeps them busy, and one query cannot fill the queue. |
| `max_query_parallelism` | 32 | 32 | 8 | The same for pieces outside TSDB. The lab has only a TSDB schema, so this mostly does nothing; it is set so the two do not contradict each other. |
| `max_query_length` | 30d1h | 30d1h | 49h | The lab keeps 48 hours of logs, so a longer range reads nothing more. `/config` prints it as `2d1h`. |
| `query_timeout` | 1m | 5m (the chart sets 300s) | 1m | A runaway query stops after a minute instead of five. |

What differs from card C11's proposal: `querier.max_concurrent` stays at 4, not 2. C11 called it
optional. The byte limits already cap what one query reads, which is what hurt the object store on
2026-11-12, and the object store's memory limit has been 1536Mi since card L5b. Halving the
queriers' concurrency would slow every query, including the lessons' own, to protect against a load
the byte limits now stop. Every other value is C11's.

What the limits could break, read before they were applied (not run):

- Lesson queries (modules m01, m02, m06, m08, m09, m10 and m12, `grep` for `lang="logql"` and
  `loki/api/v1/query`): each selects one service, namespace or container over 2 to 15 minutes, or
  Explore's default of one hour. The widest, m12 step 15 action 1, reads every namespace over 5
  minutes, about 30 MB.
- The lab's dashboards: one Loki panel, `{service_name="..."}` in the RED dashboard of
  `lab-glue`, a log query without a filter, which the byte limit does not check. The other
  dashboards query Mimir and Prometheus.
- Grafana's trace-to-logs link: a filter on one service over the span's time plus and minus 5
  minutes.
- Rules: `lab-glue` holds Prometheus rules only. Loki's ruler evaluates rules itself, not through
  the query frontend, where these limits are checked.
- Logs Drilldown: its default range is short and its queries select one service at a time.
- A range of more than 49 hours in Explore (for example "Last 7 days") is now refused. No lesson
  asks for one.

## 2. Mimir's cardinality API for tenant `lab`

`cardinality_analysis_enabled: true` under `runtimeConfig.overrides.lab` in
`lgtm/lab/helm/mimir/values.yaml`. It is a per-tenant limit with default `false`; it switches on
the three endpoints `label_names`, `label_values` and `active_series` under
`/prometheus/api/v1/cardinality/`. Nothing else must be set: the related limits
`label_values_max_cardinality_label_names_per_request` (100) and
`cardinality_analysis_max_results` (500) have workable defaults. Mimir reads its runtime
configuration again every 10 seconds (`runtime_config.period`), so no pod restarts; the
ConfigMap reached every pod about 90 seconds after the upgrade, when the kubelet synced it. Tenant `prom` and the
practice tenants keep the API off.

## 3. Exemplar storage in Prometheus: not switched on

The lab's Prometheus sends exemplars (`sendExemplars: true`) but stores none, because it runs
without `--enable-feature=exemplar-storage`. Storing them is useful only if a scrape target
exposes exemplars. On 2026-11-14 at 17:40 UTC every scrape pool was checked: the Prometheus has 8
ServiceMonitors, all in namespace `prom`, and no PodMonitor. Each kind of target was asked for
OpenMetrics text (`Accept: application/openmetrics-text`) and for the protobuf format, through
`kubectl proxy`:

| Target | Format it answered | Exemplars |
|---|---|---|
| Prometheus, Alertmanager, node exporter, kubelet, cAdvisor, API server, CoreDNS, the operator | Prometheus text 0.0.4 (no OpenMetrics); protobuf also offered by the first four checked | none (no ` # {` in the text, no trace id in the protobuf) |
| kube-state-metrics | OpenMetrics 1.0.0 | none |

None of them exposes an exemplar, so the feature would store nothing. It stays off, the Prometheus
release is not changed and its pod does not restart. Module m11 step 12 is unchanged: it already
says that tenant `prom` holds no exemplars and why. The lab's exemplars come from the OpenTelemetry
side (tenant `lab`).

## Applied

With the owner's go-ahead on 2026-11-14 (details in `lgtm/lab/docs/acceptance-lab.md`, section
"Query limits and the cardinality API"):

- `make lab TAGS=loki`, 17:58 to 18:02 UTC: every Loki pod except the gateway and the two caches
  restarted, the ingesters one at a time, 17:59 to 18:01. `/config` shows the new values.
- `make lab TAGS=mimir`, 18:03 to 18:05 UTC: no pod restarted (the rendered `checksum/config`
  equals the running one). Every distributor, ingester, querier, query-frontend and ruler showed
  `cardinality_analysis_enabled: true` for tenant `lab` in `/runtime_config` by 18:06:21.
- Prometheus: not applied, nothing changed.
- `make lab-check` passed after each release; `make lab` then reported `changed=0`.

## Sources

Fetched on 2026-11-14:

- Grafana Loki configuration parameters, 3.7: https://grafana.com/docs/loki/v3.7.x/configure/
  (`max_query_bytes_read`, `max_querier_bytes_read`, `tsdb_max_query_parallelism`,
  `max_query_parallelism`, `max_query_length`, `query_timeout`, `max_concurrent`)
- Grafana Mimir HTTP API, 3.2: https://grafana.com/docs/mimir/v3.2.x/references/http-api/
  (the cardinality endpoints, `count_method`, `limit`)
- Grafana Mimir configuration parameters, 3.2:
  https://grafana.com/docs/mimir/v3.2.x/configure/configuration-parameters/
  (`cardinality_analysis_enabled`, `label_values_max_cardinality_label_names_per_request`,
  `cardinality_analysis_max_results`, `runtime_config.period`)
- Card C11's proposal: the text of pull request 81. Card C10's notes on the API and exemplars: the
  text of pull request 82.
