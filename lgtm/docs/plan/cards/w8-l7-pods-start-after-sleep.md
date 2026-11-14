# L7: new pods start after the PC has slept

Beside wave 8. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

On 2026-11-14 at 12:50 UTC, a day after the lab was rebuilt, new pods stopped starting on three of the five nodes. The planner restarted calico-node there with the owner's word and pods start again. It will come back after the next long sleep of the PC. This card makes the lab survive a sleep, makes the lab's own check see the fault, and tells the learner what to do.

## Owns

`lgtm/lab/**`, `lgtm/docs/adr/l7-*.md`, and one lesson: `lgtm/learn/src/content/steps/m00/s07-stop-and-start-the-vms.mdx` with its log `lgtm/docs/verification/m00.md`. Not the plan, no other lesson.

## Read first

- `lgtm/docs/plan/05-open-items.md`, section "Lab defects": the row of 2026-11-14.
- `lgtm/lab/docs/cluster.md`, `runbook.md` (section "Start and stop"), `acceptance-cluster.md`, `reference.md`.
- `lgtm/lab/ansible/roles/master_init/` (the Calico operator manifests and `templates/calico-custom-resources.yaml.j2`), `lgtm/lab/ansible/inventory/group_vars/all.yml` (`calico_version`), `lgtm/lab/ansible/playbooks/cluster-check.yml`, `lgtm/lab/mk/` and the checks behind `make cluster-check`, `make platform-check` and `make lab-check`.
- `lgtm/lab/vm/hyperv/` (`lab-vms.ps1`, `LabVms.psm1`): how the VMs are created, stopped and started.
- Calico's source for the version the lab pins, `node/pkg/cni/token_watch.go`, and the Calico and Tigera operator documentation for that version. Fetch them on the day.
- `lgtm/docs/plan/03-content-contract.md` and the step you will touch, before you touch it.

## What happened, as the planner read it

Check each point yourself before you build on it.

- The message on the pod: `plugin type="calico" failed (add): error getting ClusterInformation: connection is unauthorized: Unauthorized`. Running pods were not affected; pods being deleted on those nodes also hung until the fix.
- calico-node writes a token for the CNI plugin into `/etc/cni/net.d/calico-kubeconfig` on its node. In v3.31.4 the token is valid 24 hours (`defaultCNITokenValiditySeconds`), and the next renewal comes after a quarter of the remaining validity plus as much again at random, so after 6 to 12 hours. The wait is a Go timer (`time.After`).
- Each calico-node logs `Wrote updated CNI kubeconfig file` when it renews. All five wrote one at 12:47 to 12:49 UTC on 2026-11-13, when the cluster was built. The next line came on master1 at 12:17 UTC and on worker1 at 12:33 UTC on 2026-11-14, 23.5 and 23.7 hours later. worker2, worker3 and worker4 had none, and their tokens ran out at 12:49 UTC.
- Prometheus has no samples from 22:10 UTC on 2026-11-13 to 11:47 UTC on 2026-11-14: the PC slept and Hyper-V paused the VMs for about 14 hours. `node_boot_time_seconds` moved later by about that much while no container restarted. A renewal 23.5 hours after the last one fits the 6 to 12 hours only if the timer did not count the pause.
- cert-manager's controller restarted once at 11:49 UTC with exit code 0, two minutes after the VMs came back.
- calico-node reads the variable `CNI_TOKEN_REFRESH_INTERVAL` (a Go duration) in place of the quarter. The random addition still applies.

## What to build

