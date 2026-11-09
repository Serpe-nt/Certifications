# lb_haproxy

Installs HAProxy on the load balancer and renders the owner's `haproxy.cfg` (from
`k8s-provision`) as a template:

- 6443: TCP passthrough to the API servers of the `control_plane` group, checked with `GET /healthz`.
- 80 and 443: TCP passthrough to NodePorts 30080 and 30443 on the `workers` group.
- 8404: statistics page at `/stats`.

Every backend host needs `k8s_net_ip`. See `defaults/main.yml` for the variables; the ingress
health check is a TCP check unless `lb_haproxy_ingress_http_check` is true.
