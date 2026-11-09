# Cluster targets (card L1): inventory, Kubernetes on the VMs, checks and linters.
# Run from lgtm/lab in WSL. The VMs themselves are made on Windows with
# vm/hyperv/lab-vms.ps1 (see docs/cluster.md).

ANSIBLE_DIR   := $(CURDIR)/ansible
VENV          ?= $(CURDIR)/.venv
PYTHON        ?= python3
# Use the tools of the project's virtual environment when it exists (make venv),
# otherwise the ones on PATH.
TOOLS         := $(if $(wildcard $(VENV)/bin/ansible-playbook),$(VENV)/bin/,)
ANSIBLE_PLAYBOOK := $(TOOLS)ansible-playbook
ANSIBLE_GALAXY   := $(TOOLS)ansible-galaxy
ANSIBLE_LINT     := $(TOOLS)ansible-lint
YAMLLINT         := $(TOOLS)yamllint
# Extra arguments for ansible-playbook, for example ANSIBLE_ARGS="--limit worker4 -v".
ANSIBLE_ARGS  ?=
LAB_KUBECONFIG ?= $(HOME)/.kube/lgtm-lab.config
# Scratch file for inventory-check, inside the git-ignored .bin folder.
INVENTORY_CHECK_FILE := $(CURDIR)/.bin/inventory-check/hosts.yml

# Ansible ignores an ansible.cfg in a world-writable directory, which every folder under
# /mnt/c is in WSL. Naming the file explicitly makes it apply wherever the checkout lives.
export ANSIBLE_CONFIG := $(ANSIBLE_DIR)/ansible.cfg

.PHONY: venv collections inventory inventory-check cluster cluster-check ping lint lint-ps forget-host-keys

venv: ## Create lgtm/lab/.venv with the pinned Ansible, ansible-lint and yamllint
	$(PYTHON) -m venv $(VENV)
	$(VENV)/bin/pip install --disable-pip-version-check -q -r $(ANSIBLE_DIR)/requirements-dev.txt

collections: ## Install the pinned Ansible collections into ansible/.ansible/collections
	cd $(ANSIBLE_DIR) && $(ANSIBLE_GALAXY) collection install -r requirements.yml -p ./.ansible/collections

inventory: ## Generate ansible/inventory/hosts.yml from vm/nodes.yml
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) -i localhost, -c local playbooks/inventory.yml

inventory-check: ## Fail when ansible/inventory/hosts.yml is not what nodes.yml generates
	mkdir -p $(dir $(INVENTORY_CHECK_FILE))
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) -i localhost, -c local playbooks/inventory.yml -e inventory_output=$(INVENTORY_CHECK_FILE) >/dev/null
	diff -u $(ANSIBLE_DIR)/inventory/hosts.yml $(INVENTORY_CHECK_FILE)
	@echo "inventory/hosts.yml is up to date"

cluster: inventory collections ## Turn the running VMs into the Kubernetes cluster (ansible-playbook site.yml)
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) site.yml $(ANSIBLE_ARGS)

cluster-check: ## Check the load balancer, DNS, nodes, system pods and kubeconfig
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) playbooks/cluster-check.yml $(ANSIBLE_ARGS)
	KUBECONFIG=$(LAB_KUBECONFIG) kubectl get nodes -o wide

ping: ## Check that Ansible reaches every VM over SSH
	cd $(ANSIBLE_DIR) && $(TOOLS)ansible all -m ansible.builtin.ping

lint: ## yamllint, ansible-lint, syntax check and inventory check
	$(YAMLLINT) --strict -c $(ANSIBLE_DIR)/.yamllint $(ANSIBLE_DIR) $(CURDIR)/vm/nodes.yml
	cd $(ANSIBLE_DIR) && $(ANSIBLE_LINT)
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) --syntax-check site.yml
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) --syntax-check playbooks/cluster-check.yml
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) --syntax-check -i localhost, playbooks/inventory.yml
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) --syntax-check -i inventory/examples/kvm-multi-nic/hosts.yml site.yml
	$(MAKE) --no-print-directory inventory-check

lint-ps: ## PSScriptAnalyzer and Pester for the Hyper-V script (runs Windows PowerShell)
	cd $(CURDIR)/vm/hyperv/tests && powershell.exe -NoProfile -ExecutionPolicy Bypass -File Install-TestTools.ps1
	cd $(CURDIR)/vm/hyperv/tests && powershell.exe -NoProfile -ExecutionPolicy Bypass -File Invoke-Checks.ps1

forget-host-keys: ## Forget the SSH host keys of the lab VMs (after destroy and create)
	rm -f $(HOME)/.ssh/known_hosts_lgtm-lab
