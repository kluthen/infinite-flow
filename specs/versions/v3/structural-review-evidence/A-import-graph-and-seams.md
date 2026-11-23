# v3.4 structural review — Part A: import graph and split seams

> Kept copy. Written 2026-11-22, measured on `main` 7af3628c, read-only. Scratchpad paths inside are historical: the scratchpad is not kept.

Measured 2026-11-22 on `main` at 7af3628c (/home/bastien/work/infinite_flow), read-only. Nothing in
the repo was changed, nothing installed. Method and scripts (all in this scratchpad folder):

- `graph.mjs` — parses every `.ts/.vue/.mjs/.js` under `src/`, `tests/`, `scripts/` with the repo's own
  TypeScript compiler (`node_modules/typescript`, 6.0.3; `.vue` files: `<script>` blocks only, line
  numbers kept). Records static imports (type-only flagged: `import type` or all-`type` specifiers),
  re-exports, dynamic `import('…')`, `import('…')` type nodes, `new URL('…', import.meta.url)` and
  every `import.meta`. Resolves `@/` and relative specifiers. Output `graph.json`
  (1,583 files, 10,863 edges). In `src/`: 2,970 src→src edges, 1,454 of them type-only, 1,371
  cross-area.
- `matrix.mjs` (area matrix, area/file SCCs), `closure.mjs` (seam leaks, closures), `pure.mjs`
  (per-area files whose whole import closure stays inside area + library), `workspace.mjs`
  (components/workspace), `tsc/*.json` (no-DOM type-checks, see §3.2).
- Counts are import *statements* (edges), file:line given where it matters. "t" = type-only (erased
  from the bundle), "d" = dynamic `import()` / worker URL.

## 1. Size by area today vs §4 (2026-10-21, 8c407e7)

Raw lines (`wc -l`, all files incl. template/style of `.vue`, tests are not under `src/`).
The 2026-10-21 column was re-measured from git (`git show 8c407e7:…`), not copied from §4.

