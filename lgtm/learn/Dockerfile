# The study site: a static Astro build served by a small Node server with SQLite.
#   docker compose up -d --build                 the real course content (src/content)
#   SAMPLE=1 docker compose up -d --build        the sample module from tests/fixtures instead
#
# Everything that runs npm happens on the builder's own platform. better-sqlite3 ships prebuilt
# binaries for every platform inside its package and loads them at run time, so npm runs with
# --ignore-scripts (no package here needs an install script) and the arm64 image needs no emulation.
ARG NODE_IMAGE=node:26.13.0-trixie-slim

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS build
WORKDIR /src
ENV ASTRO_TELEMETRY_DISABLED=1
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
ARG SAMPLE=
RUN if [ -n "$SAMPLE" ]; then npm run build:sample && mv dist-sample /out-site; else npm run build && mv dist /out-site; fi \
 && mkdir -p /out-data

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS deps
WORKDIR /src
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# Run: the official Node image as its non-root user "node" (uid 1000). The compose file
# makes the root filesystem read-only; only /data (a volume) is written.
FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production ADDR=:8080 DIST_DIR=/app/site DB_PATH=/data/learn.db
COPY package.json ./
COPY --from=deps /src/node_modules ./node_modules
COPY server ./server
COPY --from=build /out-site ./site
# Owned by the non-root user, so the named volume mounted here starts writable.
COPY --from=build --chown=1000:1000 /out-data /data
USER 1000:1000
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD ["node", "server/healthcheck.mjs"]
CMD ["node", "server/main.mjs"]
