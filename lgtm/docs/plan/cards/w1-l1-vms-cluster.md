# L1: VMs and cluster

Wave 1. Model Opus 5.5, high effort. Runs beside S1 and D1; shares no file with them.

## Owns

`lgtm/lab/vm/**`, `lgtm/lab/ansible/**` (except `roles/platform_*`, `roles/lab_*`, `playbooks/platform.yml` and `playbooks/lab.yml`, which later cards create), `lgtm/lab/Makefile`, `lgtm/lab/mk/cluster.mk`, `lgtm/lab/docs/cluster.md`, `lgtm/lab/docs/acceptance-cluster.md`, `.github/workflows/lgtm-lab-cluster.yml`, `lgtm/docs/adr/l1-*.md`

`lgtm/lab/.gitignore` already exists and ignores `.bin/`, `.venv/`, keys, kubeconfigs and `vm/hyperv/.cache/` (put downloaded images and seeds there). If you need another entry, ask in the pull request.

## Read first

- `lgtm/docs/plan/00-overview.md` (sections 5 and 7), `02-lab-contract.md` (sections "Machines and network", "Platform interfaces", "Commands the learner runs")
- Everything in `lgtm/lab/ansible/`. It is the owner's `k8s-provision` project, copied unchanged from commit `8442dee` of github.com/Odery/k8s-provision. It was written for KVM VMs with several network cards (management on 192.168.10.x, cluster on 10.10.0.x, interface `eth2`), a hand-made load balancer and a DNS server at 10.10.0.5. It installs Kubernetes 1.35 with kubeadm, containerd and Calico 3.31.4. It does not create VMs, the load balancer or DNS.

## Goal

From nothing to an empty, healthy, highly available Kubernetes cluster with two commands: one PowerShell command that creates the Hyper-V VMs, one `make cluster` that turns them into a cluster. The Ansible side works on any hypervisor.

## What the PC looks like (checked 2026-11-09)

- Windows 11 Pro, 61.6 GB RAM, 32 logical CPUs, 121 GB free on C:. Hyper-V is installed (`vmms` runs, `New-VM` exists). Agent sessions are **not** elevated: `Get-VM` and `Get-VMSwitch` are refused. You cannot create or list VMs. The owner runs the script.
- WSL distribution `archlinux` (user `vaka`) has ansible-core 2.21.5, Python 3.14, git, make, docker, kubectl; no helm, no kind. `.wslconfig` sets `networkingMode=mirrored`.
- `~/.kube/config` in that distribution points at the owner's older cluster. Never write to it.

## Build

1. **`lgtm/lab/vm/nodes.yml`**: the one list of machines (name, role, address, vCPU, memory, disks) with the sizes from the overview, plus network settings (switch name, subnet, gateway, DNS, domain), SSH user and public key path, image URL and checksum.
2. **`lgtm/lab/vm/hyperv/lab-vms.ps1`** with actions `plan`, `create`, `start`, `stop`, `destroy`, `status`.
   - `plan` needs no administrator rights and prints exactly what `create` would do.
   - `create` is idempotent: internal switch `lgtm-lab` with NAT for 10.10.0.0/24; Ubuntu Server LTS cloud image downloaded once and checksum-verified; a disk per VM; a cloud-init seed per VM (hostname, user, SSH key, static address, DNS, no password login); generation 2 VMs with the Secure Boot template for Linux, static memory, the worker data disk; VMs tagged in their Notes as `lgtm-lab`.
   - `destroy` removes only what carries that tag, and the switch and NAT only if the script created them. It refuses anything else.
   - Optional switch `-ConfigureDns`: a name resolution rule on Windows that sends `.k8s.local` to 10.10.0.5, so the browser resolves lab addresses.
   - `SupportsShouldProcess` throughout, so `-WhatIf` works.
   - Find out and record in an ADR: which image format Canonical publishes that Hyper-V can boot, and how you convert it if needed; how the cloud-init seed is attached; how WSL in mirrored mode reaches the internal switch and what the fallback is if it does not.
3. **Inventory.** `make inventory` generates `lgtm/lab/ansible/inventory/hosts.yml` from `nodes.yml`. Keep the owner's variable names (`k8s_net_ip`, `k8s_interface`, `control_plane_endpoint`). Move the original KVM inventory to `inventory/examples/kvm-multi-nic/` as a second supported shape.
4. **Roles.** Change the copied roles as little as possible, and list every change with its reason in `lgtm/lab/ansible/CHANGES.md` (which names the upstream commit). They must stay hypervisor-neutral and become safely re-runnable. Known points: the `network` role writes a netplan file for a separate cluster interface, which must be optional when the machine has one card configured by cloud-init; the Kubernetes minor version and the Calico version become variables in one place.
5. **New roles and plays.**
   - `lb_haproxy`: installs HAProxy on `lb` and renders the owner's `haproxy.cfg` as a template from the inventory groups.
   - `lb_dnsmasq`: serves `k8s.local`, with `cluster-endpoint.k8s.local` and `*.lab.k8s.local` pointing at `lb`, and forwards everything else.
   - `node_prereqs`: time sync, and on workers what Longhorn needs (iSCSI, NFS client, the data disk mounted at `/var/lib/longhorn`).
   - `kubeconfig_fetch`: writes the admin kubeconfig to `~/.kube/lgtm-lab.config` on the control machine, never to `~/.kube/config`.
   - `site.yml` runs the load balancer play before `kubeadm init`, because the control-plane endpoint must resolve first.
   - `requirements.yml` for the Ansible collections, including `kubernetes.core`, which the later lab cards use; installed into the project, not the system.
6. **Make and docs.** `lgtm/lab/Makefile` that only includes `mk/*.mk`; `mk/cluster.mk` with `inventory`, `cluster`, `cluster-check`, `lint`. `docs/cluster.md` explains the layout and both commands. `docs/acceptance-cluster.md` is the checklist the owner follows the first time: each command, what to expect, how to undo.
7. **Checks you can run.** ansible-lint and `ansible-playbook --syntax-check` (in a virtual environment inside the worktree, through WSL), yamllint, PSScriptAnalyzer, Pester tests for reading `nodes.yml` and rendering cloud-init, `lab-vms.ps1 plan` and `create -WhatIf`. The CI workflow runs the same linters on pull requests that touch your paths.

## Limits

You cannot run the VM script for real or reach a cluster. Do not try to get administrator rights, do not change Windows or WSL settings, do not install system packages, do not start the owner's old VMs. Say plainly in the pull request what is unverified.

## Done when

- [ ] `lab-vms.ps1 plan` prints a complete, correct plan for 8 VMs from `nodes.yml`; `create -WhatIf` runs clean without elevation up to the first call that needs it, and says so.
- [ ] Pester tests, PSScriptAnalyzer, ansible-lint, yamllint and the syntax check pass; the CI workflow passes.
- [ ] `make inventory` output matches the lab contract addresses.
- [ ] `CHANGES.md` lists every change to the copied roles; nothing in any role names a hypervisor.
- [ ] The acceptance checklist is complete enough that the owner can run it without asking.
- [ ] ADRs exist for the image and seed method and for WSL networking.

## Report

The pull request link, the `plan` output, lint results, the list of unverified points in the order the owner will meet them.