| area | files 10-21 | lines 10-21 | files today | lines today | Δ lines |
|---|---|---|---|---|---|
| **src/ total** | 425 | 72,089 | 533 | 95,582 | +23,493 (+33 %) |
| components/ | 158 | 25,027 | 197 | 32,045 | +7,018 |
| – components/workspace/ | 109 | 17,221 | 139 | 23,347 | +6,126 |
| – components/review/ | | | 19 | 2,876 | |
| – components/controls/ | | | 22 | 2,691 | |
| – components/controller-connection/ | | | 10 | 1,647 | |
| – components/notation/ | | | 7 | 1,484 | |
| domain/ | 116 | 19,041 | 131 | 22,824 | +3,783 |
| session/ | 34 | 6,055 | 39 | 7,728 | +1,673 |
| storage/ | 27 | 5,451 | 32 | 7,094 | +1,643 |
| **jam/** (new) | 0 | 0 | 38 | 6,458 | +6,458 |
| notation/ | 13 | 2,978 | 14 | 3,335 | +357 |
| composables/ | 16 | 2,645 | 17 | 3,202 | +557 |
| generation-worker/ | 13 | 2,533 | 13 | 2,963 | +430 |
| styles/ | 4 | 2,520 | 4 | 2,894 | +374 |
| export/ | 19 | 2,279 | 19 | 2,714 | +435 |
| audio/ | 12 | 1,675 | 16 | 2,394 | +719 |
| midi/ | 8 | 1,488 | 8 | 1,488 | 0 (unchanged) |
| root files | | | 4 | App.vue 159, main.ts 16, storage-bootstrap.ts 259, env.d.ts 9 | |

Largest domain sub-areas today: generation 24 files/4,700, pitch 22/4,603, rhythm 19/4,274,
notation 8/1,753, profile 11/1,436, presets 5/1,060.

Other §4 facts re-checked:

- Still one npm package, no `workspaces` field (package.json, then and now). `tsconfig.json`
  references the same three projects (app, node, e2e); only alias `@/*` (tsconfig.app.json, vite,
  vitest, both harness configs).
- ESLint import rules are now **three**, not two: storage ban for `src/session/**` + `src/export/**`;
  VexFlow allowed in **five** `src/notation/vexflow-*.ts` files (was four; `vexflow-empty-system-
  engraver.ts` added); **new** Jam rule (`@typescript-eslint/no-restricted-imports`, static imports
  of `src/jam/**` banned outside `src/jam/` and `src/components/workspace/load-jam-mode.ts`, type
  imports allowed). Still no rule on `domain/` purity.
- `verify-boundaries.mjs` budgets now: startup JS (entry + static imports) 400 KiB
  (`startupJavaScriptByteBudget`, line 407), generation worker **170 KiB** (line 418, §4 said 150),
  VexFlow 800 KiB, other 100 KiB; plus the Jam first-load check from `dist/.vite/module-graph.json`.
- Atoms: 499 (154 ARCHITECTURE, 345 BUSINESS; §4: 412 = 125/287). Types: RULE 314, MODULE 109,
  REQUIREMENT 30, ENTITY 16, SERVICE 15, MECHANIC 5, API 1, CONTRACT 1.
- Runtime lazy sites in `src/`: 29 literal `import('…')` + 1 template `import()` (load-jam-mode.ts:43,
  retry URL) + 2 worker URLs (generation worker, wake timer). §4's "about 40" is not reproduced
  (raw `import(` text occurrences incl. comments/type refs: 57 today, 52 at 8c407e7).
- No barrel/index files anywhere in `src/` (0 `index.ts`): every consumer imports module internals
  directly.

## 2. The import graph between areas

### 2.1 Area × area matrix (src/ only; row imports column; total(type-only)[dynamic])

| from \ to | audio | compon | compos | domain | export | gen-wkr | jam | midi | notation | App.vue | st-boot | session | storage |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| audio | · |  |  | 14(7t) |  |  |  |  |  |  |  | 3(2t) |  |
| components | 28(24t) | · | 70(61t) | 221(138t) | 9(5t) | 5(1t)[1d] | 35(34t)[1d] | 26(22t) | 70(41t)[1d] |  | 9(9t) | 132(92t) | 68(47t)[5d] |
| composables |  |  | · | 58(34t) |  |  |  |  | 11(7t) |  |  |  | 6(5t) |
| **domain** |  |  |  | · |  |  |  |  |  |  |  |  |  |
| export |  |  |  | 17(13t) | · |  |  |  |  |  |  | 5(3t) |  |
| **generation-worker** |  |  |  | 80(32t) |  | · |  |  |  |  |  |  |  |
| jam | 3 | 19(7t) | 2(1t) | 131(65t) | 4(4t) |  | · | 4(4t) | 12(8t) |  |  | 20(14t) | 3(1t) |
| midi | 2(2t) |  |  | 6(4t) |  |  |  | · |  |  |  | 5(5t) |  |
| **notation** |  |  |  | 25(19t) |  |  |  |  | · |  |  |  |  |
| App.vue |  | 7(2t) |  |  |  |  |  |  | 1(1t) | · | 1(1t) |  |  |
| main.ts |  |  |  |  |  |  |  |  |  | 1 | 1 |  |  |
| storage-bootstrap.ts | 1 |  |  | 3(2t) |  |  |  |  |  |  | · |  | 7[1d] |
| session | 1 |  | 3(3t) | 124(64t) | 3(3t) | 1 |  |  | 2(1t) |  |  | · |  |
| storage | 2(1t) | 1(1t) | 1(1t) | 100(22t) |  |  |  |  |  |  |  | 7(5t) | · |

(main.ts also imports `styles/index.css`; styles/ has no TS edges; env.d.ts has none.)
External packages imported from src/: `vue` 119 (components 97+3t, jam 13, composables 4, App,
main), `vexflow/bravura` 5 (notation only), `virtual:pwa-register` 1 (main.ts:5).

Sinks: **domain/ imports nothing outside itself; generation-worker/ imports only domain/; notation/
imports only domain/ + VexFlow.** Everything else is inside one tangle.

### 2.2 Cycles

- Area level, all edges: **one SCC of 9 areas** — components, jam, storage, composables, session,
  export, audio, midi, storage-bootstrap.ts. Outside it: domain, generation-worker, notation (and
  App/main/styles).
- Area level, value edges only (what the bundler sees): two SCCs —
  - **session ↔ audio**: `src/session/count-in-display.ts:7` imports `beatAt, countInEndsAt,
    createClickPlan` from `audio/click-track.ts`; `src/audio/click-track.ts:9` imports
    `COUNT_IN_MEASURES` from `session/session-timing.ts`.
  - **jam ↔ components**: by design (components → jam only through `load-jam-mode.ts:41` dynamic
    import + 34 type imports; jam → components 12 value imports, e.g. `jam/JamControls.vue:20-23,34`
    → components/controls, `jam/JamStaff.vue:23-24,38` → components/notation and
    `components/workspace/use-jam-idle-cue.ts`, `jam/review/ReviewDoodle.vue:16,23` → components/review).
- Mutual area pairs (any edge kind): audio↔session 3/1, components↔storage 68/1, components↔jam
  35/19, composables↔storage 6/1, export↔session 5/3.
- File level, value edges: **1 cycle** — `components/workspace/ReviewArea.vue` ↔
  `components/review/load-review-panel.ts` (through the lazy loader's dynamic import, line 87).
- File level incl. type edges: 10 SCCs. The big one is **77 files** spanning storage/, components/,
  composables/, jam/ and storage-bootstrap.ts. It is caused by two type imports in one codec file:
  `src/storage/records/setting-defaults.ts:20` (`GeneratedNotesFormat` from
  `components/review/review-types.ts`) and `:21` (`ThemePreference` from
  `composables/generation-session-types.ts`). From there `review-types.ts:3` → notation loader,
  → `components/workspace/load-jam-mode.ts` (type) → `jam/jam-mode.ts` (type) → the whole UI.
  Consequence: the type closure of `storage/records/settings-record.ts` (and of `storage-port.ts`,
  through `database.ts:14` → `migrations/settings-v3.ts:17`) contains 58 components files, Vue and
  VexFlow. Others: a 20-file session SCC (type-only, session-types/session-intents/…), pairs in
  domain (`pitch/pitch-figures.ts` ↔ `pitch/pitch-types.ts`; `validation/generation-result-
  validator(-checks).ts`), session (`session-history.ts` ↔ `session-history-played-notes.ts`),
  workspace (several, incl. a 5-file my-instrument SCC and a 5-file review-host SCC).
- Inside domain/ (sub-folder level, value edges): cycles **{generation, pitch, rhythm, validation}**
  and **{presets, controls}**. E.g. `domain/pitch/pitch-advance.ts:2` → `generation/steering/pitch-
  steering.ts`, `pitch/pitch-context.ts:2-3` → `generation/carry-in/*`, `rhythm/rhythm-lock-order.ts:14`
  → `generation/orchestration/candidate-ranking.ts`, while generation/orchestration imports pitch and
  rhythm. Pitch → harmony value imports: `pitch/pitch-context.ts:5`, `pitch/pitch-harmony.ts:1`,
  `pitch/validation/join-rules.ts:25`, `pitch/validation/phrase-facts.ts:1-2`.

### 2.3 Where the graph contradicts the documents

README.md "Directory Boundaries" (lines 72–220) and "Architecture Overview" (271–433):

1. **jam/** (README:90–96) is described as "for now the doodle quantizer … pure, in whole numbers".
   Today it is 38 files / 6,458 lines with 10 `.vue` components, importing components (19),
   session (20), notation (12), export (4), midi (4), audio (3), storage (3: value
   `jam/jam-settings.ts:46-47` → `storage/record-envelope.ts`, `storage/records/settings-record.ts`).
2. **session/** "pure, Vue/browser-free … the runner that executes requests through the injected
   generate seam" (README:112–129): true for Vue/browser (all of session/ type-checks with no DOM lib
   except `session-runner.ts`'s AbortController), but it imports generation-worker by value
   (`session/session-runner.ts:16`, the worker client's error classes), audio by value
   (`count-in-display.ts:7`), notation by value (`session-window.ts:12-16`, breakpoints from
   `notation/notation-layout-policy.ts`), composables (types: `session-types.ts:8`,
   `session-runner.ts:13` → `composables/viewport-width.ts`; `stale-phrase-one.ts:9` →
   `composables/workspace-session-result.ts`) and export (types, `session-history-export.ts:14-16`).
3. **composables/** "no persistence" (README:135–140): `composables/generation-session-control-
   actions.ts:45` imports `chosenControlChanges, sameSelection` from `storage/settings-saver.ts`
   (value), 5 more type imports from storage/.
4. **storage/** "The rest of the app reaches it only through an injected port" (README:200): the
   port is injected, but components import storage/ directly 68 times, 21 by value
   (`storage/app-version.ts` ×5, `records/setting-defaults.ts` in `ScorePanel.vue:72` and
   `WorkspaceShell.vue:83`, `records/kept-session-summary.ts`, `storage-port.ts`,
   `storage-estimate.ts`, `settings-saver.ts`, `records/controller-record.ts`, and 5 dynamic imports
   of `records/kept-session-record.ts`). storage/ in turn imports session (7), audio (2), components
   (1 type) and composables (1 type) — a storage codec depends on UI types.
5. **export/** "pure, browser-free encoders" (README:106–111): the encoders are (13 of 19 files), but
   `export/browser-download.ts` uses `document`/`window`, and the file builders depend on session
   (`generated-notes-file.ts:14`, `played-notes-file.ts:16` → `session/session-history-export.ts`,
   value), which itself imports export's input types → export ↔ session cycle.
6. **Architecture Overview** "UI → session composables → Web Worker" (README:274–276): composables
   import no generation-worker code at all; the worker is created and wired in components
   (`components/workspace/create-workspace-session.ts:35-36,429`,
   `workspace-pregeneration-queue.ts:25`) and in session (`session-runner.ts:16`).
7. **notation/** "the concert-to-written transformation types and the VexFlow adapter" (README:99):
   the concert-to-written transformation lives in `domain/notation/written-phrase.ts`; notation/ holds
   the layout planner, overlays and the VexFlow adapter. "`vexflow-engraver-loader.ts` is the sole
   static importer of the engraver module" — confirmed (only a type import + `import()` at :34).
8. README:427 points at `specs/generator-architecture.md` (exists); there is **no
   `docs/generator-architecture.md`**.

`specs/generator-architecture.md`:

- line 123 "Individual planners do not select, instantiate, or import one another": pitch imports
  harmony (5 value edges above) and pitch/rhythm import generation/ (carry-in, steering,
  orchestration/candidate-ranking) — a domain-internal cycle.
- lines 21, 47, 112 ("does not own … browser APIs", "no Vue, browser, storage, or session"): hold for
  domain/ — verified by type-check (§3.2).

CODING_RULE.md:

- §1 "Module boundaries the project declares are enforced by a check … not by convention": only
  three import rules are enforced (storage ban, VexFlow, Jam). README's declared boundaries for
  domain/ ("pure, serializable, Vue/browser-free"), session/ ("Vue/browser-free"), composables/ ("no
  persistence") and components/ ("props-in/events-out") are convention only. ESLint gives
  `globals.browser` to all of `src/**` incl. domain/ (eslint.config.js, `files: ['src/**/*…']`).
  Partial guards exist only as source-scanning unit tests:
  `tests/unit/domain/presets/preset-model-purity.spec.ts` (domain/presets imports no
  components/storage/session/composables/worker, no clock/random) and
  `tests/unit/domain/figures/figure-levels.spec.ts` (6 domain folders don't branch on profile names).
- §4 "Cross-module references go through the owning module's interface": there are no module
  interfaces (no barrels); 1,371 cross-area imports reach individual files.

Architecture atoms (`docs/*.atom.md`, MODULE/SERVICE/API/CONTRACT = 126 files):

- `service_session_engine` (line 63), `module_session_pregeneration_plan` (38), `service_session_
  history` (28): "no browser API, no Vue, no clock read" — hold (no-DOM type-check passes).
- `module_kept_session_codec` (34, 37, 57): "history and export never import the codec / stay
  storage-free" — hold (no session→storage or export→storage edge).
- `module_jam_code_boundary` (21–32): "Nothing outside src/jam/ but the loader imports a src/jam/
  module statically, type-only aside" — holds (components→jam: 34 type + 1 dynamic). Its claim that
  Jam's pure reading code is Jam's is where the library question bites (§3.3).
- No atom states a dependency direction for domain/, generation-worker/, notation/ or storage/; none
  is contradicted by the graph.

## 3. The candidate LIBRARY (domain/ + generation-worker/ + pure music code)

### 3.1 Imports leaving the library

Scope tested: domain/ (130 .ts) + generation-worker/ (13) = 143 files, 25,930 lines.

- **Zero imports out of the set** into any other `src/` area; **zero package imports** (no vue,
  no vexflow); no `?raw`, `?worker`, `?url`, no virtual modules, no `__APP_VERSION__`/
  `__APP_COMMIT__`. Import style inside is 100 % relative (domain 548, generation-worker 102 edges,
  0 `@/`), so no alias to rewrite.
- Adding `export/midi/**` + `export/musicxml/**` (13 more files, 156 total, 28,038 lines): still zero
  leaks to app areas, but those encoders use `@/domain/...` 14 times (alias would need rewriting).

### 3.2 Type-check without DOM, Vue or Node types (strongest evidence)

`tsc -p tsc/tsconfig.domain.json` — same strict flags as tsconfig.app.json, `"lib": ["ES2023"]`,
`"types": []`, `isolatedModules`, `verbatimModuleSyntax`:

- **domain/ (130 files): 0 errors.** It needs neither DOM nor Node nor Vue types.
- domain + generation-worker + export encoders (`tsconfig.lib2.json`, `@/*` mapped): errors only in
  these places — the complete list of library leaks:

| # | file:line | what | how hard to cut |
|---|---|---|---|
| L1 | `src/generation-worker/browser-generation-worker.ts:15` | `new Worker(new URL('./generation.worker.ts', import.meta.url), { type: 'module' })` — the only `import.meta` in the library; bundler worker convention (Vite/webpack) | Medium. Keep as a browser-adapter entry of the library (or move it to the app and let each consumer create the worker); the consumer's bundler must handle a `.ts` worker from a package |
| L2 | `src/generation-worker/generation.worker.ts:25,41,47,49` | `new MessageChannel()`, `performance.now()`, `self.addEventListener/postMessage` — the 50-line worker shell | Easy. Already a shim over `createGenerationWorkerRuntime` (injected `now`/yield); ship it as the worker entry with WebWorker lib types |
| L3 | `src/generation-worker/generation-worker-client.ts:23,39,152,196` | `Event`, `MessageEvent`, `AbortSignal` types over an injected port | Easy. Types only (DOM lib or a minimal port interface); no global access |
| L4 | `src/generation-worker/phrase-replay.ts:61` | `now: () => performance.now()` — direct clock read | Easy. Inject the clock (CODING_RULE §2) or rely on `globalThis.performance` (exists in Node) |
| L5 | `src/generation-worker/phrase-replay-key.ts:168,236`; `phrase-replay-key-decode.ts:122,134` | `btoa`, `TextEncoder`, `atob`, `TextDecoder` | Trivial. Universal in browsers and Node ≥16; a lib-types question only |

Excluding the three browser entry files (L1–L3, `tsconfig.lib3.json`) only L4–L5 remain.
The replay already runs headless in Node today: `scripts/replay-phrase.mjs` loads
`src/generation-worker/phrase-replay.ts` through Vite's `runnerImport` (TS transform only).

Not leaks, but things to know before lifting:

- **Hash-domain strings with the app's name** (must NOT be renamed — they seed deterministic tie
  breaks, so renaming changes every generated phrase and replay key): `domain/rhythm/rhythm-change-
  draw.ts:22`, `domain/harmony/seventh-draw.ts:17`, `domain/pitch/pitch-tie-key.ts:17`,
  `domain/pitch/figure-draw.ts:12`, `domain/generation/orchestration/candidate-ranking.ts:29,44`,
  `orchestration/rhythm-tie-key-batch.ts:151`, `domain/profile/register-tie-key.ts:22`
  (`'infinite-flow/…/v1'`). Replay-key prefixes `ifk1.`–`ifk5.` and the console line
  `[Infinite Flow] phrase replay key` (`phrase-replay-key.ts:46,260`) are a contract too.
