# v3.4 structural review: part E, the measurement pass (D557, D558)

> Kept copy. Written 2026-11-23, measured on `main` 2ea48d1c with the analysis tools in a throwaway worktree (D558). Where E disagrees with A or B, E wins. Scratchpad paths inside are historical: the scratchpad is not kept.

Measured 2026-11-23 on `main` at **2ea48d1c** (lexicon page built), in a throwaway detached worktree
`/home/bastien/work/infinite_flow-v3.4-measure`, compared with parts A and B (measured on 7af3628c,
before v3.4 wave 1). Read and measure only: nothing committed, the main checkout untouched.
`package.json` and `package-lock.json` were unchanged at the end (`git status`: only ignored `dist/`
and `node_modules/`).

Setup: `npm ci`, then `npm install --no-save rollup-plugin-visualizer@7.1.3 dependency-cruiser@18.9.0
jscpd@5.4.3 knip@6.48.0` (not app dependencies, D557). Vite 8.3.5 (rolldown), Node 22.23.5, 12
cores, idle machine (load 0.28).

Every raw output and script is in this folder (`OUT`):
`e1-*` (start-up), `vite.measure.config.mjs`, `dist-sm/` (source-mapped twin build),
`e1-visualizer.html` (treemap), `e2-*`, `depcruise-base*.cjs`, **`depcruise-candidate.cjs`**,
`jscpd-*/`, `e3-*`, `knip*.json`, `e4-*`, `e5-*`, `e6-*`.

Order of runs: E6 first (build, typecheck, vitest, on the idle machine, before the tools were
installed), then E1 to E5.

---

## E1. Start-up footprint

Commands:
- `npm run build` then `npm run verify:boundaries` (exit 0) → `e1-verify.txt`.
- `npx vite build --config $OUT/vite.measure.config.mjs` (the app's `vite.config.ts` plus
  `sourcemap: true`, out to `$OUT/dist-sm`, plus rollup-plugin-visualizer raw-data and treemap).
  Same 64 JS file names as `dist/`; the stripped source-mapped files have the same byte sizes (0
  mismatches).
- `node e1-startup.mjs dist $OUT/dist-sm <B startup-attribution.json> e1-startup-attribution.json`:
  the start-up set by `scripts/verify-boundaries.mjs`'s method (page entries minus
  `lexicon-words-*`, then static `imports` transitively, from `dist/.vite/module-graph.json`),
  gzip level 9 and brotli quality 11 per file, and byte attribution through the source maps.
- `node e1-groups.mjs …` (group bytes and static chains from `src/main.ts`).

### E1.1 The figures

| | 7af3628c (B §3.1) | 2ea48d1c (today) | change |
|---|---|---|---|
| **All start-up JS (D536 measure), minified** | 386,990 B, 18 chunks | **392,293 B**, 18 chunks (of 409,600; 17,307 left) | **+5,303 B** |
| — gzip -9 (sum per file) | 124,403 B | **125,989 B** | +1,586 |
| — brotli q11 (sum per file) | 107,817 B | **109,157 B** | +1,340 |
| — as one concatenated stream (information) | | gzip 120,743 / brotli 103,144 | |
| **Entry file** `index-*.js` | 331,978 B | **337,281 B** (gzip 106,720; brotli 92,148) | +5,303 |
| 17 non-entry start-up chunks | 55,012 B | 55,012 B (gzip 19,269) | 0 |
| CSS `index-*.css` (no budget) | 48,205 B | 53,599 B | +5,394 |
| JS chunks in `dist/assets` | 62 (verify count) | 64 | +2 (lexicon-page-module, lexicon-words) |

B's gzip/brotli figures sit next to the entry in B's text but are within 1.3 % of today's
all-start-up sums, so they are read here as all-start-up.

### E1.2 Attribution method and its limit

rolldown leaves about **28.3 KB (7.2 %)** of the start-up bytes without a source mapping (B saw
5.9 KB): mostly Vue SFC hoisted statics and render tails (`var QS={class:'layout-workspace'},$S=
U({__name:'WorkspaceShell'…`), plus import/export lines and `__vite__mapDeps`. rollup-plugin-visualizer
with `sourcemap: true` loses the same bytes (311,122 of 337,281 mapped for the entry); without it, it
reports pre-minification lengths (665,470 for the entry), so it cannot attribute minified bytes.
The figures below use an **adjusted** attribution: an unmapped run that opens a `var` goes to the
next mapped source (SFC statics precede their component), any other unmapped run to the previous
one, import/export statements and `__vite__mapDeps` stay "bundler glue" (8,170 B). Folder totals are
stable under this; single-module figures can move by ±1 KB between neighbours (see E1.4).

