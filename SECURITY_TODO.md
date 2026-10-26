# Security TODO

Known vulnerabilities in this project's dependencies, at or above the
watch threshold. Items are written by `cve-watch` (dev_team) and triaged by
`security-advisor`; the `<!-- cve-watch:... -->` marker on each item is how
later sweeps recognize it, so keep it. A sweep ticks an item once the
vulnerability is no longer detected. Delete ticked items whenever you like.

- [ ] **high 7.5** GHSA-xjj6-f33q-929c (CVE-2026-109869) · npm `undici` 8.11.0 → fix 8.12.2 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-xjj6-f33q-929c:npm/undici -->
  undici vulnerable to Denial of Service via unhandled error on excessive content-encodings https://osv.dev/vulnerability/GHSA-xjj6-f33q-929c
  Triage (2026-10-26): dev-only — test-only dep via jsdom 30.1.1 (devDependency, Vitest DOM environment); not in the build or dist/, and tests fetch no untrusted server. Fix 8.12.2 is inside jsdom's ^8.10.2 range: lockfile refresh of undici only, no jsdom bump, non-breaking. Cheap: do it with the vite/vitest refresh.
- [ ] **high 7.5** GHSA-587h-7wmj-h5pm (CVE-2026-112942) · npm `vite` 8.3.0 → fix 8.3.3 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-587h-7wmj-h5pm:npm/vite -->
  launch-editor: `fs.existsSync()` existence check can be bypassed on Windows https://osv.dev/vulnerability/GHSA-587h-7wmj-h5pm
  Triage (2026-10-26): dev-only, not applicable — launch-editor bug on Windows only; dev machine is Linux and vite is a build tool/dev server, nothing of it is served by nginx. Fix: vite 8.3.0 -> 8.3.5 (latest 8.3.x, vetted clean; 8.3.3 minimum), direct bump, patch, non-breaking; also closes the low GHSA-9jrq-w75r-8gcw.
- [ ] **medium 6.3** GHSA-698v-4r3x-3vcv (CVE-2026-112943) · npm `vite` 8.3.0 → fix 8.3.3 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-698v-4r3x-3vcv:npm/vite -->
  launch-editor: escapeCmdArgs() omits % escaping on Windows https://osv.dev/vulnerability/GHSA-698v-4r3x-3vcv
  Triage (2026-10-26): dev-only, not applicable — launch-editor %-escaping on Windows only (Linux dev machine). Closed by vite 8.3.5 (direct patch bump).
- [ ] **medium 6.3** GHSA-r825-w8mm-5pxw (CVE-2026-112944) · npm `vite` 8.3.0 → fix 8.3.3 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-r825-w8mm-5pxw:npm/vite -->
  launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors https://osv.dev/vulnerability/GHSA-r825-w8mm-5pxw
  Triage (2026-10-26): dev-only — dev server open-in-editor path; needs an attacker-created file starting with + or - in the project dir AND Vim/Emacs as the launch editor; dev server binds localhost (no server.host in vite.config.ts). Low real risk; closed by vite 8.3.5.
- [ ] **medium 6.3** GHSA-rq7h-c2jc-7f22 (CVE-2026-112946) · npm `vite` 8.3.0 → fix 8.3.3 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-rq7h-c2jc-7f22:npm/vite -->
  Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine https://osv.dev/vulnerability/GHSA-rq7h-c2jc-7f22
  Triage (2026-10-26): not-reachable — requires the dev server exposed to the network (--host / server.host); vite.config.ts sets neither and the devcontainer forwards to localhost only. Dev server never runs in production (nginx serves dist/). Closed by vite 8.3.5.
- [ ] **medium 6.3** GHSA-vfpm-58rq-9qcg (CVE-2026-112947) · npm `vite` 8.3.0 → fix 8.3.3 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-vfpm-58rq-9qcg:npm/vite -->
  Vite: First 4 bytes of files outside of `server.fs` setting is exposed by `?vite-wasm-instance` https://osv.dev/vulnerability/GHSA-vfpm-58rq-9qcg
  Triage (2026-10-26): dev-only — `?vite-wasm-instance` is a dev-server endpoint, localhost-bound here, and the project has no .wasm. Closed by vite 8.3.5.
