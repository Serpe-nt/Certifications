# C16: module m17 Running it at scale

Wave 10. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C16.

## Owns

`lgtm/learn/src/content/modules/m17.yaml`, `lgtm/learn/src/content/steps/m17/**`, `lgtm/learn/src/content/questions/m17.yaml`, `lgtm/docs/verification/m17.md`, and `lgtm/docs/adr/c16-content-notes.md` if you have something the next worker should know. No file of the lab: where a step changes the lab, the change is made, shown and taken back, and nothing of it is committed.

## Read, on top of the template

- Modules m11, m12 and m13 as merged (the three stores, each with its architecture, tenants, limits, storage and retention) and m10 (Alloy). This module looks at the three together, as one system someone has to run.
- The lab as an operator reads it: `lgtm/lab/helm/mimir/values.yaml`, `loki/values.yaml`, `tempo/values.yaml` with their `VERSION` files; `lgtm/lab/docs/lgtm.md`, `platform.md` (the object store, Kafka, Longhorn, "Lab simplifications"), `budget.md`, `runbook.md` and `acceptance-lab.md`.
- The lab's own incidents, which are this module's best material. Each has an ADR or a record with times and numbers: Kafka's disks filled and Mimir stored nothing for 18 hours (`lgtm/docs/adr/l5-kafka-disk.md`); the object store was killed for memory every four hours (`l5b-rustfs-memory.md`, `l6-rustfs-memory.md`); a heavy log query took the object store down and the lab got query limits (`l8-query-limits-and-switches.md`); the control plane went from three nodes to one (`lgtm/lab/docs/cluster.md`); an ingester restart stops recent reads for ten seconds because the lab has one ingester per partition (module m11 step 13); a pause of the VMs outlasted Calico's token (`l7-calico-cni-token.md`).
- `lgtm/docs/research/01-stack-versions.md` for what changed in Mimir 3, Loki 3 and Tempo 3.
- grafana.com/docs for Mimir, Loki and Tempo, for the versions the lab runs: deployment modes and when to move, the production and sizing pages, zone-aware replication and rolling updates, the limits and runtime overrides, retention, the pages on monitoring each store (its mixin, its dashboards and alerts), backup and disaster recovery, securing each store (authentication, TLS, network), and Grafana Cloud's pages for what a managed service takes off a team. The Strimzi and Kafka documentation for partitions, consumer lag and retention; kubernetes.io for network policies and disruption budgets.

## The learner at this point

They have done m00 to m16. They can use and configure every part of the stack. What they have not done is keep it alive: decide its size, protect it from its own users, upgrade it and lose a piece of it on purpose. That is the gap between "I ran the LGTM stack" and "I ran it for a team" in an interview.

## The module, 16 steps

It serves jobs; no exam maps to it (`cert: none`).

