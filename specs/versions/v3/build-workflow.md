# Infinite Flow v3 — Build workflow

Status: v1 (2026-10-16): written from §3 of the v3.0–v3.3 build plans (spec D349).

How Infinite Flow fills in the build-plan model
(`~/.local/share/dev_team/references/build-plan-model.md`) for every v3 build plan that links this
document. It states only what this project adds to the model or decides where the model leaves a
choice; for everything else (terms, waves, chunk template, verification levels, branches, intent
gating) the model holds. A plan's own **Workflow deltas** section adds only that release's
specifics: its corpus, the chunks that keep the corpus guard, the chunks that place the sweep, its
change set, its area documents, its entry budget. The v3.0 plan ([build-plan.md](build-plan.md))
(complete) keeps its own §3.

## Concurrency and order

- **κ = 1**: one chunk in flight at a time, a cost choice the owner can change for a wave or a
  plan. A chunk built and waiting only on a contract sign-off does not count against it.
- Inside a wave, topological order, ties broken by chunk number; a chunk may go ahead of a blocked
  lower-numbered one.

## Branches and worktrees

| What | Branch | Worktree |
| --- | --- | --- |
| Wave | `<release>-w<n>`, e.g. `v3.1-w2` | `/home/bastien/work/infinite_flow-<release>-w<n>` |
| Chunk | `<release>-c<id>-<slug>`, e.g. `v3.1-c12-presets` | `/home/bastien/work/infinite_flow-<release>-c<id>` |

`<release>` is the release name with its dot (`v3.1`), in the worktree as in the branch. Never
reuse `../infinite_flow-perf-investigation`.

## Chunk checks

The model's chunk checks, with this project's commands and rules:

- **Tests first, red to green**: each test fails first on an assertion about the missing
  behaviour, never on an import error.
  - Pure logic: Vitest unit tests under `tests/unit/`, mirroring `src/`. Storage runs on
    `fake-indexeddb`; saved data is seeded through the harness's storage seam (v3.0 chunks 4 and
    7), never by hand-built records.
  - Behaviour: Playwright scenarios on the workspace harness, each from an empty browser context.
    A new spec outside `tests/e2e/notation/` is added to the explicit `test:e2e` list in
    `package.json`, or it never runs in `npm run quality`.
- **Implement** per [`CODING_RULE.md`](../../../CODING_RULE.md): crash early, no silent fallback
  (tolerant loading is the spec's stated exception and lives in the codecs), injected seams
  instead of test-only branches (the clock, an id source), the file-size limits. Interface code
  uses only the classes and tokens of `src/styles/`, never a raw visual value.
- **Related tests**: `npx vitest related --run <the source files it touches>`, plus the Playwright
  specs the chunk adds or edits.
- **Static checks**: `npm run typecheck`, `npm run lint`, `npm run format:check`; `npm run
  lint:links` when the chunk changed a Markdown file.
- **Debug run**: `npm run dev` in Chromium, or the workspace harness, with a landscape phone-sized
  window for anything shown below `bp-tablet-landscape`. **Never edit the repository while the
  owner is testing on the dev server**: Vite reloads his page. Batch any write until he pauses.
- **Replay-corpus guard** (kept at chunk level): a chunk the plan lists as touching generation (or
  what the plan names beside it: the session's draws, the backing, the exports) runs the plan's
  baseline corpus, the earlier corpora and the cold-generation goldens unchanged. A red corpus
  means the defaults no longer reproduce the previous release: stop and find why, never re-record.
  It stays a chunk check because it tests exactly what such a chunk changes, and a regression found
  a wave later costs far more to trace (spec D252).
- **Documents**: `README.md` (directory boundaries, the forbidden-API lists, the quality-gate
  table), `docs/storage.md` (records, data versions), `docs/testing.md` (every new seam, fake,
  fixture and script), the area's own document as the plan lists them, and the lexicon entries the
  master spec names, from "planned" to "built" once built. Where the code had to differ from the
  spec or the design, the chunk reports it to `spec-writer` or `ux-writer` and records it on its
  **Record** line; it never fixes the spec or design silently.

## Intent (ATD)

The repo declares intent with ATD (`.atd`, atoms in `docs/<id>.atom.md`). In a v3 plan:

- **Atoms** names the DRAFT atoms tagged `release-<release>` the chunk builds, then the existing
  atoms it must keep true, marked with the release that made them ("(v2)", "(v3.0)"), then the
  **drift check**: the ARCHITECTURE atoms the wave sync checks against the new code.
- **Revisions** names the atoms tagged `changes-in-<release>` the wave sync revises (or deletes)
  once the chunk is merged, as the release's intent change set says.
- ATD covers business behaviour and architecture only. Tooling, test plumbing and measurement
  scripts add no atom; such a chunk's **Atoms** line says "none".
- At the wave sync: `@spec-link` / `@test-link` tags sit **directly above the function or test,
  never at the top of a file**; a status advances only with the owner's agreement; `npm run
  atd:lint` and `npm run atd:check` pass; the sync is committed on the wave branch.
- **Contract sign-off.** A chunk that changes a STABLE guarantee does not merge into its wave
  branch before the owner has confirmed that guarantee's wording and `documentalist` has recorded
  the confirmation in the atom's notes (spec D246, D276). It is a gate in the plan's gates table;
  the chunk's merge commit cites the decision that records it.

## Wave gate

On the wave branch, on an idle machine. **Never run `atd audit` alongside tests**: it saturates the
machine and makes timing tests fail.

1. `npm run quality` (format, lint, link lint, health lint, unit tests, build,
   `verify:boundaries`, end-to-end, accessibility and notation suites, `atd:lint`, `atd:check`).
2. `npm run test:sweep` when a chunk of the wave places the sweep there (a generation or session
   chunk does; it takes long), and every other check a chunk's **Verification** line defers to the
   wave gate.
3. **The bundle**: the entry chunk's size after `npm run build` and its change since the previous
   wave, written in the wave log and in the wave's merge commit message; `npm run
   verify:boundaries` holds the plan's entry budget (`entryChunkByteBudget` in
   `scripts/verify-boundaries.mjs`; raising it needs the owner). A chunk's "lazy" or "unchanged"
   claim about the entry chunk is checked here.
4. **Performance figures** are recorded with the machine and the date. A figure measured on a
   virtual machine never gates; the owner checks budgets on the reference machine.
5. Then the post-task sync (above).

The owner's report adds the bundle figure, and names any chunk that left the wave on a contract
sign-off still open.

## Release gate

- `docs/release/<release>-release-notes.md`, on the model of
  [`v2.0-release-notes.md`](../../../docs/release/v2.0-release-notes.md): one row per item of the
  definition of done with its evidence (a named test as `file` › 'title', or a written hand
  check), then the plan's measurements with their figures.
- `npm run quality` on an idle machine, `npm run lint:links`; the release notes reviewed by the
  owner.
- `package.json` takes the release's version; the tag only when the owner asks. After the tag,
  `spec-writer` and `ux-writer` archive the release's working records (milestone archive).

## Data register

The repo has no data register (`data-register/`), so no plan runs a data preflight and no chunk
carries a **Data** line.
