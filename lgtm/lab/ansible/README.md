# k8s-provision

Ansible playbooks to provision a Kubernetes cluster from bare VMs.

## What it does

- Bootstraps control plane and worker nodes with kubeadm
- Configures the Kubernetes network interface
- Installs and configures CNI networking on a specified interface

## Requirements

- Ansible 2.14+
- Debian/Ubuntu VMs
- SSH access to all nodes

