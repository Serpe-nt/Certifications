# Shop targets (card D1's demo), forwarded to lgtm/lab/demo/Makefile so they
# can be run from lgtm/lab. Each demo-<target> runs `make <target>` there; see
# docs/demo.md for what they do.

DEMO_DIR := $(CURDIR)/demo

.PHONY: demo-build demo-up demo-smoke demo-down demo-flag demo-tools demo-chart-lint demo-kind-test demo-kind-delete demo-proto

demo-build: ## Shop: build every image (tags from demo/VERSION)
	$(MAKE) -C $(DEMO_DIR) build

demo-up: ## Shop: run it in Docker Compose
	$(MAKE) -C $(DEMO_DIR) up

demo-smoke: ## Shop: run it in Compose with a debug collector and check every signal
	$(MAKE) -C $(DEMO_DIR) smoke

demo-down: ## Shop: stop the Compose shop and delete its volumes
	$(MAKE) -C $(DEMO_DIR) down

demo-flag: ## Shop: switch a fault flag in the Compose shop (F=<flag> V=<variant>)
	$(MAKE) -C $(DEMO_DIR) flag F="$(F)" V="$(V)"

demo-tools: ## Shop: download the pinned helm, kind, kubectl, kubeconform
	$(MAKE) -C $(DEMO_DIR) tools

demo-chart-lint: ## Shop: helm lint and a schema check of the shop chart
	$(MAKE) -C $(DEMO_DIR) chart-lint

demo-kind-test: ## Shop: install the chart on the kind cluster lgtm-d1 and check it
	$(MAKE) -C $(DEMO_DIR) kind-test

demo-kind-delete: ## Shop: delete the kind cluster lgtm-d1
	$(MAKE) -C $(DEMO_DIR) kind-delete

demo-proto: ## Shop: regenerate the gRPC code after editing pb/demo.proto
	$(MAKE) -C $(DEMO_DIR) proto
