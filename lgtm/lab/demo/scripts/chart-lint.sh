#!/usr/bin/env bash
# Lint the shop chart and check its rendered manifests against the
# Kubernetes 1.35 schemas (and the Gateway API schemas for the routes).
# Uses the pinned tools in lgtm/lab/.bin; run scripts/tools.sh first.
set -euo pipefail
cd "$(dirname "$0")/.."
bin="$(cd .. && pwd)/.bin"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

echo "==> Chart files match their sources"
# Helm can only read files inside the chart, so these are copies.
diff -u src/flagd/demo.flagd.json chart/files/demo.flagd.json
diff -u src/postgresql/init.sql chart/files/init.sql
diff -u otel-config.yml chart/files/product-catalog-otel-config.yml
grep -q "^appVersion: \"$(cat VERSION)\"$" chart/Chart.yaml \
  || { echo "chart/Chart.yaml appVersion does not match VERSION"; exit 1; }
echo "    ok"

echo "==> helm lint"
"$bin/helm" lint chart --strict
"$bin/helm" lint chart --strict --set gateway.enabled=true --set storageClass=longhorn

echo "==> Render and validate"
"$bin/helm" template shop chart --namespace shop > "$out/default.yaml"
"$bin/helm" template shop chart --namespace shop \
  --set gateway.enabled=true --set storageClass=longhorn > "$out/lab.yaml"
for f in "$out/default.yaml" "$out/lab.yaml"; do
  "$bin/kubeconform" -strict -summary -kubernetes-version 1.35.0 \
    -schema-location default \
    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
    "$f"
done

echo "==> Every container has requests and limits"
images="$(grep -cE '^ +image: ' "$out/lab.yaml")"
limits="$(grep -A3 -E '^ +limits:' "$out/lab.yaml" | grep -cE '^ +memory: ')"
requests="$(grep -A1 -E '^ +requests:' "$out/lab.yaml" | grep -cE '^ +cpu: ')"
echo "    containers: $images, with memory limits: $limits, with cpu requests: $requests"
[ "$images" -eq "$limits" ] && [ "$images" -eq "$requests" ]   || { echo "a container is missing requests or limits"; exit 1; }
echo "chart lint passed"
