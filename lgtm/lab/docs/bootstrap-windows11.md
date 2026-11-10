# Bootstrap the lab cluster on Windows 11 Pro

This guide takes a Windows 11 Pro PC with nothing of the lab on it to a highly available
Kubernetes cluster of eight Hyper-V VMs, with `kubectl` working from WSL. It uses only what is in
the repository: the Hyper-V script `lgtm/lab/vm/hyperv/lab-vms.ps1`, the cloud-init seeds it
writes, and the Ansible playbooks in `lgtm/lab/ansible/`. It is written for someone who knows
Kubernetes and has never used this repository.

`cluster.md` is the short reference for the same commands; `acceptance-cluster.md` is the
checklist of the first real run. This guide explains every step, what it changes on the PC, what
you should see and how to undo it.

## How to read this guide

- **Shells.** Every command block says where it runs:
  - **Elevated PowerShell**: Start, type PowerShell, right-click Windows PowerShell, Run as
    administrator.
  - **PowerShell (normal)**: any PowerShell window; no administrator rights.
  - **WSL**: the `archlinux` distribution. Its login shell is fish; type `bash` first, the
    commands are written for bash.
- **Paths.** The repository is checked out at `C:\Users\serpe\Projects\saa-c03-tracker` on Windows,
  which is `/mnt/c/Users/serpe/Projects/saa-c03-tracker` in WSL. If yours is elsewhere, change the
  first part of the path; everything under `lgtm/` stays the same. Pull `main` first so the lab
  files are there.
- **Status of each step.** The agent that wrote this guide could not use administrator rights, so
  it could not create, start or list VMs and it could not reach a cluster. Each step says one of:
  - *Run here (2026-11-10)*: the command was run on this PC while writing the guide; the output
    shown is real (only the private middle of the SSH public key is replaced by `<KEY>`).
  - *Not run here: needs an elevated PowerShell*.
  - *Not run here: needs the VMs*.

  The table at the end lists every step and its status.
- **Time.** About an hour the first time, most of it downloads and `make cluster`.

## 1. What you will have at the end

Eight VMs on a private Hyper-V network, made from `lgtm/lab/vm/nodes.yml`:

| VM | Address | vCPU | Memory (static) | Disks (dynamic VHDX) | Runs |
|---|---|---|---|---|---|
| lb | 10.10.0.5 | 1 | 1 GB | 10 GB | HAProxy (6443 to the API servers; 80 and 443 to worker NodePorts 30080 and 30443; statistics on 8404) and dnsmasq for the zone `k8s.local` |
| master1 | 10.10.0.11 | 2 | 3 GB | 25 GB | kubeadm control plane and etcd |
| master2 | 10.10.0.12 | 2 | 3 GB | 25 GB | kubeadm control plane and etcd |
| master3 | 10.10.0.13 | 2 | 3 GB | 25 GB | kubeadm control plane and etcd |
| worker1 | 10.10.0.30 | 6 | 9 GB | 30 GB + 40 GB data | workloads; data disk at `/var/lib/longhorn` |
| worker2 | 10.10.0.31 | 6 | 9 GB | 30 GB + 40 GB data | workloads; data disk at `/var/lib/longhorn` |
| worker3 | 10.10.0.32 | 6 | 9 GB | 30 GB + 40 GB data | workloads; data disk at `/var/lib/longhorn` |
| worker4 | 10.10.0.33 | 6 | 9 GB | 30 GB + 40 GB data | workloads; data disk at `/var/lib/longhorn` |
| **Total** | | **31** | **46 GB** | **365 GB at most** | |

- **Network.** Hyper-V internal switch `lgtm-lab`, subnet 10.10.0.0/24. Windows has 10.10.0.1 on
  the adapter `vEthernet (lgtm-lab)` and is the VMs' gateway; a Windows NAT named `lgtm-lab` takes
  them to the internet. Each VM has one network card with a fixed MAC address and a static
  address set by cloud-init. The VMs use 1.1.1.1 and 9.9.9.9 until Ansible points the cluster
  nodes at the lab DNS on lb.
- **Names.** dnsmasq on lb answers `cluster-endpoint.k8s.local` (the Kubernetes API endpoint),
  `<vm>.k8s.local` for every VM, and every name under `lab.k8s.local`, all with lb's address
  except the VM names. With `-ConfigureDns`, Windows sends every `.k8s.local` lookup to lb.
- **Kubernetes.** Ubuntu Server 24.04, Kubernetes 1.35 from `pkgs.k8s.io`, containerd, Calico
  3.31.4 (pod network 10.100.0.0/16, service network 10.96.0.0/16). Three stacked control-plane
  nodes behind HAProxy, so the cluster survives the loss of one master.
- **Access.** SSH user `vaka` with the key `~/.ssh/ansible`, no password login. The lab
  kubeconfig is `~/.kube/lgtm-lab.config` in WSL. Nothing writes `~/.kube/config`.

```
Windows 11 Pro host
  Hyper-V internal switch "lgtm-lab"  10.10.0.0/24   host 10.10.0.1, NAT "lgtm-lab" to the internet
  |
  +-- lb       10.10.0.5    HAProxy :6443 -> master1-3:6443   :80/:443 -> worker1-4:30080/30443
  |                         dnsmasq :53  cluster-endpoint.k8s.local, *.lab.k8s.local -> 10.10.0.5
  +-- master1  10.10.0.11   kube-apiserver, etcd, controller-manager, scheduler
  +-- master2  10.10.0.12   (same, joined)
  +-- master3  10.10.0.13   (same, joined)
  +-- worker1  10.10.0.30   kubelet, Calico; /var/lib/longhorn on the 40 GB data disk
  +-- worker2  10.10.0.31
  +-- worker3  10.10.0.32
  +-- worker4  10.10.0.33

WSL "archlinux" (mirrored networking)
  make cluster  -> ansible-playbook over SSH to 10.10.0.x
  kubectl       -> https://cluster-endpoint.k8s.local:6443 -> lb -> master1-3
```

## 2. Before you start

Check each item. The fix is only needed when the check fails.

### 2.1 Windows edition and the Hyper-V role

Hyper-V needs Windows 10 or 11 Pro or Enterprise; it cannot be installed on Home
([Install Hyper-V](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/install-hyper-v?pivots=windows)).

Check, in PowerShell (normal):

```powershell
(Get-CimInstance Win32_OperatingSystem).Caption
Get-Service vmms
Get-Module -ListAvailable -Name Hyper-V
```

*Run here (2026-11-10):*

```
Microsoft Windows 11 Pro

 Status Name DisplayName
 ------ ---- -----------
Running vmms Hyper-V Virtual Machine Management

Name    Version
----    -------
Hyper-V 2.0.0.0
```

