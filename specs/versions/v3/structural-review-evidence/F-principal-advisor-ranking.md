# v3.4 structural review: part F, the principal-advisor's ranking (2026-11-23)

> Kept copy. Written 2026-11-23, weighing parts A to E (E on `main` 2ea48d1c), read-only. Scratchpad paths inside are historical: the scratchpad is not kept.

Read-only. It weighs parts A to E (E: `main` 2ea48d1c). It is saved verbatim by the wave driver from the advisor's
reply; the original was formatted for display and is otherwise unchanged.

**Conclusion.** The code is ready to grow along the library line and nowhere else yet. `domain/` and
`generation-worker/` form a clean sink: nothing imports out of them, they use no package, and `domain/` type-checks
with no DOM library. The app side is one tangle, mostly through type imports. The recommendation is a small v3.4 of
four chunks:
- **R1:** enforce the library line, which costs nothing because there are 0 violations today.
- **R2:** make `session/` import only the library, which takes 6 import cuts and removes the session↔audio value
  cycle.
- **R3:** move the Jam host wiring out of `WorkspaceShell.vue`, the file every feature passes through. It is 4 lines
  from the size error.
- **R4:** make the 10-atom limit a warning for test files.

Plus one ruling (R5): keep the 400 KiB start-up budget and allow no fourth raise. The audio split for Tone.js, lazy
codecs, the folder regrouping and any package or repository move are deferred or dropped. Effort: Medium (two S
chunks, two M chunks).

## 1. Answers to Q1–Q4

**Q1, sound for expansion: yes on the library side; the app side needs its boundaries enforced, not redesigned.**
- **Where the graph is clean.** On 2ea48d1c the graph is unchanged since A apart from the lexicon's 7 edges (E2.1).
  - `domain/` imports nothing outside itself. `generation-worker/` imports only `domain/`. `notation/` imports only
    `domain/` and VexFlow. `src/lexicon/` imports nothing (E2.1).
  - `domain/` passes a type-check with `lib: ES2023` and no DOM: 0 errors (A §3.2).
- **The tangle.** Everything else is one 9-area cycle, mostly type edges. There are 2 value cycles: session↔audio
  (`count-in-display.ts:7` ↔ `click-track.ts:9`) and jam↔components, the second by design (E2.2).
- **README drift.** `README.md` "Directory Boundaries" differs from the code in 8 places (A §2.3): jam/'s
  description, session's value imports, composables "no persistence", storage "only through the port", the
  export↔session cycle, the worker wiring, notation's role, and a stale doc pointer.
- **Enforcement today.** Only 3 ESLint import rules plus `verify:boundaries` exist (A §2.3, CODING_RULE §1). A
  tool-enforced rule set is worth having for the library line and the session direction only (R1, R2). The candidate
  rule set already has 0 violations on the library and the encoders (E2.3).
- **`components/workspace/`.** The folder is not the seam that is giving way; its hubs are. `WorkspaceShell.vue` has
  596/600 effective lines, 10 atoms, 55 imports and 22 of 128 `src/` commits. `workspace-session-controller-types.ts`
  has 60 importers (A §5, B §1.3, E5). Regrouping into sub-folders would cost 48 atoms and 193 path mentions (D §2.2)
  and would not advance the split (D §4). Relieve the hub (R3) instead.
- **Firefox/Safari.** Browser capabilities are already fenced per directory (audio/, midi/, storage/), so widening to
  more browsers is adapter work, not structure. The one known item is v4's: Tone.js #1457 (Firefox, `setContext` on a
  native context; C §6.4).
- **Gap: the prerequisites sub-question is not covered by A–E.** The report must either read
  `specs/versions/prerequisites.md` or say it was not evaluated.

**Q2, entry budget: keep 400 KiB, and treat it as a ceiling, not a target.**
- **Today.** All start-up JS is 392,293 B of 409,600, leaving 17,307 B (E1.1).
  - App code is 81.6 % and Vue 61 KB (E1.3).
  - Compressed: gzip 126 KB, brotli 109 KB.
  - The library candidate is 77 KB, a fifth of start-up.
