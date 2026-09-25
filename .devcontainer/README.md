# Development container

A dev-only container for working on Infinite Flow: Node 22, the project's quality-gate CLIs,
Playwright Chromium with its OS dependencies pre-installed, and a few day-to-day developer tools.
This is separate from the production `Dockerfile`/`compose.yaml` at the repo root, which only ever
builds and serves the static `dist/` output — this container never runs the app for end users, it's
where you edit and test it.

## What's inside

- Node 22 (`mcr.microsoft.com/devcontainers/typescript-node:22-bookworm` base), npm
- Playwright's Chromium build, pinned to the `@playwright/test` version in `package-lock.json`,
  with its OS-level dependencies and the fonts it needs for notation screenshots
  (`fonts-liberation`, `fonts-noto-color-emoji`)
- git, ripgrep (`rg`), fd-find (`fd`), jq, curl, nano, bash-completion,
  openssh-client, procps, ca-certificates, locales (en_US.UTF-8), tzdata
- Docker CLI + the compose plugin, via the `docker-outside-of-docker` feature, wired to the host's
  Docker socket — lets you build/run the repo's own production image from inside this container
- GitHub CLI (`gh`, current release), via the `github-cli` feature
- Claude Code CLI, via the `ghcr.io/anthropics/devcontainer-features/claude-code` feature; its
  state (`~/.claude`) is persisted in a named volume across rebuilds

`node_modules` lives in its own named volume, kept separate from anything installed on the host, so
native binaries (esbuild, vue-tsc, Playwright's driver, etc.) never mismatch between the two.

## Opening it

**VS Code**: open the repo, then "Dev Containers: Reopen in Container" (requires the Dev
Containers extension). The first build installs Chromium and its dependencies, so expect it to
take a few minutes; `postCreateCommand` then runs `npm ci` into the `node_modules` volume.

**CLI** (no VS Code): with `@devcontainers/cli` available (`npx @devcontainers/cli`),

```sh
npx @devcontainers/cli up --workspace-folder .
npx @devcontainers/cli exec --workspace-folder . npm run quality
```

## Ports

`forwardPorts` covers everything the app and its test harnesses serve on:

| Port | What                                              |
| ---- | ------------------------------------------------- |
| 5173 | `npm run dev` (Vite dev server)                   |
| 4173 | `npm run preview` (production build, `dist/`)     |
| 4174 | Notation e2e harness (`build:notation-harness`)   |
| 4175 | Workspace e2e harness (`build:workspace-harness`) |

## Running the quality gate

Once the container is up (`node_modules` populated by `postCreateCommand`):

```sh
npm run quality
```

or any of its constituent scripts individually (`npm run lint`, `npm run test:unit`, `npm run
test:e2e`, ...) — see the root `README.md` for the full command list. `npm run build` (and hence
anything that depends on a fresh `dist/`, like `test:e2e`'s port-4173 preview) runs the strict
TypeScript build first, same as on the host.

## Playwright / visual-baseline caveat

Chromium here comes from the same `@playwright/test` version as the lockfile, with the OS
dependencies Playwright's installer decides the container needs — but the container's font
rendering, subpixel hinting, and installed font set are not guaranteed to be byte-identical to the
host's. `npm run test:notation` compares rendered notation against committed visual baselines:
if those baselines were captured on the host (or a different container image), expect possible
pixel-level diffs when re-running that suite in here. Regenerate baselines from inside the
container if you intend to keep using it for `test:notation`.

## atd

The `atd` CLI (used by `npm run atd:lint` / `npm run atd:check`) is not bundled in this container:
it's a native binary with no public install source. Those two scripts (and `npm run quality`, which
calls them) will not run here unless you provide `atd` yourself, e.g. by bind-mounting the host
binary into the container and putting it on `PATH`. This is optional and left out of
`devcontainer.json` by default so the container builds and starts on a machine that doesn't have
`atd` at all.
