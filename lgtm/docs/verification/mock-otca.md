# Verification log: OTCA mock exam pool

Card X1, file `lgtm/learn/src/content/questions/mock-otca.yaml`, written on 2026-11-11.

## How the pool was checked

- Every source page was fetched on 2026-11-11 and saved as text, then searched while writing. For opentelemetry.io pages the Markdown version of the same page (`<page>/index.md`) was read; the `source` field names the normal page URL. For Collector components the README in the `opentelemetry-collector` or `opentelemetry-collector-contrib` repository was read, and the `source` field names its github.com URL.
- The domains and competency names were checked once against the official curriculum PDF (`https://raw.githubusercontent.com/cncf/curriculum/master/OTCA_Curriculum.pdf`). They match `lgtm/learn/src/lib/exams.ts` word for word.
- Status words were checked against the page they come from. The only status word in a question is "alpha" for the schema processor (q-mock-otca-113), from its README. Signal status is not asked about in this pool.
- Collector component names follow the current READMEs: the OTLP exporters are `otlp_grpc` and `otlp_http` (the README calls `otlphttp` a deprecated alias), and the load-balancing exporter is `load_balancing`. The OTLP receiver is still `otlp`, and `memory_limiter`, `batch` and `debug` keep their names. Some pages still show older names, for example `otlp/jaeger` as an exporter on the agent deployment page and `resourcedetection/system` on the transforming page; the pool uses the README names.
- Facts that changed since 2024 and shape some answers: the filter processor is configured with `<signal>_conditions` from version 0.146.0 (the older form is still accepted), batching can be done in the exporter's `sending_queue` with `batch:` (the batch processor still exists and is beta), declarative SDK configuration is read from `OTEL_CONFIG_FILE` (`OTEL_EXPERIMENTAL_CONFIG_FILE` is deprecated), and the spec deprecates the `TraceIdRatioBased` sampler in favor of `ProbabilitySampler` while keeping its behavior until at least 2027-01-01. No question depends on that last change: q-mock-otca-052 asks about `parentbased_traceidratio`, which is still a documented value of `OTEL_TRACES_SAMPLER`.
- The `why` of each right answer states the fact the answer rests on. That fact is the "Fact" column below.

## What some explanations infer

Most explanations of wrong options restate a fact from the same page. These go one step further and are inferences:

| Question | Inference | Drawn from |
|---|---|---|
| q-mock-otca-076 | A StatefulSet or sidecar pod sees only the files of its own node. | The components page says a Deployment "will only collect logs from the node it is deployed on". |
| q-mock-otca-079 | Components that are not configured still ship in the binary. | The distributions page and the ocb page say a custom build is how you get a smaller binary or custom components. |
| q-mock-otca-081 | New replicas do not wait for old ones to fill. | The scaling page says the load balancer decides where data goes. |
| q-mock-otca-109 | Without retries, failed data is dropped instead of tried again. | The exporter helper README on retry_on_failure and its failure diagram. |
| q-mock-otca-027 | Interleaved points from three writers make the sum seem to jump and reset. | The data model page: points "appear to reset the cumulative sum". |

## Independent check

One read-only sub-agent checked 15 questions against the live sources: 008, 013, 027, 038, 044, 052, 053, 065, 066, 073, 083, 090, 097, 104 and 108, across all four domains. Result: 13 OK, 2 to fix, 0 unsure.

- q-mock-otca-083: the explanation of the option "Remove the sending queue" said data is dropped at once, which the page does not say. It now says the queue gives the backend room to recover and removing it does not make the backend faster (the scaling page says a larger queue gives the backend "room to breathe").
- q-mock-otca-104: the option "Swap the order of the two --config flags" would also bring the processors back, so the question had two defensible answers. It was replaced by "Set `processors: null` in the first file as well", which is clearly wrong.

After the fixes the rest of the pool was searched for the same two faults: options that would also solve the stated problem, and explanations that claim more than the page. One more explanation was softened (q-mock-otca-109, retries).

## Numbers

