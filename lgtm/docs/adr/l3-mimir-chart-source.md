# L3: Where the Mimir chart comes from

Status: accepted by worker L3 on 2026-11-09.

## Context

The `mimir-distributed` chart is being moved from the grafana Helm repository to the
community-maintained grafana-community repository, like the Grafana, Loki and Tempo charts before
it. The research file (`../research/01-stack-versions.md`) records that its unreleased changelog
says "Deprecate and move the chart to the community-maintained grafana-community/helm-charts
repository", and that 6.3.0 is announced as its last release in the old place. The card asks to
pin where the chart comes from and to say so here.

What the repositories held on 2026-11-09, read from their `index.yaml`:

- `https://grafana-community.github.io/helm-charts/index.yaml`: no `mimir-distributed` entry
  (it holds `grafana` 14.4.0, `loki` 21.1.0, `tempo-distributed` 3.27.0 and others).
- `https://grafana.github.io/helm-charts/index.yaml`: `mimir-distributed` 6.2.2 (appVersion 3.2.3,
  created 2026-10-26) is the newest stable release. 6.3.0 exists only as weekly pre-releases
  (`6.3.0-weekly.419`, appVersion `r419-18705415`, 2026-11-02).
- Mimir 3.2.4 is the newest release of the application (2026-10-30,
  https://github.com/grafana/mimir/releases).

## Options

1. `mimir-distributed` 6.2.2 from `https://grafana.github.io/helm-charts`, image tag 3.2.4.
2. A 6.3.0 weekly pre-release from the same repository.
3. Wait for the chart to appear in grafana-community.

## Decision

Option 1. The chart is pinned in `lgtm/lab/helm/mimir/VERSION` to repository
`https://grafana.github.io/helm-charts`, chart `mimir-distributed`, version 6.2.2, and
`helm/mimir/values.yaml` sets `image.tag: 3.2.4`, a patch release on the same 3.2 line as the
chart's own appVersion 3.2.3. Weekly charts carry weekly Mimir builds and are not meant for a
course that must stay reproducible.

The values do not depend on the repository: when the chart is published in grafana-community,
moving means changing `repository` (and `version`) in `VERSION`, running `make lab-lint` and
`make lab TAGS=mimir`. The chart's demo Kafka and its MinIO subchart are both turned off; the lab
uses the platform's Kafka and S3 store.

## Sources

- https://grafana.github.io/helm-charts/index.yaml (read 2026-11-09)
- https://grafana-community.github.io/helm-charts/index.yaml (read 2026-11-09)
- https://raw.githubusercontent.com/grafana/mimir/main/operations/helm/charts/mimir-distributed/CHANGELOG.md
- https://github.com/grafana/helm-charts/tree/main/charts/mimir-distributed (relocation notice)
- https://github.com/grafana/mimir/releases
