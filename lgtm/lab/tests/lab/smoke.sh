#!/usr/bin/env bash
# Smoke test of the LGTM lab (make lab-check). It asks Mimir, Loki and Tempo
# through Grafana's data source proxy, so it also proves that the provisioned
# data sources (fixed UIDs, tenants) work, and it reaches Grafana through the
# lab's Gateway like a browser does.
#
# Checks, after the load generator has run for LAB_CHECK_WARMUP minutes:
#   1. shop metrics in Mimir (tenant lab), with cluster="lgtm-lab"
#   2. shop logs in Loki that carry a trace id
#   3. a checkout trace in Tempo with spans from at least four services
#   4. span metrics and service-graph metrics from Tempo in Mimir
#   5. Kubernetes metrics in Mimir tenant prom (remote write from Prometheus)
#   6. pod logs and Kubernetes events from Alloy in Loki
#   7. the links between the signals: the data sources carry them, an exemplar
#      on the latency metric names a trace Tempo has (metric to trace), a log
#      line's trace is in Tempo (log to trace), and that trace's logs come back
#      with Grafana's trace-to-logs query (trace to log)
#   8. no volume of the lab is more than 85% full (tests/lab/volumes.sh)
#   9. every Longhorn disk has at least 25% free (tests/lab/longhorn-disks.sh)
#
# Environment: LAB_KUBECONFIG (to read the Grafana password), LAB_GATEWAY_URL
# (http://127.0.0.1:28080 on kind, http://10.10.0.5 on the real cluster),
# LAB_DOMAIN (lab.k8s.local), LAB_CHECK_WARMUP (minutes, default 3).
set -euo pipefail
cd "$(dirname "$0")/../.."

kubectl="$PWD/.bin/kubectl --kubeconfig ${LAB_KUBECONFIG:?set LAB_KUBECONFIG}"
gateway="${LAB_GATEWAY_URL:-http://127.0.0.1:28080}"
domain="${LAB_DOMAIN:-lab.k8s.local}"
warmup_minutes="${LAB_CHECK_WARMUP:-3}"
python="${PYTHON:-python3}"
failures=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; failures=$((failures + 1)); }

password="$($kubectl -n grafana get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d)"
user="$($kubectl -n grafana get secret grafana-admin -o jsonpath='{.data.admin-user}' | base64 -d)"

