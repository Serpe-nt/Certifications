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

- [ ] Expect 6 rows with State `Running` and SSH `open`.
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

## Rebuild for version 3 (2026-11-13, card L6)

The lab was destroyed and built again from `main` (commit 610f51c) with one control-plane node
and four 8 GB workers. The owner ran `destroy`, `plan -ConfigureDns`, `create -ConfigureDns`,
`start` and `status` in an elevated PowerShell; worker L6 ran the rest in WSL. Times are UTC.

`lab-vms.ps1 status` after `start`:

```
Name    Role          Address    State   CPU MemoryGB Uptime  SSH
lb      lb            10.10.0.5  Running 0%         2 0.00:00 open
master1 control_plane 10.10.0.11 Running 0%         4 0.00:00 open
worker1 worker        10.10.0.30 Running 0%         8 0.00:00 open
worker2 worker        10.10.0.31 Running 0%         8 0.00:00 open
worker3 worker        10.10.0.32 Running 0%         8 0.00:00 open
worker4 worker        10.10.0.33 Running 0%         8 0.00:00 open
```

| Step | Time | Result |
|---|---|---|
| `make forget-host-keys`, `make ping` | 12:42 | `SUCCESS` and `pong` for lb, master1, worker1 to worker4 |
| `make cluster` | 12:43 to 12:48 | `failed=0` on every host |
| `make cluster-check` | 12:49 | `failed=0` |
| `make platform`, `make platform-check` | 12:50 to 13:04 | `PLATFORM CHECK PASSED (profile full)` |
| `make lab`, `make lab-check` | 13:04 to 13:15 | `LAB CHECK PASSED` |

The plays `make cluster` runs, from its log (the first play is `make inventory`):

```
PLAY [Generate the Ansible inventory from the nodes file]
PLAY [Load balancer and lab DNS]
PLAY [Common setup]
PLAY [Initialize first master node]
PLAY [Join remaining control plane nodes]
skipping: no hosts matched
PLAY [Join workers]
PLAY [Write the lab kubeconfig on the control machine]

PLAY RECAP
lb       : ok=16   changed=10   unreachable=0    failed=0    skipped=1
master1  : ok=45   changed=28   unreachable=0    failed=0    skipped=2
worker1  : ok=46   changed=29   unreachable=0    failed=0    skipped=2
worker2  : ok=46   changed=29   unreachable=0    failed=0    skipped=2
worker3  : ok=46   changed=29   unreachable=0    failed=0    skipped=2
worker4  : ok=46   changed=29   unreachable=0    failed=0    skipped=2
```

`make cluster-check` printed `API servers up behind HAProxy: master1`,
`Nodes: master1, worker1, worker2, worker3, worker4` and
`cluster-endpoint.k8s.local resolves to the load balancer 10.10.0.5`.

### What the lessons quote

Read on 2026-11-13 at 13:16, after `make lab-check` passed.

```
$ kubectl get nodes
NAME      STATUS   ROLES           AGE   VERSION
master1   Ready    control-plane   29m   v1.35.10
worker1   Ready    <none>          27m   v1.35.10
worker2   Ready    <none>          27m   v1.35.10
worker3   Ready    <none>          27m   v1.35.10
worker4   Ready    <none>          27m   v1.35.10

$ kubectl get pods -n kube-system -l tier=control-plane
NAME                              READY   STATUS    RESTARTS   AGE
etcd-master1                      1/1     Running   0          29m
kube-apiserver-master1            1/1     Running   0          29m
kube-controller-manager-master1   1/1     Running   0          29m
kube-scheduler-master1            1/1     Running   0          29m
```

Nodes are Ubuntu 24.04.5 LTS, kernel 6.8.0-147-generic, containerd 2.2.1. One etcd pod. Before
`make platform` CoreDNS ran on master1 (both replicas); the platform's first role moves it to
the workers, as before.

The lab's Prometheus, through the API server proxy:

| Query | Answer |
|---|---|
| `count by (job) (up)` | 29 series: `kubelet` 15 (kubelet, cAdvisor and probes on each of the 5 nodes), `node-exporter` 5, `coredns` 2, `prom-alertmanager` 2, `prom-prometheus` 2, `prom-operator` 1, `apiserver` 1, `kube-state-metrics` 1 |
| `up == 0` | none; 29 active targets, 29 up |
| `/api/v1/rules` | 31 rule files, 31 groups, 221 rules, 135 of them alerting rules |

Version 2 of the lab had seven nodes, three etcd pods and three API servers behind HAProxy; with
it `up` had more `kubelet`, `node-exporter` and `apiserver` series.

## After a sleep (card L7)

### Calico 3.31.7 on the running lab, 2026-11-14

With the owner's go-ahead, worker L7 ran Calico's steps for an operator installation from WSL
(`runbook.md`, "Upgrade Calico"; why: `lgtm/docs/adr/l7-calico-cni-token.md`). Times are UTC.

| Step | Time | Result |
|---|---|---|
| Before | 18:06:48 | `installation default` at `v3.31.4`; every `tigerastatus` row `AVAILABLE True`; no pod outside `Running` or `Succeeded` |
| `kubectl apply --server-side --force-conflicts -f .../v3.31.7/manifests/operator-crds.yaml` | 18:06:49 | `serverside-applied` |
| `kubectl apply --server-side --force-conflicts -f .../v3.31.7/manifests/tigera-operator.yaml` | 18:06:51 | `serverside-applied`; operator image `quay.io/tigera/operator:v1.40.15` |
| The operator replaces every Calico pod | 18:07 to 18:11:48 | calico-node one node at a time (one node not Ready at a time); `installation default` at `v3.31.7`; every `tigerastatus` row `AVAILABLE True`; the operator keeps its affinity off the control-plane node; no `FailedCreatePodSandBox` event |
| `make calico-renew` | 18:11:58 to 18:15:05 | `daemon set "calico-node" successfully rolled out`, then `PASS` for master1 and worker1 to worker4; the operator kept the annotation `kubectl.kubernetes.io/restartedAt` (`2026-11-14T18:12:01Z`) |

Every calico-node then ran `quay.io/calico/node:v3.31.7` and logged, as it started, the watch
on its service account token and a new CNI token, for example on worker3:

```
2026-11-14 18:12:05.666 [INFO][64] cni-config-monitor/token_watch.go 240: Watching service account token directory for rotation
2026-11-14 18:12:05.674 [INFO][64] cni-config-monitor/token_watch.go 483: Wrote updated CNI kubeconfig file.
```
