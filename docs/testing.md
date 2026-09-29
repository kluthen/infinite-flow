# Testing

This document records how Infinite Flow is tested: the test layers and where a new test goes, the
npm scripts that run them, the two browser harnesses and the seams a test drives them through, the
rules that keep every run deterministic, and the list of test fixtures. Each chunk of work that adds
a layer, a script, a harness seam, a fake or a fixture updates this document in the same change.

## Test layers

| Layer         | Where                                                                                                                | Runner and config                                                                 | What it is for                                                                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit          | `tests/unit/**/*.spec.ts`, mirroring `src/`                                                                          | Vitest, `vitest.config.ts` (jsdom environment for every spec)                     | Pure logic and component contracts: domain rules, generation, the session state machine, the Worker protocol and client, Vue components through Vue Test Utils, property-based checks and the golden fixtures. |
| End-to-end    | `tests/e2e/startup.spec.ts`, `tests/e2e/workspace/`, `tests/e2e/release/`                                            | Playwright, `playwright.config.ts`, Chromium only                                 | Player-facing journeys in a real browser. `workspace/` drives the production preview build; most of `release/` drives the workspace harness for states that only its seams can force.                          |
| Accessibility | `tests/e2e/accessibility.spec.ts`                                                                                    | Playwright with `@axe-core/playwright`                                            | An axe scan of each covered UI state, on the production preview and, for the in-flight and failure states, on the workspace harness.                                                                           |
| Notation      | `tests/e2e/notation/`                                                                                                | Playwright against the notation harness                                           | Engraving, layout, calibration and key-signature spelling of one phrase in a container of a given width, plus pixel baselines in `tests/e2e/notation/notation-visual.spec.ts-snapshots/`.                      |
| Measurement   | `tests/perf/`, `tests/e2e/workspace/generation-latency.spec.ts`, `tests/e2e/workspace/engraving-main-thread.spec.ts` | Vitest with `vitest.perf.config.ts` (node environment, 60 s timeouts); Playwright | Timing reports, not pass/fail checks on the numbers. They run only when called by name and never inside `npm run quality`.                                                                                     |

### Where a new test goes

- **Pure logic** (no DOM, no browser API) gets a Vitest spec under `tests/unit/`, at the path that
  mirrors its source file: `src/domain/rhythm/syncopation.ts` is tested by
  `tests/unit/domain/rhythm/syncopation.spec.ts`. A component or composable spec goes under
  `tests/unit/components/` or `tests/unit/composables/` the same way.
- **Behaviour on screen** gets a Playwright spec. Use the production preview (`tests/e2e/workspace/`)
  when the real app can reach the state on its own, and the workspace harness (`tests/e2e/release/`
  today) when the test needs a fixed seed, a held generation or a forced failure.
- **Engraving and layout** of one phrase gets a spec under `tests/e2e/notation/`, driven through
  the notation harness.
- **A timing measurement** gets its own spec and its own `measure:*` script, and stays out of
  `test:e2e`.

### The `test:e2e` file list

`test:e2e` names its specs one by one: `tests/e2e/startup.spec.ts`, eight files in
`tests/e2e/workspace/`, and the whole `tests/e2e/release/` directory. A new Playwright spec outside
`tests/e2e/notation/` (which `test:notation` runs as a directory) and outside `tests/e2e/release/`
must be added to that list in `package.json`, or it never runs in `npm run quality`. Measurement
specs are left out on purpose. `accessibility.spec.ts` is not in the list either: `test:a11y` runs
it.

## Scripts

