# C<n>: content for module <mNN> <title>

Wave <w>. Model Opus 5.5, high effort. Runs beside up to two other content sessions; each owns a different module.

The planner copies this file once per module and fills in the angle brackets.

## Owns

`lgtm/learn/src/content/modules/<mNN>.yaml`, `lgtm/learn/src/content/steps/<mNN>/**`, `lgtm/learn/src/content/questions/<mNN>.yaml`, `lgtm/docs/verification/<mNN>.md`

## Read first

- `lgtm/docs/plan/03-content-contract.md` (all of it), `01-curriculum.md` (the section for <mNN>, and the sections of the modules before and after it, so you neither repeat nor skip)
- `lgtm/docs/plan/02-lab-contract.md` and `lgtm/lab/docs/` for names, addresses, flags and commands
- The pilot module `m02` as merged: copy its tone, card length and check style
- `lgtm/docs/research/02-certs-and-demand.md` for the exact competency names of <exams>
- <module-specific pointers from the planner: research sections, ADRs, lab files>

## Goal

Module <mNN> complete: every step written and checked, a quiz pool of at least 30 questions, and a verification log.

## Do

1. For each step in the outline, open the current official documentation first. If the product no longer works the way the outline assumes, follow the documentation, adjust the outline, and list the change at the top of the pull request.
2. Write each step to the contract: Why, Idea, Points, then for lab steps Do, Done and a check, then the question. Aim for a card that takes the stated minutes and no longer.
3. Lab steps: <the lab is up at the addresses in the lab contract, with kubeconfig `~/.kube/lgtm-lab.config`: run every action and paste the decisive output into the verification log | the lab is not available to this session: write the actions from the lab's files and mark them `lab-unverified`>. A step that switches a fault flag on switches it off again.
4. Choose a check that needs the skill the step teaches. Token slots: <channel>-<mNN>-1 to 9, each used once.
5. Figures: where a picture would teach faster than text, add `<Figure id="..." alt="..." brief="...">` and write the brief (what the scene shows, the one thing that happens, what the learner should notice). At most three per module. Do not build the scene; a later session does that with the Stageshow skill.
6. Write the quiz pool: at least 30 questions spread over the module's tags and exam competencies, each with a source link, each wrong option tied to a real misconception. No question may be answerable from the wording alone.
7. Fill the verification log as you go, not at the end.
8. Run `npm run check:content` and `npm run build` in `lgtm/learn`; run `npm run check:links` once at the end.

## Limits

- You read the lab and use it as a learner would. You do not change its Helm values, playbooks or charts; if a lesson needs the lab changed, say so in the pull request.
- Do not copy text from documentation, courses or exam-preparation sites.
- Do not write about a feature you could not find in the current documentation.
- No sub-agents, except one read-only agent at the end, if you want an independent check of a sample of your facts; give it the step files, not your conclusions.

## Done when

- [ ] Every step of the module exists, and `check:content`, `build` and `check:links` pass.
- [ ] Every statement in the cards has a row in the verification log with status `checked`, `run on the lab` or `inference`; no row is empty.
- [ ] Every lab action is `run on the lab` or listed as `lab-unverified` in the pull request.
- [ ] The pool has at least 30 questions and covers every competency the module is mapped to.
- [ ] The pull request lists outline changes, unverified steps, and anything the lab or the site must change.

## Report

The pull request link, step and question counts, minutes of study in total, outline changes, unverified items.
