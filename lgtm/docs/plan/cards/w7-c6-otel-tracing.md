# C6: module m07 OpenTelemetry: the model and tracing

Wave 7. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C6.

## Owns

`lgtm/learn/src/content/modules/m07.yaml`, `lgtm/learn/src/content/steps/m07/**`, `lgtm/learn/src/content/questions/m07.yaml`, `lgtm/docs/verification/m07.md`.

## Read, on top of the template

- Module m02 as merged, above all s04 (traces and spans), s11 (semantic conventions) and s12 (instrumentation): m07 goes deeper and must not repeat them.
- `lgtm/lab/docs/workshop.md` and `lgtm/lab/workshop/`: the small Python service the learner instruments. `solutions/01-zero-code`, `02-manual-spans` and `03-propagation` are the finished states of steps 7, 8 and 9. Read the code and the `workshop.env` of each.
- `lgtm/lab/docs/lgtm.md` and `reference.md`: where the workshop's OTLP goes (the collector gateway), and how a trace is found in Tempo.
- `lgtm/learn/src/content/questions/mock-otca.yaml`, the questions of domain O2 with the tags `04-tags.md` gives m07, and `lgtm/docs/verification/mock-otca.md`: do not repeat them.
- opentelemetry.io: what OpenTelemetry is, the concepts pages (signals, traces, context propagation, baggage, resources, instrumentation scope, sampling, semantic conventions), the specification overview and its status page, the SDK configuration pages, and the Python instrumentation pages for the lab steps. `lgtm/docs/research/02-certs-and-demand.md`, part A, for the OTCA competency names.

## The learner at this point

They have done m00 to m06. From m02 they know what a span and a trace are and have followed one request through three signals. They have never instrumented anything. OpenTelemetry's API and SDK are 46% of the OTCA exam, and m07 with m08 carries that domain.

## The module, 12 steps

Mapped to OTCA domain O2 (The OpenTelemetry API and SDK), with O1 where a step is about the model itself. Use the competency names exactly.

- Step 1 says what OpenTelemetry is by its parts: specification, API, SDK, OTLP, Collector, instrumentation libraries, semantic conventions. One short article; `<Layers>` fits. Words about status come from the status page, per signal and per part.
- Step 2 (API and SDK: why two layers) is the idea candidates most often get wrong: a library depends on the API only, the application chooses the SDK, and the API without an SDK does nothing. Build it on that reason.
- Steps 3 to 6 are the data model: resources, instrumentation scope, spans (context, kind, status, events, links), propagation with W3C Trace Context and Baggage. Each one shows the object on a real span from the lab: the learner finds a shop trace in Tempo and reads the field the step is about.
- Steps 7, 8 and 9 are the labs on the workshop service, which runs on the PC and sends OTLP to the lab: zero-code first, then manual spans and attributes, then propagation to the shop and through Kafka. The learner applies each change to the starting service and compares with the solution folder; give the changed lines in full. After each lab the learner finds their own trace in Tempo and reads what the step added.
- Step 10 (samplers) and step 11 (span processors and exporters) are where the SDK's pipeline is taught: `<Flow>` from the tracer to the exporter. Head sampling only; tail sampling belongs to m09.
- Step 12 comes back to semantic conventions with the HTTP, database and messaging attributes the learner has now seen on their own spans. Name a convention's stability only as its page states it today.

Tags: the seven that `04-tags.md` gives m07, plus `otel-overview` (step 1), `otel-zero-code` (step 7) and `semantic-conventions` (step 12).

## The lab in this wave

- The workshop service listens on port 8000 by default and C7 runs it too. Use the port your card gives you while you test, and write the lesson for the default.
- Evidence that a trace arrived can be read from Tempo's API through the lab gateway, without Grafana. The Grafana actions of a step (Explore, the trace view) need the owner's sign-in in your session's browser pane: never type a password and never read the admin password from the cluster. If Grafana shows its sign-in page, say so in your session, go on, and log what you could not do as `lab-unverified`.
- You change nothing on the cluster. The workshop service runs on the PC.
- The workers are close to their memory limit (worker1 at 87% in use). Create nothing in the cluster for this module.

## Yours

- Workshop port while testing: 8001. Site port: 8097. Local port-forwards: 18100 to 18109.
- Token slots, if a step needs one: `span-m07-1` to `-9` (and `log-`, `metric-` likewise). A span token fits step 5 or 6: the learner reaches `beacon.token` on the right span with what the step taught.

## Done when, on top of the template

- [ ] The 12 steps exist (or the pull request explains each split, merge or drop), at least six of them with Practice.
- [ ] Steps 7, 8 and 9 were done on the workshop service from its starting state, and for each the trace was found in the lab's Tempo; the log has the trace's decisive fields.
- [ ] The pool covers every competency of O2 that the module teaches, with no question that repeats a mock question.