1. **The lab survives a night's sleep.** Make calico-node renew often enough that a pause of 16 hours cannot let a token run out. Find out on the day how the Tigera operator lets an installation set that variable on calico-node, and whether the operator keeps the change; put it into the files that install Calico, so a rebuild has it. If the operator cannot carry it, say so with the page that shows it and choose the next best answer. Do the arithmetic in the ADR: the longest pause the lab now survives, and how long new pods fail after a longer one.
2. **One command for after a long pause.** A `make` target that renews the token on every node at once (a rolling restart of calico-node does it) and waits until all are ready. It must be safe to run on a healthy lab.
3. **The lab's check sees the fault.** `make lab-check`, or the check that fits better, fails with a sentence that names the cause and the command of point 2 when a node cannot start a pod for this reason. Choose a test that reads; do not create pods in a check. The planner found two signs: events with the reason `FailedCreatePodSandBox` whose message contains `unauthorized`, and the age of each node's last renewal line.
4. **What else a pause breaks.** List what restarted or complained after the pause of 2026-11-14 (cert-manager's controller is one) and say for each whether it matters. Look at the kubelet's certificates, the API server's leases and Kafka. Change something only where a learner would be stopped.
5. **The VMs when the PC shuts down.** Read what `lab-vms.ps1` sets as the automatic stop action of a VM and what Hyper-V does to a running VM when Windows sleeps and when it shuts down. Write down what the lab does today. If shutting the guests down on a Windows shutdown is the better default, change the script for new VMs and give the owner the one command for the existing ones; do not change a VM yourself.
6. **Docs.** `runbook.md` gets a section "After the PC has slept": what a learner sees, why, the command, how to check. `cluster.md` and `reference.md` get what changed.
7. **The lesson.** Module m00 step 7 is where the learner stops and starts the VMs. Add what a sleeping PC does to the lab and the one command, as a `<Trap>` or a short section, in the form of the content contract. Keep the step id and the frontmatter ids as they are. Log the new facts in `lgtm/docs/verification/m00.md`. `npm run check:content`, `npm run build` and `npm run check:links` pass in `lgtm/learn`.

## On the lab, with the owner

Your session will refuse to change the shared cluster until the owner says so in it. Three content workers are using the lab while you work.

1. Do part "What to build" in files first and open the pull request with the command list at its top: each command, who runs it, how long it takes, what to check afterwards.
2. Ask the owner once for the go-ahead to apply the Calico change to the running lab. A rolling restart of calico-node takes about two minutes and interrupts the network of each node for a few seconds, one node at a time; say so, and say that the content workers may see a failed request.
3. Apply it, then show: every calico-node carries the setting, each node wrote a fresh token, and the renewals now come at the interval you chose (read two of them from the log).
4. The real proof is the next morning. After the PC's next sleep of several hours, read each node's renewal lines and the pause from Prometheus, and look for `FailedCreatePodSandBox` events. The owner or the planner can send you the word that the PC has slept. Add that record to `acceptance-cluster.md`. If the session cannot wait for it, say in the pull request exactly which commands the planner runs the next morning and what they must show.

## Limits

- No change to `~/.kube/config`, Windows or WSL settings, `/etc/hosts`, the saa-plan app. No VM is created, stopped, started or changed by you.
- Nothing in the namespaces `learn-m10`, `learn-m11` and `learn-m12`, and no restart of any release besides calico-node.
- No kind cluster. No sub-agents.
- Never print the lab seed, Grafana's password, a certificate, a key or a token into the session, a log or a pull request. The CNI token on a node is a secret too: read its age from the log line, not the file.
- Host ports, all on 127.0.0.1: 8101 for the site, port-forwards 18130 to 18139.

## Done when

- [ ] The files that install Calico carry the shorter renewal, or the pull request shows why they cannot and what was done instead; an ADR `l7-*.md` has the options, the arithmetic and the sources.
- [ ] The `make` target for after a pause exists and was run once on the lab with the owner's word.
- [ ] The lab's check fails on this fault with a sentence that names the command; its test is in `lgtm/lab/tests` if the other checks have tests there.
- [ ] The running lab carries the setting: every calico-node shows it and two renewals at the new interval are quoted from the log.
- [ ] `runbook.md`, `cluster.md` and `reference.md` are updated; module m00 step 7 tells the learner; the site's checks pass.
- [ ] The record after a real sleep is in `acceptance-cluster.md`, or the pull request gives the planner the commands for it.
- [ ] `make lint`, `make lint-ps`, `make platform-lint` and `make lab-lint` pass.

## Report

The pull request link; what a learner must do after a sleep, in one line; the longest pause the lab now survives without that; what else the pause touched; anything the owner must run themselves.
