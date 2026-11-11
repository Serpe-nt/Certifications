# C1: modules m00 Start here and m01 Helm

Wave 5. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C1.

## Owns

`lgtm/learn/src/content/modules/m00.yaml` and `m01.yaml`, `lgtm/learn/src/content/steps/m00/**` and `steps/m01/**`, `lgtm/learn/src/content/questions/m01.yaml`, `lgtm/docs/verification/m00.md` and `m01.md`.

m00 has no quiz (`quiz: false`) and no question file. Neither module serves an exam: see `lgtm/learn/src/lib/schema.ts` for how a step and a question with no exam are written.

## Read, on top of the template

- `lgtm/lab/docs/bootstrap-windows11.md`, `cluster.md` and `acceptance-cluster.md`: how the VMs and the cluster are made, and the record of the owner doing it.
- `lgtm/lab/docs/platform.md`, `lgtm.md`, `runbook.md`, `acceptance-lab.md`, `beacon.md`: what `make platform`, `make lab`, `make status` and `make reset` do, and the record of them running on the real cluster.
- `lgtm/lab/ansible/roles/platform_*` and `lab_*`, `lgtm/lab/helm/**`, `lgtm/lab/mk/*.mk`: how this lab drives Helm from Ansible and where each values file lives (m01 steps 15 to 17 teach exactly this).
- `lgtm/learn/README.md` and `PRODUCT.md`: what the site does, for the step "How this course works".
- helm.sh for Helm 4. The lab pins Helm 4.3.1 (`00-overview.md`, section 6).

## The learner at this point

They run Kubernetes clusters for a living and have never used Helm. They do not know Prometheus, Grafana or any part of the stack. m00 is the first thing they read in the course.

The order they work in matters for what you may assume:

1. m00: they create the VMs and build the cluster. After it the cluster has nothing but Calico.
2. m01 steps 1 to 14: they learn Helm on that empty cluster. So the practice releases of these steps must need no storage class, no gateway and no load balancer.
3. m01 steps 15 to 20: they install the platform add-ons and the LGTM stack with the lab's own commands, open Grafana, pass the first token check, and learn to reset.

## m00, 7 steps

- Step 1 describes the site as it is now: an article per step, Learn and Practice tabs, checks, quizzes, review after 1, 2 and 4 days, mock exams. Describe only what you have seen working in the site.
- Step 2 (what each product does) and step 3 (the lab on paper) are where `<Flow>` and `<Layers>` earn their place. One short article each: this is a map, not the course.
- Steps 4, 5 and 7 are actions only the owner can run (creating, stopping and starting VMs needs an elevated PowerShell). You cannot run them. Write them from the bootstrap guide and log each action with the file and section that proves it (`acceptance-cluster.md`), status `checked`. Give the commands and what a good result looks like; send the reader to the guide in the repository for troubleshooting instead of repeating it.
- Step 6 (look around with `kubectl`) you run, read-only. The learner's cluster is empty at that point and yours is not: use only commands whose answer is the same on both (nodes, versions, the `kube-system` pods), and choose the check that way.

## m01, 20 steps

- Teach Helm 4 as helm.sh documents it. Where Helm 3 behaves differently in a way older tutorials or a job interview would show, say so in one sentence, and only as a helm.sh page states it.
- Why before how. Step 1 is the problem with a folder of manifests; a learner who knows `kubectl apply -f` should finish it wanting a release history.
- Steps 3, 6, 10 and 14 are labs on the cluster. Pick one small public chart for the steps that need one: maintained, pinned to a version, a small image, nothing it needs from the cluster. Record why in the log. Step 10's chart is written by the learner; give every file in full with `<Cmd>` or code blocks.
- Step 14 breaks a release on purpose (a bad image tag, a failing hook, a wrong value). Break only your own release.
- Steps 15 to 17 and 20 describe `make platform`, `make lab` and `make reset`. Those are already done on the live lab and you must not run them. Write the actions from the lab's files, prove them with `acceptance-lab.md` and with read-only Helm commands on the live lab (`helm list -A`, `helm status`, `helm get values`, `helm history`), and log which is which. The learner reads a release's values before installing it: choose two or three values per release that are worth reading, not the whole file.
- Step 19 is the first `token` check. The learner knows no query language yet, so the step gives the exact clicks and the exact query, and says that the modules on Loki, PromQL and Tempo explain them later. Slots of m01 only (`log-m01-1` and so on), each used once.
- The pool: at least 30 questions on Helm, about half of them scenarios (a values file and a `--set` flag disagree; a release is stuck; what does this template render). Lab-specific steps (15 to 20) get few questions; the pool is about Helm.

## Yours

- Namespace on the lab: `learn-m01` (and `learn-m00` if step 6 needs one, which it should not). Releases named with the prefix `m01-`.
- Site port: 8098. Local port-forwards: 18100 to 18109.
- Token slots: `log-m01-1` to `-9`, `metric-m01-1` to `-9`, `span-m01-1` to `-9`.
- Work module by module: finish and commit m00, then m01. Commit after every step.

## Done when, on top of the template

- [ ] m00 has its 7 steps and m01 its 20 (or the pull request explains each split, merge or drop).
- [ ] Every Helm command in m01 steps 3 to 14 was run with the lab's pinned Helm on the live cluster in `learn-m01`, and the namespace is gone.
- [ ] The token check of step 19 was passed in the site with the lab's seed.
- [ ] The pull request names the actions that could not be run (the VM steps, `make platform`, `make lab`, `make reset`) and the file that proves each.
