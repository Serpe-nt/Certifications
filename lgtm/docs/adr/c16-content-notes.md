# C16: notes for the next content workers

Card C16, module m17 Running it at scale, 2026-11-15. What this module learned, on top of the earlier content notes.

## Changing the lab from a lesson

- A change of a release's values in a lesson is the runbook's loop: edit `lgtm/lab/helm/RELEASE/values.yaml`, `make lab TAGS=RELEASE`, check, `git checkout` the file, apply again, and apply once more for `changed=0`. Git inside WSL cannot read a worktree's `.git` file, so in a worktree the checkout runs from Windows git; a learner's ordinary clone has no such problem.
- Mimir's runtime overrides reached the distributor about 1.5 minutes after `make lab TAGS=mimir` finished, with no pod restart. Waiting with `until ... /runtime_config?mode=diff | grep -q TENANT` works.
- `make lab-lint LAB_RENDER_DIR=$PWD/.bin/NAME` renders every release as the playbook would, in about two minutes, and reaches no cluster. Two renders and a `diff` are the lab's "diff before upgrade". A changed value can appear in several objects. `awk -v n=LINE 'NR<=n && /^kind:|^  name:/' FILE | tail -2` names the object that holds a line of the diff.
- Mimir's querier change rolled one pod at a time: the new pod became ready about 55 seconds after it was created, then an old one ended.

## What the drills showed (2026-11-15)

- One Kafka broker deleted: back and Ready in 30 seconds. No query and no write failed.
- RustFS at zero for 3 minutes: Mimir queries older than 13 hours answered 504 until RustFS was ready again. Recent Mimir queries, and Loki queries of now and of 3 hours ago, all answered. Loki's ingesters logged `failed to flush` and retried. Tempo's block-builders logged `consumeCycle failed` and retried. No write failed.
- worker4 stopped with `Stop-VM` (a clean shutdown) and started again: the node was Unknown for about 12 minutes in all, shutdown and boot included. Pods turned Terminating 5 minutes 21 seconds after the node went Unknown. Recent Mimir reads failed for partition 1 the whole time (mimir-ingester-1 runs on worker4). Loki answered throughout. product-catalog went into CrashLoopBackOff, 7 restarts, while its database `astronomy-db-0` was on the stopped node. Nothing needed a manual repair.
- The lab documents do not yet say any of the above; the pull request of C16 lists them for the planner.

## Facts that surprised me

- `count(count_over_time({__name__=~".+"}[1m]))` fails in Mimir with `vector cannot contain metrics with the same labelset`: `count_over_time` drops the metric name. `count(last_over_time({__name__=~".+"}[1m]))` keeps it and counts series seen in the last minute.
- A request with 50 OTLP data points counts as 51 items against Mimir's ingestion burst: samples, exemplars and metadata all count.
- The Mimir gateway turns a missing `X-Scope-OrgID` into tenant `anonymous`. A query without a header answers an empty success, not 401. Tenant federation is off, so `lab|prom` is refused with `too many tenant IDs present in the request. max: 1 actual: 2`.
- Strimzi's NetworkPolicy for the brokers has a rule for port 9092 with no `from`, so every pod may connect, although the brokers are isolated for their other ports.
- Loki's distributor labels `loki_distributor_bytes_received_total` with `retention_hours`, a quick way to read a tenant's retention.
- Mimir's ingesters had discarded about 160,000 samples since they started, almost all of tenant `prom`, and nothing in the lab shows it, because no component of the stores is scraped.
- `python:3.14.7-alpine3.24` with `python -m http.server` needs a readiness probe on its port. Without one, the pod is Ready before the server listens, and the first curl gets exit 7.

## Writing

- Running a step "from the built page" means taking the text of every `<pre>` of `dist/m/MODULE/STEP/index.html` in page order. A script that does this, writing file blocks to their names and running the rest, found three faults the source review missed: a query Mimir refuses, a `grep` that matched nothing, and the readiness race above.
- On Windows, a Python script that prints a bash script writes CRLF line endings, unless it writes bytes to `sys.stdout.buffer`. With CRLF, `KUBECONFIG=~/.kube/lgtm-lab.config\r` points at no file, and kubectl falls back to `localhost:8080`. Nothing reaches the lab, but nothing works either.
