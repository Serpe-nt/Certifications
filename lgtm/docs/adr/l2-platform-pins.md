# L2: Versions pinned by the platform card

Status: accepted by worker L2 on 2026-11-09.

## Context

Card rule 6: check versions on the day and record what was pinned and why. The four choices
with alternatives have their own records: `l2-helm-version.md`, `l2-s3-store.md`,
`l2-gateway-controller.md`, `l2-kafka-operator.md`. This file lists every other pin. All pins
live in one file, `lgtm/lab/helm/platform/versions.yml`; `tests/platform/render.sh` fails when a
rendered chart uses an image that is not listed there.

## Decisions

| Item | Pin | Source checked on 2026-11-09 | Note |
|---|---|---|---|
| Longhorn | chart and app 1.13.0 | https://github.com/longhorn/longhorn/releases/tag/v1.13.0, https://charts.longhorn.io/index.yaml | Newest minor. Needs Kubernetes 1.34 or later (the lab runs 1.35). 1.12.2 was published the same day as a patch of the older line. |
| Longhorn node requirement | open-iscsi must not be 2.1.12 | https://longhorn.io/docs/1.13.0/deploy/install/ ("Critical Incompatibility with open-iscsi 2.1.12") | Ubuntu 24.04 ships 2.1.9 (L1's note in `l1-tool-pins.md`); `node_prereqs` installs it with the NFS client and cryptsetup. |
| cert-manager | chart and app v1.21.3 | https://cert-manager.io/docs/releases/, https://charts.jetstack.io/index.yaml | 1.21 supports Kubernetes 1.33 to 1.36. 1.22 is expected in November 2026. |
| metrics-server | chart 3.14.0, app v0.9.0 | https://kubernetes-sigs.github.io/metrics-server/index.yaml, https://github.com/kubernetes-sigs/metrics-server/releases | App v0.9.1 (2026-10-29) has no chart yet; the chart's own default image is kept. |
| metrics-server flag | `--kubelet-insecure-tls` | kubeadm config in `ansible/roles/master_init` (no `serverTLSBootstrap`) | The lab's kubelets serve self-signed certificates. A lab simplification, documented in `lgtm/lab/docs/platform.md`. |
| Envoy Proxy image | `envoyproxy/envoy:distroless-v1.40.2` | `api/v1alpha1/shared_types.go` at envoyproxy/gateway v1.10.0 (`DefaultEnvoyProxyImage`) | Set explicitly in the `EnvoyProxy` resource so the pin is visible. |
| Kafka | 4.3.2, metadata version 4.3-IV0, image `quay.io/strimzi/kafka:1.3.1-kafka-4.3.2` | Strimzi 1.3.1 release notes and examples | Newest Kafka that Strimzi 1.3.1 runs. |
| RustFS image | `rustfs/rustfs:1.0.4` | https://hub.docker.com/r/rustfs/rustfs/tags | Same as the chart's appVersion; set explicitly. |
| busybox | `busybox:1.37.0` | https://hub.docker.com/_/busybox (tag 1.37.0, 2026-10-28) | RustFS's init container defaults to the moving tag `stable`; pinned instead. Also used by the smoke test. |
| AWS CLI image | `amazon/aws-cli:2.39.7` | https://hub.docker.com/r/amazon/aws-cli/tags (2026-11-09) | Creates the buckets and runs the S3 test. |
| kubectl | v1.35.10, SHA-256 `c49a28f1...6327` | https://dl.k8s.io/release/v1.35.10/bin/linux/amd64/kubectl.sha256 | Same pin as card D1. |
| kind | v0.33.0, SHA-256 `aee61515...8e0d` | https://github.com/kubernetes-sigs/kind/releases/tag/v0.33.0 | Same pin as card D1. Node image `kindest/node:v1.35.8@sha256:07b2536e...` from the same release notes. |
| kubeconform | v0.8.0, SHA-256 `9bc2bffb...7883` | https://github.com/yannh/kubeconform/releases/download/v0.8.0/CHECKSUMS | Same pin as card D1. |
| Helm | v4.3.1, SHA-256 `0403a88a...fe54b` | https://get.helm.sh/helm-v4.3.1-linux-amd64.tar.gz.sha256sum | See `l2-helm-version.md`. |
| kubernetes (Python) | 37.0.2 | https://pypi.org/project/kubernetes/ | Needed by the `kubernetes.core` modules; added to `ansible/requirements-dev.txt`. |

## Seen while checking, for later cards

- Calico 3.31.7 and 3.33.0 exist (`l1-tool-pins.md`); Calico 3.31's own Ingress Gateway is
  based on an older Envoy Gateway than upstream 1.10.0 (`l2-gateway-controller.md`).
- kubernetes.core 6.6.0 deprecates `wait_timeout` on `kubernetes.core.helm` in favour of
  `timeout`, and the `status.values` return value in favour of `status.release_values`.
- metrics-server v0.9.1 can replace v0.9.0 when chart 3.14.1 or later ships it.
