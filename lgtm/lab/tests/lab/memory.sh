#!/usr/bin/env bash
# Fail when a container of the shop is at its memory limit and reads its pages
# back from disk (card L11, ADR l11-shop-memory-limits). Part of `make lab-check`.
#
# A container at its limit makes the kernel reclaim its own page cache, which
# for a small Go service is the program's own code. When the code no longer
# fits, every request reads it back from disk: major page faults. A healthy
# container can be at its limit (its cache fills it) or fault often (the load
# generator), but not both at once with many faults for its size. So the check
# fails only when both hold, for the same container:
#   - usage (working set plus the page cache it could drop) is at least
#     LAB_MEMORY_FULL_RATIO of the limit (default 0.95), and
#   - its major page faults over 5 minutes, at one 4 KiB page each, read back at
#     least LAB_MEMORY_REREAD_RATIO of the limit every second (default 0.01).
# Measured on 2026-11-15: product-catalog at its 20Mi limit read back 9% to 16%
# of it a second; the healthiest busy container, the load generator at 99.9% of
# its limit, 0.02%.
#
# It asks the lab's Prometheus through the API server, so it needs only the
# kubeconfig. Environment: LAB_KUBECONFIG, LAB_MEMORY_FULL_RATIO,
# LAB_MEMORY_REREAD_RATIO.
set -euo pipefail
cd "$(dirname "$0")/../.."

kubectl="$PWD/.bin/kubectl --kubeconfig ${LAB_KUBECONFIG:?set LAB_KUBECONFIG}"
full="${LAB_MEMORY_FULL_RATIO:-0.95}"
reread="${LAB_MEMORY_REREAD_RATIO:-0.01}"
python="${PYTHON:-python3}"
# The limits come from kube-state-metrics: the lab's Prometheus does not keep cAdvisor's
# container_spec_memory_limit_bytes.
limit='max by (pod, container) (kube_pod_container_resource_limits{namespace="shop", resource="memory"})'

# query <promql>: the JSON result of an instant query.
query() {
  local encoded
  encoded="$("$python" -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$1")"
  $kubectl get --raw "/api/v1/namespaces/prom/services/prom-prometheus:9090/proxy/api/v1/query?query=$encoded"
}

usage="$(query "max by (pod, container) (container_memory_usage_bytes{namespace=\"shop\", container!=\"\"}) / $limit")"
faults="$(query "max by (pod, container) (rate(container_memory_failures_total{namespace=\"shop\", container!=\"\", failure_type=\"pgmajfault\", scope=\"container\"}[5m])) * 4096 / $limit")"

"$python" - "$full" "$reread" "$usage" "$faults" <<'EOF'
import json, sys
full, reread = float(sys.argv[1]), float(sys.argv[2])
def values(text):
    return {(r["metric"]["pod"], r["metric"]["container"]): float(r["value"][1])
            for r in json.loads(text)["data"]["result"]}
usage, faults = values(sys.argv[3]), values(sys.argv[4])
if not usage:
    print("  FAIL  Prometheus reports no memory usage for the shop")
    sys.exit(1)
bad = 0
for key in sorted(usage):
    used, read = usage[key], faults.get(key, 0.0)
    line = f"container {key[1]} (pod {key[0]}) uses {used:.0%} of its memory limit and reads back {read:.2%} of it a second"
    if used >= full and read >= reread:
        bad += 1
        print(f"  FAIL  {line}: at its limit and reading its pages back from disk")
    else:
        print(f"  PASS  {line}")
sys.exit(1 if bad else 0)
EOF