| Script                    | Command                                                             | What it does                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test:unit`               | `vitest run`                                                        | Every `tests/unit/**/*.spec.ts` in jsdom.                                                                                                                                                                                                            |
| `test:e2e`                | `playwright test` with the explicit file list above                 | Startup, workspace and release journeys.                                                                                                                                                                                                             |
| `test:a11y`               | `playwright test tests/e2e/accessibility.spec.ts`                   | The axe scans.                                                                                                                                                                                                                                       |
| `test:notation`           | `playwright test tests/e2e/notation`                                | Every notation spec, including the visual baselines.                                                                                                                                                                                                 |
| `measure:latency`         | `vitest run --config vitest.perf.config.ts`                         | `tests/perf/generation-latency.perf.ts`: a cold then a warm `generatePhrase` call in Node for every combination of note density, rhythmic variety, silence density, syncopation and tension arc. Writes full JSON to `LATENCY_OUT` when set.         |
| `measure:latency:browser` | `playwright test tests/e2e/workspace/generation-latency.spec.ts`    | Cold and warm click-to-"Phrase ready" time in Chromium on the production preview, for the worst-case and default settings, and the theme control's response time during the worst-case cold run. Writes full JSON to `LATENCY_BROWSER_OUT` when set. |
| `measure:engraving`       | `playwright test tests/e2e/workspace/engraving-main-thread.spec.ts` | The longest main-thread task while a phrase is engraved in Chromium.                                                                                                                                                                                 |
| `verify:boundaries`       | `node scripts/verify-boundaries.mjs`                                | Rejects forbidden browser APIs in `src/`, checks the PWA precache and the per-chunk size budgets. Needs a fresh `dist/`.                                                                                                                             |
| `format:check`            | `prettier --check` over the authored files                          | Formatting. `docs/` is checked only under `docs/release/`.                                                                                                                                                                                           |
| `lint`                    | `eslint .`                                                          | ESLint, including the forbidden-API rules.                                                                                                                                                                                                           |
| `lint:links`              | `remark . --quiet --frail --no-stdout --ext md`                     | Every relative Markdown link and `#heading` anchor, offline.                                                                                                                                                                                         |
| `atd:lint`                | `atd lint`                                                          | Structure of the `docs/*.atom.md` atoms.                                                                                                                                                                                                             |
| `atd:check`               | `atd check`                                                         | `@spec-link` and `@test-link` coverage.                                                                                                                                                                                                              |
| `quality`                 | the gates below, in order                                           | The whole gate.                                                                                                                                                                                                                                      |

The measurement results, with the machine and the date, are recorded in `docs/generation-latency.md`.

`npm run quality` runs, and stops at the first failure: `format:check`, `lint`, `lint:links`,
`test:unit`, `build`, `verify:boundaries`, `test:e2e`, `test:a11y`, `test:notation`, `atd:lint`,
`atd:check`. Run it on an idle machine. Several specs are timing-sensitive and time out under CPU
load, so never run it next to `atd audit` (which saturates the local model server), a measurement
script, or another test run.

`test:unit` needs `xmllint` (from libxml2; the Debian package is `libxml2-utils`) on the `PATH`:
`tests/unit/export/musicxml/musicxml-schema.spec.ts` runs it to validate the MusicXML export
against the MusicXML 4.0 schema, offline. The development container installs it. Without it that
spec fails; it never skips.

Every Playwright command starts all three `webServer` entries of `playwright.config.ts`, whatever
spec it runs:

| Port | Serves                                                                                          | Built by                                                       |
| ---- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 4173 | The production build (`dist/`) through `npm run preview`. It is Playwright's default `baseURL`. | Nobody: run `npm run build` first. `quality` builds before it. |
| 4174 | The notation harness (`dist-notation-harness/`).                                                | `npm run build:notation-harness`, as part of starting.         |
| 4175 | The workspace harness (`dist-workspace-harness/`).                                              | `npm run build:workspace-harness`, as part of starting.        |

None of the three reuses a running server, so a dev server or preview already bound to one of these
ports makes the run fail.

## The workspace harness

**Files.** `tests/e2e/workspace-harness/index.html` and `main.ts`, the engraver seam
`tests/e2e/workspace-harness/vexflow-engraver-loader-seam.ts`, the typed API
`tests/e2e/workspace-harness-window.d.ts`, and the build config `vite.workspace-harness.config.ts`.
It is served on port 4175 and has no PWA plugin and no service worker.

**What is real.** The harness mounts the production `App.vue` tree with the production styles. Its
workspace session is built by `composeWorkspaceSession` and handed to `App.vue` through the
`WORKSPACE_SESSION_FACTORY` provide/inject point. Generation runs in the real Worker through the
real client, and notation is engraved by the real VexFlow adapter. Only randomness, timing and fault
injection are replaced. Nothing in `src/` knows the harness exists: the seams are injected
dependencies, plus one Vite alias.

