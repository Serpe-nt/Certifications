"""Check rendered manifests: every container and init container has CPU and
memory requests and a memory limit.

Usage: python check_resources.py <rendered.yaml>...
Helm test hooks are skipped (the lab never runs `helm test`). Containers of
custom resources that an operator turns into pods (Prometheus, Alertmanager,
Alloy) are checked where their spec carries a resources block.
Exits 1 when a container is missing something.
"""
import sys

import yaml


def pod_specs(doc):
    """Yield (where, pod spec) for workloads, and (where, spec) for the custom
    resources whose operator builds the pod from spec.resources."""
    kind = doc.get("kind", "")
    spec = doc.get("spec") or {}
    if kind in ("Deployment", "StatefulSet", "DaemonSet", "Job", "ReplicaSet"):
        yield kind, spec.get("template", {}).get("spec", {})
    elif kind == "CronJob":
        yield kind, spec.get("jobTemplate", {}).get("spec", {}).get("template", {}).get("spec", {})
    elif kind == "Pod":
        yield kind, spec


def complete(resources):
    requests = (resources or {}).get("requests") or {}
    limits = (resources or {}).get("limits") or {}
    return "cpu" in requests and "memory" in requests and "memory" in limits


def main(paths):
    missing = 0
    checked = 0
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            for doc in yaml.safe_load_all(handle):
                if not isinstance(doc, dict):
                    continue
                meta = doc.get("metadata") or {}
                hook = (meta.get("annotations") or {}).get("helm.sh/hook", "")
                if "test" in hook:
                    continue
                name = f'{doc.get("kind")}/{meta.get("namespace", "-")}/{meta.get("name")}'
                if doc.get("kind") in ("Prometheus", "Alertmanager"):
                    checked += 1
                    if not complete((doc.get("spec") or {}).get("resources")):
                        print(f"{path}: {name}: no complete resources")
                        missing += 1
                    continue
                if doc.get("kind") == "Alloy":
                    checked += 1
                    alloy = ((doc.get("spec") or {}).get("alloy") or {})
                    if not complete(alloy.get("resources")):
                        print(f"{path}: {name}: Alloy container without complete resources")
                        missing += 1
                    continue
                for _, spec in pod_specs(doc):
                    for container in (spec.get("initContainers") or []) + (spec.get("containers") or []):
                        checked += 1
                        if not complete(container.get("resources")):
                            print(f'{path}: {name}: container {container.get("name")} lacks requests or a memory limit')
                            missing += 1
    print(f"containers checked: {checked}, incomplete: {missing}")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