- **Pace.** The entry grew +36 KB in v3.1 and +46 KB in v3.2. All start-up JS grew +13.5 KB in v3.3, and v3.4's wave
  1 added +5.3 KB. The 305 KB words file stays out (E1.4, B §3.4).
- **Lazy-loading ceiling.** About 75 KB could move out. The clean parts are:
  - the migration codecs, 20.6 KB, not needed for an up-to-date database;
  - audio's sounding code, 15.1 KB, which creates its `AudioContext` only on the click;
  - the popover panel, 3.2 KB.

  MIDI is not clean: it reconnects a remembered controller at load (E1.5).
- **Tone.js.** Its floor is about 224–245 KiB minified (56–60 KiB gzip) whatever is imported, because tree-shaking
  barely works (C §6.2). It must be a lazy chunk.
- **Why keep 400 KiB.**
  - The D536 measure is one release old.
  - v4.0 is most probably the app's last update (D552), and its big item (Tone) loads lazily anyway.
  - Lowering the budget would force codec/audio lazy-loading, which is medium-risk and not split-prep, to save bytes
    whose player-visible effect was not measured.
- **What changes.** The budget moved three times in three releases, each time when headroom ran out mid-wave (B §3.4,
  §4.1). So the proposed ruling: **an overrun is met by taking a lever, not by raising the budget.** First lever:
  audio's voices lazy, built with the Tone loader (R6). Second lever: lazy migration codecs (R7).

**Q3, refactors worth taking: see the ranked table.** R1–R4 fit D557. Duplication is low: 0.61 % of src lines at
jscpd's default, 1.81 % strict, in clusters (E3). There is no dead file in src (E4).
- **Are the limits right?** The size and nesting limits are fine: 3 src files are over 400 lines, and only
  `WorkspaceShell.vue` is near the error (E5).
- **The 10-atom error** is a fair signal for src: 70 of the 80 files at the limit mix unrelated concerns (D §4). For
  test files it is wrong:
  - every atom-limit gate failure involved a test file (B §4.1: v3.1 w5, v3.2 w5, v3.2 w7, v3.3 w5);
  - one axe test was moved to another file to get around it;
  - broad specs, such as accessibility checks, legitimately cover many atoms.
- Hence R4.

**Q4, split.**
- **Form now:** folders with enforced boundaries, in one package, with no file moves. A no-move refactor keeps atom
  IDs and paths intact (D557).
- **Form at game start:** a new repository holding the library and the game as npm workspaces. It is seeded from this
  repository's enforced library folders (domain/, generation-worker/, export/midi, export/musicxml, and session's
  core once R2 holds). It gets its own ATD record: a library VISION/CONTRACT, plus the game's own.
- **Why this fits the owner's lean (D552) without the separate-repository costs:**
  - The game's VISION cannot share this app's (the app's "never scoring" against the game's scoring of fights), and
    `atd` allows only one VISION per atom set (D §3.4). So the game needs its own record whatever the form.
  - If this app stops at v4.0, it never consumes the new library. There are then no cross-repository links, no
    publishing and no 150–250-edit re-cut of the record (D §3.3, §5).
- **Order of steps:**
  1. v3.4: R1, then R2.
  2. v4.0: keep the rules green.
  3. At game start, scoped to the moved code: the path-free interface pass on the atoms (R11), then the Vitest `node`
     project (R10) and the unused exports trimmed (R15).
  4. Seed the new repository. The app owns `new Worker` and the library exports pure functions (C §1.4).
  5. Never rename the `'infinite-flow/…/v1'` hash-domain strings or the `ifk*` prefixes (A §3.2).
- **Lexicon API home (O315): this app, not the library.** It has 0 edges to `domain/`, its only caller is this app,
  and the library is the music core. Being self-contained, it can move later for free (E2.3). A Go lexicon backend
  (D561) would sit beside this app and serve the language-neutral contract (D559), not import the TS library.

