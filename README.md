# Infinite Flow

Infinite Flow is a browser-only musical phrase workspace. It generates one coherent,
staff-notated four-measure phrase in 4/4 from a player-selected instrument profile and a set of
musical controls (tonal center, collection, harmonic motion, tension arc, rhythm, contour,
register, leapiness, and arpeggio chaos), rendering it in conventional notation with chord
context. The player explicitly regenerates the whole phrase to hear and see a new variation; the
product's value is a musically legible proposal, not playback, accompaniment, or an endless
autonomous session.

## Prerequisites

- Node.js `>=22.12.0`
- npm (the committed `package-lock.json` is the only supported package manager input)
- The Playwright Chromium browser binary (Chromium is the only supported browser for now)
- `xmllint` from libxml2 (Debian/Ubuntu package `libxml2-utils`), used by the unit tests to validate
  the MusicXML export against the MusicXML 4.0 schema

## Install

```sh
npm ci
npx playwright install --with-deps chromium
```

## Development container

`.devcontainer/` provides a dev-only container (Node 22, the quality-gate CLIs, Playwright
Chromium with its OS dependencies preinstalled, Docker CLI, Claude Code) as an alternative to the
`Prerequisites`/`Install` steps above. Open the repo in VS Code and run "Dev Containers: Reopen in
Container", or use the `@devcontainers/cli`. It is unrelated to the production `Dockerfile` /
`compose.yaml` at the repo root, which only builds and serves the static `dist/` output. See
[`.devcontainer/README.md`](.devcontainer/README.md) for details, ports, and caveats (notably
visual-baseline font differences and that the `atd` CLI is not bundled).

## Commands

```sh
npm run dev                        # Local Vite development server
npm run build                      # Strict typecheck, then create the production browser build
npm run preview                    # Serve the existing production build (dist/) locally
npm run build:workspace-harness    # Build the deterministic e2e workspace harness (port 4175 origin)
npm run verify:boundaries          # Reject browser APIs used outside their allowed src/ directory and audio assets in dist/, and check the PWA precache
npm run format:check               # Check formatting for authored app, tests, scripts, and config files
npm run lint                       # Run the flat ESLint configuration
npm run typecheck                  # Run strict TypeScript and Vue template checks
npm run lint:health                # Check file size, nesting, function intent comments and ATD links
npm run test:unit                  # Vitest: unit, component, and property-based tests
npm run measure:latency            # Vitest: generation-orchestrator latency measurement (node-side)
npm run test:e2e                   # Playwright: production-preview + workspace-harness journeys (Chromium)
npm run test:a11y                  # Playwright: axe scan across empty/ready/error/in-flight states
npm run test:notation              # Playwright: notation engraving, layout, and visual-baseline checks
npm run measure:latency:browser    # Playwright: cold/warm generation latency measured in Chromium
npm run measure:engraving          # Playwright: longest main-thread task while engraving, in Chromium
npm run measure:rolling            # Playwright: rolling display's playhead and main thread on real audio, in Chromium (not in quality)
npm run measure:startup-read       # Playwright: the saved data's load before the first draw (M2), in Chromium (not in quality)
npm run replay:phrase -- <key>     # Replay one phrase from its console replay key and print it as JSON
npm run atd:lint                   # Validate ATD atom structure
npm run atd:check                  # Check ATD source/test link coverage for the current diff
npm run quality                    # The complete first-release quality gate (see the matrix below)
```

`test:e2e`, `test:a11y`, `test:notation`, `measure:latency:browser`, `measure:engraving`,
`measure:rolling` and `measure:startup-read` are Playwright suites. `playwright.config.ts` declares three `webServer` entries: port 4173 runs
`npm run preview` against the already-built `dist/`, so **run `npm run build` first** when
invoking any of these test commands on their own; ports 4174 (`build:notation-harness`) and 4175
(`build:workspace-harness`) build and serve themselves as part of starting the server, so they need
no separate prior build. `npm run quality` builds once (via its own `npm run build` step, ahead of
`verify:boundaries` and every Playwright suite) so the 4173 preview always has a `dist/` to serve.

## Directory Boundaries

