# Example inventory: KVM VMs with two networks

This is the inventory of the original `k8s-provision` project (commit `8442dee`), kept as a
second supported shape. Each VM has a management card that Ansible uses (192.168.10.x) and a
second card for the cluster (`eth2`, 10.10.0.x) that the `network` role configures with netplan.
The load balancer and the DNS server at 10.10.0.5 were made by hand, so this inventory has no
`load_balancer` group and `site.yml` skips that play.

Run it from `lgtm/lab/ansible`:

```bash
ansible-playbook -i inventory/examples/kvm-multi-nic/hosts.yml site.yml
```

The other files here belong to the same shape and are not used by the Hyper-V lab:

- `k8s-virt-net.xml`: the libvirt network for the cluster cards.
- `manageClusterState.sh`: starts and shuts down the KVM VMs with `virsh`.
- `postClone.sh`: resets hostname, machine id and SSH host keys of a cloned VM. With
  cloud-init, as in the Hyper-V lab, this is not needed.
