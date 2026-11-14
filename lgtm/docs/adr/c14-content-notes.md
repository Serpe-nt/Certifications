# C14: notes for the next content workers

Card C14, module m15 Alerting, SLOs and on-call, 2026-11-14. What this module learned, on top of the earlier content notes.

## Where alerts live in the lab

- The lab's Prometheus selects every PrometheusRule in every namespace (`ruleSelector: {}`, `ruleNamespaceSelector: {}`). A rule created in a practice namespace is loaded within about a minute, and its alerts reach the Alertmanager in `prom`. That Alertmanager sends everything to the receiver `"null"`, which has no integration: alerts are visible, nobody is told.
- The Alertmanager resource in `prom` also selects every AlertmanagerConfig in every namespace (`alertmanagerConfigSelector: {}`, `alertmanagerConfigNamespaceSelector: {}`). A learner's AlertmanagerConfig would therefore change the shared Alertmanager's running configuration. Module m15 does not use it; a later module that wants it needs the planner's word first.
- Tenant `lab` in Mimir has no Alertmanager configuration of its own; Mimir's fallback receiver has no integration. A rule loaded into tenant `lab` fires and shows in `/prometheus/api/v1/alerts` and in Grafana's alert list, and notifies nobody.
- Grafana's alerting is at its defaults: the default policy delivers to the contact point `empty` (no integration), groups by `grafana_folder` and `alertname`. A nested route with its own matcher and contact point leaves the root unchanged.
- The lab's Grafana does not offer the Tempo data source for alert rules (`meta.alerting` false in the boot data). Trace alerts go through the span metrics in Mimir.

## A practice Alertmanager of your own

`quay.io/prometheus/alertmanager:v0.34.2` runs from a ConfigMap with `--cluster.listen-address=` (no clustering) and `--storage.path=/tmp/alertmanager`, at 10m CPU and 32Mi requested. `amtool` is in the same image: `kubectl exec deploy/alertmanager -- amtool ... --alertmanager.url=http://localhost:9093`. A webhook receiver can be a ten-line Python program in `python:3.14.7-alpine3.24` that prints one line per notification. Grafana's contact points reach it too, at `http://webhook.learn-m15.svc:8080/...`, because the Grafana pod is in the cluster.

- `amtool alert add` sends an alert without an end time; the Alertmanager ends it after `resolve_timeout` (5m).
- `amtool alert query --inhibited` lists the inhibited alerts as `suppressed`.
- Webhook `payload` templates exist in 0.34.2 (`[FEATURE] webhook: Add full payload templating support`); they make a webhook send one templated line, which shows a template's effect without a chat tool.
- After a ConfigMap change, `kubectl rollout restart` is the simplest reload; the practice loses its silences then.

## SLO alerts on the shop

- Checkout's orders are the span metric `traces_spanmetrics_calls_total{service_name="checkout", span_name="oteldemo.CheckoutService/PlaceOrder"}`, about 200 an hour on 2026-11-14, with `status_code="STATUS_CODE_ERROR"` for failed orders.
- At 99.9% the 1-hour burn-rate condition crosses at about 3 failed orders an hour: the lab is a low-traffic service in the workbook's sense.
- In Mimir with ingest storage, an alert that reads recording rules of the same group takes about 2 seconds to evaluate, a recording rule about 0.05. The ruler asks for strong read consistency for dependent rules.
- Which fault flags fail checkout's orders: `paymentFailure` (payment, any variant), `paymentUnreachable` (checkout), `productCatalogFailure` (only orders with product `OLJCESPC7Z`). `cartFailure` fails only `EmptyCart`, whose error checkout ignores (`_ = cs.emptyUserCart(...)`), so it never fails an order. `adFailure` is not on the order path.
- The flag screen's API writes through `POST /feature/api/write` with `{"data": {"flags": ...}}`, replacing the whole file; inside the cluster it answers at `http://frontend-proxy.shop.svc:8080/feature/api/...`. Read the file, change one flag, write it back.

## Writing

- In MDX, `{{ $value }}` outside backticks breaks the build with `$value is not defined`, also inside a question's option. `check:content` does not catch it; the build does.
- `grep 'a\|b'` inside a `<Cmd>` template string loses its backslash. Use `grep -E 'a|b'`.
- The Grafana rule form, the contact point and the policy tree were walked in the browser pane. Two clicks do the job a `computer` click often misses there: `javascript_tool` finding the button by its text and calling `click()`, then reading the result through the provisioning API (`/api/v1/provisioning/policies`, `contact-points`, `alert-rules`).
