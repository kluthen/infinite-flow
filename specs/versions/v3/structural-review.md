# v3.4 — Structural Review

Status: draft v1.2 (2026-11-22; scoping, D389; the lexicon page noted, D393; the owner's first
rulings, D545–D547). Settled: the milestone's existence and placement (D389), what v3.4 delivers
(D545), that the review looks at the code as it is and not at v4's scope (D546), and that no
runtime dependency is added besides Tone.js (D547). The rest is `(proposed)` and waits on O236,
O238 and O312. The analysis itself has not started; this draft frames the questions it must
answer and does not answer them.

Serves no persona goal directly: it adds no player-facing behaviour. It protects the delivery of
every later goal on the way to the [endgame](../../vision/endgame.md), without planning for any
one version's scope (D546). The first-load question also touches the shared
[context of use](../../personas.md#context-of-use): the occasional phone used outdoors, on a mobile
connection.

## 1. Why, in the owner's words

Recorded 2026-10-21 (D389): "objective there is to do an overall structural analysis of our app,
are we still sound for expansion? can/should we reduce our initial footprint (currently set to a
max of 300kb), do we have refactoring opportunities that are worth taking. starting v4 we truly
begin working on endgame and it's got a lot to do, we might even consider splitting the app in
multiple libs. this "milestone" is meant to have a clear view of our current setup."

**Goal:** a clear, evidenced view of the current code before v4's work starts, a short list of
ranked recommendations the owner can take, defer or drop, and the refactors he takes, built in
v3.4 (D545).

The owner's rulings of 2026-11-22, in his words:

- What v3.4 delivers (D545): "it's both the report and the corrective measures should they
  arise."
- Which v4 the review plans for (D546): "we wont work on reviewing V4.0 right now. we will focus
  on v3.4".
- How far a refactor may go (D547): "the only dependency we should plan for is tone.js otherwise
  we don't have need to add a new one."
- The endgame as the same app or a separate one (O236, not ruled): "that's another question that
  need to be resolved."

## 2. Where it sits

- **The last v3 milestone:** after v3.3, before v4, in the [v3 releases](README.md#releases-d211)
  (D389). The owner, asked whether it should run before v3.2 and v3.3 instead: "leave it for the
  last milestone of v3, there is no need to run it prior".

## 3. What it is not

- **No new player-facing behaviour.** Nothing a player sees or hears changes because of the
  review. v3.4's one player-facing item, the [lexicon page](lexicon-page.md) (D393, amending
  D389), is a separate small build; the review measures the app with it, its own size budget
  included (O242, O245).
- **Not a rewrite.** The analysis reads and measures; it changes no code. A refactor it
  recommends is built only once the owner takes it, as a chunk of the v3.4 build plan (D545).
  Behaviour-preserving only, guarded by the existing tests, atom IDs unchanged and their links
  moved with the code (proposed, O238).
- **No new runtime dependency** besides Tone.js (D547). Tone.js is v4's planned sound library
  ([v4](../v4/README.md)); the review may weigh where it would load and what it would cost the
  start-up budget, and plans nothing else for it. Whether the ruling also covers the dev-only
  analysis tools of §7 is O238 (proposed reading: it does not, since they run in a throwaway
  worktree and nothing is committed).
- **Not a review of v4.** The review looks at the code as it is now: its soundness for expansion
  in general, the entry budget, the refactors worth taking and a split. It does not plan for v4's
  items or review v4's scope (D546).
- **Not a re-decision of settled product rules.** The master spec parts and the declared intent
  (`docs/*.atom.md`) stay the contract; the review looks at how the code carries them, not at what
  they say.

## 4. Starting facts (first blast-radius view, 2026-10-21)

Read on branch `v3.1-w5` at 8c407e7 (after v3.1 wave 5's gate). These are facts to start from, not
findings; the review re-measures them.

- **Size.** About 72,000 lines under `src/`. The largest areas: `components/` (~25,000 lines, of
  which `components/workspace/` ~17,200 in 109 files), `domain/` (~19,000, the pure generation
  logic), `session/` (~6,000), `storage/` (~5,500). Then `notation/`, `composables/`,
  `generation-worker/`, `styles/`, `export/`, `audio/` and `midi/`, each 1,500–3,000.
- **Packages.** One npm package; no workspaces. `tsconfig.json` references three projects (app,
  node, e2e); the only path alias is `@/*`.
- **Boundaries.** `scripts/verify-boundaries.mjs` (`npm run verify:boundaries`) guards browser
  APIs (storage, network, audio, MIDI, each allowed in its own folder only), the built output (no
  audio files, the service worker's precache) and chunk sizes. It defines **no import rules between
  modules**. The only import rules are two ESLint ones (`eslint.config.js`): `session/` and
  `export/` may not import `storage/`, and only four `notation/vexflow-*.ts` files may import
  VexFlow.
- **The entry chunk.** Budget `entryChunkByteBudget` = 300 KiB = 307,200 B (D359), measured on the
  minified file on disk (`dist/assets/index-*.js`), **not** the compressed size a browser
  downloads. Now 265,431 B, 41,769 B under budget. Its history through v3.1: 229,146 B at v3.0,
  then 230,609, 227,702, 246,844, 250,721 and 265,431 B (wave 5 added 14,710 B). Other budgets:
  the generation worker 150 KiB (now 131,789 B), the VexFlow engraver chunk 800 KiB (now
  733,117 B), any other chunk 100 KiB. The CSS (~44 KB) has no budget.
- **Lazy loading.** No `manualChunks`; chunks come from about 40 dynamic `import()` sites and two
  workers. Already lazy: the VexFlow engraver, the review, the connection sheet, the Your data
  sheet, the preset sheet, the my-instrument sheet, exports, the kept-session codec, and the
  session runner, controller, pre-generation and worker client. `WorkspaceShell.vue` imports the
  control panel, score panel and header directly, so they sit in the entry with Vue.
- **The subsystems the owner names.**
  - Generation worker: `src/generation-worker/` (13 files), reached through
    `generation-worker-client.ts`; it also holds the replay-key code.
  - Session engine: `src/session/session-engine.ts`, a pure state machine over 33 sibling modules,
    driven by `session-runner.ts` and wrapped in about 9 `components/workspace/workspace-session-*`
    files.
  - Storage and codecs: `src/storage/` (IndexedDB behind `storage-port.ts`), the codecs in
    `storage/records/`, and `src/storage-bootstrap.ts`, which loads saved data before the app
    mounts.
  - UI shell: `main.ts` → `App.vue` → `WorkspaceShell.vue` (554 lines, ~36 imports), which
    builds the session through `create-workspace-session.ts`.
- **Code health.** `npm run lint:health` (`scripts/code-health-check.mjs`, limits in
  `scripts/code-health/config.mjs`): files warn above 400 and fail above 600 effective lines;
  nesting fails above 4; a file warns above 5 distinct linked atoms and fails above 10. There is no
  function-length or complexity rule. On 2026-10-21: 0 errors and 746 warnings over 1,204 files
  (509 missing intent comments, 218 atom links, 19 sizes); `src/` alone has 159.
  - **27 files sit at exactly 10 atoms**, the failing edge, 17 of them in `components/workspace/`.
    v3.1's wave-5 gate failed once on this limit (`WorkspaceShell.vue` and `ControlPanel.spec.ts`)
    and was fixed by moving code out.
  - Largest file: `domain/pitch/pitch-candidates.ts`, 553 effective lines, 47 under the size
    error.
- **Duplication.** No duplication or dependency-graph tool is configured (no jscpd,
  dependency-cruiser, madge or knip).
- **Architecture records.** `README.md`'s "Directory Boundaries" and "Architecture Overview";
  `CODING_RULE.md`; [generator architecture](../../generator-architecture.md) (its status says it is
  partly pre-gate); [prerequisites](../prerequisites.md), the cross-version building blocks
  (multi-voice representation, generator versioning, the display-effect layer and others), still
  being drafted; 412 atoms in `docs/` (125 architecture, 287 business); the large subsystem docs
  in `docs/` (session engine, storage, notation, phrase workspace, generation latency, testing).

## 5. The questions it must answer

Each answer needs evidence: measured numbers, file paths, and what was checked. "It seems fine" is
not an answer.

### Q1. Is the architecture sound for expansion?

- What are the real module boundaries today, as the import graph shows them, and where do they
  differ from what `README.md` and the architecture atoms say?
- Should module boundaries be enforced by a tool (an import-rule map), as browser APIs already are
  by `verify:boundaries`? Which rules would it hold?
- For each named subsystem (the generation worker, the session engine, storage and codecs, the UI
  shell): what does it expose and depend on, and what in its current shape helps or blocks growth
  in general (new features beside the existing ones, more of them, more code)?
  - Out of scope since D546, kept as the record of what this question first asked: what v4 asks of
    each subsystem (several system voices with roles, a software sound library loaded on demand,
    a whole-file seed, rhythm ratios and the rhythm editor; see [v4](../v4/README.md)), and which
    v4 to plan for (O237, closed by D546).
- Is `components/workspace/` (109 files, most of the files at the atom limit) a seam that is about
  to give way, and what would a better split look like?
- Are the [prerequisites](../prerequisites.md) still the right list, and which are now urgent?
- Does the planned widening to Firefox and Safari (at v4 or v5, [roadmap](../../roadmap.md#engineering-carry-overs-not-tied-to-one-version))
  change anything structural?

### Q2. Should the entry budget be lowered, and how?

- What is in the 265 KB entry chunk today, by module and by dependency?
- What could move out of it by lazy loading, at what cost to the time before the app is usable and
  to the code?
- What did v3.2 and v3.3 add to it, and at what pace does it grow? (v3.1 grew it by about 36 KB.)
  What v4's items would add is out of scope (D546).
- Tone.js, the one dependency the owner plans for (D547): its weight, and where it would load
  (lazily, on first use of a sound, or in the start-up JavaScript), against the start-up budget.
- The measure is settled (D536): all JavaScript loaded at start-up, in minified bytes on disk,
  400 KiB. The review may also report the compressed download and the time until the app is
  usable on the reference phone, as information.
- Options with their costs (keep 400 KiB; lower it to a number the review proposes). The owner
  chooses.

### Q3. Which refactoring opportunities are worth taking?

- A ranked list, each with its benefit, its cost (size, risk, ATD link churn, test churn) and what
  it unblocks, within the bounds the owner sets: no new runtime dependency besides Tone.js (D547);
  behaviour-preserving, atom IDs unchanged, and a time budget he sets once the ranked list is in
  front of him (proposed, O238).
- Sources: the code-health backlog (`npm run lint:health`), the files at or near the size and atom
  limits, duplication (measured with a tool, not guessed), and the friction recorded in the v3 wave
  logs (gate failures, "beyond Files" changes, recurring sync notes).
- Are the code-health limits themselves right as the code grows (for example, does the 10-atom
  limit push code apart along good seams or arbitrary ones)?

### Q4. Should the app split into several libraries or packages?

- Candidate seams, for example: the music and generation core (`domain/`, the worker), notation
  (`notation/`, VexFlow), storage and codecs, audio and MIDI, the UI. Which are already clean
  enough to lift, and which would need work first?
- What form: folders with enforced boundaries in one package, npm workspaces in one repo, or
  separate repositories? What each costs in build (Vite, TypeScript project references), tests
  (Vitest, Playwright), ATD (atom links and paths, `atd` tooling, `.atd` config), the boundary
  checks, the release and the VPS deploy.
- What a split buys: who would consume a library besides this app (the endgame's game?), faster
  builds and tests, clearer ownership for agents working on separate seams.
- The answer depends on the owner's intent for the endgame, which he has not ruled: "that's
  another question that need to be resolved" (O236). The review assumes neither answer. It
  presents both (the endgame grows inside this app; the endgame is another app using Infinite
  Flow's generator), gives its recommendation under each, and says where and why the
  recommendation changes between them.

## 6. Deliverables

1. **A written report** with the evidence and ranked recommendations for Q1–Q4, written by
   `spec-writer` from the analysts' results into this folder (proposed:
   `structural-review-report.md`).
2. **The owner's rulings** on each recommendation (take, defer, drop), logged as decisions.
3. **A v3.4 build plan of the refactors the owner takes** (D545), written by `spec-writer` on the
   build-plan model, should any be taken; with none taken, the report and the rulings close the
   review.
4. **A release** (proposed, O312): v3.4 is tagged `3.4.0`, since it ships code whatever the
   review finds (the lexicon page, D393; O245).

**Definition of done (proposed):** every question in §5 has an evidenced answer in the report
(Q4 under both answers to O236); every recommendation carries a cost, a benefit and a risk; the
owner has ruled on each one; the refactors he took are built (D545), the build plan approved
separately (proposed).

## 7. Who does what (proposed)

- **`codebase-explorer`**, read-only: the facts. The import graph and where it breaks the
  documented boundaries; what each subsystem exposes and depends on; the workspace folder's
  structure; duplication hot spots; the friction found in the v3 wave logs.
- **`web-researcher`**, read-only: tooling. Bundle analysis for Vite, import-rule tools
  (dependency-cruiser, ESLint boundaries plugins), duplication tools (jscpd), and package splitting
  (npm workspaces, TypeScript project references, Vite library mode, Vitest and Playwright across
  packages); Tone.js's size and how it can be loaded (D547). No personal data in any request.
- **A measurement pass**: what is in the entry chunk needs a build with a bundle analyser. That is
  a run, not a read: a `coding-executor` in a throwaway worktree, with nothing committed (proposed).
  The analysis tools it installs there (bundle analyser, dependency-cruiser, jscpd) are not
  dependencies the app adds, so D547 does not bar them (proposed reading, O238). A tool the review
  recommends keeping, such as an import-rule checker, is a dev dependency the owner rules on with
  that recommendation.
- **`documentalist`**: what a split or a move costs the atoms and their links, and whether
  `atd` works across packages.
- **`principal-advisor`**: weighs the facts, the measurements and the research, and ranks the
  recommendations for Q1–Q4.
- **`spec-writer`**: writes the report, takes it to the owner, logs the rulings and, if asked,
  writes the build plan.
- **The owner**: answered O234 and O237 and part of O238 on 2026-11-22 (D545–D547); still to
  answer O236 (before the report's Q4 recommendation is ruled, not before the analysis), O238's
  remaining parts and O312; then rules on each recommendation.

## 8. Open

O236, O238 and O312, in the [register](../../open-questions.md#v34-structural-review-o234); the
lexicon page's order in v3.4, which decides when the measurement pass runs, is O245.
