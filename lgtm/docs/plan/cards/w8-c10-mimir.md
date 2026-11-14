# C10: module m11 Mimir

Wave 8. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C10.

## Owns

`lgtm/learn/src/content/modules/m11.yaml`, `lgtm/learn/src/content/steps/m11/**`, `lgtm/learn/src/content/questions/m11.yaml`, `lgtm/docs/verification/m11.md`, and `lgtm/docs/adr/c10-content-notes.md` if you have something the next worker should know.

## Read, on top of the template

- Module m03 steps 12 and 13 (the limits of one Prometheus, remote write), m04 steps 7, 8 and 12 (histograms, recording rules) and m02 step 10 (cardinality) as merged: m11 starts where they stop.
- `lgtm/lab/helm/mimir/values.yaml` and `lgtm/lab/docs/lgtm.md` (the release `mimir`): Mimir 3 in microservices mode with the ingest storage architecture. Distributors write to the Kafka topic `mimir-ingest`, three ingesters read their partitions, blocks go to the bucket `mimir-blocks`; multi-tenancy, native histograms, exemplars and OTLP are on; metrics are kept 7 days; tenants `lab` and `prom`, with limits per tenant.
- `lgtm/docs/adr/l5-kafka-disk.md`: the day the lab's Kafka filled its disks and Mimir stored nothing for 18 hours. It is a true story of the write path of step 2, with numbers: use it.
- `lgtm/docs/research/01-stack-versions.md`, the part on Mimir 3. Check each point against grafana.com/docs/mimir for the version the lab runs.
- grafana.com/docs/mimir for that version: the architecture pages (ingest storage and classic), each component, the configuration reference for every setting you name, limits and runtime overrides, the ruler and `mimirtool`, the Alertmanager, exemplars, native histograms, zone-aware replication, the cardinality API.

## The learner at this point

They have done m00 to m10. They know Prometheus, PromQL and remote write, and they have used the data source `mimir` since module m02 without looking inside it. Mimir is rarely named in job ads, but it is where the lab's metrics live, and its ideas (tenants, limits, a write path and a read path, blocks in object storage) are those of every large metrics backend.

## The module, 14 steps

It serves jobs; no exam maps to it (`cert: none`).

- Step 1 is the problem: one Prometheus cannot hold many clusters, many teams or a year of data. Each later step answers one part of it.
- Steps 2 to 4 are the architecture as the lab runs it: the write path through Kafka, the read path (query-frontend, scheduler, querier, store-gateway, ingesters for recent data), then blocks, the compactor and the object store. One `<Flow>` per path. Every component named is a pod the learner can see in step 5.
- Step 5 is the tour: the pods of the namespace `mimir`, which component each one is, and one metric of its own from each.
- Step 6, sending data: remote write and OTLP, with the two real senders of the lab (Prometheus as tenant `prom`, the collector gateway as tenant `lab`).
- Step 7, tenants: the header `X-Scope-OrgID`, what happens without it, and a query that proves two tenants see different data.
- Step 8, limits: hit one on purpose. Choose a limit the learner can reach without changing the lab, by sending a few samples of their own as a practice tenant (a series with too many labels, a label value that is too long, a sample that is too old): read the real limits from the lab's values and the reference, send, and read the rejection in the response and in Mimir's own metrics. Do not change the lab's limits.
- Step 9, cardinality: find the expensive metrics of tenant `lab` with the cardinality API and with PromQL. The fault flag in the curriculum's outline was never ported to the lab; do not use it.
- Step 10, rules: the ruler and `mimirtool`. The learner loads one recording rule group for the practice tenant with `mimirtool` and removes it again. Step 11, Mimir's Alertmanager, is a concept step with the lab's configuration read; module m15 does alerting.
- Step 12, exemplars and native histograms: what the lab has switched on, and one exemplar followed from a metric to its trace. The lab's Prometheus scrapes classic histograms only; say what Mimir would store if it sent native ones.
- Step 13, replication: lose an ingester. The learner deletes one ingester pod and watches writes and reads go on. This restarts a pod of the lab: it needs the owner's go-ahead in your session; with it, run it once and write the times into the pull request; without it, write the step from the documentation and mark it `lab-unverified`.
- Step 14, the classic architecture: how to read older documentation and blog posts safely. A `<Compare>` of the two write paths.

Tags: the fourteen that `04-tags.md` gives m11.

## The lab in this wave

- A module's practice workloads may request up to 4 GiB in all, at most 1.5 GiB on one worker (`lgtm/lab/docs/budget.md`). Yours are small: a generator pod or a script that sends a few series.
- Practice data goes to a tenant of its own, `learn-m11`, never to `lab` or `prom`. Check in the lab's values that the gateway accepts it, and say in the step what creating a tenant amounts to in Mimir.
- You create things only in `learn-m11` and delete the namespace at the end; the rule group of step 10 is removed in its own step. The release `mimir` is read, never changed.
- Your session will refuse to change the shared cluster until the owner says so in it. In your first message ask once for all you need, then start with what needs none of it: a go-ahead to create and delete `learn-m11`, to write to the practice tenant, and to delete one ingester pod once (step 13); a Grafana sign-in in your session's browser pane (never type a password, never read the admin password from the cluster); the lab seed in the site's settings, or their word that you may read it, if a step uses a token.

## Yours

- Namespace and tenant: `learn-m11`. Site port: 8098. Local port-forwards: 18110 to 18119.
- Token slots, if a step needs one: `metric-m11-1` to `-9`.

## Done when, on top of the template

- [ ] The 14 steps exist (or the pull request explains each split, merge or drop), at least six of them with Practice.
- [ ] Every lab action was run on the live lab; `learn-m11` is gone, the practice rule group is gone, and the pull request gives the time the ingester pod was deleted and when it was back.
- [ ] The pool has at least 30 questions, about half of them a symptom to explain (a 429 from the distributor, a query that misses recent data, a tenant that sees nothing).
