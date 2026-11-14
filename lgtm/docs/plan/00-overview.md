# LGTM study helper: plan overview

Status on 2026-11-10: waves 1 and 2 are merged (pull requests 22 to 28): the site with its study features, the VM script and cluster playbooks, the platform add-ons, the LGTM releases, the trimmed demo with its chart and images. The owner bootstrapped the real cluster with `lgtm/lab/docs/bootstrap-windows11.md` (pull requests 29 to 32 hold the guide and the defects that run exposed): seven nodes Ready on Kubernetes 1.35.10, reachable from WSL through `~/.kube/lgtm-lab.config`. Nothing beyond Calico is installed on it yet: the platform and the LGTM releases have run on kind only. Wave 3 is next.

Status on 2026-11-11: wave 3 is merged (pull requests 34 to 38). The lab is accepted on the real cluster, with masters at 4 GB and workers at 6 GB; the beacon's tokens are proven in Loki, Mimir and Tempo; the pilot module m02 is on main and its lab step was walked on the lab. The owner then read the pilot in the site and rejected its form, not its facts (section 13). No further lesson content is written until the lesson page is redesigned as an article and the content contract follows it.

Status on 2026-11-11, evening: wave 4 is nearly done. Both mock exam pools are merged (pull requests 42 and 43; 113 OTCA and 109 PCA questions). The design session DZ has built the new page and the article form of a step, and the owner approved that form on two specimen steps; its pull request 44 is open while DZ does its last checks. The content contract is at version 2 and the tag list exists (`04-tags.md`). At the owner's request wave 5 (cards C0b, C1 and C2) starts now, on a base branch that holds main plus DZ's branch; its pull requests are merged after pull request 44.

Status on 2026-11-12: pull request 44 is merged (the redesigned site and the article form). Wave 5 is merged after QA: module m02 in the article form (pull request 46), m00 and m01 Helm (49), m03 Prometheus fundamentals (48); 54 steps and 126 module questions are on main. During that QA the planner found the lab's Kafka down since 2026-11-11 17:57 UTC: its three 5 Gi volumes had filled, because retention was set by time only. Mimir and Tempo have stored nothing since. Card L5 repairs it and gives Kafka a ceiling by size; it is the first card of wave 6. One end-to-end test of the site (`tests/e2e/quiz.spec.ts`, the long quiz test) is flaky in CI; the design session was asked to make it robust.

Status on 2026-11-12, night: the lab is repaired. Card L5 gave Kafka 10 Gi volumes and a ceiling of 640 MiB per partition (pull request 54; ingest back at 12:02 UTC, so Mimir and Tempo have a gap from 2026-11-11 17:57 UTC). Its follow-up (pull request 55) raised the object store's memory limit to 1536Mi after four restarts, one of them set off by a heavy log query, and spread the Kafka replicas over the workers with Longhorn data locality; `make lab-check` now also fails on a volume above 85% and on a Longhorn disk under 25% free. The flaky quiz test is fixed (pull request 52). Of wave 6, modules m04 PromQL (53) and m06 Kubernetes monitoring (56) are merged, so main has 80 steps in six modules; m05 Grafana core is written and in QA (pull request 57). Things to remember: worker2 is at 90% of its memory requested; a worker session cannot change the shared cluster unless the owner allows it in that session; Loki's query limits are still the defaults, a subject for module m12.

Status on 2026-11-13, night: wave 6 is complete (m05 Grafana core merged as pull request 57) and wave 7 is written: m07 OpenTelemetry tracing (59), m08 metrics, logs and configuration (60) and m09 the Collector (61). Main has modules m00 to m09. Wave 7 ran as background agents in the planner's session, because the app would not start sessions on an automatic turn, and with nobody to sign in to Grafana; module m09 was written read-only on the cluster. What is unverified, what is broken in the lab and what is undecided is listed in `05-open-items.md`. Next: a session with the owner to walk the unverified lesson actions, a lab card for the object store, then wave 8 (m10 Alloy, m11 Mimir, m12 Loki).
The research behind the plan is in `../research/`; decisions taken by workers are in `../adr/`.

## 1. What we are building

A self-study course on observability with the Grafana LGTM stack (Loki, Grafana, Tempo, Mimir) fed by OpenTelemetry, in two parts that live side by side in `lgtm/`:

