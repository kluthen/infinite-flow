# C. Tooling and Tone.js: external research for the v3.4 structural review

> Kept copy. Written 2026-11-22; external research, with its measurements run in scratch directories outside this repository, so no commit of it was measured. Scratchpad paths inside are historical: the scratchpad is not kept.

Research date: 2026-11-22. Read-only. No change was made to the repository. The measurements were run in throwaway
directories under the session scratchpad, never in the repo.

Baseline versions. The project's lockfile pins vite 8.3.5 (Rolldown 1.2.15), vitest 5.0.3, typescript 6.0.3,
vue-tsc 3.3.11, eslint 10.11.0, typescript-eslint 8.70.1, @playwright/test 1.63.0, vite-plugin-pwa 1.3.0 and vue 3.5.43.
The latest versions on npm today are vite 8.3.8, vitest 5.1.1, typescript 7.0.2 (the native Go compiler, whose JS API is
exported only under `./unstable/*`), eslint 10.15.0, @playwright/test 1.65.1, pnpm 12.21.0 and npm 12.2.0.
Note: the brief says "Vite 6/7", but the app is on **Vite 8, which bundles with Rolldown**. Everything below was checked
against Vite 8.

The CSP that matters for Tone.js is in `/home/bastien/work/infinite_flow/docker/security-headers.conf:33`:
`script-src 'self'; ... worker-src 'self'`. It does not allow `blob:`.

---

## 1. Splitting into packages inside one repo

### 1.1 npm workspaces and pnpm workspaces

- **npm workspaces.** You declare them in the root `package.json` `workspaces` field. `npm install` symlinks each
  workspace into `node_modules` ("automates the linking process as part of `npm install`"). You run commands with
  `-w <name>` or `--workspaces`. A dependency between workspaces is written as a normal semver range such as `^1.0.0`;
  npm has no `workspace:` protocol. Install strategy defaults to `hoisted`, and the docs recommend `--install-strategy=linked`
  during development to catch undeclared dependencies.
  Sources: https://docs.npmjs.com/cli/v11/using-npm/workspaces and https://docs.npmjs.com/cli/v11/using-npm/config
  (the v11 pages are marked "Legacy"; npm 12.2.0 is current).
- **pnpm workspaces.** You declare them in `pnpm-workspace.yaml`. The `workspace:` protocol makes pnpm "refuse to resolve
  to anything other than a local workspace package". On publish it rewrites `workspace:^` and similar into real ranges.
  `linkWorkspacePackages` defaults to `false`. Each project gets symlinks only to the dependencies it declares, so a
  missing dependency declaration fails loudly. Since v12.7.0, `pnpm install` creates `pnpm-workspace.yaml` from an
  existing npm `workspaces` field. Source: https://pnpm.io/workspaces.
- **For this project.** It has one lockfile (npm), and the owner limits which tools get kept, so **npm workspaces is the
  lower-friction choice**. pnpm's strictness against phantom dependencies is its only real advantage here. You can get
  most of that benefit by declaring each package's dependencies explicitly and adding a boundary lint (section 2).
  The app's `package.json` uses `"latest"` for every specifier. That is workable inside one lockfile, but a published or
  shared library needs real semver ranges and `peerDependencies`. This matters most for Tone.js, which must not be
  duplicated (see 7.4).

### 1.2 TypeScript project references, `composite` and `paths`

- `composite` forces `declaration` on and requires every implementation file to be matched by `include`/`files`.
  `rootDir` defaults to the tsconfig's directory. When you import from a referenced project, TypeScript "load[s] its
  output declaration file (.d.ts)". Only `tsc -b` builds references in dependency order, and `-b` behaves as if
  `noEmitOnError` were on. Source: https://www.typescriptlang.org/docs/handbook/project-references.html. The app already
  uses a solution `tsconfig.json` with `files: []` and app/node/e2e references, and runs `vue-tsc --build --force`.
  Adding a library is one more reference.
