# L2: Helm 4 (4.3.1) for every release of the lab

Status: accepted by worker L2 on 2026-11-09.

## Context

The whole lab is installed as Helm releases driven by Ansible (`kubernetes.core.helm`), and
the course opens with a Helm module. The card asks whether Helm 3 or Helm 4 should be pinned,
judged by what the charts of the overview's version table require today.

## Facts checked on 2026-11-09

- Current releases: Helm v4.3.1 (2026-10-15) and Helm v3.22.1 (2026-10-15).
  Source: https://github.com/helm/helm/releases (GitHub API, `repos/helm/helm/releases`).
- Helm 3 is at its end of life. "A final, limited Helm 3 feature release will be September
  9th, 2026, with security patches continuing to be provided through February 2027." Bug
  fixes stopped with that release; security fixes end on February 10, 2027; after that there
  are no Helm 3 releases at all. Source: https://helm.sh/blog/helm-v3-end-of-life (posted
  2026-06-02).
- The Ansible collection supports Helm 4: kubernetes.core 6.4.0 "adds Helm v4 compatibility
  across the Helm modules", 6.5.0 maps `atomic` and `force` to the Helm 4 flags and adds
  `server_side`, 6.6.0 (pinned by L1) handles Helm 4.2.1's OCI output change.
  Source: https://raw.githubusercontent.com/ansible-collections/kubernetes.core/main/CHANGELOG.rst
- The charts the lab uses install with Helm 4. None of the platform charts (`Chart.yaml`
  of metrics-server 3.14.0, cert-manager v1.21.3, gateway-helm v1.10.0, longhorn 1.13.0,
  rustfs 1.0.4, strimzi-kafka-operator 1.3.1, pulled on the day) requires Helm 3, and all of
  them were installed on the kind test cluster with Helm 4.3.1. Card D1 already pinned Helm
  4.3.1 for the shop chart (`lgtm/lab/demo/scripts/tools.sh`).

## Options

1. Helm 3.22.1: what most tutorials still show; security fixes only, ending 2027-02-10, which
   is inside the life of this course.
2. Helm 4.3.1: the maintained line; server-side apply by default, new plugin system.

## Decision

Helm **v4.3.1**, downloaded by the `platform_tools` role (or `make platform-tools`) into
`lgtm/lab/.bin/helm` and checked against the published SHA-256
(`0403a88a...fe54b`, https://get.helm.sh/helm-v4.3.1-linux-amd64.tar.gz.sha256sum). The pin
lives in `lgtm/lab/helm/platform/versions.yml`. Helm's cache, configuration and plugin folders
are pointed into `lgtm/lab/.bin/helm-home` so nothing is written to the learner's home.

## Consequences

- The Helm module of the course teaches Helm 4. Where it differs from Helm 3 (server-side apply
  by default, `--rollback-on-failure` instead of `--atomic`, `--force-replace` instead of
  `--force`), lessons say so, because learners will meet Helm 3 in older material and jobs.
- If a later chart needs Helm 3 only, that is a reason to replace the chart, not to downgrade.
