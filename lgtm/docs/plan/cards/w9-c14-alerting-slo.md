# C14: module m15 Alerting, SLOs and on-call

Wave 9. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C14.

## Owns

`lgtm/learn/src/content/modules/m15.yaml`, `lgtm/learn/src/content/steps/m15/**`, `lgtm/learn/src/content/questions/m15.yaml`, `lgtm/docs/verification/m15.md`, and `lgtm/docs/adr/c14-content-notes.md` if you have something the next worker should know.

## Read, on top of the template

- Module m02 steps 7 and 8 (golden signals; SLO), m04 steps 12 and 13 (recording rules; RED), m06 step 10 (which alert fires for an unreachable target, and why `absent()` matters), m11 steps 10 and 11 (Mimir's ruler and `mimirtool`; Mimir's Alertmanager) and m12 step 13 (rules and alerts on logs) as merged: m15 starts where they stop.
- `lgtm/learn/src/content/questions/mock-pca.yaml`, the questions that carry `alert-design`, `alert-rules`, `alert-alertmanager`, `alert-grafana-managed` and `slo`, and `lgtm/docs/verification/mock-pca.md`: do not repeat them.
- The lab's three places where an alert can live. Read each before you decide where a step's practice runs:
  - `lgtm/lab/helm/kube-prometheus-stack/values.yaml`: one Prometheus with the chart's default rules and the lab's own alert `LabVolumeFillingUp` (`lgtm/lab/charts/lab-glue/templates/alerts.yaml`), and one Alertmanager at `alertmanager.lab.k8s.local`. This Prometheus holds the cluster's metrics only; the shop's are not in it.
  - `lgtm/lab/helm/mimir/values.yaml`: Mimir's ruler and Mimir's Alertmanager, per tenant. The shop's metrics and the span metrics are in tenant `lab`.
  - `lgtm/lab/helm/grafana/values.yaml`: Grafana's own alerting, at its defaults.
- prometheus.io: alerting rules, the Alertmanager's configuration and concepts (routing tree, grouping, inhibition, silences, notification templates), `promtool` and `amtool`. grafana.com/docs/grafana for the version the lab runs: Grafana-managed and data-source-managed rules, contact points, notification policies, and the pages that compare them. Google's SRE workbook, the chapters on SLOs and on alerting on SLOs, for burn rates and the multi-window rule: restate, never copy.

## The learner at this point

They have done m00 to m14. They can find a cause once they know something is wrong. This module is about knowing: which few alerts wake a person, and how they are built so that the team does not mute them. Alerting is 18% of the PCA exam, and "alerting and SLOs" is in most job ads.

## The module, 14 steps

Mapped to PCA domains P5 (Alerting & Dashboarding) and P1 (Observability Concepts, for the SLO steps). Use the competency names exactly.