1. **Learn** (`lgtm/learn`): a website that teaches one step per card (Back, Mark complete, Next), with paste-the-answer lab checks, module quizzes, spaced review and two mock exams. It runs in one Docker container on the owner's server.
2. **Lab** (`lgtm/lab`): everything needed to stand up a production-like practice environment on the owner's PC: Hyper-V virtual machines, a kubeadm Kubernetes cluster built with Ansible, the LGTM stack in microservices mode installed with Helm, and a trimmed copy of the OpenTelemetry Demo shop that produces traces, metrics and logs and can be broken on purpose.

The learner is a DevOps engineer who knows Kubernetes, and does not yet know Helm, Prometheus, PromQL or Grafana. The first module after setup teaches Helm, because the whole lab is installed with it.
The course aims at jobs first and at two certifications: OpenTelemetry Certified Associate (OTCA) and Prometheus Certified Associate (PCA).

## 2. Decisions the owner made (2026-11-09)

| Topic | Decision |
|---|---|
| Starting level | Knows Kubernetes. Helm, Prometheus, PromQL and Grafana start from zero. The course opens with a Helm module. |
| Goal | Jobs and interviews, plus OTCA and PCA. Every step is mapped to an exam domain. One mock exam per certification. |
| Lab platform | Kubernetes only. No Docker Compose stage. |
| Cluster | 1 control-plane node, 4 workers, 1 load balancer VM, since 2026-11-13. The first choice was 3 control-plane nodes, to be production-like; the owner gave that up to free memory for the workers, where every lab-heavy module needs it. Node counts stay variables, and the load balancer stays so that control-plane nodes can be added. |
| Hypervisor | Hyper-V on the Windows 11 PC. VM creation is automated. The Ansible playbooks must work on any hypervisor: they only need SSH-reachable Ubuntu machines. |
| Cluster bootstrap | The owner's `k8s-provision` playbooks, copied (not forked) into `lgtm/lab/ansible` from commit `8442dee`. |
| Storage | Longhorn for volumes, one small S3-compatible store for objects. |
| Demo application | The official OpenTelemetry Demo, source copied and trimmed, shaped for the lessons. |
| Images | Built by GitHub Actions and pulled from GHCR. |
| Website stack | New stack: Astro, React islands, Tailwind, a small Node server with SQLite. |
| Lab checks | Paste-the-answer: the step asks for something only the finished lab can give, and the site validates it. No network link between the site and the lab. |
| Features carried over from saa-plan | XP, badges and celebrations; multi-device sync; review and weak spots. No focus timer. |
| Extra topic groups | Alerting, SLOs and on-call; observability as code; running it at scale. Profiles and eBPF get one overview step only. |
| Design of the site's screens | The `impeccable` skill (github.com/pbakaus/impeccable, version 4.8.2, commit `c1e0e54`), installed on 2026-11-11 at `~/.claude/skills/impeccable`. The owner chose it on that day in place of `web-design-engineer`, which was removed: impeccable is made for redesigning an interface that already exists in a codebase, has a mode for pages that are read, and writes the design down in `PRODUCT.md` and `DESIGN.md` so later sessions follow it. The engine is built on design tokens so the design can be swapped in. |
| Illustrations | The `stageshow` skill (github.com/benjitaylor/skills, version 1.1.1, commit `299140f`), installed the same day at `~/.claude/skills/stageshow`. It builds faux product UI as stills and cursor demos in React and plain CSS. Used for lesson figures (an animated fake Grafana panel, a cursor walking through Explore) and the hero on the overview page. It does not design the site's real screens. |
| Workers | Separate worktree sessions, model Opus 5.5 at high effort, each started with `/caveman`. At most 3 at once (4 at the very most). |
| Merging | The planning session reviews each pull request and merges it when QA passes. |

## 3. Decisions the planner made (object if you disagree)

