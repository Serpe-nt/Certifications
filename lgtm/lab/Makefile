# LGTM lab. Run `make <target>` from lgtm/lab in WSL.
# Each card adds its own fragment in mk/; this file only includes them.
.DEFAULT_GOAL := help

include $(sort $(wildcard mk/*.mk))

.PHONY: help
help: ## List the targets
	@grep -h -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "} {printf "  %-18s %s\n", $$1, $$2}'
