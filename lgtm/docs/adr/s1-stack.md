# S1: the study site's stack and versions

Card: S1 site engine (wave 1). Date: 2026-11-09.

## Context

The card asks for Astro, TypeScript strict, MDX, React islands, Tailwind, the Node adapter in standalone mode, and a small Node server with SQLite. The site runs in one container behind the owner's gateway, possibly under a path prefix (`BASE_PATH`, for example `/h2`), with a read-only root filesystem. The same image is pulled from GHCR on the server, so the prefix is only known when the container starts.

## Versions pinned

All checked on 2026-11-09 against the npm registry (`npm view <package> version`) and, for Node, https://nodejs.org/dist/index.json. Exact versions are pinned in `lgtm/learn/package.json`; the lock file pins the rest.

| Package | Version | Note |
|---|---|---|
| Node.js | 26.13.0 (Docker `node:26.13.0-trixie-slim`, CI `setup-node`) | Latest 26.x, the current LTS line ("Lithium") |
| astro | 7.4.8 | Astro 7: Vite 8, Rust compiler, Sätteri Markdown by default (https://docs.astro.build/en/guides/upgrade-to/v7/) |
| @astrojs/mdx | 8.1.3 | |
| @astrojs/react | 7.1.5 | |
| react, react-dom | 19.3.1 | |
| tailwindcss, @tailwindcss/vite | 4.3.5 | CSS-first configuration; tokens through `@theme inline` |
| typescript | 6.0.3 | Not 7.0: `@astrojs/check` 0.9.12 supports TypeScript 5 and 6 only (its peer dependency) |
| @astrojs/check | 0.9.12 | `npm run check:types` |
| zod | 4.6.7 | The same version Astro 7.4.8 depends on, so the schemas are shared |
| yaml | 2.9.1 | Reads question files and frontmatter in the checks |
| better-sqlite3 | 13.0.3 | See "SQLite" |
| vitest | 5.1.0 | Unit tests |
| @playwright/test | 1.65.0 | End-to-end tests; Chromium headless shell in `.bin/ms-playwright` (git-ignored) |
| cross-env | 10.1.0 | Environment variables in npm scripts on Windows and Linux |

GitHub Actions (latest majors on 2026-11-09, from each repository's latest release): `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `docker/setup-buildx-action@v4`, `docker/login-action@v4`, `docker/metadata-action@v6`, `docker/build-push-action@v7`.

## Decisions

### 1. A static Astro build served by our own Node server, not the Node adapter

Options:
- (a) Astro's Node adapter in standalone mode, with API routes and middleware.
- (b) A fully static Astro build (`output: 'static'`), served by a small `node:http` server that also holds the API and the guards.

Astro's `base` is fixed at build time. With (a) the image from GHCR could only serve one prefix, or the container would have to rebuild at start, which the read-only root filesystem forbids. With (b) the build uses a placeholder base (`/__lgtm_base__`), and the server replaces it with `BASE_PATH` (or nothing) in every text file once at start-up. Every page is the same for every learner (progress lives in the browser and the API), so nothing needs server rendering.

Decision: (b). This is a difference from the card ("the Node adapter in standalone mode"), stated at the top of the pull request. The server (`lgtm/learn/server/`) is about 300 lines of plain JavaScript with one dependency, and it also does what saa-plan's Go server does: host allowlist, origin check on writes, security headers, a content security policy with hashes of the few inline scripts, gzip, `/healthz`.

### 2. SQLite: better-sqlite3, not `node:sqlite`

The card says to use Node's built-in SQLite if it is stable in the pinned Node version. The Node 26 documentation (https://nodejs.org/docs/latest-v26.x/api/sqlite.html, read 2026-11-09) marks `node:sqlite` as "Stability: 1.2 - Release candidate", which is not stable. So the server uses one small dependency, better-sqlite3 13.0.3. Its package ships prebuilt binaries for Linux (glibc and musl), macOS and Windows on x64 and arm64 and loads the right one at run time. Its lock-file entry still asks npm to run `node-gyp rebuild`, which fails where no compiler is installed, so `lgtm/learn/.npmrc` sets `ignore-scripts=true` (no other dependency has an install script). A plain `npm ci` then works on Windows, Linux and in the image, and the arm64 image builds without emulation. When `node:sqlite` becomes stable, `server/store.mjs` is the only file to change.

### 3. Content collections with the default loaders

Modules and steps use Astro's `glob()` loader; question files hold lists, so a small inline loader turns each question into an entry. The same Zod schemas (`src/lib/schema.ts`) are used by the collections and by `scripts/check-content.ts`, which runs before every build and checks what a schema cannot express. The Markdown processor is Astro 7's default (Sätteri); no remark or rehype plugins are needed.

### 4. Content security policy without third-party origins

`default-src 'none'`, scripts and styles from `'self'` plus the SHA-256 hashes of inline scripts and styles found in the built pages (the theme script in the page head and Astro's island loader). Stylesheets are never inlined (`build.inlineStylesheets: 'never'`), so no `'unsafe-inline'` is needed. The end-to-end tests fail on any console error, which includes a policy violation.

## Sources

- https://docs.astro.build/en/guides/upgrade-to/v7/ (read 2026-11-09)
- https://docs.astro.build/en/guides/content-collections/ (read 2026-11-09)
- https://nodejs.org/docs/latest-v26.x/api/sqlite.html (read 2026-11-09)
- https://nodejs.org/dist/index.json (read 2026-11-09)
- npm registry entries for every package above (read 2026-11-09)
