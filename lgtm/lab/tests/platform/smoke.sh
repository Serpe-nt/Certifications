#!/usr/bin/env bash
# Smoke test of the platform add-ons (card L2). Run it with `make platform-check`.
#
# It checks the names of the lab contract's "Platform interfaces", then that the
# platform works: a volume binds and keeps its data across pods, the S3 test passes
# from inside the cluster with the lab-s3 Secret, a route answers through the gateway's
# NodePorts over HTTP and HTTPS, a message goes through Kafka, metrics-server answers,
# every pod is Ready and every container has requests and limits. It cleans up after
# itself and exits non-zero on the first failure.
#
# Environment (set by make): KUBECONFIG, LAB_PROFILE (full or kind),
# PLATFORM_KIND_HTTP_PORT and PLATFORM_KIND_HTTPS_PORT (kind only).
# On the real cluster the gateway is reached through HAProxy on lb, PLATFORM_LB_ADDRESS
# (default 10.10.0.5), on ports 80 and 443.
set -euo pipefail

lab="$(cd "$(dirname "$0")/../.." && pwd)"
here="$lab/tests/platform"
versions="$lab/helm/platform/versions.yml"
kubectl="$lab/.bin/kubectl"
profile="${LAB_PROFILE:-full}"
: "${KUBECONFIG:?set KUBECONFIG to the lab or kind kubeconfig}"
export KUBECONFIG
if [ "$(realpath -m "$KUBECONFIG")" = "$(realpath -m "$HOME/.kube/config")" ]; then
  echo "Refusing to use ~/.kube/config." >&2
  exit 1
fi
[ -x "$kubectl" ] || { echo "Missing $kubectl: run make platform-tools" >&2; exit 1; }

# image <key>: one entry of platform_images.
image() { awk -v k="  $1:" '/^platform_images:/ {inside = 1} inside && index($0, k) == 1 {print $2; exit}' "$versions"; }
busybox="$(image busybox)"
aws_cli="$(image aws_cli)"
kafka_image="$(image kafka)"

if [ "$profile" = kind ]; then
  storage_class=standard
  lb=127.0.0.1
  http_port="${PLATFORM_KIND_HTTP_PORT:-18080}"
  https_port="${PLATFORM_KIND_HTTPS_PORT:-18443}"
else
  storage_class=longhorn
  lb="${PLATFORM_LB_ADDRESS:-10.10.0.5}"
  http_port=80
  https_port=443
fi
ns=platform-smoke
token="smoke-$(date +%s)-$RANDOM"
work="$(mktemp -d)"
failures=0

k() { "$kubectl" "$@"; }
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*"; failures=$((failures + 1)); }
cleanup() {
  k delete namespace "$ns" --ignore-not-found --wait=false >/dev/null 2>&1 || true
  k -n tempo delete pod platform-smoke-s3 --ignore-not-found >/dev/null 2>&1 || true
  k -n tempo delete configmap platform-smoke-s3 --ignore-not-found >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

# Waits for a pod to finish and prints its log; returns non-zero unless it succeeded.
run_pod() { # namespace pod timeout-seconds
  local phase=""
  for _ in $(seq 1 "$3"); do
    phase="$(k -n "$1" get pod "$2" -o jsonpath='{.status.phase}' 2>/dev/null || true)"
    case "$phase" in Succeeded | Failed) break ;; esac
    sleep 1
  done
  k -n "$1" logs "$2" 2>/dev/null | sed 's/^/    /'
  [ "$phase" = Succeeded ]
}

echo "== Platform interfaces (profile $profile)"
if k get storageclass "$storage_class" >/dev/null 2>&1; then
  pass "StorageClass $storage_class exists"
else
  fail "StorageClass $storage_class is missing"
fi

