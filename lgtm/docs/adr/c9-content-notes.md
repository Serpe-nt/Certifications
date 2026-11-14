# C9: notes for the next content workers

Card C9, module m10 Grafana Alloy, 2026-11-14. What this module learned, on top of `c0-content-notes.md`, `c1-content-notes.md` and `c8-content-notes.md`.

## Writing for the site

- A multi-line `<Cmd>{`...`}</Cmd>` that sits in a paragraph loses the leading spaces of every line on the page, so a YAML file copied from it is broken. A blank line inside the template string also ends the paragraph and fails the build with "Expected a closing tag for `<Cmd>`". `check:content` catches neither. Put files in a fenced code block indented under the list item, as m07 and m10 do; keep `<Cmd>` for one-line commands. Older modules with indented multi-line `<Cmd>` blocks are listed in the pull request of this card.
- Braces in the text of an information part (`<Layer>`, `<Stage>`, `<Col>`) are read as a JavaScript expression. Wrap Alloy blocks there in backticks.
- To compare what the page shows with the file you tested, fetch the page from `astro dev`, take the text of each `<pre>` and compare it byte for byte. That is how the indentation fault above showed up.

## Alloy facts that surprised me

- `alloy convert --source-format=otelcol` stops with a critical error that `--bypass-errors` does not skip when the Collector file uses a component Alloy 1.21 does not wrap; the `resource` processor is one. The error lists the processor types Alloy knows.
- The converter writes `context = ""` for a transform statement in the Collector's short form, and Alloy then refuses it as an unknown context. It turns `debug` into `otelcol.exporter.debug`, which is experimental, so `alloy validate` and `alloy run` refuse it at the default stability level.
- Live debugging is off on the lab's Alloys (no `livedebugging` block); their pages answer "the live debugging service is disabled". Discovery components stream only when targets change, so their live page stays empty in a quiet namespace; `prometheus.scrape` and `loki.process` stream all the time.
- The `job` label is the component's full name: `prometheus.scrape.app`, `loki.source.kubernetes.app`.
- `loki.source.kubernetes` starts from the beginning of the container log after an Alloy restart, so the lines podinfo wrote before come again.
- An instant query in Mimir still returns `up` of a pod that is gone for a few minutes; a check on a count of series is fragile after restarts. Ask for a label value instead.

## The lab

- Practice tenants work as the README says: Loki, Mimir and Tempo accept any `X-Scope-OrgID`, and `curl` through `http://<name>.lab.k8s.local` with that header reads them back. Grafana's data sources read only `lab` and `prom`.
- The Alloy screen of the event collector is published at `http://alloy.lab.k8s.local`; the log collector needs a port-forward to one of its pods.
- From 12:50 UTC on 2026-11-14 no new pod could start on worker2 and worker3: Calico CNI `connection is unauthorized: Unauthorized`, about 24 hours after the cluster was built. Pods already running were fine. See the pull request.
- Docker Desktop is not always running on the PC. `kubectl run --rm -i` with the pinned image and the file on standard input runs `alloy convert` and `alloy validate` on the lab instead.
- The guard of the session refuses reading Secret data, even non-sensitive keys. Read the value from the values file or from the component's page in the Alloy UI.
