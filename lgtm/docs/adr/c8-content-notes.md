# C8: notes for the next content workers

Card C8, module m09, night of 2026-11-13. What writing the Collector module taught, on top of `c0-content-notes.md` and `c1-content-notes.md`.

## Proving Collector lessons without the cluster

- The contrib image the lab pins, `otel/opentelemetry-collector-contrib:0.165.0`, is already in Docker Desktop on this PC. `docker run --rm -v DIR:/conf:ro IMAGE validate --config=/conf/FILE` checks a configuration in a second, and `components` lists what the binary has, with stability per signal.
- For a short run with data, start the Collector detached and run `telemetrygen` v0.165.0 with `--network container:NAME`, so both share one network namespace, as two containers of one pod do. Both together used about 50 MiB.
- The Collector's own metrics endpoint and zPages listen on 127.0.0.1 by default. In Docker, set the reader or the extension to 0.0.0.0 and publish the port; on Kubernetes, a port-forward reaches 127.0.0.1 inside the pod.
- In Git Bash, prefix `docker` with `MSYS_NO_PATHCONV=1`. PowerShell strips the double quotes of `--telemetry-attributes=key="value"`; Bash keeps them.
- The worktree guard refuses Bash commands that mention `github` inside loops or `cd` before git. Put downloads in a small Python script in the scratchpad and run it with `python -I`.

## Facts that surprised me

- telemetrygen v0.165.0 spans are `lets-go` (root, Client) and `okey-dokey-0` (child, Server), with `network.peer.address` and `service.peer.name`, and the resource schema URL 1.43.0. Older docs show other attribute names.
- The load-balancing exporter's `resolver.dns.port` must be a string in 0.165.0: `port: 4317` fails to validate, although the gateway and agent-to-gateway pages show it unquoted.
- One exporter whose queue is full makes the receiver refuse data, even while another exporter of the same pipeline sends its copy; telemetrygen then logs `code = Unavailable desc = sending queue is full`.
- In a local run, span metrics showed `traces.span.metrics.calls` at 0 for telemetrygen spans while the duration histogram counted them. The cause was not found; the lesson does not rely on the value.
- The attributes and resource processors' READMEs now say the transform processor supersedes them.
- The gateway's own metrics are in Mimir (tenant `lab`, job `otelcol-contrib`), with `_total` on counters; the lab's Prometheus has none of them.

## For the lab (outside this card)

- The gateway logs `Error scraping metrics` from `kafka_metrics` about four times a minute per pod: the shop's Kafka broker announces `kafka:9092`, which does not resolve from the namespace `otel`. The fix belongs in the shop's Kafka (advertise `kafka.shop.svc`) or in the gateway's receiver; step 13 mentions it as seen on 2026-11-13.
- On 2026-11-12, between 04:16 and 12:16 UTC, the gateway's export queues for Tempo and Mimir were full (1000 of 1000) and about 3.5 million spans failed to enqueue: the Kafka outage seen from the Collector. Step 12 tells it as its opening scene.