## 2. Ranked recommendations

Notes on the table:
- **ATD churn** means atom path rewordings; atom IDs never change.
- **"Next lever"** means the next lever under R5's no-raise ruling.

| # | id | what | benefit | cost (size / risk / ATD churn / test churn) | unblocks | D557 class | verdict |
|---|---|---|---|---|---|---|---|
| 1 | R1 | Enforce the library line: an import-direction check in `verify-boundaries.mjs` plus a no-DOM tsconfig project over `domain/`; correct the README boundary map | Stops coupling from growing into the library during v4.0; turns the 8 drift points into a stated map | S / low (0 violations today) / 0 / fixtures + spec cases | R2; the game-start extraction | split-prep | **Take, v3.4** |
| 2 | R4 | Atom-spread limit above 10: a warning (not an error) for test files; src unchanged | Removes the cause shared by all 4 atom-limit gate failures; stops misplaced tests and links | S / low / 0 / code-health specs only | Smoother v4.0 gates | gate-friction | **Take, v3.4** |
| 3 | R3 | `WorkspaceShell.vue`: extract the Jam host wiring into one composable | Gives headroom on the file every feature touches (596/600 lines, 10 atoms) | M / medium (Vue setup order) / a few atoms naming the shell / spec imports | v4.0 feature chunks pass the gate | gate-friction | **Take, v3.4** |
| 4 | R2 | `session/` imports only session plus the library set: 6 cuts, including the session↔audio value cycle | Session core becomes library-ready (continuation, A §3.4); audio's only value cycle is gone | M / low–medium / a handful / import-path updates, `vi.mock` strings | Q4 seeding; a cleaner audio seam | split-prep (+ Tone-seam) | **Take, v3.4** |
| 5 | R5 | Keep 400 KiB; an overrun takes a lever, never a fourth raise | Ends the "raise mid-wave" pattern | none (ruling) | — | gate-friction | **Take as ruling** |
| 6 | R6 | Audio split: static unlock plus lazy voices behind an async-capable session-bus seam (B §5.2) | About 15 KB of start-up headroom; the Tone door | M–L / medium (count-in timing, `START_DELAY` 0.1 s) / 5 atoms / audio + e2e | Tone.js | Tone-seam | **Defer to v4.0**, built with the Tone loader (designing it now would be v4 scope, D546); first lever if the budget bites |
| 7 | R7 | Lazy migration codecs | About 20.6 KB of headroom | M / medium (`onupgradeneeded` cannot await an import, so the stored version must be read before opening) / 8 atoms, 6 of them STABLE / storage + e2e | — | none (budget) | **Defer**, second lever |
| 8 | R9 | Tone guards: ESLint `tone` pattern, own chunk budget, not-in-first-load check, CSP `worker-src blob:`, revision of `rule_guide_sound_from_oscillators` | Safe adoption of Tone | S / low / 1 atom revised / boundary specs | — | Tone-seam | **Defer to v4.0's dependency chunk** (they guard a dependency not yet added) |
| 9 | R10 | Vitest `node` project for library tests | Runtime proof of no DOM; jsdom set-up is 34 % of tracked test time, and library tests are about 60 % of test time | S–M / medium (tests relying on jsdom) / 0 / config | Library package | split-prep | **Defer to game start** (take only if the driver wants faster unit runs) |
| 10 | R11 | Path-free TECHNICAL INTERFACE sections, for atoms in moved areas | Later moves cost no ATD edits | M docs / low / 59–73 `atd update` calls / 0 | Extraction | split-prep (docs) | **Defer to game start** |
| 11 | R8 | Cut the 77-file type cycle: move `GeneratedNotesFormat` and `ThemePreference` down out of `setting-defaults.ts:20-21` | Storage no longer depends on UI types | S / low / about 0 / few | — | none | **Defer**: do it in the next chunk that touches the file |
| 12 | R19 | Pre-split `accessibility.spec.ts` (594 lines) and `review-privacy.spec.ts` (591) | Avoids a size gate failure | S / low / links move / test-only | — | gate-friction | **Defer**: flag both in v4.0's Files lines |
| 13 | R13 | Duplication: sheet focus trap ×6, ReviewPhrase↔ReviewDoodle, FoundationControls↔JamControls, `isPlainObject` ×9 | Small reuse | S–M each / low / few / some | — | none | **Defer to next touch.** Drop unifying the settings key list (5 copies): its order feeds the replay-key contract |
| 14 | R14 | Rhythm validator (cyclomatic complexity 87), long factory functions | Readability | M / medium (core generation) / — / — | — | none | **Defer** |
| 15 | R15 | Unused exports (82) | Defines the library's public surface | S / low / 0 / 0 | Extraction | split-prep | **Defer to game start**; keep knip out of the repo |
| 16 | R16 | Domain-internal cycle {generation, pitch, rhythm, validation} contradicts `generator-architecture.md:123` | Honest documentation | docs S | — | none | **Defer the code; correct the doc line** in the report pass |
| 17 | R18 | `atd` tooling for packages (`DEFAULT_ROOTS`, `atd check` against a base) | Keeps the phantom-ID guard working | S | Extraction | split-prep | **Defer to extraction** |
| 18 | R12 | Regroup `components/workspace/` into sub-folders | Navigation only | M–L / medium (harness aliases by exact path silently disable seams) / 48 atoms, 193 mentions / about 200 import specifiers | nothing | none | **Drop** |

