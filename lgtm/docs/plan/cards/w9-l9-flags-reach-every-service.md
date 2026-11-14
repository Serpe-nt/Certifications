# L9: a fault flag reaches every service

After wave 9. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

Modules m13, m14 and m15 have the learner switch fault flags on. On 2026-11-14 one of those switches did nothing: the shop's product-catalog went on serving an old copy of the flags until it was restarted. A learner who meets that follows a lesson whose fault never comes. This card makes a flag change reach every service of the shop, and clears two smaller things wave 9 found.

## Owns

`lgtm/lab/demo/**` (the chart, the services' settings, `TRIMMING.md`), `lgtm/lab/helm/shop/**`, the lab's tests under `lgtm/lab/tests/**`, `lgtm/lab/docs/**` where the shop, the flags or the Tempo querier are described, and `lgtm/docs/adr/l9-*.md`. Not the plan, no lesson, no other release.

## Read first

- `lgtm/docs/plan/05-open-items.md`, "Lab defects" and "To watch".
- The text of pull request 93 (`gh pr view 93 --repo Serpe-nt/Certifications`), section "What differs from the card": what card C12 saw, with the evidence in `lgtm/docs/verification/m13.md` (flagd's counters, the times). The text of pull request 94, "For the planner to check by hand": what card C13 saw for checkout.
- `lgtm/lab/demo/TRIMMING.md`: the table of fault flags and the notes below it. Note 4 is the same fault in another service: the Python provider of recommendation kept a changed flag for minutes, and that service has run with `FLAGD_CACHE=disabled` since.
- `lgtm/lab/demo/chart/` and the source of every service that reads flags (`lgtm/lab/demo/src/*`): which OpenFeature provider each one uses, with which resolver and which cache.
- The documentation of flagd and of the flagd providers for the languages the shop uses, for the versions the demo pins: the resolver types, the cache, what a provider does when its event stream to flagd breaks, and the environment variables that set them. Fetch them on the day.
- `lgtm/lab/docs/runbook.md`, "Upgrade or change one release".

## What happened, as the planner read it

Check each point yourself before you build on it.

- At 18:40 UTC on 2026-11-14 card C12 switched `productCatalogLockContention` on. flagd evaluated it as on; product-catalog did not act on it. After `kubectl -n shop rollout restart deploy/product-catalog` at 19:03 UTC, which the owner allowed, the flag worked at once.
- The pod was about 30 hours old. In those hours the VMs were paused for about 14 hours overnight, and calico-node was restarted on every node at 17:37 UTC and again from 18:07 to 18:15 UTC for the Calico upgrade. A provider that caches flag values and learns of changes over a stream from flagd would keep stale values if that stream broke and was not built again. That is a guess that fits; find out.
- Checkout, also written in Go, took five flag changes without a restart between 19:19 and 19:51 UTC.

## What to build

1. **Every service sees a flag change within a few seconds**, also after its connection to flagd was interrupted and after the VMs were paused. For each service that reads flags, say which provider, resolver and cache it runs with, and choose the smallest change that makes it so: the cache off, another resolver, or a provider setting. Put it into the chart, raise the chart's version, and write the reasons into an ADR.
2. **Proof on the lab, with the owner.** After `make lab TAGS=shop`: break the connection on purpose in the mildest way that reproduces the fault (restarting the flagd pod is one; say what you chose and why), then switch one flag per service that reads flags and see its effect within the time you promise, without restarting the service. Use the mildest flag each service has and keep every flag on for at most two minutes; `lgtm/lab/demo/TRIMMING.md` says what each one breaks. Write the times into `lgtm/lab/docs/acceptance-lab.md`.
3. **A check, if one can be had without a fault.** `make lab-check` must not switch a flag. If a provider or flagd exposes a state that shows a service is no longer listening, check that; if nothing does, say so and put the symptom and the one command into `runbook.md` instead.
4. **Two smaller things.**
   - `lgtm/lab/docs/lgtm.md` calls the derived field of the Loki data source `TraceID`; the values and module m14 say `trace_id`. Correct the document.
   - Tempo's querier was killed for memory twice at 18:26:32 UTC on 2026-11-14 (limit 768Mi), with a failed liveness probe on the query frontend at the same time. Nobody knows what ran. Find it in the logs of the query frontend and the querier for 18:15 to 18:27 UTC, which Loki holds for 48 hours, and say whether the limit, a Tempo setting or nothing should change. Change a value only if the cause is clear; otherwise report.

## On the lab, with the owner

Your session will refuse to change the shared cluster until the owner says so in it.

1. Make the changes in the files first, with `make lab-lint` passing, and open the pull request with the command list at its top: each command, how long it takes, what restarts, what to check afterwards.
2. Ask the owner once for the go-ahead for all of it: the upgrade of the shop release (its pods restart one after another), one restart of the flagd pod, and each flag you will switch, by name, for at most two minutes each and one at a time.
3. Before each switch read the flag screen's API: every flag is off. After each, read it again: off. No flag is left on when your turn ends or when you wait for an answer.
4. `make lab-check` passes at the end and `make lab` reports `changed=0`.

## Limits

- No change to `~/.kube/config`, Windows or WSL settings, `/etc/hosts`, the saa-plan app. No VM is touched.
- No release besides the shop. Nothing in Calico.
- No kind cluster. No sub-agents.
- Never print the lab seed, Grafana's password, a certificate, a key or a token.
- Host ports, all on 127.0.0.1: 8104 for the site if you need it, port-forwards 18150 to 18159.

## Done when

- [ ] Each service that reads flags is listed with its provider, resolver and cache, before and after; the chart carries the change; an ADR `l9-*.md` gives the cause as far as it was found, the options and the sources.
- [ ] On the running lab, after an interrupted connection, one flag per service took effect within the promised time with no service restarted; the times are in `acceptance-lab.md`; every flag is off.
- [ ] `make lab-check` has the check, or `runbook.md` has the symptom and the command, and the pull request says why.
- [ ] `lgtm.md` names the derived field as the values do.
- [ ] The pull request says what killed the Tempo querier, or that the logs do not show it, and what follows.
- [ ] `make lint`, `make lab-lint` pass; `make lab-check` passes; `make lab` reports `changed=0`.

## Report

The pull request link; why product-catalog kept old flags; what changed for each service; how long a flag now takes to reach a service; what you found about the Tempo querier; anything a lesson of m13 to m15 should say differently now.