1. **One Helm release per component, driven by Ansible.** An umbrella chart with Mimir, Loki, Tempo, Grafana and the collectors as sub-charts would be one slow, fragile release, and lessons such as "upgrade Loki" or "change a Mimir limit" would redeploy everything. Each component gets its own values file in `lgtm/lab/helm/<component>/`; `ansible-playbook lab.yml --tags loki` installs or upgrades one. Lab-specific glue (routes, dashboards, tenants, the beacon) is our own small chart, `lab-glue`.
2. **Pinned versions** (section 6). Loki stays on 3.7 until 4.0 is final; the course teaches monolithic and microservices modes only, because simple scalable mode is removed in 4.0.
3. **Both collectors are taught.** The shop sends OTLP to an OpenTelemetry Collector gateway (the Collector is 26% of OTCA). Grafana Alloy, installed through the `k8s-monitoring` chart, collects cluster logs, events and metrics. A lesson converts a Collector pipeline to Alloy.
4. **A Prometheus track inside the lab.** PCA needs real Prometheus: `kube-prometheus-stack` (Prometheus Operator, Alertmanager, exporters) runs in its own namespace and remote-writes to Mimir. This is also the most asked-for setup in job posts.
5. **One Kafka cluster for telemetry ingest**, shared by Mimir 3 (ingest storage) and Tempo 3 (required in microservices mode). The shop keeps its own small Kafka for orders.
6. **Check tokens.** A tiny `beacon` service in the lab emits logs, metrics and spans that carry per-step tokens derived from a lab seed. The learner enters the seed once in the site settings; the site can then verify a pasted token without talking to the lab (see `02-lab-contract.md`).
7. **A workshop service.** One small Python service, not instrumented at the start, that the learner instruments by hand in the SDK module. It runs on the PC and sends OTLP to the cluster, so no image registry is needed for those labs.
8. **Modules, not calendar days.** The learner moves at their own pace. A module is done when all its steps are complete and its quiz is passed at 80%.
9. **Content rules from saa-plan carry over**: purpose first on every card, one step per screen, no visible task list, sentence-case labels, every statement checked against a fetched official page, ids never renamed.

## 4. Layout

```
lgtm/
  README.md                 what this is, how to start
  CLAUDE.md                 rules for every agent working in lgtm/
  docs/
    research/               01-stack-versions, 02-certs-and-demand, 03-otel-demo
    plan/                   this plan, the contracts and the worker cards
    adr/                    decision records written by workers (one file per decision)
    verification/           per-module fact-check and lab-check logs
  learn/                    the website (Astro project, Dockerfile, compose.yaml, tests)
  lab/
    vm/hyperv/              PowerShell: create, start, stop, destroy the VMs (cloud-init)
    ansible/                copied k8s-provision + new roles and playbooks
    helm/<component>/       one values file set per Helm release
    charts/lab-glue/        our own chart: routes, dashboards, tenants, beacon
    demo/                   trimmed OpenTelemetry Demo source, its chart, build files
    tools/beacon/           the check-token emitter
    workshop/               the service the learner instruments by hand
```

## 5. Lab architecture in one picture

```
Windows 11 PC (64 GB, 32 threads)
  Hyper-V internal switch 10.10.0.0/24 (NAT to the internet)
    lb        10.10.0.5        HAProxy (API 6443, HTTP 80 / HTTPS 443 to worker NodePorts) + dnsmasq for k8s.local
    master1-3 10.10.0.11-13    kubeadm control plane, etcd
    worker1-4 10.10.0.30-33    workloads, Longhorn disks
  WSL (archlinux, mirrored networking)   ansible-playbook, kubectl, helm
  Browser                                 Grafana, shop, flag UI through the gateway

shop services --OTLP--> OpenTelemetry Collector gateway --OTLP--> Mimir (metrics)
                                                                  Loki  (logs)
                                                                  Tempo (traces)
pods, nodes, events --Alloy (k8s-monitoring)--> Loki, Mimir
Prometheus Operator stack --remote_write--> Mimir
Mimir and Tempo ingest through Kafka; Mimir, Loki and Tempo store blocks in the S3 store
Grafana reads Mimir, Loki, Tempo and Prometheus; alerts go through Alertmanager and Grafana Alerting
```

## 6. Versions to pin (verified 2026-11-09, sources in `../research/01-stack-versions.md`)

| Component | Version | Chart (repository) |
|---|---|---|
| Grafana | 13.3.x | `grafana` 14.4.x (grafana-community) |
| Loki | 3.7.9 | `loki` 21.x (grafana-community), `deploymentMode: Distributed` |
| Tempo | 3.1.1 | `tempo-distributed` 3.27.x (grafana-community) |
| Mimir | 3.2.4 | `mimir-distributed` 6.2.x or 6.3.0 (grafana/mimir today, moving to grafana-community) |
| Alloy | 1.21.3 | through `k8s-monitoring` 4.6.x (grafana/k8s-monitoring-helm) |
| OpenTelemetry Collector contrib | 0.165.x | `opentelemetry-collector` (open-telemetry) |
| Prometheus | 3.13.x (LTS) | `kube-prometheus-stack` 93.x (prometheus-community) |
| OpenTelemetry Demo | 3.1.0 source | our own chart in `lgtm/lab/demo` |
| Kubernetes | 1.35 (as in the copied role) | kubeadm |
| Calico | 3.31.4 (as in the copied role) | Tigera operator |

