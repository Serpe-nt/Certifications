#!/bin/sh
# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0

set -e # Exit immediately if a command exits with a non-zero status.
set -x # Print commands and their arguments as they are executed

# This script is used to generate protobuf files for all services with Docker.


gen_proto_go() {
  echo "Generating Go protobuf files for $1"
  docker build -f "src/$1/genproto/Dockerfile" -t "lgtm-demo-genproto-$1" .
  docker run --rm -v $(pwd):/build "lgtm-demo-genproto-$1" \
    protoc -I /build/pb /build/pb/demo.proto --go_out="./src/$1/" --go-grpc_out="./src/$1/"
}

gen_proto_python() {
  echo "Generating Python protobuf files for $1"
  docker build -f "src/$1/genproto/Dockerfile" -t "lgtm-demo-genproto-$1" .
  docker run --rm -v $(pwd):/build "lgtm-demo-genproto-$1" \
    python -m grpc_tools.protoc -I /build/pb/ --python_out="./src/$1/" --grpc_python_out="./src/$1/" /build/pb/demo.proto
}

gen_proto_ts() {
  echo "Generating Typescript protobuf files for $1"
  docker build -f "src/$1/genproto/Dockerfile" -t "lgtm-demo-genproto-$1" .
  docker run --rm -e SERVICE=$1 -v $(pwd):/build "lgtm-demo-genproto-$1" /bin/sh -c '
    mkdir -p /build/src/$SERVICE/protos && \
    protoc -I /build/pb \
    --plugin=protoc-gen-ts_proto=/app/node_modules/.bin/protoc-gen-ts_proto \
    --ts_proto_opt=esModuleInterop=true \
    --ts_proto_out="/build/src/$SERVICE/protos" \
    --ts_proto_opt=outputServices=grpc-js \
    /build/pb/demo.proto'
}

if [ -z "$1" ]; then
  # ad, cart, fraud-detection and payment compile pb/demo.proto during
  # their own image build, so only these four keep generated code in git.
  gen_proto_go checkout
  gen_proto_ts frontend
  gen_proto_go product-catalog
  gen_proto_python recommendation
else
  "gen_proto_$1" "$2"
fi