reference=""
for n in s3 mimir loki tempo; do
  keys="$(k -n "$n" get secret lab-s3 -o go-template='{{range $k, $v := .data}}{{$k}} {{end}}' 2>/dev/null || true)"
  data="$(k -n "$n" get secret lab-s3 -o go-template='{{range $k, $v := .data}}{{$k}}={{$v}} {{end}}' 2>/dev/null || true)"
  missing=""
  for key in endpoint region access_key secret_key; do
    case " $keys" in *" $key "*) ;; *) missing="$missing $key" ;; esac
  done
  if [ -z "$keys" ]; then
    fail "Secret lab-s3 is missing in namespace $n"
  elif [ -n "$missing" ]; then
    fail "Secret lab-s3 in $n lacks:$missing"
  elif [ -n "$reference" ] && [ "$data" != "$reference" ]; then
    fail "Secret lab-s3 in $n differs from the one in s3"
  else
    pass "Secret lab-s3 in $n has endpoint, region, access_key, secret_key"
  fi
  [ -n "$reference" ] || reference="$data"
done

bootstrap_ports="$(k -n kafka get service telemetry-kafka-bootstrap -o jsonpath='{.spec.ports[*].port}' 2>/dev/null || true)"
case " $bootstrap_ports " in
  *" 9092 "*) pass "Service telemetry-kafka-bootstrap.kafka.svc has port 9092" ;;
  *) fail "Service telemetry-kafka-bootstrap.kafka.svc ports: '$bootstrap_ports'" ;;
esac

programmed="$(k -n gateway get gateway lab -o jsonpath='{.status.conditions[?(@.type=="Programmed")].status}' 2>/dev/null || true)"
[ "$programmed" = True ] && pass "Gateway lab in namespace gateway is Programmed" || fail "Gateway lab is not Programmed ('$programmed')"
from="$(k -n gateway get gateway lab -o jsonpath='{.spec.listeners[*].allowedRoutes.namespaces.from}' 2>/dev/null || true)"
[ "$from" = "All All" ] && pass "Gateway lab allows routes from all namespaces" || fail "Gateway lab allowedRoutes: '$from'"
node_ports="$(k -n gateway get service -l gateway.envoyproxy.io/owning-gateway-name=lab \
  -o jsonpath='{range .items[*].spec.ports[*]}{.port}:{.nodePort} {end}' 2>/dev/null || true)"
case " $node_ports" in
  *" 80:30080 "*"443:30443 "* | *" 443:30443 "*"80:30080 "*) pass "Gateway lab listens on NodePorts 30080 (HTTP) and 30443 (HTTPS)" ;;
  *) fail "Gateway lab NodePorts: '$node_ports'" ;;
esac

ready="$(k get clusterissuer lab-ca -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || true)"
[ "$ready" = True ] && pass "ClusterIssuer lab-ca is Ready" || fail "ClusterIssuer lab-ca is not Ready ('$ready')"

echo "== Pods and resources"
namespaces="cert-manager gateway s3 kafka"
[ "$profile" = full ] && namespaces="$namespaces longhorn-system"
for n in $namespaces; do
  not_ready="$(k -n "$n" get pods -o go-template='{{range .items}}{{if ne .status.phase "Succeeded"}}{{$name := .metadata.name}}{{range .status.containerStatuses}}{{if not .ready}}{{$name}} {{end}}{{end}}{{end}}{{end}}')"
  [ -z "$not_ready" ] && pass "every pod in $n is Ready" || fail "pods not Ready in $n: $not_ready"
done
ms_ready="$(k -n kube-system get deployment metrics-server -o jsonpath='{.status.readyReplicas}' 2>/dev/null || true)"
[ "${ms_ready:-0}" -ge 1 ] && pass "metrics-server is Ready" || fail "metrics-server is not Ready"
template='{{range .items}}{{$p := .metadata.name}}{{range .spec.initContainers}}{{$p}}/{{.name}} {{.resources.requests.cpu}} {{.resources.requests.memory}} {{.resources.limits.cpu}} {{.resources.limits.memory}}{{"\n"}}{{end}}{{range .spec.containers}}{{$p}}/{{.name}} {{.resources.requests.cpu}} {{.resources.requests.memory}} {{.resources.limits.cpu}} {{.resources.limits.memory}}{{"\n"}}{{end}}{{end}}'
for n in cert-manager gateway s3 kafka; do
  unbounded="$(k -n "$n" get pods -o go-template="$template" | grep '<no value>' || true)"
  [ -z "$unbounded" ] && pass "every container in $n has CPU and memory requests and limits" \
    || fail "containers without requests or limits in $n: $(echo "$unbounded" | cut -d' ' -f1 | tr '\n' ' ')"