The table above is the plan of 2026-11-09. What wave 2 pinned, each with its source in an ADR:

| Component | Pinned | Where |
|---|---|---|
| Helm | 4.3.1 | `lgtm/lab/helm/platform/versions.yml`, `adr/l2-helm-version.md` |
| Longhorn | 1.13.0 | same file, `adr/l2-platform-pins.md` |
| S3 store | RustFS, chart 1.0.4 | `adr/l2-s3-store.md` |
| Gateway API controller | Envoy Gateway 1.10.0 | `adr/l2-gateway-controller.md` |
| Kafka | Strimzi 1.3.1 with Kafka 4.3.2, KRaft, dual-role nodes | `adr/l2-kafka-operator.md` |
| cert-manager, metrics-server | v1.21.3, chart 3.14.0 | `adr/l2-platform-pins.md` |
| Mimir | 3.2.4, chart `mimir-distributed` 6.2.2 | `lgtm/lab/helm/mimir/VERSION`, `adr/l3-mimir-chart-source.md` |
| Loki | 3.7.9, chart `loki` 21.1.0 | `lgtm/lab/helm/loki/VERSION` |
| Tempo | 3.1.1, chart `tempo-distributed` 3.27.0 | `lgtm/lab/helm/tempo/VERSION` |
| Grafana | 13.3.0, chart `grafana` 14.4.0 | `lgtm/lab/helm/grafana/VERSION` |
| Collector gateway | contrib 0.165.0, chart `opentelemetry-collector` 0.178.2 | `lgtm/lab/helm/otel-gateway/VERSION` |
| Alloy | v1.21.3 through `k8s-monitoring` 4.6.0 | `lgtm/lab/helm/k8s-monitoring/VERSION` |
| Prometheus stack | `kube-prometheus-stack` 93.1.1 with Prometheus 3.13.5 | `lgtm/lab/helm/kube-prometheus-stack/VERSION` |
| Shop | 3.1.0-lab.1, 13 public images on GHCR | `lgtm/lab/demo/VERSION` |

Lesson text names the versions in these files, not the plan table.

Facts that change old tutorials, to keep in mind everywhere:
- Grafana, Loki and Tempo charts moved to `grafana-community/helm-charts`. `helm repo add grafana https://grafana.github.io/helm-charts` is outdated for them.
- Promtail and Grafana Agent are end of life. Teach Alloy and the OpenTelemetry Collector.
- Loki simple scalable mode is removed in 4.0. Use the TSDB index with schema v13.
- Tempo 3 has no ingester and no compactor; microservices mode needs Kafka.
- Mimir 3 recommends Kafka-based ingest storage; the classic architecture is on its way out.
- MinIO community images are no longer published.
- The OpenTelemetry Demo 3.x renamed its attributes from `app.*` to `demo.*` and uses new collector component names (`otlp_http`, `span_metrics`).

## 7. Sizing

| VM | Count | vCPU | RAM | Disks (dynamic VHDX) |
|---|---|---|---|---|
| lb | 1 | 2 | 2 GB | 10 GB |
| master | 1 | 2 | 4 GB | 25 GB |
| worker | 4 | 4 | 8 GB | 30 GB system + 40 GB Longhorn |

Total 38 GB of the PC's 61.6 GB. This is the target of card L6 (2026-11-13): the same total as before, with the 8 GB of two masters moved to the workers. One master keeps 4 GB, not 2: each master used 2.4 to 2.8 GB on 2026-11-13, the API server alone about 1 GB. Until L6 has rebuilt the lab, the VMs still have the sizes of 2026-11-11 (three masters with 4 GB, workers with 6 GB): card L4 found that masters with 2 GB ran out of memory during `make platform`, so the owner raised them to 4 GB and, to pay for it, lowered the workers from 8 GB to 6 GB. The lab was accepted at these sizes (`lgtm/lab/docs/acceptance-lab.md`). Earlier plans were 46 GB and then 40 GB. All sizes are variables in `lgtm/lab/vm/nodes.yml`; `create` never resizes a VM that exists, so the file and the VMs can drift, as the worker vCPU count shows. The lab's memory requests on the workers are about 22 GiB of 32 (`lgtm/lab/docs/budget.md`, written for 36 GiB). Two things to watch on the real cluster, both for card L4: the masters have kubeadm's minimum of 2 GB while the lab adds many CRDs, and the budget must be measured, not only added up.

