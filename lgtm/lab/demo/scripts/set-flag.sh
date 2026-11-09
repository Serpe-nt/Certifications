#!/usr/bin/env bash
# Switch one fault flag in the running Compose shop.
#
#   ./scripts/set-flag.sh <flag name> <variant>     e.g. paymentFailure 50%
#
# The flag file lives in the Compose volume <project>_flagd-data; flagd sees
# the change within a second. The flag screen at
# http://localhost:8095/feature does the same thing by hand. On Kubernetes
# use the flag screen, or edit the ConfigMap as docs/demo.md describes.
set -euo pipefail

flag="${1:?flag name}"
variant="${2:?variant}"
project="${COMPOSE_PROJECT_NAME:-lgtm-demo}"
# Same pinned Python image the recommendation service builds from.
python_image="docker.io/library/python:3.14.7-alpine3.24@sha256:c6ead215bfd31f1e433d968853b7a769989117115b728874824e6c0a27cb96fc"

docker run --rm -v "${project}_flagd-data:/data" "$python_image" python -I -c '
import json, sys
path = "/data/demo.flagd.json"
flag, variant = sys.argv[1], sys.argv[2]
with open(path) as f:
    doc = json.load(f)
flags = doc["flags"]
if flag not in flags:
    sys.exit("unknown flag %r; known: %s" % (flag, ", ".join(sorted(flags))))
if variant not in flags[flag]["variants"]:
    sys.exit("unknown variant %r for %s; known: %s" % (variant, flag, ", ".join(flags[flag]["variants"])))
# Like the flag screen: a flag with a targeting rule "if <condition> then
# <variant> else <variant>" (productCatalogFailure) is switched by its "then"
# branch; any other flag by its default variant.
rule = flags[flag].get("targeting", {}).get("if")
if isinstance(rule, list) and len(rule) == 3:
    rule[1] = variant
else:
    flags[flag]["defaultVariant"] = variant
with open(path, "w") as f:
    json.dump(doc, f, indent=2)
    f.write("\n")
print("%s -> %s (%r)" % (flag, variant, flags[flag]["variants"][variant]))
' "$flag" "$variant"