- 113 questions: O1 19, O2 49, O3 29, O4 16. Every competency has at least 3 (the smallest are O4 Context Propagation and O4 Schema Management with 3 each).
- Scenario questions: 95 of 113 (84%). Concept questions: 18 of 113, marked in the table.
- Choose-two questions: 3 of 113 (3%): 019, 044, 067.
- Option lengths, counting text without markup: mean right answer 41.1 characters, mean wrong option 41.4. The right answer is strictly the longest option in 22 of 113 questions (19%).
- One full mock exam was taken in the browser on 2026-11-11: it drew 60 questions, 11 from O1, 28 from O2, 15 from O3 and 6 from O4, and the result page showed a score per domain.

## Questions

| Question | Competency | Kind | Fact the right answer rests on | Source | Date | Status |
|---|---|---|---|---|---|---|
| q-mock-otca-001 | O1 Telemetry Data | scenario | A link ties one span to a span in another trace when the later work cannot be predicted, such as queued jobs. | https://opentelemetry.io/docs/concepts/signals/traces/ | 2026-11-11 | checked |
| q-mock-otca-002 | O1 Telemetry Data | scenario | An event marks a meaningful single point in time during a span, so its timestamp is kept. | https://opentelemetry.io/docs/concepts/signals/traces/ | 2026-11-11 | checked |
| q-mock-otca-003 | O1 Telemetry Data | concept | The moment a measurement is captured is a metric event, and it includes the value, the time and associated metadata. | https://opentelemetry.io/docs/concepts/signals/metrics/ | 2026-11-11 | checked |
| q-mock-otca-004 | O1 Telemetry Data | scenario | The SDK correlates existing logs with the active trace and span by adding their IDs. | https://opentelemetry.io/docs/concepts/signals/logs/ | 2026-11-11 | checked |
| q-mock-otca-005 | O1 Telemetry Data | scenario | ObservedTimestamp is the time when the event was observed by the collection system. | https://opentelemetry.io/docs/specs/otel/logs/data-model/ | 2026-11-11 | checked |
| q-mock-otca-006 | O1 Semantic Conventions | scenario | The guidance is to prefix a company name with the reverse domain, in lower case, with snake_case for multi-word parts. | https://opentelemetry.io/docs/specs/semconv/general/naming/ | 2026-11-11 | checked |
| q-mock-otca-007 | O1 Semantic Conventions | concept | A Conditionally Required attribute must be set when its stated condition is true. | https://opentelemetry.io/docs/specs/semconv/general/attribute-requirement-level/ | 2026-11-11 | checked |
| q-mock-otca-008 | O1 Semantic Conventions | scenario | For 4xx codes the span status must be left unset on a server span. | https://opentelemetry.io/docs/specs/semconv/http/http-spans/ | 2026-11-11 | checked |
| q-mock-otca-009 | O1 Semantic Conventions | scenario | It is lower case, not pluralized and has no `total` suffix, as the rules ask. | https://opentelemetry.io/docs/specs/semconv/general/naming/ | 2026-11-11 | checked |
| q-mock-otca-010 | O1 Instrumentation | scenario | When a library is a thin proxy, the network calls are already traced and no conventions apply, the guidance is not to instrument. | https://opentelemetry.io/docs/concepts/instrumentation/libraries/ | 2026-11-11 | checked |
| q-mock-otca-011 | O1 Instrumentation | scenario | Without the SDK the API is non-operational, so the instrumentation does nothing and does not affect performance. | https://opentelemetry.io/docs/concepts/instrumentation/libraries/ | 2026-11-11 | checked |
| q-mock-otca-012 | O1 Instrumentation | scenario | Zero-code instrumentation adds the API and SDK without editing the source; a service name is enough to start. | https://opentelemetry.io/docs/concepts/instrumentation/zero-code/ | 2026-11-11 | checked |
| q-mock-otca-013 | O1 Instrumentation | scenario | Sampled-out spans are cheap. Checking whether a span is recording avoids expensive work for spans that will not be kept. | https://opentelemetry.io/docs/concepts/instrumentation/libraries/ | 2026-11-11 | checked |
| q-mock-otca-014 | O1 Instrumentation | scenario | Use events or logs for verbose data, and attach events to your own span, not to whatever span is active. | https://opentelemetry.io/docs/concepts/instrumentation/libraries/ | 2026-11-11 | checked |
| q-mock-otca-015 | O1 Instrumentation | concept | The aim is for popular libraries to be built observable by default, so separate dependencies are not needed. | https://opentelemetry.io/docs/concepts/components/ | 2026-11-11 | checked |
| q-mock-otca-016 | O1 Analysis and Outcomes | scenario | Reliability asks whether the service does what users expect. Wrong items in the cart make it unreliable. | https://opentelemetry.io/docs/concepts/observability-primer/ | 2026-11-11 | checked |
| q-mock-otca-017 | O1 Analysis and Outcomes | scenario | Tracing is essential for distributed systems with problems that are not deterministic or are too complex to reproduce locally. | https://opentelemetry.io/docs/concepts/observability-primer/ | 2026-11-11 | checked |
| q-mock-otca-018 | O1 Analysis and Outcomes | scenario | Context propagation lets measurements be aggregated by the calling path, such as checkout calling product. | https://opentelemetry.io/docs/concepts/context-propagation/ | 2026-11-11 | checked |
| q-mock-otca-019 | O1 Analysis and Outcomes | concept | High volume is one of the listed reasons to consider sampling. When most data looks alike, a sample represents it well. | https://opentelemetry.io/docs/concepts/sampling/ | 2026-11-11 | checked |
| q-mock-otca-020 | O2 Data Model | scenario | The resource is attached when the provider is created, and this association cannot be changed later. | https://opentelemetry.io/docs/concepts/resources/ | 2026-11-11 | checked |
| q-mock-otca-021 | O2 Data Model | concept | A scope is a tuple of name, version, schema URL and attributes, where only the name is required. | https://opentelemetry.io/docs/concepts/instrumentation-scope/ | 2026-11-11 | checked |
| q-mock-otca-022 | O2 Data Model | scenario | Telemetry is tagged with the scope's name and version, so you can compare behavior across versions of a component. | https://opentelemetry.io/docs/concepts/instrumentation-scope/ | 2026-11-11 | checked |
| q-mock-otca-023 | O2 Data Model | scenario | Once the status is set to Ok it is considered final, and later attempts to change it are ignored. | https://opentelemetry.io/docs/specs/otel/trace/api/ | 2026-11-11 | checked |
| q-mock-otca-024 | O2 Data Model | scenario | It names the class of operation. The ID belongs in an attribute. | https://opentelemetry.io/docs/specs/otel/trace/api/ | 2026-11-11 | checked |
| q-mock-otca-025 | O2 Data Model | concept | With cumulative temporality each point repeats the start time and covers everything since it. | https://opentelemetry.io/docs/specs/otel/metrics/data-model/ | 2026-11-11 | checked |
| q-mock-otca-026 | O2 Data Model | concept | ERROR covers the numbers 17 to 20. | https://opentelemetry.io/docs/specs/otel/logs/data-model/ | 2026-11-11 | checked |
| q-mock-otca-027 | O2 Data Model | scenario | This breaks the single-writer rule. Cumulative sums look like resets, and a distinct resource per writer fixes it. | https://opentelemetry.io/docs/specs/otel/metrics/data-model/ | 2026-11-11 | checked |
| q-mock-otca-028 | O2 Composability and Extension | concept | The SDK includes constructors for application owners and plugin interfaces for plugin authors. | https://opentelemetry.io/docs/specs/otel/overview/ | 2026-11-11 | checked |
| q-mock-otca-029 | O2 Composability and Extension | scenario | Baggage span processors read baggage and add it as span attributes when spans are created. | https://opentelemetry.io/docs/concepts/signals/baggage/ | 2026-11-11 | checked |
| q-mock-otca-030 | O2 Composability and Extension | scenario | Each processor registered on the provider starts its own pipeline, which can end with its own exporter. | https://opentelemetry.io/docs/specs/otel/trace/sdk/ | 2026-11-11 | checked |
| q-mock-otca-031 | O2 Composability and Extension | scenario | Resource detectors find information such as host, OS, process, container and Kubernetes attributes in the environment. | https://opentelemetry.io/docs/concepts/resources/ | 2026-11-11 | checked |
| q-mock-otca-032 | O2 Composability and Extension | concept | Contrib packages are optional and separate from the SDK; API Contrib depends only on the API, SDK Contrib also on the SDK. | https://opentelemetry.io/docs/specs/otel/overview/ | 2026-11-11 | checked |
| q-mock-otca-033 | O2 Composability and Extension | scenario | Attributes added at creation are available to the sampler. Ones added afterwards come too late. | https://opentelemetry.io/docs/concepts/signals/traces/ | 2026-11-11 | checked |
| q-mock-otca-034 | O2 Configuration | scenario | OTEL_SERVICE_NAME takes precedence over service.name in OTEL_RESOURCE_ATTRIBUTES. | https://opentelemetry.io/docs/languages/sdk-configuration/general/ | 2026-11-11 | checked |
| q-mock-otca-035 | O2 Configuration | scenario | An empty value means the same as an unset variable, and the default sampler is parentbased_always_on. | https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/ | 2026-11-11 | checked |
| q-mock-otca-036 | O2 Configuration | scenario | With OTLP/HTTP and the base endpoint variable, the SDK adds the signal path, here /v1/traces. | https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/ | 2026-11-11 | checked |
| q-mock-otca-037 | O2 Configuration | scenario | A gRPC endpoint is a gRPC target. Do not add OTLP/HTTP paths such as /v1/traces to it. | https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/ | 2026-11-11 | checked |
| q-mock-otca-038 | O2 Configuration | scenario | When OTEL_CONFIG_FILE is set, other variables are ignored unless the file references them for substitution. | https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/ | 2026-11-11 | checked |
| q-mock-otca-039 | O2 Configuration | scenario | The substitution uses the default after `:-` when the variable is not set. | https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/ | 2026-11-11 | checked |
| q-mock-otca-040 | O2 Configuration | scenario | OTEL_SDK_DISABLED disables the SDK for all signals. | https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/ | 2026-11-11 | checked |
| q-mock-otca-041 | O2 Signals (Tracing, Metric, Log) | scenario | An UpDownCounter records changes that can be positive, negative or zero, such as a queue length. | https://opentelemetry.io/docs/specs/otel/metrics/supplementary-guidelines/ | 2026-11-11 | checked |
| q-mock-otca-042 | O2 Signals (Tracing, Metric, Log) | scenario | An Asynchronous Gauge reports a non-additive value from a callback that runs only when metrics are collected. | https://opentelemetry.io/docs/specs/otel/metrics/supplementary-guidelines/ | 2026-11-11 | checked |
| q-mock-otca-043 | O2 Signals (Tracing, Metric, Log) | scenario | It tells consumers that values are additive across processes, so a total heap size makes sense. | https://opentelemetry.io/docs/specs/otel/metrics/supplementary-guidelines/ | 2026-11-11 | checked |
| q-mock-otca-044 | O2 Signals (Tracing, Metric, Log) | concept | A Counter uses the Sum aggregation by default. An UpDownCounter also uses the Sum aggregation by default. | https://opentelemetry.io/docs/specs/otel/metrics/sdk/ | 2026-11-11 | checked |
| q-mock-otca-045 | O2 Signals (Tracing, Metric, Log) | scenario | You keep your logging library and configure an appender or bridge that emits logs into OpenTelemetry. | https://opentelemetry.io/docs/concepts/signals/logs/ | 2026-11-11 | checked |
| q-mock-otca-046 | O2 Signals (Tracing, Metric, Log) | concept | The exception is recorded as an event named "exception" on the span during which it happened. | https://opentelemetry.io/docs/specs/otel/trace/exceptions/ | 2026-11-11 | checked |
| q-mock-otca-047 | O2 Signals (Tracing, Metric, Log) | scenario | A producer span represents creating a job that may be processed later. | https://opentelemetry.io/docs/concepts/signals/traces/ | 2026-11-11 | checked |
| q-mock-otca-048 | O2 Signals (Tracing, Metric, Log) | scenario | Baggage is a separate store. Service B must read it and add it, for example with a baggage span processor. | https://opentelemetry.io/docs/concepts/signals/baggage/ | 2026-11-11 | checked |
| q-mock-otca-049 | O2 Signals (Tracing, Metric, Log) | scenario | Measurements beyond the limit go into one point marked otel.metric.overflow=true, which no longer carries success. | https://opentelemetry.io/docs/concepts/signals/metrics/ | 2026-11-11 | checked |
| q-mock-otca-050 | O2 SDK Pipelines | scenario | Its default is 2048. When the queue is full, new spans are dropped. | https://opentelemetry.io/docs/specs/otel/trace/sdk/ | 2026-11-11 | checked |
| q-mock-otca-051 | O2 SDK Pipelines | scenario | ForceFlush exports spans that are not yet exported, and Shutdown also shuts down the processors. | https://opentelemetry.io/docs/specs/otel/trace/sdk/ | 2026-11-11 | checked |
| q-mock-otca-052 | O2 SDK Pipelines | scenario | ParentBased uses the root sampler only for root spans. For a sampled remote parent the default is AlwaysOn. | https://opentelemetry.io/docs/specs/otel/trace/sdk/ | 2026-11-11 | checked |
| q-mock-otca-053 | O2 SDK Pipelines | concept | The span is recording but its sampled flag is not set, so processors get it and exporters do not. | https://opentelemetry.io/docs/specs/otel/trace/sdk/ | 2026-11-11 | checked |
| q-mock-otca-054 | O2 SDK Pipelines | concept | If no temporality is configured, the reader uses cumulative temporality. | https://opentelemetry.io/docs/specs/otel/metrics/sdk/ | 2026-11-11 | checked |
| q-mock-otca-055 | O2 SDK Pipelines | scenario | A View can choose which attributes a metric reports and can change its aggregation. | https://opentelemetry.io/docs/specs/otel/metrics/sdk/ | 2026-11-11 | checked |
| q-mock-otca-056 | O2 SDK Pipelines | scenario | It sets the time between two exports of the periodic reader, by default 60000 ms. | https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/ | 2026-11-11 | checked |
| q-mock-otca-057 | O2 Context Propagation | scenario | The third part is the parent ID, the span ID of the caller. | https://opentelemetry.io/docs/concepts/context-propagation/ | 2026-11-11 | checked |
| q-mock-otca-058 | O2 Context Propagation | scenario | A list of propagators works as a composite that reads and writes each format. | https://opentelemetry.io/docs/languages/sdk-configuration/general/ | 2026-11-11 | checked |
| q-mock-otca-059 | O2 Context Propagation | scenario | Extract must not throw and must not store a new value, so any previous valid value stays. | https://opentelemetry.io/docs/specs/otel/context/api-propagators/ | 2026-11-11 | checked |
| q-mock-otca-060 | O2 Context Propagation | scenario | Without a configured propagator nothing is injected. Set a global one, usually W3C Trace Context with baggage. | https://opentelemetry.io/docs/specs/otel/context/api-propagators/ | 2026-11-11 | checked |
| q-mock-otca-061 | O2 Context Propagation | scenario | Instrumentation adds baggage to most outgoing network requests, so anyone who sees the traffic can read it. | https://opentelemetry.io/docs/concepts/signals/baggage/ | 2026-11-11 | checked |
| q-mock-otca-062 | O2 Context Propagation | concept | Write operations create a new Context that contains the original values and the update. | https://opentelemetry.io/docs/specs/otel/context/ | 2026-11-11 | checked |
| q-mock-otca-063 | O2 Agents | scenario | It installs instrumentation libraries for the installed packages, such as the one for Flask. | https://opentelemetry.io/docs/zero-code/python/ | 2026-11-11 | checked |
| q-mock-otca-064 | O2 Agents | scenario | The agent reads system properties first, then environment variables, then the configuration file. | https://opentelemetry.io/docs/zero-code/java/agent/configuration/ | 2026-11-11 | checked |
| q-mock-otca-065 | O2 Agents | scenario | The first turns off all default instrumentation; the second turns JDBC back on. | https://opentelemetry.io/docs/zero-code/java/agent/disable/ | 2026-11-11 | checked |
| q-mock-otca-066 | O2 Agents | scenario | The init container is added when a pod starts. Pods created before the resource are not instrumented. | https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/ | 2026-11-11 | checked |
| q-mock-otca-067 | O2 Agents | concept | It uses the Instrumentation resource with the default name in the pod's namespace. It uses the Instrumentation resource java-instr from the namespace otel. | https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/ | 2026-11-11 | checked |
| q-mock-otca-068 | O2 Agents | scenario | With the opentelemetry-instrumentation-annotations dependency, @WithSpan creates a span for the method. | https://opentelemetry.io/docs/zero-code/java/agent/annotations/ | 2026-11-11 | checked |
| q-mock-otca-069 | O3 Configuration | scenario | Configuring a processor does not enable it. It must be added to a pipeline in the service section. | https://opentelemetry.io/docs/collector/configuration/ | 2026-11-11 | checked |
| q-mock-otca-070 | O3 Configuration | scenario | Identifiers follow the type[/name] format, so one type can be defined more than once with unique names. | https://opentelemetry.io/docs/collector/configuration/ | 2026-11-11 | checked |
| q-mock-otca-071 | O3 Configuration | scenario | In Collector configuration, `$$` stands for one literal dollar sign. | https://opentelemetry.io/docs/collector/configuration/ | 2026-11-11 | checked |
| q-mock-otca-072 | O3 Configuration | scenario | The validate command checks a configuration file. | https://opentelemetry.io/docs/collector/configuration/ | 2026-11-11 | checked |
| q-mock-otca-073 | O3 Configuration | scenario | The defaults are localhost:4317 and localhost:4318. Set an address that other pods can reach, such as the pod IP. | https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md | 2026-11-11 | checked |
| q-mock-otca-074 | O3 Configuration | scenario | An authenticator must be configured, listed in the service extensions so it is loaded, and referenced by the receiver. | https://opentelemetry.io/docs/collector/configuration/ | 2026-11-11 | checked |
| q-mock-otca-075 | O3 Deployment | scenario | Without a Collector, changes to processing need code changes, and the code is tied to the backend. | https://opentelemetry.io/docs/collector/deploy/other/no-collector/ | 2026-11-11 | checked |
| q-mock-otca-076 | O3 Deployment | scenario | The DaemonSet is the preferred pattern for the Filelog receiver, because logs are files on each node. | https://opentelemetry.io/docs/platforms/kubernetes/collector/components/ | 2026-11-11 | checked |
| q-mock-otca-077 | O3 Deployment | scenario | The receiver gathers data for the whole cluster, so one instance is enough; more replicas duplicate the data. | https://opentelemetry.io/docs/platforms/kubernetes/collector/components/ | 2026-11-11 | checked |
| q-mock-otca-078 | O3 Deployment | scenario | The chart docs say that when you change a pipeline, you must list every component in it, including the default ones. | https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/ | 2026-11-11 | checked |
| q-mock-otca-079 | O3 Deployment | scenario | ocb builds a distribution with exactly the components you list, custom ones included. | https://opentelemetry.io/docs/collector/distributions/ | 2026-11-11 | checked |
| q-mock-otca-080 | O3 Deployment | scenario | The docs list a simple start and a clear one-to-one mapping as pros, and limited scalability and flexibility as cons. | https://opentelemetry.io/docs/collector/deploy/agent/ | 2026-11-11 | checked |
| q-mock-otca-081 | O3 Scaling | scenario | A layer 4 balancer may keep a client on one Collector. Use a gRPC-aware layer 7 balancer. | https://opentelemetry.io/docs/collector/scaling/ | 2026-11-11 | checked |
| q-mock-otca-082 | O3 Scaling | scenario | Identical replicas scrape the same endpoints and cause problems such as out-of-order samples. Shard the targets instead. | https://opentelemetry.io/docs/collector/scaling/ | 2026-11-11 | checked |
| q-mock-otca-083 | O3 Scaling | scenario | When the backend cannot keep up, adding Collectors does not help and can make things worse. | https://opentelemetry.io/docs/collector/scaling/ | 2026-11-11 | checked |
| q-mock-otca-084 | O3 Scaling | scenario | The load-balancing exporter sends all spans of a trace to the same Collector, where the tail sampler decides. | https://opentelemetry.io/docs/collector/scaling/ | 2026-11-11 | checked |
| q-mock-otca-085 | O3 Scaling | concept | Watch queue size against capacity, scale up at 60 to 70%, and keep a minimum number of replicas for resilience. | https://opentelemetry.io/docs/collector/scaling/ | 2026-11-11 | checked |
| q-mock-otca-086 | O3 Pipelines | scenario | As the first processor it can push back to the receivers when memory is high, so less data is dropped. | https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md | 2026-11-11 | checked |
| q-mock-otca-087 | O3 Pipelines | scenario | The last processor fans the data out, and each exporter gets a copy of each data element. | https://opentelemetry.io/docs/collector/architecture/ | 2026-11-11 | checked |
| q-mock-otca-088 | O3 Pipelines | scenario | Data goes from the single receiver through a fan-out by synchronous calls, so one blocked pipeline holds up the others. | https://opentelemetry.io/docs/collector/architecture/ | 2026-11-11 | checked |
| q-mock-otca-089 | O3 Pipelines | scenario | The count connector feeds the metrics pipeline. To keep the traces, add a trace exporter to the traces pipeline. | https://opentelemetry.io/docs/collector/configuration/ | 2026-11-11 | checked |
| q-mock-otca-090 | O3 Pipelines | scenario | The default action is move. Matched data goes to the target and is removed from later route evaluation. | https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md | 2026-11-11 | checked |
| q-mock-otca-091 | O3 Pipelines | scenario | When a processor is referenced in several pipelines, each pipeline gets its own instance. | https://opentelemetry.io/docs/collector/configuration/ | 2026-11-11 | checked |
| q-mock-otca-092 | O3 Transforming Data | scenario | The filter drops matching spans, and only spans from other services match this condition. | https://opentelemetry.io/docs/collector/transforming-telemetry/ | 2026-11-11 | checked |
| q-mock-otca-093 | O3 Transforming Data | scenario | In propagate mode the error is returned up the pipeline, and the payload is dropped from the Collector. | https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md | 2026-11-11 | checked |
| q-mock-otca-094 | O3 Transforming Data | scenario | The resource processor has the same style of actions but applies only to resource attributes. | https://opentelemetry.io/docs/collector/transforming-telemetry/ | 2026-11-11 | checked |
| q-mock-otca-095 | O3 Transforming Data | scenario | The guide says the attributes processor works only on the tags of spans, and the span processor handles the span name. | https://opentelemetry.io/docs/collector/troubleshooting/ | 2026-11-11 | checked |
| q-mock-otca-096 | O3 Transforming Data | scenario | Each signal has its own path prefixes. A span path cannot be used in log statements. | https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md | 2026-11-11 | checked |
| q-mock-otca-097 | O3 Transforming Data | scenario | By default the processor matches the connection IP, which is the agent's. A rule on a resource attribute fixes this. | https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md | 2026-11-11 | checked |
| q-mock-otca-098 | O4 Context Propagation | scenario | The tail sampling processor reassembles spans and loses their context, so processors that need it must come first. | https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md | 2026-11-11 | checked |
| q-mock-otca-099 | O4 Context Propagation | scenario | A injects W3C Trace Context and baggage, while B extracts only B3, so B starts a new trace. | https://opentelemetry.io/docs/languages/sdk-configuration/general/ | 2026-11-11 | checked |
| q-mock-otca-100 | O4 Context Propagation | scenario | Propagators inject context into an outgoing carrier, such as a message, and extract it from the incoming one. | https://opentelemetry.io/docs/specs/otel/context/api-propagators/ | 2026-11-11 | checked |
| q-mock-otca-101 | O4 Debugging Pipelines | scenario | With detailed verbosity the debug exporter prints the full content of the data. | https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md | 2026-11-11 | checked |
| q-mock-otca-102 | O4 Debugging Pipelines | scenario | PipelineZ shows the running pipelines with their receivers, processors and exporters. | https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md | 2026-11-11 | checked |
| q-mock-otca-103 | O4 Debugging Pipelines | scenario | Data comes in but cannot be sent. Rising send failures point to the network or the backend. | https://opentelemetry.io/docs/collector/internal-telemetry/ | 2026-11-11 | checked |
| q-mock-otca-104 | O4 Debugging Pipelines | scenario | A null value from a later file replaces the earlier map. Use {} for an empty map, or leave the key out. | https://opentelemetry.io/docs/collector/troubleshooting/ | 2026-11-11 | checked |
| q-mock-otca-105 | O4 Error Handling | scenario | The exporter must not throw when it cannot reach its endpoint; the SDK should log the suppressed error. | https://opentelemetry.io/docs/specs/otel/error-handling/ | 2026-11-11 | checked |
| q-mock-otca-106 | O4 Error Handling | scenario | The client must not retry a request that got 400 Bad Request, and it drops the data. | https://opentelemetry.io/docs/specs/otlp/ | 2026-11-11 | checked |
| q-mock-otca-107 | O4 Error Handling | scenario | The client must not retry a request that got a partial success response. | https://opentelemetry.io/docs/specs/otlp/ | 2026-11-11 | checked |
| q-mock-otca-108 | O4 Error Handling | concept | Receivers are expected to retry refused data. If the preceding component does not, the data is lost. | https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md | 2026-11-11 | checked |
| q-mock-otca-109 | O4 Error Handling | scenario | These failures come from a full queue, so lower the rate or add Collectors. | https://opentelemetry.io/docs/collector/internal-telemetry/ | 2026-11-11 | checked |
| q-mock-otca-110 | O4 Error Handling | scenario | With file_storage the queue is written to disk and read again after a restart. | https://opentelemetry.io/docs/collector/resiliency/ | 2026-11-11 | checked |
| q-mock-otca-111 | O4 Schema Management | scenario | Schema URLs identify a schema version, so a consumer can transform data between versions if needed. | https://opentelemetry.io/docs/specs/otel/schemas/ | 2026-11-11 | checked |
| q-mock-otca-112 | O4 Schema Management | concept | Schemas define transformations between versions, so conventions, sources and consumers can change independently. | https://opentelemetry.io/docs/specs/otel/schemas/ | 2026-11-11 | checked |
| q-mock-otca-113 | O4 Schema Management | scenario | With a migration entry the processor writes both names, which gives time to update queries, dashboards and alerts. | https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/schemaprocessor/README.md | 2026-11-11 | checked |

