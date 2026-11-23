# v3.4 structural review — part B: code health, duplication, start-up footprint, delivery friction, Tone.js readiness

> Kept copy. Written 2026-11-22, measured on `main` 7af3628c, read-only. Scratchpad paths inside are historical: the scratchpad is not kept.

Read-only fact gathering, 2026-11-22, on `/home/bastien/work/infinite_flow` branch `main` at 7af3628c
(clean tree; `npm run build` wrote `dist/` only; a second build with `--sourcemap` went to the
scratchpad). Nothing in the repo was edited, nothing installed, no `atd audit`, no test suite run.

Scratchpad artefacts (all in `/tmp/claude-1001/-home-bastien-work-infinite-flow/078a838e-043b-4809-bb43-28f0a9b25e7f/scratchpad/structural-review/`):
`lint-health.txt` (raw `npm run lint:health`), `parse-health.mjs`, `metrics.mjs` + `metrics.json`
(file sizes, function length/complexity), `dup.mjs` + `dup-exact.txt` + `dup-fuzzy.txt` (clone
finder), `attribute.mjs` + `startup-attribution.json` (sourcemap byte attribution), `build.txt`,
`verify.txt`, `build-sm.txt`, `touched.txt` (files touched per commit since v3.0.0), `dist-sm/`
(sourcemapped build).

---

## 1. Code health today

### 1.1 `npm run lint:health` (scripts/code-health-check.mjs; limits in scripts/code-health/config.mjs)

| | 2026-10-21 (§4, v3.1 w5) | 2026-11-22 (today, main 7af3628c) | change |
|---|---|---|---|
| files scanned | 1,204 | 1,583 (11 `@lint-ignore-atd`, 269 ATD-exempt by scope) | +379 |
| errors | 0 | 0 | — |
| warnings | 746 | **965** | +219 (+29 %) |
| — docs (missing doc comment; §4 called them "missing intent comments") | 509 | 581 | +72 |
| — atd (> 5 distinct atoms) | 218 | 343 | +125 |
| — size (> 400 effective lines) | 19 | 41 | +22 |
| — nesting | 0 | 0 | — |
| warnings in `src/` | 159 | **220** (docs 74, atd 143, size 3) | +61 |
| files at exactly 10 atoms (the error edge) | 27 (17 in components/workspace) | **80** (45 `src/`, 35 `tests/`) | ×3 |
| files at 9 atoms | n/a | 49 (15 `src/`) | |
| largest `src/` file | `domain/pitch/pitch-candidates.ts` 553 | **`components/workspace/WorkspaceShell.vue` 595** (5 under the 600 error); `pitch-candidates.ts` 561; `components/review/ReviewPanel.vue` 507 | |

Same 965 total as recorded at the v3.3 release gate (wave-log-v3.3.md:99–100). v3.2 wave 6 recorded
"68 files at 10 atoms" (wave-log-v3.2.md:1477), so the count went 27 → 68 → 80 across v3.1 → v3.3.

Distinct-atom distribution of the 343 atd warnings: 6 atoms 85 files, 7: 76, 8: 53, 9: 49, 10: 80.

### 1.2 Files at the atom limit (10), by folder

`src/` (45):
- `src/components/workspace/` **23**: ScorePanel.vue, SessionCueRow.vue, WorkspaceHeader.vue,
  WorkspaceShell.vue, create-workspace-session.ts, kept-session-review-changes.ts,
  session-review-state.ts, use-player-presets.ts, use-session-options.ts, workspace-adaptive-tempo.ts,
  workspace-kept-session-edits.ts, workspace-kept-session-read.ts, workspace-session-begin.ts,
  workspace-session-controller-seams.ts, workspace-session-controller-types.ts,
  workspace-session-dependencies.ts, workspace-session-ends.ts, workspace-session-save.ts,
  workspace-session-settings.ts, workspace-session-start.ts, workspace-session-types.ts,
  workspace-session-without-phrase-one.ts, your-data-copy.ts
- `src/session/` 6: session-engine-state.ts, session-engine.ts, session-history.ts,
  session-settings-change.ts, session-types.ts, settings-mutation.ts
- `src/composables/` 4: generation-session-control-actions.ts, generation-session-fit-round.ts,
  generation-session-types.ts, use-generation-session.ts
- `src/storage/` 4: records/kept-session-body.ts, records/kept-session-summary.ts,
  records/settings-record.ts, settings-saver.ts
- `src/midi/` 2: midi-controller-state.ts, midi-controller.ts
- `src/generation-worker/` 2: generation-worker-inbound.ts, phrase-replay-key-decode.ts
- 1 each: `src/components/review/ReviewPanel.vue`, `src/domain/pitch/pitch-candidates.ts`,
  `src/jam/jam-phrase-one-attempts.ts`, `src/storage-bootstrap.ts`

`tests/` (35): 31 unit (15 under `tests/unit/components/workspace/`, incl. WorkspaceShell.spec.ts,
WorkspaceShell-kept-doodle.spec.ts, seven `workspace-session-controller-*.spec.ts`), 4 e2e
(`accessibility.spec.ts`, `session/session-vary-settings.spec.ts`, `storage/kept-jam-session.spec.ts`,
`workspace/preset-bar.spec.ts`).

So `components/workspace/` (src + its unit tests) holds **38 of the 80** files at the limit.
Files at 9 (one link from the edge) in `src/`: App.vue, audio/audio-transport.ts,
components/controls/FoundationControls.vue, components/workspace/review-export.ts,
components/workspace/workspace-session-controller.ts, domain/generation/generation-intent.ts,
domain/generation/generation-request.ts, domain/generation/orchestration/generation-orchestrator.ts,
domain/pitch/pitch-advance.ts, domain/presets/preset-selection.ts, jam/jam-settings.ts,
session/session-intents.ts, session/settings-mutation-scales.ts, storage/records/kept-session-record.ts,
storage/save-policy.ts.

### 1.3 Files at or near the size limits (repo's own `effectiveLineCount`)

