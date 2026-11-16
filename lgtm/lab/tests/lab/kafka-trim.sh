#!/usr/bin/env bash
# Fail when Longhorn's hourly kafka-trim has not succeeded for LAB_KAFKA_TRIM_MAX_HOURS (default
# 3) while Prometheus watched the CronJob the whole time: a sample at every 10-minute step of
# those hours. The alert LabKafkaTrimNotSucceeding of lab-glue uses the same expression and
# fires 10 minutes later. Part of `make lab-check`. Without the trim a Kafka replica grows
# towards its whole volume (lgtm/docs/adr/l5-kafka-disk.md).
#
# Longhorn keeps no failed Job of the trim, so a failed run leaves nothing to see but the
# CronJob's last success. After the lab was off that success is from before the stop, and the
# first runs fail while Longhorn starts; the second condition keeps the check passing until
# Prometheus has watched the trim for the whole time (lgtm/docs/adr/l12-kafka-trim-after-start.md).
# Set LAB_KAFKA_TRIM_MAX_HOURS=0.5 to see the check fail on a healthy lab more than half an hour
# after the last trim.
#
# It asks the lab's Prometheus through the API server, so it needs only the kubeconfig.
# Without Longhorn (kind) there is nothing to check.
#
# Environment: LAB_KUBECONFIG, LAB_KAFKA_TRIM_MAX_HOURS.
set -euo pipefail
cd "$(dirname "$0")/../.."

kubectl="$PWD/.bin/kubectl --kubeconfig ${LAB_KUBECONFIG:?set LAB_KUBECONFIG}"
hours="${LAB_KAFKA_TRIM_MAX_HOURS:-3}"
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

series='kube_cronjob_status_last_successful_time{namespace="longhorn-system", cronjob="kafka-trim"}'
minutes="$("$python" -c 'import sys; print(round(float(sys.argv[1]) * 60))' "$hours")"
age="time() - max by (namespace, cronjob) ($series)"
watched="max by (namespace, cronjob) (count_over_time($series[${minutes}m:10m]))"
alert="($age > $minutes * 60) and ($watched >= $minutes / 10)"

"$python" -c '
import json, sys
hours = float(sys.argv[1])
age = json.loads(sys.argv[2])["data"]["result"]
alert = json.loads(sys.argv[3])["data"]["result"]
if not age:
    print("  FAIL  Prometheus reports no successful run of kafka-trim")
    sys.exit(1)
age_h = float(age[0]["value"][1]) / 3600
line = f"kafka-trim last succeeded {age_h:.1f} hours ago"
if alert:
    print(f"  FAIL  {line} while Prometheus watched it (threshold {hours:g} hours; lgtm/lab/docs/runbook.md, \"The Kafka trim keeps failing\")")
    sys.exit(1)
print(f"  PASS  {line} (threshold {hours:g} hours)")
' "$hours" "$(query "$age")" "$(query "$alert")"
