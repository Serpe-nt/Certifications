# L6: lab version 3: one master, larger workers, known defects fixed, rebuilt

Before wave 8. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

The owner decided on 2026-11-13 to run the lab with one control-plane node and to give the memory that frees to the workers. This card changes the lab's files, fixes the lab defects found in waves 6 and 7, and then rebuilds the lab from nothing with the owner, so that the new shape is proven the way a learner will build it.

## Owns

`lgtm/lab/**` and `lgtm/docs/adr/l6-*.md`. Not the plan, not the lessons.

## Read first

- `lgtm/docs/plan/00-overview.md` (sections 2, 7 and the status lines of 2026-11-12 and 13), `02-lab-contract.md` (version 3: the machines), `05-open-items.md` (the lab defects).
- `lgtm/lab/docs/`: `bootstrap-windows11.md`, `cluster.md`, `platform.md`, `lgtm.md`, `budget.md`, `runbook.md`, `acceptance-cluster.md`, `acceptance-lab.md`, `reference.md`.
- `lgtm/docs/adr/l5-kafka-disk.md` and `l5b-rustfs-memory.md`: what the last lab card found and decided.
- `lgtm/lab/vm/nodes.yml`, `lgtm/lab/vm/hyperv/`, `lgtm/lab/ansible/` (inventory, the cluster plays, the roles `lb_haproxy`, `platform_*`, `lab_*`), `lgtm/lab/helm/`.

## The target

| VM | Count | vCPU | RAM | Address |
|---|---|---|---|---|
| lb | 1 | 2 | 2 GB | 10.10.0.5 |
| master1 | 1 | 2 | 4 GB | 10.10.0.11 |
| worker1 to worker4 | 4 | 4 | 8 GB | 10.10.0.30 to 10.10.0.33 |

38 GB in all, the same total as before. The load balancer VM stays: it carries the API endpoint name, the lab's DNS and the two ingress ports, and a learner can add control-plane nodes behind it later. Not 2 GB for the master: on 2026-11-13 each of the three masters used 2.4 to 2.8 GB (the API server alone about 1 GB), and card L4 saw 2 GB masters run out of memory.

## Part 1: the files (one pull request, nothing run on the lab)

1. `nodes.yml`: one control-plane node, workers at 8 GB. Generate the inventory again. Find everything that assumes three masters or seven nodes and make it follow the inventory: the HAProxy backends, the cluster plays (a join of further control-plane nodes must simply have nothing to do), `cluster-check`, the smoke tests, the Pester tests and their fixtures, any affinity, replica count or check that counts control-plane nodes.
2. What changes with one master, said plainly in the docs: the control plane is no longer highly available (the API is away while master1 restarts; workloads keep running), etcd has one member, and how a learner would add masters back.
3. The defects in `05-open-items.md`, fixed in the files so that the rebuild installs them fixed:
   - **The collector gateway cannot scrape the shop's Kafka** (`kafka_metrics` logs `Error scraping metrics`: the shop's Kafka announces `kafka:9092`, which does not resolve from the namespace `otel`). Fix the address on whichever side is right, and say why.
   - **The object store's memory.** RustFS is OOM-killed about every four hours; raising the limit to 1536Mi only delayed it, and its memory climbs with nothing unusual running. Find the cause: its documentation, release notes and issues for the version the lab pins, its own metrics and logs. Then choose, with sources, between a setting, another version, another limit now that the workers have 8 GB, or a scheduled restart as a last resort, and record the choice in an ADR. If you cannot find a cause in reasonable time, say so and take the least bad option.
   - **The workshop service on Windows**: with zero-code instrumentation `python run.py` returns at once and Ctrl+C does not stop the service. Make `run.py` stop what it started. And put `lgtm/lab/workshop/.venv` into `.gitignore`.
4. `budget.md` for the new sizes: what each worker may request and what is left, with room for the practice workloads of later modules. `bootstrap-windows11.md`, `cluster.md`, `reference.md`, `runbook.md`: every count, name and address that changed.
5. `make lint`, `make lint-ps`, `make platform-lint`, `make lab-lint` pass; `lab-vms.ps1 plan` prints the six VMs. Open the pull request, with the command list of part 2 at its top. The planner reviews and merges it before anything is rebuilt.

## Part 2: the rebuild (with the owner; a second pull request for the records)

The lab is rebuilt from nothing, not shrunk in place: destroying and creating use the paths that are already proven and documented, they need no new code, and they show that module m00 still works on the new shape. Everything stored in the lab is lost, which is accepted: it is practice data. The lab seed and Grafana's admin password are created again.

You cannot create or destroy VMs: that needs an elevated PowerShell and is the owner's. And your session will refuse to change the shared cluster until the owner says so in it. So:

1. Write the command list first, in order, each with who runs it, how long it takes and what to check afterwards: `lab-vms.ps1 destroy` and `create` (owner), then `make cluster`, `make cluster-check`, `make platform`, `make platform-check`, `make lab`, `make lab-check`, `make status` (you, once the owner has said go in your session).
2. Wait for the owner. Do not look for another way to run a step.
3. While the commands run, record what a lesson quotes: the table `lab-vms.ps1 status` prints, the plays `make cluster` runs, `kubectl get nodes`, the control-plane pods in `kube-system`, the number of series of `up` per job, the number of rule files Prometheus loads. Module m00 and the checks of m03 to m06 are rewritten from these.
4. After `make lab-check` passes, let the lab run for an hour and measure: memory per node and per namespace, the object store's memory over that hour, the Kafka volumes, every check of `make lab-check` again.
5. A new dated section in `acceptance-cluster.md` and `acceptance-lab.md`; `budget.md` with the measured numbers; the defects of part 1 shown fixed on the running lab (no scrape error in the gateway's log, the object store's memory flat or explained, the workshop stopping on Ctrl+C).

Never print the lab seed, Grafana's password, a certificate or a key into the session, a log or a pull request. `make status` prints the seed: cut it out of what you keep.

## Limits

- No change to `~/.kube/config`, Windows or WSL settings, `/etc/hosts`, the saa-plan app.
- No kind cluster. No sub-agents.
- If the single-master build fails in a way the copied playbooks cannot handle without a larger change, stop and say what and why before changing more than the card names.

## Done when

- [ ] Part 1 is merged: files, docs and tests describe one master and 8 GB workers; lints pass; the three defects have a fix in the files and an ADR where a choice was made.
- [ ] The lab was destroyed and built again from `main` with the documented commands; `make cluster-check`, `make platform-check` and `make lab-check` pass; the outputs are in the acceptance docs.
- [ ] The outputs a lesson quotes are recorded in one place (a section of `acceptance-cluster.md` is fine).
- [ ] After an hour: memory per node and namespace measured, the object store's memory shown, no `Error scraping metrics` from the gateway, the workshop stops on Ctrl+C.
- [ ] `budget.md` has the measured numbers and says how much room a practice workload may take.

## Report

The two pull request links; what changed for a learner; the measured memory per node; what the object store does now; anything a lesson must change beyond counts and names; anything the owner must do (the new seed in the site's settings, the Grafana sign-in).