Fix when `vmms` or the module is missing, in an elevated PowerShell, then restart Windows:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
```

### 2.2 An elevated PowerShell

`create`, `start`, `stop`, `destroy` and `status` need administrator rights; `plan` does not.
Open PowerShell with Run as administrator, then check:

```powershell
([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
```

It prints `True` in an elevated window. *Run here (2026-11-10) in a normal window: `False`*,
which is why the elevated steps below were not run.

The guide starts the script with `powershell -NoProfile -ExecutionPolicy Bypass -File`, which runs
it in Windows PowerShell 5.1 (the version its tests use) and allows the unsigned script for that
one process only, without changing the execution policy of the PC.

### 2.3 The WSL distribution and mirrored networking

Ansible and kubectl run in the WSL 2 distribution `archlinux`. It must reach 10.10.0.0/24, which
is planned through WSL's mirrored networking mode: on Windows 11 22H2 and later, setting
`networkingMode=mirrored` under `[wsl2]` in `%UserProfile%\.wslconfig` mirrors the Windows network
interfaces into Linux, and Linux reaches Windows servers on 127.0.0.1
([WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking)).

Check, in PowerShell (normal):

```powershell
wsl.exe -l -v
Get-Content $env:USERPROFILE\.wslconfig
```

*Run here (2026-11-10):* `archlinux` is listed as `Running`, version `2`, and `.wslconfig` holds:

```
[wsl2]
networkingMode=mirrored
```

Fix when the line is missing: add it under `[wsl2]`, then run `wsl --shutdown` and open WSL again.
Settings in `.wslconfig` apply only when the WSL VM starts again
([WSL configuration](https://learn.microsoft.com/en-us/windows/wsl/wsl-config)).

### 2.4 Python, make and kubectl in WSL

`make venv` puts the pinned Ansible (ansible-core 2.21.5), ansible-lint and yamllint into
`lgtm/lab/.venv`, so WSL itself needs only Python 3 and make. kubectl is used by
`make cluster-check` and by you.

Check, in WSL:

```bash
python3 --version
make --version | head -1
kubectl version --client
```

*Run here (2026-11-10):* `Python 3.14.8`, `GNU Make 4.4.1`, `Client Version: v1.36.1`.

kubectl is supported within one minor version of the API server
([version skew policy](https://kubernetes.io/releases/version-skew-policy/)), so 1.34, 1.35 or
1.36 works with this 1.35 cluster. Fix when a tool is missing (Arch Linux):
`sudo pacman -S python make kubectl`.

### 2.5 The SSH key pair

Every VM gets one public key at creation; Ansible logs in with the matching private key. The names
come from `nodes.yml`: `ssh.public_key_file` is read on Windows
(`\\wsl.localhost\archlinux\home\vaka\.ssh\ansible.pub`) and `ssh.private_key_file` is used in WSL
(`~/.ssh/ansible`).

Check, in WSL:

```bash
ls -l ~/.ssh/ansible ~/.ssh/ansible.pub
```

*Run here (2026-11-10):*

```
-rw------- 1 vaka vaka 399 Jul 13 13:52 /home/vaka/.ssh/ansible
-rw-r--r-- 1 vaka vaka  89 Jul 13 13:53 /home/vaka/.ssh/ansible.pub
```

Fix when the files are missing, in WSL (no passphrase, so Ansible can use it unattended; the
comment is free text):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/ansible -N '' -C ansible
```

The Windows side reads the public key through the `\\wsl.localhost` share, which works only while
the distribution can start. `lab-vms.ps1 plan` prints `found` for it under "Checks" (section 3.1).
The script refuses a private key or a file that is not one OpenSSH public key line.

### 2.6 qemu-img

Ubuntu publishes the cloud image as QCOW2; Hyper-V reads only VHD and VHDX, so `create` converts it
once with `qemu-img`. The script looks, in this order, at `hyperv.qemu_img` in `nodes.yml`,
`qemu-img.exe` on `PATH`, `C:\Program Files\qemu\qemu-img.exe`, and `qemu-img` inside the WSL
distribution named by `hyperv.wsl_distribution`.

Check, in PowerShell (normal):

```powershell
Get-Command qemu-img.exe -ErrorAction SilentlyContinue
Test-Path 'C:\Program Files\qemu\qemu-img.exe'
```

and in WSL:

```bash
command -v qemu-img
```

*Run here (2026-11-10):* none of the three finds it (`False`, and no output in WSL), and `plan`
reports `qemu-img: NOT FOUND`. **Install it before `create`.** Either, in PowerShell (normal):

```powershell
winget install --id SoftwareFreedomConservancy.QEMU
```

or in WSL:

```bash
sudo pacman -S qemu-img
```

Why a converted QCOW2 image: `lgtm/docs/adr/l1-vm-image-and-seed.md`.

### 2.7 Free memory and disk

The VMs use 46 GB of static memory: a running VM holds all of its memory, whatever the guest
uses. The disks are dynamic: 365 GB at most, planned for up to about 90 GB of real use in
`hyperv.vm_path` (`C:\Hyper-V\lgtm-lab`), plus a few GB of image cache (the downloaded image and
the converted base VHDX) in `lgtm\lab\vm\hyperv\.cache\`.

`lab-vms.ps1 plan` checks both (section 3.1). *Run here (2026-11-10):* 61.6 GB on the host,
15.6 GB left for Windows; 910.7 GB free on C:. To put the VMs on another drive, change
`hyperv.vm_path` in `lgtm/lab/vm/nodes.yml` before `create`.

The sizes are yours to change in `nodes.yml` (the tests of the script use their own copy of the
file, so changing them does not break CI). The figures in this guide are the planned ones.

### 2.8 No old entry for the API endpoint name in WSL

kubectl in WSL reaches the cluster by the name `cluster-endpoint.k8s.local`. An older cluster may
have used the same name, and a hand-kept `/etc/hosts` in WSL then still sends it to that old
address. Check, in WSL:

```bash
getent hosts cluster-endpoint.k8s.local
```

It must print nothing (the name is not known yet) or `10.10.0.5`. *Run here (2026-11-10), after
the owner corrected the file:* `10.10.0.5`. Fix when it prints another address: remove or correct
that line in WSL's `/etc/hosts` (with `sudo`). `make cluster-check` makes the same check and fails
with the address it found.

## 3. Part 1: the VMs, from PowerShell

All commands in this part run in the folder of the script:

```powershell
cd C:\Users\serpe\Projects\saa-c03-tracker\lgtm\lab\vm\hyperv
```

`lab-vms.ps1` takes one action (`plan`, `create`, `start`, `stop`, `destroy`, `status`; default
`plan`) and the switches `-ConfigureDns`, `-NodesFile`, `-PublicKeyFile`, `-WhatIf` and
`-Confirm`. Every action reads `..\nodes.yml`.

### 3.1 plan: what would happen

PowerShell (normal is enough):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 plan -ConfigureDns
```

**What it does on the host:** nothing. It reads `nodes.yml`, checks it (names, roles, addresses
inside the subnet and unique, sizes, MAC prefix, image URL and checksum format), looks for the key
and `qemu-img`, and prints every step `create` would take.

*Run here (2026-11-10), real output* (the worktree path is where the agent ran it; yours starts
with `C:\Users\serpe\Projects\saa-c03-tracker\lgtm`):

```
Plan for the LGTM lab from C:\Users\serpe\Projects\saa-c03-tracker\.claude\worktrees\lgtm-b1-bootstrap-guide-ee174d\lgtm\lab\vm\nodes.yml
Nothing is changed by this command. `create` does the steps below and skips what already exists.

Host network
  1. Hyper-V internal switch 'lgtm-lab', Notes 'lgtm-lab'.
  2. Host address 10.10.0.1/24 on 'vEthernet (lgtm-lab)'.
  3. NAT 'lgtm-lab' for 10.10.0.0/24, so the VMs reach the internet.
  4. Windows name resolution rule: '.k8s.local' is sent to 10.10.0.5 (comment 'lgtm-lab').

Image
  - download https://cloud-images.ubuntu.com/releases/noble/release-20261017/ubuntu-24.04-server-cloudimg-amd64.img
      to C:\Users\serpe\Projects\saa-c03-tracker\.claude\worktrees\lgtm-b1-bootstrap-guide-ee174d\lgtm\lab\vm\hyperv\.cache\ubuntu-24.04-server-cloudimg-amd64.img
      SHA-256 04e8f2461a16a44e78a370284471f29616cdd9baf1893df25807b71f985b6c94
  - convert with qemu-img QCOW2 to VHDX C:\Users\serpe\Projects\saa-c03-tracker\.claude\worktrees\lgtm-b1-bootstrap-guide-ee174d\lgtm\lab\vm\hyperv\.cache\ubuntu-24.04-server-cloudimg-amd64.vhdx
      qemu-img: NOT FOUND (see the acceptance checklist, step 0)

VMs (8), created in this order; folder C:\Hyper-V\lgtm-lab\<name>
  Name      Role           Address      vCPU  Memory  OS disk Data disk  MAC
  lb        lb             10.10.0.5       1    1 GB    10 GB         -  02:4c:47:0a:00:05
  master1   control_plane  10.10.0.11      2    3 GB    25 GB         -  02:4c:47:0a:00:0b
  master2   control_plane  10.10.0.12      2    3 GB    25 GB         -  02:4c:47:0a:00:0c
  master3   control_plane  10.10.0.13      2    3 GB    25 GB         -  02:4c:47:0a:00:0d
  worker1   worker         10.10.0.30      6    9 GB    30 GB     40 GB  02:4c:47:0a:00:1e
  worker2   worker         10.10.0.31      6    9 GB    30 GB     40 GB  02:4c:47:0a:00:1f
  worker3   worker         10.10.0.32      6    9 GB    30 GB     40 GB  02:4c:47:0a:00:20
  worker4   worker         10.10.0.33      6    9 GB    30 GB     40 GB  02:4c:47:0a:00:21
  Total: 31 vCPU, 46 GB memory (static), 365 GB of dynamic disks at most.

For each VM
  a. Copy the base VHDX to <name>-os.vhdx and grow it to the OS disk size.
  b. Build <name>-seed.vhdx: 64 MB, FAT32, label CIDATA, holding meta-data, user-data, network-config
     (hostname, user 'vaka' with the key from \\wsl.localhost\archlinux\home\vaka\.ssh\ansible.pub, no password login,
     static address on eth0 matched by MAC, gateway 10.10.0.1, DNS 1.1.1.1, 9.9.9.9).
  c. New-VM generation 2, static memory, automatic checkpoints off, Notes 'lgtm-lab', static MAC,
     Secure Boot template MicrosoftUEFICertificateAuthority, boot from the OS disk, seed disk attached.
  d. Workers only: an empty dynamic data disk <name>-data.vhdx for /var/lib/longhorn.
  The VMs are not started: run `lab-vms.ps1 start` next.

Checks
  - Administrator rights: no (needed by create, start, stop, destroy and status)
  - Hyper-V PowerShell module: installed
  - SSH public key \\wsl.localhost\archlinux\home\vaka\.ssh\ansible.pub: found
  - Host addresses: none inside 10.10.0.0/24 except the planned 10.10.0.1.
  - Memory: 46 GB for VMs of 61.6 GB on the host, 15.6 GB left for Windows.
  - Free space on the drive of C:\Hyper-V\lgtm-lab: 910.7 GB (the lab is planned for up to 90 GB of real use).
```

**Expect** the same, except `qemu-img:` must name a path once you installed it (section 2.6), and
`Administrator rights: yes` in an elevated window. Any line that starts with `WARNING:` needs
attention before `create`: an address of the host inside 10.10.0.0/24, less than 8 GB of memory
left for Windows, or less than 90 GB free.

**Undo:** nothing to undo.

### 3.2 create -WhatIf: the list of changes, without making them

Elevated PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 create -ConfigureDns -WhatIf
```

In an elevated window it prints a `What if:` line for each change (download, conversion, switch,
host address, NAT, eight VMs, the name resolution rule) and changes nothing. *Not run here
elevated: needs an elevated PowerShell.* In a normal window it runs up to the first Hyper-V call
and stops there. *Run here (2026-11-10), normal window, real output* (paths shortened to
`...\hyperv`):

```
[lab-vms] Rendered cloud-init seeds for 8 VMs.
What if: Performing the operation "Download to ...\hyperv\.cache\ubuntu-24.04-server-cloudimg-amd64.img" on target "https://cloud-images.ubuntu.com/releases/noble/release-20261017/ubuntu-24.04-server-cloudimg-amd64.img".
WARNING: qemu-img not found; the real run stops at the conversion step.
[lab-vms] What if: convert ...\hyperv\.cache\ubuntu-24.04-server-cloudimg-amd64.img to ...\hyperv\.cache\ubuntu-24.04-server-cloudimg-amd64.vhdx
WARNING: WhatIf stopped here: 'Get-VMSwitch -Name lgtm-lab' needs administrator rights. Run lab-vms.ps1 from an elevated PowerShell (Run as administrator).
WARNING: Every step above this line ran without administrator rights. Run '.\lab-vms.ps1 plan' for the full list of steps.
```

**Undo:** nothing to undo.

### 3.3 create: switch, NAT, image and the eight VMs

*Not run here: needs an elevated PowerShell.* Elevated PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 create -ConfigureDns
```

**What it does on the host, in order** (from `Invoke-LabCreate` in `LabVms.psm1`):

1. **Renders the cloud-init seeds** of all eight VMs in memory (Part 2 shows them). It stops here
   if the public key is missing.
2. **Downloads the image** `ubuntu-24.04-server-cloudimg-amd64.img` (release `20261017`, about
   600 MB) to `lgtm\lab\vm\hyperv\.cache\` through a `.part` file, and checks its SHA-256 against
   `image.sha256` in `nodes.yml`. A wrong checksum deletes the download and stops. A cached image
   is checked again and reused.
3. **Converts it once** with `qemu-img convert -f qcow2 -O vhdx -o subformat=dynamic` to
   `.cache\ubuntu-24.04-server-cloudimg-amd64.vhdx`, and clears the NTFS sparse flag, which
   Hyper-V refuses. A cached base VHDX is reused.
4. **Creates the internal switch** `lgtm-lab` with Notes `lgtm-lab` (`New-VMSwitch -SwitchType
   Internal`). Windows gets the adapter `vEthernet (lgtm-lab)`.
5. **Gives the host 10.10.0.1/24** on `vEthernet (lgtm-lab)` (`New-NetIPAddress`). This is the VMs'
   gateway.
6. **Creates the NAT** `lgtm-lab` for 10.10.0.0/24 (`New-NetNat`), so the VMs reach the internet
   through the host. Windows allows one NAT network per host
   ([Set up a NAT network](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network));
   when another exists, the step fails and the message lists the NATs that exist (section 7).
7. **Creates each VM** in the order lb, master1 to master3, worker1 to worker4, in the folder
   `C:\Hyper-V\lgtm-lab\<name>\`:
   - `<name>-os.vhdx`: a copy of the base VHDX, grown with `Resize-VHD` to `disk_gb` (10, 25 or
     30 GB). cloud-init grows the root partition at first boot.
   - `<name>-seed.vhdx`: 64 MB dynamic, MBR, one FAT32 partition labelled `CIDATA` with the files
     `meta-data`, `user-data` and `network-config`. Windows mounts it for a moment to write them;
     a drive letter may flash up in Explorer.
   - workers only: `<name>-data.vhdx`, an empty 40 GB dynamic disk for Longhorn.
   - the VM itself: generation 2, `memory_gb` of static memory, `vcpu` processors, Notes
     `lgtm-lab`, automatic checkpoints off, automatic start action Nothing, automatic stop action
     ShutDown, connected to `lgtm-lab` with the static MAC from the plan, the seed disk (and the
     data disk) on the SCSI controller, Secure Boot on with the template
     `MicrosoftUEFICertificateAuthority`, first boot device the OS disk.
8. **With `-ConfigureDns`: adds a Windows name resolution policy rule** (`Add-DnsClientNrptRule`)
   that sends `.k8s.local` to 10.10.0.5, comment `lgtm-lab`.
9. **Only when `network.control_access` is `portproxy`** (the fallback of section 7): adds the
   Windows port proxies on 127.0.0.1.
10. **Records** in `.cache\state.json` which of switch, host address, NAT and port proxies it
    created, so `destroy` removes exactly those.

It does not start the VMs. It is idempotent: what exists is kept.

**Expect** (lines the script prints on a first run; the switch, address and NAT print nothing
when they are created):

```
[lab-vms] Rendered cloud-init seeds for 8 VMs.
[lab-vms] Downloaded and verified ...\.cache\ubuntu-24.04-server-cloudimg-amd64.img
[lab-vms] Converted base image to ...\.cache\ubuntu-24.04-server-cloudimg-amd64.vhdx
[lab-vms] Created VM lb.
[lab-vms] Created VM master1.
...
[lab-vms] Created VM worker4.
[lab-vms] Create finished. Next: lab-vms.ps1 start
```

A second run prints `Image cached and checksum correct`, `Base VHDX cached`, `Switch 'lgtm-lab'
exists.`, `Host address 10.10.0.1 exists on 'vEthernet (lgtm-lab)'.`, `NAT 'lgtm-lab' exists for
10.10.0.0/24.`, `VM <name> exists; kept as it is.` and `Name resolution rule for '.k8s.local'
exists.` If a run stops with an error, fix the cause and run `create` again; it continues where it
stopped.

Check in the elevated PowerShell:

```powershell
Get-VM | Where-Object Notes -match 'lgtm-lab' | Format-Table Name, State, ProcessorCount, MemoryStartup
Get-VMSwitch -Name lgtm-lab
Get-NetNat -Name lgtm-lab
Get-DnsClientNrptRule | Where-Object Comment -EQ 'lgtm-lab'
```

Expect eight VMs, all `Off`; the switch of type Internal; the NAT for 10.10.0.0/24; one rule
for `.k8s.local` with name server 10.10.0.5.

**Undo:** `destroy` (section 6.3). It deletes only VMs whose Notes carry `lgtm-lab` and their
disks inside `hyperv.vm_path`, the name resolution rules with comment `lgtm-lab`, and the switch,
NAT and port proxies that `state.json` says `create` made. It keeps the image cache.

### 3.4 start

*Not run here: needs an elevated PowerShell.* Elevated PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 start
```

**What it does:** `Start-VM` for each VM tagged `lgtm-lab`, in the order lb, master1 to master3,
worker1 to worker4. A VM that runs already is left alone; a VM that does not exist gets a warning.
Hyper-V reserves each VM's static memory when it starts.

**Expect:**

```
[lab-vms] Started lb.
[lab-vms] Started master1.
...
[lab-vms] Started worker4.
```

The first boot takes one to two minutes per VM: cloud-init sets the address, hostname, user and
key and grows the disk (Part 2).

**Undo:** `stop` (section 6.1).

### 3.5 status

*Not run here: needs an elevated PowerShell.* Elevated PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 status
```

**What it does:** reads the VMs (`Get-VM`, which needs administrator rights) and tries a TCP
connection to port 22 of each address from Windows, with a 0.5 second timeout. It changes
nothing.

**Expect** eight rows with the columns `Name`, `Role`, `Address`, `State`, `CPU`, `MemoryGB`,
`Uptime` and `SSH`; after the first boot every row shows `Running` and SSH `open`. `missing` means
the VM does not exist; SSH `closed` after five minutes means the VM did not finish its first boot:
see Part 2 and section 7.

**Undo:** nothing to undo.

## 4. Part 2: cloud-init, the first boot

### 4.1 What is on the seed disk, and why

The Ubuntu cloud image has no user, no password and no address. cloud-init sets them at first
boot from a data source. The lab uses cloud-init's NoCloud data source with a drive: a vfat or
iso9660 file system labelled `CIDATA`, with the files in its root folder
([NoCloud](https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html)). Windows can
make a FAT32 VHDX with built-in cmdlets but has no ISO writer, so each VM gets its own small
FAT32 disk (`<name>-seed.vhdx`). `meta-data` must contain an `instance-id`; `user-data` is the
cloud config; `network-config` is the network configuration.

The files are rendered by `ConvertTo-LabCloudInit` in `LabVms.psm1` from `nodes.yml`. They are
shown below for reading; `create` already wrote them onto each VM's seed disk.

**Optional: render them yourself.** You do not need this step to build the lab; skip to 4.2. In a
PowerShell (normal) in the `vm\hyperv` folder, the first line allows unsigned scripts in this
window only (Windows' default execution policy refuses to load the module otherwise). The Process
scope affects only the current session and is not saved, so the policy of the PC is not changed
([about_Execution_Policies](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies)):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
Import-Module .\LabVms.psm1 -Force
$config = Get-LabConfig -Path ..\nodes.yml
$key = Read-LabPublicKey -Path $config.PublicKeyFile
$seed = ConvertTo-LabCloudInit -Config $config -Node ($config.Nodes | Where-Object Name -EQ 'master1') -PublicKey $key
$seed['user-data']
```

*Run here (2026-11-10):* rendered with the real public key, whose middle is shown as `<KEY>`.

**master1 (control plane)**

`meta-data`:

```yaml
instance-id: lgtm-lab-master1
local-hostname: master1
```

`user-data`:

```yaml
#cloud-config
# Seed for master1, written by lab-vms.ps1 from nodes.yml.
hostname: master1
fqdn: master1.k8s.local
manage_etc_hosts: true
ssh_pwauth: false
disable_root: true
users:
  - name: vaka
    groups: [adm, sudo]
    shell: /bin/bash
    sudo: 'ALL=(ALL) NOPASSWD:ALL'
    lock_passwd: true
    ssh_authorized_keys:
      - 'ssh-ed25519 <KEY> ansible'
growpart:
  mode: auto
  devices: ['/']
package_update: false
```

`network-config`:

```yaml
version: 2
ethernets:
  eth0:
    match:
      macaddress: '02:4c:47:0a:00:0b'
    set-name: eth0
    dhcp4: false
    dhcp6: false
    addresses:
      - 10.10.0.11/24
    routes:
      - to: default
        via: 10.10.0.1
    nameservers:
      addresses: [1.1.1.1, 9.9.9.9]
```

**worker1 (worker)**

`meta-data`:

```yaml
instance-id: lgtm-lab-worker1
local-hostname: worker1
```

`user-data`:

```yaml
#cloud-config
# Seed for worker1, written by lab-vms.ps1 from nodes.yml.
hostname: worker1
fqdn: worker1.k8s.local
manage_etc_hosts: true
ssh_pwauth: false
disable_root: true
users:
  - name: vaka
    groups: [adm, sudo]
    shell: /bin/bash
    sudo: 'ALL=(ALL) NOPASSWD:ALL'
    lock_passwd: true
    ssh_authorized_keys:
      - 'ssh-ed25519 <KEY> ansible'
growpart:
  mode: auto
  devices: ['/']
package_update: false
```

`network-config`:

```yaml
version: 2
ethernets:
  eth0:
    match:
      macaddress: '02:4c:47:0a:00:1e'
    set-name: eth0
    dhcp4: false
    dhcp6: false
    addresses:
      - 10.10.0.30/24
    routes:
      - to: default
        via: 10.10.0.1
    nameservers:
      addresses: [1.1.1.1, 9.9.9.9]
```

The two differ only in the name, the MAC address and the IP address; the worker's data disk is
not in the seed, Ansible formats and mounts it later. Why each line is there:

| Line | Why |
|---|---|
| `instance-id: lgtm-lab-<name>` | Required by NoCloud. cloud-init runs its once-per-instance work again only when this changes, so it is fixed per VM. |
| `hostname`, `fqdn`, `manage_etc_hosts` | The node name Kubernetes will use, and a matching `/etc/hosts`. |
| `ssh_pwauth: false`, `disable_root: true`, `lock_passwd: true` | No password login and no root login: the only way in is the key. |
| `users`, `sudo: 'ALL=(ALL) NOPASSWD:ALL'` | The user `vaka` Ansible connects as, with password-less sudo for `become: true`. |
| `growpart` | Grows the root partition to the size `Resize-VHD` gave the disk. |
| `package_update: false` | First boot does not wait for `apt update`. The Ansible roles install what they need, and the first apt task on each host refreshes the package lists. |
| `match: macaddress`, `set-name: eth0` | The card is found by the fixed MAC from `nodes.yml`, whatever name the kernel gives it, and renamed `eth0`, the name the inventory and Calico use (`k8s_interface`). |
| static address, `routes`, `nameservers` | The address from `nodes.yml`, the default route through the Windows host (NAT), public resolvers until the lab DNS exists. |

### 4.2 What happens on the first boot

cloud-init runs in five stages, Detect, Local, Network, Config and Final
([Boot stages](https://docs.cloud-init.io/en/latest/explanation/boot.html)):

1. **Detect.** `ds-identify` looks for a data source and finds the `CIDATA` disk.
2. **Local** (`cloud-init-local.service`), before the network is up: reads the seed and, on an
   instance's first boot, renders the network configuration (on Ubuntu, a netplan file) so the
   card comes up as `eth0` with its static address.
3. **Network** (`cloud-init-network.service`), with the network up: hostname, `/etc/hosts`, the
   user and its key, `growpart`, the SSH host keys. SSH and console login wait for this stage.
4. **Config** and **Final**: the remaining modules; Final writes the "finished" message.

On later boots the `instance-id` is the same, so the once-per-instance work is not repeated. A
changed seed has no effect on a VM that has booted once, and `create` never rewrites the seed of
an existing VM. So a change in `nodes.yml` or a new key reaches a VM only when you destroy and
create it.

### 4.3 How to check that it worked

*Not run here: needs the VMs.* First from Windows, PowerShell (normal):

```powershell
Test-NetConnection 10.10.0.5 -Port 22
```

Expect `TcpTestSucceeded : True`. Then from WSL, which proves both the key and the WSL route:

```bash
ssh -i ~/.ssh/ansible -o UserKnownHostsFile=~/.ssh/known_hosts_lgtm-lab -o StrictHostKeyChecking=accept-new vaka@10.10.0.5 'hostname; ip -4 -br addr show eth0; cloud-init status --long; sudo -n true && echo sudo-ok'
```

Expect `lb`, `eth0 UP 10.10.0.5/24`, `status: done` with `errors: []`, and `sudo-ok`. Repeat with
10.10.0.11 to .13 and 10.10.0.30 to .33, or let `make ping` do it (section 5.4). The options keep
the lab's host keys in their own file, `~/.ssh/known_hosts_lgtm-lab`, the same file Ansible uses.

**When it did not work**, as cloud-init's debugging guide advises
([How to debug cloud-init](https://docs.cloud-init.io/en/latest/howto/debugging.html)), on a VM you
can reach over SSH:

```bash
cloud-init status --long
cat /run/cloud-init/ds-identify.log
systemctl status cloud-init-local.service cloud-init-network.service cloud-config.service cloud-final.service
sudo grep -iE 'warn|error|traceback' /var/log/cloud-init.log
sudo tail -50 /var/log/cloud-init-output.log
```

- `ds-identify.log` says whether the `CIDATA` disk was found.
- `extended_status`, `errors` and `recoverable_errors` in `cloud-init status --long` name the
  failing module.
- `/var/log/cloud-init.log` is the detailed log, `/var/log/cloud-init-output.log` the output of
  the modules.

When SSH does not answer at all, the password is locked and nobody can log in on the console.
Then:

- Open the VM's console (Hyper-V Manager, Connect) and read the boot messages: a firmware or
  Secure Boot message means the image did not boot (section 7).
- Check the VM's MAC address in the elevated PowerShell; it must be the one from the plan without
  colons, for example `024C470A0005` for lb:

  ```powershell
  Get-VMNetworkAdapter -VMName lb | Select-Object VMName, MacAddress, SwitchName
  ```

- Read the seed disk on Windows while the VM is off (elevated PowerShell; the drive letter comes
  from Windows):

  ```powershell
  Stop-VM -Name lb
  Mount-VHD -Path C:\Hyper-V\lgtm-lab\lb\lb-seed.vhdx -ReadOnly -Passthru | Get-Disk | Get-Partition | Get-Volume
  ```

  Open the drive with the label `CIDATA` and read the three files, then:

  ```powershell
  Dismount-VHD -Path C:\Hyper-V\lgtm-lab\lb\lb-seed.vhdx
  Start-VM -Name lb
  ```

## 5. Part 3: the cluster, from WSL with Ansible

All commands in this part run in WSL, in bash, in the `lgtm/lab` folder:

```bash
cd /mnt/c/Users/serpe/Projects/saa-c03-tracker/lgtm/lab
```

`make help` lists every target. The cluster targets are in `mk/cluster.mk`. It sets
`ANSIBLE_CONFIG` to `ansible/ansible.cfg` (Ansible ignores a configuration file in a
world-writable folder, which every folder under `/mnt/c` is), and it uses the tools in
`lgtm/lab/.venv` when that exists.

### 5.1 make venv

```bash
make venv
```

**What it does:** creates `lgtm/lab/.venv` (git-ignored) and installs
`ansible/requirements-dev.txt` into it: ansible-core 2.21.5, ansible-lint 26.11.0, yamllint 1.38.0
and the Python client `kubernetes` 37.0.2 used by the later playbooks. Nothing is installed
system-wide. Run it once; run it again after `requirements-dev.txt` changes.

*Run here (2026-11-10), real output* (`/mnt/c/...` stands for the checkout path; pip runs quietly,
so the two commands are all it prints; it took about 5 minutes on `/mnt/c`):

```
python3 -m venv /mnt/c/.../lgtm/lab/.venv
/mnt/c/.../lgtm/lab/.venv/bin/pip install --disable-pip-version-check -q -r /mnt/c/.../lgtm/lab/ansible/requirements-dev.txt
```

Check the versions:

```bash
.venv/bin/ansible --version | head -1
.venv/bin/yamllint --version
```

*Run here:* `ansible [core 2.21.5]` and `yamllint 1.38.0`.

**Undo:** `rm -rf .venv`.

### 5.2 make collections

```bash
make collections
```

**What it does:** installs the collections pinned in `ansible/requirements.yml`
(`ansible.posix` 2.2.2, `community.general` 14.0.1, `kubernetes.core` 6.6.0) into
`ansible/.ansible/collections` (git-ignored). `make cluster` runs it too.

*Run here (2026-11-10), real output:*

```
cd /mnt/c/.../lgtm/lab/ansible && /mnt/c/.../lgtm/lab/.venv/bin/ansible-galaxy collection install -r requirements.yml -p ./.ansible/collections
Starting galaxy collection install process
Process install dependency map
Starting collection install process
Downloading https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/artifacts/ansible-posix-2.2.2.tar.gz to /home/vaka/.ansible/tmp/...
Installing 'ansible.posix:2.2.2' to '/mnt/c/.../lgtm/lab/ansible/.ansible/collections/ansible_collections/ansible/posix'
ansible.posix:2.2.2 was installed successfully
...
community.general:14.0.1 was installed successfully
...
kubernetes.core:6.6.0 was installed successfully
...
community.library_inventory_filtering_v1:1.1.5 was installed successfully
```

The last one is a dependency of `community.general`. On `/mnt/c` this took several minutes.

**Undo:** `rm -rf ansible/.ansible`.

### 5.3 make inventory

```bash
make inventory
```

**What it does:** runs `ansible/playbooks/inventory.yml` on localhost, which reads
`vm/nodes.yml` and writes `ansible/inventory/hosts.yml`: the groups `load_balancer`,
`k8s_cluster` with `control_plane` and `workers`, each host's `ansible_host` and `k8s_net_ip`,
`k8s_interface: eth0`, the data disk size of each worker, the SSH user and key, the lab DNS, and
`master_init_apiserver_cert_extra_sans: [10.10.0.5]`. In `portproxy` mode it writes 127.0.0.1 and
the proxy ports instead. `make cluster` runs it too. The file is committed; never edit it by hand.

*Run here (2026-11-10), real output:*

```
cd /mnt/c/.../lgtm/lab/ansible && /mnt/c/.../lgtm/lab/.venv/bin/ansible-playbook -i localhost, -c local playbooks/inventory.yml

PLAY [Generate the Ansible inventory from the nodes file] **********************

TASK [Check the nodes file] ****************************************************
ok: [localhost]

TASK [Write the inventory] *****************************************************
ok: [localhost]

PLAY RECAP *********************************************************************
localhost                  : ok=2    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```

`changed=0` means the committed `hosts.yml` already matches `nodes.yml`; `git status` shows no
change.

**Undo:** `git checkout -- ansible/inventory/hosts.yml`.

### 5.4 make ping

*Not run here: needs the VMs.*

```bash
make ping
```

**What it does:** `ansible all -m ansible.builtin.ping`: an SSH login and a Python run on every VM.
The first contact accepts each host key into `~/.ssh/known_hosts_lgtm-lab`
(`StrictHostKeyChecking=accept-new`); later changes of a key are refused.

**Expect** `SUCCESS` and `"ping": "pong"` for lb, master1 to master3 and worker1 to worker4.
`UNREACHABLE` with a timeout means WSL does not reach 10.10.0.0/24 (section 7); `Permission
denied (publickey)` means the VMs were created with another key.

**Undo:** `make forget-host-keys` forgets the accepted host keys.

### 5.5 make cluster

*Not run here: needs the VMs.*

```bash
make cluster 2>&1 | tee ~/lgtm-cluster-first-run.log
```

**What it does:** `make inventory`, `make collections`, then `ansible-playbook site.yml` with the
extra arguments in `ANSIBLE_ARGS`, for example `make cluster ANSIBLE_ARGS="-v"`.
*Run here (2026-11-10), `make -n cluster`, the commands it would run:*

```
cd /mnt/c/.../lgtm/lab/ansible && ansible-playbook -i localhost, -c local playbooks/inventory.yml
cd /mnt/c/.../lgtm/lab/ansible && ansible-galaxy collection install -r requirements.yml -p ./.ansible/collections
cd /mnt/c/.../lgtm/lab/ansible && ansible-playbook site.yml
```

(`make -n` was run before `make venv`; after it, the commands start with `.venv/bin/`.)

To see every task without touching a VM:

```bash
cd ansible && ANSIBLE_CONFIG=$PWD/ansible.cfg ../.venv/bin/ansible-playbook site.yml --list-tasks; cd ..
```

*Run here (2026-11-10):* six plays, 14 tasks on lb, 25 in "Common setup", 12 in
`master_init`, 7 per control-plane join, 6 per worker join, 5 for the kubeconfig. Every run
prints a `[DEPRECATION WARNING]` for `ansible.builtin.apt_repository` in `k8s_packages` (it goes
away in ansible-core 2.25); it is harmless today.

`site.yml` runs six plays, in this order. The last column is what changed from the owner's
original `k8s-provision` playbooks (commit `8442dee`), from `ansible/CHANGES.md`.

| # | Play | Hosts | Roles, in order | What the roles do | Changed from `k8s-provision`, and why |
|---|---|---|---|---|---|
| 1 | Load balancer and lab DNS | `load_balancer` (lb) | `ssh_hardening`, `node_prereqs`, `lb_haproxy`, `lb_dnsmasq` | `ssh_hardening`: writes `/etc/ssh/sshd_config.d/hardened.conf` (checked with `sshd -t`), allowed user `vaka`, restarts `ssh.socket`. `node_prereqs`: chrony. `lb_haproxy`: installs HAProxy, renders `/etc/haproxy/haproxy.cfg` from the inventory (6443 to master1 to master3 with an HTTPS `/healthz` check; 80 and 443 to the workers' NodePorts 30080 and 30443 with a TCP check; statistics on 8404). `lb_dnsmasq`: dnsmasq on 10.10.0.5 only, the zone `k8s.local`, `cluster-endpoint.k8s.local` and `*.lab.k8s.local` to 10.10.0.5, a record for every VM, other names forwarded to 1.1.1.1 and 9.9.9.9; it checks the endpoint resolves. | New play. `kubeadm init` needs `cluster-endpoint.k8s.local` to resolve and 6443 to answer, so the load balancer comes first; the original had a hand-made HAProxy (`haproxy.cfg`, now the role's template with generated server lines and a TCP check on the ingress ports, because the lab gateway has no `/healthz` route). |
| 2 | Common setup | `k8s_cluster` (masters and workers) | `ssh_hardening`, `swapoff`, `k8s_kernel_modules`, `containerd`, `network`, `node_prereqs`, `k8s_packages` | `swapoff`: `swapoff -a`, removes a `/swapfile` mount. `k8s_kernel_modules`: `overlay`, `br_netfilter`, IP forwarding and the bridge netfilter sysctls. `containerd`: refreshes the apt cache (the first apt task on these hosts), installs containerd, writes the default configuration once, sets `SystemdCgroup = true`. `network`: points systemd-resolved at 10.10.0.5 for `~k8s.local` (`/etc/systemd/resolved.conf.d/k8s.conf`); writes no netplan file here because cloud-init configured the card (`network_manage_k8s_interface: false`). `node_prereqs`: chrony; on workers also open-iscsi, nfs-common, cryptsetup, dmsetup, the `iscsi_tcp` and `dm_crypt` modules, iscsid, multipath kept off Longhorn devices, and the empty 40 GB disk formatted ext4 with label `longhorn` and mounted at `/var/lib/longhorn`. `k8s_packages`: the `pkgs.k8s.io` v1.35 apt repository, kubelet, kubeadm and kubectl held, `KUBELET_EXTRA_ARGS=--node-ip=<address>`. | Targets `k8s_cluster` instead of `all`, so lb gets no Kubernetes; adds `node_prereqs`. `containerd`: the default file is written once (`creates:`); before, every run rewrote it, undid the cgroup edit and restarted containerd. The install also refreshes the apt cache, because on a fresh cloud image it is the first apt task and the seed skips `apt update`. `network`: the netplan task runs only when `network_manage_k8s_interface` is true, because a single card set by cloud-init must not get a second netplan file. `k8s_packages`: the minor version comes from `k8s_minor_version` in `inventory/group_vars/all.yml`; the node-IP line is replaced, not added again; the key download runs in bash, because `/bin/sh` on Ubuntu has no `pipefail`. |
| 3 | Initialize first master node | `control_plane[0]` (master1) | `master_init` | Writes `/etc/k8s_bootstrap/kubeadm-config.yaml` (`controlPlaneEndpoint: cluster-endpoint.k8s.local:6443`, pod subnet 10.100.0.0/16, service subnet 10.96.0.0/16, extra certificate name 10.10.0.5, node IP), runs `kubeadm init` once (skipped when `/etc/kubernetes/admin.conf` exists), copies `admin.conf` to `/home/vaka/.kube/config` on master1, applies Calico's `operator-crds.yaml` and `tigera-operator.yaml` server-side, then the Installation (interface `eth0`, pool 10.100.0.0/16, block size 26, no encapsulation, outgoing NAT), APIServer, Goldmane and Whisker resources, and waits until every pod in `calico-system` is Ready. | Since Calico 3.30 the operator CRDs are a separate manifest; the original would wait forever for them. The CRD file is too large for client-side apply. kubeadm's default service subnet 10.96.0.0/12 contains the pod network 10.100.0.0/16, so it is now 10.96.0.0/16. The extra certificate name lets kubectl use the lb address when the name does not resolve. The Calico version comes from `calico_version`. |
| 4 | Join remaining control plane nodes | `control_plane[1:]` (master2, master3), one at a time | `control_plane_join` | Skipped on a node that has `/etc/kubernetes/kubelet.conf`. Otherwise, on master1: `kubeadm init phase upload-certs --upload-certs` and `kubeadm token create --print-join-command`; on the node: a JoinConfiguration in `/root/k8s-join-config.yaml` (root, 0600), `kubeadm join`, then the file is removed. | The whole join is skipped once joined, so a re-run creates no tokens and uploads no certificates; the join file (bootstrap token and certificate key) moved from a world-readable `/tmp` file to `/root` and is deleted after use. |
| 5 | Join workers | `workers` (worker1 to worker4) | `worker_join` | The same as play 4 without the certificate upload and the control-plane section. | Same as play 4. |
| 6 | Write the lab kubeconfig on the control machine | `control_plane[0]` (master1) | `kubeconfig_fetch` | Refuses to write `~/.kube/config`; reads `/etc/kubernetes/admin.conf` from master1 and writes `~/.kube/lgtm-lab.config` (mode 0600) in WSL with the server `https://cluster-endpoint.k8s.local:6443` and the cluster, user and context names `lgtm-lab`, `lgtm-lab-admin`, `lgtm-lab`. | New. The original left the kubeconfig on master1 only. |

**Expect** 15 to 30 minutes, then a PLAY RECAP where every host has `failed=0` and
`unreachable=0`, and near the end:

```
"msg": "Lab kubeconfig: /home/vaka/.kube/lgtm-lab.config (export KUBECONFIG=/home/vaka/.kube/lgtm-lab.config)"
```

If it fails, keep the log, fix the cause (section 7) and run `make cluster` again: what is done
is skipped.

**Undo** (keep the VMs, remove Kubernetes), then `make cluster` builds it again:

```bash
cd ansible && ANSIBLE_CONFIG=$PWD/ansible.cfg ../.venv/bin/ansible k8s_cluster -b -m ansible.builtin.command -a "kubeadm reset -f"
```

### 5.6 make cluster-check

*Not run here: needs the VMs.*

```bash
make cluster-check
```

**What it does** (read-only, `ansible/playbooks/cluster-check.yml`, then one kubectl command):

- on lb: reads HAProxy's statistics and checks that every control-plane node is `UP` in the
  backend `k8s_api_servers`; asks dnsmasq for `cluster-endpoint.k8s.local`;
- on master1: waits up to 300 seconds for every node to be Ready, checks that every inventory
  host is a node, waits for the pods in `kube-system` and `calico-system`, and counts one etcd pod
  per control-plane node;
- in WSL: reads the server from `~/.kube/lgtm-lab.config`; when it is a name, resolves it with
  `getent ahostsv4` and fails unless it gives lb's address, naming the address it found, `/etc/hosts`
  and both fixes; then `kubectl --kubeconfig ~/.kube/lgtm-lab.config get --raw /readyz` must print `ok`;
- finally `KUBECONFIG=~/.kube/lgtm-lab.config kubectl get nodes -o wide`.

**Expect** `failed=0`, the messages `API servers up behind HAProxy: master1, master2, master3`
and `Nodes: ...` with all seven Kubernetes nodes, then seven nodes `Ready`, INTERNAL-IP
10.10.0.x, version v1.35.x.

**Undo:** nothing to undo.

### 5.7 Using the kubeconfig

The file `~/.kube/lgtm-lab.config` holds the cluster's CA, the `kubernetes-admin` client
certificate and the server `https://cluster-endpoint.k8s.local:6443`. It is a cluster-admin
credential: keep it out of the repository.

The kubeconfig of an older cluster in `~/.kube/config` is left alone on purpose: the lab never
writes that file, so kubectl uses it until you point it at the lab file. Select the lab file for
the current shell, in bash:

```bash
export KUBECONFIG=~/.kube/lgtm-lab.config
kubectl config get-contexts
kubectl get nodes -o wide
kubectl get pods -A
```

or in fish, the login shell of the `archlinux` distribution:

```fish
set -gx KUBECONFIG ~/.kube/lgtm-lab.config
```

or for one command:

```bash
kubectl --kubeconfig ~/.kube/lgtm-lab.config get nodes
```

The context is named `lgtm-lab`. The later make targets (`make platform`, `make lab`) find the
file themselves through `LAB_KUBECONFIG`. If WSL cannot resolve `cluster-endpoint.k8s.local`,
see the row "kubectl: no such host" in section 7.

## 6. Part 4: living with it

### 6.1 Stop and start in the right order

*Not run here: needs an elevated PowerShell.* Elevated PowerShell, in the script folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 stop
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 start
```

`stop` shuts the guests down (`Stop-VM` without `-TurnOff`, so the guest shuts down cleanly) in the
order worker4 to worker1, master3 to master1, lb. `start` starts them in the reverse order: lb
first, because it carries the API endpoint and the lab DNS that every node uses; then the three
masters, so etcd regains its quorum (two of three) quickly; the workers last. Give the cluster
three minutes, then check from WSL:

```bash
make cluster-check
```

The VMs have the automatic start action Nothing and the automatic stop action ShutDown: when
Windows shuts down, Hyper-V shuts them down cleanly, and after a restart of Windows they stay off
until you run `start`.

### 6.2 Running make cluster again

Every play is meant to be safe to run again: packages and files that are right are left alone,
`kubeadm init` is skipped when `/etc/kubernetes/admin.conf` exists, and a node that has joined is
skipped. On a healthy cluster a second run should end with `changed=0` for every host; report any
task that still changes. *Not run here: needs the VMs.*

```bash
make cluster 2>&1 | tail -15
```

To limit a run, pass Ansible arguments: `make cluster ANSIBLE_ARGS="--limit worker4"`. After you
change `nodes.yml` (for example add a worker), run `create` and `start` in PowerShell, then the
whole `make cluster` without a limit, so HAProxy and dnsmasq on lb learn the new node too.

### 6.3 Destroy and recreate

*Not run here: needs an elevated PowerShell.* Elevated PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 destroy
```

It asks before each deletion (each VM and its disks, the name resolution rule, each port proxy,
the NAT, the switch); add `-Confirm:$false` to skip the questions. A VM is turned off first if it
runs. Disks outside `hyperv.vm_path` are kept with a warning, and a switch or NAT that `create` did
not make is kept. The image and base VHDX in `lgtm\lab\vm\hyperv\.cache\` stay for the next
`create`; delete that folder to free that space.

Then in WSL, forget what belonged to the old VMs:

```bash
make forget-host-keys
rm ~/.kube/lgtm-lab.config
```

**Why the host keys:** a recreated VM has the same address but new SSH host keys (cloud-init makes
them on each new instance). `~/.ssh/known_hosts_lgtm-lab` still holds the old ones, and SSH refuses
to connect with `REMOTE HOST IDENTIFICATION HAS CHANGED`. `make forget-host-keys` deletes that one
file, which only the lab uses; `~/.ssh/known_hosts` is not touched. To forget a single VM:

```bash
ssh-keygen -f ~/.ssh/known_hosts_lgtm-lab -R 10.10.0.30
```

Recreate with sections 3.3 to 3.5 and 5.4 to 5.6. Keep the VMs and redo only Kubernetes with the
`kubeadm reset -f` command at the end of section 5.5.

## 7. Part 5: when it goes wrong

Messages in `code` are the text the script, Ansible or the tools print. The first two rows and
the `cluster-check` row on `192.168.10.21` were seen in the owner's first run (2026-11-10); the
others come from the code and the sources.

| Symptom | Cause | Fix |
|---|---|---|
| `Destination directory /etc/multipath/conf.d does not exist` on the workers, task "Keep multipathd off the Longhorn devices" | The role wrote into a folder that the Ubuntu 24.04 cloud image does not have. Fixed: the role now adds a managed block to `/etc/multipath.conf`, as Longhorn's knowledge base describes. | Pull `main` and run `make cluster` again. |
| `/bin/sh: 1: set: Illegal option -o pipefail` on the masters, task "Download k8s apt sign key" | The shell module used `/bin/sh`, which is dash on Ubuntu. Fixed: the task now runs in `/bin/bash`. | Pull `main` and run `make cluster` again; the key file was not written, so the task runs again. |
| `create` stops with `New-NetNat failed: ... Existing NAT networks: <name> (<prefix>)` | Windows allows one NAT network per host ([Set up a NAT network](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network)); another tool made one. | In the elevated PowerShell, `Get-NetNat` shows it. If nothing uses it any more, `Remove-NetNat -Name <name>` and run `create` again. If something still uses it, do not remove it: tell the planner the name and prefix, so the lab can share it or move to its prefix. |
| `qemu-img not found. Install it (...)`, or `WARNING: qemu-img not found; the real run stops at the conversion step.` | `qemu-img` is not installed or not where the script looks (section 2.6). | `winget install --id SoftwareFreedomConservancy.QEMU` in PowerShell or `sudo pacman -S qemu-img` in WSL, or set `hyperv.qemu_img` in `nodes.yml` to the full path of `qemu-img.exe`; then `create` again. |
| `qemu-img convert failed with exit code <n>.` | The conversion failed, often because the WSL `qemu-img` cannot write to the cache path. | Install the Windows `qemu-img` (winget) so the script uses it, delete any `*.part.vhdx` in `.cache\`, run `create` again. |
| `Downloaded image has SHA-256 ..., expected ...` or `Cached image ... has SHA-256 ...` | The download was cut or changed. | Delete the file named in the message and run `create` again. If it repeats, the release was changed upstream: tell the planner. |
| `SSH public key '...' not found. Set ssh.public_key_file in nodes.yml.` | The key does not exist, or WSL is not running and `\\wsl.localhost` cannot be read. | Create the key (section 2.5), or start WSL (`wsl -d archlinux`) and run `create` again. |
| `A VM named '<name>' exists without the 'lgtm-lab' tag.` | A VM of another project has a lab name. | Rename that VM in Hyper-V Manager, or change the lab names in `nodes.yml` and run `make inventory`. |
| The VM console shows a Secure Boot or "No operating system was loaded" message; `status` shows SSH `closed`. | The image did not pass Secure Boot with the template `MicrosoftUEFICertificateAuthority`. Microsoft notes that some Linux VMs boot only with Secure Boot off ([Ubuntu on Hyper-V](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-ubuntu-virtual-machines-on-hyper-v)). | Elevated PowerShell: `Get-VMFirmware -VMName worker1` shows the template. To boot without Secure Boot: `Stop-VM -Name worker1 -TurnOff -Force`, `Set-VMFirmware -VMName worker1 -EnableSecureBoot Off`, `Start-VM -Name worker1`. Tell the planner, so `hyperv.secure_boot_template` or the script changes for all VMs. |
| The VM booted (login prompt on the console) but SSH is `closed`, or the console shows the hostname `ubuntu` | cloud-init did not find the seed, or the network config did not match the card. | Section 4.3: check the MAC (`Get-VMNetworkAdapter`), read the seed disk with `Mount-VHD -ReadOnly`. If the seed is right, destroy and create that VM and send the planner the console messages. |
| `Start-VM` fails because there is not enough memory | The VMs use 46 GB of static memory and Windows, Docker Desktop and other apps use the rest. | Close memory-heavy apps (Docker Desktop's WSL VM counts too), then `start` again; it skips running VMs. Or lower `memory_gb` in `nodes.yml` (destroy and create the VM). |
| `Test-NetConnection 10.10.0.5 -Port 22` works on Windows, but `ssh` or `make ping` from WSL times out | Mirrored WSL does not reach the internal switch on this PC. | Use the port-proxy fallback **before `make cluster`** (the API server certificate gets 127.0.0.1 only at `kubeadm init`): 1. set `network.control_access: portproxy` in `vm/nodes.yml`; 2. run `create -ConfigureDns` again in the elevated PowerShell, which adds only the port proxies (`netsh interface portproxy show v4tov4` lists them: 127.0.0.1:6443 to lb, 127.0.0.1:220xx to port 22 of each VM); 3. in WSL `ssh -i ~/.ssh/ansible -p 22005 vaka@127.0.0.1 hostname` prints `lb`; 4. `make inventory` and go on. If the cluster was already built, also run the `kubeadm reset -f` command of section 5.5 before `make cluster`. Background: `lgtm/docs/adr/l1-wsl-networking.md`. |
| `UNREACHABLE` with `Permission denied (publickey)` | The VMs carry another public key than `~/.ssh/ansible.pub`; the key is written only at creation. | Point `ssh.public_key_file` and `ssh.private_key_file` at the right pair, or destroy and create the VMs with the current key. |
| `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!` or `Host key verification failed.` | The VMs were recreated and have new host keys. | `make forget-host-keys` (or `ssh-keygen -f ~/.ssh/known_hosts_lgtm-lab -R <address>` for one VM). |
| `No package matching '<name>' is available`, or `Failed to update apt cache`, in an apt task | The VM cannot reach an Ubuntu mirror or `pkgs.k8s.io`, or a mirror served stale lists. The first apt task on every host refreshes the cache (the seed sets `package_update: false`, so a fresh image may have none), and a refresh is reused for an hour. | Check the way out (next row). Then force a fresh cache on all VMs and run again: `cd ansible && ANSIBLE_CONFIG=$PWD/ansible.cfg ../.venv/bin/ansible all -b -m ansible.builtin.apt -a update_cache=true`, then `make cluster`. |
| Any apt or download task fails with a timeout or `Temporary failure resolving` | The VMs have no way out: NAT missing, or the host has no internet. | Elevated PowerShell: `Get-NetNat -Name lgtm-lab` and `Get-NetIPAddress -InterfaceAlias 'vEthernet (lgtm-lab)'`. On a VM: `ping -c1 10.10.0.1`, `ping -c1 1.1.1.1`, `resolvectl query pkgs.k8s.io`. Run `create` again to restore a missing part. |
| `kubeadm init` fails in "Initialize k8s master" with a timeout waiting for the API server or `context deadline exceeded` | kubeadm talks to the API server through `cluster-endpoint.k8s.local:6443`: the name must resolve on master1 to 10.10.0.5, and HAProxy must forward to a healthy API server. | On master1: `resolvectl query cluster-endpoint.k8s.local` (must be 10.10.0.5), `nc -zv -w 2 10.10.0.5 6443`; open `http://10.10.0.5:8404/stats` and look at `k8s_api_servers`. Kubernetes' HA guide expects "connection refused" from the load balancer before the API server runs and treats a timeout as a load balancer problem ([kubeadm HA](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)). Then on master1 `sudo kubeadm reset -f` and `make cluster` again. |
| "Wait for Calico to be ready" fails after its 20 retries | Calico images are still downloading through the NAT, or a Calico pod fails. | `kubectl get tigerastatus`, `kubectl get pods -n calico-system -o wide`, `kubectl logs -n tigera-operator deploy/tigera-operator`. Slow downloads: run `make cluster` again, it continues. A pod in error: send the planner its `kubectl describe pod` output. |
| On a node, `cluster-endpoint.k8s.local` does not resolve | systemd-resolved does not send `.local` names to unicast DNS unless the domain is configured as a search or routing domain ([systemd-resolved](https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html)); the `network` role sets `Domains=~k8s.local`. Or dnsmasq on lb is not running. | On the node: `cat /etc/systemd/resolved.conf.d/k8s.conf`, `resolvectl status`; on lb: `systemctl status dnsmasq`, `dig +short @10.10.0.5 cluster-endpoint.k8s.local`. Run `make cluster` again to restore the files. |
| On Windows, `Resolve-DnsName cluster-endpoint.k8s.local` fails | `create` ran without `-ConfigureDns`, or dnsmasq does not run yet (before `make cluster` that is normal). | `Get-DnsClientNrptRule` must list `.k8s.local` with 10.10.0.5; if not, run `create -ConfigureDns` again. |
| `make cluster-check` fails in its last play with `dial tcp 192.168.10.21:6443: connect: no route to host` (seen in the owner's run, 2026-11-10), or, since this check exists, `cluster-endpoint.k8s.local resolves to 192.168.10.21 on this machine, not to the load balancer 10.10.0.5` | WSL's hand-kept `/etc/hosts` still had `192.168.10.21 cluster-endpoint.k8s.local` from an older cluster that used the same endpoint name. Windows resolved the name correctly through the name resolution rule. | Correct or remove that line in WSL's `/etc/hosts`, then `getent hosts cluster-endpoint.k8s.local` prints `10.10.0.5`. Or write the address into the kubeconfig: `make cluster ANSIBLE_ARGS="-e kubeconfig_fetch_server=https://10.10.0.5:6443"`. |
| kubectl in WSL: `dial tcp: lookup cluster-endpoint.k8s.local ... no such host` | WSL does not resolve the lab zone. | Use the lb address, which is in the API server certificate: `make cluster ANSIBLE_ARGS="-e kubeconfig_fetch_server=https://10.10.0.5:6443"` rewrites the kubeconfig (pass the same argument on later runs, or the next run writes the name back). |

## 8. What comes next

The cluster is empty apart from Calico. `make platform` adds what the LGTM stack needs: Longhorn
on the workers' `/var/lib/longhorn` disks, the RustFS S3 store, Envoy Gateway on NodePorts 30080
and 30443 behind HAProxy, Strimzi and Kafka, cert-manager and metrics-server; `docs/platform.md`
explains it and `make platform-check` tests it. Then `make lab` installs Mimir, Loki, Tempo,
Grafana, the OpenTelemetry Collector gateway, Alloy, the Prometheus stack and the demo shop;
`docs/lgtm.md` explains it and `make lab-check` tests it. Both use `~/.kube/lgtm-lab.config` and
the default profile `LAB_PROFILE=full`.

## Sources

Fetched on 2026-11-10:

- Install Hyper-V: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/install-hyper-v?pivots=windows
- Set up a NAT network: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network
- Supported Ubuntu virtual machines on Hyper-V: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-ubuntu-virtual-machines-on-hyper-v
- about_Execution_Policies (fetched 2026-11-10, after the first run report): https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies
- Set-VMFirmware: https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vmfirmware
- Add-DnsClientNrptRule: https://learn.microsoft.com/en-us/powershell/module/dnsclient/add-dnsclientnrptrule
- netsh interface (portproxy): https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- WSL networking: https://learn.microsoft.com/en-us/windows/wsl/networking
- WSL configuration: https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- cloud-init NoCloud: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- cloud-init boot stages: https://docs.cloud-init.io/en/latest/explanation/boot.html
- How to debug cloud-init: https://docs.cloud-init.io/en/latest/howto/debugging.html
- systemd-resolved: https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html
- kubeadm highly available clusters: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/

## Status of every step

What the agent ran on 2026-11-10 while writing this guide, and what only the owner can run.

| Step | Section | Status |
|---|---|---|
| Windows edition, `vmms`, Hyper-V module | 2.1 | Run here: Windows 11 Pro, `vmms` Running, Hyper-V 2.0.0.0 |
| Enable Hyper-V | 2.1 | Not needed on this PC |
| Elevation check | 2.2 | Run here: `False` (agent session not elevated) |
| WSL distribution and `.wslconfig` | 2.3 | Run here: `archlinux` version 2, `networkingMode=mirrored` |
| Python, make, kubectl in WSL | 2.4 | Run here: 3.14.8, 4.4.1, v1.36.1 |
| SSH key pair | 2.5 | Run here: both files exist; `plan` reports `found` |
| qemu-img | 2.6 | Run here: **not found**; the owner must install it before `create` |
| Memory and disk | 2.7 | Run here (`plan`): 15.6 GB left, 910.7 GB free |
| Endpoint name in WSL | 2.8 | Run here: `10.10.0.5` (after the owner corrected `/etc/hosts`) |
| `lab-vms.ps1 plan -ConfigureDns` | 3.1 | Run here: output shown |
| `create -ConfigureDns -WhatIf` | 3.2 | Run here in a normal window (stops at the first Hyper-V call, as designed); elevated: not run here, needs an elevated PowerShell |
| `create -ConfigureDns` | 3.3 | Not run here: needs an elevated PowerShell |
| `start` | 3.4 | Not run here: needs an elevated PowerShell (a normal window gives `'Start-VM' needs administrator rights`) |
| `status` | 3.5 | Not run here: needs an elevated PowerShell (a normal window gives `'Get-VM' needs administrator rights`) |
| Seed rendering for master1 and worker1 | 4.1 | Run here: output shown |
| First boot and cloud-init checks | 4.2, 4.3 | Not run here: needs the VMs |
| `make help` | 5 | Run here |
| `make venv` | 5.1 | Run here: output shown |
| `make collections` | 5.2 | Run here: output shown |
| `make inventory` | 5.3 | Run here: output shown, `hosts.yml` unchanged |
| `make ping` | 5.4 | Not run here: needs the VMs |
| `make cluster` | 5.5 | `make -n cluster` and `site.yml --list-tasks` run here; the real run: not run here, needs the VMs |
| `make cluster-check` | 5.6 | Not run here: needs the VMs |
| kubeconfig use | 5.7 | Not run here: needs the VMs |
| `stop` and `start` | 6.1 | Not run here: needs an elevated PowerShell (a normal window gives `'Stop-VM' needs administrator rights`) |
| Second `make cluster` | 6.2 | Not run here: needs the VMs |
| `destroy`, `make forget-host-keys` | 6.3 | Not run here: needs an elevated PowerShell (`make -n forget-host-keys` run here: `rm -f /home/vaka/.ssh/known_hosts_lgtm-lab`) |
| Troubleshooting rows | 7 | From the code and the sources; none seen on this PC |
