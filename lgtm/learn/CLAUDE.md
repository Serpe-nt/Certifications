# lgtm/learn: notes for the next agent

Read `../CLAUDE.md` first, then `README.md` here. Decisions: `../docs/adr/s1-*.md`.

## Layout

- `src/content/` the course (modules, steps, questions); empty until the content cards. `tests/fixtures/content/` is the sample module, built only by `build:sample` and `dev:sample`.
- `src/content.config.ts` the collections; `src/lib/schema.ts` the contract as Zod schemas; `src/lib/content-rules.ts` the rules a schema cannot express (run by `scripts/check-content.ts` before every build).
- `src/pages/` overview, module start (`/m/<id>/`), step (`/m/<id>/<sNN>/`), module end (`/m/<id>/done/`), settings, 404.
- `src/components/mdx/` the contract's components (Astro); `src/components/islands/` the interactive parts (React).
- `src/lib/state.ts` the progress document: shape, `parseState()` (validates and bounds every input), migrations, `mergeStates()`. `src/lib/store.ts` local storage and the sync with the server. `src/lib/checks.ts` and `token.ts` the five check kinds.
- `src/figures/registry.ts` figure scenes by id; scenes go in `src/figures/<figure id>/index.tsx`.
- `src/styles/tokens.css` every colour, space, radius, shadow and font, light and dark. `global.css` maps them into Tailwind.
- `server/` the Node server: static files with the base path filled in, `/api/state`, guards, CSP. Plain JavaScript, no build step.

## Rules

- One step per screen; no list of steps beside the card; only the page scrolls. Which card is on screen lives in the URL, not in the state.
- Every way into the state goes through `parseState()`. New fields get a default in `defaultState()` and bounds in `parseState()`; a new shape gets `STATE_VERSION` + 1 and a step in `MIGRATIONS`. Never drop progress; never rename the storage key.
- `mergeStates()` is the S1 rule (union of `done` and `checks`, the rest from the server). S2 extends it.
- Nothing from the state reaches the page as HTML. React escapes; `dangerouslySetInnerHTML` is only for build-time HTML from the course's own MDX.
- Components use tokens through Tailwind classes or `var(--lg-*)`; never a hard-coded colour. No CDN scripts or fonts, no inline styles in the static HTML (the CSP forbids them), no third-party origins.
- Controls in islands stay disabled until hydrated (`useHydrated()`), so a click before hydration is not lost.
- Tests: `npm test` must pass without the network. Test servers use ports 8095 and 8096 only.
