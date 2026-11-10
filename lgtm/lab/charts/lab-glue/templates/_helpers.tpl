{{/* Labels on every object of the chart. */}}
{{- define "lab-glue.labels" -}}
app.kubernetes.io/name: lab-glue
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/part-of: lgtm-lab
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}