`src/` over 400 (warn): WorkspaceShell.vue 595, pitch-candidates.ts 561, ReviewPanel.vue 507.
`src/` 330–400 (next in line): notation/vexflow-engraver.ts 392, midi/midi-controller.ts 386,
notation/notation-layout-policy.ts 378, domain/generation/carry-in/carry-in.ts 369,
storage/records/settings-record.ts 354, components/notation/session-staff-positions.ts 336,
domain/harmony/harmony-planner.ts 335, session/session-history.ts 335, session/session-engine.ts 330.

`tests/` over 400: 38 files; within 10 of the error: `tests/e2e/accessibility.spec.ts` 594,
`tests/e2e/review/review-privacy.spec.ts` 591; then pitch-search-equivalence.spec.ts 567,
written-phrase.spec.ts 561, notation-layout-policy.spec.ts 558, musicxml-encoder.spec.ts 552.
By folder: tests/unit 27, tests/e2e 10, tests/sweep 1, src/components 2, src/domain 1.

WorkspaceShell.vue: 935 raw lines, **55 import statements** (§4: ~36), 595 effective lines, 10 atoms,
touched by **22 of the 128 non-merge `src/` commits since v3.0.0** (the most of any file; next
create-workspace-session.ts 15, jam/jam-mode.ts 13, workspace-session-controller.ts 12,
workspace-pregeneration.ts 12, workspace-session-start.ts 11, workspace-session-controller-types.ts 11,
kept-session-record.ts 10, session-intents.ts 10, ControlPanel.vue 10).

### 1.4 Size of `src/` (.ts + .vue), re-measured

526 files, 93,214 raw lines, 52,280 effective lines (CSS another 2,894 lines). §4 said "about
72,000 lines". By top folder (raw / effective): components 32,242 / 17,936 (197 files; §4 ~25,000);
domain 22,954 / 14,317 (130; §4 ~19,000); session 7,767 / 3,970 (39; §4 ~6,000); storage 7,126 /
3,652 (32; §4 ~5,500); jam 6,496 / 3,514 (38; new since v3.2); notation 3,349; composables 3,218;
generation-worker 2,976; export 2,733; audio 2,410; midi 1,496.
`components/workspace/`: **139 files, 23,486 raw lines** (§4: 109 files, ~17,200): 38 `use-*.ts`,
23 `workspace-session-*`, 13 other `workspace-*`.

### 1.5 Function length and complexity (computed; there is no such rule in lint:health)

Method (`metrics.mjs`): TypeScript compiler API over every `src/**/*.ts` and every `.vue` script
block (parsed by the repo's own `scripts/code-health/sources.mjs`). Each function-like node with a
body (function declaration, method, arrow, function expression, accessor, constructor) is one
function. Length = source lines from its start to its end, comments and blanks included, nested
closures included. Cyclomatic complexity = 1 + each `if`, `?:`, `case`, `for`/`for-in`/`for-of`,
`while`, `do`, `catch`, `&&`, `||`, `??`, **not** counting nested functions (so a factory closure
scores low however long it is). Limits: templates are not measured; a closure-style module
(`createX` returning an object of inner functions) shows as one long, simple function.

5,699 functions. Length: ≤10 lines 4,312; 11–30 1,160; 31–60 146; 61–100 42; 101–200 26; >200 13.
Complexity: ≤5 5,327; 6–10 324; 11–15 36; 16–20 6; 21–30 3; >30 3.

Longest (all closure factories, cc 1–5): `src/midi/midi-controller.ts:82` createMidiController 534
lines; `src/components/notation/session-staff-positions.ts:137` createStaffPositions 369;
`src/composables/generation-session-fit-round.ts:147` createFitRunner 329;
`src/composables/use-generation-session.ts:110` createGenerationSession 325;
`src/components/workspace/workspace-kept-session-edits.ts:105` createKeptSessionEdits 321;
`src/jam/jam-capture.ts:161` createJamCapture 281; `src/composables/generation-session-control-actions.ts:129`
253; `src/components/workspace/create-workspace-session.ts:106` composeWorkspaceSession 242;
`src/jam/jam-phrase-one.ts:160` 242; `src/components/workspace/workspace-pregeneration-queue.ts:148` 233;
`src/components/workspace/workspace-session-controller.ts:173` createSessionController 232;
`src/storage/save-policy.ts:238` createSavePolicy 209. 18 of the 39 functions over 100 lines are in
`components/workspace/`.

Most complex (real branching hot spots, all in pure domain code):
`src/domain/rhythm/rhythm-validator.ts:71` validateRhythmCandidate **cc 87, 230 lines**;
`src/domain/rhythm/rhythm-validator-provenance.ts:97` hasRenderedTransformAlgebra cc 36 / 90;
`src/domain/rhythm/syncopation.ts:171` applyTransform cc 35 / 141;
`src/domain/pitch/validation/figure-rules.ts:243` figureFailures cc 23; `src/domain/pitch/pitch-figures.ts:172`
advanceFigure cc 23; `src/domain/notation/notation-input.ts:181` validateNotationPhraseInput cc 21;
`src/domain/pitch/validation/figure-rules.ts:138` cc 20; `src/domain/pitch/pitch-advance.ts:241`
transition cc 19; `src/domain/rhythm/rhythm-distance.ts:155` cc 19;
`src/session/session-before-phrase-one.ts:267` handleBeforePhraseOne cc 16;
`src/session/session-engine.ts:329` dispatch cc 13.

Reading: the UI/session layer's risk is long closure factories (state held in one closure, many
inner functions), concentrated in `components/workspace/` and `composables/`; the domain's risk is
a few validators with very high branching (rhythm validator). Nesting stays under the limit
everywhere (0 nesting warnings), though three v3.2/v3.3 gates failed once on nesting in tests (§4).

---

## 2. Duplication (hand-rolled; no jscpd)

