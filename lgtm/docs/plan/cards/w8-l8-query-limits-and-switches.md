# L8: Loki's query limits, Mimir's cardinality API, exemplars in Prometheus

After wave 8. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

Wave 8 left three small lab changes for the owner to decide, each of which makes one lesson show the tool people use at work. The owner said yes to all three on 2026-11-14. This card makes them, applies them to the running lab with the owner, and brings the three lesson steps into line.

## Owns

- The lab: `lgtm/lab/helm/loki/**`, `lgtm/lab/helm/mimir/**`, `lgtm/lab/helm/kube-prometheus-stack/**`, the lab's tests for those releases under `lgtm/lab/tests/**`, and `lgtm/lab/docs/**` where a changed value is described (`lgtm.md`, `reference.md`, `runbook.md`, `acceptance-lab.md`, `budget.md`).
- `lgtm/docs/adr/l8-*.md`.
- Three steps and what depends on them: `lgtm/learn/src/content/steps/m12/s15-slow-query.mdx`, `m11/s09-*.mdx` (cardinality), `m11/s12-*.mdx` (exemplars and native histograms); in `questions/m11.yaml` and `questions/m12.yaml` only a question that states the old lab fact; the logs `lgtm/docs/verification/m11.md` and `m12.md`.

Not the plan, no other lesson, no other release. Card L7 (`w8-l7-pods-start-after-sleep.md`) may run at the same time: it owns Calico, the `make` targets, `cluster.md` and module m00; if you both need `reference.md` or `runbook.md`, keep your change to the lines of your releases.

## Read first

- `lgtm/docs/plan/05-open-items.md`: "Decisions not taken yet" and "To watch".
- The text of pull request 81 (`gh pr view 81 --repo Serpe-nt/Certifications`), section "Loki query limits for the lab": card C11's proposal with the reason for each value. The text of pull request 82, sections "What differs from the card" and "What the lab or the site should change": card C10 on the cardinality API and on exemplars.
- `lgtm/lab/docs/runbook.md`, "Upgrade or change one release"; `lgtm/lab/docs/lgtm.md`; `lgtm/docs/adr/l5b-rustfs-memory.md` (the query of 2026-11-12).
- The three steps you will touch and their rows in the logs; `lgtm/docs/plan/03-content-contract.md`, also "things the first modules ran into".
- The configuration reference of Loki and of Mimir for the versions the lab pins, and the kube-prometheus-stack chart's values for its version. Fetch them on the day.

## The three changes

1. **Loki's query limits.** Today a query may read any amount; `/config` shows `max_query_bytes_read: 0B`. Card C11 proposes, under `loki.limits_config`: `max_query_bytes_read` 500MB, `max_querier_bytes_read` 150MB, `tsdb_max_query_parallelism` 16, `max_query_parallelism` 8, `max_query_length` 49h, `query_timeout` 1m, and optionally `querier.max_concurrent` 2. Take it as the starting point, check every key, default and unit against the reference, and decide each value; say in the ADR what you changed from the proposal and why.
   - Before you apply: look for what the limits would break. Every Loki query of the course (the steps of m02, m06, m08, m10 and m12, the lab's Grafana dashboards, the rules of `lab-glue`, Logs Drilldown at its default range) must still pass. Read them; do not run them all.
   - After you apply: show the limit at work with one query that is refused, and say how Loki refuses it (the status, the message, and whether it read anything first). Choose a query that the limit stops before it runs. Do not run the query of 2026-11-12 to see what happens.
   - Module m12 step 15 teaches these limits and says that the first is off on this lab; its check asks for the limit "which is 0 (off) on this lab". Make the step true again: the sentences that state the lab's values, the action that reads `/config`, the check's prompt, and one new action in which the learner meets the refusal. The check's answer `max_query_bytes_read` may stay if the new prompt still leads to it. Keep the step id and the frontmatter ids.
2. **Mimir's cardinality API for tenant `lab`.** `cardinality_analysis_enabled: true` in the runtime overrides of tenant `lab` (`runtimeConfig.overrides.lab` in the Mimir values). Check on the day whether anything else must be set and whether the overrides reload without a restart. Then module m11 step 9 uses the API as its first tool (label names, label values, and active series if the version has it) and keeps the PromQL way as the second; its check may stay.
3. **Exemplars in the lab's Prometheus.** The Prometheus release sends exemplars on (`sendExemplars: true`) but stores none, because the feature `exemplar-storage` is off. Before you switch it on, find out whether it would give anything: an exemplar reaches Prometheus only from a target that exposes one. Ask two or three of the lab's scrape targets for OpenMetrics text and look. If no target of the lab exposes exemplars, do not switch the feature on; say so in the pull request with what you saw, leave module m11 step 12 as it is, and stop there for this point. If some do, switch it on, show an exemplar in tenant `prom`, and add to step 12 what the learner can now see.

One more thing, to look at and report only: Mimir discards samples of tenant `prom`, about 30,000 per ingester since the rebuild with the reason `new-value-for-timestamp` and about 130 as `sample-out-of-order` (`cortex_discarded_samples_total` on the ingesters). Find which series and why. Fix it only if it is one value in a release you own; otherwise write what you found.

## On the lab, with the owner

Your session will refuse to change the shared cluster until the owner says so in it.

1. Make the changes in the files first, with `make lab-lint` passing, and open the pull request with the command list at its top: each `make lab TAGS=<tag>` in order, how long it takes, what restarts, what to check afterwards.
2. Ask the owner once for the go-ahead for all of it. Say what restarts: a change of Loki's limits rolls Loki's pods one at a time; the Mimir overrides may need no restart at all; a Prometheus feature restarts the one Prometheus pod, which leaves a gap of about a minute in the cluster's own metrics.
3. Apply one release at a time and run `make lab-check` after each. Then `make lab` once more must report `changed=0`.
4. Record in `acceptance-lab.md`: the limits as `/config` shows them, the refused query, the cardinality API's answer for tenant `lab`, and the exemplar or the reason there is none.
5. Run the changed actions of the three steps as a learner, from the built page, and log them. `npm run check:content`, `npm run build` (it ends with `check:pages`) and `npm run check:links` pass.

## Limits

- No change to `~/.kube/config`, Windows or WSL settings, `/etc/hosts`, the saa-plan app. No VM is touched.
- No other release, and nothing in Calico or the `make` targets (card L7).
- Loki queries of your own stay on short time ranges and narrow selectors.
- No kind cluster. No sub-agents, except one read-only agent for an independent check of the three changed steps.
- Never print the lab seed, Grafana's password, a certificate, a key or a token.
- Host ports, all on 127.0.0.1: 8103 for the site, port-forwards 18140 to 18149.

## Done when

- [ ] The three changes are in the lab's files, or the pull request says why one was not made; `make lab-lint` passes; an ADR `l8-*.md` gives the values chosen, what differs from card C11's proposal, and the sources.
- [ ] The running lab carries them: `/config` shows the limits, one query is refused and the record says how, the cardinality API answers for tenant `lab`, `make lab-check` passes and `make lab` reports `changed=0`.
- [ ] Module m12 step 15, module m11 step 9 and, if the feature went on, step 12 say what the lab now does; their changed actions were run from the built page; the logs have a dated section; no other lesson states an old value (name the search you ran).
- [ ] The site's checks pass.
- [ ] The pull request says what you found about the discarded samples of tenant `prom`.

## Report

The pull request link; the limits the lab now runs with; how Loki refuses a query that is too wide; whether tenant `prom` has exemplars and why; what you found about the discarded samples; anything the owner should know before the next module is written.
