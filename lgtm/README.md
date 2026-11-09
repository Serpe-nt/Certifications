# LGTM study helper

A hands-on course on observability with the Grafana LGTM stack (Loki, Grafana, Tempo, Mimir), Grafana Alloy, Prometheus and OpenTelemetry, aimed at DevOps and SRE jobs and at the OTCA and PCA certifications.

Status: planned, not built. The plan is in [docs/plan/00-overview.md](docs/plan/00-overview.md).

| Folder | What it is |
|---|---|
| `learn/` | The study website: one step per card, lab checks, quizzes, review, two mock exams. One Docker container. |
| `lab/` | The practice environment on your own PC: Hyper-V VMs, a kubeadm cluster built with Ansible, the stack in microservices mode installed with Helm, and a shop application that emits traces, metrics and logs and can be broken on purpose. |
| `docs/research/` | What was checked on the web before planning: current versions, certification facts, the OpenTelemetry Demo. |
| `docs/plan/` | The plan, the contracts between the parts, and the worker cards. |

The course in one line: set up the cluster, learn Helm by installing the lab with it, then fundamentals, Prometheus and PromQL, Grafana, Kubernetes monitoring, OpenTelemetry (SDK, then Collector), Alloy, Mimir, Loki, Tempo, correlation and incident debugging, alerting and SLOs, observability as code, running it at scale, and a capstone with interview practice and mock exams. The full outline is in [docs/plan/01-curriculum.md](docs/plan/01-curriculum.md).
