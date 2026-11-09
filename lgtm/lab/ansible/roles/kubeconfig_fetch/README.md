# kubeconfig_fetch

Reads `/etc/kubernetes/admin.conf` from the first control-plane node and writes it to
`~/.kube/lgtm-lab.config` on the control machine (mode 0600), with the cluster, user and
context renamed to `lgtm-lab` and the server set to `kubeconfig_fetch_server`
(`https://cluster-endpoint.k8s.local:6443` by default).

It refuses to write `~/.kube/config`. Use the file with
`export KUBECONFIG=~/.kube/lgtm-lab.config` or `kubectl --kubeconfig ~/.kube/lgtm-lab.config`.
The file holds the cluster admin credentials: it is never committed.
