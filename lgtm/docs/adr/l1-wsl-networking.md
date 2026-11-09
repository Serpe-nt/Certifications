# L1: How WSL reaches the lab VMs

Status: accepted by worker L1 on 2026-11-09; the direct path is not yet tested with the lab
switch (the owner runs the acceptance checklist).

## Context

Ansible, kubectl and helm run in WSL (distribution `archlinux`). The VMs sit on the Hyper-V
internal switch `lgtm-lab`, 10.10.0.0/24, with the Windows host at 10.10.0.1. WSL must reach
10.10.0.0/24 for SSH (Ansible) and for 6443 (kubectl through HAProxy on `lb`).

## What is known

- `.wslconfig` on the PC sets `networkingMode=mirrored` (card, checked 2026-11-09).
- Mirrored mode "mirrors the network interfaces that you have on Windows into Linux"
  (https://learn.microsoft.com/en-us/windows/wsl/networking). Linux and Windows also share
  `localhost`: Linux reaches Windows servers on 127.0.0.1.
- On the PC today, Windows has a Hyper-V virtual adapter `vEthernet (WSL - VM Internal Bridge)`
  with 192.168.10.1/24, and WSL shows the same address on its `eth2`
  (`ip -4 -br addr` in WSL, 2026-11-09). So a Hyper-V virtual adapter is mirrored into WSL, and the
  owner's earlier lab already used that subnet for Ansible (`ansible_host: 192.168.10.x` in the
  copied inventory).
- With WSL 2.0.9 and later, the Hyper-V firewall is on by default and Windows firewall features
  apply to WSL; the page shows how to allow inbound connections. Ansible and kubectl only open
  outbound connections. Whether those reach the switch on this PC is the first network step of
  the checklist.
- Reports differ on whether mirrored mode reaches every kind of Hyper-V switch; there is no
  official statement for internal switches (search on 2026-11-09).

## Decision

1. **Direct (default, `network.control_access: direct` in `nodes.yml`).** When `create` adds
   10.10.0.1/24 to `vEthernet (lgtm-lab)`, WSL should show 10.10.0.1/24 on a mirrored interface
   and route 10.10.0.0/24 through it. The inventory uses the VM addresses, and the kubeconfig
   uses `https://cluster-endpoint.k8s.local:6443`. WSL resolves that name through Windows when
   `create -ConfigureDns` added the name resolution rule for `.k8s.local`; otherwise the
   checklist shows how to use the address 10.10.0.5, which is in the API server certificate.
2. **Fallback (`network.control_access: portproxy`).** If WSL cannot reach 10.10.0.0/24,
   `lab-vms.ps1 create` adds Windows port proxies on 127.0.0.1: 6443 to `lb:6443`, and
   `22000 + last octet` to port 22 of every VM (for example 127.0.0.1:22011 to master1). Windows
   itself reaches the switch, and mirrored WSL reaches Windows on 127.0.0.1. `make inventory`
   then writes `ansible_host: 127.0.0.1` with those ports, adds 127.0.0.1 to the API server
   certificate names and writes `https://127.0.0.1:6443` into the kubeconfig. `destroy` removes
   exactly the port proxies the script recorded in `vm/hyperv/.cache/state.json`.

Choose before `make cluster`: the API server certificate is made once, by `kubeadm init`.

## Options not taken

- Switch WSL to NAT mode and route 10.10.0.0/24 to Windows: changes WSL settings that the owner
  uses for other work, and needs IP forwarding on Windows.
- Run Ansible on the `lb` VM: the course is written for WSL, and kubectl would also have to run
  there.
- An SSH jump through `lb`: the copied `ssh_hardening` role sets `AllowTcpForwarding no`.

## Consequences

- The checklist's first network step is `ip -4 -br addr` and `ping 10.10.0.5` in WSL, so the owner
  knows within a minute which path applies.
- The fallback needs the Windows IP Helper service (it runs by default) and is only made by the
  elevated script.
