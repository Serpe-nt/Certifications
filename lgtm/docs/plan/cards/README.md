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
| 5 and later | `content-module-template.md` | one copy per module, filled in by the planner once the content contract is at version 2 |

Cards for wave 5 and later (C0b, C1 and the other content cards, FG) are written by the planner when the wave before them is merged. DZ uses the `impeccable` skill and FG the `stageshow` skill; no other card uses them.
