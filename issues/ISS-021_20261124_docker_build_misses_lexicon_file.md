# Issue: The production Docker image doesn't build: the lexicon file is outside its build context

**ID:** `ISS-021_20261124_docker_build_misses_lexicon_file`
**Ref:** `ISS-021`
**Date:** 2026-11-24
**Severity:** High
**Status:** Resolved
**Fixed in:** `0072130b` (`.dockerignore` re-includes `docs/music/lexicon.md`)
**Covered by:** `docker build --target build .` (succeeds on the fixed ref)
**Component:** `.dockerignore`
**Affects:** `scripts/lexicon-words-plugin.ts` (the lexicon's build step, a Vite plugin), `vite.config.ts`, `Dockerfile` (build stage), `scripts/vps.sh update` (the VPS deploy), the deploy of `v3.4.0` and every later ref
**Seen on:** not seen on the VPS yet; found while serving the v4.0 sound-library spike (branch `v4.0-c1-spike`, b79c5c93), which served the host's `dist/` instead of the image's
**Reported by:** found while coding (v4.0 wave 1, chunk 1), confirmed by reading the build files

---

## Summary

Since v3.4, `npm run build` reads `docs/music/lexicon.md` through the lexicon's build step, but
`.dockerignore` leaves the whole `docs/` tree out of the Docker build context. The image's build
stage (`COPY . .` then `npm run build`) therefore can't find the lexicon and fails. A VPS deploy
with `scripts/vps.sh update <ref>` of `v3.4.0` or later stops at "build failed"; the old container
keeps serving v3.3, so nothing goes down, but v3.4 and later can't be shipped.

---

## What happens

### Expected

`scripts/vps.sh update v3.4.0` builds the image on the VPS and ships v3.4.0.

### Observed

The image's `npm run build` can't read `docs/music/lexicon.md` (not in the build context), so
`docker compose build` fails and `vps.sh` dies with "build failed; the container was NOT restarted".

### How to reproduce

1. On `main` (or tag `v3.4.0`), run `docker compose build` (or `docker build .`).
2. Watch the build stage's `npm run build` step.
3. It fails on the missing `docs/music/lexicon.md`. (Steps 1–3 inferred from the files; the build
   was not run for this filing.)

---

## Cause

**Confirmed** by reading the files:

```
.dockerignore:49           docs            ← whole docs/ tree left out of the context
Dockerfile:22,24           COPY . .  /  RUN npm run build
vite.config.ts:9,33        lexiconWordsPlugin()
scripts/lexicon-words-plugin.ts:25
  export const LEXICON_PATH = fileURLToPath(new URL('../docs/music/lexicon.md', import.meta.url))
  (read with readFileSync at build time; added in 7cdca3a6, v3.4 chunk 1b)
```

The `.dockerignore` comment says docs are "not part of the tsconfig project graph, so not needed
to typecheck or build"; v3.4's build step made that untrue for one file.

### Where this pattern exists today

Any future build-time read of `docs/`, `specs/` or `ui_ux/` (all ignored) would fail the same way.
Nothing checks the Docker build in `npm run quality`.

---

## Spec and intent

- Specs and decisions: the v3.4 lexicon page (spec D560 and the v3.4 build plan's chunk 1b); the
  deploy runbook on the VPS.
- Intent records: `module_lexicon_single_source` (the lexicon file is the single source the build
  reads).
- Verdict: **code bug** (deploy configuration).

---

## Risk assessment

| Factor             | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| Likelihood         | High: every deploy of v3.4.0 or later                                        |
| Impact             | Medium: no outage (the old container keeps serving), but no release can ship |
| Detectability      | High at deploy time; none before it (no Docker build in the gates)           |
| Current mitigation | `vps.sh` refuses to restart on a failed build                                |

---

## Recommended fix

**Short term:** add `!docs/music/lexicon.md` after `docs` in `.dockerignore` (with a comment
naming the lexicon's build step), and correct the comment above it. Ship as a `v3.4.x` ref the
owner deploys instead of `v3.4.0`.

**Medium term:** none beyond that.

**Long term:** a Docker build check (`docker build --target build .`) in the release gate, so a
build-time read outside the context is caught before a deploy.

**Test:** `docker build --target build .` (or `docker compose build`) succeeds on the fixed ref.

---

## Extra data

The spike's report (v4.0 wave 1, chunk 1) noted it; the spike's serving helper served the host's
`dist/` to avoid it.

---

## References

- `.dockerignore:47-55`, `Dockerfile:14-37`, `vite.config.ts:9,33`,
  `scripts/lexicon-words-plugin.ts:25`
- `scripts/vps.sh:161-163`
- v4.0 wave log (`specs/versions/v4/wave-log.md`, on branch `v4.0-w1`), chunk 1's entry

---

## Change log

- **2026-11-24**: filed.
- **2026-11-25**: resolved in 0072130b; verified with docker build --target build .
