# v2 — Questions for the User

> **Archived 2026-09-27.** Every question here is now either settled (see
> [versions/v2/master-spec.md](../../versions/v2/master-spec.md) and the
> [decisions log](../decisions-D72-D108.md)) or carried forward as a still-open item in
> [open-questions.md](../../open-questions.md).

Status: draft v0.1 (2026-09-26).

This is every open v2 question, grouped by when it needs an answer. Each entry gives:

- the question, in one line;
- the **proposed default**, so a plain "yes" is enough to settle it;
- **what the answer changes**;
- the document that holds its full text.

IDs are stable and listed in the [register](../../open-questions.md). Answers go to the
[decisions log](../../decisions.md) as new D-IDs when they are settled.

**All five ★ questions are now settled:**

- **O75 — v2.0 cut line (D104):** the full loop (rolling phrase, backing, sessions, MIDI
  acknowledgement, review and export). Chord-fit and played notes in the review go to v2.1,
  adaptive tempo to v2.2.
- **O34 — continuation boundary (D105):** carry-in is limited to 4 items; every join starts with
  a fresh attack on beat 1.
- **O54 — audio unlock (D76):** one "connect controller" click unlocks audio and MIDI together.
- **O55 — controller check (D77):** v2.0 ships it.
- **O41 — acknowledgement window (D78):** exact pitch, 150/200 ms window, ties count once,
  chords match on the expected note.

Group A is now fully settled except **O77** (below).

**2026-09-27 batches (D80–D108):** Group A is now fully settled except O77's cadence and default
state (release confirmed v2.1, D107). Two of the settled items are **overrides** of the proposed
default rather than confirmations (O53/D89 hidden tab, O61/D90 single input), one goes beyond the
question asked (O39/D91, full UI lock). O42 and O64 were briefly flagged as a live tension and are
now both settled (D92, D93). Group B is fully settled, including **O24**, which needed a dedicated
research pass (D98/D106) before the owner's three decision points were resolved (D108: keep the
check, ships v2.3, fires only off-script). **O67** no longer depends on O24 at all (D101 replaced
its metric with a flat schedule).

## A. Must answer before v2 spec consolidation

**Scope and generation**

- **Settled — O34, continuation boundary (D105):** the next phrase sees the last pitch with its
  leap state, the register window, the final chord and the phrase number, via a new `carryIn`
  field. It always starts with a fresh note on beat 1; no tie or rest crosses a join in v2.0.
  [rolling-phrase.md §3](rolling-phrase.md)
- **Settled — O51, leap across a join (D80):** the leap-recovery obligation carries into the
  next phrase. [rolling-phrase.md §8](rolling-phrase.md)
- **Settled — O76, resolving tense notes at a join (D81):** the v1 "resolve before the last
  note" rule applies only where the music really stops (Stop or session end). At a join, a tense
  note may resolve onto the join's last note. [rolling-phrase.md §8](rolling-phrase.md)
- **Settled — O50, register across joins (D82):** with `Varying`, the register window resolves
  once per session, not per phrase. [rolling-phrase.md §8](rolling-phrase.md)
- **Settled — O10, planner authority (D83):** deferred to v3. Carry-in only flows forward; no
  stage of a new phrase revises an earlier one. [rolling-phrase.md §3](rolling-phrase.md)
- **Settled — O36, look-ahead and failure (D94):** one phrase ahead. On failure: 3 silent
  retries, then 1 retry without carry-in, then repeat the previous phrase. After 2 repeats in a
  row, a non-blocking notice. There is never an alert dialog.
  [rolling-phrase.md §4](rolling-phrase.md)
- **Settled — O39, control changes during a session, modified (D91):** the settings UI is
  locked for the whole session, not just the instrument selector — the player's hands are on
  their instrument, not the keyboard/mouse, so there is no manual mid-session editing at all.
  Only automatic sources (the new O77 mutation flag, or adaptive tempo O67) can change settings
  mid-session, still applied at the next phrase boundary, and reflected in the UI **without**
  highlight, scroll or screen-shift. [rolling-phrase.md §5](rolling-phrase.md)
- **O77 — The settings-mutation flag's cadence and default** (scope, magnitude, the
  invalid-combination rule and release settled: D103, D107 — ships **v2.1**): every setting
  **except instrument selection and tempo** (tempo has its own flag, adaptive tempo) is eligible;
  each mutation shifts an eligible setting by **at most one grade** in either direction; if a
  mutation lands on an unsupported combination it re-mutates until it finds a supported one.
  Still open: the exact **cadence** ("every few phrases" — how many, fixed or randomized), and
  whether the flag defaults **on or off**.
  [rolling-phrase.md §5](rolling-phrase.md)
- **Settled — O52, the v1 workspace in v2 (D97):** it stays outside sessions, mostly unchanged
  from v1: Start uses the displayed phrase as phrase 1. Adds volume controls, the Start/Stop
  transport, and a few more generation flags (O77, adaptive tempo). The music sheet stays the
  dominant, most immediately visible element. [rolling-phrase.md §8](rolling-phrase.md)