done
unbounded="$(k -n kube-system get pods -l app.kubernetes.io/name=metrics-server -o go-template="$template" | grep '<no value>' || true)"
[ -z "$unbounded" ] && pass "metrics-server has CPU and memory requests and limits" || fail "metrics-server lacks requests or limits"
if [ "$profile" = full ]; then
  # Longhorn creates its instance managers and CSI pods itself; report, do not fail.
  k -n longhorn-system get pods -o go-template="$template" | grep '<no value>' | sed 's/^/    INFO longhorn container without full requests and limits: /' || true
fi

top=""
for _ in $(seq 1 24); do
  top="$(k top nodes --no-headers 2>/dev/null || true)"
  [ -n "$top" ] && break
  sleep 5
done
[ -n "$top" ] && pass "kubectl top nodes answers ($(echo "$top" | wc -l) nodes)" || fail "kubectl top nodes gives no data"

echo "== Volume"
k create namespace "$ns" >/dev/null
k apply -f - >/dev/null <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: smoke-data
  namespace: $ns
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: $storage_class
  resources:
    requests:
      storage: 64Mi
EOF
volume_pod() { # name command
  k apply -f - >/dev/null <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: $1
  namespace: $ns
spec:
  restartPolicy: Never
  containers:
    - name: main
      image: $busybox
      command: ["sh", "-c", "$2"]
      volumeMounts:
        - name: data
          mountPath: /data
      resources:
        requests: {cpu: 10m, memory: 16Mi}
        limits: {cpu: 100m, memory: 32Mi}
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: smoke-data
EOF
}
volume_pod writer "echo $token > /data/token && sync && cat /data/token"
if run_pod "$ns" writer 180; then
  k -n "$ns" delete pod writer --wait >/dev/null
  volume_pod reader "cat /data/token"
  if run_pod "$ns" reader 180 && [ "$(k -n "$ns" logs reader)" = "$token" ]; then
    pv="$(k -n "$ns" get pvc smoke-data -o jsonpath='{.spec.volumeName}')"
    pass "volume $pv on $storage_class kept its data across pods"
    if [ "$profile" = full ]; then
      replicas="$(k -n longhorn-system get volumes.longhorn.io "$pv" -o jsonpath='{.spec.numberOfReplicas} {.status.robustness}' 2>/dev/null || true)"
      [ "$replicas" = "2 healthy" ] && pass "Longhorn volume has 2 healthy replicas" || fail "Longhorn volume replicas and robustness: '$replicas'"
    fi
  else
    fail "the second pod did not read the data back"
  fi
else
  fail "the writer pod did not finish"
fi

echo "== S3 store (from namespace tempo, with its copy of lab-s3)"
k -n tempo create configmap platform-smoke-s3 --from-file=s3-test.sh="$here/s3-test.sh" >/dev/null
k apply -f - >/dev/null <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: platform-smoke-s3
  namespace: tempo
spec:
  restartPolicy: Never
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
  containers:
    - name: s3
      image: $aws_cli
      command: ["bash", "/test/s3-test.sh"]
      env:
        - {name: HOME, value: /tmp}
        - name: S3_ENDPOINT_URL
          valueFrom: {secretKeyRef: {name: lab-s3, key: endpoint_url}}
        - name: AWS_DEFAULT_REGION
          valueFrom: {secretKeyRef: {name: lab-s3, key: region}}
        - name: AWS_ACCESS_KEY_ID
          valueFrom: {secretKeyRef: {name: lab-s3, key: access_key}}
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom: {secretKeyRef: {name: lab-s3, key: secret_key}}
      volumeMounts:
        - {name: test, mountPath: /test}
      resources:
        requests: {cpu: 100m, memory: 128Mi}
        limits: {cpu: "1", memory: 256Mi}
  volumes:
    - name: test
      configMap: {name: platform-smoke-s3}