- [ ] **medium 6.1** GHSA-w74x-v6f9-j3xg (CVE-2026-110306) · npm `fast-uri` 3.1.8 → fix 3.1.9 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-w74x-v6f9-j3xg:npm/fast-uri -->
  fast-uri vulnerable to URI scheme spoofing via percent-encoded scheme decoding https://osv.dev/vulnerability/GHSA-w74x-v6f9-j3xg
  Triage (2026-10-26): dev-only (build-time) — via vite-plugin-pwa 1.3.0 -> workbox-build 7.4.1 -> ajv 8.20.0, which validates the workbox config at build time from static input; fast-uri is not in dist/ (grep). Fix 3.1.9 inside ajv's ^3.0.1 range: lockfile refresh of fast-uri, non-breaking; also closes the two low fast-uri advisories.
- [ ] **medium 5.9** GHSA-xp26-3454-mjgp (CVE-2026-112950) · npm `@vitest/mocker` 5.0.1 → fix 5.0.3 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-xp26-3454-mjgp:npm/@vitest/mocker -->
  Vitest: Windows backslash traversal bypasses the @vitest/mocker redirect allowlist fix https://osv.dev/vulnerability/GHSA-xp26-3454-mjgp
  Triage (2026-10-26): dev-only, not applicable — Windows backslash traversal; dev machine is Linux. Test-only via vitest 5.0.1, which pins @vitest/mocker exactly: fix is vitest 5.0.1 -> 5.0.3 together with @vitest/coverage-v8 5.0.1 -> 5.0.3 (exact peer), patch, non-breaking.
- [ ] **medium 5.9** GHSA-4qv8-2p9j-2685 (CVE-2026-109924) · npm `undici` 8.11.0 → fix 8.12.2 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-4qv8-2p9j-2685:npm/undici -->
  undici vulnerable to Denial of Service via unbounded memory in the EventSource parser https://osv.dev/vulnerability/GHSA-4qv8-2p9j-2685
  Triage (2026-10-26): dev-only — same undici 8.11.0 via jsdom (tests only), EventSource not used by the app or tests; closed by undici 8.12.2 (lockfile refresh, non-breaking).
- [ ] **medium 5.9** GHSA-f72v-6w45-q472 (CVE-2026-109841) · npm `undici` 8.11.0 → fix 8.12.2 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-f72v-6w45-q472:npm/undici -->
  undici vulnerable to Subresource Integrity bypass via non-lowercase algorithm tokens https://osv.dev/vulnerability/GHSA-f72v-6w45-q472
  Triage (2026-10-26): dev-only — same undici 8.11.0 via jsdom (tests only); SRI checks in undici fetch play no part in the shipped static app (the browser does SRI); closed by undici 8.12.2.
- [ ] **medium 4.8** GHSA-wjr9-j795-jxcr (CVE-2026-110180) · npm `fast-uri` 3.1.8 → fix 3.1.9 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-wjr9-j795-jxcr:npm/fast-uri -->
  fast-uri vulnerable to host confusion via unchecked WHATWG host canonicalization https://osv.dev/vulnerability/GHSA-wjr9-j795-jxcr
  Triage (2026-10-26): dev-only (build-time) — same path (workbox-build -> ajv), static build-time input only, not shipped. Closed by fast-uri 3.1.9 (lockfile refresh).
- [ ] **medium 4.7** GHSA-qxg6-89mg-rqv8 (CVE-2026-112949) · npm `@vitest/mocker` 5.0.1 → fix 5.0.3 · `package-lock.json` · found 2026-10-26 <!-- cve-watch:GHSA-qxg6-89mg-rqv8:npm/@vitest/mocker -->
  Vitest: Code injection via unauthenticated manual mock registration https://osv.dev/vulnerability/GHSA-qxg6-89mg-rqv8
  Triage (2026-10-26): not-reachable — needs a client reaching the Vitest dev-server WebSocket (browser mode / UI); the project runs vitest headless with jsdom, no @vitest/browser or @vitest/ui. Closed by vitest 5.0.3 + @vitest/coverage-v8 5.0.3.
