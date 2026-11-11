# Content cards: the part every module shares

Every content card (C0b, C1, C2 and later) is short and points here. This file says how a module is written; the card says which module, what is special about it, and which names and ports are yours.

Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker. Up to three content sessions run at once; each owns a different module.

## Owns

`lgtm/learn/src/content/modules/<mNN>.yaml`, `lgtm/learn/src/content/steps/<mNN>/**`, `lgtm/learn/src/content/questions/<mNN>.yaml`, `lgtm/docs/verification/<mNN>.md`, and `lgtm/docs/adr/<card id>-content-notes.md` if you have something the next content worker should know. Nothing else: no file of the site, the lab or the plan.

## Read first

- `lgtm/docs/plan/03-content-contract.md`, all of it. It is at version 2: a step is an article.
- The two finished steps `lgtm/learn/src/content/steps/m02/s10-cardinality.mdx` (concept) and `s06-one-request-three-signals.mdx` (lab). The owner approved the form on these two. Open both in the site as well (see "Check your work") so that you know what each part looks like on the page.
- `lgtm/docs/adr/dz-article-format.md`: why the form is what it is, and when each part is used.
- `lgtm/docs/adr/c0-content-notes.md`: what the pilot learned. All of it applies.
- `lgtm/docs/plan/01-curriculum.md`: your module, and the modules before and after it, so that you neither repeat nor skip.
- `lgtm/docs/plan/04-tags.md`: the tags your steps must teach.
- `lgtm/docs/plan/02-lab-contract.md` and `lgtm/lab/docs/reference.md` for every name, address, flag and command of the lab.
- `lgtm/docs/research/02-certs-and-demand.md`, part A, for the exact competency names when your module serves an exam.
- What your card adds.

## How to write a step

1. **Sources first.** Fetch the official pages for the step and keep them as text. List the facts the step needs, each with its page. If the product no longer works the way the outline assumes, the page wins: adjust the outline and say so at the top of the pull request.
2. **Write the article.** The problem as a short scene, the idea in two or three sentences, then two to five sections that follow from each other. Explain why before how. The reader knows Kubernetes and Linux well and nothing about the tool. An information part (`<Flow>`, `<Compare>`, `<Figures>`, `<Layers>`, `<Timeline>`) goes where it shows something the text would otherwise list; the text must still make sense without it.
3. **Terms and outcome.** Put every new word into `terms` with a one-line definition. Write the `outcome` as what the learner can do afterwards, not what the step covers.
4. **Practice** (lab and drill steps). Run every action on the lab as a learner would, in the order written, and paste the decisive output into the log. Pick a check that needs the skill the step teaches and gives the same answer on every healthy lab.
5. **The question.** One question that tests understanding, not memory of a sentence. Four options, each with an explanation that never starts with "Right" or "Correct".
6. **Log as you go.** One row per statement and per action in `lgtm/docs/verification/<mNN>.md`. Numbers and names inside information parts need rows too.
7. **Humanizer, then facts again.** Pass the step through `humanizer`. Then compare every fact, number, name, command and query with the log once more.
8. **Look at it.** Open the step in the site, on both tabs. Commit it. Then the next step.

Then the quiz pool: at least 30 questions over the module's tags and competencies, about half of them scenarios, none repeating a mock pool question (read the mock pool's questions on your module's tags first). Measure the option lengths over the pool and even them out.

## The lab

The lab cluster is running and three content sessions share it with the owner. Reach it from WSL with `KUBECONFIG=~/.kube/lgtm-lab.config`; the pinned `helm` and `kubectl` come from `make lab-tools` in `lgtm/lab` (they land in the git-ignored `.bin/`). How each address is reached from WSL and from Windows is in `lgtm/lab/docs/reference.md`.

- Read anything. `make status` is allowed.
- Create things only in the namespace your card gives you. Keep them small (requests of at most 100m CPU and 128Mi of memory per pod, no volume unless the step is about one) and delete the namespace when your evidence is collected.
- Never run `make cluster`, `make platform`, `make lab`, `make reset` or `make forget-host-keys`. Never upgrade, roll back or uninstall a lab release, edit or delete a lab resource, or restart a lab pod.
- No fault flags in this wave unless your card names one. A step that turns a flag on turns it off.
- If a lesson needs the lab changed, do not change it: say so in the pull request.
- If the lab is down, do not try to repair it. Write the actions from the lab's files, mark the rows `lab-unverified`, and say so in the pull request.

## Limits

- No copied or adapted text from documentation, courses, books or exam-preparation sites.
- Nothing about a feature you could not find in the current official documentation.
- No sub-agents, except one read-only agent at the very end for an independent check: give it 5 step files and 10 questions and tell it to fetch the sources itself and judge every statement, every right answer and every wrong option. Fix what it finds, then look for the same kind of fault in the rest.
- Figures: at most three `<Figure>` per module, each with `alt` and a `brief`. You do not build them.

## Check your work

- In `lgtm/learn`: `npm ci`, then `npm run check:content` and `npm run build`. In PowerShell use `npm.cmd`. No error and no warning that concerns your module.
- Start the site on your card's port (`npx astro dev --port <port>`) and read every step as a learner: Learn, then Practice. Pass each lab check with the real answer and try one wrong answer. Take the module quiz once. Stop the server when you are done.
- `npm run check:links` once at the end.

## Done when

- [ ] Every step of the module exists in the article form, and `check:content`, `build` and `check:links` pass.
- [ ] Every statement has a row in the verification log with status `checked`, `run on the lab` or `inference`; every lab action is `run on the lab` or listed as `lab-unverified` in the pull request.
- [ ] The steps teach every tag `04-tags.md` gives the module, or the pull request says why one does not fit.
- [ ] The pool has at least 30 questions (where the module has a quiz) and covers every competency the module is mapped to; the pull request gives how the right answers' lengths compare with the wrong ones.
- [ ] Every step was read in the browser on both tabs, and the module quiz was taken once.
- [ ] The independent check ran; the pull request gives its counts and what was fixed.
- [ ] Whatever you created in the cluster is gone.
- [ ] The pull request lists outline changes, new tags, unverified steps, figures asked for, and anything the lab or the site must change.

## Report

The pull request link, step and question counts, minutes of study in total, outline changes, new tags, unverified items, and the three statements or questions you are least sure of, with why.