Method (`dup.mjs`): over all 530 `src/**/*.{ts,vue,css}` files, lines are normalised (trimmed,
whitespace collapsed); blank lines, comment-only lines, `import` statements and multi-line
`import {…} from` / `export {…} from` lists, and pure closer lines (`}`, `)`, `];` …) are dropped.
Every window of W consecutive normalised lines is hashed (windows with fewer than W×12 characters
or fewer than 60 % distinct lines are skipped as noise; hashes seen in more than 12 places are
skipped as boilerplate). Matching windows with the same offset are merged into blocks. Two passes:
**exact** (W = 8) and **fuzzy** (W = 10; identifiers → `ID`, strings → `STR`, numbers → `NUM`,
keywords kept), which catches renamed copies.

Results: 44,850 normalised lines. Exact: 736 lines (1.6 %) lie in a window repeated elsewhere, 30
blocks. Fuzzy: 1,048 lines (2.3 %), 51 blocks. Duplication is **low overall**; it clusters.

Limits: line-based (a reformatted copy or a copy with inserted lines splits into smaller blocks
or is missed); no AST or token-level matching; `.vue` templates and CSS are compared as text;
fuzzy mode over-matches on structural boilerplate (prop lists, interface declarations); short
copies (< 8–10 lines) are invisible; tests were not scanned. Block line numbers point at the first
and last matched source lines.

### 2.1 Top duplicated blocks (file:line pairs)

| lines | A | B | what |
|---|---|---|---|
| 31 | src/domain/pitch/pitch-motion.ts:21-57 | src/domain/pitch/validation/motion-rules.ts:20-56 | leapiness limits table. **Deliberate**: motion-rules.ts:17 says "restated from the policy so the validator never reads planner tables" |
| 30 | src/domain/rhythm/rhythm-planner.ts:445-474 | src/domain/rhythm/rhythm-validator.ts:25-54 | the same ordered list of rhythm validation codes (`VALIDATION_ORDER` vs `CODE_ORDER`) |
| 28 + 15 + 13 + 13 | src/components/review/ReviewPhrase.vue:250-280, :204-230, :100-122, :66-96 | src/jam/review/ReviewDoodle.vue:197-227, :170-195, :88-110, :53-79 | review staff template, engraving try/catch, lane props, types: **~70 lines** copied between the phrase review and Jam's doodle review |
| 19 + 11 + 9 (+10, 10 fuzzy) | src/components/controls/FoundationControls.vue:272-291, :304-314, :293-302 | src/jam/JamControls.vue:243-262, :276-286, :264-274 | the instrument profile / harmonic motion / seventh-chords field bindings |
| 19 | src/styles/theme.css:245-263 | src/styles/theme.css:269-287 | dark palette under `[data-theme='dark']` and under `prefers-color-scheme` (inherent to CSS without a preprocessor) |
| 15 | src/domain/presets/preset-selection.ts:109-124 | src/storage/records/preset-record.ts:150-165 | `HELD_CONTROL_CATALOGS` mapped type |
| 14 | src/components/workspace/workspace-session-begin.ts:162-177 | src/components/workspace/workspace-session-phrase-one-entry.ts:95-110 | staff-fit publish wiring |
| 20 (fuzzy) | src/components/workspace/MyInstrumentSheet.vue:202-233 | src/components/workspace/PresetSheet.vue:158-192 | focusable-stops + Tab wrap |
| 18 (fuzzy) | src/components/workspace/StalePhrasePrompt.vue:140-167 | src/components/workspace/YourDataSheet.vue:178-205 | Escape/Tab keydown and focus wrap |
| 13 / 10 | src/components/workspace/MyInstrumentSheet.vue:246-260, :218-234 | src/components/workspace/YourDataSheet.vue:223-237, :190-206 | sheet backdrop template; keydown |
| 10 (fuzzy) | src/components/workspace/ConfirmationSheet.vue:55-67 | MyInstrumentSheet.vue:212-224 / PresetSheet.vue:168-180 | Tab wrap |
| 19 (fuzzy) | src/audio/backing-track.ts:137-165 | src/audio/guide-track.ts:69-97 | placement-on-clock function |
| 28 (fuzzy) | src/domain/chords/chord-families.ts:57-109 | src/domain/figures/figure-levels.ts:122-173 | error class + plain-object parse of a levels record |
| 20 (fuzzy) | src/components/review/load-review-panel.ts:18-64 | (same file) :46-95 | two cached-promise loaders side by side |
| 10 (fuzzy) | src/export/load-generated-notes-export.ts:37-60 | src/notation/vexflow-engraver-loader.ts:18-38 | cached-promise lazy loader |
| 11 / 10 (fuzzy) | src/storage/migrations/kept-sessions-v2.ts:55-78 | kept-sessions-v4.ts:58-83, presets-and-kept-sessions-v5.ts:46-70 | migration step scaffolding |
| 12 / 10 | src/generation-worker/phrase-replay-key.ts:90-101, src/domain/presets/preset-selection.ts:49-58 | src/session/settings-mutation-scales.ts:365-376 | the ordered settings key list |
| 9 / 10 (fuzzy) | src/session/session-before-phrase-one.ts:244-253 | src/session/session-engine.ts:316-325 | the dropped-event kinds list |
| 10 | src/components/workspace/workspace-session-start.ts:185-194 | src/components/workspace/workspace-session-without-phrase-one.ts:262-271 | session run state initialiser |
| 9 / 11 (fuzzy) | src/components/workspace/ScorePanel.vue:96-106 | src/components/workspace/WorkspaceShell.vue:132-141 | prop declarations passed down unchanged |
| 8 / 10 (fuzzy) | src/components/notation/PhraseScore.vue:357-364 | src/jam/JamStaff.vue:241-248 | `scheduleCheck` rAF resize check |
| 12 (fuzzy) | src/domain/backing/backing-renderer.ts:30-52 | src/domain/backing/guide-renderer.ts:20-42 | renderer input interfaces |

### 2.2 Patterns repeated across files (grep counts)

- **Sheet dialogs**: 6 sheet components each render their own `sheet-backdrop` and their own
  Escape/Tab focus trap (`event.key === 'Tab'` in ConnectionSheet.vue, ConfirmationSheet.vue,
  MyInstrumentSheet.vue, PresetSheet.vue, StalePhrasePrompt.vue, YourDataSheet.vue);
  `querySelectorAll('button:not([disabled])')` repeated; **no shared trap helper** (0 hits for
  trapFocus / focus-trap / useFocusTrap). Only `sheet-close-focus.ts` is shared.
