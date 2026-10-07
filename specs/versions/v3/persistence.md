# v3.0 — Local Persistence

Status: draft v2 (2026-10-07). spec-writer's recommendations, approved by the owner at the
overall review (D216).

The first time Infinite Flow keeps anything across a page reload. The facts about today's code
come from [storage-grounding.md](storage-grounding.md); its sources are cited there as W1–W17.

Related documents: [kept sessions and favorites](kept-sessions.md), [my instrument](my-instrument.md),
[pre-generation at Idle](pre-generation.md), [stray notes](stray-notes.md).

## 1. Principles

- **Everything stays on the player's device.** Nothing is sent anywhere: the network rules of v2
  stay as they are (`connect-src 'self'`, no `fetch` of player data). Data leaves the device only
  through an export the player triggers.
- **Saved by construction, one place only**. Storage code lives in one directory, on the
  model already used for Web Audio (`src/audio/`) and Web MIDI (`src/midi/`); the ban on storage
  APIs stays everywhere else. The session history and the export modules stay storage-free, so
  their "touches no storage" test keeps holding; a separate layer saves what they produce.
- **The player can see and delete what is kept**: one place, "Your data", lists what
  the app keeps, how much space it uses, whether the browser protects it (§5), and offers
  **Delete everything**. Per-item deletion is specified with each item.
- **Saving never gets in the way of playing.** A failed save (storage full, browser refusal) never
  stops or delays a session. The app keeps working in memory and says so outside a running
  session (a running session never asks the player for anything; v2 rule).

## 2. What is saved automatically

Settings come back as the player left them:

| Saved | Notes |
| --- | --- |
| The 14 generation controls and the musical profile selection (preset and "Custom") | The value the player **chose**, not the one generated with: below the tablet-landscape width a chosen `Sixteenth` stays `Sixteenth` (D146; already true of the data model). |
| The theme | |
| The audio mix (click and backing, on/off and volume) | |
| The three "During a session" options (Vary settings, Tension across phrases, Rising tempo) | Still the player's opt-in: they come back on only if the player turned them on. |
| The review's preferences: generated-notes format, backing track in the MIDI file, the `Played notes` switch | |
| "My instrument" | See [my-instrument.md](my-instrument.md). |
| The most recent session, pinned sessions and favorites | See [kept-sessions.md](kept-sessions.md). Played notes only after opt-in. |

Not saved: the tempo an adaptive-tempo session reached (it belongs to that session), pre-generated
phrases ([pre-generation.md](pre-generation.md)), and anything in a running session's state.

## 3. Where and how

- **IndexedDB**, one database for the app. `localStorage` is capped at about 5 MiB, synchronous
  and string-only; kept sessions need more (storage grounding §B1).
- **Raw IndexedDB or the `idb` wrapper** (about 1.5 kB gzip). Not Dexie (about 31 kB gzip): the
  entry chunk has about 8.8 kB of headroom (storage grounding, risk 11).
- **Every stored record carries a data version and the app version that wrote it.** The phrase
  replay key and the exports hold no app version, and a later generator may replay an old key
  differently, so a kept session keeps its timeline, not only its inputs (already a v2 rule, in
  memory).
- **Upgrades migrate.** A new app version that changes the schema migrates the stored data when it
  opens the database.
- **An outdated tab stops saving**: the app updates silently (service worker,
  `autoUpdate`), so an old tab can meet a newer database. That tab keeps working in memory and
  shows a notice asking for a reload, outside a running session.

## 4. Loading saved settings

- Each saved setting is checked on its own. A value that is unknown or no longer valid falls back
  to that setting's default; every other saved setting is kept. No notice: the player sees the
  default in the control.
- Today the controls' builders throw on any unknown value, with no fallback (storage grounding
  §A1), so loading needs its own tolerant step in front of them.

## 5. Keeping the data safe from the browser

- By default a site's storage is "best-effort": the browser may delete it under storage pressure
  without warning (W1, W4).
- The app asks the browser for persistent storage (`navigator.storage.persist()`) the first time
  the player keeps something they would miss: pins a session, marks a favorite, or saves an
  instrument. Chrome and Edge grant or refuse it silently, without a prompt (W1, W3).
- "Your data" shows whether the storage is protected. The app promises nothing it cannot keep.

## 6. Storage is per address

Saved data belongs to one origin (scheme, host and port, W15). Data saved while using the dev
server never appears on the deployed site, and the reverse. Testers should know this.

## 7. A full backup file (not in v3.0)

A file holding everything the app keeps, to move it to another browser or restore it. The
MusicXML and MIDI exports are one-way: they carry no seeds, intents or app version, so a backup
needs a new, app-specific file format (storage grounding §A1). Proposed: not v3.0; recorded as a
candidate (O124, closed by D216).

## 8. What v3.0 changes in v2's guarantees

v2 promised that nothing survives a reload. v3.0 deliberately reverses that, so these must change
when v3's master spec is ingested (the full list, with test names, is in storage grounding §A2):

- **Contract atoms (STABLE):** `req_last_session_review` (only the last session, no favorites)
  and `rule_optional_midi_privacy` (played notes never stored); `rule_same_controller_reattaches`
  too if the controller is remembered ([my-instrument.md](my-instrument.md) §4). Weakening a
  contract guarantee needs a MAJOR contract version and the owner's explicit confirmation.
- **About 15 REVIEW atoms** that say "never persisted", led by `rule_ephemeral_session_state`, and
  the vision atom's "out of scope through v2" list, which needs a v3 revision.
- **Code gates:** the ESLint `forbiddenPersistenceApis` rule and `scripts/verify-boundaries.mjs`
  move from "nowhere" to "one directory only".
- **Tests:** about ten assert that nothing is saved, among them `persistence-absence.spec.ts`, the
  storage spy in `review-privacy.spec.ts` (its storage half becomes "only allowed data, played
  notes only after opt-in"; its network half stays), and the no-favorites check in
  `review-opens.spec.ts`.
- **Stays true:** nothing is sent; played notes leave the device only through the played-notes
  export; no grading, scoring or wrong-note signal.

## 9. Open

None: O124 was closed by D216 (no backup file in v3.0; a candidate), and O86 as moot
([kept-sessions.md](kept-sessions.md) §4).
