# L1: Versions pinned by the cluster card

Status: accepted by worker L1 on 2026-11-09.

## Context

Card rule 6: check versions on the day and record what was pinned and why. The overview pins
Kubernetes 1.35 and Calico 3.31.4 "as in the copied role"; everything else here is a tool or a
dependency of the cluster card.

## Decisions

| Item | Pin | Where | Source checked on 2026-11-09 | Note |
|---|---|---|---|---|
| Ubuntu cloud image | 24.04, `release-20261017`, SHA-256 `04e8f246...6c94` | `vm/nodes.yml` | https://cloud-images.ubuntu.com/releases/noble/release-20261017/SHA256SUMS | See `l1-vm-image-and-seed.md`. |
| Kubernetes minor | 1.35 (apt repository `pkgs.k8s.io/core:/stable:/v1.35`) | `ansible/inventory/group_vars/all.yml` | https://dl.k8s.io/release/stable-1.35.txt gives v1.35.10 | Unchanged from the copied role. Kubernetes 1.37.2 is current; 1.35 is two minors behind and still supported. |
| Calico | 3.31.4 | `ansible/inventory/group_vars/all.yml` | https://github.com/projectcalico/calico/releases | Unchanged from the copied role, as the overview says. 3.31.7 is the newest 3.31 patch and 3.33.0 the newest release; the planner may raise the pin in one line. |
| ansible-core | 2.21.5 | `ansible/requirements-dev.txt` | https://pypi.org/project/ansible-core/ | Same as the owner's WSL. 2.22.0 exists and needs Python 3.13 or later. |
| ansible-lint | 26.11.0 | `ansible/requirements-dev.txt` | https://pypi.org/project/ansible-lint/ | Latest. |
| yamllint | 1.38.0 | `ansible/requirements-dev.txt` | https://pypi.org/project/yamllint/ | Latest. |
| ansible.posix | 2.2.2 | `ansible/requirements.yml` | https://galaxy.ansible.com | Latest. |
| community.general | 14.0.1 | `ansible/requirements.yml` | https://galaxy.ansible.com | Latest. |
| kubernetes.core | 6.6.0 | `ansible/requirements.yml` | https://galaxy.ansible.com | Latest; for cards L2 and L3. |
| Pester | 5.7.1 | `vm/hyperv/tests/Install-TestTools.ps1` (SHA-512 checked) | https://www.powershellgallery.com/packages/Pester | Pester 6.2.0 exists; 5.7.1 is the last 5.x and runs on Windows PowerShell 5.1, which is what the owner's elevated shell is. |
| PSScriptAnalyzer | 1.25.0 | `vm/hyperv/tests/Install-TestTools.ps1` (SHA-512 checked) | https://www.powershellgallery.com/packages/PSScriptAnalyzer | Latest. |
| actions/checkout | v7.0.1 (`3d3c42e5`) | `.github/workflows/lgtm-lab-cluster.yml` | GitHub API, tag ref | Pinned by commit. |
| actions/setup-python | v7.1.0 (`6d4fd22b`) | `.github/workflows/lgtm-lab-cluster.yml` | GitHub API, tag ref | Pinned by commit. |

The Python tools are pinned at the top level only; pip resolves their dependencies. The PowerShell
modules are checked against the SHA-512 the PowerShell Gallery publishes.

## Seen while checking, for later cards

- `ansible.builtin.apt_repository` is deprecated in ansible-core 2.21 and goes away in 2.25; the
  copied `k8s_packages` role uses it. Moving to `deb822_repository` is a later change.
- Longhorn's install page lists open-iscsi 2.1.12 as broken; Ubuntu 24.04 ships 2.1.9 (`noble-updates`: 2.1.9-3ubuntu5.5, packages.ubuntu.com).
  L2 should re-check when it pins Longhorn.
