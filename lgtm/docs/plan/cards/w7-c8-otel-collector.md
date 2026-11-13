# C8: module m09 OpenTelemetry Collector

Wave 7. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C8.

## Owns

`lgtm/learn/src/content/modules/m09.yaml`, `lgtm/learn/src/content/steps/m09/**`, `lgtm/learn/src/content/questions/m09.yaml`, `lgtm/docs/verification/m09.md`.

## Read, on top of the template

- `lgtm/lab/helm/otel-gateway/values.yaml` and `lgtm/lab/docs/lgtm.md` (the release `otel-gateway`): the lab's Collector is a gateway, a Deployment of two replicas of the contrib distribution, with receivers for OTLP and for scraping, the memory limiter, resource and transform processors, a redaction processor, and exporters to Mimir, Loki and Tempo. It is the module's main exhibit. Note the 3.x component names (`otlp_http`, `otlp_grpc`, `span_metrics`).
- `lgtm/docs/plan/02-lab-contract.md` and `lgtm/lab/docs/reference.md` for the flag `emitRawPii` and what it makes the shop send.
- `lgtm/learn/src/content/questions/mock-otca.yaml`, the questions of domains O3 and O4, and `lgtm/docs/verification/mock-otca.md`: do not repeat them.
- opentelemetry.io: the Collector pages (architecture, configuration, deployment patterns, distributions and the builder, scaling, resiliency, internal telemetry, troubleshooting, the transform processor and OTTL, connectors, tail sampling and the load-balancing exporter, the Kubernetes pages with the Operator and the Helm chart, schemas, OpAMP), and the component READMEs in the opentelemetry-collector and opentelemetry-collector-contrib repositories at the version the lab runs.

## The learner at this point

They have done m00 to m08: they have sent traces, metrics and logs from the workshop service through this gateway without looking inside it. The Collector is 26% of the OTCA exam and debugging pipelines another 10%; in jobs it is the part of OpenTelemetry an operations person owns.

## The module, 15 steps

Mapped to OTCA domains O3 (The OpenTelemetry Collector) and O4 (Maintaining and Debugging Observability Pipelines). Use the competency names exactly.

- Step 1 is why a collector at all, and the agent and gateway patterns: what the SDK should not have to do. `<Compare>` fits.
- Step 2 is the anatomy of the configuration; step 3 reads the lab gateway's real configuration, pipeline by pipeline: which receiver feeds which processors in which order, and why that order.
- Practice needs a Collector the learner may break. The lab's gateway is shared and installed by `make lab`: the lesson does not edit it, and neither do you. Design one small practice Collector that the learner runs in the namespace `learn-m09` (a ConfigMap and a Deployment of the same contrib image the lab pins, requests of at most 50m CPU and 96Mi), fed by a generator of your choice or by the workshop service, and exporting to the debug exporter and, where a step needs it, on to the lab gateway. Steps 5, 6, 8, 12 and 13 can all use it. Give every file in full.
- Step 6, OTTL and the transform processor: the learner writes a statement that redacts a field in the practice Collector. Then they read how the lab gateway already redacts, switch the flag `emitRawPii` on, and see that the raw value does not reach Loki or Tempo. The flag is on for at most 15 minutes when you run it; switch it off, check that all flags are off, and write the times (UTC) into your pull request.
- Step 9, tail sampling and the load-balancing exporter: a concept step with a configuration to read. Do not run a second tier of collectors in the lab; say why two tiers are needed.
- Step 10, deployment on Kubernetes: daemonset, deployment, sidecar, the Operator. The lab has the Helm chart and no Operator; write what each shape is for and what the lab chose.
- Steps 11 and 12, scaling and reliability: stateless against stateful components, queues, retries, back-pressure, the memory limiter first in the chain. The lab gateway's own metrics show most of it; read them from Prometheus.
- Step 13 is the debugging lab: the debug exporter, zPages if the lab's image has the extension, the Collector's internal telemetry. Break the practice Collector in two or three typical ways and find each.
- Steps 14 and 15 (schema URLs; OpAMP) are short concept steps. Name a status only as its page states it today.

Tags: the twelve that `04-tags.md` gives m09, plus `collector-opamp` (step 15).

## The lab in this wave

- You create things only in `learn-m09` and delete the namespace at the end. The workers are close to their memory limit (worker1 at 87% in use): one practice Collector pod at a time, with the sizes above.
- You do not change, restart or reinstall the release `otel-gateway` or anything else of the lab. If creating your practice resources is refused in your session as a change to a shared cluster, stop, say so in your session, and wait for the owner; do not look for another way.
- The Grafana actions of a step need the owner's sign-in in your session's browser pane: never type a password and never read the admin password from the cluster. Evidence can be read from the Collector's logs and from Loki's, Tempo's and Prometheus's APIs.
- The fault flag `emitRawPii`, for step 6 only, under the rule above. The other two content sessions use the shop's data.

## Yours

- Namespace on the lab: `learn-m09`. Fault flag: `emitRawPii`.
- Site port: 8100. Local port-forwards: 18120 to 18129.
- Token slots, if a step needs one: `log-m09-1` to `-9`, `span-m09-2` to `-9` (`span-m09-1` is used by the lab's own test vectors; leave it).

## Done when, on top of the template

- [ ] The 15 steps exist (or the pull request explains each split, merge or drop), at least six of them with Practice.
- [ ] Every lab action was run on the live lab; `learn-m09` is gone; all flags are off, with the times `emitRawPii` was on.
- [ ] The pool covers every competency of O3 and O4, with no question that repeats a mock question; at least half show a piece of configuration or a symptom and ask what happens or what to change.
