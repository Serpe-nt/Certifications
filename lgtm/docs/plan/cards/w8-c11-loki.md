# C11: module m12 Loki

Wave 8. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C11.

## Owns

`lgtm/learn/src/content/modules/m12.yaml`, `lgtm/learn/src/content/steps/m12/**`, `lgtm/learn/src/content/questions/m12.yaml`, `lgtm/docs/verification/m12.md`, and `lgtm/docs/adr/c11-content-notes.md` if you have something the next worker should know.

## Read, on top of the template

- Module m02 steps 3 and 10 (logs; cardinality), m06 step 8 (pod logs and events in Loki) and m08 steps 5 and 6 (OpenTelemetry logs, correlated logs) as merged. In those steps LogQL was a tool handed to the learner; this module teaches it.
- `lgtm/lab/helm/loki/values.yaml` and `lgtm/lab/docs/lgtm.md` (the release `loki`): Loki 3.7 in microservices mode (`deploymentMode: Distributed`) with three ingesters, the TSDB index with schema v13, structured metadata, OTLP ingest, 48 hours of retention applied by the compactor, chunks in the bucket `loki-chunks`. Two senders: Alloy (pod log files and Kubernetes events) and the collector gateway (the shop's OTLP logs), both as tenant `lab`.
- `lgtm/docs/adr/l5b-rustfs-memory.md`: on 2026-11-12 one heavy log query (a regex filter over 90 minutes of a very chatty namespace) pushed the lab's object store over its memory limit. It is a true story for step 15, with numbers. The object store has been upgraded since and holds its memory; the lesson of the story stands.
- `lgtm/docs/research/01-stack-versions.md`, the part on Loki 3 and 4 (the simple scalable mode is being removed; Promtail is gone). Check each point against grafana.com/docs/loki for the version the lab runs.
- grafana.com/docs/loki for that version: the overview, labels and structured metadata, sending data (Alloy, OTLP and what becomes a label), LogQL (log queries, metric queries, parsers, formatting), the architecture and components, deployment modes, storage (TSDB, schema), retention and deletion, the ruler, query performance and the limits that bound a query, Logs Drilldown and patterns.

## The learner at this point

They have done m00 to m11. They have pasted LogQL queries since module m01 and know from m02 that labels cost. Now they learn to write LogQL fluently and to avoid the label mistakes that sink a Loki.

## The module, 15 steps

It serves jobs; no exam maps to it (`cert: none`).

- Steps 1 to 3 are the idea and its consequences: index the labels, not the text; streams, labels and structured metadata; what becomes a label on each of the lab's two ways in. The learner looks at one log line that came through Alloy and one that came through OTLP and reads which of its fields are labels.
- Steps 4 to 7 are LogQL, built in the order a person learns it: a stream selector and a line filter, then parsers, then label filters and formatting, then metric queries. Every step is a drill on the lab's real logs. Teach the order of a query for speed as well as for meaning: the selector first, cheap line filters before a parser.
- Tokens fit these steps. The beacon writes one JSON log line a minute per slot, with the slot in structured metadata and the token in the body: a step can make the learner reach it with exactly the skill it teaches (a metadata filter, a parser, a line format). Slots `log-m12-1` to `-9`, each used once.
- Steps 8 and 9, the architecture and the deployment modes: every component named is a pod the learner can see. Say what happened to the simple scalable mode only as a grafana.com page states it today.
- Steps 10 and 11, storage and retention: the TSDB index, schema v13, chunks; how the compactor applies the lab's 48 hours; deletion.
- Step 12 is the lab on label cardinality. The learner sends a small burst of logs with a label that has a new value on every line, as a practice tenant, and sees the stream count and the rejection once the stream limit is reached. Never as tenant `lab`.
- Step 13, rules and alerts on logs: the learner loads one rule for the practice tenant and removes it. Step 14, Logs Drilldown and patterns: check on the lab whether patterns are available before you write about them (module m05 found that the lab's Loki runs without the pattern ingester).
- Step 15, a slow query and why. Use the story of 2026-11-12. The learner compares two queries for the same answer through the query statistics, on a short time range, and reads the limits that would have stopped the bad one. The lab's Loki runs with default query limits: say in your pull request which limits the lab should set, with numbers; do not change the lab.

Tags: the thirteen that `04-tags.md` gives m12.

## The lab in this wave

- Keep every query of your own to a short time range and a narrow selector, in the lesson and while you work. The step about a slow query shows the slow one on a small range.
- A module's practice workloads may request up to 4 GiB in all, at most 1.5 GiB on one worker (`lgtm/lab/docs/budget.md`). Yours are small: a pod that writes log lines.
- Practice data goes to a tenant of its own, `learn-m12`, never to `lab`. Check in the lab's values that the gateway accepts it.
- You create things only in `learn-m12` and delete the namespace at the end; the rule of step 13 is removed in its own step. The release `loki` is read, never changed.
- Your session will refuse to change the shared cluster until the owner says so in it. In your first message ask once for all you need, then start with what needs none of it: a go-ahead to create and delete `learn-m12` and to write to the practice tenant; a Grafana sign-in in your session's browser pane (never type a password, never read the admin password from the cluster); the lab seed in the site's settings, or their word that you may read it, for the token checks.

## Yours

- Namespace and tenant: `learn-m12`. Site port: 8100. Local port-forwards: 18120 to 18129.
- Token slots: `log-m12-1` to `-9`.

## Done when, on top of the template

- [ ] The 15 steps exist (or the pull request explains each split, merge or drop), at least eight of them with Practice.
- [ ] Every query in the module was run on the live lab on a short time range and returned what the text says; `learn-m12` is gone and the practice rule is gone.
- [ ] The pool has at least 30 questions, at least half of them showing a LogQL query and asking what it returns, what is wrong with it, or which of two is cheaper.
- [ ] The pull request names the query limits the lab should set, with numbers and the page for each.