Analysis tools: **keep none in the repository.** R1 reuses `verify-boundaries.mjs`. ESLint patterns cannot tell
`domain/notation` (`../notation`) from `src/notation` (`../../notation`), so a check that resolves paths is needed,
and that script already scans sources per directory. Copy E2.3's candidate rule table into the report, because the
scratchpad may be cleared.

## 3. Sketches of the v3.4 items

**R1, library line (S).**
- **Check:** `scripts/verify-boundaries.mjs` gets a new source check. For every `.ts` under `src/domain/`,
  `src/generation-worker/`, `src/export/midi/` and `src/export/musicxml/`, resolve every `import … from`,
  `export … from`, `import('…')` and `new URL('…')` specifier (`@/` → `src/`, relative against the file).
  - The target must land inside that set. Types count.
  - No bare package specifier is allowed.
- **Tests:** cases in `tests/unit/boundaries/verify-boundaries.spec.ts`, with a breaking fixture under
  `tests/fixtures/boundaries/src/domain/`.
- **Type project:** a tsconfig over `src/domain/**` with `lib: ["ES2023"]`, `types: []` and the app's strict flags,
  referenced from `tsconfig.json` so `vue-tsc --build` checks it. Measure the added type-check time (now 15.9 s, E6).
- **Docs:** `README.md` "Directory Boundaries" states the line and corrects A §2.3's 8 drift points.
- **ATD:** documentalist does an architecture capture (trigger E) for the library boundary, like
  `module_jam_code_boundary`; the check links to it.
- **Guards:** `npm run quality`. `preset-model-purity.spec.ts` stays.

**R4, test atom limit (S).** Files: `scripts/code-health/` (the atd rule and `config.mjs`). Files classified as tests
(`sources.mjs:66`) report more than 10 distinct atoms as a **warning**; src keeps warn above 5 and error above 10.
Update `CODING_RULE.md` §6. Guards: `tests/unit/code-health/*.spec.ts`, which are ATD-exempt. Log it as a driver
ruling (D556).

**R2, session one-way (M).** After R1, the encoders count as library, so `session-history-export.ts:14-16` is
allowed. Remaining cuts, from E2.3:
1. `session/count-in-display.ts:7` → audio (value). Move `count-in-display.ts` to the app side, beside its caller
   (components or composables). `audio/click-track.ts:9` → session stays, as the allowed direction, so the value
   cycle disappears.