### E1.3 Breakdown

By origin: **app code 320,264 B (81.6 %)**; Vue 61,273 B (runtime-core 34,486, reactivity 16,061,
runtime-dom 6,905, shared 3,821); PWA register 2,586 B; bundler glue 8,170 B. No other npm package
is in the start-up set (VexFlow is in the lazy engraver chunk only).

By top-level `src/` folder: components 136,636 · domain 76,955 · storage 46,856 · composables
19,530 · audio 17,342 · midi 10,673 · notation 5,167 · root files (App.vue, main.ts,
storage-bootstrap.ts) 3,791 · session 3,197 · generation-worker 117 · lexicon **0** · jam **0**.

Second level (the biggest): components/workspace 92,428 · components/controls 36,022 ·
storage/records 30,254 · domain/generation 20,769 · composables 19,530 · audio 17,342 · storage (root)
14,322 · domain/notation 13,899 · midi 10,673 · domain/presets 10,052 · components/notation 7,500 ·
domain/profile 6,997 · domain/events 6,038 · domain/controls 5,773 · notation 5,167 · domain/backing
4,052 · domain/doodle 2,863 · storage/migrations 2,280 · domain/time 2,154 · domain/harmony 1,641.

The library candidate (domain/ + generation-worker/) is **77,072 B, 19.6 %** of the start-up set.

### E1.4 What wave 1 added, against B §3 and `startup-attribution.json`

- Measured on disk: **+5,303 B** (the expected figure was about +5,255), all of it in the entry
  file; the 17 shared chunks are byte-identical.
- By folder (adjusted vs B): **components/workspace +4,885**, components/controls +334 (attribution
  shift), every domain/ folder −1 to −215 (attribution boundaries), Vue −1,069, PWA +1,518 and
  glue +2,320 against B's unmapped −5,850 (method).
- The new start-up modules: `use-lexicon-page.ts` 1,419 · `workspace-starts.ts` 753 ·
  `lexicon-history.ts` 587 · `load-lexicon-page.ts` 427 (3,186 B new), plus growth in
  `WorkspaceShell.vue` +1,548, `AppNoticeRow.vue` +1,148, `LayoutFooter.vue` +378 (the footer's
  `Lexicon`). The other module deltas pair up and cancel (e.g. use-jam-idle-cue −775 against
  WorkspaceHeader +773; jam-session-cue −567 against SessionCueRow +567): attribution boundaries,
  not code.
- **The lexicon's words file is not in the start-up set**: `assets/lexicon-words-B6DOSTWA.js`
  (305,315 B; gzip 90,208) is emitted as an entry but excluded as a page entry and reached by no
  static import (`inStartup: false`); verify-boundaries passes its lexicon check. No `src/lexicon/`
  or `src/components/lexicon/` module is in the start-up set; the lexicon page chunk
  `lexicon-page-module-*.js` is 12,368 B (gzip 4,903), lazy. The only lexicon code in the start-up
  set is the three workspace host files above (2,433 B), as README "Directory Boundaries" says.

### E1.5 B §3.3's "not on the first screen" group, re-checked

Bytes (adjusted attribution) and the shortest static value chain from `src/main.ts` (depcruise
graph, type-only and dynamic imports excluded), with what the code does at load:

