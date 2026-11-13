# Acceptance checklist: VMs and cluster

The first run of the lab on the PC, step by step. The agent that wrote the script and playbooks
could not run Hyper-V or reach a cluster, so this run is the real test. Each step says what to
run, what you should see, and how to undo it. Note anything that differs and give it to the
planner with the output (the boxes are for you to tick).
Every step is explained in full, with its prerequisites and fixes, in `bootstrap-windows11.md`.

Paths: the repository is `C:\Users\serpe\Projects\saa-c03-tracker` on Windows and
`/mnt/c/Users/serpe/Projects/saa-c03-tracker` in WSL. Pull `main` first so the lab files are there.

Time: about 1 hour, most of it waiting for downloads and `make cluster`.

## 0. Before you start (once)

- [ ] **Disk.** The lab uses up to about 90 GB in `C:\Hyper-V\lgtm-lab`. To put it on another
  drive, change `hyperv.vm_path` in `lgtm/lab/vm/nodes.yml` now (for example `D:\Hyper-V\lgtm-lab`).
- [ ] **qemu-img**, to convert the Ubuntu image. Either, in a normal PowerShell:

  ```powershell
  winget install --id SoftwareFreedomConservancy.QEMU
  ```

  or in WSL: `sudo pacman -S qemu-img`. The script finds `C:\Program Files\qemu\qemu-img.exe`,
  `qemu-img.exe` on PATH, or `qemu-img` in the `archlinux` distribution.
- [ ] **SSH key.** In WSL, `ls ~/.ssh/ansible ~/.ssh/ansible.pub` shows both files. The script
  reads the public key from Windows as `\\wsl.localhost\archlinux\home\vaka\.ssh\ansible.pub`.
- [ ] **kubectl in WSL**: `kubectl version --client` prints a version (1.34 to 1.36 works with the
  1.35 cluster).

## 1. Plan (no administrator rights needed)

```powershell
cd C:\Users\serpe\Projects\saa-c03-tracker\lgtm\lab\vm\hyperv
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 plan -ConfigureDns
```

- [ ] Expect: "Plan for the LGTM lab", the switch, address and NAT steps, the name resolution rule
  for `.k8s.local`, the image URL with its SHA-256, and a table of 6 VMs: lb 10.10.0.5, master1
  10.10.0.11, worker1 to worker4 10.10.0.30 to .33. "Total: 20 vCPU, 38 GB memory".
- [ ] Under "Checks": the key is `found`, the Hyper-V module is `installed`, qemu-img is found (in
  the Image section), no WARNING about host addresses, memory or free space.
- Undo: nothing to undo.

## 2. Create the VMs (elevated)

Open **PowerShell as administrator** (Start, type PowerShell, Run as administrator).

```powershell
cd C:\Users\serpe\Projects\saa-c03-tracker\lgtm\lab\vm\hyperv
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 create -ConfigureDns -WhatIf
```

- [ ] Expect a list of "What if:" lines (download, convert, switch, address, NAT, 6 VMs, the DNS
  rule) and no error. Nothing is changed.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 create -ConfigureDns
```

- [ ] Expect `[lab-vms]` lines: image downloaded and verified (about 600 MB), base image
  converted, "Created VM lb" through "Created VM worker4", "Create finished". It takes a few
  minutes. Windows may briefly show a new drive while each seed disk is written; ignore it.
- [ ] Hyper-V Manager shows 6 VMs, all Off, each with Notes `lgtm-lab`.
- If it stops with an error: copy the red message. Running `create` again continues where it
  stopped; parts that exist are kept.
- If `New-NetNat` fails: the message lists the NAT networks that exist. Windows may allow only one;
  tell the planner which one is there (Docker Desktop and other tools create one).
- Undo: `powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 destroy` (asks before
  each deletion; it removes only what carries the `lgtm-lab` tag or what `create` recorded).

## 3. Start the VMs (elevated)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 start
```

