# The lab cluster

How the lab's virtual machines and its Kubernetes cluster are made. Two commands do it: one in
an elevated PowerShell on Windows creates the VMs, one `make cluster` in WSL turns them into a
cluster. The first time, follow `acceptance-cluster.md` step by step.

## What you get

| Name | Address | vCPU | Memory | Disks | Runs |
|---|---|---|---|---|---|
| Windows host | 10.10.0.1 | | | | Hyper-V internal switch `lgtm-lab`, NAT to the internet |
| lb | 10.10.0.5 | 1 | 1 GB | 10 GB | HAProxy (6443 API, 80 and 443 to worker NodePorts 30080 and 30443, 8404 statistics), dnsmasq for `k8s.local` |
| master1 to master3 | 10.10.0.11 to .13 | 2 | 3 GB | 25 GB | kubeadm control plane, etcd |
| worker1 to worker4 | 10.10.0.30 to .33 | 6 | 9 GB | 30 GB + 40 GB at `/var/lib/longhorn` | workloads, Longhorn data |

Ubuntu Server 24.04, Kubernetes 1.35 with containerd and Calico 3.31.4, one network card per VM,
SSH user `vaka` with the key `~/.ssh/ansible`, no password login. `cluster-endpoint.k8s.local`
and every name under `lab.k8s.local` resolve to `lb`.

## Where things are

```
lgtm/lab/
  vm/nodes.yml              the one list of machines: names, roles, addresses, sizes, network, image
  vm/hyperv/lab-vms.ps1     Hyper-V: plan, create, start, stop, destroy, status (Windows, elevated)
  vm/hyperv/LabVms.psm1     the functions behind it; tests in vm/hyperv/tests/
  vm/hyperv/.cache/         downloaded image, base VHDX, state.json (git-ignored)
  ansible/                  the k8s-provision playbooks plus the lab roles; changes in CHANGES.md
    inventory/hosts.yml     generated from vm/nodes.yml by `make inventory`; do not edit
    inventory/group_vars/all.yml   control-plane endpoint, Kubernetes and Calico versions
    inventory/examples/kvm-multi-nic/   the original KVM inventory, a second supported shape
    site.yml                load balancer and DNS, nodes, kubeadm init, joins, kubeconfig
    playbooks/cluster-check.yml    read-only health checks
  mk/cluster.mk             the make targets below
```

`nodes.yml` is read twice: by the PowerShell script (VMs, cloud-init seeds) and by
`make inventory` (Ansible). Change a size, an address or the number of workers there and run both
again. The PowerShell reader accepts plain block YAML only; see the comment at the top of the file.

## Command 1: the VMs (Windows, elevated PowerShell)

```powershell
cd <repository>\lgtm\lab\vm\hyperv
powershell -ExecutionPolicy Bypass -File .\lab-vms.ps1 plan                    # what would happen; no rights needed
powershell -ExecutionPolicy Bypass -File .\lab-vms.ps1 create -ConfigureDns    # switch, NAT, image, 8 VMs
powershell -ExecutionPolicy Bypass -File .\lab-vms.ps1 start
powershell -ExecutionPolicy Bypass -File .\lab-vms.ps1 status
```

- `plan` prints every step `create` would take, the VM table, the totals and checks (rights,
  key file, address clashes, memory, free disk). It needs no administrator rights.
- `create` is idempotent. It makes the internal switch `lgtm-lab` (Notes `lgtm-lab`), gives the
  host 10.10.0.1/24, creates the NAT `lgtm-lab`, downloads the Ubuntu cloud image once and checks
  its SHA-256, converts it to VHDX with `qemu-img`, and for each VM copies the base disk, builds a
  cloud-init seed disk (FAT32 labelled `CIDATA`), creates a generation 2 VM with Secure Boot,
  static memory and MAC, automatic checkpoints off, and Notes `lgtm-lab`; workers get the data
  disk. It does not start the VMs. With `-WhatIf` it shows the changes without making them;
  without elevation it stops at the first Hyper-V call and says so.
- `-ConfigureDns` adds a Windows name resolution rule: names under `.k8s.local` go to 10.10.0.5,
  so the browser opens `http://grafana.lab.k8s.local` once the lab is installed.
