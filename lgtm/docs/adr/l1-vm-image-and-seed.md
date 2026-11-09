# L1: VM image and cloud-init seed on Hyper-V

Status: accepted by worker L1 on 2026-11-09; not yet run on the PC (the owner runs the
acceptance checklist, `lgtm/lab/docs/acceptance-cluster.md`).

## Context

The lab needs 8 Ubuntu Server LTS VMs on Hyper-V, each with a hostname, the lab user and SSH
key, no password login and a static address from first boot. The VM script runs in Windows
PowerShell 5.1 on the owner's PC; Ansible must find SSH-reachable machines afterwards. Agent
sessions cannot run Hyper-V, so the choice has to rest on published facts.

## Which image

Canonical publishes, for Ubuntu 24.04 (checked in
https://cloud-images.ubuntu.com/releases/noble/release-20261017/ on 2026-11-09):

| File | Format | Fit for this lab |
|---|---|---|
| `ubuntu-24.04-server-cloudimg-amd64.img` | QCOW2 | Generic cloud image; cloud-init looks for every data source, NoCloud included. Needs conversion to VHDX. |
| `ubuntu-24.04-server-cloudimg-amd64-azure.vhd.tar.gz` | VHD in a tarball | Built for Azure: cloud-init is set to the Azure data source and expects the Azure fabric. Not usable with a local seed. |
| `ubuntu-24.04-server-cloudimg-amd64.vmdk`, `.ova` | VMDK | For VirtualBox and VMware; Hyper-V cannot attach VMDK. |
| `-root.tar.xz`, `.squashfs`, `-lxd.tar.xz` | file systems | Not bootable disks. |

Decision: the generic QCOW2 image, pinned to `release-20261017` with its SHA-256
`04e8f2461a16a44e78a370284471f29616cdd9baf1893df25807b71f985b6c94` from that folder's
`SHA256SUMS`. Hyper-V has no QCOW2 reader, so `lab-vms.ps1 create` converts it once with
`qemu-img convert -f qcow2 -O vhdx -o subformat=dynamic` into a base VHDX in
`lgtm/lab/vm/hyperv/.cache/`, clears the NTFS sparse flag (Hyper-V refuses sparse VHDX files),
then copies it per VM and grows the copy with `Resize-VHD`. cloud-init's `growpart` grows the root
partition at first boot.

`qemu-img` is not part of Windows. The script looks for it in `hyperv.qemu_img` from
`nodes.yml`, then on `PATH`, then in `C:\Program Files\qemu`, then inside the WSL distribution.
The owner installs it once: `winget install --id SoftwareFreedomConservancy.QEMU` (the package
exists in microsoft/winget-pkgs) or `sudo pacman -S qemu-img` in WSL (Arch package `qemu-img`
11.1.3). This is a step of the acceptance checklist, not something an agent may do.

Why Ubuntu 24.04 and not 26.04: the copied `k8s-provision` roles were written for 24.04, it is
and it is supported until 2029. 24.04 now ships containerd 2.2.1
(`noble-updates`, checked on packages.ubuntu.com and by installing it in an `ubuntu:24.04`
container: `containerd config default` prints `SystemdCgroup = false` and
`bin_dirs = ['/opt/cni/bin']`), so the copied `containerd` role still works: its `SystemdCgroup`
edit applies and its `bin_dir = "/usr/lib/cni"` edit no longer matches anything, which is
harmless because the default is already `/opt/cni/bin`. The release is one line in `nodes.yml`.

Generation 2 VMs boot this image with Secure Boot when the template is
`MicrosoftUEFICertificateAuthority` (Ubuntu's shim is signed by the Microsoft UEFI CA). If a VM
does not boot, the checklist shows how to turn Secure Boot off for it.

## How the seed is attached

cloud-init's NoCloud data source reads `meta-data`, `user-data` and `network-config` from a
vfat or iso9660 file system labelled `CIDATA`
(https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html).

Options:
1. ISO 9660 image in the DVD drive. Windows has no built-in ISO writer (`oscdimg` comes with
   the Windows ADK), so this needs another tool.
2. Small VHDX with a FAT32 volume labelled `CIDATA`, made with `New-VHD`, `Mount-VHD`,
   `Initialize-Disk`, `New-Partition` and `Format-Volume`, all built into Windows and the Hyper-V
   module.
3. Pass data through Hyper-V KVP. cloud-init has no such data source.

Decision: option 2. Each VM gets `<name>-seed.vhdx` (64 MB dynamic, MBR, FAT32, label `CIDATA`)
attached as a second SCSI disk. The files are rendered by `ConvertTo-LabCloudInit` and covered by
the Pester tests:

- `meta-data`: `instance-id: lgtm-lab-<name>`, `local-hostname`.
- `user-data`: hostname and FQDN, user `vaka` in `sudo` with password-less sudo, locked password,
  the public key, `ssh_pwauth: false`, `disable_root: true`, `growpart`.
- `network-config` (version 2): the one card matched by its static MAC address and named `eth0`,
  static address, default route to 10.10.0.1, upstream resolvers. The MAC is fixed per VM
  (locally administered prefix `02:4c:47` plus the last three octets of the address), so the
  match never depends on how the guest names the card.

The seed disk has a partition table, so `node_prereqs` never mistakes it for the Longhorn data
disk.

## Consequences

- One extra tool (`qemu-img`) on the owner's PC, used once per image release.
- Each VM costs about 2.5 GB of real disk for its OS copy before it runs; the data disks grow
  with use.
- Changing the image means changing `image.url` and `image.sha256` in `nodes.yml`; existing VMs
  keep their disks until they are destroyed.

## Unverified until the owner runs it

That Hyper-V accepts the `qemu-img` VHDX, that the image boots with Secure Boot, that the FAT32
seed is found, and that the card comes up as `eth0` with its address. The checklist covers each.
