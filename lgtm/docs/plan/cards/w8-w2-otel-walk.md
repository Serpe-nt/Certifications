# W2: walk the unverified actions of modules m07, m08 and m09

Before wave 8, after card L6 has rebuilt the lab. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker. Runs beside W1, which corrects modules m00 to m06; you share no file with it.

## Why

Wave 7 was written at night, with nobody to sign in to Grafana and without permission to create anything in the cluster. The facts were checked and the data was read through the APIs, but a number of lesson actions were never done the way a learner does them. They are marked `lab-unverified` in the logs. This card does them, on the rebuilt lab, with the owner present.

## Owns

For modules m07, m08 and m09 only: `lgtm/learn/src/content/steps/<module>/**`, `lgtm/learn/src/content/questions/<module>.yaml`, `lgtm/docs/verification/<module>.md`. Change a step only where the walk shows it wrong or unclear.

## Read first

- `lgtm/docs/plan/03-content-contract.md`, `02-lab-contract.md` (version 3), `05-open-items.md` (the section on what the walk needs).
- The three verification logs, every row marked `lab-unverified` or `inference`, and `lgtm/docs/adr/c6-content-notes.md`, `c7-content-notes.md`, `c8-content-notes.md`.
- `lgtm/lab/docs/workshop.md` (its `run.py` now stops on Ctrl+C on Windows), `reference.md`, and the newest section of `acceptance-lab.md`.

## What you need from the owner, asked once at the start

Say all three in your first message in the session, then start with what needs none of them.

1. **A Grafana sign-in** in your session's browser pane. Never type a password and never read the admin password from the cluster.
2. **A go-ahead to change the cluster** for module m09 only: create and delete the namespace `learn-m09` with one practice Collector pod (requests of 50m CPU and 96Mi in all), and switch the fault flag `emitRawPii` on for at most 15 minutes.
3. **The lab seed** for the token check of m07 step 5: the owner enters it in the site's settings in your pane, or tells you that you may read it with `make status`. Never write the seed or a token into a file.

## Do

Walk each action in the order the step gives it, as a learner: the click or the command, what the screen or the terminal showed, and whether the step's words match. Where the screen differs from the step, the screen wins: correct the step and say so in the log.

1. **m07** (about two hours). The Grafana actions of steps 3 to 9 and 12, with the workshop service running for steps 7 to 9 (port 8001 while you test). The token check of step 5 in the site. The module quiz, taken once to the end. Step 7's note about stopping the service with `Stop-Process` is out of date since card L6: run it, then rewrite the note to what happens now. Two inferences to settle: Ctrl+C in Docker (not in WSL: that would need a change to `/etc/hosts`), and which span becomes the shop's parent when the context is injected while the server span is current.
2. **m08** (about an hour). The Explore actions of steps 4, 6, 8 and 12 and the link from a log line to its trace in step 6, with the workshop service on port 8002. Three inferences to settle with short runs: where `db_client_*` comes from, where the `k8s_*` labels come from, and that `otelTraceID` comes from `OTEL_PYTHON_LOG_CORRELATION`. Leave "Mimir rejects delta" as checked against the reference; do not push test data into Mimir.
3. **m09** (about an hour and a quarter). Everything in the cluster: steps 5, 6, 8, 12 and 13 with the practice Collector, step 6's part with the flag (write the UTC times it was on; check afterwards that all 16 flags are off), step 11's Explore queries. Two doubts to settle and then fix or keep the text: in a local run the span metrics connector reported `calls` as 0 while its duration histogram counted every span (step 8), and step 13 assumes that restarting a Deployment of one replica keeps the old pod while the new one fails. Delete `learn-m09` at the end.
4. The lab's shape changed with card L6 (one master, five nodes). Where a step of m07 to m09 quotes a count or a name from the lab, check it.
5. Run `check:content`, `build` and `check:links`; pass changed text through `humanizer`; in each log turn the walked rows into `run on the lab` with what was seen, and add a section "Walk on the rebuilt lab".

## Limits

- Nothing in the cluster outside `learn-m09` and the one flag. If your session refuses a change, say so and wait for the owner; do not look for another way.
- The gateway, the stores and Grafana are read. In Grafana, Explore and existing dashboards only; create nothing.
- Keep Loki queries to short time ranges.
- Site port 8098; port-forwards 18110 to 18119.

## Done when

- [ ] No row in the logs of m07, m08 and m09 is `lab-unverified`, or each one left is listed with why it could not be done.
- [ ] The two doubts of m09 and the listed inferences are settled, and the text follows.
- [ ] `learn-m09` is gone and all flags are off, with the times `emitRawPii` was on.
- [ ] `check:content`, `build` and `check:links` pass; ids, tags and exam mappings are unchanged.
- [ ] One pull request, `[lgtm W2] Modules m07 to m09 walked on the lab`, with every step whose text changed listed at its top.

## Report

The pull request link; how many actions were walked and how many steps changed; what the two doubts turned out to be; anything left unverified and why; anything the lab should change.