**Seams.** `main.ts` publishes them on `window.__workspaceHarness`:

| Seam                 | Signature                                               | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queueSeeds`         | `(seeds: readonly number[]) => void`                    | Appends seeds to a queue. Each new generation draws the next queued seed. When the queue is empty the seed comes from a counter (1, 2, 3 …) instead of `crypto`.                                                                                                                                                                                                                                                                                                                                                                                     |
| `holdGeneration`     | `() => void`                                            | Every later `generate` call waits at a gate before it reaches the Worker. Holding an already held gate does nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `releaseGeneration`  | `() => void`                                            | Opens the gate; every waiting call carries on.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `failNextGeneration` | `(code: WorkspaceHarnessGenerationFailureCode) => void` | The next `generate` call, once past the gate, returns a `generation_failure` with that code and empty diagnostics instead of calling the Worker. One shot. The codes: `no_legal_harmony_plan`, `no_legal_rhythm_plan`, `no_legal_pitch_plan`, `no_eligible_register_window`, `search_limit_exceeded`, `result_validation_failed`.                                                                                                                                                                                                                    |
| `failNextNotation`   | `() => void`                                            | The next call to `engraveWrittenPhrase` throws a `NotationError` with code `notation_engraving_failed`. One shot. It arms the engraver loader seam below.                                                                                                                                                                                                                                                                                                                                                                                            |
| `snapshot`           | `() => WorkspaceHarnessSnapshot`                        | The session's current state: `operation`, `instrumentProfileId`, `writtenTonalCenter`, `concertTonalCenter`, `requestId`, `seed`, `timeline` (the latest result's concert timeline as a JSON string), `chosenNoteDensity` (the density the player chose, kept whatever the window's width) and `generatedNoteDensity` (the density the latest result was generated with: `Eighth` for a chosen `Sixteenth` below `bp-tablet-landscape`). Fields read from the result are `null` before the first result. Throws if called before the session mounts. |

Request ids are also deterministic: `workspace-harness-request-1`, `-2`, and so on, per page load.

**The window's width is real.** The harness gives the session the production `matchMedia` width
provider (`createBrowserViewportWidth`), so a spec moves the window across `bp-tablet-landscape`
(64rem, 1024 px) with `page.setViewportSize` and the session sees the crossing exactly as in the
app. `tests/e2e/release/note-density-width.spec.ts` does this for the note-density rule, reading
`chosenNoteDensity` and `generatedNoteDensity` from `snapshot` after each generation.

**The engraver loader seam.** `vite.workspace-harness.config.ts` aliases
`@/notation/vexflow-engraver-loader` to `vexflow-engraver-loader-seam.ts`. Every production import of
the loader resolves to the seam, which loads the real engraver module and wraps its
`engraveWrittenPhrase`. The failure is raised at engraving rather than at module load because
`PhraseScore` keeps the module after its first load, so a load failure could only ever be seen
before the first phrase. Once armed, the failure fires on the next redraw of any kind: a new phrase,
a notation-mode switch, a resize, or Retry notation. A spec must trigger exactly one redraw after
arming, or a second, unarmed redraw recovers before the assertions run.

**Driving it.** `tests/e2e/release/harness-helpers.ts` wraps every seam in a typed function
(`gotoWorkspaceHarness`, `queueSeeds`, `holdGeneration`, `releaseGeneration`, `failNextGeneration`,
`failNextNotation`, `harnessSnapshot`), and `tests/e2e/workspace/helpers.ts` supplies the page
helpers shared with the production specs (`primaryButton`, `statusRegion`, `radio`,
`generateAndAwaitReady`). From `tests/e2e/release/concurrent-operation-prevention.spec.ts`:

```ts
await gotoWorkspaceHarness(page)
await queueSeeds(page, [1, 2])
await holdGeneration(page)

