#!/usr/bin/env bash
# Switch each fault flag on in the running Compose shop, look for its effect
# in the debug collector's output or the service's own log, and switch it off
# again. Run after `make smoke` (the shop must be up).
#
#   ./scripts/flag-check.sh                 every flag
#   ./scripts/flag-check.sh adFailure ...   only these
#
# WAIT (default 60) is how long each flag stays on, unless the flag's row
# below names a longer time. Evidence is collected GRACE (default 30) seconds
# after the flag is switched off, so effects that are logged late still count.
set -uo pipefail
cd "$(dirname "$0")/.."

compose=(docker compose --env-file .env)
WAIT="${WAIT:-60}"
GRACE="${GRACE:-30}"

# flag | variant to test | where to look | extended regular expression | seconds on (optional)
# cartFailure: EmptyCart only runs at checkout, and the bad store retries its
# connection before it fails. failedReadinessProbe: Compose marks cart
# unhealthy after 20 failed probes 5 s apart. imageSlowLoad: only the
# headless-browser user loads images, now and then, and reads flags late.
# productCatalogFailure and recommendationCacheFailure show only on some
# requests.
checks=(
  "adFailure|on|collector|GetAds Failed with status"
  "adHighCpu|on|collector|High CPU-Load problempattern enabled"
  "adManualGc|on|collector|Triggering a manual garbage collection"
  "cartFailure|100%|collector|Can't access cart storage|120"
  "cartMetricCardinalityOverflow|on|collector|demo\.cart\.trace_id"
  "emitRawPii|on|collector|user\.hash="
  "failedReadinessProbe|on|health:cart|unhealthy|150"
  "imageSlowLoad|5sec|envoy-delay|DI|180"
  "kafkaConsumerDead|on|collector|kafkaConsumerDead' is enabled, unsubscribing"
  "kafkaQueueProblems|on|collector|kafkaQueueProblems' is (activated, overloading queue|enabled, sleeping 1 second)"
  "loadGeneratorFloodHomepage|on|collector|User flooding homepage 100 times"
  "paymentFailure|100%|collector|demo\.user_context\.loyalty_level=gold"
  "paymentUnreachable|on|collector|Checkout failed to place order"
  "productCatalogFailure|on|collector|Product Catalog Fail Feature Flag Enabled|90"
  "productCatalogLockContention|on|collector|lock contention scenario active"
  "recommendationCacheFailure|on|collector|demo\.feature_flag\.recommendation_cache=true|90"
)

only=("$@")
failures=0
printf '%-30s %-8s %-6s %s\n' flag variant result evidence
for row in "${checks[@]}"; do
  IFS='|' read -r flag variant where pattern seconds <<< "$row"
  if [ "${#only[@]}" -gt 0 ] && [[ ! " ${only[*]} " == *" $flag "* ]]; then continue; fi
  ./scripts/set-flag.sh "$flag" "$variant" > /dev/null || { echo "could not set $flag"; failures=$((failures+1)); continue; }
  since="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  sleep "${seconds:-$WAIT}"
  # Health is read while the flag is still on; logs after a grace period.
  health=""
  if [[ "$where" == health:* ]]; then
    health="$(docker inspect --format '{{.State.Health.Status}}' "$("${compose[@]}" ps -q "${where#health:}")")"
  fi
  ./scripts/set-flag.sh "$flag" off > /dev/null
  sleep "$GRACE"
  # The browser reads flags late and Envoy logs an image request only when
  # it ends, so delayed images show up well after the flag is off again.
  [ "$where" = envoy-delay ] && sleep 60
  evidence=""
  case "$where" in
    collector)
      evidence="$("${compose[@]}" logs --no-log-prefix --since "$since" otel-collector 2>/dev/null \
        | grep -oE ".{0,60}($pattern).{0,40}" | head -1)"
      ;;
    health:*)
      evidence="$(echo "$health" | grep -E "$pattern" | sed "s/^/${where#health:} health: /")"
      ;;
    envoy-delay)
      # Envoy access log of a product image: response flag DI means "delay
      # injected"; the fields after "-" are bytes in, bytes out, duration (ms).
      evidence="$("${compose[@]}" logs --no-log-prefix --since "$since" otel-collector 2>/dev/null         | grep -oE '"GET /images/products/[^ ]+ HTTP/1.1" 200 '"$pattern"' via_upstream - "-" [0-9]+ [0-9]+ [0-9]+'         | awk '{ print "Envoy access log: " $2 " status " $4 " flag " $5 ", took " $(NF) " ms"; exit }')"
      ;;
  esac
  if [ -n "$evidence" ]; then
    printf '%-30s %-8s %-6s %s\n' "$flag" "$variant" seen "$(echo "$evidence" | tr -s '\t ' ' ' | cut -c1-110)"
  else
    printf '%-30s %-8s %-6s %s\n' "$flag" "$variant" MISSING "no match for /$pattern/ in $where"
    failures=$((failures+1))
  fi
done
[ "$failures" -eq 0 ] && echo "all flags showed their effect" || { echo "$failures flag(s) showed no effect"; exit 1; }
