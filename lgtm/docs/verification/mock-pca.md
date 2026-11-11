# Verification log: PCA mock exam pool

Card X2 (wave 4), file `lgtm/learn/src/content/questions/mock-pca.yaml`, 109 questions, written and checked on 2026-11-11.

## How the facts were checked

Every page below was fetched on 2026-11-11 and kept as text while the questions were written. The Prometheus pages were read from the sources that build prometheus.io: the `docs/` folder of `prometheus/prometheus` at tag `v3.16.0` (the latest release, published 2026-11-05), the `docs/` folder of `prometheus/docs` on `main`, and the `docs/` folder of `prometheus/alertmanager` at tag `v0.35.0`. Each question's `source` is the prometheus.io address of the page that states the fact its right answer rests on. Grafana, SRE and OpenTelemetry pages were fetched from their own sites.

The curriculum (`PCA_Curriculum.pdf`, 2022) predates Prometheus 3. Where versions 2 and 3 behave differently, the question names the version: q-mock-pca-034 (UTF-8 names, 3.x), q-mock-pca-039 (Content-Type check, 2 to 3) and q-mock-pca-063 (native histograms, 3.9). No question rests on a feature the docs mark experimental. Features avoided for that reason: the `promql-experimental-functions` functions, fill modifiers, extended range selectors (`anchored`, `smoothed`), `limitk` and `limit_ratio`, exemplar storage, unquoted UTF-8 names (only named as a wrong option, with its flag).

Pages used:

| Topic | Page |
|---|---|
| Overview, architecture | https://prometheus.io/docs/introduction/overview/ |
| FAQ (HA, logs, reload) | https://prometheus.io/docs/introduction/faq/ |
| Data model | https://prometheus.io/docs/concepts/data_model/ |
| Metric types | https://prometheus.io/docs/concepts/metric_types/ |
| Jobs and instances | https://prometheus.io/docs/concepts/jobs_instances/ |
| Exposition formats | https://prometheus.io/docs/instrumenting/exposition_formats/ |
| Writing exporters | https://prometheus.io/docs/instrumenting/writing_exporters/ |
| Multi-target exporter guide | https://prometheus.io/docs/guides/multi-target-exporter/ |
| Instrumentation practices | https://prometheus.io/docs/practices/instrumentation/ |
| Metric and label naming | https://prometheus.io/docs/practices/naming/ |
| Histograms and summaries | https://prometheus.io/docs/practices/histograms/ |
| Recording rule practices | https://prometheus.io/docs/practices/rules/ |
| Alerting practices | https://prometheus.io/docs/practices/alerting/ |
| Pushgateway practices | https://prometheus.io/docs/practices/pushing/ |
| Configuration | https://prometheus.io/docs/prometheus/latest/configuration/configuration/ |
| Recording rules, promtool | https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/ |
| promtool commands | https://prometheus.io/docs/prometheus/latest/command-line/promtool/ |
| Alerting rules | https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ |
| Querying basics | https://prometheus.io/docs/prometheus/latest/querying/basics/ |
| Operators | https://prometheus.io/docs/prometheus/latest/querying/operators/ |
| Functions | https://prometheus.io/docs/prometheus/latest/querying/functions/ |
| Storage | https://prometheus.io/docs/prometheus/latest/storage/ |
| Federation | https://prometheus.io/docs/prometheus/latest/federation/ |
| Agent mode | https://prometheus.io/docs/prometheus/latest/prometheus_agent/ |
| Migration to 3.0 | https://prometheus.io/docs/prometheus/latest/migration/ |
| Alertmanager concepts | https://prometheus.io/docs/alerting/latest/alertmanager/ |
| Alertmanager configuration | https://prometheus.io/docs/alerting/latest/configuration/ |
| Alertmanager high availability | https://prometheus.io/docs/alerting/latest/high_availability/ |
| Grafana Prometheus variables | https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/ |
| Grafana heatmap | https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/heatmap/ |
| Grafana stat, visualization list | https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/stat/ |
| Grafana thresholds | https://grafana.com/docs/grafana/latest/panels-visualizations/configure-thresholds/ |
| Grafana dashboard best practices | https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/ |
| Grafana alert rule evaluation | https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/ |
| Loki overview | https://grafana.com/docs/loki/latest/get-started/overview/ |
| SRE book, SLOs | https://sre.google/sre-book/service-level-objectives/ |
| SRE workbook, alerting on SLOs | https://sre.google/workbook/alerting-on-slos/ |
| OpenTelemetry traces | https://opentelemetry.io/docs/concepts/signals/traces/ |
| OpenTelemetry logs | https://opentelemetry.io/docs/concepts/signals/logs/ |

The card lists prometheus.io, grafana.com/docs and sre.google. Four P1 questions on spans and on logs and events (q-mock-pca-005, 007, 008, 009) cite opentelemetry.io, as the pilot m02 did for the same competencies, because the Prometheus docs do not describe spans or events.

## Facts per question

The fact column is the explanation of the right answer as it stands in the pool. "Checked" means the source states it; "inference" says what it is drawn from.

