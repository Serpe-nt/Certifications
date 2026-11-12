# C1: notes for the next content workers

Card C1, modules m00 and m01, 2026-11-12. What writing these two modules taught, on top of `c0-content-notes.md`.

## The article form

- A practice trap opens with `<Trap practice>` and closes with `</Trap>`. Closing it with `</Trap practice>` breaks the MDX parser, and `npm run check:content` does not catch it: only the page (HTTP 500 in `astro dev`) or `npm run build` does. Open each step in the dev server after writing it.
- `<release>` or any other word in angle brackets inside a `<Cmd>` template string is reported as raw HTML by `check:content`. Write a placeholder in capitals (`REVISION`) and say what to put there. In inline code (backticks) angle brackets are fine.
- On a lab step the check input is a `client:visible` island. In the in-app browser the first interaction only wakes it; fill and click a second time. `form_input` works where typing into the field does not.
- After adding or changing `questions/*.yaml`, restart `astro dev`; `/bank.json` keeps the old pool until then.

## Helm 4.3.1 behaviour worth knowing (seen on the lab, logged in `docs/verification/m01.md`)

- `--dry-run=server` did not reject a Service with `type: Bogus`; the real install and upgrade did. A dry run proves rendering only.
- An upgrade with no `-f`/`--set` kept the last values; an upgrade with only one `--set` started from the chart defaults plus that value.
- `helm rollback <release>` with no number goes to the previous revision even when it failed. Name the revision.
- Ctrl+C on an upgrade cancels cleanly (status `failed`); only a hard kill leaves `pending-upgrade`. In a background job use `kill -9 $!`, not `%1`: job numbers of earlier jobs can linger.
- `helm list --all` (and `-a`) no longer exist; `helm list` shows every status.
- The APP VERSION column is the chart's `appVersion`; the lab sets newer image tags for Mimir and the Collector than their charts' `appVersion`.
- The helm history page's example still shows Helm 3 descriptions; Helm 4.3.1 writes `Install complete`, `Upgrade complete`, `Rollback to N`. Exact checks on those strings need the lab's wording.

## Practice chart

podinfo (`https://stefanprodan.github.io/podinfo`, also `oci://ghcr.io/stefanprodan/charts/podinfo`) is small, needs nothing from the cluster, and has switchable hook Jobs (`hooks.<phase>.job.enabled`, `exitCode`) and three test pods. It suits any later step that needs a throw-away release.

## Things this card could not do

- Sign in to Grafana: the session must not type the owner's password. Grafana clicks are written from Grafana's docs and the queries were run through the Loki API instead.
- `make platform`, `make lab`, `make reset` and the VM commands: written from the lab's files and proven by `lgtm/lab/docs/acceptance-*.md`.