- **Settled — O38, tempo as a generation input (D84):** tempo stays transport-only; it never
  shapes generated material. [audio-and-backing.md §7](audio-and-backing.md)

**Display, audio and sessions**

- **Settled — O40, rolling display behaviour (D95):** two candidate display modes ship,
  switchable by a toggle — Mode A (fixed layout, the past fades out as the next phrase sets in
  place) and Mode B (the whole display scrolls, actively played notes stay on a fixed second
  bar). At least one bar of read-ahead at all times; a playhead that follows the audio; no
  visible note ever changes. Layout, default mode and toggle placement are ux-writer's call.
  [rolling-phrase.md §6](rolling-phrase.md)
- **Settled — O44, count-in (D85):** one bar, for both kinds of start. The first MIDI note
  starts the count-in and is not matched against the phrase.
  [audio-and-backing.md §6](audio-and-backing.md)
- **Settled — O54, audio unlock (D76):** one "connect controller" click enables sound and MIDI
  together. Before that click, a MIDI note cannot start a session; browsers give no other way to
  unlock audio from a MIDI message. [audio-and-backing.md §4](audio-and-backing.md)
- **Settled — O45, backing implementation (D85):** a pure renderer from the harmony (not a
  generated voice), synthesized sound, no samples. WebAudioFont rejected (GPL).
  [audio-and-backing.md §5](audio-and-backing.md)
- **Settled — O58, click default (D85):** on, in quarter notes with beat 1 accented.
  [audio-and-backing.md §6](audio-and-backing.md)
- **Settled — O53, hidden tab, overrides the proposed default (D89):** a hidden tab now **ends
  the session immediately**, the same as Stop — not "pause and resume with a count-in." Browsers
  throttle timers in hidden pages anyway, so a paused clock could never resume cleanly.
  [audio-and-backing.md §3](audio-and-backing.md)
- **Settled — O59, timeout arming (D85):** the 30 s inactivity timer arms on the first note
  played in the session. [sessions-review-export.md §3](sessions-review-export.md)
- **Settled — O73, trailing silent phrases (D85):** yes, they stay in the review and export.
  [sessions-review-export.md §3](sessions-review-export.md)

**MIDI**

- **Settled — O55, controller check (D77):** v2.0 ships a controller check: it plays a shown
  note, and reports any constant offset and how to fix it. D72's optional input-offset field is
  added only if the Travel Sax can't be set to match.
  [midi-and-acknowledgement.md §4](midi-and-acknowledgement.md)
- **Settled — O41, acknowledgement window (D78):** from 150 ms early until the later of 200 ms
  late and the end of the note. Exact pitch, octave included. Ties count once. On a chord, the
  matching note counts. [midi-and-acknowledgement.md §5](midi-and-acknowledgement.md)
- **Settled — O42, played pitch in the live view (D92):** the live view highlights the
  **expected note** once it's been successfully matched (a theme-coloured marker, e.g. green),
  with no other decoration. The played pitch itself is never rendered — this keeps the "no
  mismatch hint" principle (D22/D52) intact.
  [midi-and-acknowledgement.md §5](midi-and-acknowledgement.md)
- **Settled — O43, event identity (D96):** phrase number + measure + event index, and a
  played-note sequence number, confirmed as proposed.
  [midi-and-acknowledgement.md §7](midi-and-acknowledgement.md)
- **Settled — O60, what counts as activity (D86):** note-ons only (velocity > 0). Breath and
  other controller messages are ignored — the owner's controller isn't accurate enough there.
  [midi-and-acknowledgement.md §3](midi-and-acknowledgement.md)
- **Settled — O61, several inputs, overrides the proposed default (D90):** v2.0 expects a
  **single** MIDI input. If more than one is connected, the player is asked to pick one — inputs
  are never merged. [midi-and-acknowledgement.md §3](midi-and-acknowledgement.md)
- **Settled — O70, browser scope (D87):** v2 stays Chromium-only.
  [midi-and-acknowledgement.md §3](midi-and-acknowledgement.md)

**Review and export**

- **Settled — O37, history storage (D88):** both the timeline and the reproduction inputs
  (request, seed, carry-in and a generator version stamp).
  [sessions-review-export.md §4](sessions-review-export.md)
- **Settled — O46, export scope (D88):** both — whole session and favorites-only.
  [sessions-review-export.md §6](sessions-review-export.md)
- **Settled — O62, favorite granularity (D88):** a whole phrase. Bar ranges come with v3
  snippet selection (D68). [sessions-review-export.md §8](sessions-review-export.md)
- **Settled — O63, discarding the last session (D88):** ask only when favorites are unexported.
  [sessions-review-export.md §8](sessions-review-export.md)
- **Settled — O66, export extras (D88):** chord symbols always in MusicXML; the backing in MIDI
  as an option, off by default. [sessions-review-export.md §8](sessions-review-export.md)
- **Settled — O72, long sessions (D88):** no cap; the review must stay responsive.
  [sessions-review-export.md §8](sessions-review-export.md)
- **Settled — O64, played notes in the review (D93):** the generated notes are always shown.
  Played notes are optional, on a toggle, unquantized with neutral colouring, and may indicate
  which notes matched the script (an appreciation, not a score).
  [sessions-review-export.md §5](sessions-review-export.md)

