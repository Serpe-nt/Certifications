# C13: notes for the next content workers

Card C13, module m14 Correlation and incident debugging, 2026-11-14. What this module learned, on top of the earlier content notes.

## Fault flags on the lab

- Four of the five flags took effect within seconds: `paymentFailure` (payment, Node), `recommendationCacheFailure` (recommendation runs with `FLAGD_CACHE=disabled`), `kafkaQueueProblems` (checkout and fraud-detection), `paymentUnreachable` (checkout) and `productCatalogFailure` (targeting rule). C12 found that product-catalog served a stale cached value for `productCatalogLockContention` until it was restarted; the Go flagd provider caches static flags and refreshes them through its event stream.
- The quickest proof that a service saw a flag: checkout's and product-catalog's server spans carry span events `feature_flag.evaluation` with the key, the variant and a reason (`cached`, `static`, `targeting_match`). Read them with `/api/v2/traces/<id>`.
- `recommendationCacheFailure` kills recommendation with OOMKilled about 2 minutes 20 seconds after the switch, and again every 3 minutes. The restart count stays raised afterwards.
- `kafkaQueueProblems` drains within a minute after it is off. The first order after the switch is consumed exactly 101 times.
- Notes in the shared folder (`c12-flag-now.md`, `c13-flag-now.md`, `c14-flag-now.md`) kept the three cards from overlapping. Read them, and the flag API, before every switch.

## Grafana 13.3 as it is on the lab

- The trace view puts a failed span into the trace header with **Go to span**. Span details show buttons named after the data source's links: **Related logs** (the docs say "Logs for this span"), and the trace to metrics queries by their names.
- **Query with Tempo** from a dashboard exemplar opens Explore; from an Explore graph it opens a split pane. An exemplar tooltip can show a trace ID without its leading zero.
- Grafana accepts a correlation whose source is the provisioned, read-only `loki`. A Loki row's fields are `labels`, `Time`, `tsNs`, `id`, `trace_id`, `Line`; a label such as `service_name` is only inside `labels`, so a correlation on it needs a regex transformation. A correlation with a results field the row lacks is saved and never shows.
- The correlations page deletes with an icon and an inline **Delete** / **Cancel**.
- TraceQL metrics (`count_over_time() by (...)`) work in Explore's TraceQL editor and through `/api/metrics/query_range`; a sample with value 0 has no `value` key in the JSON.

## Telemetry facts

- checkout logs some lines without the request's context (`logger.Info(...)` instead of `logger.LogAttrs(ctx, ...)`), so they carry no `trace_id`: "sending to postProcessor" and "Successful to write message ...".
- The frontend's server span for an HTTP 422 has status unset (the HTTP conventions); a 500 is an error.
- The gateway's Kafka lag metric is `kafka_consumer_group_lag_sum_ratio`, one series per gateway pod; take the `max`.
- cAdvisor is scraped every 10 seconds; a fast leak reaches the limit between two samples.
- Shop pods' stdout is not in Loki; the shop logs only over OTLP.

## Writing

- The Done box sits above the lab check on the Practice tab. Do not put the check's answer in it.
- An incident step's Learn tab must not name the cause; keep its terms and information parts generic, and put the run's numbers in the log.
- In the first draft 35 of 45 right answers were the longest option. Measure before you finish; rewrite the right answers short and the wrong ones concrete.
