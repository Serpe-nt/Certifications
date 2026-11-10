#!/usr/bin/env bash
# Runs tests/platform/s3-test.sh against the three S3 stores that current Grafana
# examples and charts name: RustFS, Garage and PGSTY Silo (the MinIO fork). Each store
# runs as one Docker container on a private network; nothing is published on a host
# port. The result is the test evidence in lgtm/docs/adr/l2-s3-store.md.
#
# Usage: tests/platform/compare-s3.sh   (needs Docker; cleans up after itself)
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
versions="$here/../../helm/platform/versions.yml"
aws_cli="$(awk '/^  aws_cli:/ {print $2}' "$versions")"
rustfs_image="$(awk '/^  rustfs:/ && /docker.io/ {print $2}' "$versions")"
garage_image=docker.io/dxflrs/garage:v2.5.0
silo_image=docker.io/pgsty/silo:RELEASE.2026-11-09T00-00-00Z
net=lgtm-l2-s3-compare
access=lgtmlabcompare
secret="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
work=""
cleanup() {
  docker rm -f l2-rustfs l2-garage l2-silo >/dev/null 2>&1
  docker network rm "$net" >/dev/null 2>&1
  [ -z "$work" ] || rm -rf "$work"
}
trap cleanup EXIT
cleanup
work="$(mktemp -d)"
docker network create "$net" >/dev/null

docker run -d --name l2-rustfs --network "$net" \
  -e RUSTFS_ACCESS_KEY="$access" -e RUSTFS_SECRET_KEY="$secret" \
  -e RUSTFS_VOLUMES=/data -e RUSTFS_ADDRESS=:9000 \
  "$rustfs_image" >/dev/null

docker run -d --name l2-silo --network "$net" \
  -e MINIO_ROOT_USER="$access" -e MINIO_ROOT_PASSWORD="$secret" \
  "$silo_image" server /data >/dev/null

garage_key="GK$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"
garage_secret="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
cat > "$work/garage.toml" <<EOF
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
[s3_api]
s3_region = "us-east-1"
api_bind_addr = "[::]:3900"
root_domain = ".s3.garage.localhost"
[admin]
api_bind_addr = "[::]:3903"
EOF
chmod 644 "$work/garage.toml"
docker run -d --name l2-garage --network "$net" \
  -v "$work/garage.toml:/etc/garage.toml:ro" \
  -e GARAGE_DEFAULT_ACCESS_KEY="$garage_key" -e GARAGE_DEFAULT_SECRET_KEY="$garage_secret" \
  "$garage_image" /garage server --single-node --default-access-key >/dev/null

sleep 8
# Garage's default key may not create buckets until it is allowed to.
docker exec l2-garage /garage key allow --create-bucket "$garage_key" >/dev/null 2>&1 \
  || echo "note: garage key allow --create-bucket failed"

run_test() { # name endpoint access secret region
  echo "=== $1"
  docker run --rm --network "$net" --entrypoint bash \
    -e S3_ENDPOINT_URL="$2" -e AWS_ACCESS_KEY_ID="$3" -e AWS_SECRET_ACCESS_KEY="$4" \
    -e AWS_DEFAULT_REGION="$5" -e S3_CREATE_BUCKETS=1 \
    -v "$here/s3-test.sh:/s3-test.sh:ro" "$aws_cli" /s3-test.sh
  echo "=== $1 exit code $?"
}

run_test "rustfs $rustfs_image" http://l2-rustfs:9000 "$access" "$secret" us-east-1
run_test "garage $garage_image" http://l2-garage:3900 "$garage_key" "$garage_secret" us-east-1
run_test "silo $silo_image" http://l2-silo:9000 "$access" "$secret" us-east-1

echo "=== idle memory after the tests"
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' l2-rustfs l2-garage l2-silo
echo "=== image sizes"
docker image ls --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep -E 'rustfs/rustfs|dxflrs/garage|pgsty/silo'
