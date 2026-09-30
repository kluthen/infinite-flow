# Testing

This document records how Infinite Flow is tested: the test layers and where a new test goes, the
npm scripts that run them, the two browser harnesses and the seams a test drives them through, the
rules that keep every run deterministic, and the list of test fixtures. Each chunk of work that adds
a layer, a script, a harness seam, a fake or a fixture updates this document in the same change.

## Test layers

| Layer         | Where                                                                                                                | Runner and config                                                                 | What it is for                                                                                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit          | `tests/unit/**/*.spec.ts`, mirroring `src/`                                                                          | Vitest, `vitest.config.ts` (jsdom environment for every spec)                     | Pure logic and component contracts: domain rules, generation, the session state machine, the Worker protocol and client, Vue components through Vue Test Utils, property-based checks and the golden fixtures.                                                                   |
| End-to-end    | `tests/e2e/startup.spec.ts`, `tests/e2e/workspace/`, `tests/e2e/release/`, `tests/e2e/audio/`                        | Playwright, `playwright.config.ts`, Chromium only                                 | Player-facing journeys in a real browser. `workspace/` drives the production preview build; most of `release/` drives the workspace harness for states that only its seams can force; `audio/` drives the harness's audio transport, on the fake audio clock or on the real one. |
| Accessibility | `tests/e2e/accessibility.spec.ts`                                                                                    | Playwright with `@axe-core/playwright`                                            | An axe scan of each covered UI state, on the production preview and, for the in-flight and failure states, on the workspace harness.                                                                                                                                             |
| Notation      | `tests/e2e/notation/`                                                                                                | Playwright against the notation harness                                           | Engraving, layout, calibration, key-signature spelling, note identity and score overlays of one phrase in a container of a given width, plus pixel baselines (see [Visual baselines](#visual-baselines)).                                                                        |
| Measurement   | `tests/perf/`, `tests/e2e/workspace/generation-latency.spec.ts`, `tests/e2e/workspace/engraving-main-thread.spec.ts` | Vitest with `vitest.perf.config.ts` (node environment, 60 s timeouts); Playwright | Timing reports, not pass/fail checks on the numbers. They run only when called by name and never inside `npm run quality`.                                                                                                                                                       |

### Where a new test goes

- **Pure logic** (no DOM, no browser API) gets a Vitest spec under `tests/unit/`, at the path that
  mirrors its source file: `src/domain/rhythm/syncopation.ts` is tested by
  `tests/unit/domain/rhythm/syncopation.spec.ts`. A component or composable spec goes under
  `tests/unit/components/` or `tests/unit/composables/` the same way. A session engine or runner
  spec goes under `tests/unit/session/`, next to `session-harness.ts` (see
  [The session driver](#the-session-driver)).
- **Behaviour on screen** gets a Playwright spec. Use the production preview (`tests/e2e/workspace/`)
  when the real app can reach the state on its own, and the workspace harness (`tests/e2e/release/`
  today) when the test needs a fixed seed, a held generation or a forced failure.
- **Audio timing** gets a Playwright spec under `tests/e2e/audio/`, on the workspace harness's fake
  audio clock when the test checks exact times, and on its real audio clock (`?audio=real`) when
  it checks what the browser's own `AudioContext` does.
- **Engraving and layout** of one phrase gets a spec under `tests/e2e/notation/`, driven through
  the notation harness.
- **A timing measurement** gets its own spec and its own `measure:*` script, and stays out of
  `test:e2e`.

### The `test:e2e` file list

`test:e2e` names its specs one by one: `tests/e2e/startup.spec.ts`, eight files in
`tests/e2e/workspace/`, the three audio transport specs in `tests/e2e/audio/`
(`audio-transport.spec.ts`, `audio-transport-mix.spec.ts` and `audio-transport-real.spec.ts`), and
the whole `tests/e2e/release/` directory. A new Playwright spec outside
`tests/e2e/notation/` (which `test:notation` runs as a directory) and outside `tests/e2e/release/`
must be added to that list in `package.json`, or it never runs in `npm run quality`. Measurement
specs are left out on purpose. `accessibility.spec.ts` is not in the list either: `test:a11y` runs
it.

## Scripts

| Script                    | Command                                                             | What it does                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test:unit`               | `vitest run`                                                        | Every `tests/unit/**/*.spec.ts` in jsdom.                                                                                                                                                                                                                                                                                               |
| `test:e2e`                | `playwright test` with the explicit file list above                 | Startup, workspace, audio transport and release journeys.                                                                                                                                                                                                                                                                               |
| `test:a11y`               | `playwright test tests/e2e/accessibility.spec.ts`                   | The axe scans.                                                                                                                                                                                                                                                                                                                          |
| `test:notation`           | `playwright test tests/e2e/notation`                                | Every notation spec, including the visual baselines.                                                                                                                                                                                                                                                                                    |
| `measure:latency`         | `vitest run --config vitest.perf.config.ts`                         | `tests/perf/generation-latency.perf.ts`: a cold then a warm `generatePhrase` call in Node for every combination of note density, rhythmic variety, silence density, syncopation and tension arc. Writes full JSON to `LATENCY_OUT` when set.                                                                                            |
| `measure:latency:browser` | `playwright test tests/e2e/workspace/generation-latency.spec.ts`    | Cold and warm click-to-"Phrase ready" time in Chromium on the production preview, for the worst-case and default settings, and the theme control's response time during the worst-case cold run. `LATENCY_PREWARM` picks the pre-warm mode: `off`, `on` (the default) or `settled`. Writes full JSON to `LATENCY_BROWSER_OUT` when set. |
| `measure:engraving`       | `playwright test tests/e2e/workspace/engraving-main-thread.spec.ts` | The longest main-thread task while a phrase is engraved in Chromium.                                                                                                                                                                                                                                                                    |
| `verify:boundaries`       | `node scripts/verify-boundaries.mjs`                                | Rejects forbidden browser APIs in `src/`, checks the PWA precache and the per-chunk size budgets. Needs a fresh `dist/`.                                                                                                                                                                                                                |
| `format:check`            | `prettier --check` over the authored files                          | Formatting. `docs/` is checked only under `docs/release/`.                                                                                                                                                                                                                                                                              |
| `lint`                    | `eslint .`                                                          | ESLint, including the forbidden-API rules.                                                                                                                                                                                                                                                                                              |
| `lint:links`              | `remark . --quiet --frail --no-stdout --ext md`                     | Every relative Markdown link and `#heading` anchor, offline.                                                                                                                                                                                                                                                                            |
| `atd:lint`                | `atd lint`                                                          | Structure of the `docs/*.atom.md` atoms.                                                                                                                                                                                                                                                                                                |
| `atd:check`               | `atd check`                                                         | `@spec-link` and `@test-link` coverage.                                                                                                                                                                                                                                                                                                 |
| `quality`                 | the gates below, in order                                           | The whole gate.                                                                                                                                                                                                                                                                                                                         |

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
`tests/e2e/workspace-harness/vexflow-engraver-loader-seam.ts`, the audio seams
`tests/e2e/workspace-harness/audio-seams.ts`, the typed API
`tests/e2e/workspace-harness-window.d.ts`, and the build config `vite.workspace-harness.config.ts`.
It is served on port 4175 and has no PWA plugin and no service worker.

**What is real.** The harness mounts the production `App.vue` tree with the production styles. Its
workspace session is built by `composeWorkspaceSession` and handed to `App.vue` through the
`WORKSPACE_SESSION_FACTORY` provide/inject point. Generation runs in the real Worker through the
real client, and notation is engraved by the real VexFlow adapter. The audio transport is the real
`createAudioTransport`, on the fake audio clock and output by default or on the real Web Audio
output with `?audio=real` (see [Audio modes](#audio-modes)). Only randomness, timing and fault
injection are replaced. Nothing in `src/` knows the harness exists: the seams are injected
dependencies, plus one Vite alias.

**Seams.** `main.ts` publishes them on `window.__workspaceHarness`:

| Seam                     | Signature                                               | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queueSeeds`             | `(seeds: readonly number[]) => void`                    | Appends seeds to a queue. Each new generation draws the next queued seed. When the queue is empty the seed comes from a counter (1, 2, 3 …) instead of `crypto`.                                                                                                                                                                                                                                                                                                                                                                                     |
| `holdGeneration`         | `() => void`                                            | Every later `generate` call waits at a gate before it reaches the Worker. Holding an already held gate does nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `releaseGeneration`      | `() => void`                                            | Opens the gate; every waiting call carries on.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `failNextGeneration`     | `(code: WorkspaceHarnessGenerationFailureCode) => void` | The next `generate` call, once past the gate, returns a `generation_failure` with that code and empty diagnostics instead of calling the Worker. One shot. The codes: `no_legal_harmony_plan`, `no_legal_rhythm_plan`, `no_legal_pitch_plan`, `no_eligible_register_window`, `search_limit_exceeded`, `result_validation_failed`.                                                                                                                                                                                                                    |
| `failNextNotation`       | `() => void`                                            | The next call to `engraveWrittenPhrase` throws a `NotationError` with code `notation_engraving_failed`. One shot. It arms the engraver loader seam below.                                                                                                                                                                                                                                                                                                                                                                                            |
| `audio.mode`             | `() => 'fake' \| 'real'`                                | The audio mode the page was loaded in (see [Audio modes](#audio-modes)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `audio.armStart`         | `({ tempo }) => void`                                   | Sets the tempo the next click on the "Start audio (harness)" button starts at. One shot: a click with nothing armed throws.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `audio.timeline`         | `() => { startAt, countInEndsAt } \| null`              | The latest session's timeline on the audio clock: the count-in's first click and the moment phrase 1 starts. `null` before the first Start audio click.                                                                                                                                                                                                                                                                                                                                                                                              |
| `audio.isUnlocked`       | `() => boolean`                                         | Whether the audio output has been opened, which only the Start audio click does.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `audio.isRunning`        | `() => boolean`                                         | Whether a session is running.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `audio.now`              | `() => number`                                          | The audio clock's time, in seconds. Throws before the first Start audio click.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `audio.advance`          | `(seconds: number) => void`                             | Moves the fake audio clock forward in 25 ms wake-up steps, planning sound at each step. Fake mode only; throws with `?audio=real`.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `audio.events`           | `() => WorkspaceHarnessAudioEvent[]`                    | Every call the transport made on its audio output, in order: `click`, `gain`, `fade` and `open-bus` events, each with `scheduledAt`, the audio clock's time at the call. The same shape in both modes.                                                                                                                                                                                                                                                                                                                                               |
| `audio.audibleClicks`    | `() => WorkspaceHarnessAudibleClick[]`                  | The recorded clicks that sound, with the click-volume gain they sound at, read from `events` by the same function in both modes.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `audio.setClickOn`       | `(on: boolean) => void`                                 | The click on/off switch, passed to the transport.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `audio.setClickVolume`   | `(level: number) => void`                               | The click volume, passed to the transport. A level outside the design range throws.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `audio.setBackingOn`     | `(on: boolean) => void`                                 | The backing on/off switch, passed to the transport.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `audio.setBackingVolume` | `(level: number) => void`                               | The backing volume, passed to the transport. A level outside the design range throws.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `audio.stop`             | `() => { fadeEndsAt }`                                  | Fades the running session out over 0.1 s from now. Throws if none is running.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `audio.mixDesign`        | `() => WorkspaceHarnessMixDesign`                       | The mix's first-load levels and volume range, read from the `--mix-*` design tokens, so a spec can use the lowest click volume.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `prewarmCount`           | `() => number`                                          | How many rhythm-domain pre-warms the workspace has posted since the page loaded. The harness reads the prewarm policy from its URL exactly as `App.vue` does, so with `?prewarm=off` it stays 0; otherwise every pre-warm is counted, then forwarded unchanged to the real worker client.                                                                                                                                                                                                                                                            |
| `snapshot`               | `() => WorkspaceHarnessSnapshot`                        | The session's current state: `operation`, `instrumentProfileId`, `writtenTonalCenter`, `concertTonalCenter`, `requestId`, `seed`, `timeline` (the latest result's concert timeline as a JSON string), `chosenNoteDensity` (the density the player chose, kept whatever the window's width) and `generatedNoteDensity` (the density the latest result was generated with: `Eighth` for a chosen `Sixteenth` below `bp-tablet-landscape`). Fields read from the result are `null` before the first result. Throws if called before the session mounts. |

Request ids are also deterministic: `workspace-harness-request-1`, `-2`, and so on, per page load.
A pre-warm draws neither a seed nor a request id (it carries the fixed seed 0 and the id
`workspace-prewarm`), so a queued seed goes to the generation it was queued for with pre-warm on or
off. `tests/e2e/release/prewarm-policy.spec.ts` checks the policy on the real Worker: one pre-warm
at start and one per rhythm-setting change, none for other edits, none with `?prewarm=off`, and a
phrase still generates with its queued seed either way. The production specs can load the page
with a query string too: `gotoWorkspace(page, search?)` in `tests/e2e/workspace/helpers.ts` (for
example `gotoWorkspace(page, '?prewarm=off')`, which the browser latency spec uses in its `off`
mode).

### Audio modes

The URL chooses where the harness's audio transport runs. Any other `audio` value throws.

- **Fake** (the default, or `?audio=fake`): the transport runs on `createFakeAudioRig()` (see
  [Fake audio clock and output](#fake-audio-clock-and-output)). Its clock starts at 0 and moves
  only when a spec calls `audio.advance`, so every time is exact and a run repeats exactly. No
  `AudioContext` is ever created.
- **Real** (`?audio=real`): the transport runs on the production seams, `openWebAudioOutput` and the
  wake-up Worker timer, with the output wrapped by the same recorder the fake uses. The first Start
  audio click creates the page's one `AudioContext`, and time is the real audio clock. Headless
  Chromium runs it with no launch flag: the Playwright click is a real user activation, so the
  context runs and `currentTime` advances.

**The Start audio button.** `index.html` holds, outside `#app`, a "Start audio (harness)" button in
an `aside` landmark. The App has no Start button yet, so this one stands in for it: its click
handler calls `unlock()` and then `start({ tempo })` synchronously, as the App's Start click will.
A spec arms the tempo with `audio.armStart`, then clicks it with `page.click`, which the browser
counts as a player's click.

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
`failNextNotation`, `harnessSnapshot`); `tests/e2e/audio/audio-harness-helpers.ts` wraps the audio
seams (`gotoAudioHarness(page, mode?)`, `startAudio`, which arms the tempo and clicks Start audio,
`advanceAudio`, `advanceAudioTo`, `audioNow`, `audioEvents`, `scheduledClicks`, `audibleClicks`,
the mix setters, `stopAudio` and `mixDesign`) and holds `installAudioSpy`, which counts every
`AudioContext` construction, `suspend` and `close`; and `tests/e2e/workspace/helpers.ts` supplies the page
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

A new seam is added to `main.ts` (or a module it wires, like `audio-seams.ts`), typed in
`workspace-harness-window.d.ts`, wrapped in `harness-helpers.ts` (or, for the audio seams,
`audio-harness-helpers.ts`), and listed in the table above.

## The notation harness

**Files.** `tests/e2e/notation-harness/index.html`, `main.ts` and `fixtures.ts`, the typed state
`tests/e2e/notation-harness-window.d.ts`, and the build config `vite.notation-harness.config.ts`. It
is served on port 4174; every notation spec sets `test.use({ baseURL: 'http://127.0.0.1:4174' })`.
It mounts `PhraseScore` without the app shell, inside a real `staff-frame` in the `#app` container,
with the app's own stylesheet (Tailwind runs in the harness build), because the notation layout
reads its height budget from `staff-frame`'s computed `max-block-size`.

**URL parameters.** A missing required parameter throws; only the optional ones below have defaults.

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
- `phrase` (optional, default 1): the phrase number `PhraseScore` engraves the phrase as, which
  every note identity on the score carries. The default is phrase 1, the phrase a session starts
  with.
- `theme` (optional): `light` or `dark` sets the page root's `data-theme` as the app's theme control
  does; absent, the page follows the system colour scheme. Any other value throws.

**Published state.** `window.__notationHarness` follows `PhraseScore`'s lifecycle:

- `{ state: 'pending' }` until the first engraving settles;
- `{ state: 'ready', engraved: { staffSpacePx, widthPx, heightPx, requiredUnits, systemCount,
positionBlockPx } }`, where `positionBlockPx` is the height of one reserved system position;
- `{ state: 'error', errorCode, errorDetails }`, for example `notation_no_room` (the window has no
  room for the staff) or `notation_notes_too_wide` (this phrase's notes don't fit).

Every state also carries `engraveCount`, the number of successful engravings since the page loaded,
so a spec can prove that something (a browser toolbar showing or hiding) caused no redraw. A spec
that resets the state to `pending` drops it until the next publish.

Every ready state also carries the note identities and the overlay seam:

| Seam              | Signature                                                                                     | Behaviour                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `glyphIdentities` | `(NotationHarnessNoteIdentity \| null)[][]`                                                   | Every glyph's note identity, measure by measure in written-event order, for the page's phrase number: an attack's own identity, the identity of the attack it continues for a tie continuation, `null` for a rest. Computed by the production `resolveGlyphIdentities`.                                                                    |
| `glyphFacts`      | `NotationHarnessGlyphFact[][]`                                                                | Every glyph's written facts, in the same shape: `kind`, `value`, `dots`, `accidental`, `beamed`, `tieFromPrevious`. They decide which tagged parts its engraving must carry, and let a spec pick a note by kind (a beamed note with an accidental, an unbeamed flagged note, a note tied across a barline).                                |
| `setOverlays`     | `(overlays: NotationHarnessOverlays) => Promise<void>`                                        | Sets `PhraseScore`'s `overlays` prop: `startMarker` and `acknowledged` by note identity, `playheadMeasure` by measure index, never a pitch. Resolves once the state is drawn (after Vue's update and the next frame); rejects with the `ScoreOverlayError` the overlay step threw when the state names a note or measure the phrase lacks. |
| `swapPhrase`      | `(fixture: string, phraseNumber: number, overlays: NotationHarnessOverlays) => Promise<void>` | Sets a new fixture phrase, its phrase number and an overlay state naming it, all in one tick, as a session does when it moves on. Resolves after the next engraving has drawn the state; rejects with the overlay or notation error.                                                                                                       |

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

**The overlay specs.** `tests/e2e/notation/overlay-harness.ts` holds the shared steps: `openHarness`
(set the viewport, open a query, wait for `ready`), `setOverlays` (returns the rejection's error
name, or `null` when the state drew), `keyOf` (an identity as the score writes it), `findIdentity`
(the first attack whose written facts match), the desktop (1280 × 800) and phone (740 × 360)
viewports, and `NONE`, the empty state.

| Spec                                    | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notation-note-identity.spec.ts`        | Every note glyph's notehead, stem, flag, accidental and dot are `<g>` groups carrying its attack's `data-note-id` and a `data-note-part`; rests, ledger lines, beams, ties and chord symbols carry none; an attack's chord symbol names it in `data-chord-for`; every measure slot records its band rectangle, one height per system. On `simple` in both layouts, on `denseTie` with its tie across the system break, and with `phrase=3`.                                                                                                                                                              |
| `notation-overlays.spec.ts`             | Acknowledging a note adds `note-ack` to its own tagged parts only, in every system, with nothing else in the markup changed and nothing moved, lit in the acknowledgement colour while beams, ties and chord symbols keep the staff ink and ledger lines keep theirs; the band is one rectangle drawn first in its system, stepping across measures and both systems; an identity outside the phrase's attacks (a rest, a wrong phrase number, an out-of-range index, a tie continuation's own index) is rejected with the score unchanged; a re-engrave keeps every overlay; the six overlay baselines. |
| `notation-overlays-marker.spec.ts`      | The start marker on drawn pixels, not SVG boxes: 1.2 × 1 staff spaces, centred on the notehead, inside the top system position, half a space over the note's own ink (ledger lines and beam included) and the staff, clear of its chord symbol, which never moves. Over the first attack of `simple` and of 24 generated phrases across every profile and register; and, with the drawn chord symbol raised 3 and 0.5 spaces, both sides of the 2-space rule.                                                                                                                                            |
| `notation-overlays-phrase-swap.spec.ts` | A phrase change and an overlay state naming the new phrase, set in the same tick, draw on the new score once it is engraved, never on the one still shown.                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Fakes still to come

Web MIDI access has no fake yet. Chunk 12 adds a fake MIDI access that plugs, unplugs and plays
notes on command. It goes into the workspace harness as a new seam and is documented in its table
above.

## Fake audio clock and output

The audio transport takes its audio output and its wake-up timer through injected seams
(`src/audio/audio-ports.ts`). Unit tests replace both with `createFakeAudioRig(options?)` from
`tests/unit/audio/fake-audio.ts`, which never touches Web Audio or a Worker and imports no Node
module, so the workspace harness reuses it:

- **The clock** starts at `startTime` (0 by default) and moves only on `advance(seconds)` or
  `advanceTo(t)`. It steps on the grid `startTime + k * 0.025` and wakes the fake timer after
  every 25 ms step, as the Worker timer would, so the look-ahead scheduler plans sound exactly as
  it does in the browser, and long runs do not drift.
- **The output** records every call as a `FakeAudioEvent`: `click` (bus, time, accent, route),
  `gain` (gain stage, value, time), `fade` (bus, time, duration) and `open-bus`, each stamped with
  `scheduledAt`, the clock's time at the call. `events()` returns them in order and `clicks()` the
  clicks alone.
- **What is heard.** `audibleClicks()` returns the clicks that sound, with the click-volume gain
  they sound at: the volume is above zero, the click is enabled or on the count-in route, and its
  bus has not started fading. `gainAt(gain, t)` reads one gain at a time.
- **Shared with the real output.** `recordAudioOutput(output)` is the recorder the rig itself uses,
  and `audibleClicksOf(events)` is the reading behind `audibleClicks()`. The harness's
  `?audio=real` mode wraps the real Web Audio output with the same recorder, so both modes give the
  same event shape and the same audible-click reading.

A unit test builds a transport on a rig (`tests/unit/audio/transport-rig.ts` does it, reading the
mix design from the real stylesheet) and drives the clock by hand. From
`tests/unit/audio/audio-transport.spec.ts`:

```ts
const { rig, transport } = transportRig()
transport.unlock()
const timeline = transport.start({ tempo: 120 })
rig.advanceTo(beat(timeline.startAt, 35.5))
const audible = rig.audibleClicks()
expect(audible).toHaveLength(36)
```

A harness test does the same through `window.__workspaceHarness.audio`. Condensed from
`tests/e2e/audio/audio-transport.spec.ts`:

```ts
await gotoAudioHarness(page)
const { startAt } = await startAudio(page) // arms 120 BPM, clicks Start audio
await advanceAudioTo(page, startAt + 35 * BEAT_SECONDS + 0.1)
expect(await audibleClicks(page)).toHaveLength(36)
```

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

## The session driver

`tests/unit/session/session-harness.ts` holds the shared builders of the session engine specs. It
drives the real `createSessionEngine` and replaces only its two seams:

- **Queued seeds.** `queuedProviders(firstSeed?, queueLength?)` hands out seeds `firstSeed`,
  `firstSeed + 1`, ... and request ids `session-1`, `session-2`, ..., records every seed in
  `seedsHandedOut`, and throws once the queue is empty, so a run is deterministic and a test can
  check that each attempt got a fresh seed.
- **Fake viewport.** `fakeViewport(below)` is a window-width reading the test moves by hand
  (`viewport.below = true`); the engine reads it each time it builds a request.
- **Real phrases.** `phraseOneFor(settings, options?)` generates a real phrase 1 at Idle through
  `generatePhrase`, and `successFor(intent)` the real successful outcome of an intent the engine
  requested; both are cached, since generation is pure. `failureOutcome(code?)` is a real
  generation failure outcome. `sessionSettings(overrides?)` builds the chosen settings, and
  `withoutTempo(intent)` drops the tempo for comparing intents built at different tempos.
- **Timed event driving.** `SessionDriver` starts one engine (start time, settings, phrase 1,
  viewport and providers all have defaults) and logs every output it returns. Its methods send one
  timed event each: `countInOver(at)`, `sounding(at, phraseNumber)`, `tick(at)`, `end(at, cause?)`,
  and, for the latest request, `fail(at)`, `crash(at)`, `succeed(at)`, `fit(at, fits)` and
  `accept(at)` (a success that fits). `exhaust(at)` fails every remaining rung of the ladder.
  `all(kind)`, `requests(phraseNumber?)`, `lastRequest()` and `kinds(outputs)` read the log.

## Determinism

- **Same seed, same result.** Generation is a pure function of its intent, seed included. A test
  that needs a known phrase fixes the seed: `queueSeeds` in the workspace harness, the `seed`
  parameter in the notation harness, `makeSeed(n)` in a unit test.
  `tests/e2e/release/deterministic-replay.spec.ts` checks it end to end: seed 4242 generated twice,
  across a page reload, gives the same timeline, and seed 4243 gives a different one.
- **Injected clock.** Code never reads the time directly. It takes it from an injected clock that a
  test can replace, so a timing rule is tested by advancing the fake clock, not by waiting.
- **Timed events, no clock.** The session engine never reads a clock at all: every event carries
  its audio time. Its specs under `tests/unit/session/` drive it with a scripted list of timed
  events through `SessionDriver`, so deadlines, late results and repeats are tested by the times
  written in the test, with no waiting and no fake clock.
- **Tempo only sets the times.** `session-timing.spec.ts` runs the same event script scaled to 60,
  120 and 240 BPM and checks that the request intents are identical once `controls.tempo` is left
  out, with the same phrase numbers, steps and retries.
- **No test-only branches.** Production code carries no `if (test)` path. A test replaces a
  dependency through a seam that production code already exposes: `composeWorkspaceSession`'s
  providers, `viewport` width provider, `generate` function and `audio` transport, the
  `WORKSPACE_SESSION_FACTORY` injection point, a fake `GenerationWorkerPort`, the audio
  transport's `openOutput` and `createWakeTimer`, or a Vite alias in a harness build config.

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

| Name                      | What it holds                                                                                                                            | Used by                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dense`                   | Hand-built C major phrase: a full sixteenth-note grid with accidentals and a chord change in the middle of every bar. The widest case.   | `notation-elements`, `notation-engraving`, `notation-layout`, `notation-visual` specs                                                                         |
| `denseTie`                | `dense` with a tie across the bar 2 to bar 3 barline, which the two-system layout splits across lines.                                   | `notation-layout`, `notation-note-identity`, `notation-overlays` specs                                                                                        |
| `simple`                  | Hand-built phrase: whole, half and quarter notes, rests, ties across a barline, a dotted value and a beam group.                         | `notation-engraving`, `notation-flags`, `notation-layout`, `notation-visual`, `notation-note-identity`, `notation-overlays`, `notation-overlays-marker` specs |
| `sharps6`                 | F-sharp major key signature (six sharps).                                                                                                | `notation-engraving.spec.ts`                                                                                                                                  |
| `flats5`                  | D-flat major key signature (five flats).                                                                                                 | `notation-engraving.spec.ts`                                                                                                                                  |
| `testProfilePlus2Plus1`   | Whole-note tonic phrase, written C Ionian, run through `transformToWrittenPhrase` for a made-up transposition (+2 semitones, +1 letter). | `notation-key-signature-spelling.spec.ts`                                                                                                                     |
| `testProfilePlus21Plus12` | The same for a second made-up transposition (+21 semitones, +12 letters).                                                                | `notation-key-signature-spelling.spec.ts`                                                                                                                     |
| `writtenSharpSideBbTenor` | Written F-sharp Ionian on the B-flat tenor: must engrave with six sharps, although the concert key (E) would spell differently.          | `notation-key-signature-spelling.spec.ts`                                                                                                                     |
| `writtenFlatSideEbAlto`   | Written C-sharp major on the E-flat alto: must engrave as D-flat major (five flats), the spelling with fewer accidentals.                | `notation-key-signature-spelling.spec.ts`                                                                                                                     |

### Visual baselines

`tests/e2e/notation/notation-visual.spec.ts-snapshots/` holds four Chromium-on-Linux PNGs of the
engraved staff: `concert`, `bflat-tenor` and `eflat-alto` (generated source, seeds 21, 22 and 23 at
1200 px, one system position each) and `two-system-phone-staff-frame` (the whole `staff-frame` for
`simple` at 700 px in a 740 × 360 viewport, split over two systems at idle). They are rewritten
with `npx playwright test tests/e2e/notation/notation-visual.spec.ts --update-snapshots`, and must
then pass again unchanged. Font rendering differs between machines and container images, so
baselines are recorded on the same setup that checks them. The current four were recorded in the
cloud container on 2026-09-29, when chunk 3b made the system positions 16 staff spaces tall and
placed the staff in them by instrument profile. On 2026-09-30 all four also passed unchanged on the
owner's machine, so they stand as recorded.

`tests/e2e/notation/notation-overlays.spec.ts-snapshots/` holds six more Chromium-on-Linux PNGs:
three overlay cases, each in a `-light` and a `-dark` variant (the harness's `theme` parameter):

- `start-marker-desktop`: the `staff-content` of `simple` at 1200 px, with the start marker over
  the first attack;
- `band-and-acks-desktop`: the same staff with the band behind measure index 1 and four of its
  notes lit (a dotted note, the flagged eighth, a beamed eighth and the quarter tied over the
  barline, whose continuation lights too);
- `band-and-system-break-tie-phone`: the whole `staff-frame` of `denseTie` at 700 px in a
  740 × 360 viewport, with the band behind measure index 2 on the bottom system and the note tied
  across the system break lit in both systems.

They are rewritten with `npx playwright test tests/e2e/notation/notation-overlays.spec.ts
--update-snapshots`, under the same rules as the four above. Under heavy machine load a visual
baseline has, rarely, failed once with a uniformly lighter staff and then passed unchanged on a
rerun; a mismatch of that kind is worth one rerun on an idle machine before it is investigated.

### Unit fixtures, goldens and manifests

| Name                                | Path                                                                            | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Used by                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace session result            | `tests/unit/workspace-test-fixtures.ts`                                         | `CHEAP_CONTROLS` (the defaults with cheap rhythm and harmony settings) and `buildWorkspaceSessionResult(requestId, seed)`, which runs one real, cheap generation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `ScorePanel`, `WorkspaceHeader`, `use-notation-coordinator` specs; `test-workspace.ts`                                                                                |
| Test workspace                      | `tests/unit/components/workspace/test-workspace.ts`                             | `createTestWorkspace(generate?)`: the real session and notation coordinator without a Worker, with a fake window width at or above `bp-tablet-landscape`; `useCheapControls`; `PHRASE_SCORE_STUB`, a `PhraseScore` that renders only its slot and has the same events.                                                                                                                                                                                                                                                                                                                                                                                                                 | `ScorePanel`, `WorkspaceShell` specs                                                                                                                                  |
| Fake audio rig                      | `tests/unit/audio/fake-audio.ts`                                                | `createFakeAudioRig(options?)`: a hand-advanced audio clock, a wake-up timer stepped by it and a recording audio output, with `events`, `clicks`, `audibleClicks` and `gainAt`; `recordAudioOutput` and `audibleClicksOf`, shared with the harness's real audio mode (see [Fake audio clock and output](#fake-audio-clock-and-output)).                                                                                                                                                                                                                                                                                                                                                | every `tests/unit/audio/` transport spec; `transport-rig.ts`; the workspace harness's `audio-seams.ts`                                                                |
| Fake window width                   | `tests/unit/composables/fake-viewport-width.ts`                                 | `createFakeViewportWidth(initiallyBelowTabletLandscape?)`: a `ViewportWidthProvider` a test moves across `bp-tablet-landscape` by hand (see [Fake window width](#fake-window-width)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | every spec that builds a session; `generation-session-note-density.spec.ts`, `create-workspace-session.spec.ts`                                                       |
| Fake Worker port                    | `tests/unit/generation-worker/fake-generation-worker-port.ts`                   | `createFakeGenerationWorkerPort(respond?, options?)`: an in-memory `GenerationWorkerPort` that structured-clones both ways and answers through a scripted responder, not at all (`null`), or by default the real Worker runtime over the port's own fresh memo. That runtime's pre-warm slices are queued and never run on their own: `pendingSliceCount()` says how many are waiting and `runNextSlice()` runs the oldest (it throws when none is), so a `generate` posted after a pre-warm is served before any slice unless the test runs some first. `options.now` sets the runtime clock (frozen at 0 by default, so one slice finishes a whole job) and `options.memo` the memo. | `generation-worker-client.spec.ts`, `workspace-prewarm.spec.ts`                                                                                                       |
| Window search fixture               | `tests/unit/domain/generation/orchestration/window-search-fixture.ts`           | `buildWindowSearchFixture(seed)`: a real intent, request, ranked harmony and rhythm candidates and search policy from cheap controls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `window-search`, `generation-orchestrator` specs; `generation-orchestrator-fixture.ts`                                                                                |
| Orchestrator fixture                | `tests/unit/domain/generation/orchestration/generation-orchestrator-fixture.ts` | `buildOrchestratorIntent(register, seed)` from cheap controls, and helpers that recompute the ranked domains and one window's outcome independently.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `generation-orchestrator`, `notation-input`, `written-phrase` specs                                                                                                   |
| Generation outcome golden v3        | `tests/unit/domain/generation/orchestration/generation-outcome-golden.v3.ts`    | Eight real intents with the FNV-1a hash of each outcome's JSON: seven successes across densities, profiles and registers, and one `no_legal_rhythm_plan` failure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `generation-outcome-golden.spec.ts` (cold and warm)                                                                                                                   |
| Carry-in fixture                    | `tests/unit/domain/generation/carry-in/carry-in-fixture.ts`                     | `buildIntent` (a real intent from partial controls, a seed and an optional carry-in), `generateSuccess`, `carryInAfter` (the carry-in a real phrase hands forward, through `deriveCarryIn`) and `attackMidis`. Carry-ins are always derived from a real phrase, then reshaped with `makeCarryIn` when a case needs a particular carried pitch or leap state.                                                                                                                                                                                                                                                                                                                           | `carry-in`, `carry-in-join-matrix`, `pitch-carry-in`, `generation-result-validator-join`, `generation-worker-protocol-carry-in`, `tempo-never-generation-input` specs |
| Pitch validation fixtures           | `tests/unit/domain/pitch/validation/validation-fixtures.ts`                     | Builders for rhythm bars from tokens (`q q e e r:q ~:h`), C major chords, a Settled tension requirement, bound figures, a validation context, and a valid 16-note baseline melody with `withMidis` to alter it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `pitch-harmony`, `pitch-policy`, `pitch-phrase-validator`, `figure-rules`, `binding-agreement` specs                                                                  |
| Register tie-key golden v1          | `tests/unit/domain/profile/fixtures/register-tie-key-golden.v1.ts`              | Literal tie-key values for seed `0x1234abcd`, for `c-keyboard` and `bb-tenor` at Low, Middle and High.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `register-tie-key.spec.ts`                                                                                                                                            |
| Named stream golden v1              | `tests/unit/domain/random/fixtures/named-stream-golden.v1.ts`                   | The first five values of each named random stream (harmony, rhythm, pitch, register-resolution, tie-breaking) for seed `0x1234abcd`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `named-stream-golden.spec.ts`                                                                                                                                         |
| Rhythm manifest v2                  | `tests/unit/domain/rhythm/fixtures/rhythm-mvp-v2-manifest.json`                 | For each of the 324 rhythm settings (density, variety, silence, syncopation, tension arc): the candidate count and SHA-256 of the candidate identities, or the failure codes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `rhythm-planner.spec.ts`                                                                                                                                              |
| Rhythm manifest v1, Quarter, sorted | `tests/unit/domain/rhythm/fixtures/rhythm-mvp-v1-quarter-sorted-manifest.json`  | The 36 Quarter settings of the previous grammar, hashed over sorted identities, to prove the Quarter candidate sets did not change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `rhythm-planner.spec.ts`                                                                                                                                              |
| Rhythm manifest v1                  | `tests/unit/domain/rhythm/fixtures/rhythm-mvp-v1-manifest.json`                 | The 144 settings of the previous grammar, including the retired Mixed density.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | No test reads it today.                                                                                                                                               |
| Cold-generation goldens             | `tests/unit/domain/generation/orchestration/cold-generation-golden/`            | Four checked-in JSON goldens and their shared builders (`cold-generation-golden-fixture.ts`); see [Cold-generation goldens](#cold-generation-goldens).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | the `catalog-*`, `carry-in-chains`, `non-rhythm-controls`, `memo-ranking` specs beside them; `rhythm-domain-prewarm`, `generation-worker-runtime-golden` specs        |
| Rhythm expansion fixture            | `tests/unit/domain/rhythm/rhythm-expansion-fixture.ts`                          | Real pre-syncopation phrases: every (gesture, answer list) of a setting over a sample of its gestures, with the answer stage applied through the unmemoized `applyTransformSet`, in the planner's own order. (A gesture is the rhythmic idea of measures 1-2 that measures 3-4 answer.)                                                                                                                                                                                                                                                                                                                                                                                                | `rhythm-expansion-memo`, `syncopation-templates` specs                                                                                                                |
| Rhythm prefilter oracle             | `tests/unit/domain/rhythm/rhythm-prefilter-oracle.ts`                           | An unpruned enumeration of raw rhythm candidates, to prove the planner's early pruning never drops a valid candidate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `rhythm-prefilter-soundness-{quarter,eighth,sixteenth}` specs                                                                                                         |
| MusicXML sessions                   | `tests/unit/export/musicxml/musicxml-session-fixtures.ts`                       | Hand-built sessions run through the real `transformToWrittenPhrase`: `cKeyboardSession`, `bbTenorTempoChangeSession` (90 then 120 BPM), `ebAltoKeyChangeSession` (written A then D major), `cKeyboardPlainSession(tempos)` and `plainPhraseFor(instrument)`. The "rich" phrase has eighths, beamed sixteenths, a displayed sharp, a rest, ties, a triad of each quality and two two-chord measures.                                                                                                                                                                                                                                                                                    | `musicxml-encoder`, `musicxml-golden`, `musicxml-schema` specs                                                                                                        |
| Acknowledgement fixture set         | `tests/unit/domain/acknowledgement/acknowledgement-fixtures.ts`                 | `phraseFromBars(bars, pitches?)`, which builds a concert timeline from duration tokens (`q q e e r:q ~:h`: `r:` a rest, `~:` a tie continuation); `acknowledgementFixtureSet()`: eight hand-built phrases (quarters, whole notes, short notes before rests, long ties across barlines, a sixteenth grid, the same with a barline tie, dotted rhythms, repeated-pitch eighths) and twelve cheap generated phrases (every note density, straight and offbeat, seeds 1 and 2); `ACKNOWLEDGEMENT_TEMPOS`, every tempo from 60 to 240 BPM.                                                                                                                                                  | every `tests/unit/domain/acknowledgement/` spec; `tests/unit/notation/note-identity.spec.ts`                                                                          |
| MIDI sessions                       | `tests/unit/export/midi/midi-session-fixtures.ts`                               | Hand-built concert timelines and backing notes: the "tied" phrase (quarters, eighths, sixteenths, a rest, concert E4 tied across the barline between measures 3 and 4) and the "plain" phrase, each with a hand-rendered backing (bass root and fifth, a close-position triad per chord); `referenceSessionWithoutBacking` and `referenceSessionWithBacking` ("tied" at 90 BPM, "plain" at 120, "tied" at 120), and `midiPhrase`.                                                                                                                                                                                                                                                      | `midi-encoder`, `midi-export-input`, `midi-golden` specs                                                                                                              |
| SMF reader                          | `tests/unit/export/midi/smf-reader.ts`                                          | `readSmf`, a small Standard MIDI File reader written for the tests (running status, a zero-velocity note-on as a release, and a crash on any malformed chunk), with `notesOf`, `tempoMap` and `metaTexts`. It shares no code with the encoder.                                                                                                                                                                                                                                                                                                                                                                                                                                         | `midi-encoder`, `smf-reader` specs                                                                                                                                    |

The goldens hold literal values, never values recomputed by the code under test. They change only in
a deliberate, reviewed step that bumps the version in their name.

### Cold-generation goldens

`tests/unit/domain/generation/orchestration/cold-generation-golden/` holds four JSON goldens,
recorded once on the generator as it stood before the cold-generation speed-up (candidates
rejected before they are assembled, freezing only when a candidate is published, incremental rhythm
tie keys, pre-warm build jobs). They prove the faster generator gives byte-identical output, so,
unlike the goldens above, they are **never regenerated**, not even under a new version: a change
that makes one fail has changed what the generator returns. Every hash in them is a SHA-256, cut
to 16 hex characters.

| File                                 | What it holds                                                                                                                                                                                                                                       | Checked by                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `catalog.golden.v1.json`             | For each of the 324 rhythm settings, the outcome hash of seeds 1 to 10, generated in order on one fresh memo (seed 1 cold, 2 to 10 warm), with the latency harness's fixed non-rhythm controls.                                                     | `catalog-quarter`, `catalog-eighth` and the three `catalog-sixteenth-*` specs, one slice each       |
| `carry-in-chains.golden.v1.json`     | Three-phrase chains (phrase 1 without a carry-in, phrases 2 and 3 carrying in from the phrase before) on eight rhythm settings, the three slowest included, for three first-phrase seeds.                                                           | `carry-in-chains.spec.ts`                                                                           |
| `non-rhythm-controls.golden.v1.json` | Six variations of the non-rhythm controls (tonal center, collection, harmonic motion, contour, register including Varying, leapiness, arpeggio chaos, tempo, instrument profile, the Jazz musical profile) over four rhythm settings, seeds 1 to 3. | `non-rhythm-controls.spec.ts`                                                                       |
| `memo-ranking.golden.v1.json`        | For ten rhythm settings (the three slowest, one with no legal plan, small and mid-size ones): the fresh memo's candidate list (kind, count, hash) and, for seeds 1 to 20, the hash and first five indexes of the seeded ranked order.               | `memo-ranking.spec.ts`; `rhythm-domain-prewarm.spec.ts`, `generation-worker-runtime-golden.spec.ts` |

The other specs that guard the speed-up and pre-warm:

- `tests/unit/domain/rhythm/rhythm-domain-exhaustive-validation-{quarter,eighth,sixteenth}.spec.ts`
  drain every domain of one note density and run the full rhythm validator on each candidate on
  its own, so the planner's cheaper early checks can never let an invalid candidate through. Each
  also checks it saw exactly the manifest's candidate count (51,312 over the three files), so the
  per-setting checks are not empty.
- `rhythm-domain-builder.spec.ts`: the stepped builder takes one gesture unit per step and builds
  exactly what `makeRhythmCandidateDomain` does, candidates or no-plan result alike.
- `rhythm-publication.spec.ts`: identities built from cached per-bar fragments equal the reference
  identity, and published candidates are deeply frozen.
- `rhythm-expansion-memo.spec.ts` and `syncopation-templates.spec.ts`: the per-bar caches and
  selector vectors agree with the per-candidate originals they replace.
- `tests/unit/domain/generation/orchestration/rhythm-tie-key-batch.spec.ts`: every incrementally
  hashed tie key equals the reference `rhythmTieKey`, and the ranked order is unchanged.
- `rhythm-domain-prewarm.spec.ts`: a memo filled by a build job run in slices matches the goldens;
  a lookup mid-job finishes it; a cancelled job writes nothing.
- `tests/unit/generation-worker/generation-worker-runtime.spec.ts` (scripted memo, fake clock,
  manual scheduler) and `generation-worker-runtime-golden.spec.ts` (real memo, checked against the
  goldens): one response per `generate`, none per pre-warm, slices bounded by their budget, and a
  `generate` before, during or after a pre-warm giving the golden outcome.
- `tests/unit/components/workspace/workspace-prewarm.spec.ts`: the policy, the triggers, the
  dedupe and the fixed pre-warm identity through `composeWorkspaceSession`, and an outcome identical
  with and without pre-warm. `tests/unit/composables/generation-session-prewarm.spec.ts`: the
  dedupe key matches the memo's rhythm input for every setting, and the URL switch.

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

### MIDI fixtures

`tests/fixtures/midi/golden/` holds the generated-notes MIDI export's golden files. See
[`docs/export.md`](export.md) for what the encoder writes.

| Path (under `tests/fixtures/midi/`)       | What it holds                                                                                                                                                                            | Used by               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `golden/reference-session.v1.mid`         | `referenceSessionWithoutBacking`: three phrases, a tempo change from 90 to 120 BPM at phrase 2 and none at phrase 3, a tie across a barline in phrases 1 and 3, backing off: two tracks. | `midi-golden.spec.ts` |
| `golden/reference-session-backing.v1.mid` | `referenceSessionWithBacking`: the same session with the backing on: a third track, the backing, on MIDI channel 2.                                                                      | `midi-golden.spec.ts` |

The golden files hold the exact bytes the encoder must produce. They were reviewed byte by byte
against the export rules when they were written, and read back with an independent MIDI library
(mido), which gave the same tempo map, markers, note counts and length (26.667 s). Like the other
goldens, they change only in a deliberate, reviewed step that bumps the version in their name.

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
