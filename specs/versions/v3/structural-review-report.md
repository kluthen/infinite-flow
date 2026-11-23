# v3.4 — Structural Review Report

Status: v1, written 2026-11-23. Ruled the same day by the wave driver under the owner's delegation
(D556): D569–D574.

This report answers the four questions of the [structural review](structural-review.md) (§5), with
the evidence the analysts gathered and the principal-advisor's ranking. The evidence is kept in
[structural-review-evidence/](structural-review-evidence/README.md), parts A to F. It is cited by
part and section: "E §2.3" is section E2.3 of
[part E](structural-review-evidence/E-measurement-pass.md), "A §2.3" section 2.3 of
[part A](structural-review-evidence/A-import-graph-and-seams.md). Part E was measured last, on
`main` 2ea48d1c; where it disagrees with A or B, E wins. Part
[F](structural-review-evidence/F-principal-advisor-ranking.md) weighs A to E and gives the ranking
this report follows. The rulings are recorded in §7; this report re-opens none of them.

## 1. Summary

- **The code is ready to grow along the library line, and nowhere else yet** (F §1).
  - `domain/` and `generation-worker/` form a clean sink: nothing imports out of them, they use no
    package, and `domain/` type-checks with no DOM library (E §2.1, A §3.2).
  - The app side is one tangle of 9 areas, mostly through type imports, with 2 value cycles
    (E §2.2).
- **v3.4 takes four refactors** (D569, D570), all within D557's bounds:
  - R1 enforces the library line;
  - R2 makes `session/` import only the library;
  - R3 moves the Jam host wiring out of `WorkspaceShell.vue`;
  - R4 makes the 10-atom limit a warning for test files.
- **The start-up budget stays at 400 KiB** (D571). An overrun takes a lever, never a raise.
- **The split's form** (D573): folders with enforced boundaries in one package now; a new
  repository for the library and the game at game start. The lexicon API stays in this app (D574).
- Everything else is deferred or dropped (D572). No analysis tool is kept in the repository.
- The waves taken are waves 2 and 3 of [build plan v3.4](build-plan-v3.4.md): wave 2 is chunk 4
  (R4) and chunk 5 (R1); wave 3 is chunk 6 (R2) and chunk 7 (R3).

## 2. Q1: sound for expansion

**Answer: yes on the library side. The app side needs its boundaries enforced, not redesigned**
(F §1).

- **The real boundaries.** On 2ea48d1c the graph is unchanged since A, apart from the lexicon's 7
  edges (E §2.1).
  - `domain/` imports nothing outside itself. `generation-worker/` imports only `domain/`.
    `notation/` imports only `domain/` and VexFlow. `src/lexicon/` imports nothing (E §2.1).
  - `domain/` passes a type-check with `lib: ES2023` and no DOM: 0 errors (A §3.2).
  - Everything else is one cycle of 9 areas, mostly type edges. There are 2 value cycles:
    session↔audio (`count-in-display.ts:7` ↔ `click-track.ts:9`), and jam↔components, the second
    by design (E §2.2).
- **Where the documents differ.** `README.md` "Directory Boundaries" differs from the code in 8
  places (A §2.3): jam/'s description, session's value imports, composables "no persistence",
  storage "only through the port", the export↔session cycle, the worker wiring, notation's role,
  and a stale doc pointer. R1 corrects the map.
- **Enforcement by a tool.** Today only 3 ESLint import rules and `verify:boundaries` exist
  (A §2.3). A tool-enforced rule set is worth having for the library line and the session
  direction only (R1, R2). The candidate rule set has 0 violations on the library and the encoders
  today (E §2.3; the table is kept in §8).
- **The named subsystems.**
  - The generation worker: library-clean apart from its three browser entry files and two easy
    leaks (A §3.2, L1–L5). The app should own `new Worker`; the library exports pure functions
    (C §1.4).
  - The session engine: pure of Vue and the browser, but it imports audio, notation, composables
    and the encoders: 9 edges, 2 of them value (E §2.3). R2 cuts them.
  - Storage and codecs: the port design is sound, but two type imports in `setting-defaults.ts:20-21`
    put storage in the 77-file type cycle (A §4, E §2.2). R8 cuts it, deferred.
  - The UI shell: see `components/workspace/` below.