| part | B | today | static chain (shortest) | used at first paint? |
|---|---|---|---|---|
| Kept-session codecs (7 files) | ≈20,600 | **20,635** | main.ts > storage-bootstrap.ts > storage/storage-port.ts > storage/database.ts > migrations/kept-sessions-v2.ts > records/kept-session-body.ts > … | **No, for an up-to-date database.** Reached only through `database.ts:14-17` (the migration list); the steps run inside `onupgradeneeded` (`database.ts:259`). Their other static importers (`use-kept-sessions.ts`, `workspace-kept-session-read.ts`, `ReviewComment.vue`) are in lazy chunks. |
| Audio (audio/ minus audio-mix.ts) | ≈15,100 | **15,127** | main.ts > App.vue > components/workspace/create-workspace-session.ts > audio/browser-audio-transport.ts > audio/audio-transport.ts / web-audio-output.ts > … | **No sound before the click.** Built at load, but `new AudioContext` is only at `web-audio-output.ts:172`, reached from `unlock()` (browser-audio-transport.ts:19 "Building it creates nothing"). |
| MIDI (midi/) | 10,687 | **10,673** | main.ts > App.vue > create-workspace-session.ts > midi/midi-controller.ts (and web-midi-access.ts) | **Yes when a controller is remembered**: `use-controller-connection.ts:87` calls `midi.reselect(store.loaded)` at load, which asks for access when the permission already allows it (`midi-controller.ts:3-4, 292-298`). B left this unconfirmed. |
| Jam host wiring (12 files) | ≈15,100 | **12,973** (+ domain/doodle 2,863) | main.ts > App.vue > WorkspaceShell.vue > use-jam-* / use-kept-doodle-* | **Run, nothing shown.** The composables are called in WorkspaceShell's setup (`WorkspaceShell.vue:326-422`); KeptDoodleStaff renders under `v-if`. B's 15.1 KB included ≈2.4 KB of WorkspaceShell's own SFC statics that its attribution credited to use-jam-bar / use-jam-idle-cue / jam-session-cue. |
| Mix-volume popover (4 files) | ≈6,600 | **6,597** | main.ts > App.vue > WorkspaceShell.vue > ScorePanel.vue > MixControls.vue > MixVolumeButton.vue > MixVolumePanel.vue | **Panel no** (`v-if="holdsPopover"`, MixVolumeButton.vue:80-81); the button and MixControls are drawn. |
| Sheet hosts (6 files) | ≈6,800 | **6,545** | main.ts > App.vue > WorkspaceShell.vue > use-preset-sheet.ts etc. | **Run, nothing shown** (setup calls `WorkspaceShell.vue:111-113` imports); the sheets are lazy. |
| Lexicon host (new) | — | **2,433** | main.ts > App.vue > WorkspaceShell.vue > use-lexicon-page.ts > lexicon-history.ts / load-lexicon-page.ts | **Yes, by design**: reads `#lexicon` at load and listens to `popstate`/`hashchange` (use-lexicon-page.ts:172-176, lexicon-history.ts:43-57). |

Total of B's group today: **75,413 B** (B: about 75 KB); with the lexicon host 77,846 B. Of it,
the parts whose code does nothing at first paint whatever the stored state are the codecs
(20,635), audio's sounding (15,127), the popover panel (3,205 of 6,597) and the sheet and Jam hosts'
bodies; MIDI is used at load for a remembered controller.

**For Q2:** wave 1 cost +5,303 B of start-up JS, 1.4 % of the budget, 17,307 B left. The words file
(305 KB) stays out. The lazy-loading ceiling is unchanged at about 75 KB; MIDI's 10.7 KB is not a
clean candidate (used at load when remembered). The library candidate is a fifth of start-up.

---

## E2. Import graph (dependency-cruiser 18.9.0)

Commands (from the worktree root):
- `npx depcruise src --config $OUT/depcruise-base.cjs --output-type json --output-to $OUT/e2-depcruise.json`
  (`tsPreCompilationDeps: true`: keeps type-only imports).
- the same with `depcruise-base-value.cjs` (`tsPreCompilationDeps: false`) → `e2-depcruise-value.json`,
  for dynamic `import()` flags. Reason: with pre-compilation deps on, depcruise merges a
  `typeof import('x')` type node and a dynamic `import('x')` of the same file into one non-dynamic
  edge; with it off, it keeps `import type` lines of `.vue` files. The value graph used is the
  first run's non-type-only edges, flagged dynamic from the second (`e2-analyse.mjs`).
- `node e2-analyse.mjs e2-depcruise.json e2-depcruise-value.json` → `e2-analyse.txt`, `e2-matrix.md`.

### E2.1 Matrix and comparison with A's `matrix.md`

546 `src/` modules, **2,969 src→src edges** (A: 2,970), 1,445 type-only (A: 1,454), 1,372
cross-area (A: 1,371). Unresolved: only `vexflow/bravura` (5 engraver files), `virtual:lexicon-words`,
`virtual:pwa-register`. Packages imported from src: `vue` 125, `vite-plugin-pwa` 1, `vite` 1 (types).