- **Lazy-loader boilerplate**: 8 `load-*.ts` files (load-connection-sheet, load-staff-drawing,
  load-review-panel, load-jam-mode, load-my-instrument-sheet, load-preset-sheet,
  load-my-instrument-actions, load-generated-notes-export) plus vexflow-engraver-loader.ts, each a
  cached promise around `import()`; 44 `import('…')` sites in `src/`.
- **Codec/parse boilerplate**: `isPlainObject` / `isObject` / `asRecord` re-implemented **9 times**
  (phrase-replay-key-decode.ts:146, my-instrument-record-read.ts:32, record-envelope.ts:33,
  figure-levels.ts:132, chord-families.ts:67, key-and-mode-restriction.ts:48,
  preset-selection.ts:146, instrument-profile.ts:195, measure-event-parser.ts:30). **88 `extends Error`
  classes in 82 files**, each with the same `readonly name = '…' as const` shape.
- **Settings plumbing**: the ordered settings key list (`'tonalCenter', 'collection',
  'harmonicMotion', …`) is spelled out in 5 files: generation-worker/phrase-replay-key.ts,
  storage/records/settings-record.ts, session/carry-in-adaptation.ts,
  session/settings-mutation-scales.ts, domain/presets/preset-selection.ts.
- **Jam vs session parallels**: ReviewDoodle ↔ ReviewPhrase, JamControls ↔ FoundationControls,
  JamStaff ↔ PhraseScore (above): Jam's code boundary (`src/jam/` lazy) was met by copying UI pieces.

---

## 3. Start-up footprint

### 3.1 Today's build (`npm run build` + `npm run verify:boundaries`, both exit 0)

- **All start-up JavaScript: 386,990 B of 409,600 B** (400 KiB, D536) in **18 chunks**, 22,610 B left
  (v3.3 release recorded 387,038 B; −48 B). Entry `assets/index-Ccwq_Rwu.js` **331,978 B**
  (reported, not gated). gzip -9 124,403 B; brotli 107,817 B. CSS `index-*.css` 48,205 B (no budget).
- Lazy: 42 more JS chunks (60 in the module graph; verify counts 62 with the two workers). Biggest:
  vexflow-engraver 735,110 B, generation.worker 159.3 KB (156 KiB on disk), workspace-session-controller
  62,680 B, jam-mode 61,824 B, ReviewArea 27,700 B, ReviewPanel 22,520 B, ConnectionSheet 21,880 B.
- No sourcemaps in the normal build. A second build (`npx vite build --sourcemap --outDir <scratchpad>`,
  same hashes) gave maps; `attribute.mjs` walks every mapping segment of the 18 start-up chunks and
  credits each byte run to its source file (`dist/.vite/module-graph.json` gives the chunk set).

Start-up JS by origin: **app code 317,748 B (82 %)**, Vue 62,342 B (runtime-core 34,307, reactivity
16,073, runtime-dom 8,130, shared 3,832), PWA register 1,068 B, unmapped (bundler glue) 5,850 B.

By folder (all 18 chunks): components/workspace 87,543; components/controls 35,688; storage/records
30,255; domain/generation 20,984; composables 19,573; audio 17,342; storage 14,341; domain/notation
13,995; midi 10,687; domain/presets 10,197; components/notation 7,519; domain/profile 7,173;
domain/events 6,112; domain/controls 5,933; notation 5,391; domain/backing 4,052; session 3,241;
domain/doodle 2,864; storage/migrations 2,291; App.vue + main.ts + storage-bootstrap.ts 5,062.

The 17 non-entry start-up chunks (55,012 B) are shared domain modules rolldown split out
(carry-in 9,218; built-in-presets 8,783; steering-block 6,267; instrument-profiles 5,424;
generation-request 4,262; timeline-parser 4,055; pitch-spelling 3,388; …).

### 3.2 What is in the entry (186 modules)

Top modules: runtime-core 34,307; reactivity 16,073; **WorkspaceShell.vue 14,317**; runtime-dom
8,130; ScorePanel.vue 6,204; create-workspace-session.ts 6,201; midi-controller.ts 5,265;
settings-record.ts 4,769; kept-intent-parsers.ts 4,688; FoundationControls.vue 4,353;
PhraseScore.vue 4,345; WorkspaceHeader.vue 4,264; kept-phrase-parsers.ts 4,258;
kept-session-body.ts 4,256; use-generation-session.ts 4,252; notation-layout-policy.ts 4,070;
kept-session-summary.ts 4,059; use-app-notices.ts 3,721; SessionOptionsControls.vue 3,614;
database.ts 3,499; generation-session-fit-round.ts 3,400; MixVolumePanel.vue 3,215.

### 3.3 Lazy-loading candidates (what the entry holds that the first screen may not need)

Confirmed static imports: `WorkspaceShell.vue:69` ControlPanel, `:89–93` AppNoticeRow, LayoutFooter,
WorkspaceHeader, ScorePanel, OrientationNotice; App.vue:31 WorkspaceShell; main.ts:7
storage-bootstrap. Whether each part is on the first screen is inferred from the templates, not
from a run.

