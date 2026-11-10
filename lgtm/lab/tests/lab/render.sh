#!/usr/bin/env bash
# Render every LGTM release for both profiles exactly as the playbook installs
# it (same pinned charts, values files and computed values), then:
#   - helm lint the lab-glue chart,
#   - check the rendered manifests against the Kubernetes 1.35 schemas and the
#     CRD schemas of the datree catalog (Gateway API, Prometheus Operator, ...),
#   - check that every container has requests and a memory limit.
# Run by `make lab-lint`; needs the pinned tools in lgtm/lab/.bin and the
# virtual environment (make venv collections lab-tools). Nothing reaches a
# cluster; the charts are downloaded from their repositories.
set -euo pipefail
cd "$(dirname "$0")/../.."

bin="$PWD/.bin"
out="${LAB_RENDER_DIR:-$bin/lab-render}"
ansible_dir="${ANSIBLE_DIR:-$PWD/ansible}"
ansible_playbook="${ANSIBLE_PLAYBOOK:-ansible-playbook}"
python="${PYTHON:-python3}"
export HELM_CACHE_HOME="$bin/helm-home/cache" HELM_CONFIG_HOME="$bin/helm-home/config" HELM_DATA_HOME="$bin/helm-home/data"
export ANSIBLE_CONFIG="$ansible_dir/ansible.cfg" ANSIBLE_ROLES_PATH="$ansible_dir/roles"
releases="prometheus,mimir,loki,tempo,otel-gateway,alloy,grafana,glue,shop"

echo "==> helm lint lab-glue"
"$bin/helm" lint charts/lab-glue --strict -f helm/lab-glue/values.yaml
"$bin/helm" lint charts/lab-glue --strict -f helm/lab-glue/values.yaml -f helm/lab-glue/values-kind.yaml

status=0
for profile in full kind; do
  echo "==> Render every release, profile $profile"
  rm -rf "${out:?}/$profile"
  mkdir -p "$out/$profile"
  (cd "$ansible_dir" && $ansible_playbook -i localhost, playbooks/lab.yml --tags "$releases" \
    -e lab_profile="$profile" -e lab_render_dir="$out/$profile" >"$out/$profile.log") \
    || { cat "$out/$profile.log"; exit 1; }
  ls "$out/$profile"

  echo "==> Schema check, profile $profile"
  "$bin/kubeconform" -strict -summary -ignore-missing-schemas -kubernetes-version 1.35.0 \
    -schema-location default \
    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
    "$out/$profile"/*.yaml || status=1

  echo "==> Requests and limits, profile $profile"
  "$python" -I tests/lab/check_resources.py "$out/$profile"/*.yaml || status=1
done

[ "$status" -eq 0 ] || { echo "LAB LINT FAILED"; exit 1; }
echo "lab lint passed"