- `src/domain/**` — pure, serializable, Vue/browser-free musical logic: events, time, random
  streams, instrument profiles, controls, harmony, rhythm, pitch planning and validation,
  generation-request/result orchestration, note acknowledgement (`src/domain/acknowledgement/`:
  expected notes, their timing windows, latency-corrected played onsets and exact-pitch matching;
  see [`docs/midi-acknowledgement.md`](docs/midi-acknowledgement.md)), the backing renderer
  (`src/domain/backing/`: a phrase's harmony turned into bass and chord notes, shared by the audio
  and the MIDI export; see [`docs/audio-transport.md`](docs/audio-transport.md#the-backing)), and
  the controller transposition check (`src/domain/controller-check/`: the written note the check
  shows, the expected concert pitch and the verdict on the played note, with its wording; see
  [`docs/controller-connection.md`](docs/controller-connection.md#the-transposition-check)).
- `src/generation-worker/` — the typed request/response protocol and handler that run generation
  inside a dedicated module Web Worker, off the main thread.
- `src/notation/` — the concert-to-written transformation types and the VexFlow engraving adapter,
  loaded lazily (`vexflow-engraver-loader.ts` is the sole static importer of the engraver module);
  `note-identity.ts`, which names each engraved note with the identity acknowledgement reports, and
  `score-overlays.ts`, which draws the start marker, playhead band and acknowledged notes onto the
  engraved SVG; and `staff-fit-types.ts`, the layout inputs and verdicts of the engraver's two pure
  pre-draw checks, `planWrittenPhraseFit` and `planStaffRoomForKey` (see
  [`docs/notation-engraving.md`](docs/notation-engraving.md)).
- `src/export/` — pure, browser-free encoders that turn a session's phrases into the bytes of one
  export file; `musicxml/` holds the generated-notes MusicXML encoder, `midi/` the generated-notes
  and played-notes MIDI encoders; `generated-notes-file.ts` builds the one file the Review
  downloads (loaded on demand through `load-generated-notes-export.ts`), and `browser-download.ts`
  hands it to the browser. It never imports `src/storage/` (enforced by ESLint). See
  [`docs/export.md`](docs/export.md).
- `src/session/` — the session engine: pure, deterministic, Vue/browser-free logic that turns a
  running session's timed events (audio time in seconds, carried on each event, never read from a
  clock) into generation requests, fit checks, read-ahead phrases, the struggling notice and the
  end, plus the runner that executes those requests through the injected `generate` seam; the
  in-memory session history, which records every phrase that sounded with the inputs that
  reproduce it, and the notes the player played; the adapter that turns a recorded session into
  the export encoders' inputs; and the session screen's pure pieces: the start conditions, the
  count-in display, the audio-time agenda, the session window rule, the rolling display's plan
  (where the playhead is and what each staff system shows), the browser ports a session uses, the
  starting note, a session's acknowledgement and its MIDI timers (silence timeout, reconnection
  countdown); and the settings-mutation engine (`settings-mutation.ts` with its scale table
  `settings-mutation-scales.ts`), the settings change at a phrase boundary
  (`session-settings-change.ts`, `session-mutation-step.ts`, `session-engine-state.ts`) and the
  carry-in adapted to a change (`carry-in-adaptation.ts`); and adaptive tempo, its pure schedule
  (`adaptive-tempo.ts`) and each phrase's tempo fixed at its deadline (`session-tempo-step.ts`);
  and the multi-phrase tension arc's four-phrase cycle (`tension-arc-cycle.ts`). It never
  imports `src/storage/` (enforced by ESLint). See
  [`docs/session-engine.md`](docs/session-engine.md).
- `src/audio/` — the audio transport, and the only place allowed to use Web Audio (see Runtime
  Constraints): the app's one `AudioContext`, created on the player's click, the look-ahead
  scheduler and its Web Worker wake-up timer, the click and count-in, the backing's timing and
  synthesized voices, and the mix gains. See
  [`docs/audio-transport.md`](docs/audio-transport.md).
- `src/composables/` — in-memory session/UI coordination (`use-generation-session.ts` with its
  sibling modules `generation-session-*.ts`, among them `generation-session-fit-round.ts`, the idle
  fit run, and `generation-session-room-notice.ts`, the reactions around the room notice;
  `use-notation-coordinator.ts`, which also answers the session's fit and room checks;
  `workspace-session-result.ts`; and `viewport-width.ts`, the injected window-width seam): no
  persistence, no singletons.
- `src/components/**` — Vue presentation components, props-in/events-out; `src/components/workspace/`
  holds the root session composition (`create-workspace-session.ts`, its types in
  `workspace-session-types.ts` and `workspace-session-dependencies.ts`, with the `matchMedia` width
  provider in `browser-viewport-width.ts` and the session's browser adapters in `browser-*.ts`),
  the session controller (`workspace-session-controller.ts`, loaded as its own chunk together
  with the sibling modules it is split into, with `workspace-session-runner.ts`, its runner starter, with the player's `Vary settings` and
  `Tension across phrases` choices) and the
  workspace component tree, the session action, cue row, audio mix and header `controller-status`
  included (see [`docs/phrase-workspace.md`](docs/phrase-workspace.md));
  `src/components/controller-connection/` holds the connection sheet, loaded as its own chunk
  (`load-connection-sheet.ts` is its sole importer), with its pure reducer, its view data and the
  check note (see [`docs/controller-connection.md`](docs/controller-connection.md));
  `src/components/review/` holds the last session's Review, loaded as its own chunk
  (`load-review-panel.ts` is its sole importer), with its lazy-engraving scheduler (see
  [The last-session Review](docs/phrase-workspace.md#the-last-session-review)).
- `src/styles/` — the production Tailwind 4 styling authority (`theme.css`, `components.css`,
  `index.css`, `fonts.css`), consumed by application code; `ui_ux/versions/v1/ui_common.css` is a frozen design
  reference, not buildable production styling.
- `tests/unit` — Vitest/Vue Test Utils unit, component, and property-based coverage, mirroring
  `src/`'s structure. `tests/unit/boundaries/` checks the browser-API rules of `eslint.config.js`
  and `scripts/verify-boundaries.mjs`, and the ESLint ban on `src/session/` and `src/export/`
  importing `src/storage/`; it is type-checked with the Node config
  (`tsconfig.node.json`) because it imports the `.mjs` script.
- `tests/fixtures/boundaries/src/` — small source files laid out like `src/` (`audio/`, `midi/`,
  `storage/`, `session/`, `export/`, `components/`, `other/`) that call the restricted browser APIs
  on purpose. They sit outside `src/`, so the real lint and boundary scan never treat them as
  application code; the boundary unit tests lint and scan them as if they were in `src/`.
- `tests/fixtures/musicxml/` — the MusicXML export's golden files and the vendored MusicXML 4.0
  schema (with an XML catalog for offline validation); see [`docs/testing.md`](docs/testing.md).
- `tests/fixtures/midi/` — the MIDI export's golden files, generated notes and played notes; see
  [`docs/testing.md`](docs/testing.md).
- `tests/fixtures/export-hand-check/` — the generated-notes files of one seeded session, exactly as
  the app downloads them, for the owner's hand check in MuseScore and a MIDI tool; see
  [Hand check](docs/export.md#hand-check).
- `tests/e2e/{workspace,release,session,controller,workspace-harness}` — Playwright suites:
  `workspace/` exercises the production preview build directly; `release/` exercises
  release-readiness journeys (determinism, errors/retry, concurrency, profile switch, theme
  isolation, persistence/optional-scope absence, offline) mostly through the workspace harness;
  `session/` drives whole practice sessions through the harness on its fake audio clock;
  `controller/` drives `controller-status` and the connection sheet on its fake MIDI access;
  `workspace-harness/` is the harness's own entry
  point (`main.ts`) and DI-seam wiring, built by `vite.workspace-harness.config.ts`, including
  forced fit verdicts and layout failures through its engraver loader seam (see
  [`docs/testing.md`](docs/testing.md)).
- The notation harness (`tests/e2e/notation/`, `tests/e2e/notation-harness/`,
  `vite.notation-harness.config.ts`) isolates notation engraving, layout, and visual-baseline
  checks from the full workspace.
- `src/midi/` — MIDI input, and the only place allowed to use Web MIDI (see Runtime Constraints):
  the browser adapter with the app's one `requestMIDIAccess` call, the parsing of note-on and
  note-off messages, the played-note tracker, the mapping of MIDI timestamps onto the audio clock,
  the controller that picks one input and follows it through an unplug and back, and the header's
  status form folded from it (`controller-status.ts`). See [`docs/midi-input.md`](docs/midi-input.md).
- `src/storage/` — on-device storage, and the only place allowed to use IndexedDB and
  `navigator.storage` (see Runtime Constraints): the storage port (`storage-port.ts`), the one
  `infinite-flow` database with its seven stores and migration steps over raw IndexedDB
  (`database.ts`), the record envelope every record's versions are read and checked through
  (`record-envelope.ts`), the app version records carry (`app-version.ts`), and the record codecs
  (`records/`: the settings codec, and the kept-session codec that turns a finished session into
  its stored records and back), and the save policy that decides when a write reaches
  the port (`save-policy.ts`, `save-policy-requests.ts`). The rest of the app reaches it only
  through an injected port. `src/storage-bootstrap.ts`, beside `main.ts`, loads the saved
  settings through it before the app is mounted, under the start-up wait; the player's settings
  are saved through the policy as they change (`src/storage/settings-saver.ts`). See
  [`docs/storage.md`](docs/storage.md#the-load-before-the-first-draw).
- `scripts/` — `verify-boundaries.mjs`, the deterministic boundary/precache verifier;
  `replay-phrase.mjs`, the headless phrase replay behind `npm run replay:phrase` (see
  [Phrase replay key](docs/phrase-workspace.md#phrase-replay-key)); and `app-version-define.mjs`,
  the build-time `define` of the app version for the Vite and Vitest configs (see
  [The app version](docs/storage.md#the-app-version)).
- `public/licenses/` — vendored full license texts for every runtime third-party component,
  copied into `dist/licenses/` at build time; see [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).
- `docs/` — ATD-linked business-intent atoms plus narrative docs (architecture, notation,
  generation latency, the phrase workspace, the session engine, the audio transport, MIDI input,
  MIDI tuning, the controller connection, on-device storage, and `docs/release/*`).
- `specs/` — the first-release master spec, implementation plan, generator architecture and
  contract, and roadmap/open-questions.
- `ui_ux/` — the approved interaction/visual authority: each released version's design, frozen, in
  `ui_ux/versions/` (v1 includes the frozen `ui_common.css`/mockup reference), and the next
  version's work in progress at its root (decisions, strategy, flow and screen handoffs).

## Runtime Constraints

The client has no backend, SSR process, API server, or server runtime dependency. Authored code in
`src/` follows these browser-API rules:

- **Web Audio only in `src/audio/`.** `AudioContext`, its legacy name `webkitAudioContext`, and
  `OfflineAudioContext` may be used only in files under `src/audio/`.
- **Web MIDI only in `src/midi/`.** `requestMIDIAccess` may be used only in files under
  `src/midi/`.
- **On-device storage only in `src/storage/`.** `indexedDB` and the storage manager
  `navigator.storage` may be used only in files under `src/storage/`.
- **Forbidden everywhere, `src/audio/`, `src/midi/` and `src/storage/` included:** the other
  browser storage (`localStorage`, `sessionStorage`, and the Cache API `caches`), the network
  (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`), cookies
  (`document.cookie`, `cookieStore`), the microphone and camera (`navigator.mediaDevices`,
  `getUserMedia`), and media-element playback (`new Audio(...)`). Nothing is sent over the
  network.
- **No recorded sound.** The click and the backing are synthesized from oscillators and gains:
  `decodeAudioData`, `createBufferSource`, `createMediaElementSource` and `new AudioBuffer` are
  rejected everywhere in `src/`, and no audio or sample file (`.wav`, `.mp3`, `.ogg`, `.mid`,
  `.sf2` and the like) may appear in the build output `dist/`.

Two checks enforce the first four rules independently, and a use in the wrong place fails both:
`eslint.config.js` (`no-restricted-globals` / `no-restricted-properties`, with an override block
for each of `src/audio/`, `src/midi/` and `src/storage/`), run by `npm run lint`, and the source
scan in `scripts/verify-boundaries.mjs`, run by `npm run verify:boundaries`. The no-recorded-sound
rule is checked by `verify:boundaries` alone, in its source scan and in a scan of every file in
`dist/`.
ESLint alone also keeps `src/session/` and `src/export/` storage-free: a `no-restricted-imports`
override rejects any import of `src/storage/` there, by the `@/storage` alias or a relative path.
In the running app,
`tests/e2e/release/optional-scope-absence.spec.ts` checks that no audio context is created and no
MIDI access is requested before the player clicks `Start session` or `Connect controller` (the
spec loads, generates, changes controls, regenerates, switches profile and theme, but never
clicks either), that the
microphone is never requested, and that no request leaves the page's origin.

The PWA uses `vite-plugin-pwa` with `generateSW` to precache every built HTML/JS/CSS/`woff2`/image
asset, including the lazy VexFlow engraving chunk, the generation Worker chunk, and the revisioned
`index.html` navigation fallback. Its Workbox policy sets `runtimeCaching: []` explicitly: there is
no opportunistic runtime network caching, and nothing beyond the precache is ever cached. A first
online load is required to install the service worker and populate the precache; after that,
required phrase generation, notation, controls, and the current phrase work fully offline. See
[`docs/release/browser-and-offline-limits.md`](docs/release/browser-and-offline-limits.md) for the
full detail, including service-worker update behavior and the module-Worker/lazy-chunk requirements.

Chromium is currently the only supported browser; `playwright.config.ts` defines a single
`chromium` project. Firefox and WebKit are not tested and not supported for now.

## Architecture Overview

```
UI (Vue components, props-in/events-out)
  -> session composables (use-generation-session, use-notation-coordinator)
    -> Web Worker (generation-worker/, typed correlated protocol)
      -> domain orchestration: harmony -> rhythm -> pitch -> validation
    -> session controller (Start/Stop, the audio-time agenda, screen locks, every end)
      -> session engine (src/session/: pure timed-event engine; its runner uses the same Worker)
      -> last-session Review (lazy panel) -> export (lazy encoders) -> one browser download
    -> audio transport (src/audio/: the one AudioContext, look-ahead scheduler, click, backing, mix)
      -> backing renderer (src/domain/backing/: harmony -> bass and chord notes)
    -> MIDI input (src/midi/: one controller, played notes on the audio clock)
      <- controller connection (header controller-status, lazy connection sheet, transposition check)
    -> notation (lazy VexFlow engraver, loaded on demand)
```

- **UI.** `App.vue` builds one root `WorkspaceSession` for the tab's lifetime via
  `createWorkspaceSession` (or, in a test/harness, via the injected `WORKSPACE_SESSION_FACTORY`
  seam), and loads its session controller once, as a lazy chunk. `WorkspaceShell`,
  `WorkspaceHeader` (with `controller-status`), `ScorePanel` (with the audio mix and the session
  cue row), `ControlPanel` and its five control groups are props-in/events-out around that one
  session and its controller. The connection sheet loads as its own chunk when
  `controller-status` is clicked (see below).
- **Session composables.** `createGenerationSession` owns the session's state machine (`idle` /
  `generating` / `notating`, exactly one operation at a time, prior-result retention on failure)
  and exposes explicit actions; `create-workspace-session.ts` wires it to a `generate` seam, a
  `notate` seam driven by `createNotationCoordinator`, and the profile-switch policy adapter. Every
  Idle generation is one fit run: each generated attempt is checked against the staff's room by
  the coordinator's `checkFit`, with the engraver's own planning and before anything is drawn, and
  a too-wide attempt is replaced by a fresh-seed retry, at most four attempts; a window with no
  room, or a run with no attempt that fits, shows the "staff needs more room" notice instead. See
  [`docs/phrase-workspace.md`](docs/phrase-workspace.md#idle-fit-run-and-the-room-notice).
- **Session engine.** `src/session/` decides, as pure logic, what a running practice session
  requests, shows and ends, from timed events that each carry their audio time: phrase 2 requested
  at start (or spent from the phrases pre-generated at Idle) and due when the count-in ends, each later phrase due at the start of the last measure
  of the one sounding, the failure ladder (three carry-in retries, one standalone retry, then a
  repeat of the phrase before), the struggling-generator notice, and settings locked at start,
  changed only at a phrase boundary by a seeded settings mutation (flag off in the workspace) or
  a settings change.
  `createSessionRunner` executes its requests; `composeWorkspaceSession` binds it to the same
  `generate` seam, and so the same Worker, the Idle flow uses. `createSessionHistory` records, in
  memory, every phrase that started sounding: the phrase as shown and the inputs that reproduce
  it, with its tempo; the MusicXML and MIDI export inputs are built from those stored phrases,
  never regenerated. The session controller (`workspace-session-controller.ts`) runs a session
  on the workspace: `Start session` unlocks the audio, asks for the screen wake and landscape
  locks and starts the count-in; an audio-time agenda, woken by its own Worker timer, sends the
  engine its timed events and queues each phrase's backing; every output is recorded in the
  history; and Stop, a hidden tab, a window that no longer shows the staff or an audio
  interruption ends the session the same way. With a MIDI controller connected, playing the
  starting note named above the staff starts the session as `Start session` does; a session
  started with the controller connected lights each expected note played in time, records the
  played notes, and ends after 30 s without a note or 30 s after losing the controller (see
  [MIDI side](docs/session-engine.md#the-session-controllers-midi-side)). The staff rolls: starting from phrase 1, the Idle
  phrase as drawn, its two systems are refilled one at a time as the playhead leaves them, each
  look-ahead phrase checked against the layout held for the session before it is accepted (a
  misfit is a failed attempt), and the playhead band steps from measure to measure on the heard
  audio clock. A window change that leaves a phrase shown or waiting unable to fit ends the
  session like Stop. An end once phrase 1 has sounded opens the last session's Review in the
  staff's place, every phrase that sounded engraved as it was shown, while a fresh phrase 1 is
  generated behind it; no session starts while it shows, and the next start discards it. See
  [`docs/session-engine.md`](docs/session-engine.md#the-session-controller) and
  [`docs/phrase-workspace.md`](docs/phrase-workspace.md#the-session-screen).
- **Audio transport.** `src/audio/` holds the app's one `AudioContext`, created only by `unlock()`
  inside the player's `Start session` or `controller-status` click and never suspended or closed. A
  look-ahead scheduler, woken every 25 ms by a Web Worker timer, plans sound 200 ms ahead on the
  audio clock: the quarter-note click with beat 1 accented and the one-measure count-in, which
  sounds even with the click off. The backing is queued phrase by phrase with `queueBacking`: the
  pure renderer `renderBacking` (`src/domain/backing/`) turns the phrase's harmony into a bass
  line (the root, and the fifth on beat 3 of a measure under one chord) and close-position block
  chords, attacked at every chord change and downbeat; the transport places them on the click's
  own beat grid from the end of the count-in, and oscillator voices play them, with no audio
  file. The mix is four gains (click and backing, each on/off and volume) whose ranges come from
  the `--mix-*` design tokens, and Stop fades a per-session bus out over 0.1 s. The workspace
  session exposes it as `WorkspaceSession.audio`; the session controller calls `unlock()` in the
  `Start session` click and `queueBacking` for each phrase, and the score toolbar's audio mix
  (`Backing`, `Click`, `Volume`) sets its gains. See
  [`docs/audio-transport.md`](docs/audio-transport.md).
- **MIDI input.** `src/midi/` reads one MIDI controller. Access is requested only by
  `connect()`, which the header's `controller-status` click calls; no Web MIDI, a refused permission
  and no device are typed states, never errors. Only a note-on with non-zero velocity, on any
  channel, is a played note; a note-off or a zero-velocity note-on ends it, and every other
  message is ignored. The controller selects the only device present or the player's pick, by its
  port id; when that port reports disconnected it is `away`, its held notes end, and the same
  device coming back is reattached by itself, unless a session started without it holds that
  back until it ends. Each note's onset and release are mapped from the
  MIDI timestamp onto the audio clock through the transport's `clockAnchor()`. The workspace
  session exposes it as `WorkspaceSession.midi`. See [`docs/midi-input.md`](docs/midi-input.md).
- **Controller connection.** Between sessions only, the header's `controller-status` shows the
  controller's status (`Connect controller`, the connected device's name, `No controller` or
  `MIDI access blocked`), frozen while a session runs, except for the disconnected badge while a
  controller lost in the session counts down. Its click unlocks the audio, asks for MIDI
  access and opens the connection sheet, a lazily loaded modal dialog driven by a pure reducer:
  it says why it can't connect when it can't, lets the player pick one device, and runs the
  transposition check, which shows one written note of the instrument profile, engraved, and
  compares the note the controller sends with the expected concert pitch. See
  [`docs/controller-connection.md`](docs/controller-connection.md).
- **Web Worker.** Every generation request runs off the main thread in one long-lived module
  `Worker` behind a typed, correlated request/response protocol
  (`src/generation-worker/generation-worker-protocol.ts`), which re-validates every field crossing
  the wire through the same domain constructors/parsers the orchestrator uses, and deep-freezes the
  result. A second, uncorrelated `prewarm` message, never answered, asks the Worker to build the
  current rhythm setting's domain in short slices between requests, so the first Generate on that
  setting finds it ready (`?prewarm=off` on the page URL turns it off for latency measurement).
  See [`docs/phrase-workspace.md`](docs/phrase-workspace.md#pre-warm). While Idle, the same
  Worker also pre-generates in the background up to four phrases that would follow phrase 1 in a
  session, which the next session spends first; any player request aborts the background attempt
  in flight, and `?pregeneration=off` on the page URL turns it off. See
  [Pre-generation at Idle](docs/phrase-workspace.md#pre-generation-at-idle).
- **Domain orchestration (harmony -> rhythm -> pitch -> validation).**
  `generatePhrase`/`generation-orchestrator.ts` builds the structural harmony candidate domain
  (`makeHarmonyCandidateDomain`), the rhythm candidate domain (materialized once per rhythm setting
  and cached in a seed-independent memo, then ranked per seed), searches for a legal pitch
  assignment per candidate window (`window-search.ts`), and independently re-validates the
  assembled result (`validateGenerationResult`) before returning a `GenerationOutcome`.
- **Continuing from the phrase before (carry-in).** A session phrase after the first is generated
  from an intent carrying a `CarryIn` (`src/domain/generation/carry-in/`): the last sounding pitch
  with its leap state, the register window, the final chord with its endpoint class, and the phrase
  number, derived from the phrase before by `deriveCarryIn`. The pitch search starts from the
  carried pitch, the harmony from the carried chord, and the one carried window is searched; the
  join is validated like the inside of a phrase. Without a carry-in the output is byte-identical
  to v1. See [joins between session phrases](docs/music/pitch-planner-validation.md#joins-between-session-phrases-v2).
- **Notation.** A successful outcome's concert-pitch timeline is transformed into a `WrittenPhrase`
  for the selected display convention (Concert / B-flat / E-flat), then engraved by a lazily loaded
  VexFlow adapter (`src/notation/vexflow-engraver-loader.ts` is the sole static importer of the
  engraver module) — the engraving chunk is fetched on first use and precached for offline reuse.
  The engraver tags every note's own parts with its note identity (`note-identity.ts`), and
  `score-overlays.ts` draws the session's marks onto the engraved SVG by those identities, without
  re-engraving. During a session the staff engraves one system part of a phrase at a time
  (`engravePhraseSystem`), from the whole phrase's plan, so a split phrase's halves keep one
  scale and aligned measures.
- **Note acknowledgement.** `src/domain/acknowledgement/` decides, as pure logic, which expected
  notes of the phrase a player's notes acknowledge: exact concert pitch, inside a timing window on
  the audio clock, with the played onset corrected for latency. Its only output is a list of note
  identities. A session read from a controller calls it as each note arrives
  (`src/session/session-acknowledgement.ts`). The timing constants are still to be tuned on the
  reference hardware. See [`docs/midi-acknowledgement.md`](docs/midi-acknowledgement.md) and
  [`docs/midi-tuning.md`](docs/midi-tuning.md).

- **Export.** `encodeGeneratedNotesMusicXml` (`src/export/musicxml/`) turns a session's phrases,
  each with its number, its `WrittenPhrase` and its tempo, into one score-partwise 4.0 MusicXML
  document in the instrument's written pitch. `encodeGeneratedNotesMidi` (`src/export/midi/`) turns
  the same phrases, each with its number, its concert timeline and its tempo, plus the backing's
  notes when asked, into one type 1 Standard MIDI File at 960 MIDI ticks per quarter note: a
  conductor track (tempo map, one marker per phrase), the generated line at concert pitch, and the
  optional backing track, whose notes `renderBacking` gives. Both are pure functions. The
  Review's `Export generated notes` action builds one file from the session history, MusicXML or
  MIDI (with the backing track only when asked, off by default), loads the export code on the
  first export, and hands the file to the browser as one download named after the session's start;
  the same session always gives the same bytes, and nothing is sent or stored. See
  [`docs/export.md`](docs/export.md).

See [`specs/generator-architecture.md`](specs/generator-architecture.md) for the full seam-by-seam
architectural contract and [`docs/phrase-workspace.md`](docs/phrase-workspace.md) for the
workspace's component tree, session wiring, state map, and Worker protocol in detail,
[`docs/session-engine.md`](docs/session-engine.md) for the session engine, and
[`docs/audio-transport.md`](docs/audio-transport.md) for the audio transport,
[`docs/midi-input.md`](docs/midi-input.md) for MIDI input, and
[`docs/controller-connection.md`](docs/controller-connection.md) for the controller connection.

## First-Release Verification Matrix

| Gate                                    | Command                                 | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | What it proves                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Install reproducibility                 | `npm ci`                                | Lockfile-only dependency installation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | The committed lockfile alone reproduces the dependency tree.                                                                                                                                                                                                                                                                                     |
| Formatting                              | `npm run format:check`                  | Authored app, tests, scripts, config, and `docs/release`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Source is Prettier-formatted; no unformatted diff can land.                                                                                                                                                                                                                                                                                      |
| Static analysis                         | `npm run lint && npm run typecheck`     | Flat ESLint (including the boundary `no-restricted-*` rules and the storage-free `src/session/` and `src/export/`) and strict TypeScript/Vue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | No lint violations (including the optional-scope/persistence lint mirror) and no type errors.                                                                                                                                                                                                                                                    |
| Code health                             | `npm run lint:health`                   | Authored source, tests and scripts: file size, control-flow nesting, intent comments on functions, and `@spec-link`/`@test-link` presence (`CODING_RULE.md` §6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | No file over the size or nesting ceiling, no exported function without an intent comment, and every business file linked to its atoms; warnings are reported, not blocking.                                                                                                                                                                      |
| Unit/component/property                 | `npm run test:unit`                     | Vitest across `tests/unit/**`: domain logic, composables, components, worker handler                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Domain rules, session state machine, and component contracts hold, including property-based coverage (e.g. `planner-validator-property.spec.ts`) and the byte-identical generation-outcome golden fixture.                                                                                                                                       |
| Production artifact                     | `npm run build`                         | Strict typecheck, then the static browser bundle and generated PWA files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The app builds cleanly and emits `dist/` plus `dist/sw.js`.                                                                                                                                                                                                                                                                                      |
| Persistence/PWA/optional-scope boundary | `npm run verify:boundaries`             | Authored `src/**`: forbidden persistence/network/cookie/microphone identifiers, sampled-audio calls, and Web Audio/Web MIDI/IndexedDB and `navigator.storage` outside `src/audio/`/`src/midi/`/`src/storage/`; every `dist/` file, for audio or sample assets; `vite.config.ts`'s `runtimeCaching: []`; every `dist/assets/*.{js,css,woff2}` present in the `dist/sw.js` precache manifest; per-chunk minified-size budgets for `dist/assets/*.js` (entry 224 kB, `generation.worker` 150 kB, `vexflow-engraver` 800 kB, other 100 kB)                                                                                                                                                                                                    | No authored `localStorage`/`sessionStorage`/Cache API, cookie, network or microphone API, and no Web Audio/Web MIDI/on-device storage outside its directory; the sound is synthesized, with no recorded audio shipped; the offline precache is complete, including the lazy engraver and Worker chunks; no chunk has grown past its size budget. |
| End-to-end journeys                     | `npm run test:e2e`                      | Playwright, Chromium only, against the production preview (port 4173) and the workspace harness (port 4175): startup, generate/regenerate, viewports, portrait notice, target size, focus visibility, reduced motion, theme, unsupported-rhythm blocking, the audio transport, backing and audio mix, MIDI input, the `tests/e2e/session/` practice sessions (start conditions, count-in, locks, every end, the struggling notice), plus the `tests/e2e/release/` journeys — deterministic replay, errors and retry, concurrent-operation prevention, written-key/instrument-profile switching, profile switch, theme isolation, persistence absence, optional-scope absence, offline-and-fonts, and the idle fit retries and room notice | The full player-facing workflow behaves correctly end to end, including states (in-flight generation, forced generation/notation failures) that only the harness's deterministic seams can force.                                                                                                                                                |
| Automated accessibility (a11y)          | `npm run test:a11y`                     | Playwright + `@axe-core/playwright` against the empty shell, the audio mix's volume popover open, post-generation in Light and Dark, the unsupported-rhythm state, and (via the workspace harness) the in-flight-generation, generation-failed, and notation-failed states                                                                                                                                                                                                                                                                                                                                                                                                                                                                | No detectable axe violations in each covered UI state; not a full manual conformance claim.                                                                                                                                                                                                                                                      |
| Notation visual baselines               | `npm run test:notation`                 | Playwright against the notation harness (port 4174) and the production preview: engraving elements, calibration, key-signature spelling, the staff layout (split below 64rem, one system from it up, the two typed layout failures, the height budget, the pre-draw fit and room checks), and pixel-baseline snapshots (`tests/e2e/notation/notation-visual.spec.ts-snapshots/`)                                                                                                                                                                                                                                                                                                                                                          | Engraved notation matches its recorded visual baseline and the documented layout/legibility policy.                                                                                                                                                                                                                                              |
| ATD structure/link coverage             | `npm run atd:lint && npm run atd:check` | `docs/*.atom.md` structure and `@spec-link`/`@test-link` coverage for the current diff                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Documentation atoms are well-formed and source/test traceability is maintained.                                                                                                                                                                                                                                                                  |

`npm run quality` runs all of the above (format, lint, code health, unit, build, boundaries, e2e,
a11y, notation, ATD) in one sequence. See [`docs/release/release-checklist.md`](docs/release/release-checklist.md)
for the full release procedure and known timing caveats when running it.

## Run with Docker

A multi-stage [`Dockerfile`](Dockerfile) packages the production build behind a non-root nginx, and
[`compose.yaml`](compose.yaml) runs it with a hardened container configuration (read-only root
filesystem, all Linux capabilities dropped, `no-new-privileges`). The build stage runs the real
`npm ci && npm run build` (strict typecheck, then `vite build`) inside the image; only the resulting
`dist/` ships in the runtime image.

```sh
docker compose up --build
```

Open `http://localhost:8080/`. The published port is bound to loopback only
(`127.0.0.1:8080` by default) and is easy to change per deployment without editing any file:

```sh
INFINITE_FLOW_PORT=8081 docker compose up -d --build
```

`INFINITE_FLOW_BIND` (default `127.0.0.1`) controls the bind address the same way, if a deployment
ever needs to publish on a different interface instead of relying on a reverse proxy (see below).

**Secure-context caveat.** The service worker — and with it offline mode and "Install app" — only
registers in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
`http://localhost` (and `http://127.0.0.1`) qualifies as a secure context in every browser, which is
why the command above works as-is for local use. Plain `http://` on a LAN IP or a real hostname does
**not** qualify: reaching this container that way loads the page but the service worker will not
register, so there is no offline support and no install prompt. Production deployment therefore
needs HTTPS termination in front of this container — see the next section — or an equivalent
reverse proxy that terminates TLS. See
[`docs/release/browser-and-offline-limits.md`](docs/release/browser-and-offline-limits.md) for the
full detail on offline guarantees.

### Deploying behind a reverse proxy (Caddy)

This container is designed to sit behind a TLS-terminating reverse proxy rather than to be exposed
directly: `compose.yaml` publishes only to loopback by default, and `docker/nginx.conf` sets
`absolute_redirect off`/`port_in_redirect off` so nginx never leaks its internal `:8080` into a
redirect `Location` header. On a shared VPS where an existing [Caddy](https://caddyserver.com/)
instance already terminates TLS for several apps, add a site block for this app and reload Caddy
(illustrative only — not applied by this repository):

```caddyfile
flow.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8080
}
```

If Caddy itself runs as a Docker container on the same host, attach this service to Caddy's Docker
network instead (see the commented-out `networks:` block in `compose.yaml`) and proxy to the
container by name instead of a host port:

```caddyfile
flow.example.com {
    encode zstd gzip
    reverse_proxy infinite-flow-web:8080
}
```

Notes for either variant:

- **Caddy provides HTTPS.** It is what turns this into the secure context the service worker and
  offline mode require (see the caveat above); nothing in this container terminates TLS itself.
- **HSTS is Caddy's job, not nginx's.** `docker/nginx.conf` deliberately does not set
  `Strict-Transport-Security` — set it in Caddy (or your TLS-terminating proxy) if desired.
- **Don't duplicate security headers.** `docker/nginx.conf` already sets the Content-Security-Policy
  and the other security headers (see `docker/security-headers.conf`) so they travel with the app
  regardless of which proxy sits in front of it; do not also set a CSP in the Caddyfile, or the
  browser will receive two `Content-Security-Policy` headers, which is treated as the _intersection_
  of both and can silently break the app.
- **The app must be served at the domain root.** `vite.config.ts` uses the default Vite `base`
  (`/`), and the PWA manifest's `scope` is `/` (see `dist/manifest.webmanifest` after a build). A
  subpath deployment (e.g. `example.com/infinite-flow/`) is not supported as-is — it would need a
  rebuild with a different Vite `base` (and manifest `scope`/`start_url`) before it could work
  correctly, especially for the service worker's precache routing.
- **Deploying an update:** `git pull && docker compose up -d --build` on the host; Caddy needs no
  change for an app-only update since it only ever proxies to the container.

### Deploying to the VPS

The production VPS is managed from a local checkout with [`scripts/vps.sh`](scripts/vps.sh), which
only ever touches `~/infinite-flow` there: `update [ref]` ships a committed ref (default `HEAD`) via
`git archive`, rebuilds and restarts; `rollback` returns to the previous image; `stop`, `start` and
the read-only `status` do what they say. `update`, `start` and `rollback` end with a health and HTTP
check of the app and the shared site; `stop` checks the shared site still answers. `VPS_HOST`
overrides the SSH host alias (default `vps`).

## Product References

- [First-release master specification](specs/first-release-master-spec.md) — the implementation
  handoff and definition of done.
- [First-release implementation plan](specs/first_release_plan.md) — sequenced delivery steps.
- [Generator architecture](specs/generator-architecture.md) — the seam-by-seam architectural
  contract.
- [UI/UX index](ui_ux/README.md) — the approved interaction and visual authority.
- [Testing](docs/testing.md) — test layers, scripts, the two harnesses and their seams, and the
  fixture list.
- [MIDI note acknowledgement](docs/midi-acknowledgement.md) — how played notes are matched to the
  phrase's expected notes: the window rule, the latency constants and their sources, and the
  identity-only output.
- [MIDI input](docs/midi-input.md) — how the controller is read: the message rules, what
  connected and lost mean, the same device reattaching, and MIDI timestamps on the audio clock.
- [ATD documentation](docs/) — business-intent atoms with source/test traceability.
- [Third-party licenses](THIRD_PARTY_LICENSES.md) and [`public/licenses/`](public/licenses/) —
  every runtime component shipped in `dist/`, with vendored full license text.
- [`docs/release/browser-and-offline-limits.md`](docs/release/browser-and-offline-limits.md) —
  supported-browser and offline guarantees/limits in detail.
- [`docs/release/deferred-scope.md`](docs/release/deferred-scope.md) — post-v1 scope (roadmap
  input) and known v1 limitations. It does not gate v1.0.
- [`issues/`](issues/) — tracked issues. Every open issue must be resolved before v1.0 is
  validated.
- [`docs/release/reconciliation-report.md`](docs/release/reconciliation-report.md) — spec/code
  drift check performed for this release.
- [`docs/release/release-checklist.md`](docs/release/release-checklist.md) — the ordered release
  procedure.
- [`docs/release/dod-acceptance-matrix.md`](docs/release/dod-acceptance-matrix.md) — Definition-of-Done
  item-by-item verification evidence.

Infinite Flow is released under the [MIT License](LICENSE).

Generated lead playback, MIDI integration, persistence, microphone capture, automatic key
detection, scoring, and the rolling continuation flow remain outside this release; see
[`docs/release/deferred-scope.md`](docs/release/deferred-scope.md) for the post-v1 inventory.

## Open Issues

| Name                                                                                                                                                   | Date       | Status | Severity | Oneliner                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------ | -------- | -------------------------------------------------------------------------------- |
| [Start throws when a harmony or register setting changed at Idle after phrase 1 was generated](issues/Ref_20261012_start_after_idle_harmony_change.md) | 2026-10-12 | Open   | High     | At Idle, an ordinary control edit never regenerates the phrase on screen, and... |
| [A rising up-stemmed beam can run through a chord symbol](issues/Ref_20261005_chord_symbol_through_rising_beam.md)                                     | 2026-10-05 | Open   | Medium   | In a beam group stemmed up whose beam rises above the staff's text line, the ... |
