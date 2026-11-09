{{/* Image for one demo component: <registry>/<repository>:<tag>-<component>. */}}
{{- define "shop.image" -}}
{{- $root := index . 0 -}}
{{- $component := index . 1 -}}
{{- $tag := default $root.Chart.AppVersion $root.Values.image.tag -}}
{{- printf "%s/%s:%s-%s" $root.Values.image.registry $root.Values.image.repository $tag $component -}}
{{- end -}}

{{/* Labels shared by every object. */}}
{{- define "shop.labels" -}}
{{- $root := index . 0 -}}
{{- $component := index . 1 -}}
app.kubernetes.io/name: {{ $component }}
app.kubernetes.io/component: {{ $component }}
app.kubernetes.io/instance: {{ $root.Release.Name }}
app.kubernetes.io/part-of: shop
app.kubernetes.io/version: {{ $root.Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ $root.Release.Service }}
helm.sh/chart: {{ printf "%s-%s" $root.Chart.Name $root.Chart.Version }}
{{- end -}}

{{- define "shop.selectorLabels" -}}
{{- $root := index . 0 -}}
{{- $component := index . 1 -}}
app.kubernetes.io/name: {{ $component }}
app.kubernetes.io/instance: {{ $root.Release.Name }}
{{- end -}}

{{/*
OpenTelemetry environment every container gets: service name, OTLP endpoint
(gRPC or HTTP), flagd address, and resource attributes that include the
Kubernetes ones from the downward API.
Arguments: root, service name, "grpc" or "http", criticality, workload kind,
workload name.
*/}}
{{- define "shop.otelEnv" -}}
{{- $root := index . 0 -}}
{{- $service := index . 1 -}}
{{- $proto := index . 2 -}}
{{- $criticality := index . 3 -}}
{{- $kind := index . 4 -}}
{{- $workload := index . 5 -}}
{{- $grpc := urlParse $root.Values.otlp.endpoint -}}
{{- $http := urlParse $root.Values.otlp.httpEndpoint -}}
- name: K8S_NAMESPACE
  valueFrom: { fieldRef: { fieldPath: metadata.namespace } }
- name: K8S_POD_NAME
  valueFrom: { fieldRef: { fieldPath: metadata.name } }
- name: K8S_POD_UID
  valueFrom: { fieldRef: { fieldPath: metadata.uid } }
- name: K8S_NODE_NAME
  valueFrom: { fieldRef: { fieldPath: spec.nodeName } }
- name: OTEL_SERVICE_NAME
  value: {{ $service | quote }}
- name: OTEL_EXPORTER_OTLP_ENDPOINT
  value: {{ ternary $root.Values.otlp.httpEndpoint $root.Values.otlp.endpoint (eq $proto "http") | quote }}
- name: OTEL_COLLECTOR_HOST
  value: {{ (split ":" $grpc.host)._0 | quote }}
- name: OTEL_COLLECTOR_PORT_GRPC
  value: {{ (split ":" $grpc.host)._1 | default "4317" | quote }}
- name: OTEL_COLLECTOR_PORT_HTTP
  value: {{ (split ":" $http.host)._1 | default "4318" | quote }}
- name: OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE
  value: cumulative
- name: OTEL_EXPORTER_OTLP_METRICS_DEFAULT_HISTOGRAM_AGGREGATION
  value: explicit_bucket_histogram
- name: OTEL_SERVICE_NAMESPACE
  value: {{ index $root.Values.resourceAttributes "service.namespace" | default "opentelemetry-demo" | quote }}
- name: FLAGD_HOST
  value: flagd
- name: FLAGD_PORT
  value: "8013"
- name: FLAGD_OFREP_PORT
  value: "8016"
- name: OTEL_RESOURCE_ATTRIBUTES
  value: {{ include "shop.resourceAttributes" (list $root $criticality $kind $workload $service) | quote }}
{{- end -}}

{{- define "shop.resourceAttributes" -}}
{{- $root := index . 0 -}}
{{- $attrs := list -}}
{{- range $k, $v := $root.Values.resourceAttributes -}}
{{- $attrs = append $attrs (printf "%s=%s" $k $v) -}}
{{- end -}}
{{- $attrs = append $attrs (printf "service.version=%s" (default $root.Chart.AppVersion $root.Values.image.tag)) -}}
{{- $attrs = append $attrs (printf "service.criticality=%s" (index . 1)) -}}
{{- $attrs = append $attrs "k8s.namespace.name=$(K8S_NAMESPACE)" -}}
{{- $attrs = append $attrs "k8s.pod.name=$(K8S_POD_NAME)" -}}
{{- $attrs = append $attrs "k8s.pod.uid=$(K8S_POD_UID)" -}}
{{- $attrs = append $attrs "k8s.node.name=$(K8S_NODE_NAME)" -}}
{{- $attrs = append $attrs (printf "k8s.%s.name=%s" (index . 2) (index . 3)) -}}
{{- $attrs = append $attrs (printf "k8s.container.name=%s" (index . 4)) -}}
{{- join "," $attrs -}}
{{- end -}}

{{- define "shop.storageClass" -}}
{{- if .Values.storageClass }}
storageClassName: {{ .Values.storageClass | quote }}
{{- end }}
{{- end -}}

{{- define "shop.publicOtlpTracesEndpoint" -}}
{{- if .Values.publicOtlpTracesEndpoint -}}
{{- .Values.publicOtlpTracesEndpoint -}}
{{- else -}}
{{- printf "http://%s.%s/otlp-http/v1/traces" .Values.gateway.hosts.shop .Values.gateway.domain -}}
{{- end -}}
{{- end -}}
