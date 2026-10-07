# v2 — Rolling Phrase

Status: released as v2.0, version 2.0.0, tag pending the owner's approval (2026-10-07, D208). The
release gate, build plan chunk 21, passed; four hand checks follow the tag as v2.0.x checks.
[master-spec.md](master-spec.md) is the authoritative, ID-free description of v2, which shipped as
one release, v2.0, since D183 (its parts keep the labels v2.0, v2.1, v2.2 and v2.4; v2.3 is empty
since D174). The draft topic documents of 2026-09-26 and the milestone's working record are
archived at [../../archive/v2/](../../archive/v2/README.md).

**Serves:** P2, the Speed Builder, first. P1 gets its real-time goal (reading notes as they come).
P3 gets session review and export; marking favorites is v3 (D130). See [personas](../../personas.md).

## Documents

| Document                         | Purpose                                                                                                                 | Status            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------- |
| [master-spec.md](master-spec.md) | The consolidated, ID-free master spec for v2.0 and its parts: concept, scope, mechanics, definition of done, open items | master spec v1.39 |
| [build-plan.md](build-plan.md)   | The build plan: v2.0 cut into ordered chunks, each with its atoms, tests and blockers, and one release gate             | complete, v0.14   |

The original draft topic documents (highlights proposal, rolling phrase, audio and backing, MIDI
and acknowledgement, sessions/review/export, adaptive tempo, definition of done,
questions-for-user) are archived verbatim at
[../../archive/v2/](../../archive/v2/README.md), each with a note pointing to the master-spec
section that now carries its content.

## Status

- **Released (2026-10-07, D208).** The v2.0 gate's evidence is the table in
  [`docs/release/v2.0-release-notes.md`](../../../docs/release/v2.0-release-notes.md): 57 rows,
  48 Verified, 5 hand checks done, 4 hand checks after the tag, 0 not met. ISS-009 and ISS-010 are
  Resolved. The tag `v2.0.0` waits for the owner's approval.
- **After the tag (v2.0.x hand checks):** the USB keyboard's tuning row and controller check, the
  real-program export check in MuseScore and a MIDI tool, and the DAW line-up of the two MIDI
  files. They are listed in the release notes and in
  [master-spec.md §11](master-spec.md#11-definition-of-done); none blocks the tag (D193, D199).
- **Kept as shipped:** at 240 BPM phrase 2 is always generated standalone, so its join to phrase 1
  is never smoothed (D205). Winning that back is a v3 candidate:
  [pre-generating phrases at Idle](../v3/README.md#pre-generating-phrases-at-idle).
- The status snapshot this README kept while v2 was designed and built (2026-09-27 to 2026-10-07)
  is archived verbatim at
  [archive/v2/v2-readme-status-snapshot.md](../../archive/v2/v2-readme-status-snapshot.md).

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
  - The app keeps track of everything played.
  - Not v2 (D174): the end-of-measure check of whether what was played fits the measure's chord,
    acknowledging an embellishing or improvising player. It is a v3 nice-to-have, not committed
    scope; what "fits" means, judged per measure by pitch class and only when the player deviates
    from the written phrase, stays settled (D108; see
    [master-spec.md §9](master-spec.md#9-the-end-of-measure-chord-fit-check)).
- **Backing playback.** This is the product's first audio.
  - It plays a bass line and block chords that follow the generated harmony, in pitch and on the
    beat, with an optional click and a mute/volume control. Rudimentary is acceptable.
  - It plays only while a session is running, and keeps playing through the player's silences.
  - There is no generated lead-line playback.
- **Sessions.**
  - A session starts on a Start click, or from MIDI on the note phrase 1 starts on, at its exact
    pitch, octave included; any other note starts nothing. Full rule, including when no session
    can start at all, in [master-spec.md §6](master-spec.md#6-backing-click-count-in-and-tempo)
    (D115, D124, D166).
  - With a controller, it ends after more than 30 s without input or on a Stop click. Without a
    controller, only Stop ends it.
  - While a MIDI player is silent, the phrase keeps rolling (D164), because they may be catching
    their breath or recovering after losing track.
- **Last-session review and export.**
  - At the end, the player reviews the last session (what was displayed and what was played).
    Marking what they liked is v3 (D130).
  - Export formats are MusicXML and MIDI. Export ships with the v2.0 review (D104).
  - The export is chosen by content (D129), one action each (D130): the generated notes as
    MusicXML or MIDI, the played notes as MIDI only. Using both gives two separate files. Every
    export covers the whole session.
  - The user considers this "not urgent, but must come soon": it is instrumental for working with
    gimmicks and leitmotifs.
- **Played-note privacy.**
  - Played notes belong to the player and are never sent anywhere.
  - For the review they are held in memory for the last session only.
  - An export includes played notes only if the player chooses them as its content (D129).
- **Adaptive tempo (nice to have, v2.2).**
  - An opt-in checkbox for players working on reading and playing speed.
  - While it is on, the BPM rises on a flat, unconditional schedule — +5 BPM every 2 phrases,
    up to 240 — independent of what the player plays (D101). It no longer depends on O24; a
    performance-linked version is deferred to v3+.
  - It starts off, and pauses while a controller lost mid-session is away (D179).
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
- A staff-only session view (everything but the staff and Stop hidden): v5 (D133).

## Depends on

- **The v1.0 gate** (see [v1](../v1/README.md)), especially instrument templates that carry
  their own transposition (ISS-003). v2's MIDI matching has to compare played pitches with
  expected pitches in the right transposition.
- **Early building blocks:** see [prerequisites.md](../prerequisites.md), being drafted.

## Open questions

No v2 question is open. What stays open after v2 is in the
[register](../../open-questions.md): O47, O48 and O49 (later and governance), and O86, O100–O103
and O107–O111, which belong to v3. What v2 leaves open in plain language is
[master-spec.md §12](master-spec.md#12-open-questions-carried-forward). The notes on the questions
closed during v2 are archived with this README's former status snapshot, at
[archive/v2/](../../archive/v2/README.md).

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
  harmony, fired only when the player deviated from the written phrase (D108). Not in v2: a v3
  nice-to-have since D174.
- **Harmony span:** the part of a measure governed by one harmony event (a whole bar, or half a
  bar when `startBeat` is 2).
- **Backing:** the bass and block chords rendered from the harmony. It is not a generated voice.
- **Click:** the metronome sound. **Count-in:** the bar(s) of click before a session's first
  phrase (D85). It always clicks, whatever the click setting (D132), at the click volume, which
  never reaches silence (D134). There is no pause/resume
  in v2.0 (D89): a hidden tab ends the session outright, and so does the staff no longer being
  shown, a portrait-shaped view or a window too narrow for the staff, or too short for it below
  the tablet-landscape width (D137, D138, D142). A session ended
  during the count-in has no review (D136).
- **Review:** the view of the last session after it ends. It has no favorites in v2; marking
  favorites is v3 (D130).
- **Export:** a file download that the player triggers from the review, covering the whole
  session: the generated notes (MusicXML or MIDI) or the played notes (MIDI), one action and one
  file each (D129, D130).
- **Adaptive tempo:** the opt-in option that raises the tempo on a flat, unconditional schedule
  while it is on (D101) — not tied to how the player plays.