Disk: the owner freed space (more than 900 GB free on C: on 2026-11-10). The lab is planned for at most 90 GB of real use (short retention: 48 hours for logs and traces, 7 days for metrics).

## 8. Work plan

Workers run in waves. No two sessions in a wave own the same file. Cards are in `cards/`.

| Wave | Card | Owns | Result |
|---|---|---|---|
| 1 | S1 site engine | `lgtm/learn/**`, `.github/workflows/lgtm-learn.yml` | Astro project, content schemas, step card flow, progress API with SQLite, container, tests, one sample module |
| 1 | L1 VMs and cluster | `lgtm/lab/vm/**`, `lgtm/lab/ansible/**` | Hyper-V VM script, generated inventory, load balancer and DNS roles, cluster playbook that passes lint and a dry run |
| 1 | D1 trimmed demo | `lgtm/lab/demo/**`, `.github/workflows/lgtm-demo.yml` | Trimmed shop that builds and runs, its Helm chart, images on GHCR |
| 2 | L2 platform add-ons | `lgtm/lab/ansible/roles/platform_*`, `playbooks/platform.yml`, `lgtm/lab/helm/platform/**` | Longhorn, S3 store, gateway, Kafka, cert-manager, metrics-server |
| 2 | L3 LGTM releases | `lgtm/lab/helm/**` (not `platform/`), `lgtm/lab/charts/lab-glue/**`, `playbooks/lab.yml` | Mimir, Loki, Tempo, Grafana, collectors, Prometheus stack, wired together |
| 2 | S2 site features | `lgtm/learn/**` | Quizzes, review, weak spots, mock exams, XP and badges, answer checks, multi-device merge |
| between 2 and 3 | B1 bootstrap guide | `lgtm/lab/docs/bootstrap-windows11.md`, defect fixes in `lgtm/lab/vm/**` and the cluster plays | The step-by-step guide for a Windows 11 host, and the fixes the owner's first real run exposed (done) |
| 3 | D2 beacon and workshop | `lgtm/lab/tools/**`, `lgtm/lab/workshop/**`, the beacon template of `lab-glue` | Check-token emitter, the service to instrument by hand |
| 3 | L4 lab acceptance | the rest of `lgtm/lab/**` | `make platform` and `make lab` on the real cluster, defects fixed, budget measured, reference page of addresses, runbook |
| 3 | C0 content pilot | module m02 (observability fundamentals) | One finished concept module that sets the pattern; the owner reads it before the rest is written |
| 4 | DZ lesson page as an article | `lgtm/learn/src/**` (pages, layouts, components, styles, schemas), two specimen steps of m02 | The site's design with `impeccable` and the new article form of a step (section 13); the owner answers its checkpoints in that session |
| 4 | X1 and X2 mock exam pools | `questions/mock-otca.yaml`, `questions/mock-pca.yaml` | At least 92 exam-style questions each, started early because the form of a question does not change |
| 5 | C0b pilot rewrite | module m02 (not its two specimen steps) | The other eleven steps of m02 rewritten to the article form |
| 5 | C1 setup and Helm | modules m00 and m01 | The course's first two modules; Helm is practised on the live lab in a namespace of its own |
| 5 | C2 Prometheus fundamentals | module m03 | Written against the lab's Prometheus, every lab action run on it |
| 6 | L5 Kafka ran out of disk | `lgtm/lab/helm/platform/strimzi/**`, the role `platform_kafka`, lab docs | The live lab stores metrics and traces again; Kafka's disk use has a ceiling by size; a check and an alert for volumes that fill up |
| 6 | C3 PromQL | module m04 | 14 steps, most of them with queries run on the lab |
| 6 | C4 Grafana core | module m05 | 12 steps that build one dashboard a team would keep |
| 6 | C5 Kubernetes monitoring | module m06 | 12 steps on where cluster metrics and logs come from |
| 7 | C6, C7, C8 | modules m07, m08, m09 | OpenTelemetry: the model and tracing; metrics, logs and configuration; the Collector |
| before 8 | L6 lab version 3 | `lgtm/lab/**` | One master and 8 GB workers; the gateway's Kafka scrape, the object store's memory and the workshop on Windows fixed; the lab rebuilt from nothing with the owner and accepted |
| before 8 | W1 the lessons follow the new lab | modules m00 to m06, where the new shape or a failed check requires it | m00 builds the lab a learner now builds; every lab check of m00 to m06 is run again on the rebuilt lab |
| before 8 | W2 walk of the OpenTelemetry modules | modules m07 to m09, where the walk shows a step wrong | Every action still marked unverified is done as a learner does it, with the owner signed in to Grafana and a go-ahead for `learn-m09` |
| 8 | C9, C10, C11 | modules m10, m11, m12 | Grafana Alloy; Mimir; Loki. The first wave on the lab's version 3, with practice namespaces and practice tenants |
| beside 8 | W3 what is copied is what was tested | the site's checks and code blocks; 54 blocks in m01, m03 and m06 to m09 | A command or file copied from a lesson is the text the lesson tested: a test compares every block on the built page with its source; fenced blocks get a Copy button |
| beside 8 | L7 pods start after a sleep | `lgtm/lab/**`, module m00 step 7 | Calico renews its CNI token often enough to outlast a night's pause; one command for after a longer one; the lab's check names the fault; the runbook and the lesson tell the learner |
| 9 and later | FG figures | `lgtm/learn/src/figures/**` | Stageshow scenes for the figures the content cards asked for, and the overview hero; one or two sessions |
| 9 to 10 | C12 to C16 content | one module each | Modules m13 to m17, three sessions at a time, in order |
| 11 | C17 capstone | module m18 | Game days, interview bank, the exam steps (the mock pools exist since wave 4) |
| 11 | QA sweep | none (planner) | Full walk-through on the live lab, link check, release |