EOF
if run_pod tempo platform-smoke-s3 300; then
  pass "S3 test: six buckets, put, list, range read, multipart upload, delete"
else
  fail "S3 test failed (log above)"
fi

echo "== Gateway"
k apply -f - >/dev/null <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: echo
  namespace: $ns
  labels: {app: echo}
spec:
  containers:
    - name: httpd
      image: $busybox
      command: ["sh", "-c", "mkdir -p /www && echo $token > /www/index.html && exec httpd -f -p 8080 -h /www"]
      ports: [{containerPort: 8080}]
      resources:
        requests: {cpu: 10m, memory: 16Mi}
        limits: {cpu: 100m, memory: 32Mi}
---
apiVersion: v1
kind: Service
metadata:
  name: echo
  namespace: $ns
spec:
  selector: {app: echo}
  ports: [{port: 80, targetPort: 8080}]
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: echo
  namespace: $ns
spec:
  parentRefs:
    - {name: lab, namespace: gateway}
  hostnames: [smoke.lab.k8s.local]
  rules:
    - backendRefs: [{name: echo, port: 80}]
EOF
k -n "$ns" wait --for=condition=Ready pod/echo --timeout=120s >/dev/null
k -n cert-manager get secret lab-root-ca -o go-template='{{index .data "ca.crt" | base64decode}}' > "$work/ca.crt"
body=""
for _ in $(seq 1 30); do
  body="$(curl -s --max-time 5 -H 'Host: smoke.lab.k8s.local' "http://$lb:$http_port/" || true)"
  [ "$body" = "$token" ] && break
  sleep 2
done
[ "$body" = "$token" ] && pass "HTTP route answers through $lb:$http_port (NodePort 30080)" || fail "HTTP route through $lb:$http_port returned '$body'"
body="$(curl -s --max-time 5 --cacert "$work/ca.crt" --resolve "smoke.lab.k8s.local:$https_port:$lb" \
  "https://smoke.lab.k8s.local:$https_port/" || true)"
[ "$body" = "$token" ] && pass "HTTPS route answers through $lb:$https_port (NodePort 30443) with a certificate from lab-ca" \
  || fail "HTTPS route through $lb:$https_port returned '$body'"

echo "== Kafka"
k apply -f - >/dev/null <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: kafka-client
  namespace: $ns
spec:
  restartPolicy: Never
  containers:
    - name: client
      image: $kafka_image
      command:
        - bash
        - -ec
        - |
          b=telemetry-kafka-bootstrap.kafka.svc:9092
          bin/kafka-topics.sh --bootstrap-server \$b --create --if-not-exists --topic platform-smoke --partitions 1
          echo "$token" | bin/kafka-console-producer.sh --bootstrap-server \$b --topic platform-smoke
          bin/kafka-console-consumer.sh --bootstrap-server \$b --topic platform-smoke --from-beginning \
            --max-messages 50 --timeout-ms 60000 2>/dev/null | grep -x "$token"
          bin/kafka-topics.sh --bootstrap-server \$b --delete --topic platform-smoke
      resources:
        requests: {cpu: 100m, memory: 256Mi}
        limits: {cpu: "1", memory: 512Mi}
EOF
if run_pod "$ns" kafka-client 300; then
  pass "a message went through telemetry-kafka-bootstrap.kafka.svc:9092 without authentication"
else
  fail "Kafka produce and consume failed (log above)"
fi

echo
if [ "$failures" -eq 0 ]; then
  echo "PLATFORM CHECK PASSED (profile $profile)"
else
  echo "PLATFORM CHECK FAILED: $failures failure(s)"
  exit 1
fi
