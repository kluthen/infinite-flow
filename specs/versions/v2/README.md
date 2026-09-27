# v2 — Rolling Phrase

Status: consolidated into the master spec (2026-09-27). The individual topic documents that were
drafted 2026-09-26 are archived; [master-spec.md](master-spec.md) is now the authoritative,
ID-free description of v2.0 through v2.3, ready to hand to `coding-leader` and, later, `ux-writer`.

**Serves:** P2, the Speed Builder, first. P1 gets its real-time goal (reading notes as they come).
P3 gets session review and export. See [personas](../../personas.md).

## Documents

| Document                                | Purpose                                                                                                        | Status            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------ |
| [master-spec.md](master-spec.md)         | The consolidated, ID-free master spec for v2.0–v2.3: concept, scope, mechanics, definition of done, open items | master spec v1.5   |

The original draft topic documents (highlights proposal, rolling phrase, audio and backing, MIDI
and acknowledgement, sessions/review/export, adaptive tempo, definition of done,
questions-for-user) are archived verbatim at
[../../archive/v2/](../../archive/v2/README.md), each with a note pointing to the master-spec
section that now carries its content.

## Status snapshot (2026-09-27)

Settled scope is below and unchanged. The topic documents mark each item settled or `(proposed)`.

- **Settled (D104): O75, the v2.0 cut line.** v2.0 is the full core loop, MIDI included; chord-fit
  and played-note review move to v2.1, adaptive tempo to v2.2.
- **Settled (D105): O34, the continuation boundary.** Carry-in is limited to the last pitch (with
  leap state), the register window, the final chord and the phrase number. Every join starts
  with a fresh attack on beat 1; no tie or rest crosses a join in v2.0.
- **Settled (D76): O54, audio unlock.** One "connect controller" click unlocks audio and MIDI
  together; before it, a MIDI note cannot start a session.
- **Settled (D77): O55, controller check.** v2.0 ships it: play a shown note, and the app reports
  any constant offset and how to fix it.
- **Settled (D78): O41, acknowledgement window.** 150 ms early to the later of 200 ms late or the
  note's end; exact pitch, octave included; ties count once; chords match on the expected note.
- **D79** notes that v3's "my instrument" should inherit the controller check's (D77) detected
  offset instead of asking again every session.
- **Settled (D80–D88, 2026-09-27 batch):** leap recovery carries across a join (D80); a tense
  note at a join may resolve onto the join's last note, full v1 resolution only where the music
  truly stops (D81); `Varying` register resolves once per session (D82); planner authority
  deferred to v3 (D83); tempo shapes only the clock, never material (D84); one-bar count-in for
  both start types, backing is a synthesized renderer, click on by default, timeout arms on the
  first note played (D85); only note-on counts as MIDI activity (D86); v2 stays Chromium-only
  (D87); history/review/export defaults (both timeline and reproduction inputs stored, both
  session and favorites exportable, whole-phrase favorites, confirm before discarding unexported
  favorites, chord symbols and optional backing in exports, no session-length cap) (D88).
- **Overrides (2026-09-27 batch, not the proposed default):** a hidden tab now **ends the
  session immediately**, like Stop, instead of pausing (**D89**); v2.0 expects a **single** MIDI
  input, with a picker if more than one is connected, instead of merging inputs (**D90**).
- **Substantive modification (2026-09-27 batch): O39 → D91.** The settings UI is locked for the
  entire session, not only the instrument selector — there is no manual mid-session editing at
  all. Only automatic sources (the new **O77** mutation flag, or adaptive tempo O67) can change
  settings mid-session, still applied at the next phrase boundary, and reflected in the UI
  without highlight, scroll or screen-shift.
- **Narrowed (D103): O77.** Scope, magnitude and the invalid-combination rule are settled: every
  setting except instrument selection and tempo is eligible; each mutation shifts one by at most
  one grade in either direction; landing on an unsupported combination re-mutates until a
  supported one is found. Still open: the exact cadence ("every few phrases") and whether the
  flag defaults on or off.
- **Settled (D92): O42, played pitch in the live view.** On a successfully matched note, the
  **expected note** lights up (theme colour, e.g. green), with no other decoration. The played
  pitch itself is never rendered — this keeps the no-mismatch-hint principle (D22/D52) intact.
- **Settled (D93): O64, played notes in the review.** Generated notes are always shown. Played
  notes are optional, on a toggle, unquantized and neutral, and may indicate which notes matched
  the script — an appreciation, not a score.
- **Settled (D94–D97, D99, D100–D102, second 2026-09-27 batch):** look-ahead and failure ladder
  confirmed as proposed (D94); the rolling display ships two switchable modes, fixed and
  scrolling (D95); event identity confirmed as proposed (D96); the v1 workspace stays outside
  sessions, largely unchanged, with a short list of additions (D97); harmonic horizon stays
  phrase-by-phrase in v2.0, with the multi-phrase arc confirmed for v2.2 (D99); latency
  calibration stays tuned constants for v2, with a player calibration step moved to **v3**, not
  v2.1 (D100); adaptive tempo (v2.2) uses a flat +5 BPM every 2 phrases, no longer tied to O24 or
  to matching performance, resetting to the starting tempo on Stop/Start (D101, D102).