| Question | Competency | Fact the right answer rests on | Source | Date | Status |
|---|---|---|---|---|---|
| q-mock-pca-001 | P1 Metrics | The guidelines say that every line of logging code should have a counter, so you can see how often a message happens and for how long. | https://prometheus.io/docs/practices/instrumentation/ | 2026-11-11 | checked |
| q-mock-pca-002 | P1 Metrics | The queue length can go down as well as up, so it is a gauge. | https://prometheus.io/docs/concepts/metric_types/ | 2026-11-11 | checked |
| q-mock-pca-003 | P1 Metrics | The SRE book says most metrics are better thought of as distributions, because an average can hide the tail latencies. Look at high percentiles such as the 99th. | https://sre.google/sre-book/service-level-objectives/ | 2026-11-11 | checked |
| q-mock-pca-004 | P1 Understand logs and events | Loki does not index the content of log lines. It indexes the labels of each stream and stores the lines in compressed chunks. | https://grafana.com/docs/loki/latest/get-started/overview/ | 2026-11-11 | checked |
| q-mock-pca-005 | P1 Understand logs and events | The docs say that all events are logs, but not all logs are events. | https://opentelemetry.io/docs/concepts/signals/logs/ | 2026-11-11 | checked |
| q-mock-pca-006 | P1 Understand logs and events | The FAQ says not to feed logs into Prometheus. Loki is designed to extract metrics from logs with its metric queries. | https://prometheus.io/docs/introduction/faq/ | 2026-11-11 | checked |
| q-mock-pca-007 | P1 Tracing and Spans | A span event marks a meaningful single point in time during the span. Use one when the timestamp itself matters. | https://opentelemetry.io/docs/concepts/signals/traces/ | 2026-11-11 | checked |
| q-mock-pca-008 | P1 Tracing and Spans | Span links associate one span with one or more other spans and imply a causal relationship, even across traces. | https://opentelemetry.io/docs/concepts/signals/traces/ | 2026-11-11 | inference: a span has one parent_id field, so fifty parents cannot be set; links are the documented relation |
| q-mock-pca-009 | P1 Tracing and Spans | The root span marks the start and end of the whole operation, and it is the span without a parent. | https://opentelemetry.io/docs/concepts/signals/traces/ | 2026-11-11 | checked |
| q-mock-pca-010 | P1 Push vs Pull | The docs recommend running Prometheus on the same network as the monitored instances, or using PushProx to cross the firewall or NAT. | https://prometheus.io/docs/practices/pushing/ | 2026-11-11 | checked |
| q-mock-pca-011 | P1 Push vs Pull | For batch jobs tied to a machine, the docs suggest the node exporter's textfile collector instead of the Pushgateway. | https://prometheus.io/docs/practices/pushing/ | 2026-11-11 | checked |
| q-mock-pca-012 | P1 Push vs Pull | When many instances go through one Pushgateway, it is both a single point of failure and a possible bottleneck. / `up` is generated on every scrape of a target. Pushed metrics do not produce it. | https://prometheus.io/docs/practices/pushing/ | 2026-11-11 | checked |
| q-mock-pca-013 | P1 Service Discovery | With no declared port, the pod role creates one port-free target per container, and `__address__` holds the pod IP only. | https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config | 2026-11-11 | checked |
| q-mock-pca-014 | P1 Service Discovery | File-based discovery reads target lists from YAML or JSON files and applies changes as soon as the files change. It is the interface for custom discovery. | https://prometheus.io/docs/prometheus/latest/configuration/configuration/#file_sd_config | 2026-11-11 | checked |
| q-mock-pca-015 | P1 Service Discovery | `__meta_` labels exist only during relabeling. A rule such as `replace` or `labelmap` must copy the value into a normal label. | https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config | 2026-11-11 | checked |
| q-mock-pca-016 | P1 Basics of SLOs, SLAs, and SLIs | A 1% error rate is ten times the 0.1% budget rate, a burn rate of 10. The 30-day budget lasts 30 / 10 = 3 days. | https://sre.google/workbook/alerting-on-slos/ | 2026-11-11 | checked |
| q-mock-pca-017 | P1 Basics of SLOs, SLAs, and SLIs | An SLO is a target value for an SLI over a period. Here the target is 99% of requests faster than 100 ms. | https://sre.google/sre-book/service-level-objectives/ | 2026-11-11 | checked |
| q-mock-pca-018 | P1 Basics of SLOs, SLAs, and SLIs | Recall and detection time are good, but precision is low. A 0.1% error rate for 10 minutes fires the alert while using only 0.02% of the monthly budget. | https://sre.google/workbook/alerting-on-slos/ | 2026-11-11 | checked |
| q-mock-pca-019 | P2 System Architecture | Prometheus stores scraped samples locally and runs rules over them to record new series or to generate alerts. | https://prometheus.io/docs/introduction/overview/ | 2026-11-11 | checked |
| q-mock-pca-020 | P2 System Architecture | Agent mode disables local queries; the data lives only in a write-ahead log until it is sent. / Agent mode has no rule evaluation, so alerts and recording rules must run in the remote system. | https://prometheus.io/docs/prometheus/latest/prometheus_agent/ | 2026-11-11 | checked |
| q-mock-pca-021 | P2 System Architecture | Identical servers on separate machines scrape the same targets. The Alertmanager deduplicates identical alerts from them. | https://prometheus.io/docs/introduction/faq/ | 2026-11-11 | checked |
| q-mock-pca-022 | P2 System Architecture | In hierarchical federation, global servers scrape only aggregated series from the per-data-centre servers. | https://prometheus.io/docs/prometheus/latest/federation/ | 2026-11-11 | checked |
| q-mock-pca-023 | P2 Configuration and Scraping | The global default `scrape_interval` is 1m, and jobs inherit it. | https://prometheus.io/docs/prometheus/latest/configuration/configuration/ | 2026-11-11 | checked |
| q-mock-pca-024 | P2 Configuration and Scraping | With `honor_labels` false, clashing labels from the target are renamed to `exported_*`. True keeps the target's values, which is what the docs suggest for the Pushgateway. | https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config | 2026-11-11 | checked |
| q-mock-pca-025 | P2 Configuration and Scraping | A SIGHUP makes Prometheus reload its configuration file. / The reload endpoint applies the file, but only when the lifecycle flag is enabled. | https://prometheus.io/docs/introduction/faq/ | 2026-11-11 | checked |
| q-mock-pca-026 | P2 Configuration and Scraping | Metric relabeling runs on the scraped samples as the last step before ingestion, so it can drop expensive series. | https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs | 2026-11-11 | checked |
| q-mock-pca-027 | P2 Configuration and Scraping | If more samples than the limit remain after metric relabeling, the entire scrape is treated as failed, and a failed scrape sets `up` to 0. | https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config (the `up` part: https://prometheus.io/docs/concepts/jobs_instances/) | 2026-11-11 | checked |
| q-mock-pca-028 | P2 Understanding Prometheus Limitations | Local storage is limited to one node's scalability and durability. Remote write lets a clustered system keep the data. | https://prometheus.io/docs/prometheus/latest/storage/ | 2026-11-11 | checked |
| q-mock-pca-029 | P2 Understanding Prometheus Limitations | File systems that are not POSIX compliant are not supported, and NFS, including AWS EFS, is named. A local file system is strongly recommended. | https://prometheus.io/docs/prometheus/latest/storage/ | 2026-11-11 | checked |
| q-mock-pca-030 | P2 Understanding Prometheus Limitations | The guidelines use this very case. Per-user quota on 10,000 nodes quickly reaches a double-digit number of millions of series. | https://prometheus.io/docs/practices/instrumentation/ | 2026-11-11 | checked |
| q-mock-pca-031 | P2 Data Model and Labels | The data model says that labels with an empty value are equivalent to labels that do not exist. | https://prometheus.io/docs/concepts/data_model/ | 2026-11-11 | checked |
| q-mock-pca-032 | P2 Data Model and Labels | Label names starting with `__` must be reserved for internal Prometheus use. | https://prometheus.io/docs/concepts/data_model/ | 2026-11-11 | checked |
| q-mock-pca-033 | P2 Data Model and Labels | A sample is a float64 or a native histogram value, with a timestamp of millisecond precision. | https://prometheus.io/docs/concepts/data_model/ | 2026-11-11 | checked |
| q-mock-pca-034 | P2 Data Model and Labels | Since 3.0, names may use UTF-8. A name outside the usual character set goes in quotes inside the braces. | https://prometheus.io/docs/prometheus/latest/querying/basics/#metric-and-label-names | 2026-11-11 | checked |
| q-mock-pca-035 | P2 Data Model and Labels | Any change of a label value, or adding or removing a label, creates a new time series. | https://prometheus.io/docs/concepts/data_model/ | 2026-11-11 | checked |
| q-mock-pca-036 | P2 Exposition Format | The `+Inf` bucket must exist and must equal `_count`, because buckets are cumulative. | https://prometheus.io/docs/instrumenting/exposition_formats/ | 2026-11-11 | checked |
| q-mock-pca-037 | P2 Exposition Format | If there is no TYPE line for a metric name, its type is set to untyped. | https://prometheus.io/docs/instrumenting/exposition_formats/ | 2026-11-11 | checked |
| q-mock-pca-038 | P2 Exposition Format | After the value, a line may carry a timestamp, an int64 count of milliseconds since the epoch. | https://prometheus.io/docs/instrumenting/exposition_formats/ | 2026-11-11 | checked |
| q-mock-pca-039 | P2 Exposition Format | Prometheus 3 fails a scrape when the Content-Type is missing or unknown, where version 2 fell back to the text format. The fallback setting restores that. | https://prometheus.io/docs/prometheus/latest/migration/#scrape-protocols | 2026-11-11 | checked |
| q-mock-pca-040 | P3 Selecting Data | Regex matchers are fully anchored, so `=~"prod"` means `^prod# Verification log: PCA mock exam pool

Card X2 (wave 4), file `lgtm/learn/src/content/questions/mock-pca.yaml`, 109 questions, written and checked on 2026-11-11.

## How the facts were checked

Every page below was fetched on 2026-11-11 and kept as text while the questions were written. The Prometheus pages were read from the sources that build prometheus.io: the `docs/` folder of `prometheus/prometheus` at tag `v3.16.0` (the latest release, published 2026-11-05), the `docs/` folder of `prometheus/docs` on `main`, and the `docs/` folder of `prometheus/alertmanager` at tag `v0.35.0`. Each question's `source` is the prometheus.io address of the page that states the fact its right answer rests on. Grafana, SRE and OpenTelemetry pages were fetched from their own sites.

The curriculum (`PCA_Curriculum.pdf`, 2022) predates Prometheus 3. Where versions 2 and 3 behave differently, the question names the version: q-mock-pca-034 (UTF-8 names, 3.x), q-mock-pca-039 (Content-Type check, 2 to 3) and q-mock-pca-063 (native histograms, 3.9). No question rests on a feature the docs mark experimental. Features avoided for that reason: the `promql-experimental-functions` functions, fill modifiers, extended range selectors (`anchored`, `smoothed`), `limitk` and `limit_ratio`, exemplar storage, unquoted UTF-8 names (only named as a wrong option, with its flag).

Pages used:

| Topic | Page |
|---|---|
| Overview, architecture | https://prometheus.io/docs/introduction/overview/ |
| FAQ (HA, logs, reload) | https://prometheus.io/docs/introduction/faq/ |
| Data model | https://prometheus.io/docs/concepts/data_model/ |
| Metric types | https://prometheus.io/docs/concepts/metric_types/ |
| Jobs and instances | https://prometheus.io/docs/concepts/jobs_instances/ |
| Exposition formats | https://prometheus.io/docs/instrumenting/exposition_formats/ |
| Writing exporters | https://prometheus.io/docs/instrumenting/writing_exporters/ |
| Multi-target exporter guide | https://prometheus.io/docs/guides/multi-target-exporter/ |
| Instrumentation practices | https://prometheus.io/docs/practices/instrumentation/ |
| Metric and label naming | https://prometheus.io/docs/practices/naming/ |
| Histograms and summaries | https://prometheus.io/docs/practices/histograms/ |
| Recording rule practices | https://prometheus.io/docs/practices/rules/ |
| Alerting practices | https://prometheus.io/docs/practices/alerting/ |
| Pushgateway practices | https://prometheus.io/docs/practices/pushing/ |
| Configuration | https://prometheus.io/docs/prometheus/latest/configuration/configuration/ |
| Recording rules, promtool | https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/ |
| promtool commands | https://prometheus.io/docs/prometheus/latest/command-line/promtool/ |
| Alerting rules | https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ |
| Querying basics | https://prometheus.io/docs/prometheus/latest/querying/basics/ |
| Operators | https://prometheus.io/docs/prometheus/latest/querying/operators/ |
| Functions | https://prometheus.io/docs/prometheus/latest/querying/functions/ |
| Storage | https://prometheus.io/docs/prometheus/latest/storage/ |
| Federation | https://prometheus.io/docs/prometheus/latest/federation/ |
| Agent mode | https://prometheus.io/docs/prometheus/latest/prometheus_agent/ |
| Migration to 3.0 | https://prometheus.io/docs/prometheus/latest/migration/ |
| Alertmanager concepts | https://prometheus.io/docs/alerting/latest/alertmanager/ |
| Alertmanager configuration | https://prometheus.io/docs/alerting/latest/configuration/ |
| Alertmanager high availability | https://prometheus.io/docs/alerting/latest/high_availability/ |
| Grafana Prometheus variables | https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/ |
| Grafana heatmap | https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/heatmap/ |
| Grafana stat, visualization list | https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/stat/ |
| Grafana thresholds | https://grafana.com/docs/grafana/latest/panels-visualizations/configure-thresholds/ |
| Grafana dashboard best practices | https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/ |
| Grafana alert rule evaluation | https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/ |
| Loki overview | https://grafana.com/docs/loki/latest/get-started/overview/ |
| SRE book, SLOs | https://sre.google/sre-book/service-level-objectives/ |
| SRE workbook, alerting on SLOs | https://sre.google/workbook/alerting-on-slos/ |
| OpenTelemetry traces | https://opentelemetry.io/docs/concepts/signals/traces/ |
| OpenTelemetry logs | https://opentelemetry.io/docs/concepts/signals/logs/ |

The card lists prometheus.io, grafana.com/docs and sre.google. Three P1 questions on spans and on logs and events (q-mock-pca-005, 007, 008, 009) cite opentelemetry.io, as the pilot m02 did for the same competencies, because the Prometheus docs do not describe spans or events.

## Facts per question

The fact column is the explanation of the right answer as it stands in the pool. "Checked" means the source states it; "inference" says what it is drawn from.

| Question | Competency | Fact the right answer rests on | Source | Date | Status |
|---|---|---|---|---|---|
. | https://prometheus.io/docs/prometheus/latest/querying/basics/#instant-vector-selectors | 2026-11-11 | checked |
| q-mock-pca-041 | P3 Selecting Data | A selector needs a metric name or at least one matcher that does not match the empty string. `.*` matches the empty string. | https://prometheus.io/docs/prometheus/latest/querying/basics/#instant-vector-selectors | 2026-11-11 | checked |
| q-mock-pca-042 | P3 Selecting Data | A matcher that matches an empty value also selects every series that does not have the label. | https://prometheus.io/docs/prometheus/latest/querying/basics/#instant-vector-selectors | 2026-11-11 | checked |
| q-mock-pca-043 | P3 Selecting Data | When a target goes away, its series get a staleness marker, and queries after the marker return no value for them. | https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness | 2026-11-11 | checked |
| q-mock-pca-044 | P3 Rates and Derivatives | Take the rate first, then aggregate. rate() then sees each pod's counter and can adjust for its resets. | https://prometheus.io/docs/prometheus/latest/querying/functions/#rate | 2026-11-11 | checked |
| q-mock-pca-045 | P3 Rates and Derivatives | irate() looks only at the last two samples, so brief dips can reset the for clause. rate() averages over the range. | https://prometheus.io/docs/prometheus/latest/querying/functions/#irate | 2026-11-11 | checked |
| q-mock-pca-046 | P3 Rates and Derivatives | The samples rarely sit exactly on the range edges, so increase() extrapolates, and the result can be a fraction. | https://prometheus.io/docs/prometheus/latest/querying/functions/#increase | 2026-11-11 | checked |
| q-mock-pca-047 | P3 Rates and Derivatives | deriv() gives the per-second derivative of a gauge by linear regression. rate() treats every drop as a counter reset. | https://prometheus.io/docs/prometheus/latest/querying/functions/#deriv | 2026-11-11 | checked |
| q-mock-pca-048 | P3 Rates and Derivatives | predict_linear() fits a line to the gauge over 6 hours and predicts the value 14,400 seconds (4 hours) ahead. | https://prometheus.io/docs/prometheus/latest/querying/functions/#predict_linear | 2026-11-11 | checked |
| q-mock-pca-049 | P3 Aggregating over time | max_over_time() returns the highest sample of each series within the range. | https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time | 2026-11-11 | checked |
| q-mock-pca-050 | P3 Aggregating over time | count_over_time() counts the samples in the range. One hour has 3,600 / 15 = 240 scrapes. | https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time | 2026-11-11 | inference: 3,600 s / 15 s from the definition of count_over_time() |
| q-mock-pca-051 | P3 Aggregating over time | The subquery runs the 5-minute rate once per minute for an hour, and max_over_time() keeps the highest value. | https://prometheus.io/docs/prometheus/latest/querying/basics/#subquery | 2026-11-11 | checked |
| q-mock-pca-052 | P3 Aggregating over time | It returns a series with value 1 when the range has no samples, which is what an alert needs. | https://prometheus.io/docs/prometheus/latest/querying/functions/#absent_over_time | 2026-11-11 | checked |
| q-mock-pca-053 | P3 Aggregating over dimensions | Removing `instance` leaves `application` and `group`, which is what by keeps. | https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators | 2026-11-11 | checked |
| q-mock-pca-054 | P3 Aggregating over dimensions | topk() returns k of the input series with their original labels. | https://prometheus.io/docs/prometheus/latest/querying/operators/#topk-and-bottomk | 2026-11-11 | checked |
| q-mock-pca-055 | P3 Aggregating over dimensions | count_values() returns one series per distinct value, with that value in the `version` label and the number of instances as the value. | https://prometheus.io/docs/prometheus/latest/querying/operators/#count_values | 2026-11-11 | checked |
| q-mock-pca-056 | P3 Aggregating over dimensions | When aggregating ratios, aggregate the numerator and the denominator separately, then divide. An average of ratios is not statistically valid. | https://prometheus.io/docs/practices/rules/ | 2026-11-11 | checked |
| q-mock-pca-057 | P3 Binary operators | By default both sides must have exactly the same labels. ignoring(code) leaves code out of the matching. | https://prometheus.io/docs/prometheus/latest/querying/operators/#one-to-one-vector-matches | 2026-11-11 | checked |
| q-mock-pca-058 | P3 Binary operators | Many-to-one matching must be asked for, and group_left says the left side has the higher cardinality. | https://prometheus.io/docs/prometheus/latest/querying/operators/#many-to-one-and-one-to-many-vector-matches | 2026-11-11 | checked |
| q-mock-pca-059 | P3 Binary operators | Comparisons filter by default. With bool, every matched series is kept with the value 0 or 1. | https://prometheus.io/docs/prometheus/latest/querying/operators/#comparison-binary-operators | 2026-11-11 | checked |
| q-mock-pca-060 | P3 Binary operators | unless keeps the left-hand elements that find no exact label match on the right. | https://prometheus.io/docs/prometheus/latest/querying/operators/#logicalset-binary-operators | 2026-11-11 | checked |
| q-mock-pca-061 | P3 Binary operators | In any arithmetic binary operation involving vectors, the metric name is dropped. | https://prometheus.io/docs/prometheus/latest/querying/operators/#arithmetic-binary-operators | 2026-11-11 | checked |
| q-mock-pca-062 | P3 Histograms | For classic histograms the le label is needed to find the buckets. Samples without it are silently ignored. | https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile | 2026-11-11 | checked |
| q-mock-pca-063 | P3 Histograms | Native histograms are stable, but scraping them must be enabled with `scrape_native_histograms`, which defaults to false. | https://prometheus.io/docs/prometheus/latest/migration/#flags | 2026-11-11 | checked |
| q-mock-pca-064 | P3 Histograms | Precomputed summary quantiles cannot be aggregated in a meaningful way. Histograms can be summed and then passed to histogram_quantile(). | https://prometheus.io/docs/practices/histograms/ | 2026-11-11 | checked |
| q-mock-pca-065 | P3 Histograms | When a quantile falls in the highest bucket, the upper bound of the second-highest bucket is returned. | https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile | 2026-11-11 | checked |
| q-mock-pca-066 | P3 Histograms | Divide the rate of the sum by the rate of the count. That gives the average duration per request. | https://prometheus.io/docs/practices/histograms/ | 2026-11-11 | checked |
| q-mock-pca-067 | P3 Timestamp Metrics | The guidelines say to export the time of the event and compute the time since it with time(). | https://prometheus.io/docs/practices/instrumentation/#timestamps-not-time-since | 2026-11-11 | checked |
| q-mock-pca-068 | P3 Timestamp Metrics | timestamp() returns the time of each sample, and time() the evaluation time. The difference is the sample's age. | https://prometheus.io/docs/prometheus/latest/querying/functions/#timestamp | 2026-11-11 | checked |
| q-mock-pca-069 | P3 Timestamp Metrics | offset must follow the selector directly. The sum is then taken over the old values. | https://prometheus.io/docs/prometheus/latest/querying/basics/#offset-modifier | 2026-11-11 | checked |
| q-mock-pca-070 | P3 Timestamp Metrics | time() returns the time at which the expression is evaluated, which is each step's own time in a range query. | https://prometheus.io/docs/prometheus/latest/querying/functions/#time | 2026-11-11 | checked |
| q-mock-pca-071 | P4 Client Libraries | Series that appear only when something happens are hard to work with. Export a default of 0 for series you know may exist. | https://prometheus.io/docs/practices/instrumentation/#avoid-missing-metrics | 2026-11-11 | checked |
| q-mock-pca-072 | P4 Client Libraries | Creating fresh metrics in the collect step, as the Go library does with `MustNewConstMetric`, avoids races between two scrapes and stops label values that disappeared from being exported. | https://prometheus.io/docs/instrumenting/writing_exporters/#collectors | 2026-11-11 | checked |
| q-mock-pca-073 | P4 Client Libraries | For very hot loops, limit the metrics you update and cache the result of the label lookup, for example the return value of With() in Go. | https://prometheus.io/docs/practices/instrumentation/#inner-loops | 2026-11-11 | checked |
| q-mock-pca-074 | P4 Client Libraries | Some libraries omit the quantile calculation, which is a legitimate use. The rate of _sum divided by the rate of _count gives the average. | https://prometheus.io/docs/practices/histograms/ | 2026-11-11 | checked |
| q-mock-pca-075 | P4 Instrumentation | For online-serving systems the key metrics are the number of queries, errors and latency. Requests in progress can help too. | https://prometheus.io/docs/practices/instrumentation/#online-serving-systems | 2026-11-11 | checked |
| q-mock-pca-076 | P4 Instrumentation | The key metric of a batch job is the last time it succeeded. Such gauges should be pushed to a Pushgateway. | https://prometheus.io/docs/practices/instrumentation/#batch-jobs | 2026-11-11 | checked |
| q-mock-pca-077 | P4 Instrumentation | Be consistent, and count at the end. It lines up with errors and latency and is often easier to code. | https://prometheus.io/docs/practices/instrumentation/#online-serving-systems | 2026-11-11 | checked |
| q-mock-pca-078 | P4 Instrumentation | With a counter for failures, also keep the total attempts. Then the failure ratio is one division. | https://prometheus.io/docs/practices/instrumentation/#failures | 2026-11-11 | checked |
| q-mock-pca-079 | P4 Exporters | Each exporter should monitor exactly one instance, ideally on the same machine. Discovery then stays in Prometheus. | https://prometheus.io/docs/instrumenting/writing_exporters/#deployment | 2026-11-11 | checked |
| q-mock-pca-080 | P4 Exporters | `__param_target` becomes the URL parameter target, and `__address__` decides which host is scraped. | https://prometheus.io/docs/guides/multi-target-exporter/ | 2026-11-11 | checked |
| q-mock-pca-081 | P4 Exporters | A value that can decrease is not a Prometheus counter. The guidelines suggest UNTYPED, since GAUGE could mislead when it is used as a counter. | https://prometheus.io/docs/instrumenting/writing_exporters/#types | 2026-11-11 | checked |
| q-mock-pca-082 | P4 Exporters | Metrics about the scrape itself are gauges, prefixed with the exporter name. | https://prometheus.io/docs/instrumenting/writing_exporters/#metrics-about-the-scrape-itself | 2026-11-11 | checked |
| q-mock-pca-083 | P4 Exporters | Prometheus calculates rates itself, usually more accurately than these decaying averages, so the guidelines say to drop them. | https://prometheus.io/docs/instrumenting/writing_exporters/#drop-less-useful-statistics | 2026-11-11 | checked |
| q-mock-pca-084 | P4 Structuring and naming metrics | It has a prefix for the domain, a base unit and the unit as a plural suffix. | https://prometheus.io/docs/practices/naming/ | 2026-11-11 | checked |
| q-mock-pca-085 | P4 Structuring and naming metrics | An accumulating count with a unit has the unit and then `_total`. / A count without a unit ends in `_total`. | https://prometheus.io/docs/practices/naming/ | 2026-11-11 | checked |
| q-mock-pca-086 | P4 Structuring and naming metrics | Metrics you want to add or average should be one metric with labels. No part of a name should be generated. | https://prometheus.io/docs/practices/instrumentation/#use-labels | 2026-11-11 | checked |
| q-mock-pca-087 | P4 Structuring and naming metrics | The guidelines say never to expose a total like this. Anyone who sums the metric counts every item twice. | https://prometheus.io/docs/instrumenting/writing_exporters/#labels | 2026-11-11 | checked |
| q-mock-pca-088 | P5 Dashboarding basics | $__rate_interval is at least four times the scrape interval set in the data source. At 15s instead of 60s, the window often holds too few samples for rate(). | https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/ | 2026-11-11 | checked |
| q-mock-pca-089 | P5 Dashboarding basics | Grafana joins several values with a pipe, which only works with a regex matcher. | https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/ | 2026-11-11 | checked |
| q-mock-pca-090 | P5 Dashboarding basics | A heatmap shows a histogram's distribution over time, so patterns in the buckets become visible. | https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/heatmap/ | 2026-11-11 | checked |
| q-mock-pca-091 | P5 Dashboarding basics | Base stands for minus infinity, so values below 80 are green and values from 80 are red. | https://grafana.com/docs/grafana/latest/panels-visualizations/configure-thresholds/ | 2026-11-11 | checked |
| q-mock-pca-092 | P5 Dashboarding basics | RED (rate, errors, duration) suits services, and USE (utilization, saturation, errors) suits hardware resources. | https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/ | 2026-11-11 | checked |
| q-mock-pca-093 | P5 Dashboarding basics | Grafana suggests template variables instead of a separate dashboard per node. | https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/ | 2026-11-11 | checked |
| q-mock-pca-094 | P5 Configuring Alerting rules | With a for clause, an alert stays pending until the condition has held for the whole duration. | https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ | 2026-11-11 | checked |
| q-mock-pca-095 | P5 Configuring Alerting rules | It keeps the alert firing for a set time after the condition was last met, which prevents flapping and false resolutions. | https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ | 2026-11-11 | checked |
| q-mock-pca-096 | P5 Configuring Alerting rules | $labels holds the alert's labels and $value the evaluated value of the expression. | https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/#templating | 2026-11-11 | checked |
| q-mock-pca-097 | P5 Configuring Alerting rules | For pending and firing alerts, Prometheus stores synthetic series named ALERTS, with an alertstate label. | https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/#inspecting-alerts-during-runtime | 2026-11-11 | checked |
| q-mock-pca-098 | P5 Configuring Alerting rules | promtool checks a rule file without a running server. It exits with 0 when the file is valid and 1 on errors. | https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/#syntax-checking-rules | 2026-11-11 | checked |
| q-mock-pca-099 | P5 Configuring Alerting rules | Recovering is the state of a firing alert whose threshold is no longer breached while the keep firing for period has not ended. | https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/ | 2026-11-11 | checked |
| q-mock-pca-100 | P5 Understand and Use Alertmanager | After the first notification, new alerts in a group wait for the next group_interval, which is 5 minutes by default. | https://prometheus.io/docs/alerting/latest/configuration/#route | 2026-11-11 | inference: 5 m group_interval minus the 1 m already passed |
| q-mock-pca-101 | P5 Understand and Use Alertmanager | An inhibit rule with ClusterUnreachable as its source mutes target alerts while the source fires, and equal requires the same cluster value on both. | https://prometheus.io/docs/alerting/latest/configuration/#inhibit_rule | 2026-11-11 | checked |
| q-mock-pca-102 | P5 Understand and Use Alertmanager | continue defaults to false, so the alert stops at the first matching child. Set it to true to try the siblings too. | https://prometheus.io/docs/alerting/latest/configuration/#route | 2026-11-11 | checked |
| q-mock-pca-103 | P5 Understand and Use Alertmanager | A silence mutes alerts that match its matchers for a given time. It is set in the Alertmanager web interface. | https://prometheus.io/docs/alerting/latest/alertmanager/#silences | 2026-11-11 | checked |
| q-mock-pca-104 | P5 Understand and Use Alertmanager | The docs say not to load balance this traffic, but to point Prometheus to the list of all Alertmanagers. | https://prometheus.io/docs/alerting/latest/alertmanager/#high-availability | 2026-11-11 | checked |
| q-mock-pca-105 | P5 Understand and Use Alertmanager | Grouping, for example by alertname and cluster, puts similar alerts into one notification that still lists the affected instances. / The Alertmanager deduplicates identical alerts, such as the same alert from both servers of the pair. | https://prometheus.io/docs/alerting/latest/alertmanager/ | 2026-11-11 | checked |
| q-mock-pca-106 | P5 Alerting basics (when, what, and why) | Page on latency at one point in the stack, as close to users as possible. A slow lower part is no reason to page if users are fine. | https://prometheus.io/docs/practices/alerting/#online-serving-systems | 2026-11-11 | checked |
| q-mock-pca-107 | P5 Alerting basics (when, what, and why) | Allow at least enough time for 2 full runs. The guidelines give 10 hours as a reasonable threshold for this job. | https://prometheus.io/docs/practices/alerting/#batch-jobs | 2026-11-11 | checked |
| q-mock-pca-108 | P5 Alerting basics (when, what, and why) | The guidelines prefer one blackbox test of the whole path, from Prometheus through the Alertmanager to email, over separate alerts on each part. | https://prometheus.io/docs/practices/alerting/#metamonitoring | 2026-11-11 | checked |
| q-mock-pca-109 | P5 Alerting basics (when, what, and why) | Keep alerting simple, alert on symptoms, and avoid pages where there is nothing to do. | https://prometheus.io/docs/practices/alerting/ | 2026-11-11 | checked |

## Tags

36 tags. The first word names the module family, as the card asks. "Module" is the step of `docs/plan/01-curriculum.md` that should teach the tag.

| Tag | Questions | Module that should teach it |
|---|---|---|
| `metrics` | 4 | m02 s2 (pilot tag) |
| `logs` | 3 | m02 s3 (pilot tag) |
| `traces` | 3 | m02 s4 (pilot tag) |
| `push-pull` | 4 | m02 s9 (pilot tag) |
| `slo` | 4 | m02 s8, m15 s8 to s10 (pilot tag) |
| `golden-signals` | 2 | m02 s7 (pilot tag) |
| `cardinality` | 3 | m02 s10 (pilot tag) |
| `instrumentation` | 8 | m02 s12, m03 s10 to s11 (pilot tag) |
| `prom-architecture` | 5 | m03 s1 |
| `prom-data-model` | 6 | m03 s2 |
| `prom-metric-types` | 1 | m03 s3 |
| `prom-exposition-format` | 4 | m03 s4 |
| `prom-scrape-config` | 6 | m03 s5 |
| `prom-service-discovery` | 3 | m03 s6 |
| `prom-relabeling` | 3 | m03 s7 |
| `exporter-standard` | 2 | m03 s9, m06 s4 |
| `exporter-writing` | 5 | m03 s9 |
| `exporter-client-libraries` | 4 | m03 s10 |
| `prom-metric-naming` | 5 | m03 s10 |
| `prom-storage` | 3 | m03 s12 |
| `prom-remote-write` | 2 | m03 s13 |
| `promql-selectors` | 5 | m04 s1 to s2 |
| `promql-rate` | 5 | m04 s3 |
| `promql-aggregation` | 6 | m04 s4 |
| `promql-over-time` | 4 | m04 s5, s11 (subqueries) |
| `promql-binary-ops` | 5 | m04 s6 |
| `promql-histograms` | 8 | m04 s7 to s8 |
| `promql-time` | 4 | m04 s9 |
| `promql-functions` | 2 | m04 s10 |
| `dashboard-panels` | 2 | m05 s4 to s5 |
| `dashboard-variables` | 2 | m05 s6 |
| `dashboard-design` | 2 | m05 s8 |
| `alert-design` | 4 | m15 s1 |
| `alert-rules` | 8 | m15 s2 |
| `alert-alertmanager` | 6 | m15 s3 to s4 |
| `alert-grafana-managed` | 1 | m15 s5 |

## Pool statistics

| Domain | Drawn per exam | Card minimum | In the pool |
|---|---|---|---|
| P1 Observability Concepts | 11 | 17 | 18 |
| P2 Prometheus Fundamentals | 12 | 18 | 21 |
| P3 PromQL | 17 | 26 | 31 |
| P4 Instrumentation and Exporters | 9 | 14 | 17 |
| P5 Alerting & Dashboarding | 11 | 17 | 22 |

Questions per competency (every one has at least 3):

| Competency | Questions |
|---|---|
| P1 Metrics | 3 |
| P1 Understand logs and events | 3 |
| P1 Tracing and Spans | 3 |
| P1 Push vs Pull | 3 |
| P1 Service Discovery | 3 |
| P1 Basics of SLOs, SLAs, and SLIs | 3 |
| P2 System Architecture | 4 |
| P2 Configuration and Scraping | 5 |
| P2 Understanding Prometheus Limitations | 3 |
| P2 Data Model and Labels | 5 |
| P2 Exposition Format | 4 |
| P3 Selecting Data | 4 |
| P3 Rates and Derivatives | 5 |
| P3 Aggregating over time | 4 |
| P3 Aggregating over dimensions | 4 |
| P3 Binary operators | 5 |
| P3 Histograms | 5 |
| P3 Timestamp Metrics | 4 |
| P4 Client Libraries | 4 |
| P4 Instrumentation | 4 |
| P4 Exporters | 5 |
| P4 Structuring and naming metrics | 4 |
| P5 Dashboarding basics | 6 |
| P5 Configuring Alerting rules | 6 |
| P5 Understand and Use Alertmanager | 6 |
| P5 Alerting basics (when, what, and why) | 4 |

- Scenario questions (a situation, a symptom, a configuration snippet or a query to read): 88 of 109 (81%). The other 21 ask a concept directly: 002, 004, 005, 009, 017, 019, 021, 025, 032, 033, 037, 041, 060, 070, 075, 077, 084, 085, 096, 098, 108.
- Choose-two questions: 5 of 109 (4.6%).
- Option lengths (characters of visible text): the right answer averages 44.0, the wrong options 43.6. The right answer is the longest option in 12 questions (11%) and the shortest in 25 (23%); with four options, chance alone gives 25% for each.

## Independent check

One read-only sub-agent checked 15 questions across the five domains (q-mock-pca-013, 016, 018, 020, 027, 039, 045, 052, 063, 065, 072, 081, 099, 100, 101). It fetched each source itself and judged every right answer, wrong option and explanation. Result: 13 OK, 2 with wording problems, 0 wrong answers, 0 weak distractors, 0 wrong explanations, 0 wrong sources.

- q-mock-pca-018: the stem said "above 0.1%" while the workbook rule is 0.1% or higher, which the explanation relies on. Fixed: "is 0.1% or higher".
- q-mock-pca-045: "keeps falling back to pending" was unclear. Fixed: "never fires, because its for timer keeps starting again".
- q-mock-pca-027 (optional note): the source page does not say that a failed scrape sets `up` to 0. The explanation now says it, and the log cites the jobs and instances page for it.

The same kinds of fault were then searched in the rest of the pool: stems with a threshold that an explanation reads differently (none left) and right answers that rest partly on a second page (none besides 027).

Taking the full mock exam in the browser found one more kind: a right option whose first words differ from three wrong options that share theirs (q-mock-pca-018, 030, 031, 080, 083, 091, 105). Those were reworded, a script now finds no such question, and q-mock-pca-052 now has a service that exposes the metric, since a series pushed to a Pushgateway never goes missing.

## Mock exam in the browser

Taken on 2026-11-11 with `npx astro dev --port 8098` in `lgtm/learn`. The exam drew 60 questions split 11, 12, 17, 9 and 11 over P1 to P5, and the result page showed a result per domain: P1 10 of 11, P2 12 of 12, P3 16 of 17, P4 9 of 9, P5 11 of 11, 58 of 60 in all. Both misses were clicks on the wrong option while the click mapping was being set up, not faults in the questions.
