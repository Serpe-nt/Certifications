# W1: the lessons follow the new lab, and every lab check is run again

Before wave 8, after card L6 has rebuilt the lab. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker. Runs beside W2, which walks modules m07 to m09; you share no file with it.

## Why

The lab now has one control-plane node and five Kubernetes nodes, where modules m00 to m06 were written against three masters and seven nodes. Several check answers are counts. And the rebuild changed other things a lesson may quote: chart versions, the number of rule files, the object store's version. A learner must never paste the right answer and be told it is wrong.

## Owns

For modules m00 to m06 only: `lgtm/learn/src/content/steps/<module>/**`, `lgtm/learn/src/content/questions/<module>.yaml`, `lgtm/docs/verification/<module>.md`. Change a file only where the new lab or a failed check requires it. No new steps, no rewriting of what is still true.

## Read first

- `lgtm/docs/plan/03-content-contract.md` (the form and the writing rules), `02-lab-contract.md` (version 3), `05-open-items.md`.
- What card L6 recorded on the rebuilt lab: `lgtm/lab/docs/acceptance-cluster.md` and `acceptance-lab.md` (the newest dated sections), `cluster.md` (the section "One control-plane node"), `budget.md`, `reference.md`.
- Each module's verification log before you touch the module.

## Do

1. **Find everything that depends on the old shape.** Search modules m00 to m06 for the masters by name, for node, VM and etcd counts in words and in digits, and for any other number read from the lab. The planner's first search found: m00 steps 3 to 7 (27 lines, with the check answers "8" VMs and "3" etcd pods), m04 steps 2, 6, 9 and 11 and two question lines, m05 step 2's check, m06 steps 1, 4 and 10 and one question. Do not trust that list to be complete.
2. **Module m00 is the large one.** Steps 3 to 7 describe building the lab. Rewrite what the new shape changes from L6's records: six VMs, one master, one etcd member, what `make cluster` does with a single control-plane node, the order of `stop` and `start`. Keep what three control-plane nodes would give as one honest paragraph where a step taught it (why production runs three etcd members), now as "what a production cluster does and this lab does not", with the pointer to `cluster.md` for adding masters back.
3. **Run every lab check of m00 to m06 again** on the rebuilt lab, as a learner would get the answer, and compare with the answer in the file. There are about 45. For each: the command or query, what the lab returned, pass or changed. Fix the answer where the lab's answer is right and the file's is stale; fix the step's text where it quotes the old value. A check you cannot run (it needs a VM command, or `make reset`) is listed, not guessed.
4. **Where a hypothetical is fine, leave it.** A question about "a cluster of seven nodes" or "all three masters of a production cluster" does not need the lab to look like that; make sure it reads as a hypothetical and not as a statement about this lab.
5. **Module m05 lives in Grafana.** Its checks need a signed-in Grafana: the owner signs in once in your session's browser pane. Never type a password and never read the admin password from the cluster. If Grafana shows its sign-in page, say so in your session and go on with the other modules.
6. Token checks: the rebuild made a new lab seed. The owner enters it in the site's settings in your pane, or tells you in your session that you may read it with `make status`. Never write the seed or a token into a file.
7. Run `check:content`, `build` and `check:links`; pass the changed text through `humanizer`; update each log with a section "After the lab's version 3" that lists every check re-run and every line changed.

## Limits

- Read-only on the cluster, except where a step's own check needs the learner's action in a practice namespace (m01's `learn-m01`, m03's `learn-m03`, m06's `learn-m06`). If your session refuses that as a change to a shared cluster, say so and wait for the owner; do not look for another way.
- No fault flags, except `failedReadinessProbe` for m06 step 12's check, at most 15 minutes, with the times in the pull request. W2 uses `emitRawPii`; agree the order with the planner if both are needed in the same hour.
- Site port 8097; port-forwards 18100 to 18109.

## Done when

- [ ] No line of m00 to m06 states the old shape as this lab's, and module m00 builds the lab a learner now builds.
- [ ] Every lab check of m00 to m06 has a row in its log's new section: run again, what the lab returned, pass or changed. Those not run are listed with the reason.
- [ ] `check:content`, `build` and `check:links` pass; ids, tags and exam mappings are unchanged.
- [ ] One pull request, `[lgtm W1] Modules m00 to m06 follow the lab's version 3`, with the list of changed check answers at its top.

## Report

The pull request link; how many checks ran, how many answers changed and which; what in m00 changed; anything that could not be run; anything the lab should change instead of the lesson.