- Step 1 is the stance: page on symptoms a user feels, not on causes. Use the lab's own default rules as the material: pick two that a team would keep and two it would mute, and say why.
- Step 2, Prometheus alerting rules: `expr`, `for`, labels, annotations, the states of an alert. The learner writes one rule on a metric the lab's Prometheus holds, as a `PrometheusRule` in `learn-m15`, watches it go pending and firing, and removes it. Check on the lab that the Prometheus Operator picks up a rule from that namespace before you build on it.
- Steps 3 and 4, the Alertmanager: the routing tree, grouping, inhibition, silences; then receivers and templates. Practice needs an Alertmanager the learner may break. The lab's is shared and its configuration belongs to a release: the lesson does not edit it, and neither do you. Design one small practice Alertmanager that runs in `learn-m15` from a ConfigMap, with a webhook receiver that is a small pod printing what it receives. The learner sends it alerts with `amtool` or `curl`, so that grouping, an inhibition and a silence can each be seen with alerts they control. Give every file in full, as fenced blocks.
- Step 5, Grafana-managed alerts: a rule, a contact point, a notification policy. The learner builds all three for one alert and removes them: the rule in a folder `Learn m15`, the contact point named with `m15` and pointing at the practice webhook, and a nested policy that matches a label of their own. The root policy of the lab is not changed.
- Step 6 is the judgement: data-source-managed or Grafana-managed, which and why, with the lab's three places as the example.
- Step 7, alerts on logs and on traces: what each can see that a metric cannot, and what it costs. Build on m12 step 13; one small action on the lab.
- Steps 8 to 11 are one piece of work: an SLI and an SLO for checkout from the span metrics of tenant `lab`; the error budget and the burn rate; the multi-window, multi-burn-rate alert; the recording rules that make it cheap. The rules run in Mimir's ruler: the learner loads one rule group into the rule namespace `learn-m15` of tenant `lab` with `mimirtool`, as m11 step 10 does for a practice tenant, and removes it in step 11. To see the alert fire, the flag `paymentFailure` is on for at most 15 minutes in step 10; work out beforehand, with the lab's real request rate, that the fast-burn windows fire within that time, and say in the step how long the learner waits. Read every number of these steps from the lab.
- Step 12, alert fatigue: what makes a team mute an alert and how to cut the noise. Use what steps 1 to 10 built.
- Step 13, runbooks and annotations: what an alert must carry so that the person paged can act. The learner adds them to the alert of step 10.
- Step 14, the on-call drill: a fault the learner does not know, found from the page. Design a way to switch one of three or four flags on without the learner seeing which (the flag screen has an API; read how it writes), so that their alert of step 10 or a default rule of the lab is the first thing they see. Run the drill yourself once with one flag. The check asks which flag it was.

Tags: the eleven that `04-tags.md` gives m15.

## The lab in this wave

- You create things in the namespace `learn-m15` (the rule, the practice Alertmanager, the webhook pod), in Grafana under names with `m15`, and one rule group in the rule namespace `learn-m15` of tenant `lab` in Mimir's ruler. All of it is removed: each in the step that made it, the namespace at the end.
- You change no release: not the lab's Alertmanager configuration, not Grafana's root notification policy, not Mimir's Alertmanager configuration of tenant `lab`. If a step cannot be shown without one of them, write it as a concept step and say so in the pull request.
- Recorded series stay in tenant `lab` until the 7 days of retention remove them. Name them by the rule `level:metric:operations` and put `learn_m15` into the level, so that nobody mistakes them for the lab's own.
- Two flag windows, under the flag rules of the wave notes in `README.md`: `paymentFailure` for step 10, and one flag for the drill of step 14. Card C13 has first call on the flags.
- A module's practice requests stay within the wave's cap. Yours are three small pods.
- Your session will refuse to change the shared cluster until the owner says so in it. In your first message ask once for all you need, then start with what needs none of it: a go-ahead to create and delete `learn-m15`, to load and remove one rule group in tenant `lab`'s ruler under the rule namespace `learn-m15`, and to switch `paymentFailure` and one drill flag on once each for at most 15 minutes; a Grafana sign-in in your session's browser pane (never type a password, never read the admin password from the cluster).

## Yours

- Namespace: `learn-m15`. Rule namespace in Mimir's ruler, tenant `lab`: `learn-m15`. Grafana folder: `Learn m15`. Fault flags: `paymentFailure`, and for the drill one of `cartFailure`, `adFailure`, `paymentUnreachable` and `productCatalogFailure`.
- Site port: 8100. Local port-forwards: 18120 to 18129.
- Token slots, if a step needs one: `metric-m15-1` to `-9`, `log-m15-1` to `-9`.

## Done when, on top of the template

- [ ] The 14 steps exist (or the pull request explains each split, merge or drop), at least eight of them with Practice.
- [ ] Every rule, every Alertmanager configuration and every template in the module was loaded on the lab or in the practice Alertmanager and did what the text says; the SLO alert was seen firing, with the times; `learn-m15`, the rule group in tenant `lab` and everything with `m15` in Grafana are gone; every flag is off.
- [ ] The pool has at least 30 questions and covers every competency of P5 and the SLO competencies of P1; at least half show a rule, a routing tree or a burn-rate calculation and ask what happens; none repeats a mock question.
- [ ] The pull request says where each kind of alert of the lab lives after this module, and anything the lab should set so that a learner's alert can reach a person.
