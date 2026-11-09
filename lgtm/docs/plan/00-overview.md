# LGTM study helper: plan overview

Status on 2026-11-09: approved by the owner. Wave 1 is merged (pull requests 22, 23 and 24): the site engine, the VM script with the cluster playbooks, and the trimmed demo with its chart and images. The VM script and `make cluster` have not yet run against real VMs; the owner runs `lgtm/lab/docs/acceptance-cluster.md`. Wave 2 is next.
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
| Cluster | Production-like from the first module: 3 control-plane nodes, 4 workers, 1 load balancer VM. Node counts stay variables. |
| Hypervisor | Hyper-V on the Windows 11 PC. VM creation is automated. The Ansible playbooks must work on any hypervisor: they only need SSH-reachable Ubuntu machines. |
| Cluster bootstrap | The owner's `k8s-provision` playbooks, copied (not forked) into `lgtm/lab/ansible` from commit `8442dee`. |
| Storage | Longhorn for volumes, one small S3-compatible store for objects. |
| Demo application | The official OpenTelemetry Demo, source copied and trimmed, shaped for the lessons. |
| Images | Built by GitHub Actions and pulled from GHCR. |
| Website stack | New stack: Astro, React islands, Tailwind, a small Node server with SQLite. |
| Lab checks | Paste-the-answer: the step asks for something only the finished lab can give, and the site validates it. No network link between the site and the lab. |
| Features carried over from saa-plan | XP, badges and celebrations; multi-device sync; review and weak spots. No focus timer. |
| Extra topic groups | Alerting, SLOs and on-call; observability as code; running it at scale. Profiles and eBPF get one overview step only. |
| Design of the site's screens | The `web-design-engineer` skill (github.com/ConardLi/garden-skills, version 1.3.0, commit `08150e7`), installed on 2026-11-09 at `~/.claude/skills/web-design-engineer`. The engine is built on design tokens so the design can be swapped in. |
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

The worker who installs a component re-checks its version on the day and records the pin in the values file. Longhorn, the S3 store, the Gateway API controller, the Kafka operator and Helm itself are pinned by worker L2 in an ADR.

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
| lb | 1 | 1 | 1 GB | 10 GB |
| master | 3 | 2 | 3 GB | 25 GB |
| worker | 4 | 6 | 9 GB | 30 GB system + 40 GB Longhorn |

Total 46 GB of the PC's 61.6 GB. All sizes are variables in one nodes file. Worker L3 must give every pod requests and limits and deliver a budget table; the target is the whole lab running with 15% of worker memory free.

Disk is the tight resource: drive C: has 121 GB free. The lab is planned for at most 90 GB of real use (short retention: 48 hours for logs and traces, 7 days for metrics). The owner should free space or name another drive for the VHDX files before wave 2 ends.

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
| 3 | D2 beacon and workshop | `lgtm/lab/tools/**`, `lgtm/lab/workshop/**` | Check-token emitter, the service to instrument by hand |
| 3 | L4 lab acceptance | fixes across `lgtm/lab/**` | The whole lab running on the real cluster, reference page of addresses, runbook |
| 3 | C0 content pilot | module m02 (observability fundamentals) | One finished concept module that sets the pattern; the owner reads it before the rest is written |
| 4 | DZ design | `lgtm/learn/src/styles/**`, component styling | The site's design with `web-design-engineer`; the owner answers its checkpoints (direction, first draft, key choices) in that session |
| 6 and later | FG figures | `lgtm/learn/src/figures/**` | Stageshow scenes for the figures the content cards asked for, and the overview hero; one or two sessions |
| 4 | C1 setup and Helm | modules m00 and m01 | Written against the accepted lab, every action run on it |
| 4 | C2 | module m03 | Prometheus fundamentals |
| 5 to 9 | C3 to C16 content | one module each | Modules m04 to m17, three sessions at a time, in order |
| 10 | C17 capstone and mocks | module m18, mock exam pools | Game days, interview bank, OTCA and PCA mock exams |
| 10 | QA sweep | none (planner) | Full walk-through on the live lab, link check, release |

That is about 29 worker sessions: 9 to build the site and the lab, 18 for content, 2 for figures.

How the two design skills are used here:
- `web-design-engineer` gives the direction, the design system, the first draft and the critique. Its defaults are stand-alone HTML prototypes that load React, fonts and chart libraries from CDNs; this project does not do that. The design lands in the Astro project's tokens and components, fonts are self-hosted, and no third-party origin is added to the content security policy. A throwaway prototype for choosing a direction may follow the skill's defaults, outside `lgtm/learn`.
- The skill stops three times for the owner's confirmation. The design session is therefore run with the owner in it, not unattended.
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