- `start` starts lb, then the control plane, then the workers; `stop` shuts them down in reverse.
- `destroy` deletes only VMs whose Notes carry `lgtm-lab`, their disks inside `hyperv.vm_path`,
  and the switch, NAT, name resolution rule and port proxies that `create` recorded in
  `vm/hyperv/.cache/state.json`. It asks before each deletion; add `-Confirm:$false` to skip.

Why a converted QCOW2 image and a FAT32 seed disk: `lgtm/docs/adr/l1-vm-image-and-seed.md`.

## Command 2: the cluster (WSL)

```bash
cd /mnt/c/<repository>/lgtm/lab
make venv          # once: pinned ansible-core, ansible-lint, yamllint in lgtm/lab/.venv
make cluster       # make inventory, make collections, then ansible-playbook site.yml
make cluster-check
export KUBECONFIG=~/.kube/lgtm-lab.config
kubectl get nodes
```

`site.yml` runs these plays in order:

1. `load_balancer`: `ssh_hardening`, `node_prereqs` (chrony), `lb_haproxy`, `lb_dnsmasq`. It comes
   first because `kubeadm init` needs `cluster-endpoint.k8s.local` to resolve and 6443 to answer.
2. `k8s_cluster`: `ssh_hardening`, `swapoff`, `k8s_kernel_modules`, `containerd`, `network`
   (sends `k8s.local` lookups to 10.10.0.5), `node_prereqs` (chrony; on workers also open-iscsi,
   NFS client, cryptsetup, kernel modules and the data disk at `/var/lib/longhorn`), `k8s_packages`.
3. `control_plane[0]`: `master_init` (kubeadm init, Calico).
4. `control_plane[1:]`, one at a time: `control_plane_join`.
5. `workers`: `worker_join`.
6. `control_plane[0]`: `kubeconfig_fetch` writes `~/.kube/lgtm-lab.config` on the control
   machine. Nothing writes `~/.kube/config`.

Every play is safe to run again: what exists is left alone, and a re-run on a healthy cluster
changes nothing. `make cluster ANSIBLE_ARGS="--limit worker4"` limits a run.

Other targets: `make help` lists them all.

| Target | Does |
|---|---|
| `make inventory` | writes `ansible/inventory/hosts.yml` from `vm/nodes.yml` |
| `make collections` | installs the pinned collections into `ansible/.ansible/collections` |
| `make ping` | Ansible ping to every VM |
| `make cluster-check` | HAProxy sees every API server, lab DNS answers, all nodes Ready, system pods Ready, one etcd member per control-plane node, `kubectl get --raw /readyz` from WSL |
| `make lint` | yamllint, ansible-lint (production profile), syntax checks, inventory up to date |
| `make lint-ps` | PSScriptAnalyzer and Pester for the Hyper-V script, through Windows PowerShell |
| `make forget-host-keys` | forgets the VMs' SSH host keys (kept in `~/.ssh/known_hosts_lgtm-lab`) after destroy and create |

## Other hypervisors

The Ansible side needs only SSH-reachable Ubuntu machines and an inventory. For KVM, VMware,
another Hyper-V layout or bare metal: make the machines any way you like (one card with the
addresses of `nodes.yml` and the user `vaka` with the key), then run `make cluster`. Machines with
a separate cluster network card use the shape in `ansible/inventory/examples/kvm-multi-nic/`
(`network_manage_k8s_interface: true`).

## Networking from WSL

WSL in mirrored mode should reach 10.10.0.0/24 directly. If it does not, set
`network.control_access: portproxy` in `nodes.yml` before `make cluster`: `create` then adds
Windows port proxies on 127.0.0.1 and `make inventory` points Ansible and the kubeconfig at them.
Details: `lgtm/docs/adr/l1-wsl-networking.md`.

## Undo

- Whole lab: `lab-vms.ps1 destroy`, then `make forget-host-keys` and `rm ~/.kube/lgtm-lab.config`.
- Keep the VMs, redo Kubernetes: `kubeadm reset -f` on every node (Ansible ad hoc:
  `cd ansible && ANSIBLE_CONFIG=$PWD/ansible.cfg ansible k8s_cluster -b -m ansible.builtin.command -a "kubeadm reset -f"`), then
  `make cluster`.
- The downloaded image and the base VHDX in `vm/hyperv/.cache/` survive `destroy`; delete the folder to free that space.
