# L4: lab acceptance on the real cluster

Wave 3. Model Opus 5.5, high effort. Runs beside D2 and C0.

## Owns

Everything under `lgtm/lab/**` except what D2 owns: `lgtm/lab/tools/**`, `lgtm/lab/workshop/**`, `lgtm/lab/charts/lab-glue/templates/beacon.yaml` and the `beacon:` block of `lgtm/lab/charts/lab-glue/values.yaml`. Also `.github/workflows/lgtm-lab-*.yml` and `lgtm/docs/adr/l4-*.md`.

New files of yours: `lgtm/lab/docs/reference.md`, `lgtm/lab/docs/runbook.md`, `lgtm/lab/docs/acceptance-lab.md`.

## Read first

- `lgtm/docs/plan/00-overview.md` (sections 5, 6 and 7), `02-lab-contract.md` (all of it), `cards/README.md`
- `lgtm/lab/docs/platform.md` (above all "Checks on the real cluster"), `lgtm/lab/docs/lgtm.md`, `lgtm/lab/docs/budget.md`, `lgtm/lab/docs/demo.md`, `lgtm/lab/docs/cluster.md`
- `lgtm/lab/mk/*.mk`, `lgtm/lab/ansible/playbooks/platform.yml` and `lab.yml`, the roles they run, `lgtm/lab/helm/**`
- `lgtm/docs/adr/l2-*.md` and `l3-*.md`

## Where things stand

- The real cluster is up since 2026-11-10: `master1` to `master3` (2 vCPU, 2 GB), `worker1` to `worker4` (4 vCPU, 8 GB), Kubernetes 1.35.10, Calico, nothing else. From WSL: `KUBECONFIG=~/.kube/lgtm-lab.config`. `cluster-endpoint.k8s.local` resolves in WSL; the `lab.k8s.local` names do not (lab contract, "Machines and network").
- `make platform` and `make lab` have only ever run on kind. Never run anywhere: Longhorn, the three-node Kafka, the full profile of Mimir, Loki and Tempo (three ingesters, replication factor 3), two gateway replicas, the HTTPS listener, anything behind HAProxy.
- The budget was written for workers of 9 GiB; they have 8, and the masters have kubeadm's minimum.
- The shop images are public on GHCR.

## Goal

The whole lab running on the real cluster from `make platform` and `make lab`, with every defect that shows up fixed in the repository, so that the owner can repeat it from a clean cluster and get the same result.

## Do

1. **Platform.** `make platform`, then `make platform-check`, then the Longhorn checks in `platform.md`. Run `make platform` a second time: it must report no changes.
2. **Lab.** `make lab`, then `make lab-check`, then `make status`. A second `make lab` must report no changes.
3. **Fix what breaks, in the repository.** For each failure: the error text, the cause, the smallest correct fix in the role, values or chart, and a re-run that proves it. No change made by hand on the cluster may be needed for a clean run: if you patched something live to get further, put the fix in the code and prove it with a re-run from the state before. Bump a local chart's version when its templates change.
4. **Measure.** After the load generator has run for 30 minutes: memory and CPU in use per node and per namespace (`kubectl top`), Longhorn's own pods (which no chart sizes), volume use, restarts and OOM kills, the API server and etcd on the 2 GB masters. Rewrite `budget.md` with measured numbers beside the requested ones for the real sizes. If something does not fit or the masters are short, say what to change and by how much; do not resize VMs.
5. **Prove it survives.** Delete one ingester pod of Mimir and of Loki and one Kafka broker pod, one at a time, and show the lab keeps taking data. Then `make reset` followed by `make lab` and `make lab-check` once, to prove the reset path.
6. **Through the front door.** From WSL with `curl` against `http://10.10.0.5` and a `Host:` header, every address in the lab contract answers. Give the owner the three or four addresses to open in a Windows browser and what they should see.
7. **Write** `lgtm/lab/docs/reference.md` (every address, what is behind it, the user and where the password is, the namespaces, the tenants, the data source UIDs, the fault flags, and the one `/etc/hosts` line that makes the lab names resolve in WSL), `lgtm/lab/docs/runbook.md` (start and stop the lab with the VMs, upgrade one release, reset, what to check when a signal is missing, how to free disk), and `lgtm/lab/docs/acceptance-lab.md` (the log of this card: each command, its decisive output, each defect and its fix).
8. **Later, when the planner tells you D2 is merged:** merge `origin/main` into your branch, switch the beacon on in `lgtm/lab/helm/lab-glue/values.yaml`, bump the `lab-glue` chart version, `make lab TAGS=glue`, and check one token of each channel in Loki, Mimir and Tempo against the values the site computes (`lgtm/learn/tests/fixtures/token-vectors.json` shows the algorithm's vectors). If the planner has not written by the time everything else is done, open the pull request without this step and say so.

## Limits

- You may install, upgrade, reset and break the lab on this cluster: that is the job. You may not create, resize, stop or start VMs (no administrator rights), change Windows or WSL settings, edit `/etc/hosts`, or write to `~/.kube/config`.
- Use only `~/.kube/lgtm-lab.config`. Check the context name `lgtm-lab` before the first write.
- Lint and CI stay green: `make lint`, `make platform-lint`, `make lab-lint`.
- If a node runs out of memory and the cluster stops answering, stop, write down what you saw, and report: the owner restarts VMs.

## Done when

- [ ] From a cluster with only Calico: `make platform`, `make platform-check`, `make lab` and `make lab-check` pass, and the second runs of `make platform` and `make lab` report no changes. Output in `acceptance-lab.md`.
- [ ] Every pod is Ready or Completed, with no restart loop, after 30 minutes of load.
- [ ] Every defect found is fixed in the repository and listed with its error text.
- [ ] `budget.md` has measured numbers for the real node sizes and a clear verdict on the masters and on worker headroom.
- [ ] The three pod deletions and the reset path are shown.
- [ ] `reference.md`, `runbook.md` and `acceptance-lab.md` exist; the three lint targets and CI pass.

## Report

The pull request link, the defects found and fixed, the measured budget in three lines, anything the owner must do (VM sizes, a hosts line), and what stays unverified.
