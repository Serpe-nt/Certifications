# LGTM release targets (card L3): Mimir, Loki, Tempo, Grafana, the collector
# gateway, Alloy, the Prometheus stack and the shop, their checks and linters.
# Run from lgtm/lab in WSL. Uses ANSIBLE_DIR, ANSIBLE_PLAYBOOK, YAMLLINT,
# ANSIBLE_ARGS and LAB_KUBECONFIG from mk/cluster.mk. Details: docs/lgtm.md.

# full (the real cluster) or kind (a smoke-test cluster: small values).
LAB_PROFILE ?= full
# One release only, for example TAGS=loki (see playbooks/lab.yml for the tags).
TAGS ?=
# The kind test cluster of this card and its own kubeconfig file. Its gateway
# answers on 127.0.0.1:28080.
LAB_KIND_CLUSTER    ?= lgtm-l3
LAB_KIND_KUBECONFIG ?= $(CURDIR)/.bin/$(LAB_KIND_CLUSTER).kubeconfig
# Where the smoke test reaches the gateway: the lb VM (10.10.0.5) on port 80,
# or the kind cluster's host port.
LAB_GATEWAY_URL ?= $(if $(filter kind,$(LAB_PROFILE)),http://127.0.0.1:28080,http://10.10.0.5)
# Minutes the smoke test lets the load generator run before it queries.
LAB_CHECK_WARMUP ?= 3

# The playbook lives in ansible/playbooks/, the roles in ansible/roles/.
LAB_ROLES_PATH = ANSIBLE_ROLES_PATH=$(ANSIBLE_DIR)/roles
LAB_PLAYBOOK = cd $(ANSIBLE_DIR) && $(LAB_ROLES_PATH) $(ANSIBLE_PLAYBOOK) -i localhost, playbooks/lab.yml \
	-e lab_profile=$(LAB_PROFILE) -e lab_kubeconfig=$(LAB_KUBECONFIG)
LAB_RENDER_DIR = $(CURDIR)/.bin/lab-render

.PHONY: lab lab-tools status reset lab-check lab-kind-up lab-kind-down lab-lint lab-lint-ansible

lab: collections lab-tools ## Install the LGTM stack and the shop (LAB_PROFILE=full|kind, TAGS=<release>)
	$(LAB_PLAYBOOK) $(if $(TAGS),--tags $(TAGS),) $(ANSIBLE_ARGS)

lab-tools: ## Download the pinned helm, kubectl, kind and kubeconform into .bin
	bash $(CURDIR)/demo/scripts/tools.sh

status: ## What is running, the addresses and the lab seed
	KUBECONFIG=$(LAB_KUBECONFIG) $(CURDIR)/.bin/helm list --all-namespaces
	@echo "Pods that are not Running or Completed:"
	@KUBECONFIG=$(LAB_KUBECONFIG) $(CURDIR)/.bin/kubectl get pods --all-namespaces \
		--field-selector=status.phase!=Running,status.phase!=Succeeded
	$(LAB_PLAYBOOK) --tags report $(ANSIBLE_ARGS)

reset: ## Remove the lab releases, their volumes and bucket objects; keep the cluster and platform
	$(LAB_PLAYBOOK) --tags reset $(ANSIBLE_ARGS)

lab-check: ## Smoke test: every signal arrives and the shop can be followed metric -> trace -> log
	LAB_KUBECONFIG=$(LAB_KUBECONFIG) LAB_GATEWAY_URL=$(LAB_GATEWAY_URL) LAB_CHECK_WARMUP=$(LAB_CHECK_WARMUP) \
	bash $(CURDIR)/tests/lab/smoke.sh

lab-kind-up: lab-tools ## Create the kind test cluster lgtm-l3 with stand-ins for the platform
	KIND_CLUSTER=$(LAB_KIND_CLUSTER) LAB_KUBECONFIG=$(LAB_KIND_KUBECONFIG) bash $(CURDIR)/tests/lab/kind-up.sh

lab-kind-down: ## Delete the kind test cluster lgtm-l3
	KIND_CLUSTER=$(LAB_KIND_CLUSTER) LAB_KUBECONFIG=$(LAB_KIND_KUBECONFIG) bash $(CURDIR)/tests/lab/kind-up.sh delete

lab-lint-ansible: ## Syntax check of the lab playbook
	cd $(ANSIBLE_DIR) && $(LAB_ROLES_PATH) $(ANSIBLE_PLAYBOOK) --syntax-check -i localhost, playbooks/lab.yml

lab-lint: lab-lint-ansible lab-tools ## yamllint, helm lint, and a schema check of every release rendered for both profiles
	$(YAMLLINT) --strict -c $(CURDIR)/tests/lab/yamllint.yml $(CURDIR)/helm $(CURDIR)/charts/lab-glue $(CURDIR)/tests/lab
	LAB_RENDER_DIR=$(LAB_RENDER_DIR) ANSIBLE_DIR=$(ANSIBLE_DIR) ANSIBLE_PLAYBOOK="$(ANSIBLE_PLAYBOOK)" \
	PYTHON="$(if $(wildcard $(VENV)/bin/python),$(VENV)/bin/python,$(PYTHON))" \
	bash $(CURDIR)/tests/lab/render.sh

# `make lint` (mk/cluster.mk) also checks the lab playbook; ansible-lint and
# yamllint already cover the lab roles because they live under ansible/.
lint: lab-lint-ansible