That is about 30 worker sessions: 10 to build the site and the lab, 18 for content, 2 for figures.

How the two design skills are used here:
- `impeccable` is used on the site as it exists in `lgtm/learn`: its `init` writes `PRODUCT.md`, `shape` plans a page before code, `document` writes `DESIGN.md`, and `critique`, `audit` and `polish` review and finish. Those two files and the shared files under `.impeccable/` are committed in `lgtm/learn`, so every later session designs to them. The skill runs an engine binary that it downloads once from the project's GitHub releases into `~/.impeccable/bin` and checks against the checksums shipped with the skill; the owner accepted that with the skill. Its edit hook and its live mode are not installed. Fonts are self-hosted, no CDN is used, and no third-party origin is added to the content security policy.
- The design session stops at three checkpoints for the owner (structure and look, first draft, anything that changes how every step is written). It is run with the owner in it, not unattended. The owner brings the aesthetics and images; the four screenshots of 2026-11-11 are references for structure only.
- `stageshow` scenes are React components under `lgtm/learn/src/figures/`, with the kit copied in beside them. A lesson names a figure by id and gives a brief; the site shows a labelled placeholder until the scene exists. Scenes take the site's tokens, keep a still for reduced motion, and are filmed with the skill's own tools before they are merged. The skill's bundled app icons and third-party brand marks are not copied into the repository.

Wave 1 cards are written in full. Wave 2 cards are written in full but are re-checked against what wave 1 delivered before they start. Later cards are written when the wave before them is merged, from `cards/content-module-template.md` for content.

## 9. Roles and rules

- **Planner (the session that wrote this):** owns the plan, the contracts and the cards; starts workers; reviews and merges; keeps `docs/plan/` current. Workers do not edit `docs/plan/`. A worker who needs a contract changed says so in the pull request; the planner changes it.
- **Workers:** one card, one branch, one pull request. They stay inside the paths the card lists. They do not start sub-agents unless the card says so. They do not start, stop or rebuild the owner's running apps or VMs.
- **Voice:** `/caveman` is for chat only. Lesson text, code, comments, commit messages, pull requests and docs are written in plain, complete English.
- **Facts:** every technical statement in lesson content, and every version pin, is checked against an official page fetched during the session, and the URL is recorded. Model memory is not a source: the stack changed a lot in 2025 and 2026.
- **Ids:** step ids and question ids key saved progress. They are never renamed or reused.

## 10. QA gate for every pull request

