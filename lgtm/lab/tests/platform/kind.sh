#!/usr/bin/env bash
# Creates or deletes the kind test cluster of card L2.
#
#   tests/platform/kind.sh create   one control plane and three workers; NodePorts 30080
#                                   and 30443 published on 127.0.0.1 (18080 and 18443)
#   tests/platform/kind.sh delete
#
# Environment (set by `make platform-kind`): KIND_CLUSTER (default lgtm-l2), KUBECONFIG
# (the cluster's own file, never ~/.kube/config), PLATFORM_KIND_HTTP_PORT and
# PLATFORM_KIND_HTTPS_PORT. The tools come from lgtm/lab/.bin (`make platform-tools`).
set -euo pipefail

lab="$(cd "$(dirname "$0")/../.." && pwd)"
bin="$lab/.bin"
cluster="${KIND_CLUSTER:-lgtm-l2}"
export KUBECONFIG="${KUBECONFIG:-$bin/$cluster.kubeconfig}"
http_port="${PLATFORM_KIND_HTTP_PORT:-18080}"
https_port="${PLATFORM_KIND_HTTPS_PORT:-18443}"
node_image="$(awk '/^platform_kind_node_image:/ {print $2}' "$lab/helm/platform/versions.yml")"

if [ "$(realpath -m "$KUBECONFIG")" = "$(realpath -m "$HOME/.kube/config")" ]; then
  echo "Refusing to use ~/.kube/config; pass the kind cluster's own file." >&2
  exit 1
fi
[ -x "$bin/kind" ] || { echo "Missing $bin/kind: run make platform-tools" >&2; exit 1; }

case "${1:-}" in
  create)
    if "$bin/kind" get clusters | grep -qx "$cluster"; then
      echo "kind cluster $cluster exists"
    else
      "$bin/kind" create cluster --name "$cluster" --image "$node_image" --wait 180s --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30080
        hostPort: $http_port
        listenAddress: 127.0.0.1
      - containerPort: 30443
        hostPort: $https_port
        listenAddress: 127.0.0.1
  - role: worker
  - role: worker
  - role: worker
EOF
    fi
    docker port "$cluster-control-plane"
    echo "Kubeconfig: $KUBECONFIG"
    ;;
  delete)
    "$bin/kind" delete cluster --name "$cluster"
    rm -f "$KUBECONFIG"
    ;;
  *)
    echo "usage: $0 create|delete" >&2
    exit 2
    ;;
esac
