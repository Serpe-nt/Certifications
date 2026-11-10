# Platform targets (card L2): storage, S3 store, gateway, Kafka, cert-manager and
# metrics-server on the cluster, their checks and linters. Run from lgtm/lab in WSL.
# Uses ANSIBLE_DIR, ANSIBLE_PLAYBOOK, YAMLLINT, ANSIBLE_ARGS and LAB_KUBECONFIG from
# mk/cluster.mk. Details: docs/platform.md.

# full (the real cluster) or kind (a smoke-test cluster: small values, no Longhorn).
LAB_PROFILE ?= full
# One add-on only, for example TAGS=kafka (see playbooks/platform.yml for the tags).
TAGS ?=
# The kind test cluster of this card and its own kubeconfig file.
PLATFORM_KIND_CLUSTER    ?= lgtm-l2
PLATFORM_KIND_KUBECONFIG ?= $(CURDIR)/.bin/$(PLATFORM_KIND_CLUSTER).kubeconfig
PLATFORM_KIND_HTTP_PORT  ?= 18080
PLATFORM_KIND_HTTPS_PORT ?= 18443

# The playbook lives in ansible/playbooks/, the roles in ansible/roles/.
PLATFORM_ROLES_PATH = ANSIBLE_ROLES_PATH=$(ANSIBLE_DIR)/roles
PLATFORM_PLAYBOOK = cd $(ANSIBLE_DIR) && $(PLATFORM_ROLES_PATH) $(ANSIBLE_PLAYBOOK) -i localhost, playbooks/platform.yml \
	-e lab_profile=$(LAB_PROFILE) -e lab_kubeconfig=$(LAB_KUBECONFIG)

.PHONY: platform platform-tools platform-check platform-kind platform-kind-delete platform-lint platform-lint-ansible

platform: collections ## Install the platform add-ons (LAB_PROFILE=full|kind, TAGS=<add-on>)
	$(PLATFORM_PLAYBOOK) $(if $(TAGS),--tags $(TAGS),) $(ANSIBLE_ARGS)

platform-tools: ## Download the pinned helm, kubectl, kind and kubeconform into .bin
	$(PLATFORM_PLAYBOOK) --tags tools $(ANSIBLE_ARGS)

platform-check: ## Smoke test: a volume, the S3 store, a route through the gateway, a Kafka message
	LAB_PROFILE=$(LAB_PROFILE) KUBECONFIG=$(LAB_KUBECONFIG) \
	PLATFORM_KIND_HTTP_PORT=$(PLATFORM_KIND_HTTP_PORT) PLATFORM_KIND_HTTPS_PORT=$(PLATFORM_KIND_HTTPS_PORT) \
	bash $(CURDIR)/tests/platform/smoke.sh

platform-kind: ## Create the kind test cluster lgtm-l2 (kubeconfig in .bin/lgtm-l2.kubeconfig)
	KIND_CLUSTER=$(PLATFORM_KIND_CLUSTER) KUBECONFIG=$(PLATFORM_KIND_KUBECONFIG) \
	PLATFORM_KIND_HTTP_PORT=$(PLATFORM_KIND_HTTP_PORT) PLATFORM_KIND_HTTPS_PORT=$(PLATFORM_KIND_HTTPS_PORT) \
	bash $(CURDIR)/tests/platform/kind.sh create

platform-kind-delete: ## Delete the kind test cluster lgtm-l2
	KIND_CLUSTER=$(PLATFORM_KIND_CLUSTER) KUBECONFIG=$(PLATFORM_KIND_KUBECONFIG) \
	bash $(CURDIR)/tests/platform/kind.sh delete

platform-lint-ansible: ## Syntax check of the platform playbook
	cd $(ANSIBLE_DIR) && $(PLATFORM_ROLES_PATH) $(ANSIBLE_PLAYBOOK) --syntax-check -i localhost, playbooks/platform.yml

platform-lint: platform-lint-ansible ## yamllint, helm lint and a schema check of every rendered platform chart
	$(YAMLLINT) --strict -c $(ANSIBLE_DIR)/.yamllint $(CURDIR)/helm/platform
	bash $(CURDIR)/tests/platform/render.sh

# `make lint` (mk/cluster.mk) also checks the platform playbook; ansible-lint and
# yamllint already cover the platform roles because they live under ansible/.
lint: platform-lint-ansible
