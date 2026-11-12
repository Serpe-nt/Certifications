# C4: module m05 Grafana core

Wave 6. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C4.

## Owns

`lgtm/learn/src/content/modules/m05.yaml`, `lgtm/learn/src/content/steps/m05/**`, `lgtm/learn/src/content/questions/m05.yaml`, `lgtm/docs/verification/m05.md`.

## Read, on top of the template

- `lgtm/lab/docs/lgtm.md` (the release `grafana`), `lgtm/lab/helm/grafana/values.yaml`, and `lgtm/lab/docs/reference.md`: the lab's Grafana is 13.3, with provisioned data sources (`mimir`, `loki`, `tempo`, `prometheus` and the others the reference lists) and provisioned dashboards in folders.
- `lgtm/docs/research/01-stack-versions.md`, the part on Grafana 12 and 13: what is new and what was renamed (the Drilldown apps, the new dashboard schema, dynamic dashboards, Git Sync). Check each against grafana.com/docs for version 13.3 today; the research is two days old and Grafana moves fast.
- `lgtm/learn/src/content/steps/m02/s06-one-request-three-signals.mdx`: the one step that already walks through Grafana's Explore. Use the same names for the same screens.
- `lgtm/learn/src/content/questions/mock-pca.yaml`, the questions tagged `dashboard-panels`, `dashboard-variables` and `dashboard-design`: do not repeat them.
- grafana.com/docs/grafana for 13.3: data sources, Explore, the Drilldown apps, dashboards (panels, visualisations, variables, transformations, annotations, links), dashboard schema and dynamic dashboards, roles and permissions, service accounts, sharing and export.

## The learner at this point

They have done m00 to m04: they can write PromQL and have used the Prometheus query page and, once, Grafana's Explore (m02 step 6). They have never built a dashboard. Grafana is the tool job ads name most.

## The module, 12 steps

Mapped to PCA domain P5, competency "Dashboarding basics", for the steps on panels, variables and design; the other steps serve jobs (`cert: none`).

- The module's goal is a dashboard a team would keep. So the steps build one thing: by step 8 the learner has a RED dashboard for one shop service, with a variable for the service, units and thresholds, and it survives a reload. Later steps add to it (links, annotations, sharing). Say at the start of each lab step what the dashboard should look like at its end.
- Everything the learner creates goes into a folder of its own, `Learn m05`, so that nothing provisioned is touched and one delete cleans up. Provisioned dashboards cannot be saved over; say what Grafana shows when someone tries.
- The names of screens, buttons and options come from the lab's Grafana 13.3 as you see it, not from the documentation of another version and not from memory. Where the documentation and the screen differ, the screen wins and the log says so.
- Step 3, the Drilldown apps: check which of them the lab's Grafana has installed and enabled before you write about them.
- Step 9, dynamic dashboards and the new schema: check its status in 13.3 (generally available, preview, behind a feature toggle) on a grafana.com page and on the lab, and write only what a page states. If the lab does not have it switched on, it is a concept step.
- Step 11, folders, teams, roles and service accounts: the learner may create a team and a service account in the lab's Grafana and must remove them in the same step. No real secrets in the text: a token the learner creates is shown as a placeholder.
- A `<Figure>` earns its place here more than anywhere: the Explore screen, the panel editor, the variable editor. At most three. Write the brief so that someone who has not seen the screen could build the scene.
- Checks: a dashboard cannot be pasted, so ask for something the finished work gives: the UID or a value a panel shows for a fixed thing (the number of nodes), the name of a variable's first option, a token read through a panel the learner built (`metric-m05-1` to `-9`).

Tags: the ten that `04-tags.md` gives m05. Seven are new and have no mock question.

## The lab in this wave

- Grafana needs a sign-in, and this module lives in Grafana. Do not type a password, and do not read the admin password from the cluster. The owner signs in once in the app's browser pane. If Grafana asks you to sign in, say so in your session and wait for the owner there; write the concept steps in the meantime. Do not work around it through the HTTP API: the lesson teaches the screen.
- Kafka was down from 2026-11-11 17:57 UTC and card L5 repairs it while you work. Until it reports, the data source `mimir` has no fresh data, so the shop's dashboards are empty. Use the data source `prometheus` (cluster metrics, one day) for your first lab steps, and run the steps that need the shop's metrics after the planner tells you ingest is back.
- You change the lab's Grafana only inside the folder `Learn m05` and with the team and service account of step 11. Delete all of it when your evidence is collected.

## Yours

- Folder in Grafana: `Learn m05`. No namespace needed.
- Site port: 8098. Local port-forwards: 18110 to 18119.
- Token slots: `metric-m05-1` to `-9` (and `log-`, `span-` likewise).

## Done when, on top of the template

- [ ] The 12 steps exist (or the pull request explains each split, merge or drop), at least six of them with Practice.
- [ ] Every action was done in the lab's Grafana in the browser, in the order written; the log names the screen and what it showed. Actions that could not be done because of the sign-in are listed as `lab-unverified`.
- [ ] The folder `Learn m05`, the team and the service account are gone from the lab's Grafana.
- [ ] The pool covers "Dashboarding basics" with at least eight questions, and the rest of the module with at least 22.