- **Two ways to consume the library:**
  1. **Source-first ("Just-in-Time").** The library's `exports` points at `.ts` source and the consuming bundler
     compiles it. Vite does this natively: a workspace package resolves outside `node_modules`, so Vite "treats the
     linked dep as source code", does not pre-bundle it and gives full HMR. This requires the dependency to be ESM.
     Source: https://vite.dev/guide/dep-pre-bundling (v8.3.7 page). Limitations given by Turborepo
     (https://turborepo.dev/docs/core-concepts/internal-packages): a JIT package "can't use `compilerOptions.paths`"
     (use Node subpath imports `#...` instead), its build cannot be cached, and a type error in the library breaks
     type-checking of every dependent. One more consequence, which follows from how TypeScript works rather than from
     any doc: when the app imports the library's `.ts` files, the app's compiler options check them. Today that means
     `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`. So the library must compile under the strictest
     consumer, and a future game app with looser or different options would see different errors.
  2. **Built `dist` (Compiled package).** `exports.default` points at `./dist/*.js`, built by `tsc`. `types` points at
     the `.d.ts` files, or at the source if you add a `source` condition. Turborepo: "The majority of Compiled Packages
     should use `tsc`". A common hybrid is a custom `"source"` export condition, enabled in Vite through
     `resolve.conditions`. Vite's default `resolve.conditions` is `['module','browser','development|production']`, and
     you add the custom name to it (https://vite.dev/config/shared-options). For type-checking, use tsconfig
     `customConditions`. I did not open the TS reference page for `customConditions` in this pass; the option has
     existed since TS 5.0.
- **`paths` across packages.** Keep `paths` (like today's `@/*`) inside the app only. The library should import itself
  relatively, or through `#` subpath imports. A `paths` alias that reaches into another package's `src` bypasses its
  `exports`, and so bypasses the boundary.

### 1.3 Vite library mode, or no build at all, for an internal library

- Library mode (`build.lib`) exists to bundle "for distribution" (https://vite.dev/guide/build, v8.3.7). It does not
  produce `.d.ts` files (the page does not mention type output). The page itself points to tsdown or Rolldown for
  non-browser libraries.
- **When the only consumers are Vite apps, no build is needed.** Ship source, or plain `tsc` output that keeps the ESM
  module graph and the `new URL(...)` expressions intact. Pre-bundling a library that contains Web Workers in library
  mode is known to break them. Vite issue **#15618** (open since 2024-01, last activity 2025-03) reports that "Bundling
  a worker in library mode results in 404 when using the library"; the only workaround is `?worker&inline`, which
  inlines the worker. https://github.com/vitejs/vite/issues/15618

### 1.4 Web Workers inside a library package

- Vite detects a worker only when `new URL()` appears directly inside `new Worker()`, and every option must be static
  (https://vite.dev/guide/features, v8.3.7). The app already writes it this way.
- **Across package boundaries:**
  - *Workspace or linked package (resolved outside `node_modules`):* Vite treats it as source, so the pattern works
    exactly as it does in the app.
  - *Package inside `node_modules` (git dependency, registry, file: with install-links):* Vite pre-bundles it in dev.
    For years that broke `new URL(..., import.meta.url)`, because the code moved to `node_modules/.vite/deps` (#8427,
    #20859). Vite **8.0** fixed relative paths: PR **#21434**, merged 2026-01-26, merge commit `ca96cbc8eff2`,
    https://github.com/vitejs/vite/pull/21434. A follow-up regression for *bare-specifier* URLs such as
    `new URL('pkg/worker.js', import.meta.url)` was reported as #23785 (2026-10-16, closed as a duplicate).
    The robust workaround is `optimizeDeps.exclude: ['<lib>']`, which works because the library is pure ESM. The
    worker files must also be listed in the package's `files`.
  - **Recommendation:** keep `new Worker(...)` in the *consuming app*. The library exports pure functions, and the app
    owns the worker entry file, which imports those functions. That avoids every cross-package worker problem, and the
    game app can choose its own threading.

### 1.5 Vitest across packages

- Vitest 5.1.1 docs (https://vitest.dev/guide/projects): `test.projects` takes globs (`packages/*`), config paths or
  inline configs. "The `workspace` is deprecated since 3.2 and replaced with the `projects` configuration." Inline
  projects inherit root options (`extends`, on by default since 5.0). Projects referenced by file do not inherit them;
  use `mergeConfig` for those. `coverage` and `reporters` are root-only. You filter with `vitest --project <name>`.
- Fit: a `jsdom` project for the app and a `node` project for the pure library. The node project also proves that the
  library has no DOM dependency.

### 1.6 Playwright across packages

- Playwright has no workspace feature. A "project" is a group of tests sharing one config
  (https://playwright.dev/docs/test-projects). `webServer` accepts an array, so one config can start several apps
  ("Multiple web servers ... providing an array of `webServer` configurations"; https://playwright.dev/docs/test-webserver).
  In practice, e2e stays with the app that it tests. The library needs no e2e.

### 1.7 ESLint flat config across packages

- ESLint looks for config "in the directory that contains the file and then searching up ancestor directories". The
  docs say this "improves support for monorepos". `basePath` scopes a config object to a subdirectory
  (https://eslint.org/docs/latest/use/configure/configuration-files; the latest version listed there is v10.15.0).
  A single root `eslint.config.js` with `files`/`basePath` blocks per package is the simplest option. Per-package
  config files also work.

### 1.8 Typical pitfalls and migration order

Pitfalls: phantom dependencies under npm hoisting; two copies of a shared runtime dependency (Tone, Vue); `paths`
aliases that reach into another package's `src`; a source-first library being checked with the consumer's tsconfig;
workers in pre-built library output (#15618); and pre-bundling of `node_modules` packages that use
`new URL(import.meta.url)` (fixed for relative URLs in Vite 8.0).

Suggested order:
1. Move the code into folders (`src/lib/` or similar) with **enforced boundaries**: a lint rule (section 2) plus the
   existing `verify:boundaries` check. Make the library folder free of DOM, Vue and IndexedDB, and prove it with a
   Vitest `node` project.
2. Give the library its own `tsconfig` (composite) referenced from the solution config.
3. Only after that, turn the folder into a workspace package (`packages/<lib>`), source-first, and switch imports to
   the package name.
4. Only when the game app exists, decide whether to publish or split repositories (section 7).

---

## 2. Enforcing module boundaries without a split

| Tool | What it enforces | Status (npm/GitHub, 2026-11) | Flat config / ESLint 10 | Vue SFC | Cost |
|---|---|---|---|---|---|
| **dependency-cruiser** 18.8.0 (2026-11-16) | Graph rules: `forbidden`/`allowed` from/to path regexes, circular dependencies, orphans, undeclared or dev-only deps. Also produces reports and graphs (dot/svg). | Very active (commit on main 2026-11-22) | Not an ESLint plugin; its own CLI and config (`--init`) | Yes, uses the project's `@vue/compiler-sfc` ("Does this work with Vue? Yes", FAQ) | CLI run in CI; a separate config file; fast. Uses the project's own `typescript` package. |
| **eslint-plugin-boundaries** 7.4.4 (2026-11-15) | Classifies elements by path pattern and applies allow/disallow policies between types (default-deny), plus entry-point / private / unknown-file rules | Active (pushed 2026-11-22, about 1.0k stars). Peer `eslint >=6`. | Flat config | Works on whatever the parser gives it; eslint-plugin-vue's parser exposes `<script>` imports (not separately documented) | Lives in the existing ESLint run, with editor squiggles. Its default resolver is `eslint-import-resolver-node` (a dependency), so the `@/` alias and `.ts` resolution in practice need `eslint-import-resolver-typescript` (4.4.5). |
| **eslint-plugin-import** `no-restricted-paths` 2.32.0 (2025-06-20) | Zone rules (target/from/except) | **No release since 2025-06.** Peer `eslint ... ^9`. ESLint 10 support was merged in PR #3230 (2026-06-29) but is **not released**. | **Peer conflict with the project's ESLint 10** | Same as above | Not recommended |
| **eslint-plugin-import-x** `no-restricted-paths` 4.18.1 (2026-11-09) | The same zone rule (fork) | Active. Peer `eslint ^8.57 \|\| ^9 \|\| ^10` | Yes | Same | Cheap, but path zones only, with no element model |
| **Nx `@nx/enforce-module-boundaries`** (@nx/eslint-plugin 24.0.6) | Tag-based `depConstraints` between *projects* | Active | Flat config | n/a | Needs the Nx project graph: projects in `project.json` or a `nx` field. Not meant for a single-package repo, so adopting it means adopting Nx (https://nx.dev/docs/features/enforce-module-boundaries) |

**Best fit for a single Vite + Vue repo:** **eslint-plugin-boundaries**. It is ESLint-native, works with ESLint 10 flat
config, gives feedback in the editor and expresses "library must not import app, Vue, DOM or storage" as policies.
The one extra dependency is the TS resolver. Add **dependency-cruiser** only if you also want cycle and orphan detection
or a graph. It can be run once with `npx` in a throwaway checkout. Avoid eslint-plugin-import because of the peer
conflict. The repo's existing `scripts/verify-boundaries.mjs` already checks *output* chunks, which a lint rule cannot
do, so keep it.

Sources: https://github.com/sverweij/dependency-cruiser and its FAQ (`doc/faq.md`, Vue and TS answers);
https://www.jsboundaries.dev/docs/overview/; https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-restricted-paths.md;
https://github.com/import-js/eslint-plugin-import/pull/3230; npm registry metadata (versions, peers, dates).

---

## 3. Bundle analysis on Vite 8 (Rolldown): which tool gives per-module *minified* bytes

**Measured**, not just documented. I built Tone.js 15.1.22 (6 classes + `setContext`) with Vite 8.3.5,
`minify: true, sourcemap: true`, and ran every tool on the same build. The chunk was 245.3 KiB.

| Tool (version) | Per-module figure | Result |
|---|---|---|
| rollup-plugin-visualizer 7.1.3, `sourcemap: false` (default) | `renderedLength` = **pre-minification** | 565.7 KiB total, **2.3x the real chunk**. Wrong for budget work. |
| rollup-plugin-visualizer 7.1.3, `sourcemap: true` | from the sourcemap of the minified output | 239.9 KiB total; standardized-audio-context 94.3 KiB. Correct. `gzipLength` per module came out 0 in this mode (observed). |
| sonda 0.14.0 (2026-07-05) | from the final sourcemaps ("captures tree-shaking and minification") | Same numbers as visualizer+sourcemap (94.3 / 64.7 / 32.7 KiB), and the asset gzip (60.1 KiB). Has a Vite plugin and Rolldown support. |
| source-map-explorer 2.5.3 (last release 2022-09) | sourcemap of the built file | **Fails on Rolldown sourcemaps** ("generated column Infinity"). Works with `--no-border-checks`: 245.3 KiB, 355 files, 94.3 KiB for SAC. |
| vite-bundle-visualizer 1.2.1 (2024-05) | CLI wrapper around rollup-plugin-visualizer **^5.11** | Not tested. Old and unmaintained wrapper; it has a `--sourcemap` flag. The visualizer it bundles predates Rolldown support (7.x declares a `rolldown` peer). |

- The project's own `scripts/module-graph-plugin.mjs` reads Rolldown's module data. Rolldown's `chunk.modules[].renderedLength`
  is pre-minification too: for the bare Tone import it reports 534 KiB against 224 KiB minified. Any per-module figure
  taken from that data should be read as pre-minify. The chunk budgets in `verify-boundaries.mjs` use file sizes on
  disk, which are correct.
- **Run-once without committing:** in a throwaway checkout, add the plugin to `vite.config.ts` locally (for example
  `visualizer({ sourcemap: true, template: 'raw-data' | 'treemap' })` or `Sonda({ open: false, format: 'json', gzip: true })`)
  with `build.sourcemap: true`, run `vite build`, then discard the change. Or run
  `npx source-map-explorer dist/assets/*.js --no-border-checks` on a sourcemapped build.
  **Recommendation: Sonda, or rollup-plugin-visualizer with `sourcemap: true`.**
- Sources: https://github.com/btd/rollup-plugin-visualizer (the `sourcemap` option: "Use source maps for module size
  calculations ... Keep this plugin last"); https://sonda.dev/ and https://sonda.dev/configuration.html; npm metadata.

## 4. Duplication detection (TS + Vue)

- **jscpd 5.4.3** (2026-11-08). v5 is a **Rust engine shipped as a self-contained binary** ("no runtime required").
  v4, the TypeScript engine, lives on as `jscpd@4`. It has 224 formats, with "embedded-language extraction for Vue,
  Svelte, Astro, Markdown and Razor". It runs once with `npx jscpd .` and reads its config from `.jscpd.json` or the
  `jscpd` key. It has many reporters, including json, html, markdown, sarif and `ai`. Symlinks are skipped by default
  in v5. The README does not say whether a `.vue` file is split into script and template blocks (that is in
  `FORMATS.md`, not checked). Source: https://github.com/kucherenko/jscpd.
- No alternative worth adding was found. jscpd's npx single-run mode fits the "throwaway checkout" rule.

## 5. Dead code and unused exports: knip

- **knip 6.47.0** (2026-11-20). Its Vite plugin turns on when `vite`, `vitest` or `vite-plus` is a dependency, and it
  reads `vite.config.*` (https://knip.dev/reference/plugins/vite). The `.vue` compiler is built in and switches on
  automatically when Vue is a dependency. It is **regex-based, collecting `import` statements only**: "unused exports
  inside these files go unreported". For better accuracy you can override it with `vue/compiler-sfc`, using the
  example on the docs page (https://knip.dev/features/compilers).
- What this means for accuracy here: knip finds unused *files*, *dependencies* and *exports from `.ts` modules*
  reliably. It does not report unused exports *inside* `.vue` files. The several extra configs (`vitest.*.config.ts`,
  `vite.*-harness.config.ts`, `scripts/*.mjs`) probably need explicit `entry` patterns, or they will show up as false
  "unused files". That is an inference; I did not run knip on the repo.
- Workspaces are supported natively: it reads `workspaces` / `pnpm-workspace.yaml`, takes per-workspace `entry` and
  `project`, and filters with `--workspace`. This is useful later to find library exports that no consumer uses
  (https://knip.dev/features/monorepos-and-workspaces). To run it once in a throwaway checkout: `npx knip`.

---

## 6. Tone.js today

### 6.1 Version and maintenance

- **npm `latest` = 15.1.22**, published 2025-04-27. Its GitHub release object is dated 2026-07-12; git tag commit
  `d2d52ffa8803b35debd9f19f2da08ad1c3540de0`. **npm `next` = 15.5.73**, published 2026-11-20 at commit
  `b48d2990b92e8c1068ea912a43dd5fd3ac6f64c3`. The `next` line moves fast (15.2.0 2025-05, 15.3.0 2025-09, 15.4.0
  2026-01, 15.5.0 2026-02, with about 70 patch releases since) and every merge to `dev` is published. **Nothing newer
  than 15.1.22 has been promoted to `latest` in about 19 months.** So the autoplay-warning and other fixes from
  2025-26 exist only on `next`.
- The repo is active: default branch `dev`, last push 2026-11-20, about 14.9k stars, 54 open issues. The maintainer
  (tambien) and outside contributors merged fixes in Nov 2026. License: MIT. Runtime dependencies:
  `standardized-audio-context ^25.3.70` (last release 25.3.77, 2024-08-31) and `tslib`. There is **no `sideEffects`
  field and no `exports` map** in either 15.1.22 or 15.5.73.

### 6.2 Size: measured with Vite 8.3.5 (Rolldown), minify on; gzip level 9; KiB = 1024 B

| Import | 15.1.22 min / gzip / brotli | 15.5.73 (`next`) min / gzip |
|---|---|---|
| `import 'tone'` (nothing used) | **224.2 / 55.8 / 47.8** | 232.4 / 58.0 |
| `{ setContext, getContext }` | 224.3 / 55.8 | 232.5 / 58.1 |
| `{ PolySynth, Synth }` | 228.4 / 56.7 | 236.5 / 59.0 |
| `{ FMSynth }` | 226.9 / 56.0 | 235.0 / 58.3 |
| `{ MembraneSynth }` | 224.2 / 55.8 | 232.4 / 58.0 |
| `{ NoiseSynth }` | 227.6 / 56.5 | 235.7 / 58.7 |
| `{ MetalSynth }` | 231.4 / 57.1 | 239.6 / 59.5 |
| `{ Reverb }` | 230.0 / 57.0 | 238.3 / 59.3 |
| **all six + setContext** | **245.2 / 59.8 / 51.4** | 253.5 / 62.4 |
| `import * as Tone` (full) | 333.2 / 76.9 / 65.0 | 342.9 / 80.1 |
| prebuilt UMD `build/Tone.js` | 337.4 / 77.6 | 348.1 / 80.8 |
| deep imports `tone/build/esm/...` (bypassing `index.js`), all six | 227.6 / 55.7 | – |
| deep import, FMSynth + setContext only | 206.2 / 50.9 | – |

- Cross-check: bundlephobia reports tone@15.1.22 at **336,893 B min / 76,599 B gzip, `hasSideEffects: true`**
  (https://bundlephobia.com/package/tone@15.1.22). That matches the full build above.
- **Tree-shaking barely works.** About 224 KiB minified (about 56 KiB gzip) stays even when nothing is used. The six
  wanted classes add only about 21 KiB on top. Composition of that floor (pre-minify renderedLength of the bare build):
  standardized-audio-context 318 KiB, tone/core 110 KiB, tone/source 46 KiB, automation-events 17 KiB. In the
  minified set build, standardized-audio-context accounts for 94.3 of the 245 KiB.
  - Cause 1: `Tone/index.ts` evaluates singletons at module load, `export const Transport = getContext().transport`
    (L39) and `export const context = getContext()` (L110).
    https://github.com/Tonejs/Tone.js/blob/d2d52ffa8803b35debd9f19f2da08ad1c3540de0/Tone/index.ts#L39 and
    https://github.com/Tonejs/Tone.js/blob/d2d52ffa8803b35debd9f19f2da08ad1c3540de0/Tone/index.ts#L110. The same
    lines are still there on `next`:
    https://github.com/Tonejs/Tone.js/blob/b48d2990b92e8c1068ea912a43dd5fd3ac6f64c3/Tone/index.ts#L42
  - Cause 2: with no `sideEffects: false`, every module's top-level `onContextInit(...)` registration (for example
    Transport.ts L817) and the `standardized-audio-context` graph are kept. Deep imports skip `index.ts`, but the core
    graph still weighs about 206 KiB for one synth.
  - History: tree-shaking was requested in #773 (2020). #1102 ("import * as Tone produces warnings due to module side
    effects", 2022) was closed in 2025-05. PR **#1336** (`tone/no-side-effects` route) was **closed unmerged**
    on 2025-05-18. The maintainer prefers a future `"tone/no-globals"` route plus deprecation warnings (comment of
    2025-04-12 on #1102). No such route exists in 15.5.73.
- **Against the 400 KiB start-up budget:** Tone would eat more than half of it (about 245 KiB) if it were in the
  first load. **It has to be a lazy chunk** (dynamic `import('tone')` behind the gesture that starts audio), the way
  Jam's code is kept out of the first load today. The service worker would still precache it (about 60 KiB gzip).

### 6.3 Using Tone with an existing AudioContext and no Transport

- `setContext(ctx)` wraps a native `AudioContext` in a Tone `Context`. With a native context, Tone creates its nodes
  through the raw context, and `createAudioWorkletNode` picks the **native** `AudioWorkletNode`
  (`Tone/core/context/AudioContext.ts` L64-L76).
  https://github.com/Tonejs/Tone.js/blob/d2d52ffa8803b35debd9f19f2da08ad1c3540de0/Tone/core/context/AudioContext.ts#L64-L76.
  `setContext` itself is at
  https://github.com/Tonejs/Tone.js/blob/d2d52ffa8803b35debd9f19f2da08ad1c3540de0/Tone/core/Global.ts#L44.
- **Caveat A: importing `tone` creates a second AudioContext.** `getContext()` runs at import (index.ts L39). If no
  context has been set yet, it calls `setContext(new Context())` (Global.ts L33), which builds a
  standardized-audio-context `AudioContext` (Context.ts L119). Call `setContext(appCtx, true)` right after import.
  The second argument disposes the auto-created one. Importing also prints a console banner unless
  `window.TONE_SILENCE_LOGGING` is set (Global.ts L81).
- **Caveat B: "Transport disabled" is not the same as "no Tone clock".** Every `Context` builds a Transport through
  `onContextInit` (Transport.ts L817), but the Transport only schedules once it is started. What *always* runs is the
  Context's **Ticker** (Context.ts L125; default `clockSource: "worker"`, L148, with `lookAhead` 0.1 and
  `updateInterval` 0.05). The instruments need it: **PolySynth** frees voices with `context.setInterval`
  (PolySynth.ts L167) and defers far-future notes with `context.setTimeout` (L315). **OneShotSource**, the base of the
  envelope and buffer sources, schedules its stop with `context.setTimeout` (OneShotSource.ts L185). So you can leave
  the Transport unused, but you cannot turn the ticker off: `clockSource: "offline"` would leave voices unreleased.
  Pass explicit AudioContext times from the app's own scheduler, e.g. `triggerAttackRelease(note, dur, time)`. When no
  time is given, Tone's `now()` is `currentTime + lookAhead` (Context.ts L464-L466), which adds 100 ms unless you set
  `lookAhead` to 0.
  Links: https://github.com/Tonejs/Tone.js/blob/d2d52ffa8803b35debd9f19f2da08ad1c3540de0/Tone/core/context/Context.ts#L125
  and https://github.com/Tonejs/Tone.js/blob/d2d52ffa8803b35debd9f19f2da08ad1c3540de0/Tone/instrument/PolySynth.ts#L167
- **Caveat C: conflict with this app's CSP.** The Ticker's worker is `new Worker(URL.createObjectURL(blob))`
  (Ticker.ts L84), and that needs `worker-src blob:`. The app's CSP is `worker-src 'self'`. Tone catches a synchronous
  failure and falls back to `setTimeout` (Ticker.ts L108-L110), which is throttled in background tabs. Whether a CSP
  block throws synchronously depends on the browser; I did not test it. Tone's AudioWorklets (BitCrusher, and
  FeedbackCombFilter behind PluckSynth, Freeverb and JCReverb) load through **blob: URLs** (ToneAudioWorklet.ts L53),
  which `script-src 'self'` blocks. **None of the six requested classes uses an AudioWorklet**: Reverb is a
  ConvolverNode whose impulse response is rendered offline from Noise.
  Links: https://github.com/Tonejs/Tone.js/blob/d2d52ffa8803b35debd9f19f2da08ad1c3540de0/Tone/core/clock/Ticker.ts#L84
  and https://github.com/Tonejs/Tone.js/blob/d2d52ffa8803b35debd9f19f2da08ad1c3540de0/Tone/core/worklet/ToneAudioWorklet.ts#L53
- **Caveat D: the repo's own boundary scan.** `verify-boundaries.mjs` bans `decodeAudioData`, `createBufferSource`,
  `createMediaElementSource`, `new AudioBuffer(` and `fetch(` in authored `src/` files. The build-output scan checks
  only file extensions. The Tone bundle contains every one of these tokens even when only synths are imported (bare
  import: 13x createBufferSource, 8x decodeAudioData, 5x createMediaElementSource, 2x fetch(). NoiseSynth and Reverb
  really do use buffer sources, with generated noise rather than samples. The current rule passes, because it scans
  `src/` only. Any future rule that scans `dist/` or dependency code would fail with Tone.

### 6.4 Known issues (with dates)

- **Firefox and a custom native context:** #1457 (open, 2026-07-02). `Tone.setContext(new AudioContext());
  Tone.getDestination()` throws "param must be an AudioParam" on Firefox, because `Listener` wraps the
  `AudioListener.positionX..upZ` params, which Firefox lacks. Fix PR #1486 (open, 2026-08-31). **This hits exactly
  the setContext-with-our-own-context pattern on Firefox**, in both latest and next as of today.
- **Running without standardized-audio-context:** #1343 (open, 2025-05). PluckSynth's worklet misbehaves when Tone
  runs on a native context. #1423 (closed 2026-03): native nodes, such as WAM nodes, cannot be connected into a
  standardized-audio-context graph. With `setContext(native)` the graph is native, which avoids that problem.
- **Chrome autoplay warnings:** importing alone triggers "AudioContext was not allowed to start" (#443 from 2019,
  #1102). Constructing Effect/StereoEffect classes, Reverb included, on a suspended context triggers more warnings,
  which come from standardized-audio-context feature probes (#1392). That was fixed only on `next` (15.5.x, closed
  2026-02-23), with a reported but unreproduced dropout regression afterwards (comments of 2026-03 on #1392).
  The app's own gesture-started context avoids most of this, provided Tone nodes are created after the resume.
- **AudioWorklet:** #1038 (open since 2022, BitCrusher/PluckSynth errors) and #906 (Firefox BitCrusher). PR #1524
  (open, 2026-10-21) reworks the worklet build: TypeScript worklets, esbuild, **"Changed esm build path"**. If it
  merges, deep-import paths may change.
- **Mobile:** #1394 (closed 2026-02). Low volume in Android WebView; the maintainer's answer is that Tone wraps Web
  Audio and does not shim device quirks. #1420 (closed 2026-03): Android worklet timing and context errors. I found no
  official CPU or latency figures. Cost grows with node count, since each Synth voice is several nodes and PolySynth
  defaults to 32 voices; that is inference, not measured.

### 6.5 Alternatives

- Keep raw Web Audio (today's approach), maybe borrowing Tone's *designs* (FM, membrane and metal recipes) rather than
  its runtime. This costs 0 KiB and needs no CSP change.
- `@elemaudio/web-renderer` 4.0.3 (last release 2024-12, MIT) is WASM and stale. Strudel's `superdough` /
  `@strudel/webaudio` 1.3.0 is **AGPL-3.0** and sample-oriented, so it does not fit. No maintained, tree-shakeable
  Tone-equivalent was found.

---

## 7. Separate repositories (library repo, app repo, game repo)

### 7.1 How a Vite app can consume an internal TS library from another repo

| Mechanism | How | Pros | Cons |
|---|---|---|---|
| **git dependency** | `"lib": "github:owner/lib#v1.2.0"` or `git+https://...#semver:^1.2.0` | No registry, works with tags. npm clones and installs the exact commit-ish, and `#semver:` matches tags | If the package has a `prepare` script, npm installs its `dependencies` **and `devDependencies`** and runs `prepare` "before the package is packaged and installed". That is slow, needs the toolchain on every install, and the build output depends on the environment. Private repos need git credentials in CI. Lockfile pins the commit. |
| **GitHub Packages (npm registry)** | Scoped `@owner/lib`, with `.npmrc` `@owner:registry=https://npm.pkg.github.com` | Real semver, immutable tarballs, `npm audit`, normal installs | "You need an access token to publish, install, and delete private, internal, **and public** packages" (classic PAT). Scope is mandatory. Cross-repo installs need `read:packages`, or a `GITHUB_TOKEN` that was granted access. |
| **public npm** | `npm publish` | Simplest consumption | Public, unless paid private. |
| **git submodule** | The superproject records one commit of the library | Source available for source-first use | Detached-HEAD pitfall ("changes will quite possibly be lost the next time you run `git submodule update`"). Clones need `--recurse-submodules`. Every library bump is a superproject commit. |
| **git subtree** | Library history merged into a subfolder | Plain checkouts | Manual push and pull of changes. Not a dependency boundary. |
| **tarball URL** | `npm install https://.../lib-1.2.0.tgz` (e.g. a GitHub Release asset) | Immutable and prebuilt | Hand-made release flow |

Sources: https://docs.npmjs.com/cli/v11/commands/npm-install, https://docs.npmjs.com/cli/v11/using-npm/scripts,
https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry,
https://git-scm.com/book/en/v2/Git-Tools-Submodules.

### 7.2 Source or built output, and types

- From another repo the library lands in `node_modules`, so Vite **pre-bundles** it in dev and does not watch it
  ("not possible to watch files and packages in `node_modules`", https://vite.dev/config/server-options; #8619).
  Shipping plain **`tsc` output (ESM `.js` + `.d.ts` + `declarationMap`)** is the robust choice. Every consumer
  works, the consumer's tsconfig strictness does not apply to it, and types survive. Raw `.ts` in `node_modules`
  works with Vite, but `vue-tsc`/`tsc` would type-check it under the consumer's options (see 1.2), and non-Vite
  consumers would break.
- Library workers: see 1.4. The recommendation is that the app owns `new Worker`. Otherwise use
  `optimizeDeps.exclude`, and avoid Vite library mode for worker code (#15618).
- Declare Tone as a **`peerDependency`** of the library (with a range) if the library ever touches Tone, so the app
  and the game each provide exactly one copy. Two copies would mean two global `getContext()` singletons.

### 7.3 Versioning and release flow

- semver tags on the library repo. **Changesets** (`@changesets/cli` 3.0.3, 2026-09-14; engines npm >=10.9, node ^22.11)
  manages version bumps, changelogs and publishing. It is focused on monorepos, but "the workflow is also beneficial
  for single package repos" (https://github.com/changesets/changesets). Turborepo also recommends changesets for
  publishable packages. A lighter option with no tool: a manual `npm version` + tag + CHANGELOG.

### 7.4 Local development across repos

- `npm link`, or `"lib": "file:../lib"` (npm's `install-links` defaults to `false`, so file: deps are symlinked):
  the symlink resolves outside `node_modules`, so Vite treats it as **source** with HMR. Pitfalls:
  - Two copies of shared dependencies: if the linked repo has its own `node_modules` with Tone or Vue, use
    `resolve.dedupe` ("force Vite to always resolve listed dependencies to the same copy (from project root)").
  - `server.fs.allow`: automatic root detection covers only a workspace root. A sibling repo outside it may need
    `searchForWorkspaceRoot(...)` plus the sibling path.
  - Pre-bundle cache: restart with `--force` after changes, per the pre-bundling docs.
  - `vite.config.ts` cannot import untranspiled TS from a symlinked package (#5370, open).
  - A local link differs from what CI installs, so a release tag can break where the local setup did not.
- A "workspace of repos" (a parent folder with a `workspaces` field over separately cloned repos) brings these same
  pitfalls plus nested `.git` directories. Not recommended.

### 7.5 CI implications

- Each repo needs its own pipeline. The library publishes, or tags, before the app can consume a change, so every
  cross-cutting change becomes two PRs and a release. Private git or GitHub Packages access needs tokens in CI. The
  app's `npm audit`, `.tech` and SECURITY_TODO tracking would then include the library as a dependency. Renovate or
  Dependabot can open bump PRs.
- In a monorepo, one PR changes the library and the app atomically. One `npm run quality` covers both, and boundary
  lint stops coupling.

### 7.6 Trade-off

- **Monorepo with enforced boundaries (packages/lib + apps/*)**: atomic changes, no release ceremony, source-first
  HMR, one lockfile and one security inventory. The risk is coupling, which the boundary lint plus a Vitest `node`
  project for the library prevent.
- **Separate repos**: hard isolation, independent release cadence, and a game repo that can be public or private on
  its own terms. The cost is versioning and release work, double CI, token management and slower iteration while the
  library API is still moving.
- **Ordering suggestion:** extract first inside this repo (section 1.8). Move the library to its own repo **only once
  its API is stable and the game app actually exists**. With `tsc` output and semver tags already in place, that move
  is mechanical: either a git dependency on a tag, if the `prepare` cost is acceptable, or GitHub Packages.

---

## Uncertainties

- I did not run knip, jscpd or dependency-cruiser on this repo, so the accuracy remarks come from docs only.
- I did not test whether a CSP-blocked blob Worker throws synchronously in each browser, which decides whether Tone
  falls back to setTimeout or fails silently.
- I did not test whether Tone's Reverb works when its OfflineContext buffer (standardized-audio-context) is fed into a
  native ConvolverNode under `setContext(nativeCtx)`.
- `customConditions` is from memory of TS docs; I did not fetch the page this pass.
- Every size above was measured with Vite 8.3.5 and default minification. A different minifier changes them by a
  few percent (bundlephobia's figure differs by about 1%).