- **App flavour inside domain/** (English UI copy and UI guards; liftable but arguably app-side):
  `domain/controller-check/transposition-check-copy.ts` (wording, used by components only),
  `domain/notation/score-description.ts` (accessible descriptions; components 3, jam 2),
  `domain/controls/preset-label.ts`, `domain/presets/preset-names.ts`, `preset-save-choices.ts`
  (save-sheet logic; components/storage only), `domain/controls/unsupported-rhythm-settings.ts`
  (UI block). `domain/rhythm/rhythm-domain-validator.ts` is imported only by a test.
- **Inbound surface** (who depends on the library): 68 of its 143 files are imported from outside.
  By area: components 226 edges (139 t) to 42 files, jam 131 (65 t) to 39, session 125 (64 t) to 44,
  storage 100 (22 t) to 32, composables 58 to 22, notation 25 to 9, export 17 to 10, audio 14 to 6,
  midi 6 to 3, storage-bootstrap 3. Tests: 2,760 test→library edges from 593 test files.
  Generation-worker entry points used by the app: `create-workspace-session.ts:35,36,429`,
  `workspace-pregeneration-queue.ts:25`, `session/session-runner.ts:16` (error classes),
  `components/workspace/phrase-replay-announcement.ts:9` (replay key line). `phrase-replay.ts` has no
  `src/` importer (scripts + tests only).

### 3.3 Pure music code that generation needs but that sits OUTSIDE domain/

Found by what the library's own tests import (tests/unit/domain + tests/unit/generation-worker reach
session/ 13×, jam/ 5×, components/ 1×, export/ 1×):

- `src/session/session-seed-plan.ts` (attempt seeds) — used by `tests/unit/domain/generation/
  orchestration/generation-orderings-time.spec.ts:20`, `generation-rhythm-change.spec.ts:17`,
  `window-search-rhythm-lock.spec.ts:27`, `domain/rhythm/rhythm-change-draw.spec.ts:31`.
- `src/session/carry-in-adaptation.ts`, `settings-mutation.ts`, `session-types.ts` — used by
  `tests/unit/domain/generation/carry-in/carry-in-fit-levels.spec.ts:29-31`,
  `carry-in-join-matrix.spec.ts:43-45`.
- `src/jam/steering-block-builder.ts`, `doodle-controls.ts` — `generation-rhythm-steering.spec.ts:46-47`;
  replay corpus `tests/unit/generation-worker/replay-key-corpus-v32-jam-lock-cases.ts:42-57` also needs
  `jam/jam-phrase-one-attempts.ts`, `jam/kept-doodle-phrase-one.ts`, `session/rhythm-lock-session.ts`,
  `session/settings-mutation-scales.ts`.
- `src/components/controls/control-options.ts` — `tests/unit/domain/profile/instrument-profiles.spec.ts:11`.

How pure those are (whole import closure, `pure.mjs`; no-DOM type-checks):

- **session/**: 36 of 39 files reach outside {session, library} only through **three type imports
  into composables** (`session-types.ts:8`, `session-runner.ts:13` → `composables/viewport-width.ts`;
  `stale-phrase-one.ts:9` → `composables/workspace-session-result.ts`), plus `session-window.ts`
  (notation breakpoints, value) and `count-in-display.ts` (audio click plan, value).
  `session-engine.ts`, `session-history.ts`, `session-history-export.ts`, `settings-mutation.ts`,
  `session-seed-plan.ts`, `carry-in-adaptation.ts`: **0 errors with no DOM lib**. All of session/
  type-checks except `session-runner.ts:52,121,154` (`AbortController`/`AbortSignal`, universal).
- **jam/**: 10 of 38 files are pure (closure = jam + domain): `doodle-quantizer.ts`,
  `doodle-controls.ts`, `doodle-join.ts`, `doodle-rhythm-reading.ts`, `steering-block-builder.ts`,
  `tap-tempo.ts`, `key-suggestion/{key-suggestion,-draw,-names,-scores}.ts`; 0 no-DOM errors.
- **export/**: 13 of 19 pure (all of `midi/`, `musicxml/`); the 6 builders/downloader are app-side.
- **notation/**: `notation-layout-policy.ts`, `note-identity.ts`, `staff-fit-types.ts`,
  `notation-error.ts`, `score-overlay-state.ts` — 0 no-DOM errors. `score-overlays.ts`,
  `note-part-tags.ts` use `document`/SVG DOM; `vexflow-*` (6 files) + `engraving-anchors.ts` need VexFlow.
- **audio/**: `click-track.ts`, `backing-track.ts`, `guide-track.ts` type-check with no DOM, but every
  audio file reaches session (`audio-ports.ts:10`, `sound-roles.ts:7` → `session/session-types.ts`
  type; `click-track.ts:9` → `session/session-timing.ts` value).
- **storage/records/** kept-session codec: `kept-session-record.ts` 0 no-DOM errors (depends on
  session-history types, `session-timing`, `session-history-played-notes` — `:18,24,25`).

### 3.4 What the game needs that this app also uses, and what is app-only

From specs/vision/endgame.md (characters = restrictive presets; fights = call-and-response short
phrases = continuation; recognising what the player plays; several system voices; status effects
that change display and generation):

| need | modules today | where |
|---|---|---|
| generation, profiles, presets/characters | domain/generation, pitch, rhythm, harmony, profile, presets (built-in-presets, preset-selection, key-and-mode-restriction), figures, chords, random, events, time, validation | library-clean |
| running generation off-thread | generation-worker runtime/handler/inbound/protocol (pure) + worker shell/client/factory (L1–L3) | library + browser entry |
| replay keys | generation-worker/phrase-replay-key(-decode, -report, -bars, -names), phrase-replay | library (L4–L5) |
| continuation / phrase chaining | domain/generation/carry-in + session/{session-engine, session-intents, carry-in-adaptation, failure-ladder, session-seed-plan, settings-mutation} | session/ (3 type edges + 2 value edges to cut) |
| recognising played notes | domain/acknowledgement, domain/played-notes, jam/{doodle-quantizer, doodle-controls, doodle-join, steering-block-builder, key-suggestion} | jam/ pure subset (folder is "app" today, ESLint-fenced) |
| MusicXML / MIDI export | export/midi, export/musicxml, domain/backing | library-clean (14 `@/` imports) |
| notation | domain/notation (written phrase, spelling, stems), notation/notation-layout-policy etc. (pure), notation/vexflow-* (VexFlow, DOM) | notation package |
| sound | audio/ plans (pure) + Web Audio transport; v4 Tone.js | audio package (session coupling) |
| MIDI input | midi/ (all deps type-only on session/audio) | midi package |

App-only: components/ (197 files), composables/ (17), storage/ (IndexedDB, codecs, migrations,
save policy), storage-bootstrap.ts, styles/, App.vue, main.ts (PWA `virtual:pwa-register`),
export file builders + `browser-download.ts`, the 28 non-pure jam/ files (Vue UI, Jam settings
backed by storage), the app-flavoured domain files of §3.2, `storage/app-version.ts`
(`__APP_VERSION__`), `components/workspace/build-id.ts` (`__APP_COMMIT__`).

## 4. The other seams

| seam | outbound (non-domain) | inbound | cleanliness |
|---|---|---|---|
| **notation/** (14 files, 3,335) | domain 25 (19 t); `vexflow/bravura` in 5 files | components 70 (41 t, 1 d), composables 11 (7 t), jam 12 (8 t), session 2 (`session-window.ts` value, `rolling-display.ts:10` type), App.vue 1 (t) | **Cleanest seam after the library**: no edge to any app area. Three layers: pure (5 files), DOM (score-overlays, note-part-tags), VexFlow (6 + engraving-anchors). Cut needed: session's use of the layout breakpoints (move `BREAKPOINT_*` into library or session). Loader is the sole static importer of the engraver. Harness aliases `@/notation/vexflow-engraver-loader` (vite.workspace-harness.config.ts). 19 `vi.mock('@/notation/…')` in tests |
| **storage/** (32, 7,094) + storage-bootstrap.ts (259) | session 7 (5 t; value `records/kept-session-record.ts:24,25`), audio 2 (`records/settings-record.ts:30` value `validateBackingVolume, validateChannelVolume`; `setting-defaults.ts:19` type), components 1 t + composables 1 t (`setting-defaults.ts:20,21`); bootstrap → audio (`storage-bootstrap.ts:31` `readAudioMixDesign`) | components 68 (47 t, 21 value incl. 5 d), composables 6, jam 3, bootstrap 7 | Port design is sound, but the codecs drag in the UI: two type imports in `setting-defaults.ts` put storage in the 77-file type SCC. 12 of 32 files are pure (envelope, kept-session readers, controller/my-instrument records). Lift order: move `GeneratedNotesFormat`/`ThemePreference` types down, move mix validators out of audio/, then storage depends on library + session core only |
| **audio/** (16, 2,394) | session 3 (2 t + value `click-track.ts:9`), domain 14 | components 28 (24 t), jam 3 (value), midi 2 (t), session 1 (value), storage 2, bootstrap 1 | Small and Web-Audio-isolated (ESLint + verify:boundaries), but **value cycle with session** (count-in). All 14 non-worker files reach session/session-types.ts or session-timing.ts. Cut: move `AudioTime`/`COUNT_IN_MEASURES` (and the click plan) to one side |
| **midi/** (8, 1,488) | session 5 (all type), audio 2 (type `audio-ports.ts`) | components 26 (22 t), jam 4 (t) | Clean apart from type-only references to session/audio types; 3 files fully self-contained (`midi-message.ts`, `midi-access-port.ts`, `web-midi-access.ts`). Unchanged since 10-21 |
| **export/** (19, 2,714) | session 5 (value: `generated-notes-file.ts:14`, `played-notes-file.ts:16`) | components 9, jam 4 (t), session 3 (t) | Encoders (13) library-clean; builders depend on session-history adapter; `browser-download.ts` is DOM. Split: encoders → library, builders → app |
| **session/** (39, 7,728) | composables 3 (t), notation 2, audio 1 (value), export 3 (t), generation-worker 1 (value) | components 132 (92 t; 40 value), jam 20, storage 7, midi 5, export 5, audio 3 | Nearly pure (see §3.3). 20-file type SCC inside; 6 files at the 10-atom limit |
| **composables/** (17, 3,202) | domain 58, notation 11, storage 6 (1 value) | components 70 (61 t), jam 2, session 3 (t), storage 1 (t) | UI-side; 5 files pure (incl. `viewport-width.ts`, `workspace-session-result.ts`, which session borrows). `generation-session-types.ts` is the hub of the type SCC |
| **components/** (197, 32,045) | 11 areas (domain 221, session 132, notation 70, composables 70, storage 68, jam 35, audio 28, midi 26, export 9, storage-bootstrap 9, generation-worker 5) | App.vue 7, jam 19, storage 1 (t) | The app. Composition root lives in `components/workspace/create-workspace-session.ts` (not in App/main) |

## 5. components/workspace/

- **139 files, 23,347 lines** (vs 109 / 17,221 on 10-21), 23 `.vue` + 116 `.ts`, **flat** (0
  sub-folders). Name prefixes: `use-*` 38, `workspace-session-*` 23, `workspace-*` 7,
  `workspace-kept-*` 6, `session-*` 6, `browser-*` 6, `review-*` 4, `load-*` 3, `my-instrument-*` 3.
- Out of the folder: 661 edges — session 122, domain 149, ext (vue) 73, composables 69, storage 66,
  notation 43, jam 35, audio 28, midi 21, components/controls 12, components/review 11,
  storage-bootstrap 9, export 8, components/notation 7, generation-worker 5, controller-connection 3.
  Into the folder from outside: App.vue 7, components/review 10, controller-connection 7, jam 3.
- **23 files at exactly 10 distinct linked atoms** (the code-health error edge) — 23 of the 45 such
  files in `src/` (§4 counted 27 at the edge, 17 in workspace; src/ only here).

Biggest / most coupled (lines raw; fan-out = distinct import targets; areas = other areas reached;
fan-in = src importers; tests = test files importing it):

| file | lines | fan-out | areas | fan-in | tests |
|---|---|---|---|---|---|
| WorkspaceShell.vue | 935 (script 771) | 56 (55 import stmts; 36 at 10-21) | 10 | 1 | 12 |
| ScorePanel.vue | 619 | 29 | 9 | 1 | 10 |
| workspace-session-controller-types.ts | 570 | 21 | 6 | **60** | **48** |
| create-workspace-session.ts | 474 | 33 | 8 | 1 (App.vue) | 15 |
| WorkspaceHeader.vue | 470 | 17 | 6 | 1 | 5 |
| workspace-kept-session-edits.ts | 426 | 10 | 3 | 2 | 0 |
| MyInstrumentSheet.vue | 415 | 14 | 4 | 1 | 2 |
| workspace-session-controller.ts | 405 | 36 | 6 | 1 | 1 |
| workspace-pregeneration-queue.ts | 381 | 16 | 6 | 3 | 0 |
| ReviewArea.vue | 367 | 14 | 2 | 1 | 12 |
| use-kept-doodle-phrase.ts | 347 | 26 | 6 | 10 | 9 |
| workspace-session-controller-seams.ts | 176 | 21 | 7 | 7 | 0 |
| workspace-session-types.ts | 173 | 20 | 9 | 1 | 0 |
| load-jam-mode.ts | 72 | 1 | 1 | 16 | 11 |
| use-kept-sessions.ts | 223 | 5 | 2 | 16 | 5 |
| workspace-session-active.ts | 190 | 18 | 4 | 15 | 0 |

Natural sub-clusters (by name; intra-cluster edges in brackets):

| cluster | files | lines | notes |
|---|---|---|---|
| session wiring (`create-workspace-session`, `workspace-session-*`) | 24 | 5,331 | [78] the core; ↔ kept sessions 14/12, → jam bridge 11, → pre-generation 6 |
| review host (`ReviewArea`, `use-review-*`, `review-*`) | 15 | 2,543 | [22] → session wiring 10, → jam bridge 8 |
| shell & panels (Shell, Header, ScorePanel, notices, footer, cue row, layout gates) | 11 | 2,894 | [9] → other 24, → jam bridge 20, → session wiring 7 |
| jam bridge (`use-*jam*`, kept doodle, `load-jam-mode`, `session-jam-part`) | 14 | 2,083 | [21] |
| kept sessions (`kept-session-*`, `workspace-kept-*`, `use-kept-sessions`) | 10 | 2,059 | [11] |
| my instrument | 9 | 1,451 | [13] |
| presets | 6 | 1,070 | [6] |
| your data | 4 | 989 | [4] |
| browser adapters (`browser-*`) | 6 | 596 | [3] |
| controller connection | 4 | 441 | |
| pre-generation | 3 | 716 | |
| tempo, replay announcer | 3 + 2 | 317 + 130 | |
| other (mix, theme, focus, misc. `use-*`) | 28 | 2,866 | |

`workspace-session-controller-types.ts` is the folder's hub (60 src importers, 48 test importers):
any move of it fans out to ~108 files.

## 6. Coupling of tests, ATD and tooling to paths

- **Tests → src**: 4,418 import edges from 780 test files; **4,260 via `@/` (96 %)**, 158 relative
  (unit 88, e2e 70); 4 files mix styles. tests/unit mirrors src/ (components 240 files, domain 187,
  session 82, storage 57, jam 48, generation-worker 31, composables 30, export 29, audio 24, midi 15,
  notation 8). Moving a folder breaks every `@/area/...` specifier unless an alias is kept.
- **`vi.mock` with module paths**: in 65 test files (`@/notation` 19, `@/components` 19,
  `@/generation-worker` 11, `@/domain` 6, `@/jam` 2, `@/storage` 1, `@/export` 1, 1 relative). These
  are strings; a type-checker will not catch a stale one.
- **Source-scanning tests with hard-coded paths**: `tests/unit/domain/presets/preset-model-purity.spec.ts`
  (`src/domain/presets`), `tests/unit/domain/figures/figure-levels.spec.ts` (6 `src/domain/*` folders
  + `src/domain/generation/generation-intent.ts`), `generation-result-validator.spec.ts:516,520`,
  `harmony/seventh-draw.spec.ts:203`, `pitch/figure-draw.spec.ts:179`,
  `rhythm/rhythm-change-draw.spec.ts:156`, `jam/doodle-quantizer.spec.ts:49`,
  `storage/profile-to-levels.spec.ts:17`.
- **Harness aliases by exact module path** (`vite.workspace-harness.config.ts:27,33,39`):
  `@/notation/vexflow-engraver-loader`, `@/export/load-generated-notes-export`,
  `@/components/workspace/workspace-session-runner`. A move silently disables the seam (the real
  module is bundled instead).
- **scripts → src by path**: `scripts/replay-phrase.mjs:14` and the four `record-replay-key-corpus*.mjs`
  (`../src/generation-worker/phrase-replay(-key).ts`, `../tests/unit/generation-worker/…`).
- **tsconfig**: one app project (`tsconfig.app.json`) includes `src/**` *and* `tests/unit`, `tests/perf`,
  `tests/sweep*`, the two e2e harnesses; extends `@vue/tsconfig/tsconfig.dom.json` (DOM for all of
  src/). `tsconfig.node.json` covers configs, `scripts/**/*.mjs`, `tests/unit/boundaries/**`,
  `tests/unit/code-health/**`. No per-area projects; a library project would need its own
  (`lib: ES2023` proven sufficient for domain/).
- **vite.config.ts**: alias `@` → `./src`; `define: appVersionDefine()`; `moduleGraphPlugin()`
  (writes `dist/.vite/module-graph.json`); VitePWA. Vitest/harness configs repeat the alias and define.
- **ESLint path globs** (eslint.config.js): `src/audio/**`, `src/midi/**`, `src/storage/**`
  overrides; the five exact `src/notation/vexflow-*.ts` paths; `src/session/**` + `src/export/**`
  storage ban with patterns `@/storage`, `**/storage/**`; `src/**` minus `src/jam/**` and
  `src/components/workspace/load-jam-mode.ts` for the Jam rule.
- **verify-boundaries.mjs**: `directoryScopedApis` allowed dirs `'audio/'`, `'midi/'`, `'storage/'`
  relative to `../src/` (lines 73–90, 355); `jamSourceDirectory = 'src/jam/'` (229); chunk budgets
  keyed on file-name prefixes `generation.worker-` and `vexflow-engraver-` (422–433), i.e. on the
  module names `generation.worker.ts` and `vexflow-engraver.ts`; paths `../dist/`, `../vite.config.ts`.
  Its tests use `tests/fixtures/boundaries/src/{audio,components,export,midi,other,session,storage}`
  mirroring the layout.
- **code-health** (`scripts/code-health/config.mjs`): `ATD_EXEMPT_PATHS` lists 19 test paths and
  prefixes (`scripts/`, `tests/unit/code-health/`, `tests/perf/`, plumbing under `tests/`);
  `sources.mjs:66` treats `tests/` or `*.spec.*` as tests.
- **ATD**: `.atd` holds only `docs_path: "docs/"` and `supported_extensions` (+ LLM settings) — no
  source roots or path globs. Links in code are by atom id (`@spec-link [[id]]`: 4,966 in 517 of
  533 src files; `@test-link`: 8,097 in 825 test files), so moving a file does not break link
  resolution (inference from the id-based syntax and the config; not exercised). But atom **prose**
  names paths: 786 `src/…` mentions in 124 of 499 atoms (359 distinct paths; components 230 in 55
  atoms — workspace 193 in 48 —, domain 180/57, session 118/37, storage 90/23, jam 68/23,
  composables 28/15, audio 18/4, generation-worker 13/8, notation 13/5, export 11/3, midi 3/1);
  narrative docs 608 mentions in 37 files; README 63. Moves make that text stale (documentalist
  churn). `atd check` default mode is git-diff driven (`atd check --help`); how it treats a mass
  rename, and whether one root `.atd` works across npm workspaces, is not verified here.

## 7. Feasibility of the three-way split, in one view

- **(1) Library** — feasible now for domain/ + generation-worker/ + export encoders: 156 files,
  ~28,000 lines, zero imports into app areas, zero package dependencies, compiles on ES2023 alone
  except five small browser touch points (L1–L5). Making it useful to the game means also pulling in
  the pure parts of session/ (engine, intents, seed plan, carry-in adaptation, mutation), jam/ (10
  files), notation (5 pure files) and maybe audio plans; those are blocked by a handful of edges:
  `session-types.ts:8`, `session-runner.ts:13`, `stale-phrase-one.ts:9` (types into composables),
  `session-window.ts:12-16` (notation breakpoints), `count-in-display.ts:7` ↔ `click-track.ts:9`
  (session↔audio cycle), `session-history-export.ts:14-16` (export input types), `session-runner.ts:16`
  (worker client errors).
- **(2) This app** — everything else; the work is mostly in path churn (≈4,260 `@/` test imports,
  65 `vi.mock` files, 3 harness aliases, ESLint/verify-boundaries globs, 786 atom path mentions),
  not in code coupling.
- **(3) The game** — would consume (1) plus a browser kit (notation/VexFlow, audio, midi, worker
  shell). notation/ is already clean (domain-only); midi/ and audio/ need the session-type cut.
- **Blocking tangles on the app side**: the 77-file type SCC rooted at
  `storage/records/setting-defaults.ts:20-21`; storage codecs importing `audio/audio-mix.ts` values;
  the domain-internal {generation, pitch, rhythm, validation} cycle (not a split blocker, but it
  contradicts specs/generator-architecture.md:123).
