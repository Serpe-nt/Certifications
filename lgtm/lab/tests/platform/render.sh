#!/usr/bin/env bash
# Lints and renders every platform chart with the lab's values, for both profiles, and
# checks the result (card L2). Run it with `make platform-lint`; CI runs it too. It
# needs no cluster.
#
# For each release in helm/platform/versions.yml:
#   1. pull the pinned chart into .bin/charts (once),
#   2. `helm lint` with the values of the profile,
#   3. `helm template` and a schema check of every rendered object with kubeconform
#      (Kubernetes 1.35; custom resources against the CRDs catalog),
#   4. compare every rendered container image with the image list in versions.yml.
set -euo pipefail

lab="$(cd "$(dirname "$0")/../.." && pwd)"
bin="$lab/.bin"
values="$lab/helm/platform"
versions="$values/versions.yml"
out="$bin/render"
export HELM_CACHE_HOME="$bin/helm-home/cache" HELM_CONFIG_HOME="$bin/helm-home/config" HELM_DATA_HOME="$bin/helm-home/data"
for t in helm kubeconform; do
  [ -x "$bin/$t" ] || { echo "Missing $bin/$t: run make platform-tools" >&2; exit 1; }
done
mkdir -p "$out" "$bin/charts"

# chart_field <key> <field>: one field of a release in platform_charts.
chart_field() {
  awk -v key="  $1:" -v field="    $2:" '
    index($0, key) == 1 { inside = 1; next }
    inside && /^  [a-z]/ { inside = 0 }
    inside && index($0, field) == 1 { print $2; exit }' "$versions"
}
# image <key>: one entry of platform_images.
image() { awk -v k="  $1:" '/^platform_images:/ {inside = 1} inside && index($0, k) == 1 {print $2; exit}' "$versions"; }
# Image names as Kubernetes would pull them: docker.io and library/ made explicit.
normalize() {
  sed -E 's/@sha256:[0-9a-f]+$//' | awk '{
    n = $0
    split(n, parts, "/")
    if (index(parts[1], ".") == 0 && index(parts[1], ":") == 0 && parts[1] != "localhost") n = "docker.io/" n
    if (n ~ /^docker\.io\/[^\/]+$/ || n ~ /^docker\.io\/[^\/]+:/) sub(/^docker\.io\//, "docker.io/library/", n)
    print n }' | sort -u
}

allowed="$( { sed -n '/^platform_images:/,$p' "$versions" | grep -oE '[a-z0-9.-]+(\.[a-z]+)?/[^ ]+:[^ ]+' ; } | normalize)"

pull() { # key
  local repo ref chart version dir
  repo="$(chart_field "$1" repo)"; ref="$(chart_field "$1" ref)"
  chart="$(chart_field "$1" chart)"; version="$(chart_field "$1" version)"
  dir="$bin/charts/$chart-$version"
  if [ ! -d "$dir/$chart" ]; then
    mkdir -p "$dir"
    if [ -n "$ref" ]; then
      "$bin/helm" pull "$ref" --version "$version" --untar --untardir "$dir" >/dev/null
    else
      "$bin/helm" pull "$chart" --repo "$repo" --version "$version" --untar --untardir "$dir" >/dev/null
    fi
  fi
  echo "$dir/$chart"
}

rustfs_image="$(image rustfs)"
busybox_image="$(image busybox)"
failures=0
check() { # key release namespace profile values-args...
  local key="$1" release="$2" namespace="$3" profile="$4" chart file images unknown
  shift 4
  chart="$(pull "$key")"
  file="$out/$release-$profile.yaml"
  echo "== $release ($profile): $(basename "$(dirname "$chart")")"
  "$bin/helm" lint --quiet "$chart" --namespace "$namespace" "$@" >/dev/null || { echo "FAIL helm lint"; failures=$((failures + 1)); }
  "$bin/helm" template "$release" "$chart" --namespace "$namespace" --include-crds "$@" > "$file"
  # CustomResourceDefinitions come unchanged from upstream and have no schema in
  # kubeconform's catalog; the custom resources themselves are checked.
  "$bin/kubeconform" -strict -summary -kubernetes-version 1.35.0 -skip CustomResourceDefinition \
    -schema-location default \
    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
    "$file" || failures=$((failures + 1))
  # Strimzi's CRDs carry `image: {}` schema stubs; only real image references count.
  images="$(grep -E '^\s+(- )?image: ' "$file" | sed -E 's/.*image: *//; s/["'\'']//g' | grep -E '[:/]' | normalize)"
  unknown="$(comm -23 <(echo "$images") <(echo "$allowed"))"
  if [ -n "$unknown" ]; then
    echo "FAIL images not pinned in versions.yml:"; printf '%s
' "$unknown" | awk '{print "  " $0}'
    failures=$((failures + 1))
  else
    echo "images: $(echo "$images" | tr '\n' ' ')"
  fi
}

for profile in full kind; do
  overlay() { [ "$profile" = kind ] && [ -f "$values/$1/values-kind.yaml" ] && echo "--values=$values/$1/values-kind.yaml" || true; }
  sc=longhorn; [ "$profile" = kind ] && sc=standard
  check metrics_server metrics-server kube-system "$profile" --values "$values/metrics-server/values.yaml"
  check cert_manager cert-manager cert-manager "$profile" --values "$values/cert-manager/values.yaml"
  check envoy_gateway envoy-gateway gateway "$profile" --values "$values/envoy-gateway/values.yaml"
  check strimzi strimzi kafka "$profile" --values "$values/strimzi/values.yaml"
  # The platform_s3 role adds the StorageClass and the image tags; render.sh does the same.
  # shellcheck disable=SC2046
  check rustfs rustfs s3 "$profile" --values "$values/rustfs/values.yaml" $(overlay rustfs) \
    --set "storageclass.name=$sc" \
    --set "image.rustfs.repository=${rustfs_image%:*}" --set "image.rustfs.tag=${rustfs_image##*:}" \
    --set "image.initImage.repository=${busybox_image%:*}" --set "image.initImage.tag=${busybox_image##*:}"
  if [ "$profile" = full ]; then
    check longhorn longhorn longhorn-system full --values "$values/longhorn/values.yaml"
  fi
done

echo
if [ "$failures" -eq 0 ]; then
  echo "RENDER CHECK PASSED"
else
  echo "RENDER CHECK FAILED: $failures failure(s)"
  exit 1
fi
