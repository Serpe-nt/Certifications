# Build, smoke-test and package the lab copy of the OpenTelemetry Demo.
#
# Run from lgtm/lab/demo in WSL or any Linux shell with Docker. Every build
# runs in Docker; no language toolchain is needed on the machine.
#
#   make build        build every image (tags from VERSION)
#   make smoke        run the shop with a debug-only collector and check that
#                     traces, metrics and logs arrive from every service
#   make down         stop the shop and delete its containers and volumes
#   make flag F=<name> V=<variant>
#                     switch a fault flag in the running Compose shop
#   make tools        download the pinned helm, kind, kubectl, kubeconform
#   make chart-lint   helm lint and a schema check of the rendered chart
#   make kind-test    install the chart on a kind cluster (lgtm-d1) and check it
#   make kind-delete  delete that kind cluster
#   make proto        regenerate the gRPC code after editing pb/demo.proto

SHELL := /bin/bash
.DEFAULT_GOAL := help

VERSION := $(shell cat VERSION)
COMPOSE_PROJECT_NAME ?= lgtm-demo
SMOKE_SECONDS ?= 120
export COMPOSE_PROJECT_NAME
export DEMO_VERSION := $(VERSION)
export OTEL_RESOURCE_ATTRIBUTES := service.namespace=opentelemetry-demo,service.version=$(VERSION)

COMPOSE := docker compose --env-file .env

.PHONY: help
help:
	@grep -E '^#   make' Makefile | sed 's/^#   //'

.PHONY: build
build:
	$(COMPOSE) build

.PHONY: up
up:
	$(COMPOSE) up -d --wait --wait-timeout 600

.PHONY: smoke
smoke: build
	SMOKE_SECONDS=$(SMOKE_SECONDS) ./scripts/smoke.sh

.PHONY: down
down:
	$(COMPOSE) down --volumes --remove-orphans

.PHONY: flag
flag:
	@test -n "$(F)" && test -n "$(V)" || { echo "usage: make flag F=<flag name> V=<variant>"; exit 2; }
	./scripts/set-flag.sh "$(F)" "$(V)"

.PHONY: tools
tools:
	./scripts/tools.sh

.PHONY: chart-lint
chart-lint: tools
	./scripts/chart-lint.sh

.PHONY: kind-test
kind-test: tools build
	./scripts/kind-test.sh

.PHONY: kind-delete
kind-delete:
	./scripts/kind-test.sh delete

.PHONY: proto
proto:
	./docker-gen-proto.sh
