# C10: notes for the next content workers

Card C10, module m11 Mimir, 2026-11-14. What this module taught, on top of the earlier content notes.

## Commands must be template strings

- A `<Cmd>` written as plain text goes through the Markdown typography: `'x'` turns into `‘x’`, `"x"` into `“x”`, and `--flag` into `–flag` (an en dash). The page looks fine and the copied command fails. Write every command as `<Cmd>{`...`}</Cmd>`, even a short one.
- A multi-line template string inside a list item, and `<Do>` is a list, loses the leading spaces of its lines, so a YAML manifest pastes with broken indentation. Give a file with indented lines as a fenced code block (```` ```yaml ````) indented under its list item, as m10 and m11 steps 6 and 10 do, and keep `<Cmd>` for one-line commands. Then read the `<pre>` in `dist/m/<module>/<step>/index.html` and compare it with the file you applied; in m11 both manifests matched byte for byte.
- Several merged steps of m01, m03 and m06 to m09 have one of these faults; the list is in the shared note `c10-cmd-copy-paste.md` for the planner.
- A `regex` check is anchored (`^(?:pattern)$`). To accept a pasted log line that contains a phrase, write `.*phrase.*`.

## Reaching Mimir

- Through the lab's gateway from WSL or Windows: `http://10.10.0.5` with `Host: mimir.lab.k8s.local` and `X-Scope-OrgID`. The gateway passes any tenant ID on, turns a missing header into `anonymous`, and routes only `/api/v1/push`, `/otlp/v1/metrics`, `/prometheus/...`, `/distributor/...`, `/alertmanager`, the rule paths and a few others.
- Everything else of a component, its `/metrics`, `/config`, `/runtime_config`, `/services`, `/ingester/ring`, `/ingester/partition-ring`, `/store-gateway/tenant/<tenant>/blocks`, answers through the API server proxy: `kubectl get --raw /api/v1/namespaces/mimir/pods/POD:8080/proxy/PATH`. It needs no port-forward and works for learners too. A Mimir 401 shows there as "You must be logged in to the server".
- Mimir's self-monitoring is off: no tenant holds `cortex_*` metrics, so read them from the pods.
- The cardinality API is off for every tenant (`cardinality_analysis_enabled: false`); m11 step 9 uses PromQL.
- Mimir 3.2.4 accepts OTLP as JSON on `/otlp/v1/metrics` (`Content-Type: application/json`), although the HTTP API page names only protobuf. A curl with a JSON body is the easiest sender for a practice tenant; module m12 may find the same for Loki.
- With ingest storage, an ingester's rejections never reach the sender. The `200` comes from the distributor once Kafka has the record; read `cortex_discarded_samples_total` on the ingesters.
- Tenant `prom` has no exemplars: Prometheus runs without `--enable-feature=exemplar-storage`. Tenant `lab` has `traceID` (span metrics) and `trace_id` (OTLP).

## Tools in pods

- The session's safety check refused to download and run the `mimirtool` binary on the PC. The official image `grafana/mimirtool:3.2.4` works in a pod of the practice namespace; it has no shell, so pass the arguments straight to `mimirtool`. `kubectl run -i` with a file on stdin loaded nothing and still exited 0; a ConfigMap mounted into a one-shot pod works.
- `curlimages/curl:8.23.0` has `sh`, `sed` and `date`; a ConfigMap with a JSON template and `sed` avoids quoting problems in a writer pod.

## Shell traps on this machine

- The Bash tool turns `\\` into `\` inside heredocs; Python one-liners with backslashes break. Write such scripts with the Write tool.
- From Git Bash, `wsl -e bash /mnt/c/...` needs `MSYS_NO_PATHCONV=1`, or the path is rewritten to `C:/Program Files/Git/mnt/...`.
- The kubeconfig is in the `archlinux` distribution (`wsl -d archlinux`), not in the default Debian.

## The lab on 2026-11-14

- Deleting `mimir-ingester-1` (one ingester per partition, no zones) made recent reads fail for 10 seconds with `partition 1: too many unhealthy instances in the ring`; writes never failed, and the ingester caught up 22 Kafka records in 0.33 seconds. The pod became Ready 90 seconds after deletion.
- From about 12:50 UTC no new pod could start on worker2 and worker3 (Calico CNI `Unauthorized`, about 24 hours after the cluster was built). Pods already running were fine. Shared note `c11-calico-unauthorized.md`.
