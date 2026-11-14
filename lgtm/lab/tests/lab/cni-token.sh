#!/usr/bin/env bash
# Fail when a node cannot start new pods because Calico's token for the CNI plugin has run out.
# Part of `make lab-check` and `make calico-renew`. It only reads: no pod is created.
#
# calico-node writes the token into /etc/cni/net.d/calico-kubeconfig on its node and logs
# "Wrote updated CNI kubeconfig file." each time. The token is valid 24 hours. The check reads
# the time of each node's last such line (not the token itself) and the events
# FailedCreatePodSandBox whose message says "unauthorized". Details:
# lgtm/docs/adr/l7-calico-cni-token.md and docs/runbook.md, "After the PC has slept".
#
# Environment: LAB_KUBECONFIG.
set -euo pipefail
cd "$(dirname "$0")/../.."

kubectl="$PWD/.bin/kubectl --kubeconfig ${LAB_KUBECONFIG:?set LAB_KUBECONFIG}"
python="${PYTHON:-python3}"

# One line per calico-node: node, container start, time of the last renewal line (or "-").
# 25 hours of log are enough: a token older than 24 hours has run out anyway.
renewals=""
for pod in $($kubectl -n calico-system get pods -l k8s-app=calico-node -o name); do
  node="$($kubectl -n calico-system get "$pod" -o jsonpath='{.spec.nodeName}')"
  started="$($kubectl -n calico-system get "$pod" \
    -o jsonpath='{.status.containerStatuses[?(@.name=="calico-node")].state.running.startedAt}')"
  last="$($kubectl -n calico-system logs "$pod" -c calico-node --timestamps --since=25h \
    | grep 'Wrote updated CNI kubeconfig file' | tail -n 1 | cut -d ' ' -f 1 || true)"
  renewals+="$node ${started:--} ${last:--}"$'\n'
done

$kubectl get events --all-namespaces --field-selector reason=FailedCreatePodSandBox -o json \
  | RENEWALS="$renewals" "$python" -c '
import datetime, json, os, sys

def parse(text):
    # RFC 3339 from the API and from `kubectl logs --timestamps` (nanoseconds cut to micro).
    if not text or text == "-":
        return None
    text = text.replace("Z", "+00:00")
    if "." in text:
        head, tail = text.split(".", 1)
        digits = tail[:tail.index("+")] if "+" in tail else tail
        text = head + "." + digits[:6].ljust(6, "0") + "+00:00"
    return datetime.datetime.fromisoformat(text)

now = datetime.datetime.now(datetime.timezone.utc)
validity = datetime.timedelta(hours=24)
fix = "Run make calico-renew (lgtm/lab/docs/runbook.md, \"After the PC has slept\")."

nodes = {}
for line in os.environ["RENEWALS"].splitlines():
    if line.strip():
        node, started, last = line.split()
        # A calico-node that starts writes a fresh token, so its start counts as a renewal.
        times = [t for t in (parse(started), parse(last)) if t]
        nodes[node] = max(times) if times else None

refused = {}
for e in json.load(sys.stdin)["items"]:
    if "unauthorized" not in e.get("message", "").lower():
        continue
    node = (e.get("source") or {}).get("host") or e.get("reportingInstance") or ""
    seen = parse(e.get("lastTimestamp") or (e.get("series") or {}).get("lastObservedTime") or e.get("eventTime"))
    # Only a refusal after the node last renewed its token says that token is bad.
    if nodes.get(node) and seen and seen > nodes[node]:
        refused[node] = max(seen, refused.get(node, seen))

if not nodes:
    print("  FAIL  no calico-node pod found in namespace calico-system")
    sys.exit(1)
failed = 0
for node in sorted(nodes):
    if nodes[node] is None:
        failed += 1
        print(f"  FAIL  {node}: calico-node is not running and has logged no renewal of its CNI token in 25 h. {fix}")
        continue
    age = now - nodes[node]
    hours = age.total_seconds() / 3600
    if age >= validity:
        failed += 1
        print(f"  FAIL  {node}: Calico last renewed its CNI token {hours:.1f} h ago and the token is valid 24 h,"
              f" so new pods there stay in ContainerCreating (connection is unauthorized). {fix}")
    elif node in refused:
        failed += 1
        print(f"  FAIL  {node}: a pod could not start at {refused[node]:%H:%M} UTC because the API server refused"
              f" Calico'"'"'s CNI token (connection is unauthorized). {fix}")
    else:
        print(f"  PASS  {node}: Calico renewed its CNI token {hours:.1f} h ago (valid 24 h)")
sys.exit(1 if failed else 0)
'
