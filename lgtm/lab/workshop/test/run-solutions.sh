#!/usr/bin/env bash
# Run the workshop service and every solution against a debug collector and a
# stand-in shop, and check that each one answers and sends what its name says.
# Everything runs in containers on a private Docker network; no host port is
# published. The collector and the stand-in shop take the lab's names
# (otlp.lab.k8s.local, shop.lab.k8s.local) on that network, so lab.env is used
# unchanged.
#
#   ./test/run-solutions.sh            both ways of running: the Docker image
#                                      (Dockerfile, as compose builds it) and
#                                      plain Python (run.py makes the venv)
#   MODES=docker ./test/run-solutions.sh
#   VARIANTS=solutions/05-logs ./test/run-solutions.sh
#
# Needs Docker. Removes its containers, network and images when done.
set -euo pipefail
cd "$(dirname "$0")/.."

modes="${MODES:-docker python}"
net="lgtm-d2-workshop"
python_image="python:3.14.10-slim-trixie@sha256:9aaa474097d094040649f2162a627c0049b408f52138d980916788d80f04802f"
collector_image="otel/opentelemetry-collector-contrib:0.165.0@sha256:e40d61f10c9a617cca1ffd1be4d7e2b3a4b0f0001798ff07e58cabe82e618cea"
# VARIANTS="solutions/01-zero-code solutions/05-logs" runs only those.
read -r -a variants <<<"${VARIANTS:-. solutions/01-zero-code solutions/02-manual-spans solutions/03-propagation solutions/04-metrics solutions/05-logs solutions/prometheus-client}"
work="$(mktemp -d)"

cleanup() {
  docker rm -f d2-ws-app d2-ws-otelcol d2-ws-shop >/dev/null 2>&1 || true
  docker network rm "$net" >/dev/null 2>&1 || true
  for v in "${variants[@]}"; do docker rmi -f "lgtm-workshop:d2-$(basename "$v")" >/dev/null 2>&1 || true; done
  rm -rf "$work"
}
trap cleanup EXIT
cleanup
work="$(mktemp -d)"
docker network create "$net" >/dev/null

docker run -d --name d2-ws-shop --network "$net" --network-alias shop.lab.k8s.local \
  -v "$PWD/test/stub_shop.py:/stub_shop.py:ro" "$python_image" python /stub_shop.py 80 >/dev/null

status=0
check() { # description, command...
  local what="$1"; shift
  if "$@"; then echo "    ok    $what"; else echo "    FAIL  $what"; status=1; fi
}
has() { grep -qF -- "$1" "$work/otel.log"; }
lacks() { ! grep -qF -- "$1" "$work/otel.log"; }

start_app() { # mode, variant
  local mode="$1" variant="$2" image
  if [ "$mode" = docker ]; then
    image="lgtm-workshop:d2-$(basename "$variant")"
    docker build -q --build-arg VARIANT="$variant" -t "$image" . >/dev/null
    docker run -d --name d2-ws-app --network "$net" "$image" >/dev/null
  else
    # Plain Python: the learner's command, python run.py <folder>, in a bare
    # Python container (it creates the venv and installs the requirements).
    docker run -d --name d2-ws-app --network "$net" -e WORKSHOP_HOST=0.0.0.0 \
      -v "$PWD:/src:ro" "$python_image" \
      sh -c "cp -r /src /workshop && cd /workshop && rm -rf .venv solutions/*/.venv && exec python run.py $variant" >/dev/null
  fi
  for _ in $(seq 1 120); do
    if docker run --rm --network "$net" "$python_image" python -c \
      'import urllib.request; urllib.request.urlopen("http://d2-ws-app:8000/healthz", timeout=2)' 2>/dev/null; then
      return 0
    fi
    sleep 2
  done
  docker logs d2-ws-app | tail -20
  return 1
}

run_load() {
  docker run --rm --network "$net" -v "$PWD/load.py:/load.py:ro" "$python_image" \
    python /load.py --url http://d2-ws-app:8000 --rate 8 --duration 20 --slow | tail -1
  # The tier header is sent by hand, to see baggage in solution 03 onwards.
  docker run --rm --network "$net" "$python_image" python -c '
import json, urllib.request
req = urllib.request.Request("http://d2-ws-app:8000/checkout", method="POST",
    data=json.dumps({"sku": "OLJCESPC7Z", "quantity": 1}).encode(),
    headers={"Content-Type": "application/json", "X-Customer-Tier": "gold"})
try:
    urllib.request.urlopen(req, timeout=10)
except Exception:
    pass'
}