2. `session-window.ts:20` (value) and `rolling-display.ts:10` (type) → `notation/notation-layout-policy.ts`. Move the
   breakpoint constants and that type into `domain/notation/`; `notation-layout-policy.ts` re-imports them, so
   notation stays a sink.
3. `session-runner.ts:13` and `session-types.ts:8` → `composables/viewport-width.ts` (type), and
   `stale-phrase-one.ts:9` → `composables/workspace-session-result.ts` (type). Move those types into session and have
   composables re-import them.
4. Add a rule to R1's check: `session/` may import only session plus the library set.

Constraints and guards:
- `session-types.ts` is at 10 atoms. If a moved type carries links, put it in a new session file.
- Update the `vi.mock` strings in the 65 files that use them; the type-check will not catch a stale one.
- Guards: the session, notation and composables unit tests, the count-in e2e, typecheck, `verify:boundaries`.
  Start-up bytes should be about neutral.

**R3, Shell relief (M).**
- **Move:** the Jam host imports (`WorkspaceShell.vue:115-127`: `loadJamMode`, `useJamIdleCue` …
  `useJamPortsAndBar`) and their setup calls (about `:326-422`, E1.5) into one composable in
  `components/workspace/`. It returns what the template binds.
- **Targets:** the shell at 500 effective lines or fewer and 8 atoms or fewer. The new composable stays at 10 atoms or
  fewer, with links moved with the code.
- **Jam boundary:** `loadJamMode` remains the only value route to `src/jam/` (ESLint Jam rule, verify-boundaries' Jam
  first-load check).
- **Guards:** `WorkspaceShell.spec.ts`, `WorkspaceShell-kept-doodle.spec.ts`, the Jam and kept-Jam e2e,
  `verify:boundaries` (start-up delta about 0).

**Waves (κ = 1).**
- **Wave 2, tooling, fast gate:** R4, then R1.
- **Wave 3, app code, full e2e gate:** R2, then R3.

Shared files force this order:
- **R1 → R2:** both edit `verify-boundaries.mjs` and its spec.
- **R2 → R3:** R2 moves `WorkspaceSessionResult`, which `WorkspaceShell.vue:68` imports.
- **R4** shares no file with the others.

## 4. Risks and open points for the driver

1. **Q4's form at game start depends on O314(a).** The new-repository form is cheap only if this app stops at v4.0.
   If the app must keep receiving library changes, it consumes the library as a versioned package (`tsc` output,
   semver tags), and the record needs its re-cut: 79–122 two-sided atoms split, 62–84 parents re-rooted, a MAJOR
   CONTRACT bump, and new IDs for the split halves, which is in tension with D557 (D §3.3). Escalate then, not now.
2. **ATD silence.** `atd check` in default mode cannot see moves, staged changes or untracked files (ISS-020, D §1.3).
   The R2/R3 syncs must run `atd check main...HEAD` or `--full` against the baseline of 15 NO_IMPL and 1 NO_TESTS.
   Path prose in atoms is never checked by any tool.
3. **Harness aliases by exact path** (`vite.workspace-harness.config.ts:27,33,39`): moving one of those files silently
   disables its seam. R2 and R3 should not touch them; chunk owners should check.
4. **Q1's prerequisites sub-question has no evidence yet** (see Q1).
5. **v4.0 inputs to record in the report, with nothing planned for them:**
   - Tone's CSP need (`worker-src blob:`; the deployed header is `worker-src 'self'`);
   - Firefox #1457;
   - `verify:boundaries`' sampled-audio scan covers authored source only;
   - `rule_guide_sound_from_oscillators` says "no new library";
   - the async `openSessionBus` change (B §5.2–5.3, C §6.3).
6. **Measurement limits.** E's attribution of bytes to single modules can be off by ±1 KB. Time until the app is
   usable on the reference phone was not measured, so Q2's case rests on bytes.
7. **R4 relaxes a quality gate.** Log it as a decision under D556. Chunk reports should still state any link they left
   out because of the limit (D §4).