- Steps 1 and 2: the deployment modes side by side, and how to read the three big charts' values, with the lab's files open.
- Steps 3 and 4: object storage (buckets, prefixes, lifecycle rules and why a bucket rule must never expire some objects) and Kafka for ingest (partitions, lag, retention). Use the lab's two outages, with their numbers.
- Step 5: replication, zones and rolling updates. The lab has one ingester per partition and no zones; say what that costs with the ten seconds of m11 step 13, and what two zones would buy and cost.
- Steps 6 to 8: multi-tenancy from the gateway to each store; limits per tenant; retention per signal and per tenant. In step 7 the learner gives two tenants, `team-a` and `team-b`, different limits in Mimir's runtime overrides and sees one refused where the other is not. That is a change of the Mimir release's values, applied with `make lab TAGS=mimir` and taken back the same way (see "The lab in this wave").
- Step 9: cardinality and cost: drop, relabel, aggregate, sample. One of the four done on the lab with a practice collector of the learner's own, measured before and after.
- Step 10: monitoring the monitoring. The lab's stores do not scrape themselves into a tenant; read their own metrics from the pods, and say what a production setup adds.
- Step 11: capacity planning from three numbers the learner reads on the lab (ingest rate, active series, query load), with the vendor's sizing guidance, restated and cited.
- Step 12: upgrade one component. Choose the mildest real change the lab offers (one more replica of a stateless component, or a setting that rolls one Deployment), read the diff first as module m16 teaches, apply it with the runbook's command, watch the rollout, and take it back.
- Step 13: failure drills. Lose a Kafka broker, lose the object store for three minutes, and lose a node. For each: what the learner predicts, what they do, what they see in the stack's own signals, and how it recovers. See "The lab in this wave" for who does what.
- Step 14: backup and recovery: where the state of this lab is (buckets, Kafka, volumes, Grafana's database), what `make reset` destroys, what a real setup backs up. A concept step with a table.
- Step 15: security: what the lab leaves open on purpose (`platform.md`, "Lab simplifications"), and one small thing closed: a NetworkPolicy in `learn-m17` that the learner tests. TLS and authentication between components as a concept with the settings named.
- Step 16: managed alternatives and their trade-offs, from the vendors' own pages. No prices from memory.

Tags: the fifteen that `04-tags.md` gives m17.

## The lab in this wave

This is the one module in which the lesson itself changes the lab. Every such action needs the owner's go-ahead in your session, is done once, and is taken back.

- **Order.** Do everything that only reads first. Then the changes, one at a time, mildest first: step 7 (two tenants in the runtime overrides), step 12 (the upgrade), then the drills of step 13: the broker, the object store, the node. After each one the lab is taken back to what `main` installs, and `make lab-check` passes before the next begins.
- **Step 7 and step 12** change the values of a lab release. Change the file in your worktree, apply with `make lab TAGS=<tag>`, collect your evidence, restore the file with git, apply again, and show `make lab` reporting `changed=0`. Never commit a file under `lgtm/lab`.
- **The broker**: delete one pod of the Kafka cluster `telemetry`; it has three brokers and every topic three replicas.
- **The object store**: scale the RustFS Deployment in the namespace `s3` to zero for three minutes, then back to one. Before you do, say what you expect of writes and of reads of each store, and how long each can ride it out.
- **The node** is the owner's: stopping and starting a VM needs an elevated PowerShell. Give the owner the two commands (`lab-vms.ps1` stops and starts one worker; read its help for the exact form), ask them to stop one worker for five minutes, and watch. If the owner prefers not to, write the drill from the lab's replica settings and the documentation, mark its rows `lab-unverified`, and say so.
- **Tell the others.** Before each drill, message card C15 (and card L9 if it is running) with what will be down and for how long, and again when `make lab-check` has passed. The owner studies in the same lab: say in your request to them what they will notice.
- **Stop rule.** If the lab does not come back by itself within fifteen minutes after a drill, do not try other repairs: follow `runbook.md`, and if that does not bring it back, stop and tell the owner and the planner what you see.
- Practice of your own (step 9's collector, step 15's policy) lives in the namespace `learn-m17` and is deleted at the end.
- Your session will refuse to change the shared cluster until the owner says so in it. In your first message ask once for all you need, then start with what needs none of it: a go-ahead to create and delete `learn-m17`; to apply and take back the two value changes of steps 7 and 12; to delete one Kafka broker pod once; to scale the object store to zero for three minutes once; whether they will stop one worker VM for five minutes when you ask; a Grafana sign-in in your session's browser pane (never type a password, never read the admin password from the cluster).

## Yours

- Namespace: `learn-m17`. Tenants: `team-a` and `team-b`. Site port: 8098. Local port-forwards: 18110 to 18119.
- Token slots, if a step needs one: `metric-m17-1` to `-9`, `log-m17-1` to `-9`, `span-m17-1` to `-9`.

## Done when, on top of the template

- [ ] The 16 steps exist (or the pull request explains each split, merge or drop), at least seven of them with Practice.
- [ ] Each change and each drill was done once on the live lab, with the time it began, what was seen, and the time `make lab-check` passed again; the lab is as `main` installs it (`make lab` reports `changed=0`); `learn-m17` is gone; nothing under `lgtm/lab` is in the pull request.
- [ ] Every number about the lab is read from the lab on the day, and every sizing rule has its page.
- [ ] The pool has at least 30 questions, at least two thirds of them a situation to judge: a symptom to explain, a size to choose, a setting to change, or what breaks first.
- [ ] The pull request lists what the drills showed that the lab's documents do not say yet.
