# C15: module m16 Observability as code

Wave 10. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C15.

## Owns

`lgtm/learn/src/content/modules/m16.yaml`, `lgtm/learn/src/content/steps/m16/**`, `lgtm/learn/src/content/questions/m16.yaml`, `lgtm/docs/verification/m16.md`, and `lgtm/docs/adr/c15-content-notes.md` if you have something the next worker should know.

## Read, on top of the template

- Module m01 (Helm), m05 steps 9 and 11 (the dashboard's JSON; service accounts and tokens), m10 step 8 (`alloy convert` and `alloy validate`), m11 step 10 and m12 step 13 (`mimirtool`, rules for a practice tenant) and m15 steps 2, 10 and 11 (`promtool`, the SLO rule group) as merged. Until now the learner made each of these things by hand, once. This module puts them into Git.
- How this repository already does it, as the module's running example: `lgtm/lab/helm/*/values.yaml` with their `VERSION` files, `lgtm/lab/charts/lab-glue/` (dashboards as files in a chart, an alert as a `PrometheusRule`), `lgtm/lab/helm/grafana/values.yaml` (provisioned data sources, the dashboard sidecar), `lgtm/lab/docs/runbook.md` ("Upgrade or change one release"), and the workflows `.github/workflows/lgtm-lab-helm.yml`, `lgtm-lab-cluster.yml` and `lgtm-learn.yml`.
- `lgtm/docs/research/01-stack-versions.md`, the part on Grafana 13 (Git Sync is generally available since 13.0, and what it covers), and `02-certs-and-demand.md` for where infrastructure as code stands in job ads.
- grafana.com/docs/grafana for the version the lab runs: provisioning (data sources, dashboards, alerting), the as-code pages and what they recommend today, Git Sync (what it needs, what it syncs, how it handles a provisioned folder), the HTTP API and service accounts. The Terraform Registry's documentation of the Grafana provider for the version you pin. prometheus.io for `promtool`, grafana.com for `mimirtool` and `lokitool`, opentelemetry.io for `otelcol validate`, helm.sh for `helm template`, `helm diff` being a plugin with its own repository.

## The learner at this point

They have done m00 to m15 and can build every piece of the stack by hand. Terraform and infrastructure as code are in more than a third of the observability job ads; "we review dashboards and alerts like code" is what a team means by it. The learner knows Git and has probably used Terraform for cloud resources, not for Grafana.

## The module, 11 steps

It serves jobs; no exam maps to it (`cert: none`).

- Step 1 is the reason: review, repeat, roll back. Use one true story from this lab, where a hand-made thing was lost or could not be repeated.
- Step 2, Grafana's provisioning files: read how the lab provisions its data sources and dashboards, and what a provisioned object refuses in the UI. Read-only.
- Step 3, Git Sync for dashboards. Find out on the lab first whether the lab's Grafana offers Git Sync without a change to its release. If it does, the learner syncs one folder `Learn m16` with a repository and sees a change travel both ways. If it needs a setting the release does not have, the step shows what the lab answers, walks through the feature from the documentation, and the pull request names the setting for the lab; do not change the release.
- Step 4, the Terraform provider for Grafana: one folder, one dashboard and one contact point or alert rule, planned, applied, changed and destroyed. Say how the learner runs Terraform (the card suggests the official image in a pod, see below).
- Step 5, dashboards as code: the options Grafana documents today and what each is for. A concept step with one small example that is run.
- Step 6, rules as code: a rule file in the repository, checked with `promtool`, `mimirtool` and `lokitool`, and loaded into a practice tenant from there.
- Step 7, Collector and Alloy configuration in Git, with validation before it reaches a cluster.
- Step 8, Helm values as the source of truth, and a diff before every upgrade: on a small practice release in `learn-m16`, never on a lab release.
- Step 9, checks in CI: read this repository's own workflows and say what each check would have caught. One of the faults this course really had makes a good case (a manifest that lost its indentation on the page, which no check caught until `check:pages` existed).
- Step 10, secrets and credentials: what must never be in Git and where it goes instead, with the lab's own Secrets as the example. Name them; never show a value.
- Step 11, promote one change from a branch to the lab: the learner changes a dashboard or a rule on a branch, reads the diff, merges, and sees it arrive, using what steps 3 to 6 built. One loop, start to end.

Tags: the eleven that `04-tags.md` gives m16.

## The lab in this wave

- **A Git remote without an account.** No account, token or key of the owner's is used or created outside the lab, and nothing is pushed to GitHub by a lesson. Where a step needs a remote, run a small Git server as a pod in `learn-m16` and give its manifest in full. Say in the step how a learner would point the same thing at their own GitHub repository instead.
- **A Grafana token, handled as a secret.** Terraform and Git Sync act on Grafana through a service account. With the owner's go-ahead, create one service account named with `m16` and one token; put the token straight into a Kubernetes Secret in `learn-m16` without printing it, use it from there, and delete the service account and the Secret at the end. Never write the token into a file of the repository, a log, a pull request or the chat. If your session refuses a part of this, do the rest, write that step from the documentation, mark its rows `lab-unverified`, and say so.
- **Tools as images, not downloads.** Earlier workers were refused when they tried to download and run a binary on the PC. Run `terraform`, `promtool`, `mimirtool`, `lokitool`, the Collector and Alloy from their official images in pods of `learn-m16`, pinned by tag, as modules m10 and m11 do; a learner needs nothing on the PC that way.
- You create things only in the namespace `learn-m16`, in the practice tenant `learn-m16`, and in Grafana under the folder `Learn m16` and names with `m16`. All of it is removed: each in the step that made it, the namespace at the end. No lab release is changed.
- Card C16 runs failure drills on the lab in this wave (a node, a Kafka broker, the object store, each for a few minutes). It tells you before each one. During a drill a request of yours may fail: wait for its word that the lab is back, then run the action again; do not log a drill as a finding.
- Your session will refuse to change the shared cluster until the owner says so in it. In your first message ask once for all you need, then start with what needs none of it: a go-ahead to create and delete `learn-m16`, to write to the practice tenant, and to create one Grafana service account with a token as described; a Grafana sign-in in your session's browser pane (never type a password, never read the admin password from the cluster).

## Yours

- Namespace and tenant: `learn-m16`. Grafana folder: `Learn m16`. Site port: 8097. Local port-forwards: 18100 to 18109.
- Token slots, if a step needs one: `metric-m16-1` to `-9`, `log-m16-1` to `-9`.

## Done when, on top of the template

- [ ] The 11 steps exist (or the pull request explains each split, merge or drop), at least seven of them with Practice.
- [ ] Every file of the module (Terraform, rule files, manifests, values) was applied on the lab from the built page and did what the text says; `learn-m16`, the service account, its token and everything with `m16` in Grafana are gone.
- [ ] The pool has at least 30 questions, at least half of them showing a file, a plan or a diff and asking what will happen when it is applied.
- [ ] The pull request says whether Git Sync works on the lab as it is and, if not, which setting the lab would need.
