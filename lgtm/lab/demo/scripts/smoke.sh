#!/usr/bin/env bash
# Smoke test for the lab copy of the demo (run by `make smoke`).
#
# 1. Starts the Compose shop and waits until every health check passes.
# 2. Checks that the shop page and the product API answer through the proxy.
# 3. Lets the load generator run for SMOKE_SECONDS (default 120).
# 4. Reads the debug collector's output and fails unless every service sent
#    each signal it is able to send, and unless orders went all the way
#    through Kafka to fraud-detection.
#
# The shop keeps running afterwards so it can be inspected; `make down`
# removes it.
set -euo pipefail
cd "$(dirname "$0")/.."

SMOKE_SECONDS="${SMOKE_SECONDS:-120}"
compose=(docker compose --env-file .env)
port="$(grep -E '^SHOP_PORT=' .env | cut -d= -f2)"
shop="http://localhost:${port}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Signals each service sends over OTLP, as T (traces), M (metrics) and L
# (logs), as observed on 2026-11-09. Envoy (frontend-proxy) sends traces and
# access logs; NGINX (image-provider), the browser (frontend-web), flagd and
# flagd-ui send traces only; the Kafka broker's Java agent sends metrics and
# logs but no spans (the clients' spans cover Kafka). Metrics of Envoy, NGINX,
# PostgreSQL and Valkey come from scrapers, which the lab's gateway may add.
expected=(
  "ad TML"
  "cart TML"
  "checkout TML"
  "fraud-detection TML"
  "frontend TML"
  "frontend-proxy TL"
  "frontend-web T"
  "image-provider T"
  "load-generator TML"
  "payment TML"
  "product-catalog TML"
  "recommendation TML"
  "flagd T"
  "flagd-ui T"
  "kafka ML"
)

echo "==> Starting the shop"
"${compose[@]}" up -d --wait --wait-timeout 600
started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "==> Checking the shop through the proxy at ${shop}"
# Docker leaves the port unpublished when something else already listens on
# it (for example in WSL); say so instead of testing the wrong server.
"${compose[@]}" port frontend-proxy 8080 | grep -q ":${port}$"   || { echo "FAIL: port ${port} is not published; is it in use? Set SHOP_PORT in .env."; exit 1; }
code="$(curl -s -o "$work/home.html" -w '%{http_code}' "$shop/")"
grep -q '<title[^>]*>Otel Demo' "$work/home.html" || { echo "FAIL: shop page did not load (HTTP $code)"; exit 1; }
count="$(curl -fsS "$shop/api/products" | grep -o '"id":' | wc -l)"
[ "$count" -gt 0 ] || { echo "FAIL: /api/products returned no products"; exit 1; }
echo "    shop page HTTP $code, $count products"
# The flag screen only sends telemetry when someone opens it.
ui="$(curl -s -o /dev/null -w '%{http_code}' "$shop/feature")"
echo "    flag screen HTTP $ui"

echo "==> Letting the load generator run for ${SMOKE_SECONDS} s"
sleep "$SMOKE_SECONDS"

echo "==> Reading the collector's debug output since ${started}"
"${compose[@]}" logs --no-log-prefix --since "$started" otel-collector > "$work/collector.log"
grep -E $'\tinfo\tResource(Traces|Metrics|Log) ' "$work/collector.log" \
  | grep -oE 'Resource(Traces|Metrics|Log) .* service\.name=[^ ]+' \
  | sed -E 's/^Resource(Traces|Metrics|Log) .* service\.name=([^ ]+)$/\1 \2/' \
  | sed -E 's/^Traces /T /; s/^Metrics /M /; s/^Log /L /' \
  | sort | uniq -c > "$work/seen.txt"

fail=0
printf '    %-18s %-8s %-8s %-8s\n' service traces metrics logs
for row in "${expected[@]}"; do
  svc="${row% *}"
  want="${row#* }"
  line="$(printf '    %-18s' "$svc")"
  for sig in T M L; do
    n="$(awk -v s="$sig" -v n="$svc" '$2==s && $3==n {print $1}' "$work/seen.txt")"
    if [[ "$want" == *"$sig"* ]]; then
      if [ -n "$n" ]; then cell="$n"; else cell="MISSING"; fail=1; fi
    else
      cell="${n:--}"
    fi
    line+="$(printf ' %-8s' "$cell")"
  done
  echo "$line"
done
echo "    (numbers are resource batches seen in the debug output)"

echo "==> Checking orders end to end"
orders="$(grep -cE 'order placed' "$work/collector.log" || true)"
consumed="$("${compose[@]}" logs --no-log-prefix --since "$started" fraud-detection | grep -c 'Consumed record' || true)"
standins="$(grep -oE '^(quoteShipping|shipOrder|sendOrderConfirmation) ' "$work/collector.log" | sort | uniq -c | tr -s ' ' | tr '\n' ',' || true)"
echo "    checkout 'order placed' logs: $orders; fraud-detection consumed records: $consumed"
echo "    checkout stand-in spans:${standins%,}"
[ "$orders" -gt 0 ] || { echo "FAIL: no order was placed"; fail=1; }
[ "$consumed" -gt 0 ] || { echo "FAIL: fraud-detection consumed no order from Kafka"; fail=1; }

if [ "$fail" -ne 0 ]; then
  echo "SMOKE TEST FAILED"
  exit 1
fi
echo "SMOKE TEST PASSED. The shop is still running at ${shop}; 'make down' removes it."
