# C15: notes for the next content workers

Card C15, module m16 Observability as code, 2026-11-15. What this module learned, on top of the earlier content notes.

## Grafana 13.3 on the lab

- Git Sync is on by default, but the lab's Grafana refuses a Git server inside the cluster. A Repository with `http://git.learn-m16.svc:23232/m16.git` and a token answers HTTP 422 with two causes on `spec.git.url`: `http:// is not allowed when a token is configured` and `repository URL host must resolve to a public or allowed address`. Syncing from inside the lab would need `[provisioning] allowed_git_urls` with the Git host and `allow_insecure = true` (or a Git server on HTTPS) in Grafana's values. The lab release was not changed.
- Grafana's k8s-style API (`/apis/provisioning.grafana.app/v0alpha1/namespaces/default/repositories`) answers a service account token from a pod at `http://grafana.grafana.svc`.
- A dashboard query without `refId` renders an empty panel and runs no query. The Foundation SDK's Python builders leave it out unless you call `.ref_id("A")`.
- Dashboards deleted through the API or by Terraform go to **Recently deleted** for 12 months; that page offers only Restore. A module cannot remove them completely.
- Contact points made through the provisioning API (Terraform) show **Provisioned** and only **View**.

## Tools in pods

- `hashicorp/terraform:1.17.2` has `sh` and `git`; a long-running pod with `sleep` and the token from a Secret in `GRAFANA_AUTH` runs plan and apply with `kubectl exec`. Provider `grafana/grafana` 4.55.0 downloads at `terraform init`.
- `charmcli/soft-serve:v0.12.4` with `SOFT_SERVE_ANON_ACCESS=read-write` accepts an anonymous HTTP push and creates the repository on the first push. 32Mi request was enough.
- `otel/opentelemetry-collector-contrib:0.165.0` is distroless: pass the file as an environment variable (`--env="CFG=$(cat file)"`) and `validate --config=env:CFG`.
- `quay.io/prometheus/prometheus:v3.13.5` has busybox: a folder goes in as a tar stream on standard input.
- `mimirtool` 3.2.4 takes the namespace from the file name when the file has no `namespace:` key, so one Prometheus-format file serves promtool and mimirtool. `rules delete-namespace` has no `--force`.
- lokitool has no image. Downloading it inside a curl pod and checking it against the release's `SHA256SUMS` worked once; the session refused a second run, so m16 describes lokitool without running it.
- `kubectl run --rm -i` prints `couldn't attach to pod ... falling back to streaming logs` and the output twice when the program ends before kubectl attaches.

## The session and the owner

- The session refused to create a Grafana service account token through the API from the signed-in browser page, even when the value would have gone straight to the cluster. The owner created it in the screen and stored it with `read -rs TOKEN && printf %s "$TOKEN" | kubectl ... --from-file=token=/dev/stdin`. Ask the owner for that early.
- The browser pane cannot reach `127.0.0.1` from a lab page (a fetch and a form post both failed).
- The owner's WSL shell is fish: give bash commands with "type `bash` first".
- Run practice from the built page: save every `<pre>` of `dist/m/<module>/<step>/index.html` to a file and run it with bash in a scratch `HOME`. It found seven faults here, among them a backslash that a template string dropped (`{.data.provider\.yaml}` needs `\\.` in the source) and a `cd` into a folder before the `git pull` that creates it.

## Writing for the site

- Question text in a pool renders only `<b>` and `<code>`, and newlines collapse. `<br>` shows as text. Show a file in a question as one line of YAML or HCL in flow style.
- `tail -1` after `terraform plan` prints a hint line, not the summary; use `grep "^Plan:"` (double quotes inside `sh -c '...'`).
