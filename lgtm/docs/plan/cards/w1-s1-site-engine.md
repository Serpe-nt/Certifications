# S1: site engine

Wave 1. Model Opus 5.5, high effort. Runs beside L1 and D1; shares no file with them.

## Owns

`lgtm/learn/**`, `.github/workflows/lgtm-learn.yml`, `lgtm/docs/adr/s1-*.md`

## Read first

- `lgtm/docs/plan/00-overview.md`, `03-content-contract.md` (you implement it), `02-lab-contract.md` (sections "Addresses in the browser" and "Check tokens")
- `saa-plan/docs/architecture.md`: the state model, the sync protocol and the server security of the owner's existing tracker. Port the ideas, not the code.
- `saa-plan/compose.yaml`, `saa-plan/Dockerfile`, `.github/workflows/ghcr.yml`: the deployment conventions to mirror.
- `saa-plan/CLAUDE.md`, section "Rules": what the owner asked for in a study site (one step per screen, no visible task list, only the page scrolls, purpose first).

## Goal

A working, tested, containerised study site with no real content and no visual design yet: a learner can open a module, walk its steps one card at a time, pass every kind of check, and find their progress again on another device.

## Build

1. **Project.** Astro (latest stable; check on the day), TypeScript strict, MDX, React for interactive islands only, Tailwind, the Node adapter in standalone mode. Record versions and the reasons in `lgtm/docs/adr/s1-stack.md`. Use Node's built-in SQLite if it is stable in the Node version you pin, otherwise one small dependency; say which in the ADR.
2. **Content schemas.** Collections for modules, steps and questions exactly as in the content contract. A file that breaks the contract fails `npm run build`. Add `npm run check:content` for the rules a schema cannot express (ids unchanged against `main`, token slots unique and in their own module, question rules, tag coverage). Add `npm run check:links` (network needed, not part of `npm test`).
3. **Pages.**
   - Overview: the next step with one large Continue button at the top, then the modules as tiles with progress.
   - Step: one card, with Back, Mark complete and Next under it. No list of steps beside it. Only the page scrolls. Which card is on screen lives in the URL, not in saved state.
   - Module end: what was done, and the quiz entry point (a placeholder until S2).
   - Settings: lab domain, lab seed, light or dark theme, effects and sound switches (stored, used by S2), export and import of progress.
4. **MDX components** from the contract: `Why`, `Idea`, `Points`, `Point`, `Do`, `Done`, `Trap`, `Question`, `LabLink`, `Cmd`, `Query`, `Figure`, and the check widget for `exact`, `regex`, `range`, `choice` and `token`. The token is computed in the browser with Web Crypto from the stored seed and the step's slot id, exactly as the lab contract says; include test vectors.
   `Figure` takes `id`, `alt` and `brief`. If a scene is registered under `src/figures/<id>/` it is loaded as a lazy React island; otherwise the card shows a quiet labelled placeholder with the alt text. Scenes are animated illustrations built later with the Stageshow skill, so the island must stop when off screen and show a still under `prefers-reduced-motion`. Ship the registry and the placeholder; build no scenes.
5. **State.** One versioned JSON document per learner in the browser's local storage, mirrored to the server: `GET` and `PUT /api/state` with a revision used as ETag, `If-Match` on write, 304 when nothing changed. On a conflict in S1: take the union of completed steps and passed checks, otherwise the server copy (S2 extends the merge). Every state entry point validates and bounds what it reads. Migrate the shape in code; never drop progress.
6. **Server safety.** Host allowlist (`ALLOWED_HOSTS`), an origin check on writes, security headers, a content security policy with no third-party origins, a `BASE_PATH` for serving under a path prefix, `/healthz`. Anything from saved state that reaches the page is escaped. No authentication: the site sits behind the owner's gateway, like saa-plan.
7. **Container.** Multi-stage Dockerfile, non-root user, read-only root filesystem, a `/data` volume for the database, a health check. `compose.yaml` with the same variables as saa-plan's (`BIND`, `PORT`, `ALLOWED_HOSTS`, `BASE_PATH`, `TAG`), default `127.0.0.1:8082`, image `ghcr.io/serpe-nt/lgtm-learn`.
8. **CI.** `.github/workflows/lgtm-learn.yml`: on pull requests touching `lgtm/learn/**` run tests and build; on `main` also push the image (amd64 and arm64), tags `latest` and `sha-<short>`.
9. **Design tokens.** Every colour, radius, space, shadow and font is a CSS variable used through the Tailwind theme, with light and dark sets. Components never hard-code a colour. Ship a plain neutral look; the design card replaces tokens and component styling later. Keyboard use, visible focus and `prefers-reduced-motion` work from the start.
10. **Sample content.** A small sample module that uses every step kind, component and check kind, kept under `tests/fixtures/` and shown by `npm run dev:sample`. The production build contains no sample content and must build with empty content folders.
11. **Tests.** Unit tests for state, merge, checks, tokens and the content rules. Playwright tests for the step flow, sync between two browser contexts, a hostile imported state, and the path prefix. `npm test` runs everything without the network. Test servers use ports 8095 to 8098.
12. **Docs.** `lgtm/learn/README.md`: run, test, add content, deploy on a server. `lgtm/learn/CLAUDE.md`: layout and rules for the next agent, short.

## Not in this card

Module quizzes, review, weak spots, mock exams, XP, badges, celebrations, the full multi-device merge (all S2). Visual design (DZ). Real lesson content.

## Done when

- [ ] `npm ci && npm test && npm run build` pass in `lgtm/learn` on a clean checkout.
- [ ] `docker compose up -d --build` in `lgtm/learn` serves the site on port 8082 with the sample content switched on by one documented variable; the container runs read-only and non-root; progress survives a restart.
- [ ] A broken step file (missing `Why`, duplicate id, token slot of another module) fails the build or `check:content` with a message that names the file and the rule.
- [ ] The five check kinds work in the sample module; the token test vectors pass.
- [ ] Two browser contexts converge on the same progress within one sync cycle.
- [ ] The site works under `BASE_PATH=/h2`.
- [ ] The CI workflow passes on the pull request.
- [ ] The ADR and both docs exist.

## Report

The pull request link, the versions pinned, test counts, a screenshot of a step card and of the overview, what S2 needs to know about the state shape.
