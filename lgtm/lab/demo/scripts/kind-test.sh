#!/usr/bin/env bash
# Install the shop chart on a throwaway kind cluster and check it end to end.
#
#   ./scripts/kind-test.sh          create the cluster, load the local images,
#                                   install, check (needs `make build` first)
#   ./scripts/kind-test.sh delete   delete the cluster
#
# The cluster is named $KIND_CLUSTER (default lgtm-d1). Its kubeconfig is
# written to lgtm/lab/.bin/<cluster>.kubeconfig, never to ~/.kube/config.
# A debug-only collector stands in for the lab's otel-gateway.
set -euo pipefail
cd "$(dirname "$0")/.."

cluster="${KIND_CLUSTER:-lgtm-d1}"
bin="$(cd .. && pwd)/.bin"
export KUBECONFIG="$bin/$cluster.kubeconfig"
kind="$bin/kind"
kubectl="$bin/kubectl"
helm="$bin/helm"
local_port="${KIND_PORT:-8097}"
version="$(cat VERSION)"
# kind v0.33.0's image for Kubernetes 1.35, the lab's version.
node_image="kindest/node:v1.35.8@sha256:07b2536e30b803ed61d1677a79df6115f798ce64c80f9e22f6ed45afd09323c0"
services=(ad cart checkout flagd-ui fraud-detection frontend frontend-proxy image-provider kafka load-generator payment product-catalog recommendation)

if [ "${1:-}" = "delete" ]; then
  "$kind" delete cluster --name "$cluster"
  rm -f "$KUBECONFIG"
  exit 0
fi

if ! "$kind" get clusters | grep -qx "$cluster"; then
  echo "==> Creating kind cluster $cluster"
  "$kind" create cluster --name "$cluster" --image "$node_image" --kubeconfig "$KUBECONFIG" --wait 120s
fi

echo "==> Loading the locally built images"
for s in "${services[@]}"; do
  "$kind" load docker-image --name "$cluster" "ghcr.io/serpe-nt/lgtm-demo:$version-$s"
done

echo "==> Installing the otel-gateway stand-in"
"$kubectl" create namespace otel --dry-run=client -o yaml | "$kubectl" apply -f -
"$kubectl" -n otel create configmap otel-gateway \
  --from-file=config.yaml=src/otel-collector/otelcol-config.yml --dry-run=client -o yaml | "$kubectl" apply -f -
"$kubectl" apply -f test/kind/otel-gateway.yaml
"$kubectl" -n otel rollout status deployment/otel-gateway --timeout=180s

echo "==> Installing the shop chart"
"$helm" upgrade --install shop chart --namespace shop --create-namespace \
  --set image.pullPolicy=Never --wait --timeout 15m

echo "==> Pods"
"$kubectl" -n shop get pods -o wide
"$kubectl" -n shop wait --for=condition=Ready pod --all --timeout=300s

echo "==> Shop page through a port-forward on 127.0.0.1:$local_port"
"$kubectl" -n shop port-forward svc/frontend-proxy "$local_port:8080" >/dev/null 2>&1 &
pf=$!
trap 'kill $pf 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -fs -o /dev/null "http://127.0.0.1:$local_port/" && break; sleep 1; done
curl -fsS "http://127.0.0.1:$local_port/" | grep -o '<title[^>]*>[^<]*' | sed 's/.*>/    page title: /'
echo "    products: $(curl -fsS "http://127.0.0.1:$local_port/api/products" | grep -o '"id":' | wc -l)"
echo "    flag screen: HTTP $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$local_port/feature")"
echo "    load generator UI: HTTP $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$local_port/loadgen/")"

echo "==> Orders end to end (waiting 90 s for the load generator)"
sleep 90
placed="$("$kubectl" -n otel logs deploy/otel-gateway --since=100s | grep -c 'order placed' || true)"
consumed="$("$kubectl" -n shop logs deploy/fraud-detection --since=100s | grep -c 'Consumed record' || true)"
echo "    orders placed (checkout logs at the gateway): $placed"
echo "    orders consumed from Kafka by fraud-detection: $consumed"
[ "$placed" -gt 0 ] && [ "$consumed" -gt 0 ] || { echo "KIND TEST FAILED"; exit 1; }
echo "KIND TEST PASSED. Delete the cluster with: ./scripts/kind-test.sh delete"
