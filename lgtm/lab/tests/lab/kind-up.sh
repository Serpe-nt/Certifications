#!/usr/bin/env bash
# Create the kind test cluster for the LGTM releases and stand in for the
# platform that card L2 builds on the real cluster.
#
#   tests/lab/kind-up.sh          create cluster lgtm-l3 and the stand-ins
#   tests/lab/kind-up.sh delete   delete the cluster and its kubeconfig
#
# Run from lgtm/lab (make lab-kind-up / make lab-kind-down). The kubeconfig is
# written to lgtm/lab/.bin/lgtm-l3.kubeconfig, never to ~/.kube/config.
#
# Stand-ins, all under the names of the lab contract's "Platform interfaces":
#   - Gateway "lab" in namespace "gateway" (Envoy Gateway, NodePort 30080,
#     published on 127.0.0.1:28080),
#   - one RustFS pod as the S3 store, the six buckets, and Secret lab-s3 in
#     mimir, loki and tempo,
#   - one Kafka node behind telemetry-kafka-bootstrap.kafka.svc:9092,
#   - kind's own StorageClass "standard" instead of Longhorn.
set -euo pipefail
cd "$(dirname "$0")/../.."

cluster="${KIND_CLUSTER:-lgtm-l3}"
bin="$PWD/.bin"
export KUBECONFIG="${LAB_KUBECONFIG:-$bin/$cluster.kubeconfig}"
export HELM_CACHE_HOME="$bin/helm-home/cache" HELM_CONFIG_HOME="$bin/helm-home/config" HELM_DATA_HOME="$bin/helm-home/data"
kind="$bin/kind"
kubectl="$bin/kubectl"
helm="$bin/helm"
here="tests/lab"
# kind v0.33.0's image for Kubernetes 1.35, the lab's version (as in the demo's kind test).
node_image="kindest/node:v1.35.8@sha256:07b2536e30b803ed61d1677a79df6115f798ce64c80f9e22f6ed45afd09323c0"
# The Envoy Gateway release card L2 pins for the real cluster.
envoy_gateway_version="v1.10.0"

if [ "${1:-}" = "delete" ]; then
  "$kind" delete cluster --name "$cluster"
  rm -f "$KUBECONFIG"
  exit 0
fi

if ! "$kind" get clusters | grep -qx "$cluster"; then
  echo "==> Creating kind cluster $cluster"
  "$kind" create cluster --name "$cluster" --image "$node_image" \
    --config "$here/kind-config.yaml" --kubeconfig "$KUBECONFIG" --wait 120s
fi

echo "==> Envoy Gateway $envoy_gateway_version (stand-in for the platform gateway)"
"$helm" upgrade --install envoy-gateway oci://docker.io/envoyproxy/gateway-helm \
  --version "$envoy_gateway_version" --namespace envoy-gateway-system --create-namespace \
  --set deployment.envoyGateway.resources.requests.cpu=50m \
  --set deployment.envoyGateway.resources.requests.memory=128Mi \
  --set deployment.envoyGateway.resources.limits.memory=512Mi \
  --wait --timeout 5m
for ns in gateway s3 mimir loki tempo; do
  "$kubectl" create namespace "$ns" --dry-run=client -o yaml | "$kubectl" apply -f -
done
"$kubectl" apply -f "$here/standins/gateway.yaml"

echo "==> S3 store and buckets (stand-in)"
if ! "$kubectl" -n s3 get secret s3-root >/dev/null 2>&1; then
  access="lab$(head -c 6 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  secret="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  "$kubectl" -n s3 create secret generic s3-root \
    --from-literal=access_key="$access" --from-literal=secret_key="$secret"
fi
access="$("$kubectl" -n s3 get secret s3-root -o jsonpath='{.data.access_key}' | base64 -d)"
secret="$("$kubectl" -n s3 get secret s3-root -o jsonpath='{.data.secret_key}' | base64 -d)"
for ns in mimir loki tempo; do
  "$kubectl" -n "$ns" create secret generic lab-s3 \
    --from-literal=endpoint=s3.s3.svc:9000 --from-literal=region=us-east-1 \
    --from-literal=access_key="$access" --from-literal=secret_key="$secret" \
    --dry-run=client -o yaml | "$kubectl" apply -f -
done
"$kubectl" apply -f "$here/standins/s3.yaml"

echo "==> Kafka (stand-in)"
"$kubectl" apply -f "$here/standins/kafka.yaml"

echo "==> Waiting for the stand-ins"
"$kubectl" -n s3 rollout status deployment/s3 --timeout=300s
"$kubectl" -n s3 wait --for=condition=complete job/s3-buckets --timeout=300s
"$kubectl" -n kafka rollout status statefulset/telemetry-kafka --timeout=300s
"$kubectl" -n gateway wait --for=condition=Programmed gateway/lab --timeout=300s
echo "kind cluster $cluster is ready. KUBECONFIG=$KUBECONFIG"
