# L2: Envoy Gateway (upstream chart) as the lab's Gateway API controller

Status: accepted by worker L2 on 2026-11-09.

## Context

Every screen of the lab is reached through one Gateway API Gateway: `lab` in namespace
`gateway`, listening on NodePorts 30080 (HTTP) and 30443 (HTTPS), because HAProxy on `lb`
forwards ports 80 and 443 there with a plain TCP health check. Routes come from every
namespace. The cluster is kubeadm 1.35 with Calico 3.31.4 installed by the Tigera operator.
The card asks to check what Calico 3.31 itself offers before adding another controller, and to
check the current status of ingress-nginx.

## Facts checked on 2026-11-09

- **ingress-nginx is retired.** Kubernetes SIG Network and the Security Response Committee
  announced in November 2025 that best-effort maintenance would end in March 2026; after that
  there are no releases, bug fixes or security updates. Sources:
  https://www.kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/ and
  https://www.kubernetes.io/blog/2026/01/29/ingress-nginx-statement/. The lab does not use it,
  and lessons treat Ingress as history, with Gateway API as the current interface.
- **Calico 3.31 has Calico Ingress Gateway**, "a hardened distribution of the open-source Envoy
  Gateway project", managed by the Tigera operator: create a `GatewayAPI` resource named
  `default`, then Gateways of class `tigera-gateway-class`. It needs Calico installed by the
  Tigera operator (true here) and "a cluster provisioned to support services of type
  `LoadBalancer`". Sources:
  https://docs.tigera.io/calico/3.31/networking/ingress-gateway/about-calico-ingress-gateway.md,
  https://docs.tigera.io/calico/3.31/networking/ingress-gateway/create-ingress-gateway.md.
- The `GatewayAPI` resource customises the Service in front of each gateway only through
  `loadBalancerClass`, `allocateLoadBalancerNodePorts`, `loadBalancerSourceRanges`,
  `loadBalancerIP` and annotations; there is no field for the Service type or fixed node ports.
  Its default Envoy Gateway configuration in 3.31 is built from the `gateway-helm` v1.5.0 chart,
  and its customisation page refers to Envoy Gateway 1.8.2 settings. Sources:
  https://docs.tigera.io/calico/3.31/reference/installation/api.md (GatewayServiceSpec),
  https://docs.tigera.io/calico/3.31/networking/ingress-gateway/customize-ingress-gateway.md.
- Calico 3.31.4's `operator-crds.yaml` contains no Gateway API CRDs, so nothing in the cluster
  would compete with the CRDs of another controller.
  Source: https://raw.githubusercontent.com/projectcalico/calico/v3.31.4/manifests/operator-crds.yaml
- **Envoy Gateway upstream**: v1.10.0 (2026-11-06) supports Kubernetes 1.34 to 1.37, Gateway API
  v1.6.1, Envoy Proxy 1.40, end of life 2027-05-05. Its chart is `oci://docker.io/envoyproxy/gateway-helm`
  and installs the Gateway API CRDs (experimental channel) with the controller by default.
  An `EnvoyProxy` resource sets the proxy Service's type, traffic policy and, through a
  strategic-merge patch, its node ports. Sources:
  https://raw.githubusercontent.com/envoyproxy/gateway/main/site/content/en/news/releases/matrix.md,
  https://raw.githubusercontent.com/envoyproxy/gateway/v1.10.0/site/content/en/latest/install/install-helm.md,
  https://github.com/envoyproxy/gateway/releases/tag/v1.10.0.
- Other maintained controllers exist (Traefik chart 42.3.1, kgateway 2.5.1, both released in
  November 2026, GitHub releases pages); neither is part of the CNI already in the cluster.

## Options

1. **Calico Ingress Gateway.** No new vendor. But the gateway Service is type LoadBalancer
   and its node ports cannot be fixed through the supported fields, so HAProxy's fixed
   30080/30443 would need MetalLB or an unvalidated custom Envoy Gateway configuration. Its
   pods run in `tigera-gateway`, not `gateway`. It cannot be tested on kind without replacing
   kind's network plugin with Calico. Its Envoy Gateway is several minors behind upstream.
2. **Envoy Gateway from its own chart.** The same engine as option 1, current (1.10.0),
   installed as one Helm release into `gateway`, with fixed NodePorts through `EnvoyProxy`,
   and testable on kind as it is.
3. Traefik or kgateway: maintained, but a third engine that the lab's lessons would have to
   explain on top of Envoy.

## Decision

**Envoy Gateway v1.10.0**, chart `gateway-helm` v1.10.0, release `envoy-gateway` in namespace
`gateway`. The `platform_gateway` role adds:

- `EnvoyProxy` `lab-proxy`: Service type NodePort with node ports 30080 and 30443,
  `externalTrafficPolicy: Cluster` (every node answers, so HAProxy's TCP check passes on all
  workers), two proxy replicas on the real cluster and one on kind, image
  `envoyproxy/envoy:distroless-v1.40.2` (the default of Envoy Gateway 1.10.0).
- `GatewayClass` `lab-envoy`, pointing at `lab-proxy`.
- `Gateway` `lab`: listener `http` on 80 for any host name and listener `https` on 443 for
  `*.lab.k8s.local` with the certificate `lab-gateway-tls` from the lab CA; both allow routes
  from all namespaces.

Because Calico Ingress Gateway is Envoy Gateway underneath, the lessons about Gateway API,
`EnvoyProxy` and Envoy's own metrics apply to both. A later lesson may show Calico's way as
the alternative.

## Consequences

- Routes reference `parentRefs: [{name: lab, namespace: gateway}]`; add `sectionName: http`
  or `https` to bind to one listener only.
- The Gateway API and Envoy Gateway CRDs sit in the chart's `crds/` folder (experimental
  channel, Gateway API v1.6.1). Helm installs them on the first install and never upgrades
  them. Before raising the chart version, apply the new CRDs first, as Envoy Gateway's install
  guide shows (`helm template ... oci://docker.io/envoyproxy/gateway-crds-helm | kubectl apply
  --server-side -f -`).
- On kind, kind's control-plane node publishes 30080 and 30443 on 127.0.0.1:18080 and 18443.
