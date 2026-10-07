# v3.0 Storage — Grounding Research

Status: research v1 (2026-10-07)

Prepared by a grounding researcher for `spec-writer`, for the v3.0 "storage" spec session. It
reports facts and does not decide design. Proposals appear only in the last section and are
marked as such.

**Scope taken as given** (D211, and D212 if written): local persistence of settings; "my
instrument" (input kind, range, transposition, fed by v2's controller transposition check); review
of earlier sessions (kept played notes need explicit opt-in and deletion); favorites (mark
phrases, export favorites only); keeping sessions (pin, access older sessions, optional comment);
pre-generating up to 4 phrases at Idle; a stray-note filter. Data stays on the player's system:
browser storage, or a file export the player triggers.

**Read for context:** [v3 README](README.md#v30--storage),
[open questions](../../open-questions.md) (O86, O107–O111, O117),
[v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy) and
[§13](../v2/master-spec.md#13-access-model), [personas, context of use](../../personas.md#context-of-use).

**Words used here.** _Persist_: keep something after the page is reloaded or the browser is
closed. _Origin_: the scheme, host and port of a web address (`https://infinity.upsilon-hub.com`
is one origin, `http://localhost:5173` another); browsers keep each origin's stored data apart.
_Schema_: the agreed shape of stored data, with a version number so a later app can read what an
older app wrote. _Eviction_: the browser deleting a site's stored data on its own, usually when the
disk runs short.

---

## Part A — What the code has today

All paths are relative to the repository root. Sizes marked "measured" were obtained on
2026-10-07 by generating phrases through the real generation worker runtime outside the browser
(the same JSON round trip `npm run replay:phrase` uses) and measuring `JSON.stringify` lengths, in
bytes, for seeds 7919–39595; they are indicative, not a benchmark.

### A1. Everything v3.0 would save, where it lives, how long it lives

Today **every item below lives in memory only** and is gone on reload. Nothing in `src/` calls a
storage API (see A3).

#### Generation settings and the musical profile

| What | Type and file | Created / held | Lifetime today | Size |
| --- | --- | --- | --- | --- |
| The 14 generation controls: tempo, written tonal center, collection, harmonic motion, tension, note density, rhythmic variety, syncopation, silence density, contour, register, leapiness, arpeggio chaos, instrument profile id | `GenerationControls`, `src/domain/controls/generation-controls.ts`; built and validated by `makeGenerationControls` | `state.controls` in `createGenerationSession` (`src/composables/use-generation-session.ts`), initialised from `DEFAULT_GENERATION_CONTROLS` (`src/domain/controls/profile-selection.ts`) | Page | 331 bytes as JSON (measured) |
| Musical profile preset and whether it was customized | `ProfileSelection { musicalProfile: 'Neutral' \| 'Jazz', isCustom }`, `src/domain/controls/profile-selection.ts`; presets are `PROFILE_BUNDLES` | `state.profileSelection`, same composable | Page | < 50 bytes |
| Presentation theme | `ThemePreference = 'System' \| 'Light' \| 'Dark'` in `PresentationSettings`, `src/composables/generation-session-types.ts` | `state.presentation.theme` | Page | trivial |

- **Tempo is one of the 14 controls**, even though tempo never affects generation.
- **D146 is already satisfied by the data model.** `state.controls` keeps the value the player
  chose (a `Sixteenth` stays `Sixteenth`); the density a phrase is generated with is derived at
  request time by `resolveGeneratedControls(state.controls, readNoteDensityContext())`. Saving
  `state.controls` saves the chosen value.
- **Validation is strict.** `makeGenerationControls` and `validateControlValue` throw on any value
  outside the closed catalogs, with no fallback or default. A saved value that a later version
  removes from a catalog would make loading throw unless a migration handles it.

#### Tempo, audio mix and other controls

| What | Type and file | Held by | Lifetime today | Size |
| --- | --- | --- | --- | --- |
| Audio mix: click on/off, click volume, backing on/off, backing volume | `AudioMix`, `src/audio/audio-mix.ts`; range checks `validateClickVolume`, `validateBackingVolume` | the audio transport, `currentMix()` / `updateMix()` in `src/audio/audio-transport.ts`; first-load levels from design tokens `--mix-*-default` in `src/styles/theme.css`, read by `readAudioMixDesign` | Page | < 100 bytes |
| "During a session" options: `Vary settings`, `Tension across phrases`, `Rising tempo` (adaptive tempo) | booleans in the session controller's state, `src/components/workspace/workspace-session-controller.ts` (`varySettings`, `tensionAcrossPhrases`, `adaptiveTempo`), surfaced by `src/components/workspace/use-session-options.ts` | session controller | Page ("off at load, kept from one session to the next, never persisted", per their atoms) | trivial |
| Tempo the last adaptive-tempo session reached | `lastSessionReachedTempo: number \| null`, same controller | session controller | Page | trivial |
| Review preferences: generated-notes format, backing track in the MIDI file, `Played notes` switch | `format: Ref<GeneratedNotesFormat>` (`'musicxml' \| 'midi'`), `backingTrack`, `playedNotesShown` refs in `src/components/workspace/use-review-host.ts` | review host | Page | trivial |

#### Instrument profile and transposition

- **Type:** `InstrumentProfile { kind, id, displayName, concertRange { minMidi, maxMidi },
  registerWindows, transposition { chromatic, diatonic } }` in
  `src/domain/profile/instrument-profile.ts`. Transposition is open data (two integers, checked as
  a consistent pair). `makeInstrumentProfile` and `parseInstrumentProfile` validate a profile from
  plain data.
- **Templates:** three adopted profiles in one table, `FIRST_RELEASE_PROFILE_TABLE` in
  `src/domain/profile/instrument-profiles.ts`: C MIDI keyboard (48–72, +0/+0), B-flat tenor
  saxophone (46–70, +14/+8), E-flat alto saxophone (51–75, +9/+5). The player picks one through
  `controls.instrumentProfileId`; the default is `bb-tenor`.
- **The id set is closed.** `InstrumentProfileId` is a literal union derived from that table, and
  `makeGenerationControls` rejects any other id. `getInstrumentProfile`
  (`src/domain/generation/generation-intent.ts`) looks the profile up by id. The generation worker
  rebuilds the profile from the id and checks the received intent is deep-equal to the rebuilt one
  (`rebuildGenerationWorkerIntent` / `parseGenerationWorkerIntent`,
  `src/generation-worker/generation-worker-inbound.ts`). **Consequence:** a player-described
  instrument (own range or transposition) cannot today cross the worker boundary, be named in a
  replay key, or be recorded in a session history; all three would need a schema change.
- **Lifetime:** page. Size: about 0.3 KB as JSON, but each `GenerationIntent` embeds the full
  profile object.

#### The controller transposition check result

- **Logic:** `judgeTranspositionCheck` in `src/domain/controller-check/transposition-check.ts`
  returns `TranspositionCheckReport`: `{ kind: 'match' }`, `{ kind: 'octaves', offset }` or
  `{ kind: 'semitones', offset, suggestedProfile }` (offset in semitones, played minus expected).
- **Where it lives:** nowhere durable. It is recomputed by `SheetStateBody.vue`
  (`src/components/controller-connection/`) from the connection sheet's stage
  `{ kind: 'check', device, played }` (`connection-sheet-model.ts`). When the sheet moves on or
  closes, the result is gone; no other part of the app reads it.
- **The offset is never applied.** Played notes are compared at the exact concert pitch received;
  no input-transposition setting exists in code. "My instrument" fed by the check would be the
  first consumer of the result.
- **The selected controller** (`MidiDevice { id, name, manufacturer }`,
  `src/midi/midi-controller-state.ts`) is also kept in memory only; atom
  `rule_same_controller_reattaches` (STABLE) says no selection survives a reload, and a test
  checks it (A2).

#### The session record and the last-session review

- **Type:** `SessionHistory` in `src/session/session-history.ts`: an object with methods
  (`record`, `recordPlayedNote`, `recordAcknowledgement`, `phrases()`, `tempoReached()`), plus
  `startedAt` (epoch ms, from an injected wall clock) and `instrumentProfileId`. The object itself
  is not storable; its records are plain data.
- **One record per sounded phrase:** `SessionHistoryRecord { phraseNumber, startedAt, outcome:
  SuccessfulOutcome, intent: GenerationIntent, tempo, isRepeat, repeatOf?, acknowledgements:
  ExpectedNoteIdentity[], playedNotes: RecordedPlayedNote[] }`.
  - `intent` is the reproduction input: request id, seed, controls, written tonal center, musical
    profile, the full instrument profile, register intent and the optional carry-in.
  - `outcome` is the generation outcome as shown: `result` (request id, seed, the concert-pitch
    timeline), `provenance` (harmony, rhythm, tension binding) and `diagnostics` (search windows).
  - `RecordedPlayedNote { pitch, velocity, onsetAt, releaseAt }`. `onsetAt`, `releaseAt` and the
    record's `startedAt` are `AudioTime`, seconds on **this page's audio clock**: they only mean
    something relative to each other, not across reloads.
- **Created:** at session start; fed by the engine's outputs. **Held:** as
  `state.review = { history, showing, tempoReached }` in the session controller
  (`src/components/workspace/session-review-state.ts`: `openedReview`, `closedReview`,
  `shownReview`). **Lifetime:** until the next session starts or the page reloads.
- **What the review and export actually read** from a record: `outcome.result` (timeline),
  `outcome.provenance.harmony` (chord symbols) and `intent` (tonal context, transposition, range),
  through `notationInputFromOutcome` (`src/domain/notation/notation-input.ts`),
  `src/session/session-history-export.ts` and `src/export/generated-notes-file.ts`. They do not
  read `provenance.rhythm`, `provenance.tensionBinding` or `diagnostics`.

**Size per phrase (measured, no carry-in):**

| Part | Neutral, Quarter (default) | Jazz, Sixteenth |
| --- | --- | --- |
| `intent` | 1.35 KB | 1.38 KB |
| `outcome` as recorded today | 37–38 KB | 193–228 KB |
| of which `result.timeline` | 1.6 KB | 4.5 KB |
| of which `provenance.harmony` | 1.7 KB | 1.7 KB |
| of which `provenance.rhythm` + `tensionBinding` | 20 KB | 59 KB |
| of which `diagnostics` | 15 KB | 127 KB |
| Replay key (`ifk1.`) | 236–237 characters | 267–268 characters |

A carry-in adds to `intent` and the key; it was not measured.

**Size per session (estimate).** A phrase is 4 measures of 4/4 = 16 beats: 16 s at 60 BPM, about
10.7 s at the default 90 BPM, 4 s at 240 BPM. Sessions run 5–30 min (personas). A 30-minute
session is about 170 phrases at 90 BPM and 450 at 240 BPM.

| What is kept per phrase | 30 min at 90 BPM, Neutral | 30 min at 240 BPM, Jazz Sixteenth |
| --- | --- | --- |
| Record exactly as held today | about 6.5 MB | about 95 MB |
| Timeline + harmony + intent only (what review and export read) | about 0.8 MB | about 3.4 MB |
| Played notes (about 70 bytes each, e.g. 2 notes/s) | about 0.25 MB | about 0.25 MB |

There is no cap on session length (v2 §7), so a session can exceed these figures.

#### The phrase replay key (`ifk1.`)

- **Format:** `ifk1.` + unpadded base64url of the UTF-8 JSON of a 7-tuple: request id, seed, the
  14 controls in a fixed order, musical profile, custom flag, phrase number, carry-in or null.
  Instrument profile, register intent and concert tonal center are rebuilt from those, not stored.
- **Code:** `encodePhraseReplayKey` in `src/generation-worker/phrase-replay-key.ts`;
  `decodePhraseReplayKey` in `src/generation-worker/phrase-replay-key-decode.ts`, which validates
  through the same `rebuildGenerationWorkerIntent` the worker uses. Atom `module_phrase_replay_key`.
- **Created:** once per accepted phrase, printed to the console (`console.info`); never stored,
  never sent.
- **Versioning:** the `ifk1.` prefix is the version; the decoder rejects any other version. The key
  holds **no app version or commit**, so a later generator may replay an old key differently. That
  is why a kept session must keep its timeline, not only its key (as
  `rule_session_history_keeps_timeline_and_inputs` already requires in memory).
- A key cannot name a custom instrument (closed `instrumentProfileId`, see above).

#### Exports (MusicXML and MIDI)

- Built on demand from the review's history: `buildGeneratedNotesFile` (MusicXML score-partwise
  4.0, or a type-1 Standard MIDI File, with an optional backing track) and `buildPlayedNotesFile`
  (played notes, MIDI only), loaded lazily through `src/export/load-generated-notes-export.ts`.
- Delivered by `downloadFile` in `src/export/browser-download.ts`: a Blob behind an object URL
  and a temporary `<a download>` click. Nothing is kept afterwards.
- File names: `infinite-flow-{YYYY-MM-DD}-{HHmmss}-generated.musicxml|.mid` and `…-played.mid`
  (`exportFileStem`, `src/export/export-file.ts`).
- **One-way.** The files carry standard musical content only: no seeds, intents, acknowledgements,
  replay keys or app version (MusicXML names the software "Infinite Flow" with no version). A
  session cannot be rebuilt from them, so a v3 "export everything / import it back" would need a
  new, app-specific file format.
- Every export covers the whole session today; there is no favorites scope.

### A2. What enforces or tests "nothing is saved" today — all of this will have to change

#### Code gates (part of `npm run quality`)

1. **ESLint**, `eslint.config.js`: `forbiddenPersistenceApis` (`localStorage`, `sessionStorage`,
   `indexedDB`, `caches`) is banned as a global and as a `window.` / `globalThis.` property in
   every file of `src/`, `src/audio/` and `src/midi/` included (`boundaryRules`). `document.cookie`
   is banned too (`alwaysForbiddenProperties`). Spec-linked to `rule_ephemeral_session_state`,
   `specification_ephemeral_state_verification`, `rule_session_data_never_sent_or_stored`.
2. **Boundary script**, `scripts/verify-boundaries.mjs` (`npm run verify:boundaries`):
   `forbiddenPersistence = /\b(localStorage|sessionStorage|indexedDB|caches)\b/` fails any `src/`
   file with "ephemeral-state boundary: browser persistence API found"; `document.cookie` is in
   `alwaysForbidden`. It also requires `runtimeCaching: []` in `vite.config.ts` and a complete
   precache manifest (these concern the PWA and need not change).
3. **Their unit tests and fixtures:** `tests/unit/boundaries/eslint-boundaries.spec.ts` (the
   `storageCalls` probes and "a storage call is rejected even inside src/audio/ and src/midi/"),
   `tests/unit/boundaries/verify-boundaries.spec.ts` (same), fixtures
   `tests/fixtures/boundaries/src/audio/storage.ts` and `tests/fixtures/boundaries/src/midi/storage.ts`.
4. **Gap, for information:** neither gate bans `navigator.storage` (OPFS, `persist()`) or
   `cookieStore`; only the end-to-end spy below watches those.

The existing pattern for "allowed in one directory only" (Web Audio only in `src/audio/`, Web MIDI
only in `src/midi/`, `directoryScopedApis` in the script and per-directory override blocks in ESLint)
is a ready model if storage is to be allowed in one place only.

#### Tests

| Test | What it asserts today | Effect of v3.0 |
| --- | --- | --- |
| `tests/e2e/release/persistence-absence.spec.ts` › 'no customized control, generated phrase, or instrument profile survives a reload' | storage empty; after reload the preset is Neutral, register Middle, instrument B-flat tenor | Breaks with saved settings and "my instrument" |
| same file › 'a retryable generation failure does not survive a reload' | storage lengths are 0 | Behaviour likely still true; the storage-length checks break |
| same file › 'the PWA precache exists and holds only immutable static assets…' | Cache Storage holds only static files | Still valid if app data does not go in Cache Storage |
| `tests/e2e/workspace/theme.spec.ts` › 'nothing about the theme choice persists across a reload' | theme back to System; localStorage and sessionStorage empty | Breaks if the theme is a saved setting |
| `tests/e2e/review/review-navigation.spec.ts` › "reloading the page discards a Review showing / kept behind review-link" | after reload no review; `localStorage.length + sessionStorage.length` is 0 | Breaks with review of earlier sessions (depends on O117) |
| `tests/e2e/review/review-privacy.spec.ts` (v2.0 chunk 20 item 13) | an in-page spy wraps Storage writes, `indexedDB.open/deleteDatabase`, `caches.open/delete`, Cache writes, the `document.cookie` setter, `cookieStore`, `navigator.storage.getDirectory` and `navigator.storage.persist`, and expects **zero calls**; the end state must have both Storage areas empty, no IndexedDB database, no cache, no cookie, no service worker | Breaks with any storage. Its network half and "played notes only in the played-notes file" half stay meaningful; the storage half must become "only allowed data, played notes only after opt-in" |
| `tests/unit/session/session-history-export.spec.ts` › 'touches no browser storage and makes no network request' | traps `localStorage`, `sessionStorage`, `indexedDB`, `caches`, `fetch`, … during a recorded session and its export | Stays valid if the history and export modules stay storage-free and saving happens in a separate layer |
| `tests/e2e/review/review-opens.spec.ts` › 'the Review has no favorites: no control or text to favorite, star or save a phrase' (`FAVORITE` regex) | no favorite wording anywhere in the review | Breaks with favorites |
| `tests/e2e/controller/controller-status.spec.ts` › 'after a page reload no controller is remembered…' | reload forgets the selected device | Breaks only if v3 remembers the controller device |
| `audio-transport-mix.spec.ts`, `midi/midi-input.spec.ts`, `release/deterministic-replay.spec.ts` (reload-based determinism tests) | the same run gives the same result after a reload | Re-check: they assume a reload returns to defaults |

Each Playwright test runs in a fresh browser context with empty storage (W16), so tests will not
leak saved data into one another; seeding saved data for a test needs explicit setup
(`storageState` can include IndexedDB since Playwright 1.51, W17).

#### ATD atoms (`docs/*.atom.md`) that state "nothing is saved"

STABLE atoms are on the contract surface (`contract_infinite_flow_first_release`, version 1.8).
That contract says weakening or removing a listed guarantee needs a **MAJOR** version bump with
explicit human confirmation.

| Atom | Status | What it states that v3.0 contradicts |
| --- | --- | --- |
| `req_last_session_review` | **STABLE, contract** | "Only the most recently completed session's review exists; no other session can be reviewed. The review has no favorites and no per-phrase action." |
| `rule_optional_midi_privacy` | **STABLE, contract** | "Played notes exist only in memory, for the current session and its review. They are never written to any browser storage." |
| `rule_same_controller_reattaches` | **STABLE, contract** | "The kept selection lives in memory only and does not survive a page reload." (only if v3 remembers the device) |
| `vision_infinite_flow_first_release` | STABLE | Lists as "out of scope through v2": persistence of anything across a reload; favorites and favorites-only export; reviewing any session but the most recent; remembering a controller, its transposition offset or its latency. Scoped to v2, so it needs a v3 revision rather than a reversal. |
| `rule_ephemeral_session_state` | REVIEW | User and session state stays in memory; never written to or restored from localStorage, sessionStorage, IndexedDB or user-state cache entries. Only the immutable asset precache is allowed. |
| `specification_ephemeral_state_verification` | REVIEW | Verification that no controls, phrase, presentation preference, operation state or retryable error returns in a later browser session. |
| `rule_session_data_never_sent_or_stored` | REVIEW | Nothing about a session (generated material, played notes, acknowledgements, settings, history) is written to any browser storage; "by construction, not by policy". The never-sent half stays. |
| `rule_new_session_discards_review` | REVIEW | "Closing or reloading the page discards everything without asking." Also: next session discards the review without confirmation (O86 / favorites may change this). |
| `rule_session_history_keeps_timeline_and_inputs` | REVIEW | "The history exists in memory only." |
| `service_session_history` | REVIEW | History is a pure in-memory recorder; nothing about it, start time and instrument id included, is written to storage. |
| `req_rolling_practice_session` | REVIEW | "Nothing about it survives a page reload." |
| `req_adaptive_tempo`, `module_session_adaptive_tempo_control` | REVIEW | The adaptive-tempo choice and reached tempo are not kept across a reload. |
| `module_session_vary_settings_flag`, `module_session_tension_across_phrases_flag` | REVIEW | Flags are "never persisted". |
| `rule_sixteenth_unavailable_below_tablet_width` | REVIEW | "No setting survives a page reload, so the kept value lasts as long as the page." |
| `module_review_played_notes_lane` | REVIEW | The `Played notes` switch is never stored and is gone on reload. |
| `module_review_export_pipeline` | REVIEW | History, review, file, and the format and backing choices are in memory only; nothing stored. |
| `service_idle_generation_session` | REVIEW | Never persists or restores user or session state; "no storage API is part of the interface". |
| `rule_instrument_profile_range` | STABLE, contract | Fixes the three profiles' exact ranges and windows. Not about storage, but "my instrument" with a player-set range touches it and `entity_instrument_profile` (REVIEW). |

`rule_ephemeral_session_state` is also a parent or dependency of `req_four_measure_phrase`,
`service_workspace_session_flow` and the two flag modules, so its revision ripples there.
`rule_single_local_user` (DRAFT: one local user, no accounts) is not contradicted, but saved data
makes "whoever has the page open" also "whoever uses that browser profile".

#### Other places that say "nothing is saved"

- `docs/release/browser-and-offline-limits.md`, section "Browser API boundaries".
- `README.md`: the `src/composables/` description ("no persistence"), the "Forbidden everywhere"
  list, and the "Persistence/PWA/optional-scope boundary" row of the quality-gate table.
- [v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy) "Privacy is
  absolute…" and [§13](../v2/master-spec.md#13-access-model): frozen v2 documents; the v3 spec
  supersedes them rather than editing them.

#### Security headers (`docker/security-headers.conf`, `docker/nginx.conf`)

Nothing there enforces "nothing is saved". The Content-Security-Policy has no storage directive
(CSP does not govern localStorage or IndexedDB), and no `Clear-Site-Data` header is sent. The
`Permissions-Policy` names MIDI, microphone, camera and others, not storage. `connect-src 'self'`
and the lint bans on `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` keep data from leaving;
these stay unchanged. No header change is needed for IndexedDB or localStorage.

### A3. Storage APIs in use today, and the offline/PWA status

- **No storage API is used in `src/`.** A search for `localStorage`, `sessionStorage`, `indexedDB`,
  `document.cookie`, `cookieStore`, `caches`, `navigator.storage` finds none in application code
  (only in tests, gates and fixtures).
- **One thing is stored: the PWA precache.** `vite-plugin-pwa` (`vite.config.ts`, `generateSW`,
  `registerType: 'autoUpdate'`, Workbox `globPatterns` for html/js/css/woff2/png/svg/ico,
  `runtimeCaching: []`) and `registerSW({ immediate: true })` in `src/main.ts` install a service
  worker that keeps the app's static files in Cache Storage. The app works offline after one
  online load (`tests/e2e/release/offline-and-fonts.spec.ts`). The manifest has
  `display: 'standalone'`, so the app is installable.
- **Updates are silent:** a new service worker activates by itself (`skipWaiting`,
  `clientsClaim`); an open tab picks up the new version on the next navigation or reload
  (`docs/release/browser-and-offline-limits.md`). This matters for schema upgrades (B3).
- **No service worker in the dev server** (no `devOptions` in the PWA plugin config) and none on
  the workspace harness (port 4175).

### A4. What would need a schema

**Already plain, storable data.** The domain values are plain, deep-frozen objects of strings,
numbers, booleans and arrays: no classes, no `BigInt`. Intents and outcomes already cross the
worker boundary by structured clone and survive the replay script's JSON round trip. Read back
from storage they would come back as ordinary, unfrozen copies (W9), so they must go through the
existing builders again.

**Validators that already exist** (each rejects bad input and uses no defaults):

- `makeGenerationControls`, `validateControlValue`, `normalizeTempo` (controls);
- `parseProfileSelection` (musical profile; private to
  `src/generation-worker/generation-worker-inbound.ts`, not exported);
- `makeInstrumentProfile`, `parseInstrumentProfile` (instrument profiles);
- `rebuildGenerationWorkerIntent`, `parseGenerationWorkerIntent` (intents, with carry-in);
- `parseGenerationOutcome` (`src/generation-worker/generation-worker-protocol.ts`) and the timeline
  and measure parsers in `src/domain/events/` (outcomes and timelines);
- `validateClickVolume`, `validateBackingVolume` (mix levels, against the design-token range).

**No validator today:** `SessionHistoryRecord` as a whole, `RecordedPlayedNote`,
`ExpectedNoteIdentity`, the theme, the session-option flags, the review preferences, the
controller-check result.

**Versioning that exists:** the replay key's `ifk1.` prefix (decoder rejects other versions);
`GenerationIntent` carries no version; MusicXML declares `version="4.0"` of the MusicXML format,
not of the app. **Nothing records an app or data version.**

**What a schema would have to decide (facts, not choices):**

- The closed `instrumentProfileId` blocks a player-defined instrument in controls, intents, the
  worker protocol, replay keys and history records.
- `AudioTime` values in records are page-clock seconds; kept sessions need times relative to the
  session or phrase start (the exports already convert this way).
- A record as held today is mostly provenance and diagnostics nothing downstream reads (A1 sizes).
- Strict loading: any saved value no longer in a catalog makes the builder throw.

---

## Part B — Browser storage options

Sources are listed at the end (W1–W17). The app targets Chrome and Edge (Chromium) on laptop,
desktop, a Chromium tablet and occasionally an Android phone (personas).

### B1. localStorage vs IndexedDB vs OPFS for this data

| | localStorage | IndexedDB | OPFS (origin private file system) | Cache Storage |
| --- | --- | --- | --- | --- |
| Holds | Strings only (W5) | Structured objects, cloned (W6, W9) | Files (bytes) (W8) | HTTP requests and responses (W2) |
| Calls | Synchronous: blocks the main thread (W2, W5) | Asynchronous, in transactions | Asynchronous; fast synchronous handles in Workers only (W8) | Asynchronous |
| Size | About 5 MiB per origin; over it throws `QuotaExceededError` (W1) | Origin quota, up to 60% of disk in Chrome (W1) | Same origin quota (W8) | Same origin quota |
| In Workers | No (W2) | Yes | Yes | Yes |
| Versioning | None; the app writes its own version field | Built in: integer version and upgrade step (W6) | None | None |
| Visible to the player | No | No | No, by design (W8) | No |
| web.dev advice | Avoid (W2) | Default for app data (W2) | For file-based content (W2) | For network resources (W2) |

**Fit to v3.0's data (from A1 sizes):** settings, "my instrument" and favorites marks are small
(well under 10 KB) and fit any option. Sessions are kilobytes to megabytes each and grow with
pinning and history: beyond localStorage's 5 MiB, and natural for IndexedDB. OPFS targets large
file-like data (for example SQLite) and gives this data nothing IndexedDB lacks. Cache Storage
already holds the PWA precache and is meant for HTTP responses; the app's own test expects it to
hold only static files.

All of these share one origin's storage, and the browser evicts or clears an origin as a whole
(B2).

### B2. Quotas and eviction in Chrome and Edge

- **Default mode is "best-effort".** The browser may delete the data under storage pressure
  without asking. **"Persistent"** data is deleted only if the user chooses to (W1, W3, W4).
- **Quota:** each origin may use up to 60% of the disk; Chrome uses at most 80% of the disk for
  all sites (W1). `navigator.storage.estimate()` reports usage and quota (W2, W4).
- **Eviction in Chromium:** least-recently-used origins first, skipping persistent ones, and
  **the whole origin at once**, never part of it (W1). The Storage Standard requires a bucket to
  be cleared in its entirety (W4). The PWA precache and the player's saved data would go
  together.
- **`navigator.storage.persist()`** asks to make the origin persistent. Chrome and Edge **grant or
  refuse silently, with no prompt**, from the site's history: engagement, whether it is installed
  or bookmarked, whether it may show notifications (W1, W3). A refused request can be retried
  later (W3). `persisted()` tells whether it is persistent (W4).
- **Persistent does not protect against the player clearing data.** Data is "only deleted if the
  user chooses to remove it" (W3). Browsers should let users clear storage per site (W4). Clearing
  a site's data, or a `Clear-Site-Data: "storage"` response header, removes localStorage,
  sessionStorage, every IndexedDB database, service worker registrations and file-system data
  (W14), and OPFS (W8).
- **Private (incognito) windows:** localStorage behaves like sessionStorage and is cleared when the
  window closes (W5).
- Safari's 7-day deletion of script-written data (W1, W2) does not apply to this Chromium-only
  app, but would matter if iPad support ever came.

### B3. Schema versioning and migrations in IndexedDB

- A database is opened with a name and an **integer version**; a higher version than the stored
  one fires `upgradeneeded`, the only place stores and indexes can be created, changed or
  deleted. The handler gets the old and new version, so a migration runs step by step from the
  old one (W6).
- Changing an existing store's key means deleting and recreating it; the data must be read out
  first or it is lost (W6).
- **Several tabs:** while another tab holds the old version open, the upgrade is **blocked**; the
  old tab gets `versionchange` and should close its connection (W6).
- **Opening with a lower version than the stored one fails** with `VersionError` (W7). With the
  app's silent service-worker updates (A3), an old tab left open after a deploy, or a rolled-back
  deploy, meets a database a newer version already upgraded.
- localStorage has no versioning: an app writing there stores and checks its own version field.

### B4. Small wrapper libraries and their cost

| Library | What it is | Size (bundlephobia, 2026-10-07) |
| --- | --- | --- |
| `idb` 8.0.4 | Thin promise wrapper that mirrors IndexedDB; `openDB` takes `upgrade(db, oldVersion, newVersion, transaction)`, `blocked`, `blocking` and `terminated` callbacks (W10) | 3.65 kB minified, 1.49 kB gzip; its README says about 1.19 kB brotli (W10, W11) |
| `dexie` 4.4.6 | Fuller layer with a declarative schema, queries and live queries | 95.4 kB minified, 31.1 kB gzip (W11) |

**Against this repo's budgets** (`scripts/verify-boundaries.mjs`): the entry chunk budget is
224 kB (229,376 bytes) and the last local build (2026-10-05) had an entry chunk of 220,545 bytes,
about 8.8 kB of headroom. Other chunks have a 100 kB budget. Settings must be read before the first
phrase is generated, so whatever reads them likely sits in or near the entry chunk: `idb` fits,
Dexie would not fit the entry chunk. Raw IndexedDB needs no dependency.

### B5. Exporting and importing all data as a file

- **Download, as the app already does** (`downloadFile`: Blob + `<a download>`): works in every
  browser, needs no permission, cannot overwrite an existing file (W12).
- **File System Access API** (`showSaveFilePicker`, `showOpenFilePicker`): Chrome and Edge 86+ on
  desktop; Android support is reported with limitations (W12, W13); not in Firefox or Safari
  (W12). Requires a secure context and a player click (W13). File handles can be stored in
  IndexedDB, but the permission ends when the site's tabs close and the player is asked again
  next time (W12).
- **Import:** `<input type="file">` is the general way to pick a file (W12). Reading a file the
  player picks involves no network, so it fits the "data stays on the player's system" rule.
- **Format:** today's exports (MusicXML, MIDI) cannot be read back into a session (A1). A
  whole-data export would be a new, versioned, app-specific file.

### B6. Privacy considerations

- **Local by construction still holds.** Storage APIs write only to the player's own browser
  profile; the network bans (lint, boundary script, CSP `connect-src 'self'`) are untouched by
  allowing storage.
- **"Delete" is local and complete when it covers every place.** The app can remove its own data
  (`localStorage.removeItem` / `clear`, `indexedDB.deleteDatabase`); the browser's "clear site
  data" removes everything for the origin, the precache included (W14).
- **Kept played notes need opt-in and deletion** (v3 README). Keeping them would reverse the STABLE
  `rule_optional_midi_privacy` (A2).
- **Who can see it:** there are no accounts (`rule_single_local_user`), so anyone using the same
  browser profile on the device can open the app and see saved sessions and comments. The app adds
  no encryption of its own.
- **Comments on kept sessions** are new player-written text, stored where the session is.

### B7. Dev server vs deployed site (storage is per origin)

- Storage is separated by origin: scheme, host **and port** (W15). Each of these has its own,
  separate saved data:
  - production `https://infinity.upsilon-hub.com`;
  - the Vite dev server, `http://localhost:5173` by default (`vite.config.ts` sets no port);
  - `npm run preview` and the e2e preview, `http://127.0.0.1:4173`;
  - the notation harness `:4174` and workspace harness `:4175`.
- `localhost` and `127.0.0.1` are different hosts, so different origins.
- **Consequences:** settings saved while the owner tests on the dev server never appear on the
  deployed site, and the reverse. Moving production to another domain would leave every player's
  saved data behind at the old one.
- **Secure context:** `localhost` counts as secure. Opening the dev server from a tablet by a LAN
  address over plain `http` is not a secure context, so `showSaveFilePicker` (W13) and service
  workers are unavailable there.

---

## Risks and questions for the spec session

All proposed; none is a decision.

1. **Contract MAJOR bump.** v3.0 contradicts two STABLE contract atoms (`req_last_session_review`,
   `rule_optional_midi_privacy`), and a third (`rule_same_controller_reattaches`) if the device is
   remembered. Per the contract, that needs a MAJOR bump and the owner's explicit confirmation.
2. **What a kept phrase holds.** Kept as today, a 30-minute session is about 6.5–95 MB. Keeping
   timeline + harmony + intent is about 0.8–3.4 MB. Question: is dropping provenance and
   diagnostics acceptable under "exact timeline and reproduction inputs"?
3. **"My instrument" needs the closed instrument id opened up** (controls, worker protocol, replay
   key, history). Question: is "my instrument" a new profile, or adjustments on one of the three
   templates? And does a new replay-key version (for example `ifk2.`) follow?
4. **Generator drift.** Keys and intents hold no app version. A kept session must keep its
   timeline. Question: record an app or data version with every kept item?
5. **Loading old settings.** The builders throw on unknown values. Question: when a saved value is
   no longer valid, fall back to the default for that one setting, or discard everything saved?
6. **Eviction.** Best-effort storage can be deleted without warning. Question: ask for persistent
   storage (silent in Chrome and Edge), for example when the player pins a session or saves a
   favorite? Offer a backup export of kept data?
7. **Several tabs and silent updates.** Blocked upgrades and `VersionError` (B3). Question: what
   does an outdated tab do?
8. **Where storage code may live.** Proposed: keep the ban everywhere except one directory, on the
   Web Audio and Web MIDI model, and keep history and export modules storage-free so their
   "touches no storage" unit test still holds.
9. **Which settings are saved.** The 14 controls and musical profile seem clear. Unclear: theme,
   audio mix, the three "During a session" options, the review's format, backing and
   `Played notes` switch, and the last reached tempo.
10. **Opt-in and deletion granularity** for played notes: per session, global, or tied to pinning
    (the v3 README leaves it open). Also: one "delete everything" control? This meets O117 (what
    is kept in v3.0 at all) and O86 (what counts as "exported" once favorites outlive a session).
11. **Bundle headroom:** about 8.8 kB left in the entry chunk at the last build. Raw IndexedDB or
    `idb` fit; Dexie does not.
12. **Pre-generation at Idle (v3.0.1)** needs no storage if pre-generated phrases are discarded on
    reload. Question for O107–O111: are they ever saved? Proposed: no.
13. **Stray-note filter (v3.0.1)** adds one more setting to save (the threshold, if the player sets
    it), and decides whether kept played notes are stored filtered or raw.

---

## Sources

- **W1** — MDN, "Storage quotas and eviction criteria".
  <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>.
  Storage kinds; best-effort vs persistent; localStorage 5 MiB; Chrome 60% per origin and 80%
  overall; LRU whole-origin eviction skipping persistent origins; Chrome and Edge decide
  `persist()` without a prompt; Safari 7-day rule.
- **W2** — web.dev, "Storage for the web". <https://web.dev/articles/storage-for-the-web>.
  IndexedDB for app data, Cache Storage for network resources, OPFS for files; avoid
  localStorage (synchronous, about 5 MB, strings, no Workers); `estimate()`.
- **W3** — web.dev, "Persistent storage". <https://web.dev/articles/persistent-storage>. Chrome's
  heuristics for granting `persist()` (engagement, installed or bookmarked, notifications); no
  prompt; persistent data still deleted when the user chooses; Edge behaves as Chrome.
- **W4** — WHATWG, Storage Standard. <https://storage.spec.whatwg.org/>. Buckets, best-effort and
  persistent modes, `persist()`, `persisted()`, `estimate()`; a bucket is cleared in its
  entirety; user agents should let users clear storage per site.
- **W5** — MDN, "Web Storage API". <https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API>.
  Strings only, synchronous, per origin; sessionStorage per tab; localStorage in private windows.
- **W6** — MDN, "Using IndexedDB". <https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB>.
  Integer versions, `upgradeneeded`, migrations, `blocked` and `versionchange` across tabs,
  structured cloning.
- **W7** — W3C, Indexed Database API 3.0, "Opening a database connection".
  <https://w3c.github.io/IndexedDB/>. Opening with a version lower than the stored one returns a
  `VersionError`.
- **W8** — MDN, "Origin private file system". <https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system>.
  Not visible to the user; synchronous handles in Workers only; same quota; cleared with site
  data.
- **W9** — MDN, "The structured clone algorithm". <https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm>.
  Functions and DOM nodes cannot be cloned; read-only descriptors and prototypes are not kept.
- **W10** — `idb` README. <https://github.com/jakearchibald/idb>. About 1.19 kB brotli;
  `openDB` with `upgrade`, `blocked`, `blocking`, `terminated`.
- **W11** — Bundlephobia, <https://bundlephobia.com/package/idb> and
  <https://bundlephobia.com/package/dexie> (API queried 2026-10-07). idb 8.0.4: 3.65 kB min,
  1.49 kB gzip; dexie 4.4.6: 95.4 kB min, 31.1 kB gzip.
- **W12** — Chrome for Developers, "The File System Access API".
  <https://developer.chrome.com/docs/capabilities/web-apis/file-system-access>. Chrome and Edge
  86+ on desktop; Android with limitations; fallbacks `<a download>` and `<input type="file">`;
  handles storable in IndexedDB; permission lost when the tabs close.
- **W13** — MDN, "Window: showSaveFilePicker()". <https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker>.
  Secure context and user activation required; not Baseline.
- **W14** — MDN, "Clear-Site-Data". <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Clear-Site-Data>.
  `"storage"` clears localStorage, sessionStorage, IndexedDB, service worker registrations and
  file-system data.
- **W15** — MDN, "Same-origin policy". <https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy>.
  Origin is scheme, host and port; Web Storage and IndexedDB are separated by origin.
- **W16** — Playwright, "Isolation". <https://playwright.dev/docs/browser-contexts>. Each test
  has its own context with its own local storage, session storage and cookies.
- **W17** — Playwright, `BrowserContext.storageState()`. <https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state>.
  The `indexedDB` option (since 1.51) includes IndexedDB in a storage snapshot.