- **Settled (D108): O24, the chord-fit check.** Kept (D52 stands); judged per measure by pitch
  class (full definition in [master-spec.md §9](master-spec.md#9-the-end-of-measure-chord-fit-check));
  "blue"/passing chromatic notes that don't resolve onto a chord tone get no signal, by design;
  and it fires **only** when the player deviates from the written phrase in that measure — never
  on a measure played exactly as written. It ships in its own release, **v2.3**, after played-note
  review/export and the O77 flag (v2.1) and adaptive tempo (v2.2).
- **Settled (D107): O77's release is v2.1.**
- **Settled (D109, from `ux-writer`'s design kickoff): a failure-ladder repeat phrase is never
  visibly marked in the review**, though it's still recorded internally.
- **Settled (D110, from `ux-writer`'s design kickoff): the v2.2 multi-phrase tension arc is a
  player-facing opt-in**, with its own toggle, not an invisible generation behavior.
- **Settled (D111–D126, from the owner's answers to ux Q23/Q24/Q26/Q29 and their follow-ups):
  controller connection and session start.** A controller connects only between sessions; one lost
  mid-session is shown clearly, reattaches automatically if the same device returns, and the
  session ends 30 s after the loss otherwise. Between sessions, an unplugged controller keeps its
  selection and the same device reattaches by itself too (D125). A Start click while the selected
  controller is away begins a controller-less session: the device is not reattached during it and
  reattaches by itself afterwards; a controller still away when a session ends keeps its selection
  into the Review; the selection does not survive a page reload (D126). Only phrase 1's first note, at its exact pitch,
  starts a session from MIDI, and it only starts the count-in, which is shown as well as heard.
  Full rules in [master-spec.md §6–§8](master-spec.md#8-midi-input-and-note-acknowledgement).
- Open: 9 questions across the register, including O84 (starting a session from the Review);
  none is currently flagged ★ (all 5 most-blocking ones are settled). See [open-questions.md](../../open-questions.md) and
  [master-spec.md §12](master-spec.md#12-open-questions-carried-forward).

## Settled scope

- **Rolling phrase.**
  - The finite phrase becomes a rolling one: the app keeps generating the next item.
  - v2 continues from the app's **own** generated material. This is the simpler form of the
    continuation mechanism that v3 extends to player material.
  - The pressure is real but mild.
- **MIDI acknowledgement.**
  - A MIDI controller is supported.
  - The app acknowledges a played note **only when it is the expected note**. There is no
    mismatch hint.
  - The app keeps track of everything played. When a measure's time is up, it checks whether
    what was played fits that measure's chord, and if so acknowledges that the player kept that
    part of the contract.
  - Embellishing and trying out improvisation are welcome, as long as the notes suit the chord.
    What "fits" means, judged per measure by pitch class, is settled (D108; see
    [master-spec.md §9](master-spec.md#9-the-end-of-measure-chord-fit-check)); it ships in v2.3
    and fires only when the player deviates from the written phrase.
- **Backing playback.** This is the product's first audio.
  - It plays a bass line and block chords that follow the generated harmony, in pitch and on the
    beat, with an optional click and a mute/volume control. Rudimentary is acceptable.
  - It plays only while a session is running, and keeps playing through the player's silences.
  - There is no generated lead-line playback.
- **Sessions.**
  - A session starts on the first MIDI input or a Start click.
  - With a controller, it ends after more than 30 s without input or on a Stop click. Without a
    controller, only Stop ends it.
  - While a MIDI player is silent, the phrase keeps scrolling, because they may be catching their
    breath or recovering after losing track.
- **Last-session review and export.**
  - At the end, the player reviews the last session (what was displayed and what was played) and
    marks what they liked.
  - Export formats are MusicXML and MIDI. Export ships with the v2.0 review (D104).
  - The user considers this "not urgent, but must come soon": it is instrumental for working with
    gimmicks and leitmotifs.
- **Played-note privacy.**
  - Played notes belong to the player and are never sent anywhere.
  - For the review they are held in memory for the last session only.
  - An export includes played notes only if the player chooses it.
- **Adaptive tempo (nice to have, v2.2).**
  - An opt-in checkbox for players working on reading and playing speed.
  - While it is on, the BPM rises on a flat, unconditional schedule — +5 BPM every 2 phrases,
    up to 240 — independent of what the player plays (D101). It no longer depends on O24; a
    performance-linked version is deferred to v3+.
- **Guiding principle** (product-wide; see [far vision](../../vision/far-vision.md)): acknowledge
  and encourage, never penalize, grade, rank or score. Anything adaptive is opt-in and visible.

## Access model

v2 has a **single local user**, with no accounts, roles, permissions or sharing. Whoever uses the
page can do everything. Played notes and session history never leave the player's system except
through an export the player triggers (D64, D69).

## Direction, not yet scoped

- **Embellishment and style-figure flags** are expected in v2 or v3. They may overlap with v1's
  rhythmic variety setting or complete it, and variety may become selective rates (for example
  "embellishment at 20%").
- **A generation action reachable from the notation-error states**, replacing instrument-profile
  switching as the de-facto escape from a recurring notation error. The user's view (2026-09-26):
  switching instrument to get a new phrase "makes little to no sense from the user's point of
  view when he doesn't change instrument." Not designed here — `ux-writer` owns the actual action
  and copy once it is scheduled. See `ui_ux/open-questions.md` Q16, which stays open.
- **Lexicon popups on music-theory terms.** Every music-theory word shown in the UI (control
  labels, option values, notation terms) becomes hoverable/clickable and opens a popup with its
  entry from the project lexicon (`docs/music/lexicon.md`: the popup text, with the plain
  definition and the app-specific meaning on demand). Needs a `ux-writer` pass (trigger,
  placement, touch behavior, accessibility) before implementation; no UI change was made in v1.
- **Unsupported rhythm settings: simpler message, clearer controls.** The user's view (2026-09-26):
  the v1 notice ("This mix of note density, silence, and syncopation can't form a four-bar phrase
  yet. Try …") should become simpler, along the lines of "try another combination of settings".
  Today it names only three of the four settings involved, since rhythmic variety also decides
  what is blocked, and it never suggests changing variety. The settings that combine this way
  (rhythmic variety, note density, silence density, syncopation) should be marked differently in
  the UI, with a hint that changing them changes how the phrase is composed. Not designed here:
  `ux-writer` owns the copy and the marking once it is scheduled. The v1 domain rule
  (`rule_unsupported_rhythm_settings_block_generation`) asks the notice to suggest a nearby
  supported change, so dropping the suggestion would need that atom updated too.

## Not in v2

- MIDI-seeded continuation from a played motif: v3.
- Persistence, reviewing earlier sessions, and "my instrument": v3.

## Depends on

- **The v1.0 gate** (see [v1](../v1/README.md)), especially instrument templates that carry
  their own transposition (ISS-003). v2's MIDI matching has to compare played pitches with
  expected pitches in the right transposition.
- **Early building blocks:** see [prerequisites.md](../prerequisites.md), being drafted.

## Open questions

- **O47, O48, O49** are governance/later-version questions, unrelated to v2's own scope. Full
  text is in the [register](../../open-questions.md).
- **O57, O68, O69, O71** are the remaining research-track questions. **O77** (settings-mutation
  flag) is narrowed by D103, and its release is settled at v2.1 (D107) — but its cadence and
  default state are still open. Full text is in
  [open-questions.md](../../open-questions.md) and [master-spec.md §12](master-spec.md#12-open-questions-carried-forward).
- Every other question originally registered here (O10, O24, O33, O35–O39, O41–O46, O50–O56,
  O58–O67, O70, O72–O76) is now **settled** — see the status snapshot above and the
  [decisions log](../../decisions.md).

## Glossary

One canonical term per concept. "Flow mode", used in the highlights proposal, means a
**session**.

- **Session:** one continuous run of rolling phrases with backing, from Start (or the first MIDI
  note) to Stop or the inactivity timeout.
- **Phrase:** one generated four-bar unit, as in v1. A session is an ordered sequence of phrases,
  each with a 1-based **phrase number** (`phraseOrdinal`).
- **Rolling phrase:** the v2 behaviour of phrases arriving one after another during a session.
- **Join:** the boundary between two consecutive phrases.
- **Carry-in:** the read-only data one phrase hands to the next across a join.
- **Look-ahead phrase:** the next phrase, generated while the current one sounds.
- **Deadline:** the moment a look-ahead phrase must be generated and engraved by: the start of
  the current phrase's last bar.
- **Controller:** a MIDI input device. A **controller session** is a session while a controller
  is attached.
- **Controller check:** the step that detects a constant pitch offset between the controller and
  the instrument template.
- **Instrument template:** the v1.0 instrument definition carrying range and written
  transposition (D56, D57).
- **Expected note:** a fresh attack in the generated line. A tie continuation belongs to its
  attack.
- **Played note:** a note-on received from the controller, stored as concert pitch.
- **Note acknowledgement:** the quiet positive signal that a played note matched an expected
  note.
- **Chord-fit acknowledgement:** the end-of-measure positive signal that what was played fit the
  harmony, fired only when the player deviated from the written phrase (D108, v2.3).
- **Harmony span:** the part of a measure governed by one harmony event (a whole bar, or half a
  bar when `startBeat` is 2).
- **Backing:** the bass and block chords rendered from the harmony. It is not a generated voice.
- **Click:** the metronome sound. **Count-in:** the bar(s) of click before a session's first
  phrase (D85). There is no pause/resume in v2.0 (D89): a hidden tab ends the session outright.
- **Review:** the view of the last session after it ends. **Favorite:** a phrase the player
  marked in the review.
- **Export:** a MusicXML or MIDI file download that the player triggers.
- **Adaptive tempo:** the opt-in option that raises the tempo on a flat, unconditional schedule
  while it is on (D101) — not tied to how the player plays.