Every row of A's matrix is unchanged except `components`: the **one new column is lexicon:
components → lexicon 7 (6 type-only)**, all from `components/lexicon/` (the value import is
`lexicon-page-module.ts` → `src/lexicon/index.ts`) and the two workspace hosts (type-only). The
`lexicon` row is empty: **src/lexicon/ imports nothing outside itself**, no package either.
Three cells differ by method only (depcruise counts one edge per file pair): components → jam 34(33t)
vs 35(34t), → notation 69(40t) vs 70(41t), → storage 64(43t) vs 68(47t); dynamic counts [d] come
out 2 / 1 / 1 / 8 (gen-worker, jam, notation, storage) against A's 1 / 1 / 1 / 5.
Sinks as in A: **domain/ imports nothing outside itself; generation-worker/ only domain/; notation/
only domain/ and VexFlow; lexicon/ nothing.**

### E2.2 Cycles, compared with A §2.2

| | A (7af3628c) | today |
|---|---|---|
| Area SCCs, all edges | 1 of 9 areas (components, jam, storage, composables, session, export, audio, midi, storage-bootstrap.ts) | **same 9**; lexicon outside |
| Area SCCs, value edges | session↔audio; jam↔components | **same**; with static value edges only: **session↔audio** alone |
| File cycles, value edges | 1 (ReviewArea.vue ↔ load-review-panel.ts, through the dynamic import) | **1, the same**; 0 through static value imports |
| File SCCs, all edges | 10; largest 77 files (storage, components, composables, jam, storage-bootstrap) | **10, sizes 77, 20, 5, 5, 2×6; 119 files** in cycles |
| SCCs crossing top-level folders | the 77-file one | **only the 77-file one** (components, composables, jam, storage, storage-bootstrap.ts); the other nine sit in one folder (session 20 + 2, components/workspace ×5 incl. a 5-file my-instrument and a 5-file review-host, domain/pitch 2, domain/validation 2) |
| domain/ sub-folders, value | {generation, pitch, rhythm, validation}, {presets, controls} | **same**; all edges add figures to {controls, presets} |

Wave 1 added no cycle: no lexicon file is in any SCC.

### E2.3 Candidate import-rule set (`$OUT/depcruise-candidate.cjs`)