await primaryButton(page).click()
await expect(statusRegion(page)).toHaveText('Generating phrase')
// ... assert every control group is read-only while the request is held ...
await releaseGeneration(page)
await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
```

A new seam is added to `main.ts`, typed in `workspace-harness-window.d.ts`, wrapped in
`harness-helpers.ts`, and listed in the table above.

## The notation harness

**Files.** `tests/e2e/notation-harness/index.html`, `main.ts` and `fixtures.ts`, the typed state
`tests/e2e/notation-harness-window.d.ts`, and the build config `vite.notation-harness.config.ts`. It
is served on port 4174; every notation spec sets `test.use({ baseURL: 'http://127.0.0.1:4174' })`.
It mounts `PhraseScore` without the app shell, inside a real `staff-frame` in the `#app` container,
with the app's own stylesheet (Tailwind runs in the harness build), because the notation layout
reads its height budget from `staff-frame`'s computed `max-block-size`.

**URL parameters.** A missing required parameter throws; nothing is defaulted except `source`.

- `width` (required): the frame's outer width in CSS pixels.
- `source`: `fixture` (the default) or `generated`.
- With `source=fixture`: `fixture`, one of the named fixtures listed below.
- With `source=generated`: `seed`, `tonal`, `collection`, `density`, `variety`, `syncopation`,
  `silence`, `register` and `profile`, each validated against the domain catalogs, and optionally
  `contour` (default Arch) and `leapiness` (default Shaped), which the calibration sweep varies.
  The other controls are fixed (tempo 90, Gentle diatonic motion, Settled tension, Predictable
  arpeggio chaos, Neutral musical profile). The phrase is generated on the
  page's main thread with `generatePhrase`, and engraved in the chosen instrument's written pitch. A
  generation failure throws as a page error; no state is published for it.

**Published state.** `window.__notationHarness` follows `PhraseScore`'s lifecycle:

- `{ state: 'pending' }` until the first engraving settles;
- `{ state: 'ready', engraved: { staffSpacePx, widthPx, heightPx, requiredUnits, systemCount,
positionBlockPx } }`, where `positionBlockPx` is the height of one reserved system position;
- `{ state: 'error', errorCode, errorDetails }`, for example `notation_no_room` (the window has no
  room for the staff) or `notation_notes_too_wide` (this phrase's notes don't fit).

Every state also carries `engraveCount`, the number of successful engravings since the page loaded,
so a spec can prove that something (a browser toolbar showing or hiding) caused no redraw. A spec
that resets the state to `pending` drops it until the next publish.

The generated source also publishes `sourceSnapshot` (the JSON of the result, provenance, request
and intent right after generation) and `currentSnapshot()`, which recomputes it, so a spec can check
that engraving left the phrase unchanged. No spec reads them today.

**Driving it.** A spec waits until the state leaves `pending`. To force a redraw, it sets the state
back to `pending` and changes the container width. From
`tests/e2e/notation/notation-engraving.spec.ts`:

```ts
await page.goto('/?fixture=simple&width=1200')
await waitForHarnessSettled(page) // waits for state !== 'pending'
await page.evaluate(() => {
  window.__notationHarness = { state: 'pending' }
  document.getElementById('app')!.style.width = '300px'
})
await waitForHarnessSettled(page)
expect((await page.evaluate(() => window.__notationHarness)).state).toBe('error')
```

## Fakes still to come

The audio clock, the audio output and Web MIDI access have no fakes yet. Chunk 10 adds a fake clock
that a test advances by hand and a fake audio output; chunk 12 adds a fake MIDI access that plugs,
unplugs and plays notes on command. Both go into the workspace harness as new seams and are
documented in its table above.

## Fake window width

The workspace session reads the window's position against `bp-tablet-landscape` through an
injected `ViewportWidthProvider` (`src/composables/viewport-width.ts`). Unit tests replace it with
`createFakeViewportWidth(initiallyBelowTabletLandscape?)` from
`tests/unit/composables/fake-viewport-width.ts`, which never touches `matchMedia`:

- `cross(below)` moves the window to that side of the width and tells every subscriber, as the
  browser's media-query `change` event does;
- `setWithoutNotifying(below)` moves it without telling anyone, to prove a phrase takes the width
  read when it is generated rather than the last crossing reported;