- **`components/workspace/`.** The folder is not the seam that is giving way; its hubs are.
  - `WorkspaceShell.vue` has 596 of 600 effective lines, 10 atoms, 55 imports, and 22 of 128 `src/`
    commits. `workspace-session-controller-types.ts` has 60 importers (A §5, B §1.3, E §5).
  - Regrouping the folder into sub-folders would cost 48 atoms and 193 path mentions (D §2.2), and
    would not advance the split (D §4). Relieving the hub (R3) is taken instead; the regrouping
    (R12) is dropped.
- **Firefox and Safari.** Browser capabilities are already fenced per directory (audio/, midi/,
  storage/), so the widening is adapter work, not structure. The one known item is v4's: Tone.js
  issue #1457 (Firefox, `setContext` on a native context; C §6.4). It is listed in §9.

### 2.1 The prerequisites

The question (structural review §5, Q1): "Are the [prerequisites](../prerequisites.md) still the
right list, and which are now urgent?" Parts A to E did not cover it (F §1, F §4 item 4). This
section answers it from that document and the evidence.

**What the document is.** A preliminary analysis, draft v0.1 of 2026-09-25. It maps each planned
capability, from v1.0 to the endgame, to fourteen foundations (A to N) and a latency budget. Its
"Exists today" column and its "Current state" sections describe the code of 2026-09-25. Its later
edits touched only the chord-fit check (D174, D211) and the microphone (D554).

**Answer.** As a map of what each capability rests on, the list is still right. As a picture of
what is missing and of who needs it, it is out of date on two counts, and it lacks one item. One
foundation is urgent for v4.0; nothing in it is urgent for v3.4 beyond what R1 and R2 already take.

1. **Much of it is built.** The review's evidence names modules for most of the v2 and v3
   foundations:
   - A, continuation in its minimal form: `domain/generation/carry-in` and session's carry-in
     adaptation (A §3.4);
   - B, the clock and scheduler: the audio transport, the look-ahead scheduler and the worker wake
     timer (B §5.1, §5.2);
   - C, MIDI input: `midi/`, 8 files (A §4);
   - D, harmony facts for consumers: the backing renderers in `src/domain/backing/` (B §5.2);
   - E, the session with history: session's history types (E §2.3);
   - F, the persistence port: `storage/`, with its codecs and migrations (A §4, E §1.5);
   - G, export: the `export/midi` and `export/musicxml` encoders (A §4);
   - L, the display-state half: `notation/note-identity.ts` and `score-overlay-state.ts`
     (A §3.3);
   - N, versioning: the replay keys carry a version (`ifk1.` to `ifk5.`) and the hash domains end
     in `/v1` (A §3.2).

   The review did not check each foundation against the document's own definition. For example,
   whether H's templates are open data, I's capability flags replace the profile-name checks, or a
   result carries N's version stamp: these were not evaluated. Nor was the document's §4 (the
   first-release atoms later versions amend).
