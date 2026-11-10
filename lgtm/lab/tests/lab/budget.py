"""Sum the CPU and memory requests and limits of every release, as rendered
for the full profile by `make lab-lint` (lgtm/lab/.bin/lab-render/full).

Usage: python budget.py <render dir> [workers]
Pods are counted as the cluster runs them: replicas of Deployments and
StatefulSets, one DaemonSet pod per worker, and the pods the operators build
from the Prometheus, Alertmanager and Alloy resources (with their
config-reloader sidecars). Helm hooks and test pods are left out. The output
is the Markdown table used in lgtm/lab/docs/budget.md.
"""
import pathlib
import sys

import yaml

# Sidecars the operators add, which do not appear in the rendered manifests.
# Prometheus Operator: the values set prometheusConfigReloader to these.
RELOADER_PROM = {"cpu_req": 0.01, "mem_req": 32, "cpu_lim": 0.2, "mem_lim": 64}
# Alloy Operator: the alloy chart's config-reloader default (requests only;
# counted with the request as its limit).
RELOADER_ALLOY = {"cpu_req": 0.01, "mem_req": 50, "cpu_lim": 0.01, "mem_lim": 50}


def cpu(value):
    if value is None:
        return 0.0
    value = str(value)
    return float(value[:-1]) / 1000 if value.endswith("m") else float(value)


def mem(value):
    """Memory in MiB."""
    if value is None:
        return 0.0
    value = str(value)
    units = {"Ki": 1 / 1024, "Mi": 1, "Gi": 1024, "K": 1 / 1024 / 1.024, "M": 1 / 1.048576, "G": 1000 / 1.048576}
    for unit, factor in units.items():
        if value.endswith(unit):
            return float(value[: -len(unit)]) * factor
    return float(value) / 1024 / 1024


def container_sum(containers):
    total = {"cpu_req": 0.0, "mem_req": 0.0, "cpu_lim": 0.0, "mem_lim": 0.0}
    for c in containers:
        r = c.get("resources") or {}
        req, lim = r.get("requests") or {}, r.get("limits") or {}
        total["cpu_req"] += cpu(req.get("cpu"))
        total["mem_req"] += mem(req.get("memory"))
        total["cpu_lim"] += cpu(lim.get("cpu"))
        total["mem_lim"] += mem(lim.get("memory"))
    return total


def add(a, b, times=1):
    for k in a:
        a[k] += b[k] * times


def main(render_dir, workers):
    rows = []
    grand = {"cpu_req": 0.0, "mem_req": 0.0, "cpu_lim": 0.0, "mem_lim": 0.0}
    grand_pods = 0
    for path in sorted(pathlib.Path(render_dir).glob("*.yaml")):
        total = {"cpu_req": 0.0, "mem_req": 0.0, "cpu_lim": 0.0, "mem_lim": 0.0}
        pods = 0
        for doc in yaml.safe_load_all(path.read_text(encoding="utf-8")):
            if not isinstance(doc, dict):
                continue
            if ((doc.get("metadata") or {}).get("annotations") or {}).get("helm.sh/hook"):
                continue
            kind, spec = doc.get("kind"), doc.get("spec") or {}
            if kind in ("Deployment", "StatefulSet", "DaemonSet"):
                n = workers if kind == "DaemonSet" else spec.get("replicas", 1)
                pod = spec["template"]["spec"]
                add(total, container_sum(pod.get("containers", [])), n)
                pods += n
            elif kind in ("Prometheus", "Alertmanager"):
                n = spec.get("replicas", 1)
                add(total, container_sum([{"resources": spec.get("resources")}]), n)
                add(total, RELOADER_PROM, n)
                pods += n
            elif kind == "Alloy":
                alloy = spec.get("alloy") or {}
                controller = spec.get("controller") or {}
                n = workers if controller.get("type") == "daemonset" else controller.get("replicas", 1)
                add(total, container_sum([{"resources": alloy.get("resources")}]), n)
                add(total, RELOADER_ALLOY, n)
                pods += n
        rows.append((path.stem, pods, total))
        add(grand, total)
        grand_pods += pods
    print("| Release | Pods | CPU requests | Memory requests | CPU limits | Memory limits |")
    print("|---|---:|---:|---:|---:|---:|")
    for name, pods, t in rows:
        print(f"| {name} | {pods} | {t['cpu_req']:.2f} | {t['mem_req'] / 1024:.2f} GiB | {t['cpu_lim']:.1f} | {t['mem_lim'] / 1024:.2f} GiB |")
    print(f"| **Total** | **{grand_pods}** | **{grand['cpu_req']:.2f}** | **{grand['mem_req'] / 1024:.2f} GiB** | **{grand['cpu_lim']:.1f}** | **{grand['mem_lim'] / 1024:.2f} GiB** |")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 4)
