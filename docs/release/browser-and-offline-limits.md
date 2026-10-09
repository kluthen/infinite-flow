# Supported Browsers and Offline Limits

## Supported browsers

Chromium is the only supported browser. [`playwright.config.ts`](../../playwright.config.ts)
defines a single `chromium` project (`projects: [{ name: 'chromium', use: { ...devices['Desktop
Chrome'] } }]`), and [`README.md`](../../README.md) states this explicitly ("Chromium is currently
the only supported browser, and Playwright runs every browser gate in a single current-Chromium
project. Firefox and WebKit are not tested and not supported for now."). This is a decided product
scope, not an oversight: the release owner has chosen Chromium-only support for now.

The one remaining wording gap is [`specs/first_release_plan.md`](../../specs/first_release_plan.md)
Step 10's Verify clause, which still says "Playwright browser matrix" — a generic phrase left over
from when the matrix covered more than one engine. It is not itself inaccurate (Playwright is still
a matrix of test projects, now with one member), but it reads as if more than Chromium were
exercised. `specs/` is not edited as part of this step; see
[`reconciliation-report.md`](reconciliation-report.md) for this as a tracked drift item.

## Offline guarantees

The app is a PWA precached with `vite-plugin-pwa`'s `generateSW` strategy
([`vite.config.ts`](../../vite.config.ts)):

- `workbox.globPatterns: ['**/*.{html,js,css,woff2,png,svg,ico}']` precaches every built HTML, JS,
  CSS, `woff2` font, PNG, SVG, and ICO asset.
- `workbox.runtimeCaching: []` is an explicit empty array — there is no runtime network-request
  caching strategy. Everything required offline must already be in the precache; nothing is cached
  opportunistically as the user navigates. [`scripts/verify-boundaries.mjs`](../../scripts/verify-boundaries.mjs)
  enforces this at build-verification time: it fails if `runtimeCaching` is not an empty array, and
  it fails if any built `dist/assets/*.{js,css,woff2}` file (including the lazy VexFlow chunk and
  the generation Worker chunk) is missing from the generated `dist/sw.js` precache manifest.
- A navigation fallback is registered: `dist/sw.js` calls
  `registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))`, so any navigation
  request is served from the precached `index.html` once the service worker is active.

**A first online load is required.** The service worker only starts controlling the page, and the
precache only exists, after the browser has fetched and installed it once. Until then, there is no
offline fallback. `src/main.ts` registers the service worker with
`registerSW({ immediate: true })` — `immediate: true` registers on load rather than waiting for the
`window.load` event, but does not change this first-load requirement.

**Service-worker update behavior is silent, not prompted.** `vite.config.ts` sets
`registerType: 'autoUpdate'`, and `src/main.ts`'s `registerSW({ immediate: true })` call does not
pass `onNeedRefresh`/`onOfflineReady` callbacks. `vite-plugin-pwa`'s `autoUpdate` mode installs and
activates a new service-worker version automatically (`skipWaiting()` +
`clientsClaim()`, both present in `dist/sw.js`) on the next check, without asking the player to
confirm a reload — there is no "update available" prompt UI in this release. A player who keeps a
tab open across a deploy may pick up the new version on the next navigation/reload without an
explicit prompt.

Once installed, required phrase generation, notation, controls, and the current phrase work fully
offline; the master spec states this as a hard requirement (see
[`specs/first-release-master-spec.md`](../../specs/first-release-master-spec.md), Application
State section: "Required generation, notation, controls, and the current phrase remain available
offline; unavailable optional browser capabilities must not block the phrase loop.").

## Secure context requirement for production deployment

Service workers (and with them, offline mode and "Install app") only register in a
[secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
`http://localhost` and `http://127.0.0.1` qualify as secure contexts in every browser — this is why
local development (`npm run dev`, `npm run preview`) and the local Docker container (see
[`README.md`](../../README.md#run-with-docker)) both work without HTTPS. Plain `http://` on a LAN IP
or a real hostname does **not** qualify: the page loads, but `registerSW()` silently fails to
register a controlling service worker, so there is no offline fallback and no install prompt —
exactly the two guarantees this document otherwise describes. Production deployment therefore needs
HTTPS termination in front of the app (a reverse proxy such as Caddy — see
[`README.md`](../../README.md#deploying-behind-a-reverse-proxy-caddy) — or equivalent); this is
infrastructure, not something `vite-plugin-pwa` or the container image can provide on their own.

## Permissions-Policy of the production container

The container's nginx sends a `Permissions-Policy` header on every response
([`docker/security-headers.conf`](../../docker/security-headers.conf)). It allows Web MIDI for the
app's own origin (`midi=(self)`): `midi=()` would block every MIDI controller on the deployed site,
whatever site permission the player gives in the browser. Bluetooth MIDI controllers reach the
browser through the operating system's MIDI ports, so they need no Web Bluetooth. The header
disables the capabilities the app never uses: microphone, camera, geolocation, USB, serial,
Bluetooth and the Payment Request API. It names neither the screen wake lock nor fullscreen (which
some browsers require before the landscape orientation lock), so both keep their browser default,
allowed for the app's own origin; Web Audio has no Permissions-Policy feature.
[`tests/unit/deployment/permissions-policy.spec.ts`](../../tests/unit/deployment/permissions-policy.spec.ts)
checks the header's value.

## Web Worker requirement

Phrase generation runs off the main thread in a module Web Worker
(`src/generation-worker/browser-generation-worker.ts`: `new Worker(new URL('./generation.worker.ts',
import.meta.url), { type: 'module' })`), so configuration controls and the retained prior score stay
interactive while a generation request is in flight. This requires the browser to support module
workers (`{ type: 'module' }`), which current Chromium does; this is implied by, not separately
declared as, part of the Chromium-only support statement above.

## Lazy VexFlow engraving chunk

VexFlow (plus its embedded Bravura/Academico font data — the bulk of the engraving payload) is not
in the main bundle. `src/notation/vexflow-engraver-loader.ts` is the sole caller allowed to import
`./vexflow-engraver` statically; every other caller reaches it through `loadVexflowEngraver()`,
which `import()`s the module lazily and memoizes the resulting promise so concurrent or later
callers share one fetch. The chunk (`dist/assets/vexflow-engraver-*.js`, roughly 700 KB
uncompressed) is still part of the offline precache (see Offline guarantees above), so a first
online load fetches it once and it is then available offline; a failed dynamic import (for example,
mid-navigation on a flaky connection before the precache exists) surfaces as the same typed
`notation_engraving_failed` `NotationError` the adapter itself uses, and is retryable. Its size is
expected and budgeted: `vite.config.ts`'s `build.chunkSizeWarningLimit` keeps Vite's generic
size warning from firing on this one known-large chunk, and `scripts/verify-boundaries.mjs` still
enforces a hard per-chunk byte budget (800 KB for this chunk, tighter for others) as part of
`npm run verify:boundaries`.

## Minimum viewport and responsive breakpoints

Three named breakpoints are defined once in `src/styles/theme.css` (`--breakpoint-mobile-landscape:
48rem`, `--breakpoint-tablet-landscape: 64rem`, `--breakpoint-desktop: 90rem`) and consumed in
`src/styles/components.css`:

- Below `64rem` (landscape phone layout): the score always uses the split layout, two aligned
  two-measure systems (measures 1-2, then 3-4), for every phrase. Its scale fits the height as well
  as the width: the two systems share the staff frame's `max-block-size`, built from the small
  viewport height (`100svh`, browser toolbars showing) minus the row above the staff, so a toolbar
  showing or hiding never redraws the score. The staff area reserves both systems in every state;
  two systems fit at the legibility floor from about 286 px of small viewport height, and a
  shorter window shows the "staff needs more room" notice instead of the staff.
- `48rem` and up, landscape: control groups begin to wrap instead of staying in a single column.
- `64rem` and up: all four measures render in one staff system, with the second system position
  reserved below it and left blank; control groups can wrap further.
- `90rem` and up: control groups lay out fully horizontally, and this is also the width at which
  the portrait guard stops applying.
- Below `90rem` in portrait orientation (`@media (max-width: 89.9375rem) and (orientation:
portrait)` in `src/styles/components.css`), the app shows a rotate-device notice instead of the
  interactive workspace. Desktop widths at or above `90rem` remain interactive in either
  orientation.

The notation layout has its own legibility floor (`NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX` in
`src/notation/notation-layout-policy.ts`, signed off 2026-09-24 per that file's comment and
`docs/notation-engraving.md`). It never shrinks the score below the floor, splits it into more than
two systems, or scrolls or clips it. A phrase that cannot be drawn at the floor fails with one of two
typed errors: `notation_no_room` when the window is too narrow for the staff, or, below `64rem`, too
short for it, whatever the phrase; `notation_notes_too_wide` when the window has room but this
phrase's notes need more width. At Idle the workspace never shows either as the notation error: it
checks each generated phrase before drawing it, replaces a phrase whose notes are too wide with up
to three fresh-seed retries, and shows the "staff needs more room" notice when the window has no
room or no attempt fits. With no room, the notice clears by itself once the window gives the staff
room again; with notes too wide, a wider window starts a new round of attempts (see
[`docs/phrase-workspace.md`](../phrase-workspace.md#idle-fit-run-and-the-room-notice)).

## Browser API boundaries (verified by the boundary gates)

Authored code in `src/` may use Web Audio, Web MIDI and on-device storage only in one named
directory each, and never uses the network, the microphone, cookies or any other browser storage:

- **Web Audio only in `src/audio/`.** `AudioContext`, its legacy name `webkitAudioContext`, and
  `OfflineAudioContext` may be used only in files under `src/audio/`.
- **Web MIDI only in `src/midi/`.** `requestMIDIAccess` may be used only in files under
  `src/midi/`.
- **On-device storage only in `src/storage/`.** IndexedDB (`indexedDB`) and the storage manager
  (`navigator.storage`, which asks the browser to keep the app's data and reports how much space
  it uses) may be used only in files under `src/storage/`, so everything the app saves on the
  device is written in one place. `src/session/` and `src/export/` stay storage-free.
- **Forbidden everywhere, `src/audio/`, `src/midi/` and `src/storage/` included:** media-element
  playback (`new Audio(...)`), the network (`fetch(...)`, `XMLHttpRequest`, `WebSocket`,
  `EventSource`, `navigator.sendBeacon`), cookies (`document.cookie`, `cookieStore`), the
  microphone and camera (`navigator.mediaDevices`, `getUserMedia`), and the other browser storage
  (`localStorage`, `sessionStorage`, and the Cache API `caches`).

The service worker's offline precache is not authored code and is unaffected by these rules: the
Workbox settings above (`runtimeCaching: []` and the precache manifest) stay as they are.

Two independent gates enforce these rules, and a use in the wrong place fails both:

- [`scripts/verify-boundaries.mjs`](../../scripts/verify-boundaries.mjs) scans every authored
  `src/**` file and fails the boundary check if a file contains a forbidden identifier, or a Web
  Audio, Web MIDI or on-device storage identifier outside its allowed directory.
- [`eslint.config.js`](../../eslint.config.js) states the same rules as lint-time
  `no-restricted-globals`/`no-restricted-properties` rules, with an override block for each of
  `src/audio/`, `src/midi/` and `src/storage/`, so a violation is also flagged at lint time, not
  only by the separate `verify:boundaries` script.

In the running app, nothing creates an audio context or requests MIDI access before the player
clicks Start or "Connect controller", the microphone is never requested, and no request leaves the
page's origin. [`tests/e2e/release/optional-scope-absence.spec.ts`](../../tests/e2e/release/optional-scope-absence.spec.ts)
checks this across every workspace interaction. Neither button exists yet, so today no interaction
may create an audio context or request MIDI access.

These gates cover the boundaries described in
[`docs/rule_audio_unlocked_by_player_click.atom.md`](../rule_audio_unlocked_by_player_click.atom.md),
[`docs/req_on_device_storage.atom.md`](../req_on_device_storage.atom.md),
[`docs/rule_session_data_never_sent_or_stored.atom.md`](../rule_session_data_never_sent_or_stored.atom.md),
[`docs/rule_ephemeral_session_state.atom.md`](../rule_ephemeral_session_state.atom.md),
[`docs/specification_browser_only_operation_verification.atom.md`](../specification_browser_only_operation_verification.atom.md),
and [`docs/specification_ephemeral_state_verification.atom.md`](../specification_ephemeral_state_verification.atom.md).

## Known limits

- **Six unsupported rhythm settings.** Under the current rhythm grammar, these note-density +
  silence-density + syncopation combinations have no legal four-bar rhythm plan for any tension arc
  and are blocked in the UI rather than attempted: Quarter + Sparse + Active displacement, Quarter +
  Breath-heavy + Active displacement, Sixteenth + Sparse + Active displacement, Sixteenth +
  Conversational + Active displacement, Sixteenth + Breath-heavy + Occasional offbeats, and
  Sixteenth + Breath-heavy + Active displacement. See
  [`specs/first-release-master-spec.md`](../../specs/first-release-master-spec.md) and
  [`docs/rule_unsupported_rhythm_settings_block_generation.atom.md`](../rule_unsupported_rhythm_settings_block_generation.atom.md)
  for the full rule and the single domain-owned constant
  (`src/domain/controls/unsupported-rhythm-settings.ts`) that names them.
- **Search ceiling and indeterminate outcome.** Pitch search runs under a versioned, deterministic
  fuel allowance rather than a wall-clock timeout; reaching that ceiling produces the typed
  `search_limit_exceeded` outcome, which is distinct from natural exhaustion (`no_legal_pitch_plan`)
  and must never be read as proof that no legal phrase exists for the request. See
  [`docs/generation-latency.md`](../generation-latency.md) for measured cold/warm latency across all
  144 rhythm settings (median/p90/p95/max) and
  [`docs/mechanic_pitch_search_policy.atom.md`](../mechanic_pitch_search_policy.atom.md) for the
  policy itself.
