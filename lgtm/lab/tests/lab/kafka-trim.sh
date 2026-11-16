#!/usr/bin/env bash
# Fail when Longhorn's hourly kafka-trim has not succeeded for LAB_KAFKA_TRIM_MAX_HOURS
# (default 3) and Prometheus saw at least LAB_KAFKA_TRIM_MIN_RUNS of its runs start (default 3)
# in one hour more than that. The alert LabKafkaTrimNotSucceeding of lab-glue uses the same expression.
# Part of `make lab-check`. Without the trim a Kafka replica grows towards its whole volume
# (lgtm/docs/adr/l5-kafka-disk.md).
#
# Longhorn keeps no failed Job of the trim, so a failed run leaves nothing to see but the
# CronJob's last success. After a cold start that success is from before the shutdown, and
# the first runs fail while Longhorn starts; the second condition keeps the check passing
# until Prometheus has seen three runs fail (lgtm/docs/adr/l12-kafka-trim-after-start.md). Set
# LAB_KAFKA_TRIM_MAX_HOURS=0.05 LAB_KAFKA_TRIM_MIN_RUNS=0 to see the check fail on a healthy
# lab more than three minutes after the last trim.
#
# It asks the lab's Prometheus through the API server, so it needs only the kubeconfig.
# Without Longhorn (kind) there is nothing to check.
#
# Environment: LAB_KUBECONFIG, LAB_KAFKA_TRIM_MAX_HOURS, LAB_KAFKA_TRIM_MIN_RUNS.
set -euo pipefail
cd "$(dirname "$0")/../.."

kubectl="$PWD/.bin/kubectl --kubeconfig ${LAB_KUBECONFIG:?set LAB_KUBECONFIG}"
hours="${LAB_KAFKA_TRIM_MAX_HOURS:-3}"
min_runs="${LAB_KAFKA_TRIM_MIN_RUNS:-3}"
python="${PYTHON:-python3}"

if ! $kubectl get crd recurringjobs.longhorn.io >/dev/null 2>&1; then
  echo "  PASS  no Longhorn on this cluster"
  exit 0
fi

# query <promql>: the JSON result of an instant query.
query() {
  local encoded
  encoded="$("$python" -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$1")"
  $kubectl get --raw "/api/v1/namespaces/prom/services/prom-prometheus:9090/proxy/api/v1/query?query=$encoded"
}

selector='namespace="longhorn-system", cronjob="kafka-trim"'
window="$("$python" -c 'import sys; print(f"{round((float(sys.argv[1]) + 1) * 3600)}s")' "$hours")"
age="$(query "time() - max(kube_cronjob_status_last_successful_time{$selector})")"
runs="$(query "max(changes(kube_cronjob_status_last_schedule_time{$selector}[$window]))")"

"$python" -c '
import json, sys
hours, min_runs = float(sys.argv[1]), float(sys.argv[2])
age = json.loads(sys.argv[3])["data"]["result"]
runs = json.loads(sys.argv[4])["data"]["result"]
if not age:
    print("  FAIL  Prometheus reports no successful run of kafka-trim")
    sys.exit(1)
age_h = float(age[0]["value"][1]) / 3600
seen = float(runs[0]["value"][1]) if runs else 0
line = f"kafka-trim last succeeded {age_h:.1f} hours ago; {seen:.0f} runs started in the last {hours + 1:g} hours"
if age_h > hours and seen >= min_runs:
    print(f"  FAIL  {line} (threshold {hours:g} hours; lgtm/lab/docs/runbook.md, \"The Kafka trim keeps failing\")")
    sys.exit(1)
print(f"  PASS  {line}")
' "$hours" "$min_runs" "$age" "$runs"