# grafana <path> [curl -G arguments...]: GET through the Gateway, as admin.
grafana() {
  local path="$1"; shift
  curl -fsS -G --max-time 60 -u "$user:$password" -H "Host: grafana.$domain" "$gateway$path" "$@"
}
# json <python expression on d>: print the value of the expression for the JSON on stdin.
json() { "$python" -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
# promql <datasource uid> <query>: the number of series in the result.
promql_count() {
  grafana "/api/datasources/proxy/uid/$1/api/v1/query" --data-urlencode "query=$2" | json "len(d['data']['result'])"
}
now="$(date +%s)"
since=$((now - 900))

echo "==> Waiting until the load generator has run for $warmup_minutes minutes"
started="$($kubectl -n shop get pods -l app.kubernetes.io/name=load-generator -o jsonpath='{.items[0].status.startTime}')"
age=$(( $(date +%s) - $(date -d "$started" +%s) ))
wait_for=$(( warmup_minutes * 60 - age ))
if [ "$wait_for" -gt 0 ]; then echo "    sleeping $wait_for s"; sleep "$wait_for"; fi
now="$(date +%s)"
since=$((now - 900))

echo "==> Grafana through the Gateway ($gateway, Host grafana.$domain)"
if grafana /api/health >/dev/null; then pass "Grafana answers"; else fail "Grafana does not answer"; exit 1; fi

echo "==> 1. Shop metrics in Mimir, tenant lab"
services="$(grafana /api/datasources/proxy/uid/mimir/api/v1/query \
  --data-urlencode 'query=count by (service_name) ({k8s_namespace_name="shop", cluster="lgtm-lab", service_name!=""})' \
  | json "' '.join(sorted(r['metric']['service_name'] for r in d['data']['result']))")"
count="$(wc -w <<<"$services")"
if [ "$count" -ge 8 ]; then pass "$count shop services send metrics: $services"; else fail "only $count shop services send metrics: $services"; fi

echo "==> 2. Shop logs in Loki with a trace id"
log="$(grafana /api/datasources/proxy/uid/loki/loki/api/v1/query_range \
  --data-urlencode 'query={k8s_namespace_name="shop", service_name="checkout"} | trace_id != ""' \
  --data-urlencode "start=${since}000000000" --data-urlencode limit=20 \
  | json "' '.join([s['stream']['trace_id'] + ' ' + s['stream']['service_name'] for s in d['data']['result']][:1])")"
log_trace="${log%% *}"
if [ -n "$log_trace" ]; then pass "checkout log line with trace_id $log_trace"; else fail "no checkout log line with a trace id"; fi

echo "==> 3. A checkout trace in Tempo with spans from at least four services"
checkout_trace="$(grafana /api/datasources/proxy/uid/tempo/api/search \
  --data-urlencode 'q={ resource.service.name = "checkout" && name =~ ".*PlaceOrder" }' \
  --data-urlencode "start=$since" --data-urlencode "end=$now" --data-urlencode limit=5 \
  | json "(d.get('traces') or [{}])[0].get('traceID', '')")"
if [ -n "$checkout_trace" ]; then
  trace_services="$(grafana "/api/datasources/proxy/uid/tempo/api/v2/traces/$checkout_trace" -H 'Accept: application/json' \
    | json "' '.join(sorted({a['value']['stringValue'] for b in d['trace']['resourceSpans'] for a in b['resource']['attributes'] if a['key'] == 'service.name'}))")"
  n="$(wc -w <<<"$trace_services")"
  if [ "$n" -ge 4 ]; then pass "trace $checkout_trace has spans from $n services: $trace_services"; else fail "trace $checkout_trace has spans from only $n services: $trace_services"; fi
else
  fail "no checkout PlaceOrder trace in the last 15 minutes"
fi

echo "==> 4. Span metrics and service graphs in Mimir, tenant lab"
n="$(promql_count mimir 'sum by (service_name) (rate(traces_spanmetrics_calls_total{cluster="lgtm-lab"}[5m])) > 0')"
if [ "$n" -ge 4 ]; then pass "span metrics for $n services"; else fail "span metrics for only $n services"; fi
n="$(promql_count mimir 'sum by (client, server) (rate(traces_service_graph_request_total[5m])) > 0')"
if [ "$n" -ge 3 ]; then pass "service graph with $n edges"; else fail "service graph with only $n edges"; fi

echo "==> 5. Kubernetes metrics in Mimir, tenant prom"
n="$(promql_count mimir-prom 'count by (namespace) (kube_pod_info{cluster="lgtm-lab"})')"
if [ "$n" -ge 5 ]; then pass "kube-state-metrics: pods in $n namespaces"; else fail "kube-state-metrics: pods in only $n namespaces"; fi
n="$(promql_count mimir-prom 'count by (instance) (node_cpu_seconds_total)')"
if [ "$n" -ge 1 ]; then pass "node exporter on $n nodes"; else fail "no node exporter metrics"; fi
n="$(promql_count mimir 'kube_pod_info')"
if [ "$n" -eq 0 ]; then pass "tenant lab holds no kube-state-metrics series (one route per series)"; else fail "tenant lab also holds $n kube_pod_info series"; fi

echo "==> 6. Pod logs and Kubernetes events from Alloy in Loki"
n="$(grafana /api/datasources/proxy/uid/loki/loki/api/v1/query \
  --data-urlencode 'query=sum by (namespace) (count_over_time({namespace=~".+", cluster="lgtm-lab"}[10m]))' \
  | json "len(d['data']['result'])")"
if [ "$n" -ge 3 ]; then pass "pod logs from $n namespaces"; else fail "pod logs from only $n namespaces"; fi
n="$(grafana /api/datasources/proxy/uid/loki/loki/api/v1/query \
  --data-urlencode 'query=sum(count_over_time({job="integrations/kubernetes/eventhandler"}[1h]))' \
  | json "len(d['data']['result'])")"
if [ "$n" -ge 1 ]; then pass "Kubernetes events"; else fail "no Kubernetes events"; fi

echo "==> 7. Links between the signals"
links="$(grafana /api/datasources | json "' '.join(name for name, ok in [
  ('exemplars', any(x.get('datasourceUid') == 'tempo' for x in {s['uid']: s for s in d}['mimir']['jsonData'].get('exemplarTraceIdDestinations', []))),
  ('derived-field', any(x.get('datasourceUid') == 'tempo' for x in {s['uid']: s for s in d}['loki']['jsonData'].get('derivedFields', []))),
  ('trace-to-logs', {s['uid']: s for s in d}['tempo']['jsonData'].get('tracesToLogsV2', {}).get('datasourceUid') == 'loki'),
  ('trace-to-metrics', {s['uid']: s for s in d}['tempo']['jsonData'].get('tracesToMetrics', {}).get('datasourceUid') == 'mimir'),
] if ok)")"
for l in exemplars derived-field trace-to-logs trace-to-metrics; do
  if grep -qw -- "$l" <<<"$links"; then pass "data source link $l is provisioned"; else fail "data source link $l is missing"; fi
done
uids="$(grafana /api/datasources | json "' '.join(sorted(s['uid'] for s in d))")"
for u in mimir mimir-prom loki tempo prometheus alertmanager; do
  if grep -qw "$u" <<<"$uids"; then pass "data source uid $u"; else fail "data source uid $u is missing"; fi
done

exemplar_trace="$(grafana /api/datasources/proxy/uid/mimir/api/v1/query_exemplars \
  --data-urlencode 'query=traces_spanmetrics_latency_bucket{service_name="frontend"}' \
  --data-urlencode "start=$since" --data-urlencode "end=$now" \
  | json "next((e['labels'].get('traceID') or e['labels'].get('trace_id') for s in d['data'] for e in s['exemplars']), '')")"
if [ -n "$exemplar_trace" ]; then
  if grafana "/api/datasources/proxy/uid/tempo/api/v2/traces/$exemplar_trace" -H 'Accept: application/json' >/dev/null; then
    pass "metric to trace: exemplar on traces_spanmetrics_latency_bucket opens trace $exemplar_trace"
  else
    fail "metric to trace: Tempo does not have exemplar trace $exemplar_trace"
  fi
else
  fail "metric to trace: no exemplar on traces_spanmetrics_latency_bucket"
fi
if [ -n "$log_trace" ]; then
  if grafana "/api/datasources/proxy/uid/tempo/api/v2/traces/$log_trace" -H 'Accept: application/json' >/dev/null; then
    pass "log to trace: trace $log_trace of a checkout log line is in Tempo"
  else
    fail "log to trace: Tempo does not have trace $log_trace"
  fi
  # The query Grafana's trace-to-logs link builds: {service_name="<span's service>"} | trace_id="<trace>".
  n="$(grafana /api/datasources/proxy/uid/loki/loki/api/v1/query_range \
    --data-urlencode "query={service_name=\"checkout\"} | trace_id=\"$log_trace\"" \
    --data-urlencode "start=${since}000000000" --data-urlencode limit=50 \
    | json "sum(len(s['values']) for s in d['data']['result'])")"
  if [ "$n" -ge 1 ]; then pass "trace to log: $n checkout log lines for trace $log_trace"; else fail "trace to log: no log lines for trace $log_trace"; fi
fi

echo "==> 8. No volume of the lab is fuller than ${LAB_VOLUME_FULL_RATIO:-0.85} of its size"
bash tests/lab/volumes.sh || failures=$((failures + 1))

echo "==> 9. Every Longhorn disk has at least ${LAB_LONGHORN_FREE_RATIO:-0.25} of its size free"
bash tests/lab/longhorn-disks.sh || failures=$((failures + 1))

echo
if [ "$failures" -eq 0 ]; then echo "LAB CHECK PASSED"; else echo "LAB CHECK FAILED: $failures check(s)"; exit 1; fi
