# syntax=docker/dockerfile:1
# Infinite Flow production container image.
#
# Build stage: install the locked dependency tree and run the real production build (strict
# typecheck + vite build, via `npm run build`; see package.json). Runtime stage: serve the static
# `dist/` output with a non-root nginx on 8080. No backend, no network calls, no persistence — this
# image only ever serves static files.

# ---- build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Copy only the manifest/lockfile first so `npm ci` is cached across source-only changes.
COPY package.json package-lock.json ./
RUN npm ci

# `npm run build` runs `npm run typecheck` first (`vue-tsc --build --force`), and tsconfig.json's
# project references (tsconfig.app.json, tsconfig.node.json, tsconfig.e2e.json) span not just src/
# but also tests/, scripts/, and every root-level *.config.ts -- so the real production build needs
# most of the repository, not just src/ and public/. .dockerignore trims what it can (docs/specs/
# ui_ux, node_modules, dist*, local tooling state) without breaking that typecheck graph.
COPY . .

RUN npm run build

# ---- runtime stage ----------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime

LABEL org.opencontainers.image.title="Infinite Flow" \
      org.opencontainers.image.description="Browser-only musical phrase workspace, served as a static PWA." \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/kluthen/infinite-flow" \
      org.opencontainers.image.base.name="nginxinc/nginx-unprivileged:1.28-alpine"

COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/manifest.webmanifest || exit 1

# The base image already runs as the unprivileged `nginx` user (uid 101); stated explicitly here
# for clarity since the runtime stage never needs root.
USER nginx
