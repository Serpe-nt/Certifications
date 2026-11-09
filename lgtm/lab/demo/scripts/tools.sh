#!/usr/bin/env bash
# Download the pinned tools the demo's chart checks and kind test need into
# lgtm/lab/.bin (git-ignored). Each download is checked against a SHA-256
# sum recorded here; nothing is installed system-wide. Linux amd64 (WSL).
#
# Versions were current on 2026-11-09; see lgtm/docs/adr/d1-trimmed-demo.md.
set -euo pipefail

bin="$(cd "$(dirname "$0")/../.." && pwd)/.bin"
mkdir -p "$bin"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

HELM_VERSION=v4.3.1
HELM_SHA256=0403a88ae20913d11b10a2467b50087721fea7581736da6b9d3992f5357fe54b
KIND_VERSION=v0.33.0
KIND_SHA256=aee6151561422756b764a4ae28e7f44cda5af5a9eead3cc9985112b1de8d8e0d
KUBECTL_VERSION=v1.35.10
KUBECTL_SHA256=c49a28f1f4efc4d475ed05f47f2ce8e563bf7bef69ed77fe1b924ea6d83b6327
KUBECONFORM_VERSION=v0.8.0
KUBECONFORM_SHA256=9bc2bffbf71f261128533edaf912153948b7ff238f9a531ae6d34466ec287883

fetch() { # url sha256 destination
  curl -fsSL -o "$3" "$1"
  echo "$2  $3" | sha256sum -c --quiet -
}

if [ ! -x "$bin/helm" ] || ! "$bin/helm" version --short | grep -q "^$HELM_VERSION"; then
  fetch "https://get.helm.sh/helm-$HELM_VERSION-linux-amd64.tar.gz" "$HELM_SHA256" "$tmp/helm.tgz"
  tar -xzf "$tmp/helm.tgz" -C "$tmp" linux-amd64/helm
  install -m 0755 "$tmp/linux-amd64/helm" "$bin/helm"
fi
if [ ! -x "$bin/kind" ] || ! "$bin/kind" version | grep -q "$KIND_VERSION"; then
  fetch "https://github.com/kubernetes-sigs/kind/releases/download/$KIND_VERSION/kind-linux-amd64" "$KIND_SHA256" "$tmp/kind"
  install -m 0755 "$tmp/kind" "$bin/kind"
fi
if [ ! -x "$bin/kubectl" ] || ! "$bin/kubectl" version --client | grep -q "$KUBECTL_VERSION"; then
  fetch "https://dl.k8s.io/release/$KUBECTL_VERSION/bin/linux/amd64/kubectl" "$KUBECTL_SHA256" "$tmp/kubectl"
  install -m 0755 "$tmp/kubectl" "$bin/kubectl"
fi
if [ ! -x "$bin/kubeconform" ] || ! "$bin/kubeconform" -v | grep -q "$KUBECONFORM_VERSION"; then
  fetch "https://github.com/yannh/kubeconform/releases/download/$KUBECONFORM_VERSION/kubeconform-linux-amd64.tar.gz" "$KUBECONFORM_SHA256" "$tmp/kubeconform.tgz"
  tar -xzf "$tmp/kubeconform.tgz" -C "$tmp" kubeconform
  install -m 0755 "$tmp/kubeconform" "$bin/kubeconform"
fi

"$bin/helm" version --short
"$bin/kind" version
"$bin/kubectl" version --client | head -1
"$bin/kubeconform" -v