## Tags

Tags taken from the pilot (taught by module m02): `analysis` 4, `cardinality` 3, `correlation` 2, `instrumentation` 6, `logs` 4, `metrics` 4, `semantic-conventions` 4, `slo` 1, `traces` 4.

Tags made for this pool, with the module that should teach each (step numbers from `lgtm/docs/plan/01-curriculum.md`):

| Tag | Questions | Module that should teach it |
|---|---|---|
| `otel-api-sdk` | 4 | m07 step 2 (API and SDK: why two layers) |
| `otel-resources` | 4 | m07 step 3 (resources and resource attributes) |
| `otel-instrumentation-scope` | 2 | m07 step 4 (instrumentation scope) |
| `otel-spans` | 9 | m07 step 5 (spans: context, kind, status, events, links) |
| `otel-context-propagation` | 10 | m07 steps 6 and 9 (propagation, W3C Trace Context, baggage) |
| `otel-sampling` | 6 | m07 step 10 (samplers) |
| `otel-sdk-pipeline` | 5 | m07 step 11 (span processors and exporters) |
| `otel-metric-instruments` | 4 | m08 step 1 (metric instruments) |
| `otel-metrics-sdk` | 6 | m08 steps 2 and 3 (readers, views, aggregation, temporality, cardinality limits) |
| `otel-logs-api` | 1 | m08 step 5 (logs: the bridge API) |
| `otel-otlp` | 4 | m08 step 7 (OTLP over gRPC and HTTP) |
| `otel-env-config` | 7 | m08 step 8 (configuration by environment variables) |
| `otel-declarative-config` | 2 | m08 step 9 (declarative configuration) |
| `otel-zero-code` | 5 | m08 step 11 (agents), with m07 step 7 |
| `otel-operator` | 2 | m08 step 11 (injection by the Operator) |
| `otel-error-handling` | 3 | m08 step 13 (debugging an SDK), or a new step on the error handling principles and OTLP retries |
| `otel-schemas` | 3 | m09 step 14 (schema management) |
| `collector-config` | 7 | m09 step 2 (configuration anatomy) |
| `collector-pipelines` | 6 | m09 steps 2 and 3 (pipelines, reading the gateway configuration) |
| `collector-processors` | 7 | m09 steps 5 and 7 (processors that matter, Kubernetes attributes) |
| `collector-ottl` | 3 | m09 step 6 (OTTL and the transform processor) |
| `collector-connectors` | 2 | m09 step 8 (connectors) |
| `collector-tail-sampling` | 2 | m09 step 9 (tail sampling and the load-balancing exporter) |
| `collector-deployment` | 4 | m09 steps 1 and 4 (agent and gateway patterns, distributions) |
| `collector-kubernetes` | 4 | m09 step 10 (deployment on Kubernetes) |
| `collector-scaling` | 5 | m09 step 11 (scaling) |
| `collector-reliability` | 6 | m09 step 12 (queues, retries, back-pressure) |
| `collector-debugging` | 6 | m09 step 13 (debug exporter, zPages, internal telemetry) |

That is 28 new tags and 9 pilot tags, 37 in all.