2. **Who needs the rest has changed.** The document assumes one app climbing from v1.0 to the
   endgame. Since then:
   - the game is a separate app on the other side of a library (D551);
   - v4.0 is most probably this app's last update (D552), and it is Tone.js and accompaniment with
     roles (D553);
   - the whole-file seed and the rhythm ratios moved to v5, and v5+ will probably move to the game
     (D553; O314 (a), open).

   So the endgame rows (characters on I, J, M and A; system voices on K and B; turn-based
   exchanges on A, K and M; status effects on L's display-effect half and I) are now the game's,
   built on the library. The whole-file seed (G's import half, A, M) and library snippets
   (G, F, A, E) wait on O314 (a). For this app, the list matters for one capability only: v4.0's
   accompaniment with roles, which rests on K, B, A and D.
3. **One item is missing: the library line itself.** The document predates D551. Every game-side
   foundation now rests on the library being a clean, enforced sink (F §1, Q4's order of steps),
   and on a contract the split must keep: the hash-domain strings and the `ifk*` replay-key
   prefixes are never renamed (A §3.2).

**Which are urgent.**
- **Now, in v3.4:** only the library line, taken as R1 and R2 (D569).
- **Before v4.0's master spec:** K, the multi-voice representation. It is the one foundation
  v4.0's accompaniment rests on that the evidence does not show built; the document sizes it L and
  places it at v4 (prerequisites §2 K). Whether today's timeline is still monophonic was not
  evaluated: the review looked at the code as it is, not at v4's scope (D546). The Tone seam's
  inputs are in §9.
- **Not urgent:** the game-side foundations wait for game start; the v5 items wait on
  O314 (a). The document's own "premature now" list (K before v4, J, I beyond capability flags,
  G's import half) still holds for v3.4: nothing in the evidence asks for them.

This report does not revise the prerequisites document.

## 3. Q2: the start-up budget

**Answer: keep 400 KiB, as a ceiling and not a target** (F §1; ruled by D571).

- **Today** (E §1.1, §1.3):
  - all start-up JavaScript (the D536 measure) is 392,293 B of 409,600 B, leaving 17,307 B;
  - the entry file `index-*.js` is 337,281 B; the frame's "265 KB entry" dates from 2026-10-21;
  - compressed, all start-up JavaScript is 125,989 B with gzip and 109,157 B with brotli;
  - app code is 81.6 % of it (320,264 B), Vue 61,273 B;
  - the library candidate (`domain/` and `generation-worker/`) is 77,072 B, 19.6 % of start-up.
- **Pace.** The entry grew about 36 KB in v3.1 and 46 KB in v3.2; all start-up JavaScript grew
  13.5 KB in v3.3, and v3.4's wave 1 added 5,303 B (E §1.4, B §3.4). The lexicon's 305 KB words
  file stays out of the start-up set (E §1.4).
- **What could move out.** About 75 KB is not needed on the first screen (E §1.5). The clean parts:
  - the migration codecs, 20,635 B, not needed for an up-to-date database;
  - audio's sounding code, 15,127 B, which creates its `AudioContext` only on the click;
  - the mix-volume popover panel, 3,205 B.

  MIDI (10,673 B) is not clean: it reconnects a remembered controller at load (E §1.5).
- **Tone.js.** Its floor is about 224–245 KiB minified (56–60 KiB gzip), whatever is imported,
  because tree-shaking barely works (C §6.2). It must load as a lazy chunk; a static import would
  overrun the budget on its own.
- **The options.**
  - Keep 400 KiB. The D536 measure is one release old; v4.0 is most probably the last update
    (D552), and its big item, Tone.js, loads lazily anyway (F §1).
  - Lower it. This would force codec or audio lazy-loading, which is medium-risk work and not
    split preparation, to save bytes whose effect on the player was not measured (F §1, §11).
- **What changes.** The budget moved three times in three releases, each time when headroom ran out
  mid-wave (B §3.4, §4.1). So an overrun is now met by a lever, not a raise: first R6 (lazy audio
  voices, built with the Tone loader), then R7 (lazy migration codecs). A raise is the owner's call
  only (D571).

## 4. Q3: the refactors worth taking

**Answer: R1 to R4, ranked in §6.** They are the only recommendations that fit D557's classes
(split preparation, the Tone.js seam, or a friction that recurs at the gates) and are worth taking
now (F §1).

- **Duplication is low.** 0.61 % of `src/` lines at jscpd's default threshold, 1.81 % at the
  strict one, in clusters: ReviewPhrase↔ReviewDoodle, FoundationControls↔JamControls, the sheets'
  focus code, two domain tables (E §3). Tests duplicate about six times more, mostly parallel spec
  files per variant (E §3).
- **No dead file in `src/`.** The dead surface is exports: 82 unused anywhere, 358 unused by the
  app itself (E §4). That is what a library's public surface would have to sort out (R15).
- **The size and nesting limits are right.** Three `src/` files are over 400 effective lines, and
  only `WorkspaceShell.vue` is near the error, 4 lines under it (E §5).
- **The 10-atom limit is right for `src/`, wrong for tests.**
  - For `src/` it is a fair signal: 70 of the 80 files at the limit mix unrelated concerns (D §4).
  - For tests it is not: every atom-limit gate failure involved a test file (B §4.1: v3.1 w5,
    v3.2 w5, v3.2 w7, v3.3 w5); one axe test was moved to another file to get around it; and broad
    specs, such as accessibility checks, legitimately cover many atoms (F §1). Hence R4.
- **Which v3.4 builds.** R1 and R2 prepare the split, R3 and R4 clear recurring gate friction.
  R5 is a ruling. The rest is deferred or dropped (§6, §7).

## 5. Q4: the split

**The seams** (E §2.3, A §4):
- the library (`domain/`, `generation-worker/`): 0 violations, types included; it could be
  enforced today at no code cost;
- the encoders (`export/midi`, `export/musicxml`) and `notation/`: 0 violations;
- the session core: 9 edges to cut, 2 of them value; 3 of the 9 point at the encoders, which count
  as library once R1 holds, so R2 makes 6 cuts (F §3);
- the browser kit (audio, MIDI, notation) on the app: 8 edges, 1 of them value (the session↔audio
  cycle);
- storage: the 77-file type cycle hangs on 2 lines of `setting-defaults.ts`.

**What each form costs the ATD record** (D §5):

| form | ATD cost | risk |
|---|---|---|
| one package, enforced folders | about 60–75 path rewordings for the library line, plus 2–4 boundary rulings | low; stale paths are silent unless a path-free interface pass is done first |
| npm workspaces, one `.atd` | the same, plus `DEFAULT_ROOTS` and `atd:check` with a base | low |
| monorepo with an `atd` workspace | the same, plus 2 CONTRACT/VISION pairs and coverage blind spots | medium; workspace commands have defects |
| separate repositories | a re-cut: 79–122 two-sided atoms split, 62–84 parents re-rooted, CONTRACT split (MAJOR bump), 2–3 VISION/CONTRACT pairs; every library change is a preflight and a sync in two repositories | high; `atd` has no cross-repository mode; tension with D557 for split atoms |

Separate repositories also cost a pipeline per repository, a release before the app can consume a
library change, and tokens in CI for private access (C §7.5). A monorepo changes the library and
the app in one change, under one `npm run quality` (C §7.5, §7.6).

**The form now:** folders with enforced boundaries, in one package, with no file moves. A no-move
refactor keeps atom IDs and paths intact (D557; F §1).

**The form at game start:** a new repository holding the library and the game as npm workspaces.
It is seeded from this repository's enforced library folders (`domain/`, `generation-worker/`,
`export/midi`, `export/musicxml`, and session's core once R2 holds). It gets its own ATD record: a
library VISION and CONTRACT, plus the game's own (F §1).

**Why this fits the owner's lean to separate repositories (D552) without their costs** (F §1):
- The game's VISION cannot share this app's: this app never scores, the game scores fights. `atd`
  allows only one VISION per atom set (D §3.4). So the game needs its own record whatever the form.
- If this app stops at v4.0, it never consumes the new library. There are then no
  cross-repository links, no publishing and no 150–250-edit re-cut of the record (D §3.3, §5).

**Order of steps** (F §1):
1. v3.4: R1, then R2.
2. v4.0: keep the rules green.
3. At game start, scoped to the moved code: the path-free interface pass on the atoms (R11), then
   the Vitest `node` project (R10), and the unused exports trimmed (R15).
4. Seed the new repository. The app owns `new Worker`; the library exports pure functions
   (C §1.4).
5. Never rename the `'infinite-flow/…/v1'` hash-domain strings or the `ifk*` prefixes (A §3.2).

**The risk carried to O314 (a)** (F §4 item 1). The new-repository form is cheap only if this app
stops at v4.0. If the app must keep receiving library changes, it consumes the library as a
versioned package (`tsc` output, semver tags), and the record needs its re-cut: 79–122 two-sided
atoms split, 62–84 parents re-rooted, a MAJOR CONTRACT bump, and new IDs for the split halves,
which is in tension with D557 (D §3.3). It is escalated when O314 (a) is ruled, not now. D573
informs O314 (c) and does not decide (a).

**What a split buys.** A second consumer of the library (the game, D551). Faster unit runs: library
tests are about 60 % of unit-test time, and jsdom set-up is 34 % of tracked test time though the
pure domain tests do not need it (E §6). The build would not get much faster: the type-check is
about 16 of its 18 s (E §6).

**The lexicon API's home: this app, not the library** (D574, closing O315).
- It has 0 edges to `domain/`, its only caller is this app, and the library is the music core
  (E §2.3).
- Being self-contained, it can move later at no cost (E §2.3).
- A Go lexicon backend (D561) would sit beside this app and serve the language-neutral contract
  (D559); it would not import the TypeScript library (F §1). What the browser-only seams cost such
  a backend (`verify:boundaries`' ban on `fetch(` in `src/`) was not evaluated beyond O316's list.

## 6. Ranked recommendations

The order and verdicts are F's (F §2). "ATD churn" means atom path rewordings; atom IDs never
change. There is no R17.

| # | id | what | benefit | cost (size / ATD churn / test churn) | risk | unblocks | D557 class | verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | R1 | Enforce the library line: a resolving import check in `verify-boundaries.mjs`, a no-DOM tsconfig over `domain/`, the README boundary map corrected | Stops coupling from growing into the library during v4.0; turns the 8 drift points into a stated map | S / 0 / fixtures and spec cases | Low: 0 violations today (E §2.3). The added type-check time is to be measured (now 15.9 s, E §6) | R2; the game-start extraction | split-prep | **Take, v3.4** |
| 2 | R4 | Atom-spread limit above 10: a warning, not an error, for test files; `src/` unchanged | Removes the cause shared by all 4 atom-limit gate failures (B §4.1) | S / 0 / code-health specs only | Low in code. It relaxes a quality gate: the gate no longer stops a test file from spreading over many atoms | Smoother v4.0 gates | gate-friction | **Take, v3.4** |
| 3 | R3 | `WorkspaceShell.vue`: extract the Jam host wiring into one composable | Headroom on the file every feature touches (596/600 lines, 10 atoms) | M / a few atoms naming the shell / spec imports | Medium: Vue setup order. Harness aliases by exact path silently disable a seam if their file moves (F §4 item 3). `loadJamMode` must stay the only value route into `src/jam/` | v4.0 feature chunks pass the gate | gate-friction | **Take, v3.4** |
| 4 | R2 | `session/` imports only session plus the library set: 6 cuts, including the session↔audio value cycle | Session core library-ready (A §3.4); audio's only value cycle gone | M / a handful / import paths, `vi.mock` strings in 65 files | Low–medium. The type-check does not catch a stale `vi.mock` string; `session-types.ts` is at 10 atoms; `atd check` in default mode cannot see moves (F §4 item 2) | Q4's seeding; a cleaner audio seam | split-prep (+ Tone-seam) | **Take, v3.4** |
| 5 | R5 | Keep 400 KiB; an overrun takes a lever, never a fourth raise | Ends the "raise mid-wave" pattern (B §3.4, §4.1) | None: a ruling | With 17,307 B left (E §1.1), an overrun forces a lever (R6, then R7), each medium-risk, into the wave that hits it | — | gate-friction | **Take as ruling** |
| 6 | R6 | Audio split: a static unlock plus lazy voices behind an async-capable session-bus seam (B §5.2) | About 15 KB of start-up headroom; the door for Tone.js | M–L / 5 atoms / audio and e2e | Medium: count-in timing, `START_DELAY` 0.1 s | Tone.js | Tone-seam | **Defer to v4.0**, built with the Tone loader; first lever if the budget bites |
| 7 | R7 | Lazy migration codecs | About 20.6 KB of headroom | M / 8 atoms, 6 of them STABLE / storage and e2e | Medium: `onupgradeneeded` cannot await an import, so the stored version must be read before opening | — | none (budget) | **Defer**, second lever |
| 8 | R9 | Tone guards: an ESLint `tone` pattern, its own chunk budget, a not-in-first-load check, CSP `worker-src blob:`, a revision of `rule_guide_sound_from_oscillators` | Safe adoption of Tone.js | S / 1 atom revised / boundary specs | Low | — | Tone-seam | **Defer to v4.0's dependency chunk**: they guard a dependency not yet added |
| 9 | R10 | A Vitest `node` project for library tests | Runtime proof of no DOM; library tests are about 60 % of test time, jsdom set-up 34 % (E §6) | S–M / 0 / config | Medium: tests that rely on jsdom | The library package | split-prep | **Defer to game start** |
| 10 | R11 | Path-free TECHNICAL INTERFACE sections, for atoms in moved areas | Later moves cost no ATD edits | M (docs) / 59–73 `atd update` calls / 0 | Low | The extraction | split-prep (docs) | **Defer to game start** |
| 11 | R8 | Cut the 77-file type cycle: move `GeneratedNotesFormat` and `ThemePreference` out of `setting-defaults.ts:20-21` | Storage no longer depends on UI types | S / about 0 / few | Low | — | none | **Defer**: do it in the next chunk that touches the file |
| 12 | R19 | Pre-split `accessibility.spec.ts` (594 lines) and `review-privacy.spec.ts` (591) | Avoids a size gate failure | S / links move / test-only | Low | — | gate-friction | **Defer**: flag both in v4.0's Files lines |
| 13 | R13 | Duplication: the sheet focus trap ×6, ReviewPhrase↔ReviewDoodle, FoundationControls↔JamControls, `isPlainObject` ×9 | Small reuse | S–M each / few / some | Low; unifying the settings key list (5 copies) would risk the replay-key contract, which its order feeds | — | none | **Defer to next touch**; the key-list unification **dropped** |
| 14 | R14 | The rhythm validator (cyclomatic complexity 87) and long factory functions | Readability | M / not estimated / not estimated | Medium: core generation | — | none | **Defer** |
| 15 | R15 | Unused exports (82) | Defines the library's public surface | S / 0 / 0 | Low | The extraction | split-prep | **Defer to game start**; knip stays out of the repository |
| 16 | R16 | The domain-internal cycle {generation, pitch, rhythm, validation} contradicts `generator-architecture.md:123` | Honest documentation | S (docs) for the line; the code change not sized | Low for the doc line; the code change's risk not assessed | — | none | **Correct the doc line now; defer the code** |
| 17 | R18 | `atd` tooling for packages (`DEFAULT_ROOTS`, `atd check` against a base) | Keeps the phantom-ID guard working | S / — / — | Not rated in F; tooling only, outside `src/` | The extraction | split-prep | **Defer to extraction** |
| 18 | R12 | Regroup `components/workspace/` into sub-folders | Navigation only | M–L / 48 atoms, 193 mentions / about 200 import specifiers | Medium: harness aliases by exact path silently disable seams | Nothing | none | **Drop** |

## 7. Rulings

All six were made on 2026-11-23 by the wave driver under the owner's delegation (D556), and are
logged in [decisions](../../decisions.md).

- **D569: R1, R2 and R3 are taken.** R1 enforces the library line; R2 makes `session/` import only
  session plus the library set; R3 moves the Jam host wiring out of `WorkspaceShell.vue`.
- **D570: R4 is taken.** Above 10 atoms is a warning for test files only; source files keep a
  warning above 5 and an error above 10. This relaxes a quality gate, knowingly. Chunk reports
  still name any link they left out because of the limit.
- **D571: R5 is taken as a ruling.** The start-up budget stays at 400 KiB (409,600 B, D536). An
  overrun takes a lever: R6 first, then R7. Raising the budget is the owner's call only; no wave
  driver or chunk may do it. Answers Q2.
- **D572: the rest is deferred or dropped, as F ranks it.**
  - Deferred: R6, R7, R8, R9, R10, R11, R13, R14, R15, R18 and R19, each to the point §6 gives.
  - Dropped: R12, and R13's unification of the settings key list, whose order feeds the replay-key
    contract.
  - R16: the doc line in [generator-architecture.md](../../generator-architecture.md) is corrected
    in this pass; the code is deferred.
  - No analysis tool is kept in the repository (the point D557 left to the report). R1 reuses
    `verify-boundaries.mjs`, which already resolves paths; ESLint patterns cannot tell
    `domain/notation` from `src/notation` (F §2).
- **D573: the split's form (Q4).** Now: folders with enforced boundaries in one package, with no
  file moves. At game start: a new repository holding the library and the game as npm workspaces,
  seeded from the enforced library folders, with its own ATD record. The order of steps is §5's.
  It informs O314 (c) and does not decide O314 (a), on which the game-start form depends.
- **D574: the lexicon API's home is this app.** Closes O315.

Every recommendation in §6 is ruled: R1–R3 by D569, R4 by D570, R5 by D571, R6–R16, R18 and R19
by D572.

The refactors taken are built in [build plan v3.4](build-plan-v3.4.md), waves 2 and 3:
- wave 2, tooling, fast gate: chunk 4 (R4), then chunk 5 (R1);
- wave 3, app code, full e2e gate: chunk 6 (R2), then chunk 7 (R3).

## 8. The candidate rule table (E §2.3)

The measurement pass ran a candidate import-rule set with dependency-cruiser in a throwaway
worktree. Its table is copied here, verbatim from E §2.3, because the scratchpad that held the
rule file may be cleared. No tool is kept in the repository (D572): R1 builds its check into
`verify-boundaries.mjs`, and dependency-cruiser is not installed.

"Types count unless the rule says otherwise."

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

The rule definitions, verbatim from the scratchpad's `depcruise-candidate.cjs` (dependency-cruiser
18.9.0), so the table's paths can be read without it:

```js
/**
 * Candidate import rules for Infinite Flow (v3.4 structural review, measurement pass E2).
 * Basis: README.md "Directory Boundaries", the import rules in eslint.config.js (vexflow only in
 * the engraver files; session/ and export/ never import storage/; Jam's code and the lexicon page
 * only through their loaders) and the three-way split (D551): (1) a library = the music and
 * generation core (domain/, generation-worker/), (2) this app, (3) the game. Part A's placement:
 * notation/ (and audio/, midi/) a browser kit above the library; the lexicon module src/lexicon/
 * plain TypeScript, self-contained.
 * Severity: "error" = already enforced today by ESLint or a test; "warn" = candidate rule.
 * Run from the repo root: npx depcruise src --config <this file>
 */
const LIB = '^src/(domain|generation-worker)/'
const ENGRAVER_FILES =
  '^src/notation/(vexflow-mapping|vexflow-engraver|vexflow-two-system-engraver|vexflow-check-note-engraver|vexflow-empty-system-engraver)[.]ts$'
module.exports = {
  forbidden: [
    // --- enforced today (ESLint), restated so one tool holds every import rule ---
    { name: 'vexflow-only-in-engraver-files', severity: 'error', comment: 'eslint.config.js vexflowImportPattern',
      from: { path: '^src/', pathNot: ENGRAVER_FILES }, to: { path: '(^|/)vexflow(/|$)' } },
    { name: 'session-export-no-storage', severity: 'error', comment: 'eslint.config.js storageImportPattern',
      from: { path: '^src/(session|export)/' }, to: { path: '^src/storage/' } },
    { name: 'jam-only-through-its-loader', severity: 'error', comment: 'eslint jamImportPattern (type-only allowed); dynamic import() not checked',
      from: { path: '^src/', pathNot: '^src/(jam/|components/workspace/load-jam-mode[.]ts$)' },
      to: { path: '^src/jam/', dependencyTypesNot: ['type-only', 'type-import'] } },
    { name: 'lexicon-page-only-through-its-loader', severity: 'error', comment: 'eslint lexiconPageImportPattern (type-only allowed)',
      from: { path: '^src/', pathNot: '^src/(components/lexicon/|components/workspace/load-lexicon-page[.]ts$)' },
      to: { path: '^src/components/lexicon/', dependencyTypesNot: ['type-only', 'type-import'] } },
    { name: 'lexicon-module-self-contained', severity: 'error', comment: 'README: no package import; tests/unit/lexicon/lexicon-api-boundary.spec.ts',
      from: { path: '^src/lexicon/' }, to: { pathNot: '^src/lexicon/' } },
    // --- candidates: the library (1) ---
    { name: 'library-imports-only-library', severity: 'warn', comment: 'domain/ + generation-worker/ import nothing else, no package, types included',
      from: { path: LIB }, to: { pathNot: LIB } },
    { name: 'export-encoders-library-clean', severity: 'warn', comment: 'A §4: the 13 encoders could join the library',
      from: { path: '^src/export/(musicxml|midi)/' }, to: { pathNot: '^src/(domain|export/(musicxml|midi))/' } },
    { name: 'session-imports-only-library', severity: 'warn', comment: 'A §3.3/§7: session pure core next to the library',
      from: { path: '^src/session/' }, to: { pathNot: '^src/(domain|generation-worker|session)/' } },
    // --- candidates: the browser kit (notation, audio, midi) sits on the library, never on the app ---
    { name: 'notation-imports-only-library-and-vexflow', severity: 'warn',
      from: { path: '^src/notation/' }, to: { pathNot: '^(src/(domain|notation)/|vexflow)' } },
    { name: 'browser-kit-not-on-app', severity: 'warn', comment: 'audio/ and midi/ reach session/ types and the click plan',
      from: { path: '^src/(audio|midi|notation)/' }, to: { path: '^src/(components|composables|jam|storage|session|export|lexicon)/|^src/[^/]+[.](ts|vue)$' } },
    // --- candidates: the app's own layering ---
    { name: 'storage-not-on-ui', severity: 'warn', comment: 'A §2.2: the 77-file type SCC hangs on setting-defaults.ts:20-21',
      from: { path: '^src/storage/|^src/storage-bootstrap[.]ts$' }, to: { path: '^src/(components|composables|jam)/' } },
    { name: 'composables-not-on-components', severity: 'warn', comment: 'README: composables are UI coordination below components',
      from: { path: '^src/composables/' }, to: { path: '^src/(components|jam)/' } },
    { name: 'no-value-cycle', severity: 'warn', comment: 'cycles through value imports (static or dynamic)',
      from: { path: '^src/' }, to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } } },
    { name: 'no-cycle-any-edge', severity: 'info', comment: 'type imports included: the 77-file SCC and others',
      from: { path: '^src/' }, to: { circular: true } },
    { name: 'src-not-on-tests-or-scripts', severity: 'error', from: { path: '^src/' }, to: { path: '^(tests|scripts)/' } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.vue', '.js', '.mjs', '.json', '.d.ts'] },
  },
}
```

## 9. v4.0 inputs

Recorded for v4.0's spec, with nothing planned for them now (F §4 item 5):

1. Tone.js needs `worker-src blob:` in the CSP; the deployed header is `worker-src 'self'`.
2. Tone.js issue #1457: Firefox, `setContext` on a native context (C §6.4).
3. `verify:boundaries`' sampled-audio scan covers authored source only.
4. The atom `rule_guide_sound_from_oscillators` says "no new library".
5. The session bus must become async-aware: `openSessionBus` is synchronous and `import('tone')`
   is not (B §5.2–5.3, C §6.3).

## 10. What the split makes out of date

The three-way split (D551) makes the following out of date. They are left unrevised here and
pointed to [O313](../../open-questions.md#after-v34-the-split-and-this-apps-horizon-o313), whose
text lists them; checked against the documents on 2026-11-23:

- [personas](../../personas.md): P1 as "a player in the game-player sense", an attitude for now
  with game mechanics in the far future; and finding F3, "game player" against no scoring.
- [far vision](../../vision/far-vision.md): the principle "'Game player' is an attitude first",
  and its horizon, in which Infinite Flow itself becomes "the music factory behind a rhythm RPG".
- [endgame](../../vision/endgame.md): titled "Infinite Flow as a Rhythm RPG", it describes the
  game as this app's v2 loop "dressed as a game", with Infinite Flow as its "music factory".

O313's list matches the documents. The review's evaluation needed none of this revised first.

## 11. Measurement limits

- E's attribution of bytes to single modules can be off by about 1 KB either way; folder totals are
  stable (E §1.2, F §4 item 6). About 7.2 % of start-up bytes have no source mapping and were
  attributed by rule (E §1.2).
- The time until the app is usable on the reference phone was not measured, so Q2's answer rests on
  bytes (E, "Not measured"; F §4 item 6).
- Compressed sizes are per chunk only, not per module (E, "Not measured").
- Tone.js was not re-measured by E; its figures are C's (C §6.2).

Definition of done (structural review §6): every question in §5 has an evidenced answer here (Q1 in
§2, with the prerequisites in §2.1; Q2 in §3; Q3 in §4; Q4 in §5); every recommendation carries a
cost, a benefit and a risk (§6); the driver has ruled on each one (§7).