for mode in $modes; do
  for variant in "${variants[@]}"; do
    name="$(basename "$variant")"; [ "$name" = . ] && name="starting point"
    echo "==> $mode: $name"
    docker run -d --name d2-ws-otelcol --network "$net" --network-alias otlp.lab.k8s.local \
      -v "$PWD/test/collector.yaml:/conf/config.yaml:ro" "$collector_image" --config=/conf/config.yaml >/dev/null
    check "starts and answers /healthz" start_app "$mode" "$variant"
    echo "    load: $(run_load)"
    # Batches go out every 5 s, metrics every 15 s.
    sleep 20
    docker logs d2-ws-otelcol >"$work/otel.log" 2>&1
    docker logs d2-ws-shop --since 60s >"$work/shop.log" 2>&1
    docker logs d2-ws-app >"$work/app.log" 2>&1
    # Solution 05 logs the declined charges with their stack traces on
    # purpose; any other traceback, or a failed export, is an error.
    check "no errors in the service's output" bash -c '! grep -qE "Exception while exporting|Failed to export" "$1" &&
      [ "$(grep -c "^Traceback" "$1")" = "$(grep -cE "^(__main__\.)?PaymentError: card declined" "$1")" ]' _ "$work/app.log"

    case "$name" in
      "starting point")
        check "sends no telemetry" lacks "ResourceSpans" ;;
      01-zero-code)
        check "traces: Flask server spans" has "Name           : POST /checkout"
        check "traces: requests client spans to the shop" has "-> server.address: Str(shop.lab.k8s.local)"
        check "traces: sqlite3 spans" has "-> db.system.name: Str(sqlite)"
        check "service.name=workshop" has "-> service.name: Str(workshop)"
        check "no metrics and no logs" bash -c '! grep -qE "ResourceMetrics|ResourceLog" "$1"' _ "$work/otel.log" ;;
      02-manual-spans)
        check "manual spans checkout.reserve, checkout.charge, checkout.store, fibonacci" \
          bash -c 'for n in checkout.reserve checkout.charge checkout.store fibonacci; do grep -q "Name           : $n\$" "$1" || exit 1; done' _ "$work/otel.log"
        check "attributes workshop.sku and workshop.order.id" bash -c 'grep -q "workshop.sku: Str(" "$1" && grep -q "workshop.order.id: Str(" "$1"' _ "$work/otel.log"
        check "span event 'stock reserved'" has "-> Name: stock reserved"
        check "declined charge recorded as an exception with status Error" \
          bash -c 'grep -q "exception.type: Str(__main__.PaymentError)\|exception.type: Str(PaymentError)" "$1" && grep -q "Status code    : Error" "$1"' _ "$work/otel.log"
        check "no metrics and no logs" bash -c '! grep -qE "ResourceMetrics|ResourceLog" "$1"' _ "$work/otel.log" ;;
      03-propagation)
        check "manual client span GET with url.full" has "-> url.full: Str(http://shop.lab.k8s.local/api/products"
        check "the shop received traceparent" bash -c 'grep -q "traceparent=00-[0-9a-f]\{32\}-" "$1"' _ "$work/shop.log"
        check "the shop received baggage workshop.customer.tier=gold" grep -qF "baggage=workshop.customer.tier=gold" "$work/shop.log"
        tid="$(grep -o 'traceparent=00-[0-9a-f]\{32\}' "$work/shop.log" | tail -1 | cut -d- -f2)"
        check "the shop's trace id $tid is a workshop trace" has "Trace ID       : $tid" ;;
      04-metrics)
        check "metrics workshop.checkouts, .checkouts.active, .compute.duration, .inventory.stock" \
          bash -c 'for n in workshop.checkouts workshop.checkouts.active workshop.compute.duration workshop.inventory.stock; do grep -q -- "-> Name: $n\$" "$1" || exit 1; done' _ "$work/otel.log"
        check "checkouts carry the outcome attribute" has "-> outcome: Str(placed)"
        check "traces still sent" has "Name           : checkout.reserve"
        check "no logs" lacks "ResourceLog" ;;
      05-logs)
        check "log records sent" has "ResourceLog"
        check "order log line with attribute workshop.order.id" bash -c 'grep -q "Body: Str(order .* placed" "$1" && grep -q -- "-> workshop.order.id: Str(" "$1"' _ "$work/otel.log"
        check "log records carry a trace id" bash -c 'grep -A30 "Body: Str(order" "$1" | grep -q "^Trace ID: [0-9a-f]\{32\}"' _ "$work/otel.log"
        check "declined charge logged with the exception" has "-> exception.type: Str("
        check "metrics and traces still sent" bash -c 'grep -q ResourceMetrics "$1" && grep -q ResourceSpans "$1"' _ "$work/otel.log" ;;
      prometheus-client)
        docker run --rm --network "$net" "$python_image" python -c \
          'import urllib.request; print(urllib.request.urlopen("http://d2-ws-app:8000/metrics").read().decode())' >"$work/metrics.txt"
        check "/metrics has workshop_http_requests_total, workshop_checkouts_total, workshop_inventory_stock" \
          bash -c 'for n in "workshop_http_requests_total{" "workshop_checkouts_total{outcome=\"placed\"}" "workshop_inventory_stock{sku=" "workshop_http_request_duration_seconds_bucket{"; do grep -qF "$n" "$1" || exit 1; done' _ "$work/metrics.txt"
        grep -E '^workshop_checkouts_total' "$work/metrics.txt" | sed 's/^/          /'
        check "sends no OTLP" lacks "ResourceSpans" ;;
    esac
    docker rm -f d2-ws-app d2-ws-otelcol >/dev/null
  done
done

[ "$status" -eq 0 ] || { echo "WORKSHOP TEST FAILED"; exit 1; }
echo "WORKSHOP TEST PASSED"
