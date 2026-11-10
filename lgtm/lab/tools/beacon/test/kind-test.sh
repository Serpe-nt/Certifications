#!/usr/bin/env bash
# Test the beacon on a throwaway kind cluster with a debug-only collector as
# otel-gateway.otel.svc, installed from the lab-glue chart's own template.
#
#   ./test/kind-test.sh          build the image, create the cluster, check
#                                the tokens for every seed of the shared test
#                                vectors, then the gateway outage and shutdown
#   ./test/kind-test.sh delete   delete the cluster
#
# Needs the pinned tools in lgtm/lab/.bin (bash lgtm/lab/demo/scripts/tools.sh),
# Docker and python3. The cluster is named $KIND_CLUSTER (default lgtm-d2), its
# kubeconfig is lgtm/lab/.bin/<cluster>.kubeconfig, never ~/.kube/config.
# OUTAGE_MINUTES (default 5) is how long the collector is away.
set -euo pipefail
cd "$(dirname "$0")/.."

cluster="${KIND_CLUSTER:-lgtm-d2}"
lab="$(cd ../.. && pwd)"
bin="$lab/.bin"
export KUBECONFIG="$bin/$cluster.kubeconfig"
kind="$bin/kind"
kubectl="$bin/kubectl"
helm="$bin/helm"
port="${BEACON_TEST_PORT:-8097}"
outage_minutes="${OUTAGE_MINUTES:-5}"
version="$(cat VERSION)"
image="ghcr.io/serpe-nt/lgtm-beacon:$version"
vectors="$lab/../learn/tests/fixtures/token-vectors.json"
# kind v0.33.0's image for Kubernetes 1.35, the lab's version.
node_image="kindest/node:v1.35.8@sha256:07b2536e30b803ed61d1677a79df6115f798ce64c80f9e22f6ed45afd09323c0"

if [ "${1:-}" = "delete" ]; then
  "$kind" delete cluster --name "$cluster"
  rm -f "$KUBECONFIG"
  exit 0
fi

echo "==> Building $image"
docker build -q --build-arg VERSION="$version" -t "$image" . >/dev/null

if ! "$kind" get clusters | grep -qx "$cluster"; then
  echo "==> Creating kind cluster $cluster"
  "$kind" create cluster --name "$cluster" --image "$node_image" --kubeconfig "$KUBECONFIG" --wait 120s
  # Keep the test small: the lab VMs hold most of the PC's memory.
  docker update --memory 3g --memory-swap 3g "$cluster-control-plane" >/dev/null
fi
"$kind" load docker-image --name "$cluster" "$image"

echo "==> Debug collector as otel-gateway.otel.svc"
"$kubectl" create namespace otel --dry-run=client -o yaml | "$kubectl" apply -f -
"$kubectl" apply -f test/collector.yaml
"$kubectl" -n otel rollout status deployment/otel-gateway --timeout=180s

"$kubectl" create namespace lab-tools --dry-run=client -o yaml | "$kubectl" apply -f -
set_seed() {
  "$kubectl" -n lab-tools create secret generic lab-seed --from-literal=seed="$1" \
    --dry-run=client -o yaml | "$kubectl" apply -f - >/dev/null
}

echo "==> Installing the beacon from the lab-glue chart (template beacon.yaml only)"
set_seed 0000000000000000
"$helm" template lab-glue "$lab/charts/lab-glue" --show-only templates/beacon.yaml \
  --set beacon.enabled=true --set beacon.pullPolicy=Never \
  | "$kubectl" apply -f -
"$kubectl" -n lab-tools rollout status deployment/beacon --timeout=120s

# The collector output of the last $1 goes to the file $out (it is large).
out="$(mktemp)"
trap 'rm -f "$out"' EXIT
collector_logs() { "$kubectl" -n otel logs deploy/otel-gateway --since="$1" >"$out"; }

# Waits for one full interval after a restart, so every signal has been sent.
restart_beacon() {
  "$kubectl" -n lab-tools rollout restart deployment/beacon >/dev/null
  "$kubectl" -n lab-tools rollout status deployment/beacon --timeout=120s >/dev/null
}

status=0
check() { # description, command...
  local what="$1"; shift
  if "$@"; then echo "    ok    $what"; else echo "    FAIL  $what"; status=1; fi
}

