# Worker cards

One card is one worker session: one branch, one pull request. The planner starts the sessions, at most 3 at a time, each on model Opus 5.5 at high effort.

## The prompt every worker session starts with

```
/caveman You are worker <ID> on the LGTM study project. Read lgtm/CLAUDE.md, then
lgtm/docs/plan/00-overview.md, then your card lgtm/docs/plan/cards/<file>.md and the
files it tells you to read. Do the card and nothing else. Open one pull request to main
when its "Done when" list is met, and end with the report the card asks for.
```

If the `/caveman` prefix did not load the skill, load it with the Skill tool before anything else. Caveman voice is for chat. Everything that is saved (lesson text, code, comments, commits, pull requests, docs) is plain, complete English.

## Rules for every card

1. Stay inside the paths under "Owns". If the job needs a change outside them, stop and say so in the pull request; do not make it.
2. Do not edit `lgtm/docs/plan/`. Ask the planner for contract changes in the pull request.
3. No sub-agents, unless the card allows one for an independent check.
4. Do not start, stop, rebuild or reconfigure anything the owner runs: the saa-plan app (ports 8080 and 8091), their VMs, their kubeconfig at `~/.kube/config`, their WSL packages, Windows settings. Test servers use ports 8095 to 8098. Test clusters are kind clusters you create and delete yourself, named `lgtm-<card id>`.
5. Tools you need go into a git-ignored folder inside the worktree (`.bin/`, `.venv/`, `node_modules/`), pinned and checksum-checked. Nothing is installed system-wide.
6. Check versions and facts on the web on the day; record what you pinned and why in `lgtm/docs/adr/<card id>-<topic>.md` (context, options, decision, source links).
7. Commit in small steps with clear messages. Never commit secrets, kubeconfigs, keys or generated passwords.
8. When something in the card turns out to be wrong or impossible, do the closest correct thing, and put the difference at the top of the pull request text.

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
| 3 and later | `content-module-template.md` | one copy per module, filled in by the planner |

Cards for wave 3 and later (D2, L4, C0, DZ, FG) are written by the planner when the wave before them is merged. DZ uses the `web-design-engineer` skill and FG the `stageshow` skill; no other card uses them.
