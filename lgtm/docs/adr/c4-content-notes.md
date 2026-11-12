# C4: notes for the next content workers

Card C4, module m05 Grafana core, 2026-11-12. What walking the lab's Grafana 13.3 taught, on top of `c0-content-notes.md` and `c1-content-notes.md`.

## The lab's Grafana 13.3 differs from the documentation

The screen wins, as the cards say. These differences were seen on the lab and are logged in `docs/verification/m05.md`, section "Lab walk":

- A new dashboard opens in edit mode with the **Auto grid** layout. The "Create dashboards" page says Custom is the default.
- The dashboard settings tabs **JSON Model** and **Annotations** only point to the sidebar now. The JSON lives under **Edit as code** (JSON or YAML), the annotation queries under the sidebar's **Annotations**.
- Saving a provisioned dashboard shows the **Save dashboard** drawer with "cannot be saved from the Grafana UI", not the "Cannot save provisioned dashboard" dialog the provisioning page names.
- Export as code: the switch is "Share dashboard with another instance" for the V2 Resource model and "Export for sharing externally" for Classic. A Classic export of a dynamic dashboard warns that tabs and conditional rendering may be lost.
- Logs Drilldown has no Patterns tab: the lab's Loki runs with `pattern_ingester.enabled: false`.
- Every dashboard you save is stored as `dashboard.grafana.app/v2`, the provisioned Classic ones included once opened.
- Deleting a folder sends its dashboards to **Recently deleted** for up to 12 months; the page offers only Restore.

## Working in the browser pane

- The pane is narrow (about 800 pixels). Many buttons are icons; read their `aria-label` with `javascript_tool` instead of guessing.
- An applied but unsaved variable is lost when the page is left or reloaded. Save right after **Apply**.
- In dialogs, Escape closes the whole dialog without saving (the data link dialog does this).
- Paste from the system clipboard does not reach the pane. To import JSON, set the textarea's value through the native setter and fire an `input` event.
- Panel menu actions that copy (Copy link, Copy) write to the user's clipboard; say so in the session.
- Monaco is reachable as `window.monaco` in the panel editor, not in the export drawer.

## Checks

- `token` checks for `metric-*` slots read `lab_beacon_value` on Mimir. A Stat panel shows the full number with the default unit, but in red because of the default threshold 80; the unit `short` turns it into "350 K". That made a good lesson.
- A request with a service account token can be tested from the signed-in page with `fetch(..., {credentials: 'omit'})`, printing only the status. Never print the token.