Run: `npx depcruise src --config $OUT/depcruise-candidate.cjs --output-type json --output-to
$OUT/e2-candidate.json`, then `node e2-violations.mjs <repo> e2-candidate.json` → `e2-violations.txt`
(lines = the import specifier's line). Types count unless the rule says otherwise.

| rule | basis | severity | violations today |
|---|---|---|---|
| vexflow-only-in-engraver-files | ESLint vexflowImportPattern | error | 0 |
| session-export-no-storage | ESLint storageImportPattern | error | 0 |
| jam-only-through-its-loader (types allowed) | ESLint jamImportPattern | error | 0 |
| lexicon-page-only-through-its-loader (types allowed) | ESLint lexiconPageImportPattern | error | 0 |
| lexicon-module-self-contained (no package) | README; lexicon-api-boundary.spec.ts | error | 0 |
| src-not-on-tests-or-scripts | | error | 0 |
| **library-imports-only-library** (domain/ + generation-worker/, types included, no package) | D551 (1) | warn | **0** |
| export-encoders-library-clean (export/musicxml, export/midi) | A §4 | warn | **0** |
| notation-imports-only-library-and-vexflow | A §4 (browser kit) | warn | **0** |
| session-imports-only-library | A §3.3, §7 | warn | **9** |
| browser-kit-not-on-app (audio, midi, notation) | A §4 | warn | **8** |
| storage-not-on-ui | A §2.2 | warn | **2** |
| composables-not-on-components | README (UI coordination below components) | warn | 0 |
| no-value-cycle | | warn | **1** |
| no-cycle-any-edge | | info | 222 module-level reports (the 10 SCCs above) |

Violations, file:line:
- **session-imports-only-library (9)**: `src/session/count-in-display.ts:7` → audio/click-track.ts
  (value) · `session-window.ts:20` → notation/notation-layout-policy.ts (value) · `rolling-display.ts:10`
  → notation/notation-layout-policy.ts (type) · `session-history-export.ts:14`, `:15`, `:16` →
  export/midi/midi-export-input.ts, export/midi/played-notes-midi-input.ts,
  export/musicxml/musicxml-export-input.ts (type) · `session-runner.ts:13` and `session-types.ts:8`
  → composables/viewport-width.ts (type) · `stale-phrase-one.ts:9` →
  composables/workspace-session-result.ts (type).
- **browser-kit-not-on-app (8)**: `src/audio/click-track.ts:9` → session/session-timing.ts (value) ·
  `audio/audio-ports.ts:10`, `audio/sound-roles.ts:7`, `midi/midi-clock-mapping.ts:10`,
  `midi/midi-controller-state.ts:8`, `midi/midi-controller.ts:21`, `midi/played-note-tracker.ts:13`
  → session/session-types.ts (type) · `midi/played-note-tracker.ts:12` → session/session-history.ts (type).
- **storage-not-on-ui (2)**: `src/storage/records/setting-defaults.ts:20` →
  components/review/review-types.ts (type); `:21` → composables/generation-session-types.ts (type).
- **no-value-cycle (1)**: `src/components/workspace/ReviewArea.vue:26` → components/review/load-review-panel.ts
  → (dynamic, `load-review-panel.ts:87`) ReviewArea.vue.

The lexicon module: A was measured before it existed and places it nowhere; the review frame leaves
its home to Q4 (O315). The graph gives the facts for either side: it is a sink with no edge to
domain/ or to any package, and its only importers are the lexicon page (lazy) and two workspace
host files (type-only), so the rule set keeps it self-contained and neither side needs a cut.

**For Q4:** the library seam (domain/ + generation-worker/) has **0 violations, types included**, so
it could be enforced today at no code cost; so could the encoders and notation. Taking the session
core into the library costs 9 edges (2 value); the browser kit costs 8 (1 value, the session↔audio
cycle); the 77-file type SCC hangs on the same 2 storage lines as in A. The graph is unchanged
since A apart from the lexicon's 7 edges.

---

## E3. Duplication (jscpd 5.4.3)

Commands: `npx jscpd <src|tests> --min-tokens <50|25> --reporters json --output $OUT/jscpd-<dir>-<n>
--silent --ignore "**/fixtures/**/*.xml,**/*.json,**/*.xsd"` (50 = jscpd's default, min-lines 5,
mode mild; 25 = the stricter run), then `node e3-jscpd-summary.mjs …` → `e3-src.txt`, `e3-tests.txt`,
and `node e3-jscpd-only.mjs …` → `e3-jscpd-only.txt`.

| scope | threshold | files | lines | clones | duplicated lines | % lines | % tokens |
|---|---|---|---|---|---|---|---|
| src/ | 50 tokens (default) | 654 | 105,218 | 52 | 645 | **0.61 %** | 0.77 % |
| src/ | 25 tokens | 670 | 105,464 | 218 | 1,911 | **1.81 %** | 1.75 % |
| tests/ | 50 tokens (default) | 1,036 | 229,688 | 678 | 8,411 | **3.66 %** | 3.44 % |
| tests/ | 25 tokens | 1,038 | 229,701 | 2,611 | 22,557 | **9.82 %** | 7.73 % |

src/ by format at 50: TypeScript (incl. SFC scripts) 0.53 %, Vue templates 4.19 % (7 clones), CSS
2.09 % (8). Duplicated lines by folder (both sides, 50): components/workspace 327, components/review
124, jam/review 113, domain/pitch 90, domain/rhythm 90, styles/components.css 84, storage/records 72.
Lexicon code: 0 clones at 50; 3 small ones at 25 (LexiconPage.vue sheet/Tab-wrap code against
ConnectionSheet.vue:228 and ConfirmationSheet.vue:61, 6–8 lines).

Top 15 src/ clones (default threshold; lines, tokens):
1. 34, 118 — domain/pitch/pitch-motion.ts:20-53 ↔ domain/pitch/validation/motion-rules.ts:19-52
2. 32, 68 — domain/rhythm/rhythm-planner.ts:444-475 ↔ domain/rhythm/rhythm-validator.ts:24-55
3. 30, 216 — components/review/ReviewPhrase.vue:249-278 ↔ jam/review/ReviewDoodle.vue:196-225 (template)
4. 28, 133 — ReviewPhrase.vue:99-126 ↔ ReviewDoodle.vue:87-114
5. 26, 88 — ReviewPhrase.vue:202-227 ↔ ReviewDoodle.vue:168-192
6. 24, 72 — domain/chords/chord-families.ts:63-86 ↔ domain/figures/figure-levels.ts:128-150
7. 23, 155 — domain/presets/preset-selection.ts:109-131 ↔ storage/records/preset-record.ts:150-169
8. 21, 113 — components/controls/FoundationControls.vue:272-292 ↔ jam/JamControls.vue:243-263 (template)
9. 21, 86 — ReviewPhrase.vue:76-96 ↔ ReviewDoodle.vue:63-79
10. 21, 201 — styles/theme.css:242-262 ↔ styles/theme.css:266-286
11. 18, 90 — components/workspace/KeptDoodleStaff.vue:89-106 ↔ components/workspace/ScorePanel.vue:567-584 (template)
12. 18, 77 — components/workspace/MyInstrumentSheet.vue:217-234 ↔ components/workspace/YourDataSheet.vue:189-206
13. 18, 106 — components/workspace/workspace-session-begin.ts:161-178 ↔ workspace-session-phrase-one-entry.ts:94-111
14. 17, 54 — components/notation/PhraseScore.vue:353-369 ↔ jam/JamStaff.vue:237-253
15. 15, 101 — components/workspace/workspace-kept-played-notes.ts:82-96 ↔ workspace-kept-session-edits.ts:162-175

Top tests/ clones (default): the three rhythm-prefilter-soundness specs (eighth/quarter/sixteenth,
93 lines each pair), generation-session-instrument-hold ↔ generation-session-my-instrument specs
(81), WorkspaceHeader.spec ↔ WorkspaceShell.spec (60), kept-session-changes ↔
kept-session-review-changes specs (53), the three rhythm-domain-exhaustive-validation specs (51),
replay-key-corpus v30 ↔ v31 cases (49). By folder: tests/unit/components 4,600 lines, tests/unit/domain
3,084, tests/unit/generation-worker 2,079, tests/unit/composables 1,354, tests/unit/storage 1,010.

Agreement with B (B: hand-rolled line windows, src/ only; exact 1.6 %, fuzzy 2.3 % of 44,850
normalised lines, so not the same denominator as jscpd's 105,218 raw lines):
- **dup-exact.txt: 22 of 30 blocks found at 50 tokens, 26 of 30 at 25.** Missed: short lists of
  8–12 lines under the token threshold (the ordered settings-key list in phrase-replay-key.ts:90-101 /
  settings-mutation-scales.ts:365-376 / preset-selection.ts:49-58; workspace-session-start.ts:185-194
  ↔ workspace-session-without-phrase-one.ts:262-271).
- **dup-fuzzy.txt: 22 of 51 at 50, 29 of 51 at 25.** Missed: renamed copies, which jscpd's token
  match does not normalise (load-review-panel.ts's two cached-promise loaders, backing-track.ts:137-165
  ↔ guide-track.ts:69-97, generation-request.ts:192-231 ↔ :221-262, active-concert-range.ts ↔
  register-window.ts).
- **24 of jscpd's 52 clones are not in B**, the largest: KeptDoodleStaff.vue ↔ ScorePanel.vue (18,
  template), workspace-kept-played-notes.ts ↔ workspace-kept-session-edits.ts (15 and 12),
  backing-track.ts:107-118 ↔ guide-track.ts:26-37 (12), ConnectionSheet.vue:208-218 ↔
  ConfirmationSheet.vue / MyInstrumentSheet.vue (11), request-rhythm-lock.ts ↔ steering-block.ts (11).
- Both tools agree on the main clusters: ReviewPhrase ↔ ReviewDoodle (about 100 lines over four
  clones), FoundationControls ↔ JamControls, the sheets' focus/Tab code, the two domain tables.

**For Q3:** duplication in src/ stays low (0.6 % at the default, 1.8 % strict) and clusters in the
review/Jam-review pair and the sheets; tests duplicate 6 times more (3.7 % / 9.8 %), mostly
parallel spec files per variant. Wave 1 added no clone at the default threshold.

---

## E4. Dead code (knip 6.48.0)

Config `$OUT/knip.json`: entries `src/main.ts` (index.html's script), the two workers
(`generation-worker/generation.worker.ts`, `audio/wake-timer.worker.ts`, reached by
`new URL(…, import.meta.url)`), `scripts/**/*.{mjs,ts}`, `tests/**/*.spec.ts`, the two harness
`main.ts`, the vite/vitest/playwright/eslint configs; project `src/**/*.{ts,vue}`, `scripts/**`,
`tests/**/*.ts`; `paths` `@/*`; `virtual:*` ignored as unresolved. Command:
`npx knip --config $OUT/knip.json --reporter json > e4-knip.json`, summary `node e4-knip-summary.mjs`.
A second run, `--production --include files,exports,types` with `knip-production.json` (src entries
and project marked `!`), finds what only tests and scripts use.

| kind | default run (tests and scripts count as users) | production run (src used by src only) |
|---|---|---|
| unused files | **29**, all `tests/fixtures/boundaries/src/**` | **5** in src/ |
| unused exports | 181 (82 in src/, 99 in tests/) | 358 in src/ |
| unused exported types | 186 (143 in src/) | 194 in src/ |
| duplicate exports | 2 | — |
| unused dependencies | 2 | — |
| unlisted binaries | 4 | — |

Unused files, default run: the 29 boundary fixtures (`tests/fixtures/boundaries/src/{audio,midi,
storage,session,export,components,other}/*.ts`). **Likely false positives**: they are read as text
and linted by path by `tests/unit/boundaries/*.spec.ts`, never imported (README "tests/fixtures/
boundaries"). **No unused file in src/.**

Unused files, production run: `generation-worker/phrase-replay.ts`, `phrase-replay-bars.ts`,
`phrase-replay-names.ts`, `phrase-replay-report.ts` (the `npm run replay:phrase` tool's code, used by
`scripts/replay-phrase.mjs`, a dev tool) and `domain/rhythm/rhythm-domain-validator.ts` (used by tests
only).

Unused dependencies: `@fontsource-variable/fraunces`, `@fontsource-variable/source-sans-3`
(**false positive**: imported from `src/styles/fonts.css`, which knip does not parse). Binaries
`atd` (package.json scripts) and `xmllint` (3 export specs): external tools, not packages.

Unused exports in src/, default run, by area: components 23, domain 15, jam 11, storage 10, export
8, notation 7, session 4, generation-worker 3, composables 1. They are constants and helpers
exported but used only inside their own file (e.g. `notation-layout-policy.ts:112-242` six
`NOTATION_*_UNITS`, `kept-session-review-changes.ts:47-146` six `*Changes`, `musicxml-marks.ts:33-79`,
`key-suggestion-scores.ts:42-72`, `lexicon-history.ts:11 LEXICON_ADDRESS`,
`lexicon-search.ts:14 MENTIONS_FROM_CHARACTERS`). Duplicate exports:
`notation-layout-policy.ts` (NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE / NOTATION_CHORD_SYMBOL_GAP_UNITS)
and `settings-mutation.ts` (SETTINGS_MUTATION_OFF / SETTINGS_MUTATION_DEFAULT).
Production run: domain has 153 of the 358 exports used only by tests or scripts. **Likely false
positives** there: `src/lexicon/` (6 exports: the lexicon API, consumed by the build step
`scripts/lexicon-words-plugin.ts` and by design an API), and exports the harnesses reach through
their Vite aliases. Dynamic `import()` targets were not reported as unused (knip follows them).

**For Q3/Q4:** there is no dead file in src/; the dead surface is exports (82 unused anywhere, 358
unused by the app itself), which is what a library's public surface would have to sort out.

---

## E5. Health today (`npm run lint:health`, exit 0)

Command: `npm run lint:health > e5-lint-health.txt`, then B's own `parse-health.mjs` (copied as
`e5-parse-health.mjs`), and `e5-sizes.mjs` (the repo's `effectiveLineCount` on src/).

| | 7af3628c (B §1.1) | 2ea48d1c (today) | change |
|---|---|---|---|
| files scanned | 1,583 | **1,625** | +42 |
| errors | 0 | 0 | — |
| warnings | 965 | **979** | +14 |
| — docs (missing doc comment) | 581 | **593** | +12 |
| — atd (> 5 distinct atoms) | 343 | **344** | +1 |
| — size (> 400 effective lines) | 41 | **42** | +1 |
| — nesting | 0 | 0 | — |
| warnings in src/ | 220 (docs 74, atd 143, size 3) | **222** (docs 76, atd 143, size 3) | +2 |
| files at exactly 10 atoms | 80 (45 src/, 35 tests/) | **80 (45 src/, 35 tests/)** | 0 |
| files at 9 atoms | 49 (15 src/) | **49 (15 src/)** | 0 |
| atd distribution 6/7/8/9/10 | 85/76/53/49/80 | 85/**77**/53/49/80 | 7 +1 |
| src/ files > 500 effective lines | 3 | **3**: WorkspaceShell.vue **596** (595; 4 under the 600 error), pitch-candidates.ts 561, ReviewPanel.vue 507 | |
| src/ files > 400 | 3 (the same) | 3 | 0 |
| tests/ files > 400 | 38 | **39** (new: tests/e2e/workspace/lexicon-page.spec.ts 417) | +1 |
| src/ 330–400 | 9 files | the same 9 with the same counts | 0 |

The 14 new warnings, all from wave 1: docs on `src/components/workspace/use-lexicon-page.ts` and
`lexicon-history.ts` (1 each), and on `tests/e2e/accessibility-lexicon.spec.ts` (4),
`tests/unit/components/lexicon/LexiconPage.spec.ts` (3), `tests/e2e/workspace/lexicon-page-history.spec.ts`
(3); atd: `tests/unit/boundaries/verify-boundaries.spec.ts` (6) new, `eslint-boundaries.spec.ts` 6 → 7;
size: lexicon-page.spec.ts 417; WorkspaceShell.vue 595 → 596. Of the 45 src/ files at 10 atoms, 23
are in components/workspace.

**For Q3:** health is flat across wave 1: the lexicon code added no src/ file near a limit and no
file at 10 atoms; WorkspaceShell.vue is the one file 4 lines from the size error.

---

## E6. Timings (idle machine, one run each, one after the other, 12 cores)

| command | wall | notes |
|---|---|---|
| `npm run build` | **18.4 s** | = `vue-tsc --build --force` + `vite build`; Vite reports "639 modules transformed … built in 1.07 s", the rest is the type-check and the PWA step |
| `npm run typecheck` | **15.9 s** | `vue-tsc --build --force` (app, node and e2e projects) |
| `rtk proxy npx vitest run --reporter=json --outputFile=$OUT/e6-vitest.json --reporter=dot` | **160.4 s** | 668 files, **10,325 tests, all passed**; vitest: tests 57 %, environment 34 %, import 7 %, transform 2 % of tracked time; jsdom created 668 times, 534 s of worker time |

Test time by area (`node e6-test-areas.mjs <repo> e6-vitest.json` → `e6-test-areas.md`), summed over
files (849 s of worker time on 12 workers):

| area of the test (by test path) | files | tests | file time s | % |
|---|---|---|---|---|
| domain | 165 | 3,788 | 478.3 | **56.3** |
| session | 66 | 953 | 108.1 | 12.7 |
| components/workspace | 166 | 1,507 | 78.0 | 9.2 |
| scripts (render-rhythm-examples, replay) | 4 | 40 | 60.4 | 7.1 |
| generation-worker | 22 | 276 | 55.1 | **6.5** |
| components/review | 21 | 165 | 17.4 | 2.1 |
| jam | 39 | 755 | 11.4 | 1.3 |
| storage | 48 | 804 | 9.3 | 1.1 |
| export | 23 | 277 | 6.1 | 0.7 |
| everything else (11 areas: code-health, controls, boundaries, controller-connection, App, notation, composables, audio, components/notation, midi, deployment) | 103 | 1,657 | 20.5 | 2.4 |
| lexicon + components/lexicon (new) | 11 | 103 | 4.4 | 0.5 |

By the area holding most of each file's `@/` imports: domain 343 files, 6,129 tests, **75.6 %** of the
time; files with only relative imports 10.4 %; session 4.0 %; components/workspace 3.9 %. Files whose
`@/` imports are **all in domain/ or generation-worker/: 186 files, 3,621 tests, 509 s (60 %)**.
By path, domain + generation-worker = 62.8 %.

The slowest files are all generation tests: rhythm-planner.spec 62.4 s (9 tests),
rhythm-prefilter-soundness-eighth 48.3 s and -sixteenth 45.1 s, render-rhythm-examples.spec 46.1 s,
rhythm-tie-key-batch 32.3 s. The longest single file (62 s) bounds the parallel wall time from below.

**For Q4:** a library package would carry about 60 % of the unit-test time (the property and
exhaustive generation tests); the app's own tests take about a third. The build is dominated by the
type-check (≈16 of 18 s; Vite itself ≈1 s). All tests run under jsdom, including the pure domain
tests, and environment set-up is 34 % of tracked test time.

---

## Not measured, and why

- Time until the app is usable on the reference phone (Q2, information): needs the device or a
  browser run; e2e and Playwright were out of the brief.
- Per-module gzip/brotli: rollup-plugin-visualizer reports 0 with `sourcemap: true` and
  pre-minification sizes without it, so compressed figures are per chunk only.
- Tone.js: already measured in part C, not redone.
