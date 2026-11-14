# C11: notes for the next content workers

Card C11, module m12 Loki, 2026-11-14. What this module taught, on top of the earlier content notes.

## Working with Loki on the lab

- Loki's gateway answers from Windows at `http://10.10.0.5` with `Host: loki.lab.k8s.local`. `GET /config` (it reaches an ingester) returns the whole running configuration with every default filled in; it is the quickest way to read a limit's real value. `GET /ring`, `/distributor/ring`, `/loki/api/v1/rules`, `/loki/api/v1/delete` and `/prometheus/api/v1/alerts` are routed too.
- The header `X-Loki-Response-Encoding-Flags: categorize-labels` splits each returned line into `stream` labels, `structuredMetadata` and `parsed` fields. Use it before you write which field is a label.
- Every query answer carries `stats` (`summary.totalBytesProcessed`, `totalLinesProcessed`, ...). The query frontend also logs one `caller=metrics.go` line per query, with the query text, `total_bytes`, `splits` and `shards`, in `{namespace="loki", container="query-frontend"}`. It reaches Loki through Alloy a few seconds later.
- Grafana 13.3's Explore groups a line's fields into **Indexed labels** and **Structured metadata**, shows "This query will process approximately ..." before a query and "Total bytes processed" after it. **Instant** is under **Options** > **Type**, and only for metric queries.
- Grafana's `loki` data source reads tenant `lab` only. Practice tenants are read with curl.

## Surprises

- OTLP lines carry a unique `observed_timestamp` as structured metadata, so a bare `count_over_time` on an OTLP stream returns one series per line and hits `max_query_series` (500). Wrap metric queries on OTLP logs in `sum` or `count`.
- `detected_level` is structured metadata too: a stream with info and error lines is two series in a metric query.
- A typed label filter on a value of the wrong type keeps the line with `__error__` `LabelFilterErr` (`duration > 5s` on Envoy's plain `"duration":5`).
- A json field expression with a hyphen (`path="x-envoy-origin-path"`) returned no lines at all; `` path=`["x-envoy-origin-path"]` `` works.
- The ruler accepts a rule whose expression is a log query; it only fails at evaluation (`rule result is not a vector or scalar`).
- A delete request's lines stay visible to queries during the 24-hour cancellation period.
- The stream limit refuses only the streams over the limit; the push still answers 429.
- Loki 3.7's own deployment modes page still calls simple scalable the chart's default; the pinned chart 21.1.0 defaults to `Monolithic`.

## Writing LogQL in the site

- `check:content` reads `<word>` inside a `<Query>` template string as raw HTML, which breaks pattern and regexp parsers. Write `<` for `<` inside the template string: JavaScript turns it back into `<`, and the page shows and copies the right query.
- A LogQL string in backticks inside a `<Query>` template string is written `` \` ``.
- `${` inside a `<Cmd>` template string is JavaScript interpolation. Shell scripts in a `<Cmd>` must avoid `${...}`; `$var` and `$(...)` are fine. A backslash before a newline is removed by JavaScript, so keep shell commands on one line.
- In question YAML, a raw `<method>` shows as text (the page escapes everything but `<b>` and `<code>`); `&lt;` would show as `&lt;`.

## For the lab (outside this card)

- From about 12:50 UTC on 2026-11-14, new pods on worker2 and worker3 failed with Calico `connection is unauthorized: Unauthorized`, about 24 hours after the cluster was built. The shared notes have the evidence (`c11-calico-unauthorized.md`).
- Loki's query limits are still the defaults; the C11 pull request proposes values.
