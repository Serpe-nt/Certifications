# The final sweep

Wave 11, last. The planner does it, in the planner's own session, when cards L11, W4 and C17 are merged. It changes no lesson and nothing on the lab: what it finds goes to a worker as a card or to the owner as a decision.

## What it checks

1. **`main` builds and tests.** In `lgtm/learn`: `npm test`, `npm run check:content`, `npm run build` (it ends with `check:pages`) and `npm run check:links`. The numbers go into the plan.
2. **The lab is healthy.** Read-only: five nodes Ready, every pod running, no alert besides Watchdog, every fault flag off, no `learn-` namespace, no rule group left in a ruler, product-catalog's and checkout's p95 at their healthy values, and the lab check of card L11 passing. The planner does not run `make lab`; if the releases must be compared with `main`, the owner or a worker runs it.
3. **One walk per module.** For each of m00 to m18, on the built site: the module's start page, its first and last step on both tabs, and the quiz page where the module has one. Then one Practice step per module, the one that reads the lab most: every command and query that only reads is taken from the built page's `<pre>` and run, and its output compared with what the step says. A step that changes the lab is not run again; its log row stands.
4. **Numbers that move.** Search the steps for statements tied to the lab's state that later cards changed: the shop's version (`3.1.0-lab.1` became `3.1.0-lab.2`), memory limits card L11 changed, Calico's version, counts of nodes, pods and series, the latencies a quiet shop shows. Each hit is checked against the lab or the lab's files.
5. **The mock exams.** Each mock is started once on the built site; the draw has 60 questions by the domain weights, and the result page shows the domains.
6. **The open items.** Every row of `05-open-items.md` is closed, or is a decision put to the owner with what each choice costs.

## What it leaves

- A last update of `00-overview.md` and `05-open-items.md`: what the course holds, what was checked in the sweep and what was not, and the decisions that wait.
- For the owner, in three lines: that `main` is ready, the command to bring their own copy of the site up to it (the planner never restarts the owner's apps), and the decisions that are theirs.
