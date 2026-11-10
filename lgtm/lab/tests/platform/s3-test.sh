#!/usr/bin/env bash
# S3 behaviour test for the lab's object store (card L2), run with the AWS CLI.
#
# It checks what Mimir, Loki and Tempo need from an S3-compatible store: the lab buckets
# exist (or are created), and on a scratch bucket an object can be put, listed, read by
# byte range, uploaded in several parts and deleted.
#
# Environment:
#   S3_ENDPOINT_URL         for example http://rustfs-svc.s3.svc:9000
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
#   S3_BUCKETS              space-separated buckets that must exist
#   S3_CREATE_BUCKETS=1     create missing buckets instead of failing (store comparison)
#
# It runs inside the amazon/aws-cli image: in the cluster from tests/platform/smoke.sh,
# and against Docker containers from tests/platform/compare-s3.sh.
set -euo pipefail

: "${S3_ENDPOINT_URL:?set S3_ENDPOINT_URL}"
: "${S3_BUCKETS:=mimir-blocks mimir-ruler mimir-alertmanager loki-chunks loki-ruler tempo-traces}"
export HOME="${HOME:-/tmp}"
[ -w "$HOME" ] || export HOME=/tmp
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Path-style addressing: the lab store has no wildcard DNS for virtual-hosted buckets.
aws configure set default.s3.addressing_style path
s3api() { aws --endpoint-url "$S3_ENDPOINT_URL" s3api "$@"; }
s3() { aws --endpoint-url "$S3_ENDPOINT_URL" s3 "$@"; }
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*"; exit 1; }

for b in $S3_BUCKETS; do
  if s3api head-bucket --bucket "$b" >/dev/null 2>&1; then
    pass "bucket $b exists"
  elif [ "${S3_CREATE_BUCKETS:-0}" = 1 ]; then
    s3api create-bucket --bucket "$b" >/dev/null && pass "bucket $b created"
  else
    fail "bucket $b is missing"
  fi
done

scratch="smoke-$(date +%s)-$RANDOM"
s3api create-bucket --bucket "$scratch" >/dev/null || fail "create scratch bucket $scratch"
pass "scratch bucket $scratch created"

printf 'lgtm-lab-0123456789abcdef' > "$work/small"
s3api put-object --bucket "$scratch" --key dir/small.txt --body "$work/small" >/dev/null || fail "put"
pass "put dir/small.txt"

listed="$(s3api list-objects-v2 --bucket "$scratch" --prefix dir/ --query 'Contents[].Key' --output text)"
[ "$listed" = "dir/small.txt" ] || fail "list returned '$listed'"
pass "list returned dir/small.txt"

s3api get-object --bucket "$scratch" --key dir/small.txt --range bytes=9-12 "$work/range" >/dev/null || fail "range get"
[ "$(cat "$work/range")" = "0123" ] || fail "range read returned '$(cat "$work/range")'"
pass "range read bytes=9-12 returned 0123"

# 20 MiB is above the CLI's 8 MiB multipart threshold: three parts of 8, 8 and 4 MiB.
head -c $((20 * 1024 * 1024)) /dev/urandom > "$work/big"
s3 cp --only-show-errors "$work/big" "s3://$scratch/big.bin" || fail "multipart upload"
etag="$(s3api head-object --bucket "$scratch" --key big.bin --query ETag --output text)"
case "$etag" in *-3*) pass "multipart upload, ETag $etag" ;; *) fail "ETag $etag does not show 3 parts" ;; esac
s3 cp --only-show-errors "s3://$scratch/big.bin" "$work/big.back" || fail "download"
[ "$(sha256sum < "$work/big")" = "$(sha256sum < "$work/big.back")" ] || fail "downloaded object differs"
pass "downloaded object matches"

s3api delete-object --bucket "$scratch" --key dir/small.txt >/dev/null || fail "delete small"
s3api delete-object --bucket "$scratch" --key big.bin >/dev/null || fail "delete big"
# The CLI prints "None" when the listing has no Contents.
left="$(s3api list-objects-v2 --bucket "$scratch" --query 'Contents[].Key' --output text)"
[ "$left" = "None" ] || [ -z "$left" ] || fail "bucket not empty after delete: $left"
pass "objects deleted"
s3api delete-bucket --bucket "$scratch" >/dev/null || fail "delete scratch bucket"
pass "scratch bucket deleted"
echo "S3 TEST PASSED against $S3_ENDPOINT_URL"
