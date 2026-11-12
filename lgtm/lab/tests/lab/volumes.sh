#!/usr/bin/env bash
# Fail when a volume of the lab is fuller than LAB_VOLUME_FULL_RATIO (default
# 0.85, the threshold of the alert LabVolumeFillingUp in lab-glue). Part of
# `make lab-check`. It asks the lab's Prometheus through the API server, so it
# needs only the kubeconfig. Prometheus sees a volume only while a pod has it
# mounted.
#
# Environment: LAB_KUBECONFIG, LAB_VOLUME_FULL_RATIO.
set -euo pipefail
cd "$(dirname "$0")/../.."

kubectl="$PWD/.bin/kubectl --kubeconfig ${LAB_KUBECONFIG:?set LAB_KUBECONFIG}"
ratio="${LAB_VOLUME_FULL_RATIO:-0.85}"
python="${PYTHON:-python3}"
query='max by (namespace, persistentvolumeclaim) (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes)'
encoded="$("$python" -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$query")"

$kubectl get --raw "/api/v1/namespaces/prom/services/prom-prometheus:9090/proxy/api/v1/query?query=$encoded" \
  | "$python" -c '
import json, sys
ratio = float(sys.argv[1])
result = json.load(sys.stdin)["data"]["result"]
if not result:
    print("  FAIL  Prometheus reports no volumes")
    sys.exit(1)
full = 0
for r in sorted(result, key=lambda r: -float(r["value"][1])):
    used = float(r["value"][1])
    name = r["metric"]["namespace"] + "/" + r["metric"]["persistentvolumeclaim"]
    if used > ratio:
        full += 1
        print(f"  FAIL  volume {name} is {used:.0%} full (threshold {ratio:.0%})")
    else:
        print(f"  PASS  volume {name} is {used:.0%} full")
sys.exit(1 if full else 0)
' "$ratio"
