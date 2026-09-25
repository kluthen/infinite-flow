# Release Checklist

An ordered, checkbox-style procedure for cutting a first release. Follow it in order; each step
assumes the previous ones passed.

## 1. Clean checkout and install

- [ ] Start from a clean checkout of the release commit (`git status` shows no local changes).
- [ ] `npm ci` — installs exactly the locked dependency tree from
      [`package-lock.json`](../../package-lock.json); do not use `npm install` for a release build.
- [ ] `npx playwright install --with-deps chromium` — installs the pinned Chromium binary and its
      OS dependencies. Chromium is the only supported/tested browser for this release; see
      [`browser-and-offline-limits.md`](browser-and-offline-limits.md).

## 2. Run the quality gate on an idle machine

- [ ] Confirm no other CPU-heavy job is running, in particular **no background LLM/Ollama job**
      (e.g. an `atd audit` run, or anything else driving Ollama). ATD's own audit tooling saturates
      the local Ollama server, and that CPU contention has caused timing-sensitive specs — for
      example `rhythm-prefilter-soundness-mixed.spec.ts` — to time out under load rather than fail
      on their own merits. Run `npm run quality` alone, not alongside such a job.
- [ ] `npm run quality` — runs, in order: `format:check`, `lint`, `test:unit`, `build`,
      `verify:boundaries`, `test:e2e`, `test:a11y`, `test:notation`, `atd:lint`, `atd:check`. See
      the [First-Release Verification Matrix](../../README.md#first-release-verification-matrix)
      in the README for what each gate proves.
- [ ] If any gate fails, stop and fix it before continuing; do not skip ahead on a red gate.

## 3. Check the build artifact

- [ ] Inspect `dist/assets/` after the `build` step (already run as part of `npm run quality`, or
      run `npm run build` on its own to re-check without the rest of the gate).
- [ ] Record/compare against the last-known-good numbers:
  - Main entry chunk (`dist/assets/index-*.js`): about **129 KB** (about **45 KB gzip**).
  - Lazy notation engraving chunk (`dist/assets/vexflow-engraver-*.js`): about **709 KB**
    uncompressed (loaded on first notation, not part of the main bundle — see
    [`browser-and-offline-limits.md`](browser-and-offline-limits.md#lazy-vexflow-engraving-chunk)).
  - PWA precache manifest (`dist/sw.js`'s `precacheAndRoute` list): **10 entries**, about
    **1018 KiB** total.
- [ ] To re-measure: run `npm run build`, then inspect Vite's own build output (it prints each
      emitted chunk's size and gzip size), or `ls -la dist/assets/` for exact byte counts. For the
      precache entry count/size, either read `vite-plugin-pwa`'s own build-time summary (printed
      after `vite build` completes) or grep `dist/sw.js`'s `precacheAndRoute([...])` array directly.
      A meaningful jump in any of these three numbers (not just the exact figures) is the signal
      worth investigating — this is a manual sanity check for trend and gzip size, not the only gate
      on size: `verify:boundaries` also fails if any built asset is missing from the precache, or if
      any `dist/assets/*.js` chunk exceeds its hard budget (entry 200 KB, `generation.worker`
      150 KB, `vexflow-engraver` 800 KB, other 100 KB, all minified, checked by
      `scripts/verify-boundaries.mjs`).

## 4. Manual offline check

- [ ] `npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` (or reuse the
      `dist/` from step 2/3).
- [ ] Open `http://127.0.0.1:4173/` in Chromium.
- [ ] In DevTools → Application → Service Workers, confirm a service worker is registered and
      activated for the origin, and Application → Cache Storage shows the precache with the entry
      count from step 3.
- [ ] In DevTools → Network, enable "Offline" (or Application → Service Workers → "Offline"
      checkbox).
- [ ] Reload the page. Confirm it loads from cache (no failed navigation), and that a full
      generate → notate cycle completes: select controls, click Generate, confirm the phrase
      engraves.
- [ ] Turn "Offline" back off before continuing.

## 5. License review

- [ ] Review [`THIRD_PARTY_LICENSES.md`](../../THIRD_PARTY_LICENSES.md) against the current
      `package-lock.json`: every runtime dependency that ships inside `dist/` (Vue, VexFlow,
      `vite-plugin-pwa`/Workbox, and the two self-hosted font families) is listed with its exact
      pinned version and verified license.
- [ ] Confirm [`public/licenses/`](../../public/licenses/) still contains the full vendored license
      text for each entry (`vue-MIT.txt`, `vexflow-MIT.txt`, `vite-plugin-pwa-MIT.txt`,
      `workbox-MIT.txt`, `academico-OFL-1.1.txt`, `bravura-OFL-1.1.txt`, `fraunces-OFL-1.1.txt`,
      `source-sans-3-OFL-1.1.txt`) and that `npm run build` copies it into `dist/licenses/`.
- [ ] If `package-lock.json` changed since the last release (a dependency was added, removed, or
      had a major/license-relevant version bump), update `THIRD_PARTY_LICENSES.md` and
      `public/licenses/` accordingly before proceeding.
- [ ] Confirm the root [`LICENSE`](../../LICENSE) and `package.json`'s `"license": "MIT"` field
      still match project intent.

## 6. Docker image verification

The production container ([`Dockerfile`](../../Dockerfile), [`compose.yaml`](../../compose.yaml),
[`docker/`](../../docker/)) is a separate packaging of the same `npm run build` output — build it
and smoke-test it independently of step 2's host-side gate.

- [ ] `docker compose up -d --build` — builds the image (real `npm ci && npm run build` inside the
      image, not the host `dist/`) and starts the container; confirm it reaches `healthy`
      (`docker compose ps`).
- [ ] `curl -I` the running container for: `/` and `/index.html` (`Cache-Control: no-cache`), an
      `/assets/*.js` and `/assets/*.woff2` file (`Cache-Control: public, max-age=31536000, immutable`;
      correct `Content-Type`, including `text/javascript` for JS and `font/woff2` for the fonts),
      `/manifest.webmanifest` (`Content-Type: application/manifest+json`, `Cache-Control: no-cache`),
      and `/sw.js` (`Content-Type: text/javascript`, `Cache-Control: no-cache`). Confirm every
      response carries the security headers (`Content-Security-Policy`, `X-Content-Type-Options`,
      `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`), and that a missing `/assets/*`
      file 404s rather than falling back to `index.html`.
- [ ] Load the container's URL in Chromium, click Generate, confirm the score engraves, and switch
      through every notation display mode. Confirm zero `securitypolicyviolation` events and zero
      console/page errors (open DevTools → Console, or drive it with Playwright as documented in the
      container packaging's own verification notes).
- [ ] Confirm the service worker registers, activates, and (after one reload) controls the page;
      then set the browser offline, reload, and confirm the app still loads and generates a phrase.
- [ ] `docker compose down` when done; keep the built image, remove only the stopped
      containers/networks compose created.
- [ ] **Deployment behind Caddy** (see `README.md`'s
      ["Deploying behind a reverse proxy (Caddy)"](../../README.md#deploying-behind-a-reverse-proxy-caddy)
      section — illustrative Caddyfile, not yet applied to any real host):
  - [ ] The app's HTTPS URL (through Caddy) loads correctly.
  - [ ] The service worker registers over HTTPS (the secure-context requirement — see
        [`browser-and-offline-limits.md`](browser-and-offline-limits.md#secure-context-requirement-for-production-deployment) —
        is satisfied by Caddy's TLS termination, not by the container itself).
  - [ ] An offline reload through the HTTPS URL still loads and generates, matching step 4's direct
        check.
  - [ ] Every security header (CSP and the rest) appears **exactly once** in the response Caddy
        returns to the browser — confirms Caddy is not adding a second, conflicting copy of any
        header nginx already sets.

## 7. ATD check

- [ ] `npm run atd:lint` — atom structure is well-formed.
- [ ] `npm run atd:check` — source/test link coverage holds for the release diff.
- [ ] (Both already ran as part of `npm run quality` in step 2; re-run standalone only if you made
      documentation-only changes after that pass.)

## 8. Definition-of-Done acceptance sign-off

- [ ] Read [`dod-acceptance-matrix.md`](dod-acceptance-matrix.md) end to end against the current
      commit.
- [ ] Confirm every item is either **Verified** by the gates already run in step 2, or its
      **Manual** step has actually been performed (and recorded), or it is an explicitly accepted
      **Partially verified** / **Fix in progress** item with no open blocker for this release.
- [ ] Run `issues --status open` (or read [`issues/README.md`](../../issues/README.md)): there must
      be **no open issue**. Every filed issue is resolved or explicitly closed as `Wont Fix` before
      v1.0 is validated.
- [ ] [`deferred-scope.md`](deferred-scope.md) is post-v1 roadmap input and is **not** part of this
      gate. Do not hold the release for its items; file an issue first if one must ship in v1.0.
- [ ] Get an explicit named sign-off (a release owner or delegate) that the matrix as a whole is
      acceptable for this release, recorded in the release's own tracking (e.g. the PR description
      or release notes) — this checklist does not itself store that sign-off.

## 9. Merge and tag

- [ ] Merge the release branch into `main` following the repository's normal merge process (a pull
      request review, or the project's documented worktree/merge convention — see this repository's
      own step-workflow notes, not reproduced here).
- [ ] Tag the merged commit with the release version (matching `package.json`'s `"version"` field,
      bumped first if this release changes it).
- [ ] Do not push a force-push or rewrite history on `main` as part of this step.

This checklist intentionally does not include any command that pushes to a remote or publishes a
tag; those actions are the release owner's explicit, separate decision.
