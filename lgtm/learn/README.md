# LGTM course: the study site

The website of the LGTM observability course. It shows one step per screen with Back, Mark complete and Next, checks what the learner pasted from the lab, and keeps their progress on the device and on the server so every device sees it.

Built with Astro (static pages), React islands for the interactive parts, Tailwind with design tokens, and a small Node server with SQLite. Decisions and versions: `../docs/adr/s1-stack.md`, `../docs/adr/s1-content-format.md` and `../docs/adr/s2-study-features.md`.

## What the learner gets

- One step per screen, laid out as an article with a sidebar (contents, terms, exam domains, sources), with Back, Mark complete and Next. Lab steps have Learn and Practice tabs; Practice holds the lab work and the paste-the-answer check.
- Settings and Practice open as dialogs over the page you are on.
- A quiz at the end of every module (`/m/<id>/quiz/`): 15 questions from the module's pool, pass at 80%. A module is done when all its steps are complete and its quiz is passed.
- Practice (`/practice/`): the review queue (a missed question comes back after 1, 2 and 4 days), three questions from a step, and weak-spot practice.
- Readiness per exam domain on the overview, and the OTCA and PCA mock exams (`/exam/otca/`, `/exam/pca/`): 60 questions by the domain weights, 90 minutes, pass at 75%.
- XP, levels and badges worked out from the progress, and celebrations that grow with what was finished; Settings switch the effects and the sound off, and reduced motion stops the moving parts.

The rules and numbers behind these are in `CLAUDE.md` here.

## Run it on the PC

Needs Node 26 and npm.

```bash
npm ci --ignore-scripts
npm run dev:sample     # the sample module, at http://localhost:8095 (progress kept in memory)
npm run dev            # the real course content in src/content
```

With Docker, the same way it runs on a server (the site on http://localhost:8082):

```bash
docker compose up -d --build                        # the course
SAMPLE=1 TAG=sample docker compose up -d --build    # the sample module instead
```

`SAMPLE` is the one switch for the sample content: any non-empty value builds `tests/fixtures/content` into the image instead of `src/content`. `TAG=sample` keeps that local image apart from the real one.

## Test

```bash
npm run setup:browsers # once: the test browser, into .bin/ms-playwright (git-ignored)
npm test               # unit tests, type check, sample build, end-to-end tests; no network needed
npm run build          # content checks, then the production build into dist/
npm run check:content  # the content rules on src/content (add -- --final at the end of the project)
npm run check:links    # every source URL answers 200 (needs the network)
```

Test servers use ports 8095 (the site at `/`) and 8096 (the site under `/h2`, and the unit tests' server).

## Add content

The format is in `../docs/plan/03-content-contract.md`. Files go here:

```
src/content/modules/m04.yaml          one file per module
src/content/steps/m04/s07-rate.mdx    one file per step; the file name starts with the step number
src/content/questions/m04.yaml        the module's quiz pool
```

Steps use the components without importing them. The article form (`../docs/adr/dz-article-format.md`): `Problem`, `Idea`, `InLab`, `Trap` (`<Trap practice>` on lab work), `Remember`, `Do`, `Done`, `Question`, and the information parts `Flow`/`Stage`, `Compare`/`Col`, `Figures`/`Stat`, `Layers`/`Layer`, `Timeline`/`Event`. The old form (`Why`, `Points`, `Point`) still builds until the module is rewritten. In both: `LabLink`, `Cmd`, `Query`, `Figure`. Two details the contract leaves open:

- The card question: the question text, then a list of four items; each item is the option, a blank line, and its explanation indented under it. `answer="b"` names the second item in the file.
- Braces start JavaScript in MDX, so write queries and commands as a string: ``<Query lang="promql">{`rate(x{job="shop"}[5m])`}</Query>``.

`tests/fixtures/content/` holds a sample module that uses every step kind, component and check kind; copy from it. Run `npm run check:content` before you commit: it names the file and the rule for every problem. A step's id is never renamed or reused, because it keys saved progress; the check compares ids with `origin/main`.

A figure is asked for with `<Figure id="m05-s03-explore" alt="..." brief="...">`. Until a scene exists in `src/figures/m05-s03-explore/index.tsx`, the card shows a labelled placeholder. See `src/figures/registry.ts` for what a scene receives.

## Deploy on a server

The image is built by `.github/workflows/lgtm-learn.yml` on every push to `main` that touches this folder: `ghcr.io/serpe-nt/lgtm-learn`, tags `latest` and `sha-<short commit>`, for amd64 and arm64.

Copy `compose.yaml` to the server and put the settings in a `.env` file next to it:

```bash
BIND=127.0.0.1           # the gateway on the same machine reaches it here
PORT=8082                # host port
ALLOWED_HOSTS=localhost,127.0.0.1,::1,study.example.lan   # every name the site is reached by
BASE_PATH=/h2            # when the gateway passes /h2/... through unchanged; leave empty for /
TAG=latest               # or sha-abc1234 to roll back
```

```bash
docker compose pull && docker compose up -d
```

The container runs as a non-root user on a read-only root filesystem; progress is in the `lgtm-learn-data` volume (`/data/learn.db`) and survives restarts and updates. `/healthz` answers 200 for health checks. There is no sign-in: the site belongs behind the owner's gateway, like saa-plan.

## Server settings

| Variable | Default | Meaning |
|---|---|---|
| `ADDR` | `:8080` | Where the server listens inside the container |
| `DIST_DIR` | `dist` next to `server/` | The built site |
| `DB_PATH` | `data/learn.db` (`/data/learn.db` in the image) | The SQLite file; `:memory:` for tests |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,::1` | Host names the server answers to; others get 421 |
| `BASE_PATH` | empty | URL prefix such as `/h2` |
