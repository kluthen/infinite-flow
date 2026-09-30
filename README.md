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
npm run verify:boundaries          # Reject browser APIs used outside their allowed src/ directory and check the PWA precache
npm run format:check               # Check formatting for authored app, tests, scripts, and config files
npm run lint                       # Run the flat ESLint configuration
npm run typecheck                  # Run strict TypeScript and Vue template checks
npm run test:unit                  # Vitest: unit, component, and property-based tests
npm run measure:latency            # Vitest: generation-orchestrator latency measurement (node-side)
npm run test:e2e                   # Playwright: production-preview + workspace-harness journeys (Chromium)
npm run test:a11y                  # Playwright: axe scan across empty/ready/error/in-flight states
npm run test:notation              # Playwright: notation engraving, layout, and visual-baseline checks
npm run measure:latency:browser    # Playwright: cold/warm generation latency measured in Chromium
npm run measure:engraving          # Playwright: longest main-thread task while engraving, in Chromium
npm run atd:lint                   # Validate ATD atom structure
npm run atd:check                  # Check ATD source/test link coverage for the current diff
npm run quality                    # The complete first-release quality gate (see the matrix below)
```

`test:e2e`, `test:a11y`, `test:notation`, `measure:latency:browser` and `measure:engraving` are
Playwright suites. `playwright.config.ts` declares three `webServer` entries: port 4173 runs
`npm run preview` against the already-built `dist/`, so **run `npm run build` first** when
invoking any of these test commands on their own; ports 4174 (`build:notation-harness`) and 4175
(`build:workspace-harness`) build and serve themselves as part of starting the server, so they need
no separate prior build. `npm run quality` builds once (via its own `npm run build` step, ahead of
`verify:boundaries` and every Playwright suite) so the 4173 preview always has a `dist/` to serve.

## Directory Boundaries

- `src/domain/**` — pure, serializable, Vue/browser-free musical logic: events, time, random
  streams, instrument profiles, controls, harmony, rhythm, pitch planning and validation,
  generation-request/result orchestration, and note acknowledgement (`src/domain/acknowledgement/`:
  expected notes, their timing windows, latency-corrected played onsets and exact-pitch matching;
  see [`docs/midi-acknowledgement.md`](docs/midi-acknowledgement.md)).
- `src/generation-worker/` — the typed request/response protocol and handler that run generation
  inside a dedicated module Web Worker, off the main thread.
- `src/notation/` — the concert-to-written transformation types and the VexFlow engraving adapter,
  loaded lazily (`vexflow-engraver-loader.ts` is the sole static importer of the engraver module);
  `note-identity.ts`, which names each engraved note with the identity acknowledgement reports, and
  `score-overlays.ts`, which draws the start marker, playhead band and acknowledged notes onto the
  engraved SVG (see [`docs/notation-engraving.md`](docs/notation-engraving.md)).
- `src/export/` — pure, browser-free encoders that turn a session's phrases into the bytes of one
  export file; `musicxml/` holds the generated-notes MusicXML encoder, `midi/` the generated-notes
  MIDI encoder. See [`docs/export.md`](docs/export.md).
- `src/session/` — the session engine: pure, deterministic, Vue/browser-free logic that turns a
  running session's timed events (audio time in seconds, carried on each event, never read from a
  clock) into generation requests, fit checks, read-ahead phrases, the struggling notice and the
  end, plus the runner that executes those requests through the injected `generate` seam. See
  [`docs/session-engine.md`](docs/session-engine.md).
- `src/audio/` — the audio transport, and the only place allowed to use Web Audio (see Runtime
  Constraints): the app's one `AudioContext`, created on the player's click, the look-ahead
  scheduler and its Web Worker wake-up timer, the click and count-in, and the mix gains. See
  [`docs/audio-transport.md`](docs/audio-transport.md).
- `src/composables/` — in-memory session/UI coordination (`use-generation-session.ts`,
  `use-notation-coordinator.ts`, `workspace-session-result.ts`, and `viewport-width.ts`, the
  injected window-width seam): no persistence, no singletons.
- `src/components/**` — Vue presentation components, props-in/events-out; `src/components/workspace/`
  holds the root session composition (`create-workspace-session.ts`, with the `matchMedia` width
  provider in `browser-viewport-width.ts`) and the workspace component tree (see [`docs/phrase-workspace.md`](docs/phrase-workspace.md)).
- `src/styles/` — the production Tailwind 4 styling authority (`theme.css`, `components.css`,
  `index.css`, `fonts.css`), consumed by application code; `ui_ux/versions/v1/ui_common.css` is a frozen design
  reference, not buildable production styling.
- `tests/unit` — Vitest/Vue Test Utils unit, component, and property-based coverage, mirroring
  `src/`'s structure. `tests/unit/boundaries/` checks the browser-API rules of `eslint.config.js`
  and `scripts/verify-boundaries.mjs`; it is type-checked with the Node config
  (`tsconfig.node.json`) because it imports the `.mjs` script.
- `tests/fixtures/boundaries/src/` — small source files laid out like `src/` (`audio/`, `midi/`,
  `other/`) that call the restricted browser APIs on purpose. They sit outside `src/`, so the real
  lint and boundary scan never treat them as application code; the boundary unit tests lint and
  scan them as if they were in `src/`.
- `tests/fixtures/musicxml/` — the MusicXML export's golden files and the vendored MusicXML 4.0
  schema (with an XML catalog for offline validation); see [`docs/testing.md`](docs/testing.md).
- `tests/fixtures/midi/` — the generated-notes MIDI export's golden files; see
  [`docs/testing.md`](docs/testing.md).
- `tests/e2e/{workspace,release,workspace-harness}` — Playwright suites: `workspace/` exercises the
  production preview build directly; `release/` exercises release-readiness journeys (determinism,
  errors/retry, concurrency, profile switch, theme isolation, persistence/optional-scope absence,
  offline) mostly through the workspace harness; `workspace-harness/` is the harness's own entry
  point (`main.ts`) and DI-seam wiring, built by `vite.workspace-harness.config.ts`.
- The notation harness (`tests/e2e/notation/`, `tests/e2e/notation-harness/`,
  `vite.notation-harness.config.ts`) isolates notation engraving, layout, and visual-baseline
  checks from the full workspace.
- `src/midi/` — reserved for the Web MIDI code, and the only place allowed to use that API (see
  Runtime Constraints). No code lives there yet.
- `scripts/` — `verify-boundaries.mjs`, the deterministic boundary/precache verifier.
- `public/licenses/` — vendored full license texts for every runtime third-party component,
  copied into `dist/licenses/` at build time; see [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).
- `docs/` — ATD-linked business-intent atoms plus narrative docs (architecture, notation,
  generation latency, the phrase workspace, the session engine, the audio transport, and
  `docs/release/*`).
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
- **Forbidden everywhere, `src/audio/` and `src/midi/` included:** browser storage
  (`localStorage`, `sessionStorage`, `indexedDB`, and the Cache API `caches`), the network
  (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`), cookies
  (`document.cookie`), the microphone and camera (`navigator.mediaDevices`, `getUserMedia`), and
  media-element playback (`new Audio(...)`). State stays in memory for the session only, and
  nothing is sent over the network.

Two checks enforce these rules independently, and a use in the wrong place fails both:
`eslint.config.js` (`no-restricted-globals` / `no-restricted-properties`, with an override block
for each of `src/audio/` and `src/midi/`), run by `npm run lint`, and the source scan in
`scripts/verify-boundaries.mjs`, run by `npm run verify:boundaries`. In the running app,
`tests/e2e/release/optional-scope-absence.spec.ts` checks that no audio context is created and no
MIDI access is requested before the player clicks Start or "Connect controller" (neither button
exists yet, so today no interaction may do either), that the microphone is never requested, and
that no request leaves the page's origin.

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
    -> session engine (src/session/: pure timed-event engine; its runner uses the same Worker)
    -> audio transport (src/audio/: the one AudioContext, look-ahead scheduler, click, mix)
    -> notation (lazy VexFlow engraver, loaded on demand)
```

- **UI.** `App.vue` builds one root `WorkspaceSession` for the tab's lifetime via
  `createWorkspaceSession` (or, in a test/harness, via the injected `WORKSPACE_SESSION_FACTORY`
  seam). `WorkspaceShell`, `WorkspaceHeader`, `ScorePanel`, `ControlPanel` and its four control
  groups are props-in/events-out around that one session.
- **Session composables.** `createGenerationSession` owns the session's state machine (`idle` /
  `generating` / `notating`, exactly one operation at a time, prior-result retention on failure)
  and exposes explicit actions; `create-workspace-session.ts` wires it to a `generate` seam, a
  `notate` seam driven by `createNotationCoordinator`, and the profile-switch policy adapter.
- **Session engine.** `src/session/` decides, as pure logic, what a running practice session
  requests, shows and ends, from timed events that each carry their audio time: phrase 2 requested
  at start and due when the count-in ends, each later phrase due at the start of the last measure
  of the one sounding, the failure ladder (three carry-in retries, one standalone retry, then a
  repeat of the phrase before), the struggling-generator notice, and settings locked at start.
  `createSessionRunner` executes its requests; `composeWorkspaceSession` binds it to the same
  `generate` seam, and so the same Worker, the Idle flow uses. Nothing starts a session yet: the
  session screen is still to come. See [`docs/session-engine.md`](docs/session-engine.md).
- **Audio transport.** `src/audio/` holds the app's one `AudioContext`, created only by `unlock()`
  inside the player's Start or "Connect controller" click and never suspended or closed. A
  look-ahead scheduler, woken every 25 ms by a Web Worker timer, plans sound 200 ms ahead on the
  audio clock: the quarter-note click with beat 1 accented and the one-measure count-in, which
  sounds even with the click off. The mix is four gains (click and backing, each on/off and
  volume) whose ranges come from the `--mix-*` design tokens, and Stop fades a per-session bus out
  over 0.1 s. The workspace session exposes it as `WorkspaceSession.audio`; nothing calls
  `unlock()` yet. See [`docs/audio-transport.md`](docs/audio-transport.md).
- **Web Worker.** Every generation request runs off the main thread in one long-lived module
  `Worker` behind a typed, correlated request/response protocol
  (`src/generation-worker/generation-worker-protocol.ts`), which re-validates every field crossing
  the wire through the same domain constructors/parsers the orchestrator uses, and deep-freezes the
  result.
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
  re-engraving.
- **Note acknowledgement.** `src/domain/acknowledgement/` decides, as pure logic, which expected
  notes of the phrase a player's notes acknowledge: exact concert pitch, inside a timing window on
  the audio clock, with the played onset corrected for latency. Its only output is a list of note
  identities. Nothing calls it yet: MIDI input and the live session are still to come. See
  [`docs/midi-acknowledgement.md`](docs/midi-acknowledgement.md).

- **Export.** `encodeGeneratedNotesMusicXml` (`src/export/musicxml/`) turns a session's phrases,
  each with its number, its `WrittenPhrase` and its tempo, into one score-partwise 4.0 MusicXML
  document in the instrument's written pitch. `encodeGeneratedNotesMidi` (`src/export/midi/`) turns
  the same phrases, each with its number, its concert timeline and its tempo, plus the backing's
  notes when asked, into one type 1 Standard MIDI File at 960 MIDI ticks per quarter note: a
  conductor track (tempo map, one marker per phrase), the generated line at concert pitch, and the
  optional backing track. Both are pure functions with no caller yet: the Review screen and the
  download come later. See [`docs/export.md`](docs/export.md).

See [`specs/generator-architecture.md`](specs/generator-architecture.md) for the full seam-by-seam
architectural contract and [`docs/phrase-workspace.md`](docs/phrase-workspace.md) for the
workspace's component tree, session wiring, state map, and Worker protocol in detail,
[`docs/session-engine.md`](docs/session-engine.md) for the session engine, and
[`docs/audio-transport.md`](docs/audio-transport.md) for the audio transport.

## First-Release Verification Matrix

| Gate                                    | Command                                 | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | What it proves                                                                                                                                                                                                                 |
| --------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Install reproducibility                 | `npm ci`                                | Lockfile-only dependency installation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | The committed lockfile alone reproduces the dependency tree.                                                                                                                                                                   |
| Formatting                              | `npm run format:check`                  | Authored app, tests, scripts, config, and `docs/release`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Source is Prettier-formatted; no unformatted diff can land.                                                                                                                                                                    |
| Static analysis                         | `npm run lint && npm run typecheck`     | Flat ESLint (including the boundary `no-restricted-*` rules) and strict TypeScript/Vue                                                                                                                                                                                                                                                                                                                                                                                                                                    | No lint violations (including the optional-scope/persistence lint mirror) and no type errors.                                                                                                                                  |
| Unit/component/property                 | `npm run test:unit`                     | Vitest across `tests/unit/**`: domain logic, composables, components, worker handler                                                                                                                                                                                                                                                                                                                                                                                                                                      | Domain rules, session state machine, and component contracts hold, including property-based coverage (e.g. `planner-validator-property.spec.ts`) and the byte-identical generation-outcome golden fixture.                     |
| Production artifact                     | `npm run build`                         | Strict typecheck, then the static browser bundle and generated PWA files                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The app builds cleanly and emits `dist/` plus `dist/sw.js`.                                                                                                                                                                    |
| Persistence/PWA/optional-scope boundary | `npm run verify:boundaries`             | Authored `src/**`: forbidden persistence/network/microphone identifiers, and Web Audio/Web MIDI outside `src/audio/`/`src/midi/`; `vite.config.ts`'s `runtimeCaching: []`; every `dist/assets/*.{js,css,woff2}` present in the `dist/sw.js` precache manifest; per-chunk minified-size budgets for `dist/assets/*.js` (entry 200 kB, `generation.worker` 150 kB, `vexflow-engraver` 800 kB, other 100 kB)                                                                                                                 | No authored persistence, network or microphone API, and no Web Audio/Web MIDI outside its directory; the offline precache is complete, including the lazy engraver and Worker chunks; no chunk has grown past its size budget. |
| End-to-end journeys                     | `npm run test:e2e`                      | Playwright, Chromium only, against the production preview (port 4173) and the workspace harness (port 4175): startup, generate/regenerate, viewports, portrait notice, target size, focus visibility, reduced motion, theme, unsupported-rhythm blocking, plus the `tests/e2e/release/` journeys — deterministic replay, errors and retry, concurrent-operation prevention, written-key/instrument-profile switching, profile switch, theme isolation, persistence absence, optional-scope absence, and offline-and-fonts | The full player-facing workflow behaves correctly end to end, including states (in-flight generation, forced generation/notation failures) that only the harness's deterministic seams can force.                              |
| Automated accessibility (a11y)          | `npm run test:a11y`                     | Playwright + `@axe-core/playwright` against the empty shell, post-generation in Light and Dark, the unsupported-rhythm state, and (via the workspace harness) the in-flight-generation, generation-failed, and notation-failed states                                                                                                                                                                                                                                                                                     | No detectable axe violations in each covered UI state; not a full manual conformance claim.                                                                                                                                    |
| Notation visual baselines               | `npm run test:notation`                 | Playwright against the notation harness (port 4174) and the production preview: engraving elements, calibration, key-signature spelling, the staff layout (split below 64rem, one system from it up, the two typed layout failures, the height budget), and pixel-baseline snapshots (`tests/e2e/notation/notation-visual.spec.ts-snapshots/`)                                                                                                                                                                            | Engraved notation matches its recorded visual baseline and the documented layout/legibility policy.                                                                                                                            |
| ATD structure/link coverage             | `npm run atd:lint && npm run atd:check` | `docs/*.atom.md` structure and `@spec-link`/`@test-link` coverage for the current diff                                                                                                                                                                                                                                                                                                                                                                                                                                    | Documentation atoms are well-formed and source/test traceability is maintained.                                                                                                                                                |

`npm run quality` runs all of the above (format, lint, unit, build, boundaries, e2e, a11y,
notation, ATD) in one sequence. See [`docs/release/release-checklist.md`](docs/release/release-checklist.md)
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

| Ref                                                              | Severity | Summary                                                                                                                |
| ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| [ISS-007](issues/Ref_20260930_ledger_lines_keep_vexflow_grey.md) | Medium   | Ledger lines keep VexFlow's own `#444` stroke, so they ignore the staff colour and have low contrast in the dark theme |
| [ISS-006](issues/Ref_20260929_every_stem_drawn_up.md)            | Medium   | Every stem is drawn up, high notes included, which also makes each staff system about two spaces taller                |