1. The card's "done when" list is met, item by item, with evidence in the pull request text.
2. Tests and linters named in the card pass locally in the planner's checkout and in CI.
3. Only owned paths changed.
4. Planner review of the diff; for content, a sample of at least 10 statements per module re-checked against their sources, and every lab step run on the live lab once the lab exists.
5. Then merge, delete the branch, pull `main` into the owner's main checkout (fast-forward only). The planner never restarts the owner's apps.

## 11. Things only the owner can do

1. Read this plan and say go.
2. Run the VM script in an elevated PowerShell (Hyper-V needs administrator rights; agent sessions are not elevated).
3. Free disk space or name another drive for the VM disks.
4. Make the GHCR packages public after their first publish, or accept an image pull secret in the cluster.
5. Sit in the design session in wave 4: pick one of the directions it proposes, look at the first draft, confirm the key choices.
6. Read the content pilot (wave 3) and confirm the pattern.
7. Pick the address of the site on the server when it is deployed (for example the Gate path).

## 12. Risks

| Risk | What we do |
|---|---|
| Hyper-V VM automation cannot be tested by agents (no administrator rights) | L1 delivers `-WhatIf` output, script analysis and unit tests; the owner runs the acceptance checklist; the planner fixes what it shows |
| WSL to Hyper-V networking | WSL already runs in mirrored mode, which should reach the internal switch through the host; L1 documents the check and the fallback |
| Lab does not fit in RAM or disk | Budget table from L3; sizes are variables; retention is short |
| Loki 4.0 ships mid-project | Stay on 3.7; one later card upgrades and updates the Loki module |
| Charts move repositories (Mimir) | Pin chart source and version in the values file; ADR records where it came from |
| Usage limit shared by all sessions | Never more than 3 workers; cards forbid sub-agents and repeated verification |
| Content volume (about 245 steps, 700 questions) | Pilot first; one module per session; verification logs make review a sample, not a rewrite |
| Trimmed demo drifts from upstream | Record the upstream tag and every removed service in `lgtm/lab/demo/TRIMMING.md`; no plan to track upstream after 3.1.0 |

## 13. The owner's verdict on the pilot, and the redesign (2026-11-11)

The owner read module m02 in the site and rejected the form of a step. The facts and the lab step stay; the page and the way the text is built change.

What the owner said about the page as S1 and the pilot left it:
- It is hard to follow. Each block stacked on the one before reads as a new topic, not as the next part of one explanation.
- Everything sits in one narrow column and the screen is wasted.
- "Why this matters" and "The idea" do not stand apart from each other; they should be distinct parts, with icons.
- A step should be an article, read from top to bottom. Where an article would carry a picture, a step carries a diagram or an information part: why the thing exists, the problem it solves, and the like.
- A step has two tabs, Learn and Practice. Practice appears only where the step has something to do; otherwise there is only Learn.
- The text itself must be rewritten as an article, not as a list of labelled boxes.

What the owner gave as references: four screenshots of article and landing pages. They are references for structure only: how the page is divided, what sits beside what, how sections follow each other. They are not the look. The owner brings the aesthetics and its images to the design worker in that session.

What follows from it:
1. Card DZ is now "the lesson page as an article": the structure of the page, the new parts a step is built from, and the site's design, built in `lgtm/learn`, with the owner in the session. It rewrites two steps of m02 as specimens, one concept step and the lab step, so the form is proven on real text.
2. DZ proposes the new form of a step in an ADR. The planner then folds it into `03-content-contract.md` as version 2. Until then nobody writes new steps. (Done on 2026-11-11: `lgtm/docs/adr/dz-article-format.md`, approved by the owner on the specimens `m02-s10` and `m02-s06`; the contract is at version 2.)
3. Card C0b rewrites the other eleven steps of m02 to that form. The first plan was that the owner reads the module again before any other module is written. The owner changed that on 2026-11-11: having approved the form on the two specimens, they asked for the next wave to start while DZ finishes, so C0b, C1 and C2 run together.
4. The rule "one step per screen, no list of steps to tick beside it" stays: it came from the owner. An article with a sidebar for looking things up is what the owner already described for saa-plan.

Skills every worker loads from 2026-11-11 on, by the owner's instruction: `caveman` (chat voice), `humanizer` (every text a person will read is passed through it before it is saved: lesson text, docs, pull request text) and `ponytail` (the smallest change that fully solves the task, and a reply that reads in one pass). They are skills of the owner's claude.ai account. The design card also uses `impeccable`, and the figures card `stageshow`.