| candidate | bytes in start-up | evidence | comment |
|---|---|---|---|
| Kept-session codecs reached by start-up migration step 5 (kept-intent-parsers, kept-phrase-parsers, kept-session-body, kept-session-summary, kept-record-shape, kept-session-body-read, kept-reading) | ≈ 20,600 | storage/database.ts:14–17 imports every migration statically; wave-log-v3.3.md:886–893 (17a's step 5 added 18,224 B to the entry) | option (c) "load the migration steps lazily before the database opens" was put to the owner and not taken (D536 counted all start-up JS instead). Biggest single cut. |
| Audio transport and sounding (audio-transport, transport-session, web-audio-voices/-output/-session-bus, click-, backing-, guide-track, look-ahead-scheduler, worker-wake-timer) | ≈ 15,100 of audio's 17,342 (audio-mix 2,215 is read by storage-bootstrap and settings) | `AudioContext` only at `unlock()` (browser-audio-transport.ts:17–22, web-audio-output.ts:170–175); create-workspace-session.ts:37,44 import it statically | must keep `new AudioContext` synchronous inside the click (rule_audio_unlocked_by_player_click): split "open context" (tiny, static) from "schedule voices" (lazy, prefetched). Also the natural Tone.js door (§5). |
| MIDI (midi-controller, web-midi-access, played-note-tracker, midi-message, controller-status, clock mapping) | 10,687 | midi-controller.ts is one 534-line factory | needs checking whether a remembered controller reconnects at start (controller-remembered.spec.ts exists); not confirmed. |
| Jam host-side composables in the entry (use-jam-idle-cue, use-jam-bar, use-fresh-jam, use-jam-settings, use-jam-view-props, use-jam-pregeneration, use-kept-doodle-phrase/-host/-jam, KeptDoodleStaff.vue, load-jam-mode, jam-session-cue) | ≈ 15,100 (plus domain/doodle 2,864) | WorkspaceShell.vue:113–125; KeptDoodleStaff `v-if="keptPhrase !== null"` (ScorePanel.vue:593) | Jam's own code is out (boundary check passes) but its host wiring is in. |
| Mix volume popover (MixVolumePanel.vue, mix-volume-popover.ts, MixVolumeButton.vue, MixControls.vue) | ≈ 6,600 | MixVolumePanel rendered `v-if="holdsPopover"` (MixVolumeButton.vue:80–81) | a `defineAsyncComponent` candidate. |
| Sheet hosts (use-preset-sheet, use-my-instrument-sheet, use-your-data, use-connection-sheet, use-review-host/-navigation) | ≈ 6,800 | the sheets themselves are already lazy | host logic could move into the lazy chunks. |
| ControlPanel subtree (components/controls) | 35,688 | `ControlPanel v-else` (WorkspaceShell.vue:842–843) shown in session mode's idle screen | on the first screen: lazy-loading it moves bytes out of the count but delays first use. Not a real gain. |
| ScorePanel, WorkspaceHeader, PhraseScore, domain/notation | ≈ 30,000 | on the first screen (the idle phrase) | same: on the critical path. |
| Vue | 62,342 | | fixed cost; Options API already off (vite.config.ts:24–25, ~4.5 kB). |

Rough ceiling of the "not on the first screen" group: about 75 KB (migration codecs ~20.6, audio
~15.1, Jam host ~15.1, MIDI ~10.7, sheet hosts ~6.8, popover ~6.6) of the 387 KB, before
shared-chunk effects and before checking each part is truly unused at first paint.
Moving the first-screen components (ControlPanel, ScorePanel, Header) would change what is counted
more than what the player waits for.

Caveat seen in the logs: rolldown re-chunks shared modules unpredictably (wave-log-v3.2.md:644–659:
~18.5 kB folded into the entry and back out with no change in what loads; wave-log-v3.3.md:886–893:
three shared chunks merged into the entry). The all-start-up measure (D536) is immune to this; the
entry-file figure is not.

### 3.4 Trend v3.0 → v3.3

| point | entry file (B) | all start-up JS (B) | budget then | source |
|---|---|---|---|---|
| v3.0.0 | 229,146 | — | 229,376 (224 KiB, entry) | docs/release/v3.0-release-notes.md:186 |
| v3.1 waves 1–5 | 230,609 → 227,702 → 246,844 → 250,721 → 265,431 | — | 307,200 (300 KiB, D359) | structural-review.md §4; wave-log-v3.1.md:505, 597, 707 |
| **v3.1.0** | **265,431** | — | 307,200 | docs/release/v3.1-release-notes.md:302 |
| v3.2 w2 (after fix) | 271,179 | 318,964 (16 files) | 307,200 | wave-log-v3.2.md:655 |
| v3.2 w3 | 282,098 | 329,885 (16) | | wave-log-v3.2.md:790 |
| v3.2 w4 | 290,302 | 338,186 (17) | | wave-log-v3.2.md:1043 |
| v3.2 w5 | 282,047 | 344,080 (22) | | wave-log-v3.2.md:1278 |
| v3.2 w6 | 288,120 | 350,038 (21) | | wave-log-v3.2.md:1475–1479 |
| v3.2 w7 (mid) | 302,365 (4.8 kB left) | | → 327,680 (320 KiB, D504) | wave-log-v3.2.md:1605, 1655 |
| **v3.2.0** | **311,455** | **373,581** (21) | 327,680 | docs/release/v3.2-release-notes.md:415–421 |
| v3.3 w1 / w2 / w3 | 313,113 / 313,896 / 314,692 | w3 380,072 | | wave-log-v3.3.md:200, 404, 577, 891 |
| v3.3 w4 | 330,428 (over) | 385,440 (18) | → 409,600 all start-up (400 KiB, D536) | wave-log-v3.3.md:886, 905–910 |
| **v3.3.0** | **332,026** | **387,038** (18) | 409,600 | docs/release/v3.3-release-notes.md:414–418 |
| today (main 7af3628c) | 331,978 | 386,990 (18) | 409,600 | verify.txt |

Growth per release: entry +36,285 B (v3.1), +46,024 B (v3.2), +20,571 B (v3.3, of which ~18 kB a
re-chunking); start-up total +13,457 B in v3.3 (v3.2's starting total is not recorded). The budget
moved three times in three releases (224 → 300 → 320 KiB entry, then 400 KiB all start-up), each
time when headroom ran out mid-wave (wave-log-v3.2.md:1653–1656; wave-log-v3.3.md:886–910).
Headroom now: 22,610 B, about one v3.3's worth of growth.

---

## 4. Delivery friction from the v3 wave logs

### 4.1 Gate failures (first runs that were red) and causes

| wave gate | failure | cause | fix | cite |
|---|---|---|---|---|
| v3.1 w3 | e2e `pregeneration.spec.ts` | test expected 7 stores after chunk 16 added `presets` | test only | wave-log-v3.1.md:499–501 |
| v3.1 w4 | e2e `controller-connection-layout.spec.ts:137` + 2 load timeouts | Chromium layout with a `<select>` dropped the scroll the test read | test only | wave-log-v3.1.md:589–596 |
| **v3.1 w5** | **lint:health: WorkspaceShell.vue 12 atoms, ControlPanel.spec.ts 13** | chunks 14, 17b, 18 pushed both over 10 | code moved into `use-control-panel-actions.ts`, spec split | wave-log-v3.1.md:694–699 |
| v3.1 w5 | e2e `embellishment-levels.spec.ts:200` | counted background requests | test only | wave-log-v3.1.md:700–704 |
| v3.2 w1 | lint:health nesting `rhythm-bars-domain.spec.ts:171` | chunk 5 | fixed before gate | wave-log-v3.2.md:328–329 |
| **v3.2 w2** | **entry +24,856 B** | ~18.5 kB re-chunking + 2.9 kB v4 Jam reader reached by start-up migration via kept-session-body.ts | reader moved to `kept-session-body-read.ts` | wave-log-v3.2.md:644–659 |
| v3.2 w3 | 4 e2e in `key-and-mode-marks.spec.ts` | locator matched new Vary settings note | test only | wave-log-v3.2.md:785–788 |
| **v3.2 w4** | **worker chunk 154,238 B > 150 KiB** | chunk 8 merged without a build (+2,167 B) | owner raised budget to 170 KiB (D451) | wave-log-v3.2.md:1029–1060 |
| **v3.2 w5** | **3 fixes: nesting (jam sweep), 10-atom (chunk 18 spec), seed assumption** | | spec split by topic; loop extracted | wave-log-v3.2.md:1259–1264 |
| v3.2 w6 | flake `session-start-conditions.spec.ts:114` | load | ISS-016 filed | wave-log-v3.2.md:1468–1472, 1535 |
| **v3.2 w7** | **lint:health 10 errors: atoms > 10 in audio-ports.ts, audio-transport.ts, web-audio-session-bus.ts (+spec), review-export.ts, use-review-area.ts, workspace-session-midi.ts; WorkspaceShell.vue 621 lines; a sweep spec with no link; a missing intent comment** | chunks 25, 32, 33, 40 | 4 commits, "files split along their seams, links moved with their functions" | wave-log-v3.2.md:1723–1734 |
| v3.3 w0 | 3 e2e/a11y load timeouts | host load 19 | ISS-017 filed | wave-log-v3.3.md:61–74 |
| v3.3 w1 | lint:health nesting `collection.spec.ts:251` + e2e load flake | chunk 2 | helper extracted | wave-log-v3.3.md:125, 184–191 |
| v3.3 w3 | e2e `session-midi-start.spec.ts:392` 2/2 | harness's armed `failNextGeneration` raced (pre-existing, 1 in 40 under load) | ISS-016 extended; ISS-018 filed | wave-log-v3.3.md:562–573, 682 |
| **v3.3 w4** | **verify:boundaries: entry 330,428 B > 327,680 B** | chunk 17a's step 5 static from database.ts → codecs + 3 shared chunks merged into the entry | owner ruled "Count all startup JS" (D536) | wave-log-v3.3.md:878–910 |
| **v3.3 w5** | **lint:health 2 errors: settings-record.ts and accessibility.spec.ts at 11 atoms** | chunk 23's links | link moved, axe test drops one link | wave-log-v3.3.md:1117–1121 |
| v3.3 w5 / release | e2e host failures (`ERR_NETWORK_CHANGED`, harness timeouts) | host load | rerun alone | wave-log-v3.3.md:1121–1123, 1262 |

Count: **17 red first runs over 18 gates** (v3.1 w0–w5, v3.2 w0–w7, v3.3 w0–w5). By cause:
code-health limits **6** (atoms 4: v3.1 w5, v3.2 w5, v3.2 w7, v3.3 w5; nesting 3: v3.2 w1, v3.2 w5,
v3.3 w1; size 1: v3.2 w7; some gates had several); bundle budgets **3** (v3.2 w2 entry, v3.2 w4
worker, v3.3 w4 entry; plus the mid-wave D504 raise); test assumptions broken by new behaviour **5**;
load flakes / harness timeouts **≥ 6** (ISS-016, ISS-017, ISS-018).

### 4.2 "Beyond Files" changes and Files-line corrections

- v3.1 chunk 4: `kept-phrase-parsers.ts` changed outside its Files line, forced by a new intent
  field (wave-log-v3.1.md:202–205). v3.1 chunk 14: `WorkspaceShell.vue` routes the level change,
  beyond Files (:663–665). v3.1 wave 1 preflight: ten plan corrections, Files lines of chunks 4, 5, 8
  (:161).
- v3.2 chunk 1: cases modules, recorder scripts, `.prettierignore` (wave-log-v3.2.md:83–84);
  chunk 10: the orchestrator and the worker protocol (:527–529); chunk 20: a fifth VexFlow importer
  `vexflow-empty-system-engraver.ts` and Jam's view in `ScorePanel.vue` (:904–906); chunk 40's Files
  corrected to three `queueBacking` call sites (:1555–1557).
- v3.3: Files lines fixed on chunks 3, 8, 10, 11 at preflight (wave-log-v3.3.md:104); chunk 3's gap
  `use-generation-session.ts`, `generation-session-prewarm.ts` (:123–124); chunk 5 fixtures (:251);
  chunk 17 gains `generation-session-control-actions.ts`, `create-workspace-session.ts` (:718–719);
  chunk 18 measurement files (:720); chunk 23 gains `fresh-jam-settings.ts`, `jam-phrase-one-attempts.ts` (:1056).

Recurring "beyond Files" targets: **WorkspaceShell.vue / ScorePanel.vue / create-workspace-session.ts
/ the composables** (the shell wiring every feature passes through), **kept-phrase-parsers.ts and
the codecs** (every new intent field), the **worker protocol / orchestrator**, measurement plumbing.

### 4.3 Recurring sync notes (no literal "sync note" heading; patterns in the Sync sections)

- **Links left out or placed off the busiest file because of the 10-atom cap**: v3.1 w4 (chunk 13,
  three links, wave-log-v3.1.md:584, 606); v3.2 w1 ("two atoms' tags were placed off the busiest
  files", wave-log-v3.2.md:326–327); v3.3 w4 (`req_seventh_chords_level` linked from tests only,
  `settings-record.ts` and `settings-saver.ts` at the limit, wave-log-v3.3.md:800–802). The limit is
  bending where links go, not only where code goes.
- **Risk lines "at the 10-atom limit / near the size limit"** carried in chunk reports: audio-transport.ts,
  workspace-session-without-phrase-one.ts, session-history.ts (wave-log-v3.2.md:1209–1211, 1318–1319);
  accessibility.spec.ts 561→589, notation-calibration.spec.ts 591 (:1386, 1476–1477, 1524–1526);
  pitch-candidates.ts (wave-log-v3.3.md:301, 868); phrase-replay-key-decode.ts (:528); WorkspaceShell.vue
  442 → 540 → 553 → 621 → 595 (wave-log-v3.2.md:912, 1400, 1476, 1725; today).
- Docs leftovers routed to a later pass (lexicon entries, `docs/phrase-workspace.md`,
  `docs/session-engine.md` wording) at nearly every v3.1 sync (wave-log-v3.1.md:589, 611–613, 728–733).
- `atd audit` timed out (Ollama) so bloat/collision went unchecked (wave-log-v3.2.md:1752–1753).

### 4.4 Chunks that had to split or pause beyond their plan

Planned split rules (a/b/c) are routine in all three plans. Unplanned:
- v3.2 chunk 22 paused mid-22a on the usage limit, resumed next session (wave-log-v3.2.md:579–615);
  chunk 17 paused after 17a "(context)" (:1170); chunk 31 paused after 31a (:1232); chunk 21's owner
  paused at ~190k context (:1374); chunk 23's owner paused at heavy context (:1444); chunk 24's owner
  cut off by a usage limit (:1600); wave 7 paused after chunk 24 for a session (:1608).
- v3.3 chunk 8's owner handed back early with an unverified WIP (wave-log-v3.3.md:136–138); chunk 16
  stopped on an auth error, resumed from WIP and re-split 16a–16c (:536–538); chunk 17's two
  executors each over 300k context, max 410k: "a split per codec file would have kept them under it"
  (:806, 1001–1004); chunk 3 re-split three ways at preflight (:104).
- Recurring: chunks that touch **the codecs + migration + settings + e2e together** (v3.2 22, v3.3 17)
  and **the Jam/session start path** (v3.2 17, 21, 31) are the ones that overflow one context.

### 4.5 Merge conflicts

One recorded: the side branch `v3.2-guide-playback` merged into wave 7 with plan/spec conflicts
resolved by `spec-writer` (wave-log-v3.2.md:1552–1557). None in code (κ = 1, one chunk at a time per
area). Conflict risk shows up instead as Files-line overlaps on WorkspaceShell.vue / ScorePanel.vue.

### 4.6 Files and areas that recur

`src/components/workspace/WorkspaceShell.vue` (22 commits since v3.0, size + atom gate failures,
beyond-Files twice), `create-workspace-session.ts` (15), the `workspace-session-*` family
(controller, start, ends, without-phrase-one, midi: 8–12 each), `ScorePanel.vue`, the kept-session
codecs and migrations (`kept-session-record.ts` 10, `kept-phrase-parsers.ts` 8, `kept-session-body.ts` 7,
`database.ts` step chain; two entry-budget incidents), `settings-record.ts` (9; atom gate failure),
`session-intents.ts` (10), `jam/jam-mode.ts` (13), the generation worker inbound/replay key (9/7;
worker budget incident), audio (`audio-ports.ts`, `audio-transport.ts`, `web-audio-session-bus.ts`:
atom gate failure in v3.2 w7), and the large e2e specs (`accessibility.spec.ts`, `notation-calibration.spec.ts`).

---

## 5. Tone.js readiness

### 5.1 The seam as built

- `src/audio/audio-ports.ts` (140 lines): `AudioClock`, `AudioOutput` (`setGain`, `openSessionBus`,
  `onInterrupted`), `SessionBus` (`scheduleClick`, `scheduleBackingNote`, `scheduleGuideNote`,
  `fadeOut`, `forceClickUntil`), `WakeTimer`. Pure types; no Web Audio.
- `src/audio/sound-roles.ts`: `MIX_CHANNELS` (click, backing, melody-guide, rhythm-guide),
  `SoundRole` (bass, chord, melody-guide, rhythm-guide), `SOUND_ROLE_VOICES` data entries
  (`SoundRoleVoice.waveform: 'sine' | 'triangle'`, peak, attack, release, channel) — C19.6 layer 3.
- Code that knows Web Audio nodes today: **three files**, not one:
  `src/audio/web-audio-output.ts` (the `AudioContext` at :172, the mix gain graph, interruptions,
  clock anchor), `src/audio/web-audio-voices.ts` (268 lines: `soundClick`, `soundNote`,
  `soundBackingNote`, `fadeRingingNote`, the `WebAudioNodeFactory` port: `createGain`,
  `createOscillator`), `src/audio/web-audio-session-bus.ts` (143 lines: routes and fades per session,
  calls the voices with `SOUND_ROLE_VOICES[note.role]` at :118–132). C19.6 (master-spec.md:4972–4996)
  and `module_guide_playback_layers` name only the session bus as "the only part that knows Web
  Audio".
- Composition root: `src/audio/browser-audio-transport.ts:25–31` wires `openOutput:
  openWebAudioOutput`; `createAudioTransport` (audio-transport.ts:188) calls `deps.openOutput()`
  synchronously in `unlock()` (:248–251) and `out.openSessionBus()` per session (:287). Both are
  synchronous signatures (`openOutput: () => AudioOutput`, `openSessionBus: () => SessionBus`).
- Consumers outside `src/audio/` import types only (AudioTransport, ClockAnchor, AudioMix,
  GuideRole) except `create-workspace-session.ts:37,44` (the factory), click-track users
  (`session/count-in-display.ts`, `jam/fresh-jam.ts`, `jam/jam-phase.ts`, `jam/jam-capture.ts`) and
  `audio-mix` readers (`storage-bootstrap.ts:31`, `storage/records/settings-record.ts:36`, mix components).

### 5.2 Where a dynamically imported sound library would plug in

1. Keep `openWebAudioOutput` creating the one native `AudioContext` synchronously in the click
   (rule_audio_unlocked_by_player_click), and the master mix gains in `web-audio-output.ts`.
2. Add a library-backed `SessionBus` (e.g. a `tone-session-bus.ts` beside `web-audio-session-bus.ts`)
   implementing the same five methods, its voices built on the shared native context
   (`setContext(native)`, deep imports to avoid Tone's index-time second context; survey
   docs/sound-library-survey.md:164–171) and connected into the existing per-channel route gains.
3. Because `openSessionBus()` is synchronous and `import('tone')` is not, the loader must be started
   ahead (at unlock or at idle prefetch) and the bus either awaits it before the count-in
   (`START_DELAY_SECONDS` 0.1 s, audio-transport.ts:44, is too short to cover a 270 KB load on a
   phone) or falls back to the oscillator voices until loaded. This is the one interface change:
   `AudioTransportDependencies`/`AudioOutput.openSessionBus` become async-aware, or a loader seam
   is added beside `openOutput`.
4. `SoundRoleVoice` widens from `waveform: 'sine' | 'triangle'` to a per-role instrument description.

What it would replace: `web-audio-voices.ts` (the oscillator-and-envelope voices) and the sounding
half of `web-audio-session-bus.ts`; keep `audio-ports.ts`, `audio-transport.ts`, `transport-session.ts`,
`look-ahead-scheduler.ts`, `worker-wake-timer.ts` (Tone's own Ticker is not a timing source for us,
survey :172–177), the placement files (`backing-track.ts`, `guide-track.ts`, `click-track.ts`), the
pure renderers in `src/domain/backing/`, and `audio-mix.ts`.

### 5.3 Rules it would touch

`scripts/verify-boundaries.mjs`:
- **Per-chunk budget**: an unmatched chunk gets `defaultChunkByteBudget` 100 KiB (:419–431); Tone
  measured 267.2 kB (deep imports) to 296.5 kB for the v4 set (survey :179–186), so it needs its own
  prefix budget as `vexflow-engraver-` has.
- **Start-up budget** (`startupJavaScriptBytes`, :329, 22,610 B headroom): only a static import
  counts; a dynamic import keeps Tone out. A "no tone module in the first load" check could reuse
  the Jam boundary's module-graph test.
- `directoryScopedApis`: `AudioContext` only under `src/audio/` (:75–77) — the adapter must live there.
- `sampledAudioApis` (`decodeAudioData`, `createBufferSource`, `new AudioBuffer`; :37–38) and
  `alwaysForbidden` (`fetch(` …) scan **authored source only**; Tone's own code (Sampler, Player,
  ToneAudioBuffer.load) is not scanned, so the "synthesized only" rule (D260, req_session_backing_track)
  would be enforced on our calls, not on the library's. Whether to extend the scan to the built chunk
  is a decision.
- Build-output audio-asset scan (extensions only) and the precache check: unchanged; the Tone chunk
  would be precached (workbox globPatterns `**/*.js`), +~270 KB to the precache (now 1,732 KiB).
- `eslint.config.js`: a `no-restricted-imports` pattern for `tone` like `vexflowImportPattern`
  (:100–106, :224–235), allowing only the adapter file(s).

Outside the scripts:
- **Deployed CSP blocks Tone's Ticker worker**: `docker/security-headers.conf:33` sets
  `worker-src 'self'`; Tone's Context starts a Web Worker from a Blob URL (survey :172–177), which
  needs `worker-src 'self' blob:`. The survey's "The app sets no Content-Security-Policy today"
  (:176–177) holds for the dev server, not for the nginx image (CSP since 51a7d543, 2026-09-25).
- Intent: `rule_guide_sound_from_oscillators` ("no sample, no audio file, no new library",
  docs/rule_guide_sound_from_oscillators.atom.md:21, 28) would need a revision;
  `module_guide_playback_layers` already plans for "a later sound library replaces only the part
  that sounds a note".
- `.tech` and THIRD_PARTY_LICENSES.md (a new runtime dependency; security-advisor's dependency check).

---

## 6. Refactoring and lazy-loading candidates (facts only; ranking is principal-advisor's)

1. **`components/workspace/` shell and session wiring**: WorkspaceShell.vue (595/600 lines, 10
   atoms, 55 imports, 22 commits), 23 src files at 10 atoms, 18 of 39 >100-line functions, the most
   gate failures and beyond-Files edits. The parallel explorer covers its import graph and seams.
2. **Start-up migration codecs** (~20.6 KB of start-up JS; two budget incidents): load the database
   migration steps and the kept-session codecs on demand (option (c) of wave-log-v3.3.md:891–893).
3. **Audio split** (~15 KB): a static "open the context" part and a lazy "voices" part; the same
   seam is where Tone.js would load.
4. **Shared sheet dialog** (6 copies of focus trap/backdrop) and **shared review-staff** piece
   (ReviewPhrase ↔ ReviewDoodle, ~70 lines), **FoundationControls ↔ JamControls** fields.
5. **Codec helpers**: one `isPlainObject`/`asRecord` (9 copies), one settings key list (5 files),
   one rhythm validation order (2 files), one lazy-loader helper (8+ loaders).
6. **Rhythm validator** complexity (cc 87, 230 lines) and the 500+-line closure factories
   (midi-controller.ts 534, session-staff-positions.ts 369, fit runner 329, generation session 325).
7. **Code-health limits**: the 10-atom cap is hit in 80 files and has displaced links (three
   recorded cases); `accessibility.spec.ts` 594 and `review-privacy.spec.ts` 591 split at the next touch.
