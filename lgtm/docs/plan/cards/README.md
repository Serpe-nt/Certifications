# Worker cards

One card is one worker session: one branch, one pull request. The planner starts the sessions, at most 3 at a time, each on model Opus 5.5 at high effort.

## The prompt every worker session starts with

```
/caveman You are worker <ID> on the LGTM study project. Before anything else, load the
skills humanizer and ponytail with the Skill tool (and caveman, if the prefix did not
load it). Read lgtm/CLAUDE.md, then lgtm/docs/plan/00-overview.md, then your card
lgtm/docs/plan/cards/<file>.md and the files it tells you to read. Do the card and
nothing else. Open one pull request to main when its "Done when" list is met, and end
with the report the card asks for.
```

## The three skills every worker loads

By the owner's instruction (2026-11-11). They are skills of the owner's claude.ai account and appear in the session's skills list under these names.

- `caveman`: the voice of chat only. Everything that is saved (lesson text, code, comments, commits, pull requests, docs) is plain, complete English.
- In a session's skills list `humanizer` and `ponytail` may appear as `anthropic-skills:humanizer` and `anthropic-skills:ponytail`; load them under the name the list shows.
- `humanizer`: rewrites text that sounds machine-made so it reads like a person wrote it, without changing what it says. Pass every text a person will read through it before you save it: lesson text first of all, then docs and pull request text. It must not change a fact, a number, a name, a command or a query; check those after it.
- `ponytail`: for coding work, the smallest change that fully solves the task, and a reply a busy reader takes in at one pass. It does not shrink the card: every item of "Done when" still has to be met.

When two of them pull apart, the card decides, then accuracy, then brevity.

## Rules for every card

1. Stay inside the paths under "Owns". If the job needs a change outside them, stop and say so in the pull request; do not make it.
2. Do not edit `lgtm/docs/plan/`. Ask the planner for contract changes in the pull request.
3. No sub-agents, unless the card allows one for an independent check.
4. Do not start, stop, rebuild or reconfigure anything the owner runs: the saa-plan app (ports 8080 and 8091), their VMs, their kubeconfig at `~/.kube/config`, their WSL packages, Windows settings. Test servers use ports 8095 to 8098. Test clusters are kind clusters you create and delete yourself, named `lgtm-<card id>`.
5. Tools you need go into a git-ignored folder inside the worktree (`.bin/`, `.venv/`, `node_modules/`), pinned and checksum-checked. Nothing is installed system-wide.
6. Check versions and facts on the web on the day; record what you pinned and why in `lgtm/docs/adr/<card id>-<topic>.md` (context, options, decision, source links).
7. Commit in small steps with clear messages. Never commit secrets, kubeconfigs, keys or generated passwords.
8. When something in the card turns out to be wrong or impossible, do the closest correct thing, and put the difference at the top of the pull request text.

## Things wave 1 learned about this machine

- The WSL distribution `archlinux` logs in with fish. `wsl -d archlinux -- bash -c "..."` is parsed by fish and breaks. Write a script and run `wsl.exe -d archlinux -e bash <script>`. Windows Git Bash has no `make`; run `make` in WSL.
- git inside WSL cannot use a Windows worktree's `.git` file. Run git from Windows.
- Git on Windows records new files as 100644. Before pushing a script that must be executable, run `git update-index --chmod=+x <file>`.
- Docker Desktop leaves a published port unbound, with no error, when a WSL process already listens on it. Check the binding (`docker port`) before trusting a `curl`.
- Host ports by card in wave 2, all on 127.0.0.1: S2 uses 8095 and 8096; L2 uses 18080 and 18443 for its kind cluster's gateway NodePorts and 8097 for anything else; L3 uses 28080 and 28443 and 8098. Nobody uses 8080, 8091 or 8181.
- Docker Desktop has about 30 GB for everything. Two kind clusters run at the same time in wave 2: keep yours small, and delete it as soon as your evidence is collected.

## Wave 3: the real cluster exists

- Since 2026-11-10 the lab cluster runs on the owner's Hyper-V VMs (40 GB of the PC's 61.6 GB), reached from WSL with `KUBECONFIG=~/.kube/lgtm-lab.config`, context `lgtm-lab`. Only the card that says so (L4) may change anything on it. Every other card stays off it, or reads it only when its card allows.
- With the VMs running, Docker Desktop has much less memory than before. Only D2 may run a kind cluster in wave 3, and it must stay under 6 GB.
- Host ports in wave 3, all on 127.0.0.1: C0 uses 8095 and 8096 (the site), D2 uses 8097, L4 uses 8098 if it needs one.
- In WSL the name `cluster-endpoint.k8s.local` resolves; the `lab.k8s.local` names do not. Use `http://10.10.0.5` with a `Host:` header.

