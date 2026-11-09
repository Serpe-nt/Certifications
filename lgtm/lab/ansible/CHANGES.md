# Changes to the copied k8s-provision project

`lgtm/lab/ansible` began as an unchanged copy of github.com/Odery/k8s-provision at commit
`8442dee`. The roles stay free of anything tied to one hypervisor: given SSH-reachable Ubuntu
machines and an inventory, they run on Hyper-V, KVM or bare metal. This file lists every change
made to the copied files, with its reason. Files that are new in this project are listed at the end.

## Changes to copied roles

| File | Change | Reason |
|---|---|---|
| `roles/containerd/tasks/main.yml` | "Generate default Containerd config" now has `creates: /etc/containerd/config.toml` instead of `changed_when: false`. | The task rewrote the file on every run, which undid the `SystemdCgroup` edit and made the next task restart containerd on every run. Now the default file is written once and later runs change nothing. |
| `roles/network/tasks/main.yml`, `roles/network/defaults/main.yml` | The netplan task runs only when `network_manage_k8s_interface` is true (default true, the original behaviour). | The task gives a second network card the cluster address. A VM with one card, configured by cloud-init at first boot, must not get a second netplan file for the same card. The generated inventory sets the variable to false; the KVM example sets it to true. |
| `roles/network/handlers/main.yml` | "Reapply netplan" has `changed_when: true`. | ansible-lint `no-changed-when`. No change in behaviour. |
| `roles/k8s_packages/defaults/main.yml` | The apt key and repository URLs use `k8s_minor_version` instead of a fixed `v1.35`. | The Kubernetes minor version is set in one place, `inventory/group_vars/all.yml` (still 1.35). |
| `roles/k8s_packages/tasks/main.yml` | "Set kubelet node IP" has `regexp: "^KUBELET_EXTRA_ARGS="` and `mode: "0644"`. | Without the regexp a changed address added a second line instead of replacing the first. The mode is required by ansible-lint `risky-file-permissions`. |
| `roles/master_init/defaults/main.yml` | `tigera_operator_manifest_url` uses `calico_version`; new `master_init_calico_crds_manifest_url`, `master_init_service_network_cidr` (10.96.0.0/16) and `master_init_apiserver_cert_extra_sans` ([]). | Calico version in one place (`inventory/group_vars/all.yml`, still 3.31.4). See the next rows for the other three. |
| `roles/master_init/tasks/main.yml` | Calico is installed by applying `operator-crds.yaml` and then `tigera-operator.yaml` with `kubectl apply --server-side --force-conflicts`, each only when it is not installed yet. | Since Calico 3.30 the operator CRDs are no longer in `tigera-operator.yaml` (checked on 2026-11-09: the 3.31.4 file holds 0 CustomResourceDefinitions, `operator-crds.yaml` holds 32), so the original role would wait forever for `installations.operator.tigera.io`. The CRD file is 2.6 MB, too large for client-side apply. Calico's own guide installs both files: https://docs.tigera.io/calico/3.31/getting-started/kubernetes/self-managed-onprem/onpremises |
| `roles/master_init/templates/kubeadm-config.yaml.j2` | Sets `networking.serviceSubnet` and, when `master_init_apiserver_cert_extra_sans` is not empty, `apiServer.certSANs`. | kubeadm's default service subnet is 10.96.0.0/12 (https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/), which contains the pod network 10.100.0.0/16; a Service could get the address of a pod. 10.96.0.0/16 keeps the usual 10.96.0.1 and 10.96.0.10. The extra SAN lets kubectl reach the API server by the load balancer address when the name does not resolve. |
| `roles/control_plane_join/tasks/main.yml`, `roles/worker_join/tasks/main.yml` | All join tasks are skipped when `/etc/kubernetes/kubelet.conf` exists. The join file is written to `/root/k8s-join-config.yaml` (root, 0600) instead of `/tmp/k8s-join-config.yaml` (user, 0644) and removed after the join. | A re-run created a new bootstrap token (and re-uploaded the control-plane certificates) for every node that had already joined. The join file holds a bootstrap token and the certificate key, so it should not be world-readable or stay on disk. |

No other copied role file changed. `ssh_hardening`, `swapoff` and `k8s_kernel_modules` are as
they were in `8442dee`; their `meta/` and `tests/` stubs too (ansible-lint skips `roles/*/tests/`).

## Changes to the other copied files

| File | Change | Reason |
|---|---|---|
| `site.yml` | New first play for the `load_balancer` group (`ssh_hardening`, `node_prereqs`, `lb_haproxy`, `lb_dnsmasq`); "Common setup" targets `k8s_cluster` instead of `all` and also runs `node_prereqs`; new last play `kubeconfig_fetch`. | `kubeadm init` needs `cluster-endpoint.k8s.local` to resolve and HAProxy to answer, so the load balancer comes first. With the load balancer in the inventory, `all` would have installed Kubernetes on it. |
| `ansible.cfg` | `inventory = ./inventory/hosts.yml` (was `./inventory`); new `collections_path = ./.ansible/collections`. | The inventory folder now also holds `examples/`, which must not be loaded with the lab inventory. Collections are installed into the project, not the system. |
| `inventory/hosts.yml` | Moved to `inventory/examples/kvm-multi-nic/hosts.yml`, unchanged. The new `inventory/hosts.yml` is generated from `lgtm/lab/vm/nodes.yml` by `make inventory`. | The original inventory describes KVM VMs with a management network; it stays as a second supported shape. |
| `inventory/group_vars/all.yml` | Adds `k8s_minor_version: "1.35"` and `calico_version: "3.31.4"`. | The one place for versions. `primary_master` and `control_plane_endpoint` are unchanged. |
| `haproxy.cfg` | Moved to `roles/lb_haproxy/templates/haproxy.cfg.j2`. The server lines are generated from the `control_plane` and `workers` groups, the NodePorts are variables, the en dashes and arrows in three comments became ASCII, and the ingress backends use a TCP check unless `lb_haproxy_ingress_http_check` is true. Everything else is as it was. | The load balancer is now built by Ansible. The lab gateway answers no `GET /healthz` on its NodePorts, so the original HTTP check would mark every worker down. |
| `k8s-virt-net.xml`, `manageClusterState.sh`, `postClone.sh` | Moved to `inventory/examples/kvm-multi-nic/`, unchanged. | They belong to the KVM shape (libvirt network, `virsh`, cloned VMs). cloud-init replaces `postClone.sh` in the Hyper-V lab. |
| `.gitignore`, `README.md`, `playbooks/nopass_sudo.yml` | Unchanged. | cloud-init already gives the lab user password-less sudo; `nopass_sudo.yml` is kept for machines made by hand. |

## New files

- Roles: `lb_haproxy`, `lb_dnsmasq`, `node_prereqs`, `kubeconfig_fetch` (each has a README).
- Playbooks: `playbooks/inventory.yml` with `playbooks/templates/hosts.yml.j2` (generates the
  inventory), `playbooks/cluster-check.yml` (read-only health checks).
- `requirements.yml` (Ansible collections), `requirements-dev.txt` (Python lint tools),
  `.ansible-lint`, `.yamllint`.
- `inventory/examples/kvm-multi-nic/README.md` and `group_vars/all.yml` for the KVM shape.