Wait 2 minutes for the first boot (cloud-init sets the hostname, user, key and address), then:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 status
```

- [ ] Expect 8 rows with State `Running` and SSH `open`.
- If a VM shows SSH `closed` after 5 minutes, open its console in Hyper-V Manager (Connect):
  - "No operating system was loaded" or a Secure Boot message: turn Secure Boot off for that VM
    and start it again:

    ```powershell
    Stop-VM -Name worker1 -TurnOff -Force
    Set-VMFirmware -VMName worker1 -EnableSecureBoot Off
    Start-VM -Name worker1
    ```

    If that helps, tell the planner: `hyperv.secure_boot_template` or Secure Boot needs changing.
  - A login prompt: the VM booted. Password login is off, so check from WSL in step 4.
- Undo: `.\lab-vms.ps1 stop`.

## 4. Reach the VMs from Windows and WSL

In PowerShell (normal is fine):

```powershell
Test-NetConnection 10.10.0.5 -Port 22
Resolve-DnsName cluster-endpoint.k8s.local
```

- [ ] `TcpTestSucceeded : True`. The DNS lookup fails for now (dnsmasq comes in step 6); that is
  expected.

In WSL:

```bash
ip -4 -br addr | grep 10.10.0.1
ssh -i ~/.ssh/ansible -o UserKnownHostsFile=~/.ssh/known_hosts_lgtm-lab -o StrictHostKeyChecking=accept-new vaka@10.10.0.5 'hostname; ip -4 -br addr show eth0; cloud-init status; sudo -n true && echo sudo-ok'
```

- [ ] The first command shows an interface with `10.10.0.1/24` (the mirrored `vEthernet (lgtm-lab)`).
- [ ] The SSH command prints `lb`, `eth0 UP 10.10.0.5/24`, `status: done` and `sudo-ok`.
- **If WSL cannot reach 10.10.0.5** (timeout) but Windows can: use the fallback before going on.
  1. In `lgtm/lab/vm/nodes.yml` set `control_access: portproxy`.
  2. In the elevated PowerShell run `create` again (it adds only the port proxies):
     `powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 create -ConfigureDns`.
  3. In WSL test `ssh -i ~/.ssh/ansible -p 22005 vaka@127.0.0.1 hostname`; it prints `lb`.
  4. Tell the planner that the fallback was needed. Background: `lgtm/docs/adr/l1-wsl-networking.md`.

## 5. Ansible reaches every VM (WSL)

```bash
cd /mnt/c/Users/serpe/Projects/saa-c03-tracker/lgtm/lab
make venv
make collections
make inventory
make ping
```

- [ ] `make venv` and `make collections` end without errors (they install into `lgtm/lab/.venv`
  and `lgtm/lab/ansible/.ansible/`, nothing system-wide).
- [ ] `make inventory` ends with `ok=2 changed=0` or `changed=1`; `git status` shows no change
  to `ansible/inventory/hosts.yml` unless you changed `nodes.yml`.
- [ ] `make ping` prints `SUCCESS` and `"ping": "pong"` for lb, master1 and worker1 to
  worker4.
- Undo: `make forget-host-keys` forgets the host keys accepted here.

## 6. Build the cluster (WSL)

```bash
make cluster 2>&1 | tee ~/lgtm-cluster-first-run.log
```

- [ ] It runs 15 to 30 minutes and ends with a PLAY RECAP where every host has `failed=0` and
  `unreachable=0`.
- [ ] Near the end: `Lab kubeconfig: /home/vaka/.kube/lgtm-lab.config`.
- [ ] `~/.kube/config` is unchanged (`ls -l ~/.kube/` shows its old date).
- If it fails: keep `~/lgtm-cluster-first-run.log` for the planner. Fix or report, then run
  `make cluster` again; finished steps are skipped.
- Undo (keep the VMs, remove Kubernetes):
  `cd ansible && ANSIBLE_CONFIG=$PWD/ansible.cfg ../.venv/bin/ansible k8s_cluster -b -m ansible.builtin.command -a "kubeadm reset -f"`.

## 7. Check the cluster (WSL and Windows)

```bash
make cluster-check
export KUBECONFIG=~/.kube/lgtm-lab.config
kubectl get nodes -o wide
kubectl get pods -A
```

- [ ] `make cluster-check` ends with `failed=0`, with "API servers up behind HAProxy: master1"
  and "Nodes: ..." listing all 5 Kubernetes nodes, and `kubectl get nodes`
  shows master1 and worker1 to worker4 `Ready`, INTERNAL-IP 10.10.0.x, v1.35.x.
- [ ] `kubectl get pods -A`: everything in `kube-system`, `calico-system`, `tigera-operator`
  is `Running`.
- [ ] On a worker, the data disk is mounted:
  `ssh -i ~/.ssh/ansible -o UserKnownHostsFile=~/.ssh/known_hosts_lgtm-lab vaka@10.10.0.30 'findmnt /var/lib/longhorn; systemctl is-active iscsid chrony'`
  shows an ext4 file system of about 40 GB and `active` twice.
- [ ] In PowerShell: `Resolve-DnsName cluster-endpoint.k8s.local` and
  `Resolve-DnsName grafana.lab.k8s.local` both answer 10.10.0.5.
- [ ] In the browser, `http://10.10.0.5:8404/stats` shows the HAProxy page with the one
  `k8s_api_servers` server (master1) green. The worker backends stay red until the gateway exists (card L2).

## 8. Run it again (WSL)

```bash
make cluster 2>&1 | tail -15
```

- [ ] PLAY RECAP shows `changed=0` for every host (or a short list of tasks; give that list to the
  planner, a re-run should change nothing).

## 9. Stop and start (elevated PowerShell, then WSL)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 stop
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 start
```

Wait 3 minutes, then in WSL `make cluster-check`.

- [ ] `stop` shuts down workers, then master1, then lb; `start` brings them back in the reverse
  order; `make cluster-check` passes again.

## 10. Tear down (only when you want the lab gone)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\lab-vms.ps1 destroy
```

```bash
make forget-host-keys
rm ~/.kube/lgtm-lab.config
```

- [ ] `destroy` asks for each VM, the DNS rule, the NAT and the switch; after it, Hyper-V Manager
  shows none of the 6 VMs, `Get-VMSwitch lgtm-lab` and `Get-NetNat lgtm-lab` find nothing, and
  `C:\Hyper-V\lgtm-lab` holds no VM folders.
- The image cache in `lgtm\lab\vm\hyperv\.cache\` is kept for the next `create`; delete it by hand
  to free the space.

## What to send the planner

The output of steps 1, 3 (`status`), 6 (PLAY RECAP and any failed task), 7 and 8, and every
place where you saw something other than the expected line.