## Wave 5: content, on top of the design branch

- Wave 5 starts while the design session's pull request 44 is still open. Its worktrees are cut from `claude/lgtm-wave5-base`: `main` plus the design branch. A wave 5 pull request targets `main`, so until 44 is merged its diff also shows the design work. That is expected; the planner merges 44 first. All the more reason to change nothing outside "Owns".
- One test of the design branch fails in CI: `tests/e2e/quiz.spec.ts`, line 7, a click that times out. It belongs to the design worker. Do not fix it and do not count it against your work; every other check must pass.
- Content sessions share the live lab with each other and with the owner. The rules are in `content-module-template.md`, section "The lab": read anything, create only in your own namespace, never touch a lab release.
- Host ports in wave 5, all on 127.0.0.1: the design session keeps 8095 and 8096; C0b uses 8097, C1 8098, C2 8099 for the site (`npx astro dev --port <port>`). Port-forwards: C1 18100 to 18109, C2 18110 to 18119.
- No kind clusters in wave 5: the VMs leave Docker Desktop too little memory.

## Wave 6

- Worktrees are cut from `main` again; the design and wave 5 are merged.
- The lab's Kafka ran out of disk on 2026-11-11 at 17:57 UTC. Card L5 repairs it and is the only card that changes the cluster in this wave. Until L5 reports, Mimir and Tempo have no fresh data; Prometheus (one day of cluster metrics) and Loki work. Content cards run the steps that need Mimir after the planner says ingest is back.
- Grafana: no session types a password or reads the admin password from the cluster. The owner signs in once in the app's browser pane. A session that still meets the sign-in page says so, goes on with other steps, and logs what it could not do as `lab-unverified`.
- One end-to-end test, `tests/e2e/quiz.spec.ts` line 7, is flaky in CI (it passes on a re-run). The design session is making it robust. If it is the only failure on your pull request, say so; do not change it.
- Host ports, all on 127.0.0.1: C3 uses 8097, C4 8098, C5 8100 for the site (8099 is held by something else on this PC). Port-forwards: C3 18100 to 18109, C4 18110 to 18119, C5 18120 to 18129, L5 18130 to 18139.
- No kind clusters.

## Wave 7

- Worktrees are cut from `main`. The lab is repaired (cards L5 and L5b): Kafka has a ceiling by size, the object store has more memory, and `make lab-check` also fails on a volume above 85% and on a Longhorn disk under 25% free. Mimir and Tempo have a gap from 2026-11-11 17:57 UTC to 2026-11-12 12:02 UTC.
- The workers are close to their memory limit (worker1 at 87% in use, worker2 at 90% requested). C6 and C7 create nothing in the cluster. C8 runs one small practice Collector in `learn-m09`.
- The owner is away for the night of 2026-11-13 and said in the planner's session: "I give you my approval for all tasks they may need (if the claude app prompts me, I approve before hand)". That covers what your card asks you to do: your practice namespace, your fault flag, your test servers. It does not widen your card, and it is not a password: nobody can sign in to Grafana for you tonight. Do everything that does not need the owner, log the Grafana clicks you could not do as `lab-unverified`, and do not wait for an answer.
- Grafana: no session types a password or reads the admin password from the cluster. Evidence comes from the APIs of Tempo, Loki, Mimir and Prometheus through the lab gateway, and from logs.
- The workshop service listens on port 8000 by default. While testing, C6 runs it on 8001 and C7 on 8002; the lessons are written for the default.
- Host ports, all on 127.0.0.1: C6 uses 8097, C7 8098, C8 8100 for the site. Port-forwards: C6 18100 to 18109, C7 18110 to 18119, C8 18120 to 18129.
- No kind clusters.

## Wave 8