- `listenerCount()` shows whether the session still listens, for the dispose checks.

Every `createGenerationSession` and `composeWorkspaceSession` call in a unit test passes one as
`viewport`. The Playwright harness uses the real provider instead (see above).

## Determinism

- **Same seed, same result.** Generation is a pure function of its intent, seed included. A test
  that needs a known phrase fixes the seed: `queueSeeds` in the workspace harness, the `seed`
  parameter in the notation harness, `makeSeed(n)` in a unit test.
  `tests/e2e/release/deterministic-replay.spec.ts` checks it end to end: seed 4242 generated twice,
  across a page reload, gives the same timeline, and seed 4243 gives a different one.
- **Injected clock.** Code never reads the time directly. It takes it from an injected clock that a
  test can replace, so a timing rule is tested by advancing the fake clock, not by waiting.
- **No test-only branches.** Production code carries no `if (test)` path. A test replaces a
  dependency through a seam that production code already exposes: `composeWorkspaceSession`'s
  providers, `viewport` width provider and `generate` function, the `WORKSPACE_SESSION_FACTORY` injection point, a fake
  `GenerationWorkerPort`, or a Vite alias in a harness build config.

- **Joins are property-tested over the seed matrix.** `carry-in-join-matrix.spec.ts` chains six
  phrases for every instrument profile, register choice, four control sets and two seeds: phrase 1
  without carry-in, each later phrase with the carry-in of the one before, each with its own seed.
  Every join is re-validated, re-generated from its own request and seed, and checked to settle
  any leap recovery or tense note the phrase before left owing. The matrix must make every join
  and must contain both kinds of debt, so a change that stops phrases from ending owing, or stops
  the next phrase from settling it, fails there.

## Fixture list

Every fixture that exists today. A chunk that adds a fixture adds a row here, with where it lives
and what it holds.

### Notation harness fixtures

All in `tests/e2e/notation-harness/fixtures.ts`, selected by the `fixture` URL parameter through
`resolveFixture`, which throws on an unknown name.

| Name                      | What it holds                                                                                                                            | Used by                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `dense`                   | Hand-built C major phrase: a full sixteenth-note grid with accidentals and a chord change in the middle of every bar. The widest case.   | `notation-elements`, `notation-engraving`, `notation-layout`, `notation-visual` specs |
| `denseTie`                | `dense` with a tie across the bar 2 to bar 3 barline, which the two-system layout splits across lines.                                   | `notation-layout.spec.ts`                                                             |
| `simple`                  | Hand-built phrase: whole, half and quarter notes, rests, ties across a barline, a dotted value and a beam group.                         | `notation-engraving`, `notation-flags`, `notation-layout`, `notation-visual` specs    |
| `sharps6`                 | F-sharp major key signature (six sharps).                                                                                                | `notation-engraving.spec.ts`                                                          |
| `flats5`                  | D-flat major key signature (five flats).                                                                                                 | `notation-engraving.spec.ts`                                                          |
| `testProfilePlus2Plus1`   | Whole-note tonic phrase, written C Ionian, run through `transformToWrittenPhrase` for a made-up transposition (+2 semitones, +1 letter). | `notation-key-signature-spelling.spec.ts`                                             |
| `testProfilePlus21Plus12` | The same for a second made-up transposition (+21 semitones, +12 letters).                                                                | `notation-key-signature-spelling.spec.ts`                                             |
| `writtenSharpSideBbTenor` | Written F-sharp Ionian on the B-flat tenor: must engrave with six sharps, although the concert key (E) would spell differently.          | `notation-key-signature-spelling.spec.ts`                                             |
| `writtenFlatSideEbAlto`   | Written C-sharp major on the E-flat alto: must engrave as D-flat major (five flats), the spelling with fewer accidentals.                | `notation-key-signature-spelling.spec.ts`                                             |

### Visual baselines

