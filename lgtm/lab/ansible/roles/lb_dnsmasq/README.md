# lb_dnsmasq

Runs dnsmasq on the load balancer as the lab DNS server:

- `cluster-endpoint.k8s.local` and every name under `lab.k8s.local` answer with the load
  balancer address;
- `<host>.k8s.local` answers with the host's `k8s_net_ip`, for every inventory host;
- all other names are forwarded to `lab_upstream_dns`.

dnsmasq listens on the load balancer address only (`bind-interfaces`), so it does not collide
with systemd-resolved. The nodes send `k8s.local` queries here through the `network` role.
