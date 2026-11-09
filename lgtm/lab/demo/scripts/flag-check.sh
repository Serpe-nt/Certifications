#!/usr/bin/env bash
# Switch each fault flag on in the running Compose shop, look for its effect
# in the debug collector's output or the service's own log, and switch it off
# again. Run after `make smoke` (the shop must be up).
#
#   ./scripts/flag-check.sh                 every flag
#   ./scripts/flag-check.sh adFailure ...   only these
#
# WAIT (default 60) is how long each flag stays on.
set -uo pipefail
cd "$(dirname "$0")/.."

compose=(docker compose --env-file .env)
WAIT="${WAIT:-60}"

# flag | variant to test | where to look | extended regular expression
checks=(
  "adFailure|on|collector|GetAds Failed with status"
  "adHighCpu|on|collector|High CPU-Load problempattern enabled"
  "adManualGc|on|collector|Triggering a manual garbage collection"
  "cartFailure|100%|collector|Can't access cart storage"
  "cartMetricCardinalityOverflow|on|collector|demo\.cart\.trace_id"
  "emitRawPii|on|collector|user\.hash="
  "failedReadinessProbe|on|health:cart|unhealthy"
  "imageSlowLoad|5sec|envoy-delay|5000"
  "kafkaConsumerDead|on|collector|kafkaConsumerDead' is enabled, unsubscribing"
  "kafkaQueueProblems|on|collector|kafkaQueueProblems' is (activated, overloading queue|enabled, sleeping 1 second)"
  "loadGeneratorFloodHomepage|on|collector|User flooding homepage 100 times"
  "paymentFailure|100%|collector|demo\.user_context\.loyalty_level=gold"
  "paymentUnreachable|on|collector|Checkout failed to place order"
  "productCatalogFailure|on|collector|Product Catalog Fail Feature Flag Enabled"
  "productCatalogLockContention|on|collector|lock contention scenario active"
  "recommendationCacheFailure|on|collector|get_product_list: cache (miss|hit)"
)

only=("$@")
failures=0
printf '%-30s %-8s %-6s %s\n' flag variant result evidence
for row in "${checks[@]}"; do
  IFS='|' read -r flag variant where pattern <<< "$row"
  if [ "${#only[@]}" -gt 0 ] && [[ ! " ${only[*]} " == *" $flag "* ]]; then continue; fi
  ./scripts/set-flag.sh "$flag" "$variant" > /dev/null || { echo "could not set $flag"; failures=$((failures+1)); continue; }
  since="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  sleep "$WAIT"
  evidence=""
  case "$where" in
    collector)
      evidence="$("${compose[@]}" logs --no-log-prefix --since "$since" otel-collector 2>/dev/null \
        | grep -oE ".{0,60}($pattern).{0,40}" | head -1)"
      ;;
    health:*)
      svc="${where#health:}"
      evidence="$(docker inspect --format '{{.State.Health.Status}}' "$("${compose[@]}" ps -q "$svc")" | grep -E "$pattern")"
      ;;
    envoy-delay)
      # Envoy access log lines for product images: "... <bytes in> <bytes out> <duration ms> <upstream ms> ..."
      evidence="$("${compose[@]}" logs --no-log-prefix --since "$since" otel-collector 2>/dev/null \
        | grep -E '"GET /images/products/[^ ]+ HTTP/1.1" 200' \
        | grep -oE '" 200 - via_upstream - "-" [0-9]+ [0-9]+ [0-9]+' \
        | awk -v min="$pattern" '{ if ($(NF) >= min) { print "image request took " $(NF) " ms"; exit } }')"
      ;;
  esac
  ./scripts/set-flag.sh "$flag" off > /dev/null
  if [ -n "$evidence" ]; then
    printf '%-30s %-8s %-6s %s\n' "$flag" "$variant" seen "$(echo "$evidence" | tr -s '\t ' ' ' | cut -c1-110)"
  else
    printf '%-30s %-8s %-6s %s\n' "$flag" "$variant" MISSING "no match for /$pattern/ in $where"
    failures=$((failures+1))
  fi
  # Let the shop settle before the next flag.
  sleep 10
done
[ "$failures" -eq 0 ] && echo "all flags showed their effect" || { echo "$failures flag(s) showed no effect"; exit 1; }