`tests/e2e/notation/notation-visual.spec.ts-snapshots/` holds four Chromium-on-Linux PNGs of the
engraved staff: `concert`, `bflat-tenor` and `eflat-alto` (generated source, seeds 21, 22 and 23 at
1200 px, one system position each) and `two-system-phone-staff-frame` (the whole `staff-frame` for
`simple` at 700 px in a 740 × 360 viewport, split over two systems at idle). They are rewritten
with `npx playwright test tests/e2e/notation/notation-visual.spec.ts --update-snapshots`, and must
then pass again unchanged. Font rendering differs between machines and container images, so
baselines are recorded on the same setup that checks them. The current four were recorded in the
cloud container on 2026-09-29, when chunk 3 changed the layout; they need recording again on the
owner's machine.

### Unit fixtures, goldens and manifests

| Name                                | Path                                                                            | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Used by                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace session result            | `tests/unit/workspace-test-fixtures.ts`                                         | `CHEAP_CONTROLS` (the defaults with cheap rhythm and harmony settings) and `buildWorkspaceSessionResult(requestId, seed)`, which runs one real, cheap generation.                                                                                                                                                                                                                                                                                                                                                                     | `ScorePanel`, `WorkspaceHeader`, `use-notation-coordinator` specs; `test-workspace.ts`                                                                                |
| Test workspace                      | `tests/unit/components/workspace/test-workspace.ts`                             | `createTestWorkspace(generate?)`: the real session and notation coordinator without a Worker, with a fake window width at or above `bp-tablet-landscape`; `useCheapControls`; `PHRASE_SCORE_STUB`, a `PhraseScore` that renders only its slot and has the same events.                                                                                                                                                                                                                                                                | `ScorePanel`, `WorkspaceShell` specs                                                                                                                                  |
| Fake window width                   | `tests/unit/composables/fake-viewport-width.ts`                                 | `createFakeViewportWidth(initiallyBelowTabletLandscape?)`: a `ViewportWidthProvider` a test moves across `bp-tablet-landscape` by hand (see [Fake window width](#fake-window-width)).                                                                                                                                                                                                                                                                                                                                                 | every spec that builds a session; `generation-session-note-density.spec.ts`, `create-workspace-session.spec.ts`                                                       |
| Fake Worker port                    | `tests/unit/generation-worker/fake-generation-worker-port.ts`                   | `createFakeGenerationWorkerPort`: an in-memory `GenerationWorkerPort` that structured-clones both ways and answers through the real handler, a scripted responder, or not at all.                                                                                                                                                                                                                                                                                                                                                     | `generation-worker-client.spec.ts`                                                                                                                                    |
| Window search fixture               | `tests/unit/domain/generation/orchestration/window-search-fixture.ts`           | `buildWindowSearchFixture(seed)`: a real intent, request, ranked harmony and rhythm candidates and search policy from cheap controls.                                                                                                                                                                                                                                                                                                                                                                                                 | `window-search`, `generation-orchestrator` specs; `generation-orchestrator-fixture.ts`                                                                                |
| Orchestrator fixture                | `tests/unit/domain/generation/orchestration/generation-orchestrator-fixture.ts` | `buildOrchestratorIntent(register, seed)` from cheap controls, and helpers that recompute the ranked domains and one window's outcome independently.                                                                                                                                                                                                                                                                                                                                                                                  | `generation-orchestrator`, `notation-input`, `written-phrase` specs                                                                                                   |
| Generation outcome golden v3        | `tests/unit/domain/generation/orchestration/generation-outcome-golden.v3.ts`    | Eight real intents with the FNV-1a hash of each outcome's JSON: seven successes across densities, profiles and registers, and one `no_legal_rhythm_plan` failure.                                                                                                                                                                                                                                                                                                                                                                     | `generation-outcome-golden.spec.ts` (cold and warm)                                                                                                                   |
| Carry-in fixture                    | `tests/unit/domain/generation/carry-in/carry-in-fixture.ts`                     | `buildIntent` (a real intent from partial controls, a seed and an optional carry-in), `generateSuccess`, `carryInAfter` (the carry-in a real phrase hands forward, through `deriveCarryIn`) and `attackMidis`. Carry-ins are always derived from a real phrase, then reshaped with `makeCarryIn` when a case needs a particular carried pitch or leap state.                                                                                                                                                                          | `carry-in`, `carry-in-join-matrix`, `pitch-carry-in`, `generation-result-validator-join`, `generation-worker-protocol-carry-in`, `tempo-never-generation-input` specs |
| Pitch validation fixtures           | `tests/unit/domain/pitch/validation/validation-fixtures.ts`                     | Builders for rhythm bars from tokens (`q q e e r:q ~:h`), C major chords, a Settled tension requirement, bound figures, a validation context, and a valid 16-note baseline melody with `withMidis` to alter it.                                                                                                                                                                                                                                                                                                                       | `pitch-harmony`, `pitch-policy`, `pitch-phrase-validator`, `figure-rules`, `binding-agreement` specs                                                                  |
| Register tie-key golden v1          | `tests/unit/domain/profile/fixtures/register-tie-key-golden.v1.ts`              | Literal tie-key values for seed `0x1234abcd`, for `c-keyboard` and `bb-tenor` at Low, Middle and High.                                                                                                                                                                                                                                                                                                                                                                                                                                | `register-tie-key.spec.ts`                                                                                                                                            |
| Named stream golden v1              | `tests/unit/domain/random/fixtures/named-stream-golden.v1.ts`                   | The first five values of each named random stream (harmony, rhythm, pitch, register-resolution, tie-breaking) for seed `0x1234abcd`.                                                                                                                                                                                                                                                                                                                                                                                                  | `named-stream-golden.spec.ts`                                                                                                                                         |
| Rhythm manifest v2                  | `tests/unit/domain/rhythm/fixtures/rhythm-mvp-v2-manifest.json`                 | For each of the 324 rhythm settings (density, variety, silence, syncopation, tension arc): the candidate count and SHA-256 of the candidate identities, or the failure codes.                                                                                                                                                                                                                                                                                                                                                         | `rhythm-planner.spec.ts`                                                                                                                                              |
| Rhythm manifest v1, Quarter, sorted | `tests/unit/domain/rhythm/fixtures/rhythm-mvp-v1-quarter-sorted-manifest.json`  | The 36 Quarter settings of the previous grammar, hashed over sorted identities, to prove the Quarter candidate sets did not change.                                                                                                                                                                                                                                                                                                                                                                                                   | `rhythm-planner.spec.ts`                                                                                                                                              |
| Rhythm manifest v1                  | `tests/unit/domain/rhythm/fixtures/rhythm-mvp-v1-manifest.json`                 | The 144 settings of the previous grammar, including the retired Mixed density.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | No test reads it today.                                                                                                                                               |
| Rhythm prefilter oracle             | `tests/unit/domain/rhythm/rhythm-prefilter-oracle.ts`                           | An unpruned enumeration of raw rhythm candidates, to prove the planner's early pruning never drops a valid candidate.                                                                                                                                                                                                                                                                                                                                                                                                                 | `rhythm-prefilter-soundness-{quarter,eighth,sixteenth}` specs                                                                                                         |
| MusicXML sessions                   | `tests/unit/export/musicxml/musicxml-session-fixtures.ts`                       | Hand-built sessions run through the real `transformToWrittenPhrase`: `cKeyboardSession`, `bbTenorTempoChangeSession` (90 then 120 BPM), `ebAltoKeyChangeSession` (written A then D major), `cKeyboardPlainSession(tempos)` and `plainPhraseFor(instrument)`. The "rich" phrase has eighths, beamed sixteenths, a displayed sharp, a rest, ties, a triad of each quality and two two-chord measures.                                                                                                                                   | `musicxml-encoder`, `musicxml-golden`, `musicxml-schema` specs                                                                                                        |
| Acknowledgement fixture set         | `tests/unit/domain/acknowledgement/acknowledgement-fixtures.ts`                 | `phraseFromBars(bars, pitches?)`, which builds a concert timeline from duration tokens (`q q e e r:q ~:h`: `r:` a rest, `~:` a tie continuation); `acknowledgementFixtureSet()`: eight hand-built phrases (quarters, whole notes, short notes before rests, long ties across barlines, a sixteenth grid, the same with a barline tie, dotted rhythms, repeated-pitch eighths) and twelve cheap generated phrases (every note density, straight and offbeat, seeds 1 and 2); `ACKNOWLEDGEMENT_TEMPOS`, every tempo from 60 to 240 BPM. | every `tests/unit/domain/acknowledgement/` spec                                                                                                                       |

The goldens hold literal values, never values recomputed by the code under test. They change only in
a deliberate, reviewed step that bumps the version in their name.

### MusicXML fixtures

`tests/fixtures/musicxml/` holds the MusicXML export's golden files and the schema that validates
them. See [`docs/export.md`](export.md) for what the encoder writes.

| Path (under `tests/fixtures/musicxml/`)       | What it holds                                                                                                                                                          | Used by                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `golden/c-keyboard.v1.musicxml`               | `cKeyboardSession`: two phrases at 90 BPM, written C major, no `<transpose>`, two-chord measures.                                                                      | `musicxml-golden`, `musicxml-schema` specs |
| `golden/bb-tenor-tempo-change.v1.musicxml`    | `bbTenorTempoChangeSession`: two phrases, written D major, `<transpose>` down a major ninth, metronome marks at 90 and 120 BPM.                                        | `musicxml-golden`, `musicxml-schema` specs |
| `golden/eb-alto-key-change.v1.musicxml`       | `ebAltoKeyChangeSession`: two phrases at 120 BPM, `<transpose>` down a major sixth, written A major then D major.                                                      | `musicxml-golden`, `musicxml-schema` specs |
| `schema/musicxml.xsd`, `xlink.xsd`, `xml.xsd` | The MusicXML 4.0 W3C XML Schema and the two schemas it imports, unmodified, from the `v4.0` tag of the W3C MusicXML repository (licence in `THIRD_PARTY_LICENSES.md`). | `musicxml-schema.spec.ts`                  |
| `schema/catalog.xml`                          | An XML catalog mapping the schema's import locations to the local copies, so `xmllint --nonet` validates without a network (`XML_CATALOG_FILES` points at it).         | `musicxml-schema.spec.ts`                  |

The golden files hold the exact bytes the encoder must produce, reviewed by hand against the
export rules when they were written. Like the other goldens, they change only in a deliberate,
reviewed step that bumps the version in their name.

To validate a file by hand:

```sh
XML_CATALOG_FILES=tests/fixtures/musicxml/schema/catalog.xml \
  xmllint --noout --nonet --schema tests/fixtures/musicxml/schema/musicxml.xsd <file>
```

### Browser boundary fixtures

`tests/fixtures/boundaries/src/` is laid out like `src/` but sits outside it, so the real lint run
and boundary scan never see it. Each file makes one browser call. The two boundary checks read
the tree as if it were `src/`:

- `tests/unit/boundaries/verify-boundaries.spec.ts` runs `scanSourceBoundaries` from
  `scripts/verify-boundaries.mjs` with this directory as its root;
- `tests/unit/boundaries/eslint-boundaries.spec.ts` lints each file through the ESLint Node API
  with the real `eslint.config.js`, as if it sat at `src/<same path>`.

| Path (under `tests/fixtures/boundaries/src/`)     | What it holds                                                                   | Expected                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| `audio/audio-context.ts`                          | `new AudioContext()`, `new OfflineAudioContext(…)`, `window.webkitAudioContext` | Allowed                             |
| `midi/audio-context.ts`, `other/audio-context.ts` | The same three audio contexts                                                   | Rejected by both checks             |
| `midi/midi-access.ts`                             | `navigator.requestMIDIAccess()`                                                 | Allowed                             |
| `audio/midi-access.ts`, `other/midi-access.ts`    | The same MIDI request                                                           | Rejected by both checks             |
| `audio/network.ts`, `midi/network.ts`             | A `fetch` POST to another origin                                                | Rejected, even in these directories |
| `audio/microphone.ts`, `midi/microphone.ts`       | `navigator.mediaDevices.getUserMedia({ audio: true })`                          | Rejected, even in these directories |
| `audio/storage.ts`, `midi/storage.ts`             | `localStorage.setItem(…)`                                                       | Rejected, even in these directories |

The fixture files carry no ATD tags; the tests that read them do.