## B. Can wait until v2.1 or v2.2 (if O75's default holds)

- **Settled — O24, chord-fit check (D108, ships v2.3):** kept (D52's "embellishment welcome as
  long as it suits the chord" stands). Judged per measure, by **pitch class**: a measure fits
  when at least one played note is a chord tone of the harmony sounding at its onset, and every
  played note is in the phrase's scale or a chromatic note resolving onto a chord tone a semitone
  away within the next two played notes (possibly the next measure). A note's measure is decided
  by rounding its onset to the nearest sixteenth-note grid point. "Blue"/passing chromatic notes
  that don't resolve onto a chord tone get no acknowledgement — an accepted trade-off. Fires
  **only when the player deviates from the written phrase** in that measure; a measure played
  exactly as written gets only the per-note highlight (D92), never both signals.
  [midi-and-acknowledgement.md §6](midi-and-acknowledgement.md)
- **Settled — O65, played notes in the exports (D88):** MIDI only, when the player chooses. Not
  in MusicXML. [sessions-review-export.md §6](sessions-review-export.md)
- **Settled — O56, latency calibration (D100):** v2.0 uses tuned constants per connection type
  only. A player-facing calibration step is **v3**, not a v2.1 candidate (it pairs with "my
  instrument"). [midi-and-acknowledgement.md §9](midi-and-acknowledgement.md)
- **Settled — O35, harmonic horizon (D99):** phrase by phrase in v2.0, confirmed. A flag allowing
  a multi-phrase rise-and-fall arc is confirmed as v2.2 (not urgent).
  [rolling-phrase.md §8](rolling-phrase.md)
- **Settled — O67, adaptive-tempo rule (D101), overrides the proposed default:** a flat **+5 BPM
  every 2 phrases**, unconditionally — not tied to note-matching performance. This replaces the
  proposed "≥80% acknowledged adds 2 BPM" metric entirely and **decouples adaptive tempo from
  O24**. A performance-sensitive version is deferred to v3+.
  [adaptive-tempo.md §3](adaptive-tempo.md)
- **Settled — O74, tempo after an adaptive session (D102):** the control resets to the starting
  tempo on Stop or the next Start; the review shows the tempo actually reached.
  [adaptive-tempo.md §3](adaptive-tempo.md)

## C. Research or prototype needed

None of these need a decision from you — they're technical verification tasks for whoever
implements v2 (measuring, testing on real hardware, or a quick prototype), not open design
choices. Listed here only so nothing gets lost before implementation.

- **D72 verification on the Travel Sax 2** (feeds O55).
  - _To find out:_ with the device's own transpose set to C, B♭ tenor and E♭ alto, which MIDI
    note does a fingered written C send? Does octave shift change the note? What note-on
    velocity does it send?
  - _Changes:_ whether the optional input-offset field is needed.
- **O71 — Bluetooth MIDI.**
  - _Default:_ USB is the tested path, and Bluetooth is best-effort.
  - _To find out:_ does the owner's OS pair the Travel Sax over Bluetooth so that Chromium sees
    it, and how large is the jitter?
  - [midi-and-acknowledgement.md §9](midi-and-acknowledgement.md)
- **O68 — Engraving vs audio scheduling** (prototype).
  - _Default:_ a 200 ms look-ahead, with the scheduler's timer in a Worker.
  - _To find out:_ what is the longest main-thread task during a session at 240 BPM?
  - [audio-and-backing.md §8](audio-and-backing.md)
- **O69 — Latency after ISS-004** (measurement).
  - _Default:_ the cold worst case stays under 250 ms in Chromium, a quarter of the one-bar
    deadline at 240 BPM.
  - _To find out:_ re-measure, including cold runs after a mid-session control change.
  - [definition-of-done.md §5](definition-of-done.md)
- **O57 — Backing voicing** (listening test, confirmed happening later).
  - _Default:_ bass in MIDI 36–47, and chords in close position with the top note at or below
    E4, attacked on each chord change and each beat 1.
  - _Changes:_ how the backing sounds. The user has confirmed a listening-test session will
    happen for this later; no decision yet.
  - [audio-and-backing.md §8](audio-and-backing.md)
- **Acknowledgement window values** (part of O41). Tune 150 ms early and 200 ms late on the
  Travel Sax 2 and one USB keyboard.

## Related, outside the v2 topic documents

- **O49 — ATD atom lifecycle.** v2 needs these atoms amended or scoped:
  - `rule_optional_midi_privacy` (v1: "no MIDI at all");
  - `req_four_measure_phrase` (the phrase becomes a unit within a session);
  - `rule_seeded_phrase_reproduction` (carry-in joins the reproduction inputs);
  - `rule_generation_failure_alert_copy` (in-session failures never alert).

  `rule_phrase_starts_on_downbeat` and `rule_ephemeral_session_state` still hold under the
  proposed defaults. See the [register](../../open-questions.md).

- **O47 — Ornament representation** only matters if embellishment flags (N2) land in v2.2.
