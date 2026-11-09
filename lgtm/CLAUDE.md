# LGTM study helper

A course on observability with the Grafana LGTM stack and OpenTelemetry, in two parts: `learn/` (the study website) and `lab/` (Hyper-V VMs, an Ansible-built Kubernetes cluster, the stack installed with Helm, a trimmed OpenTelemetry Demo shop). It is being built by worker sessions from cards; a planning session reviews and merges.

Read before changing anything:
- `docs/plan/00-overview.md`: decisions, layout, versions, waves, QA gate.
- `docs/plan/02-lab-contract.md`: every name the lab, the site and the lessons share.
- `docs/plan/03-content-contract.md`: the format and writing rules for steps and questions.
- `docs/plan/cards/README.md`: the rules every worker follows; your own card if you have one.

## Rules

- One card, one branch, one pull request. Stay inside the paths your card owns. Do not edit `docs/plan/`.
- Chat may be terse (`/caveman`). Everything saved to the repository is plain, complete English: lesson text, code, comments, commit messages, pull requests, docs.
- Facts and versions come from an official page fetched in the session, never from memory. This stack changed a great deal in 2025 and 2026: charts moved to `grafana-community`, Promtail and Grafana Agent are gone, Loki's simple scalable mode is being removed, Tempo 3 and Mimir 3 ingest through Kafka, MinIO community images are no longer published. `docs/research/` has the details and their sources.
- Step ids and question ids key the learner's saved progress. Never rename or reuse one.
- Never touch what the owner runs: the saa-plan app (ports 8080, 8091 and 8181), their VMs, `~/.kube/config`, Windows and WSL settings and packages. Test servers use the ports `docs/plan/cards/README.md` gives your card; test clusters are kind clusters named `lgtm-<card id>` that you delete afterwards; tools go into git-ignored folders inside the worktree.
- Never commit a secret, a kubeconfig, a key or a generated password.
- `lab/ansible` began as a copy of the owner's `k8s-provision` playbooks (commit `8442dee`). Its roles must stay free of anything tied to one hypervisor. Changes to the copied roles are listed in `lab/ansible/CHANGES.md`.
- Two design skills are installed for this project: `web-design-engineer` for the site's own screens and `stageshow` for illustrations (lesson figures, the overview hero). Use them only in the cards that name them, and under the limits in `docs/plan/00-overview.md` section 8: no CDN scripts or fonts in `learn/`, no third-party brand assets in the repository.
- All files under `lgtm/` use LF line endings (`.gitattributes`); the lab runs on Linux.
