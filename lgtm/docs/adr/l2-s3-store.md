# L2: RustFS as the lab's S3 store

Status: accepted by worker L2 on 2026-11-09.

## Context

Mimir, Loki and Tempo keep their blocks, chunks and rules in object storage. The lab needs one
small S3-compatible store inside the cluster, on a Longhorn volume, with the six buckets of the
lab contract and the Secret `lab-s3` (keys `endpoint`, `region`, `access_key`, `secret_key`)
copied into `mimir`, `loki` and `tempo`. MinIO's community images are no longer published, so
the old default is gone (`lgtm/docs/research/01-stack-versions.md`, "Object storage for a local
lab"). The card names the three stores that current Grafana examples and charts use: RustFS,
Garage and PGSTY Silo (the MinIO fork formerly called `pgsty/minio`).

## What each project offers (official pages, 2026-11-09)

| | RustFS | Garage | PGSTY Silo |
|---|---|---|---|
| Version | 1.0.4 (2026-10-25); 1.0.0 GA on 2026-09-16 | v2.5.0 (2026-10-24) | RELEASE.2026-11-09T00-00-00Z |
| License | Apache-2.0 | AGPL-3.0 | AGPL-3.0 |
| Kubernetes install | Helm chart published at https://charts.rustfs.com (chart 1.0.4), standalone (one pod, one volume) or distributed mode | Helm chart only inside the source repository (`git clone`, `script/helm/garage`); not published to a chart repository | "Tenant Helm chart" on top of the MinIO Operator v7.1.1, whose upstream repository is archived and is treated "as a frozen compatibility baseline" |
| Credentials | Root keys from a Secret (`secret.existingSecret`) | Keys created with the `garage` CLI or `GARAGE_DEFAULT_ACCESS_KEY`; bucket creation must be allowed per key | Root user and password, as MinIO |
| Web screen | Console on port 9001 | None in the server | Full console |
| Named by Grafana | Loki chart README (with Garage); Tempo's distributed Docker Compose example | Loki chart README | Mimir chart default image, Loki getting-started Compose file |

Sources:
- RustFS: https://github.com/rustfs/rustfs/releases, https://github.com/rustfs/rustfs/tree/main/helm
  (README and `rustfs/values.yaml`), https://charts.rustfs.com/index.yaml
- Garage: https://garagehq.deuxfleurs.fr/documentation/cookbook/kubernetes/,
  https://garagehq.deuxfleurs.fr/documentation/quick-start/,
  https://git.deuxfleurs.fr/api/v1/repos/Deuxfleurs/garage/releases
- Silo: https://github.com/pgsty/silo (README: "On 2026-08-06, `pgsty/minio` became
  `pgsty/silo`"), https://silo.pgsty.com/download/
- Grafana: research file above, sections "Object storage for a local lab".

## The test

`lgtm/lab/tests/platform/compare-s3.sh` runs each store as one Docker container and runs
`lgtm/lab/tests/platform/s3-test.sh` against it with the AWS CLI 2.39.7 (a standard S3 client):
create the six lab buckets, then on a scratch bucket put an object, list it, read bytes 9 to 12,
upload 20 MiB in three parts (multipart, checked by the `-3` ETag suffix), download and compare
it, delete the objects and the bucket. Result on 2026-11-09:

| Store | Image | Result | Memory after the test | Image size |
|---|---|---|---|---|
| RustFS | `rustfs/rustfs:1.0.4` | S3 TEST PASSED | 200 MiB | 419 MB |
| Garage | `dxflrs/garage:v2.5.0` | S3 TEST PASSED (after `garage key allow --create-bucket`) | 11 MiB | 97 MB |
| Silo | `pgsty/silo:RELEASE.2026-11-09T00-00-00Z` | S3 TEST PASSED | 120 MiB | 238 MB |

All three handle everything the Grafana databases need. The difference is how they install and
run on Kubernetes.

## Decision

**RustFS 1.0.4**, chart `rustfs` 1.0.4 from https://charts.rustfs.com, release `rustfs` in
namespace `s3`, standalone mode, one 25 GiB Longhorn volume (2 GiB on kind). Reasons:

1. It is the only one of the three with a published, versioned Helm chart that runs it
   directly; the lab installs everything as pinned Helm releases.
2. Apache-2.0, 1.0 since September 2026, and the store used by Grafana's own Tempo example.
3. It has a web console, so the `s3` address of the lab contract opens a real screen.
4. Root keys come from a Secret the playbook generates, with no extra CLI step.

Its cost is memory: about 200 MiB idle against Garage's 11 MiB. The lab gives it a 256 MiB
request and a 1 GiB limit.

The S3 API is `http://rustfs-svc.s3.svc:9000`, path-style addressing. The `lab-s3` Secret holds
`endpoint` as `rustfs-svc.s3.svc:9000` (host and port, no scheme, which is what the S3 settings
of Mimir, Loki and Tempo take together with `insecure: true`), plus `endpoint_url`
(`http://rustfs-svc.s3.svc:9000`) for clients that want a URL, such as the AWS CLI.

## Fallback

If RustFS fails in the lab, use **Garage**: it passed the same test, uses the least memory, and
its single-node mode (`garage.singleNode: true` in its chart) fits one Longhorn volume. Its chart
would be vendored from the Garage repository at tag v2.5.0 into `lgtm/lab/helm/platform/`, and
the playbook would create the key with `garage key import` and allow bucket creation. Only the
`platform_s3` role and its values change; the `lab-s3` Secret keeps its keys, so card L3's
releases do not change. Silo is the second fallback, run as a plain StatefulSet, because its
Kubernetes path depends on an archived operator.
