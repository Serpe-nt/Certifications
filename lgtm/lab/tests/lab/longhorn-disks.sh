#!/usr/bin/env bash
# Fail when a Longhorn disk has less than LAB_LONGHORN_FREE_RATIO of its size free (default
# 0.25). Longhorn stops scheduling replicas on a disk at 15% free
# (storageMinimalAvailablePercentage), so 25% leaves time to act: runbook.md, "Kafka's replicas
# all sit on two workers". Part of `make lab-check`. Without Longhorn (kind) there is nothing to
# check.
#
# Environment: LAB_KUBECONFIG, LAB_LONGHORN_FREE_RATIO.
set -euo pipefail
cd "$(dirname "$0")/../.."

kubectl="$PWD/.bin/kubectl --kubeconfig ${LAB_KUBECONFIG:?set LAB_KUBECONFIG}"
ratio="${LAB_LONGHORN_FREE_RATIO:-0.25}"
python="${PYTHON:-python3}"

if ! $kubectl get crd nodes.longhorn.io >/dev/null 2>&1; then
  echo "  PASS  no Longhorn on this cluster"
  exit 0
fi

$kubectl -n longhorn-system get nodes.longhorn.io -o json | "$python" -c '
import json, sys
ratio = float(sys.argv[1])
low = 0
for node in json.load(sys.stdin)["items"]:
    for disk in node.get("status", {}).get("diskStatus", {}).values():
        size, free = disk["storageMaximum"], disk["storageAvailable"]
        share = free / size if size else 0
        name = node["metadata"]["name"]
        line = f"Longhorn disk of {name} has {free / 2**30:.1f} of {size / 2**30:.1f} GiB free ({share:.0%})"
        if share < ratio:
            low += 1
            print(f"  FAIL  {line}, under {ratio:.0%}")
        else:
            print(f"  PASS  {line}")
sys.exit(1 if low else 0)
' "$ratio"