echo "==> Tokens for every seed of $vectors (published at the chart's interval, 1m)"
seeds="$(python3 -I -c 'import json,sys; print(" ".join(sorted({v["seed"] for v in json.load(open(sys.argv[1]))["vectors"]})))' "$vectors")"
for seed in $seeds; do
  echo "  seed $seed"
  set_seed "$seed"
  restart_beacon
  # The first tick is immediate; the gauge is exported after one interval.
  sleep 75
  collector_logs 80s
  while read -r slot token; do
    case "$slot" in
      log-*)
        check "log    $slot body carries payload.token $token" \
          grep -qF "\"slot\":\"$slot\",\"payload\":{\"token\":\"$token\"}" "$out"
        check "log    $slot has the attribute slot" \
          grep -qF -- "-> slot: Str($slot)" "$out" ;;
      metric-*)
        check "metric lab_beacon_value{slot=\"$slot\"} = $token" \
          bash -c 'grep -A4 -F -- "-> slot: Str($1)" "$3" | grep -qx "Value: $2"' _ "$slot" "$token" "$out" ;;
      span-*)
        check "span   beacon.slot $slot carries beacon.token $token" \
          bash -c 'grep -A1 -F -- "-> beacon.slot: Str($1)" "$3" | grep -qF -- "-> beacon.token: Str($2)"' _ "$slot" "$token" "$out" ;;
    esac
  done < <(python3 -I -c 'import json,sys
for v in json.load(open(sys.argv[1]))["vectors"]:
    if v["seed"] == sys.argv[2]: print(v["slot"], v["token"])' "$vectors" "$seed")
done
collector_logs 80s
check "span names survive the gateway's span-name processor (beacon.tick and beacon.slot)" \
  bash -c 'grep -q "Name           : beacon.tick" "$1" && grep -q "Name           : beacon.slot" "$1"' _ "$out"
check "resource service.name=beacon and service.namespace=lab-tools" \
  bash -c 'grep -qF -- "-> service.name: Str(beacon)" "$1" && grep -qF -- "-> service.namespace: Str(lab-tools)" "$1"' _ "$out"
check "gauge name is lab_beacon_value" grep -q "Name: lab_beacon_value" "$out"
echo "    counts in the last 80 s (two ticks): $(grep -c '"payload":{"token"' "$out" || true) log lines," \
  "$(grep -c 'Name           : beacon.slot' "$out" || true) beacon.slot spans"

memory_of_beacon() { # working set of the beacon container in MiB, from the kubelet
  "$kubectl" get --raw "/api/v1/nodes/$cluster-control-plane/proxy/stats/summary" | python3 -I -c '
import json, sys
for pod in json.load(sys.stdin)["pods"]:
    if pod["podRef"]["namespace"] == "lab-tools":
        for c in pod.get("containers", []):
            if c["name"] == "beacon":
                print(round(c["memory"]["workingSetBytes"] / 1048576, 1))'
}

echo "==> Gateway away for $outage_minutes minutes (beacon interval 10s, six times the lab's load)"
"$kubectl" -n lab-tools set env deployment/beacon BEACON_INTERVAL=10s >/dev/null
"$kubectl" -n lab-tools rollout status deployment/beacon --timeout=120s >/dev/null
"$kubectl" -n otel scale deployment/otel-gateway --replicas=0 >/dev/null
"$kubectl" -n lab-tools port-forward deployment/beacon "$port:8080" >/dev/null 2>&1 &
pf=$!
trap 'kill $pf 2>/dev/null || true; rm -f "$out"' EXIT
limit_mib="$("$kubectl" -n lab-tools get deployment beacon -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')"
peak=0
for i in $(seq 1 $((outage_minutes * 2))); do
  sleep 30
  mem="$(memory_of_beacon)"
  health="$(curl -fsS "http://127.0.0.1:$port/healthz" || echo '{"healthy":false}')"
  echo "    $((i * 30))s: working set ${mem} MiB (limit $limit_mib), healthz $health"
  peak="$(python3 -I -c 'import sys; print(max(float(sys.argv[1]), float(sys.argv[2])))' "$peak" "${mem:-0}")"
done
restarts="$("$kubectl" -n lab-tools get pods -l app.kubernetes.io/component=beacon -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}')"
check "no restart while the gateway was away (restartCount $restarts)" test "$restarts" = 0
check "peak working set $peak MiB stays under the limit $limit_mib" \
  python3 -I -c 'import sys; sys.exit(0 if float(sys.argv[1]) < float(sys.argv[2].rstrip("Mi")) else 1)' "$peak" "$limit_mib"
echo "    beacon's export errors while away: $("$kubectl" -n lab-tools logs deploy/beacon --since="$((outage_minutes + 1))m" | grep -c 'otel:' || true)"

echo "==> Gateway back"
"$kubectl" -n otel scale deployment/otel-gateway --replicas=1 >/dev/null
"$kubectl" -n otel rollout status deployment/otel-gateway --timeout=120s >/dev/null
sleep 30
collector_logs 30s
check "signals arrive again after the outage" \
  bash -c 'grep -q "beacon.slot" "$1" && grep -q "lab_beacon_value" "$1" && grep -q "payload" "$1"' _ "$out"

echo "==> Clean shutdown"
kill $pf 2>/dev/null || true
pod="$("$kubectl" -n lab-tools get pods -l app.kubernetes.io/component=beacon -o name)"
stop_log="$(mktemp)"
"$kubectl" -n lab-tools logs -f "$pod" --tail=1 >"$stop_log" 2>&1 &
follow=$!
sleep 2
"$kubectl" -n lab-tools delete "$pod" --wait=true >/dev/null
wait "$follow" || true
sed 's/^/    /' "$stop_log"
check "the beacon flushes and stops on SIGTERM" grep -q "beacon: stopped after" "$stop_log"
rm -f "$stop_log"

[ "$status" -eq 0 ] || { echo "BEACON KIND TEST FAILED"; exit 1; }
echo "BEACON KIND TEST PASSED. Delete the cluster with: ./test/kind-test.sh delete"