- Worktrees are cut from `main`. The lab is version 3 (card L6): one control-plane node, four workers with 8 GB, five Kubernetes nodes. Every count a lesson quotes comes from `lgtm/lab/docs/acceptance-cluster.md`, section "What the lessons quote", or from the lab itself.
- The workers have room: a module's practice workloads may request up to 4 GiB in all, at most 1.5 GiB on one worker (`lgtm/lab/docs/budget.md`). Each card has a practice namespace and, where it writes data, a practice tenant of the same name; never write practice data as tenant `lab` or `prom`.
- A worker session is refused changes to the shared cluster until the owner says so in that session. Ask once, in your first message, for everything you need (the go-ahead for your namespace and tenant and for any single action your card names, a Grafana sign-in in your browser pane, the lab seed), then start with what needs none of it.
- Grafana: no session types a password or reads the admin password from the cluster.
- Fault flags: the flag screen edits its own copy of the flag file, so the ConfigMap `shop/shop-flags` does not show whether a flag is on. Read the real state from the screen or from its API (`GET /feature/api/read` on the flag screen's address).
- Numbers: a digit next to nodes, targets, series, rows, pods or GiB is a fact about the lab. Read it from the lab on the day and log it; the lab's shape changed once already.
- Host ports, all on 127.0.0.1: C9 uses 8097, C10 8098, C11 8100 for the site. Port-forwards: C9 18100 to 18109, C10 18110 to 18119, C11 18120 to 18129.

## Pull request text

- Title: `[lgtm <card id>] <what it delivers>`
- Body: the card's "Done when" list as a checklist, each item with its evidence (command and the decisive lines of output); what differs from the card; what the planner must check by hand; open questions.

## Final report in chat

At most 15 short lines: pull request link, what works with evidence, what is not verified, decisions taken (ADR file names), what the next card needs to know.

## Cards

| Wave | File | Card |
|---|---|---|
| 1 | `w1-s1-site-engine.md` | S1 site engine |
| 1 | `w1-l1-vms-cluster.md` | L1 VMs and cluster |
| 1 | `w1-d1-trimmed-demo.md` | D1 trimmed demo |
| 2 | `w2-l2-platform.md` | L2 platform add-ons |
| 2 | `w2-l3-lgtm-releases.md` | L3 LGTM releases |
| 2 | `w2-s2-site-features.md` | S2 site features |
| 3 | `w3-l4-lab-acceptance.md` | L4 lab acceptance on the real cluster |
| 3 | `w3-d2-beacon-workshop.md` | D2 beacon and workshop service |
| 3 | `w3-c0-content-pilot.md` | C0 content pilot, module m02 |
| 4 | `w4-dz-article-redesign.md` | DZ the lesson page as an article (with the owner in the session) |
| 4 | `w4-x-mock-exam-pool.md` | X1 the OTCA mock pool and X2 the PCA mock pool (questions keep their form, so they do not wait for the redesign) |
| 5 | `content-module-template.md` | the part every content card shares; each content card below is short and points to it |
| 5 | `w5-c0b-m02-rewrite.md` | C0b module m02 in the article form |
| 5 | `w5-c1-setup-helm.md` | C1 modules m00 Start here and m01 Helm |
| 5 | `w5-c2-prometheus.md` | C2 module m03 Prometheus fundamentals |
| 6 | `w6-l5-kafka-disk.md` | L5 Kafka ran out of disk: repair the live lab and give it a ceiling |
| 6 | `w6-c3-promql.md` | C3 module m04 PromQL |
| 6 | `w6-c4-grafana-core.md` | C4 module m05 Grafana core |
| 6 | `w6-c5-kubernetes-monitoring.md` | C5 module m06 Kubernetes monitoring |
| 7 | `w7-c6-otel-tracing.md` | C6 module m07 OpenTelemetry: the model and tracing |
| 7 | `w7-c7-otel-metrics-logs-config.md` | C7 module m08 OpenTelemetry: metrics, logs and configuration |
| 7 | `w7-c8-otel-collector.md` | C8 module m09 OpenTelemetry Collector |
| before 8 | `w8-l6-lab-v3.md` | L6 lab version 3: one master, 8 GB workers, defects fixed, rebuilt with the owner |
| before 8 | `w8-w1-new-shape-and-checks.md` | W1 modules m00 to m06 follow the new lab; every lab check run again |
| before 8 | `w8-w2-otel-walk.md` | W2 the unverified actions of m07, m08 and m09, walked with the owner |
| 8 | `w8-c9-alloy.md` | C9 module m10 Grafana Alloy |
| 8 | `w8-c10-mimir.md` | C10 module m11 Mimir |
| 8 | `w8-c11-loki.md` | C11 module m12 Loki |

Cards for wave 9 and later (the other content cards, FG) are written by the planner when the wave before them is merged. DZ uses the `impeccable` skill and FG the `stageshow` skill; no other card uses them.
