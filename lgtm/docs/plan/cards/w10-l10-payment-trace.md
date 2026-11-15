# L10: an order's trace no longer grows for days

Beside wave 10. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

Card L9 found why Tempo's querier was killed for memory on 2026-11-14: one trace of the shop keeps growing for as long as payment's pod lives, and opening it by its ID makes the querier read every block Tempo holds. A learner of modules m13 and m14 searches for payment's errors, sees that trace in the list, and can open it. This card stops the trace from growing and tells the lessons what a quiet shop really shows.

## Owns

`lgtm/lab/demo/**` (payment's source, `VERSION`, the chart, `TRIMMING.md`), `lgtm/lab/helm/shop/**`, `lgtm/lab/helm/otel-gateway/**` if the answer is there, the lab's tests, `lgtm/lab/docs/**` where the shop or this trace is described, and `lgtm/docs/adr/l10-*.md`. In the lessons: only the steps of m13, m14 and m15 that your search shows to state something this card changes, each with its log. Not the plan, no other lesson, no other release.

## Read first

- The text of pull request 98 (`gh pr view 98 --repo Serpe-nt/Certifications`), sections "Tempo's querier" and "For the lessons of m13 to m15", and `lgtm/docs/adr/l9-flag-cache.md`.
- `lgtm/lab/docs/runbook.md`, "Tempo's querier is killed for memory" and "Upgrade or change one release".
- `lgtm/lab/demo/src/payment/charge.js` and `index.js`; `lgtm/lab/demo/TRIMMING.md` (every change to the demo's source is listed there, with the reason); `.github/workflows/lgtm-demo.yml` (a push to `main` that changes the demo builds and publishes the images under the tag in `lgtm/lab/demo/VERSION`).
- `lgtm/lab/helm/otel-gateway/values.yaml`: the gateway's processors.
- The documentation of the OpenFeature SDK and the flagd provider for Node.js, for the versions the demo pins, and of OpenTelemetry's gRPC instrumentation for Node.js: where a provider should be started, and what a long-lived stream looks like as a span. Fetch them on the day.

## What is known

Check each point yourself before you build on it.

- `charge.js` calls `OpenFeature.setProviderAndWait` inside the first `charge` span after the pod starts. Every event stream the provider opens to flagd, a new one about every ten minutes, becomes a span of that first order's trace. After a day the trace has several hundred spans, some in every block.
- At 18:26:26 UTC on 2026-11-14 a lookup of that trace by its ID killed the querier twice (limit 768Mi). A search for payment's errors had listed it six seconds before, with `<root span not yet received>`.
- Each stream ends with gRPC status 4 after 600 seconds, and that span carries an error status. The same span exists in ad, fraud-detection and recommendation, and on flagd's side. So a shop with every flag off shows about one error span per service every ten minutes; read on 2026-11-15, the rate was the same before and after card L9.
- Payment's pod was restarted by card L9 at 23:03 UTC on 2026-11-14, so a new trace of this kind began then.

## What to build

1. **The trace stops growing.** Choose the smallest answer that holds and say why in an ADR: start payment's provider outside a request, as the SDK's documentation asks, which is a change of the demo's source and new images; or drop the event-stream spans in the collector gateway; or both. Whatever you choose, after it an order's trace has only that order's spans, and no trace of the shop grows for longer than the request it belongs to.
2. **The error spans of a quiet shop.** Decide what the lab should show with every flag off: no error span at all, or the event-stream spans as they are. If they stay, they stay on purpose, and `lgtm/lab/docs/demo.md` says which services show them and how often. Look at the other services with the same eye; a service that needs the same change as payment gets it.
3. **Proof on the lab, with the owner.** After the upgrade: place of the old trace, a new order's trace with only its own spans; thirty minutes later, still the same; a search for payment's errors on a quiet shop returns what you decided in point 2; one trace-by-ID lookup of a normal order answers in well under a second, and the querier's memory does not move. Do not open the old giant trace to see what happens. Write the record into `lgtm/lab/docs/acceptance-lab.md`.
4. **The runbook** keeps its section, corrected for what is now true: how to recognise such a trace if one appears again, and what to do.
5. **The lessons.** Search m13, m14 and m15 for a statement this card makes untrue or incomplete: a step that says a quiet shop has no errors, a search for a service's errors that would list an event-stream span, a waiting time for a flag that card L9 made shorter than the text says (a flag now reaches a service within about 15 seconds), the practice trap of m13 step 12 (it may stay as the fallback the runbook gives). Change only what is wrong, keep ids and frontmatter, log each change, and name the search you ran in the pull request.

## On the lab, with the owner

Your session will refuse to change the shared cluster until the owner says so in it. Card C16 runs failure drills in this wave and tells the other cards before each: do not apply your change inside one of its windows, and tell C16 (session `lgtm-c16`) and C15 (`lgtm-c15`) before the shop restarts and when it is back.

1. Make the changes in the files first, with `make lab-lint` passing. If the demo's source changes, the images are built by the workflow only after a merge to `main`: open the pull request, tell the planner that the lab step waits for the merge, and do the lab step afterwards from `main` in a follow-up pull request for the record. If only the gateway changes, apply it from your branch with the owner's go-ahead and put the record into the same pull request.
2. Ask the owner once for the go-ahead: which release restarts and for how long.
3. `make lab-check` passes at the end and `make lab` reports `changed=0`.

## Limits

- No change to `~/.kube/config`, Windows or WSL settings, `/etc/hosts`, the saa-plan app. No VM is touched.
- No fault flag: the proof needs none.
- No kind cluster. No sub-agents, except one read-only agent to check the changed lesson steps.
- Never print the lab seed, Grafana's password, a certificate, a key or a token.
- Host ports, all on 127.0.0.1: 8106 for the site, port-forwards 18160 to 18169.

## Done when

- [ ] An ADR `l10-*.md` gives the cause, the options, the choice and the sources; `TRIMMING.md` lists any change to the demo's source.
- [ ] On the running lab an order's trace holds only its own spans, thirty minutes after the upgrade as well; the record is in `acceptance-lab.md`.
- [ ] `demo.md` says what error spans a quiet shop shows, and the lab shows exactly that.
- [ ] The runbook's section is true for the lab as it now is.
- [ ] The lessons of m13 to m15 say nothing this card made untrue; the pull request lists each changed sentence and the search that found it; the site's checks pass.
- [ ] `make lint` and `make lab-lint` pass; `make lab-check` passes; `make lab` reports `changed=0`.

## Report

The pull request link or links; what you chose and why; what a quiet shop now shows; which lesson sentences changed; anything the owner should know before the capstone module is written.
