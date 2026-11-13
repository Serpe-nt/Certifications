# Open items

What is known to be unfinished, unverified or broken. Owned by the planner; a line leaves this file when a pull request closes it. Written on 2026-11-13 after wave 7.

## Lesson actions not yet walked on the lab

The text is written and its facts are checked, but these actions were not done as a learner would do them, because nobody could sign in to Grafana or because a session was not allowed to change the cluster. Each is marked `lab-unverified` in its module's log. One session with the owner present can walk them all.

| Module | What is unverified |
|---|---|
| m07 OpenTelemetry tracing | Every Grafana click of steps 3 to 9 and 12 (the data was read from Tempo's API instead). Step 5: the token check in the site (the token was read from Tempo, not entered with the lab seed). |
| m08 OpenTelemetry metrics, logs, configuration | The Grafana Explore clicks of steps 4, 6, 8 and 12, and the link from a log line to its trace in step 6 (the same queries ran through the APIs). |
| m09 OpenTelemetry Collector | Everything in the cluster: the practice Collector in `learn-m09` (steps 5, 6, 8, 12, 13), the fault flag `emitRawPii` in step 6 (never switched on, so "the raw value does not reach Loki or Tempo" is untested), the Grafana clicks of step 11. Every configuration was validated and run locally in the contrib 0.165.0 image. Two things to look at during the walk: in a local run the span metrics connector reported `calls` as 0 while its duration histogram counted every span (step 8), and step 13 assumes a rolling update of one replica keeps the old pod while the new one fails. |
| m05 Grafana core | Nothing unverified, but the planner could not check that the folder `Learn m05`, the team and the service account are gone. |

## Lab defects

| What | Since | Notes |
|---|---|---|
| The object store (RustFS) is OOM-killed about every four hours | 2026-11-11 | Raising its limit from 1Gi to 1536Mi (pull request 55) only delayed it: killed again on 2026-11-13 at 01:10 UTC with nothing unusual running. Its memory climbs on its own (714 MiB two hours after a restart). It restarts by itself and loses nothing, but S3 is away for a minute each time. Needs a real answer: a RustFS setting or version, a scheduled restart, or another store. |
| The collector gateway cannot scrape the shop's Kafka | found 2026-11-13 | Both gateway pods log `Error scraping metrics` from `kafka_metrics` about four times a minute: the shop's Kafka announces `kafka:9092`, which does not resolve from the namespace `otel`. Only the log shows it. |
| The workshop service does not stop with Ctrl+C on Windows under zero-code instrumentation | found 2026-11-13 | `opentelemetry-instrument` replaces the process, so `python run.py` returns at once and the service keeps running. Module m07 step 7 gives a `Stop-Process` command. |
| `lgtm/lab/workshop/.venv` is not git-ignored | found 2026-11-13 | |
| The workers are close to their memory limit | 2026-11-12 | worker1 at 85 to 87% in use, worker2 at 90% of memory requested. Wave 7 put nothing in the cluster for that reason. Card L6 answers it: one master instead of three, workers at 8 GB instead of 6 (the owner's decision of 2026-11-13). |

Card L6 (`cards/w8-l6-lab-v3.md`) takes all five rows. Its part 1 is merged (pull request 67): the broker advertises a name with its namespace, RustFS is pinned to 1.0.5 (upstream issue 9145 describes the retention; the limit stays at 1536Mi so the rebuild shows whether 1.0.5 holds; the fallback is a scheduled restart), and `run.py` stops the service on Ctrl+C on Windows. They count as fixed when the rebuilt lab shows it (part 2).

## What the walk needs from the owner

Asked of each worker on 2026-11-13. The walk runs on the rebuilt lab, after card L6.

- Done on 2026-11-13, each in its own worker's session after the owner signed in there: m01 steps 18 and 19 (pull request 65) and steps 16 and 17 (68), m04 step 13 (66), m06 steps 6, 8 and 12 (64).
- A Grafana sign-in in the browser pane of the session that walks: m07 steps 3 to 9 and 12, m08 steps 4, 6, 8 and 12, m09 steps 6 and 11 (card W2), and the checks of m05 (card W1).
- A go-ahead, said in that session, to create and delete `learn-m09` and to switch the flag `emitRawPii` on for a few minutes.
- The lab seed in the site's settings, for the token check of m07 step 5 (the rebuild makes a new seed).
- Left alone on purpose: `make reset` (m01 step 20), pushing a delta metric into Mimir (m08), changing a lab release to settle four inferences of m06, editing WSL's `/etc/hosts` for a Ctrl+C test (m07).

Two cards follow the rebuild: W1 (`cards/w8-w1-new-shape-and-checks.md`) corrects m00 to m06 for the new shape and runs every lab check of those modules again; W2 (`cards/w8-w2-otel-walk.md`) walks m07 to m09.

The new lab shape also changes lesson text and check answers: m00 (five steps, with the checks "8 VMs" and "3 etcd pods"), m04 (step 11's check and a few lines), m05 (step 2's check), m06 (a few lines and one question).

## Decisions not taken yet

- Native histograms: the lab's Prometheus scrapes classic histograms only; one setting turns native ones on (`prometheus.prometheusSpec.scrapeNativeHistograms`). Module m04 step 8 is a concept step until then.
- Loki's query limits are the defaults; one heavy log query can push the object store over its memory limit. Module m12 is the place to set and teach them.
- The display font of the site states "All rights reserved" in its file and the repository is public; the owner decided to use it.

## How the work is run

- A worker session cannot be started on a turn that an automatic event began (a usage limit reset, another session's message). Wave 7 therefore ran as background agents inside the planner's session. They share one browser pane, so only one of them can use it at a time.
- A worker is refused changes to the shared cluster unless the owner says so in that worker's own session. A card that changes the cluster should have the worker prepare files and a command list first.
- Grafana sign-in is per session and needs the owner.
