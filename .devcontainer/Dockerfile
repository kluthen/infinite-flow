# syntax=docker/dockerfile:1
# Infinite Flow development container.
#
# Dev-only image: separate from the production Dockerfile at the repo root (nginx + static
# `dist/`). This one bundles the toolchain the team actually works with day to day — Node, the
# quality-gate CLIs, Playwright/Chromium with its OS deps, and a few developer-experience
# utilities — on top of the official TypeScript/Node devcontainer base. Docker CLI, GitHub CLI
# (current release rather than bookworm's dated package) and Claude Code are added as
# devcontainer features instead of here; see ../devcontainer.json.
FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

# Exact @playwright/test version from package-lock.json, so the browser binary installed here
# always matches what `npm ci` resolves inside the container. Override with
# `--build-arg PLAYWRIGHT_VERSION=x.y.z` if the lockfile version drifts and this hasn't been
# bumped yet.
ARG PLAYWRIGHT_VERSION=1.63.0

# Shared, world-readable location for Playwright's browser binaries (matches the `node` user's
# read access; installed as root below, used as `node` afterwards).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

USER root

# Dev CLI tools + fonts Chromium needs for legible/stable notation screenshots. libxml2-utils
# provides xmllint, which the unit tests use to validate the MusicXML export against its schema. Split from the
# Playwright system-dependency install below so the apt cache/list cleanup happens once here;
# `playwright install --with-deps` runs its own apt pass afterwards.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ripgrep \
    fd-find \
    fonts-liberation \
    fonts-noto-color-emoji \
    libxml2-utils \
    && ln -s /usr/bin/fdfind /usr/local/bin/fd \
    && rm -rf /var/lib/apt/lists/*
# git, jq, curl, nano, bash-completion, openssh-client (ssh), procps (ps), ca-certificates,
# locales, and tzdata already ship in the typescript-node base image; en_US.UTF-8 is generated
# and set as LANG/LC_ALL there too, so nothing to add for those.

# Install the pinned Chromium build plus its OS dependencies (fonts above included, shared libs
# handled by `--with-deps`). Runs as root so it can apt-install system packages; the resulting
# $PLAYWRIGHT_BROWSERS_PATH tree is then handed to the `node` user for the container's actual
# runtime user.
RUN mkdir -p "$PLAYWRIGHT_BROWSERS_PATH" \
    && npx -y playwright@${PLAYWRIGHT_VERSION} install --with-deps chromium \
    && chown -R node:node "$PLAYWRIGHT_BROWSERS_PATH"

USER node
