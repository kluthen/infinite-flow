# v2 — Rolling Phrase

Status: consolidated into the master spec (2026-09-27; master spec v1.24, 2026-09-30, D170). The
individual topic documents that were
drafted 2026-09-26 are archived; [master-spec.md](master-spec.md) is now the authoritative,
ID-free description of v2.0 through v2.3, ready to hand to `coding-leader` and, later, `ux-writer`.

**Serves:** P2, the Speed Builder, first. P1 gets its real-time goal (reading notes as they come).
P3 gets session review and export; marking favorites is v3 (D130). See [personas](../../personas.md).

## Documents

| Document                         | Purpose                                                                                                        | Status            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------- |
| [master-spec.md](master-spec.md) | The consolidated, ID-free master spec for v2.0–v2.3: concept, scope, mechanics, definition of done, open items | master spec v1.24 |
| [build-plan.md](build-plan.md)   | The build plan: v2.0–v2.3 cut into ordered chunks, each with its atoms, tests and blockers                     | draft v0.3        |

The original draft topic documents (highlights proposal, rolling phrase, audio and backing, MIDI
and acknowledgement, sessions/review/export, adaptive tempo, definition of done,
questions-for-user) are archived verbatim at
[../../archive/v2/](../../archive/v2/README.md), each with a note pointing to the master-spec
section that now carries its content.

## Status snapshot (2026-09-29)

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
  D168 refines the cut between two close notes: the boundary is the later of 150 ms before the
  second onset and the halfway point, so every window contains its own onset.
- **D79** notes that v3's "my instrument" should inherit the controller check's (D77) detected
  offset instead of asking again every session.
- **Settled (D80–D88, 2026-09-27 batch):** leap recovery carries across a join (D80); a tense
  note at a join may resolve onto the next phrase's first note (D81; D158 corrects the "join's
  last note" wording), with full v1 resolution only where the music truly stops, reopened as O97
  (D158) and replaced by D167 (a session's last phrase may end with something still owed);
  `Varying` register resolves once per session (D82); planner authority
  deferred to v3 (D83); tempo shapes only the clock, never material (D84); one-bar count-in for
  both start types, backing is a synthesized renderer, click on by default, timeout arms on the
  first note played (D85); only note-on counts as MIDI activity (D86); v2 stays Chromium-only
  (D87); history/review/export defaults (both timeline and reproduction inputs stored, both
  session and favorites exportable, whole-phrase favorites, confirm before discarding unexported
  favorites, chord symbols and optional backing in exports, no session-length cap) (D88). Its
  favorite defaults no longer apply to v2: favorites moved to v3 (D130).
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
  confirmed as proposed (D94); the rolling display's two switchable modes, fixed and scrolling
  (D95), are superseded by ux D71: one display, two alternating staff systems, nothing scrolling,
  no mode toggle (D164); event identity confirmed as proposed (D96); the v1 workspace stays
  outside sessions, largely unchanged, with a short list of additions (D97); harmonic horizon stays
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
- **Changed (D129, owner via `ux-writer`, ux D66): export by content.** For either scope (whole
  session, or favorites, a scope D130 then removed), the player exports the generated notes (one MusicXML or MIDI file, as
  before, the default), the played notes (one MIDI file only, unquantized, original velocity, same
  tempo map and phrase markers as the generated MIDI so both line up in a DAW), or both (two
  separate files). This replaces the opt-in played-notes track inside the one MIDI file. v2.0
  exports generated notes only; played notes and "both" arrive in v2.1. Opens **O86** (what makes
  a favorite "exported"). Keeping sessions stays later than v2 (ux D67): see
  [v3](../v3/README.md#keeping-sessions-candidates-not-committed).
- **Changed (D130, owner via `ux-writer`, ux D68, ux D69): favorites move to v3, one export
  action per content.** The review has no favorites; every export covers the whole session;
  starting a new session from the review asks no confirmation (closing or reloading still
  discards everything without asking). The review offers one export action for the generated
  notes (MusicXML or MIDI) and one for the played notes (MIDI), one file each; "both" means using
  both. The played-notes action is unavailable when the session holds no played note. **O86**
  is deferred to v3 with favorites ([v3](../v3/README.md#favorites-v3-scope-to-be-settled)).
- **Settled (D131–D133, owner via `ux-writer`'s unit-2 session review, ux D72–D74).** The app
  holds a screen wake lock for the whole session and releases it at the end; a refused or missing
  lock is silent (D131, v2.0). The count-in always clicks, even with the click turned off; the
  click setting governs the session from phrase 1 on (D132). A staff-only session view is not v2:
  it is placed in v5 (D133). Opened **O87** (the lock dropped mid-session) and **O88** (the click
  volume during the count-in).
- **Settled (D134, owner, ux D84): O88 closed.** The count-in plays at the click volume, and the
  click volume control never reaches silence (turning the click off is the on/off switch's job
  alone), so the always-clicking count-in is always audible.
- **Settled (D135–D137, owner via `ux-writer`'s play-session decisions, ux D87, D89, D90).** No
  session starts while a generation failure is being reported at Idle, even over a kept phrase
  (D135). A session ended during the count-in goes back to Idle with phrase 1 on screen, no review
  opens, and the previous review is not restored (D136). The app asks for a landscape lock during
  a session, silently refused if the browser won't grant it, and a phone or tablet turned to
  portrait ends the session like Stop (D137, v2.0). Opened **O89** (a portrait-shaped view
  without turning the device).
- **Settled (D138, owner, ux D94): O89 closed.** A session ends like Stop (during the count-in,
  back to Idle) whenever the staff can no longer be shown: the view becomes portrait-shaped below
  the desktop breakpoint, whether or not the device was turned (split screen, resized window), or
  the staff layout held since Start can no longer be engraved at its legibility floor at the new
  width. Any other viewport change keeps the session running, re-engraved at the new width.
  Opened **O90** (whether a session can start while the staff is not shown).
- **Settled (D139–D141, owner, ux D98, D79, D93, D100): O90 closed.** No session starts while the
  staff is not shown (D139). Every state in which no session starts at Idle is listed in one
  place: no phrase yet, a new phrase being generated, a phrase that cannot be drawn, a generation
  failure being reported, unsupported rhythm settings, the staff not shown; the starting note is
  named exactly when playing it would start a session (D140). During a session a look-ahead
  phrase must fit the held staff layout, fixed at Start by the window's width alone; a misfit is a
  failed attempt that takes the normal retries, and a phrase is repeated only when every attempt
  fails (D141).
- **Settled (D142–D143, owner, ux D104, D105).** Below the tablet-landscape width the staff must
  fit the window's height as well as its width (with the session's cue row, browser toolbars
  showing); a window too short for it at the legibility floor blocks a start and ends a running
  session like Stop (D142). A viewport change during a session also re-checks material already
  checked and waiting to be drawn, and ends the session like Stop if any of it no longer fits
  (D143). No new open question.
- **Settled (D144–D146, owner, ux D107–D109): three changes to v1 at Idle.** A staff that cannot
  be shown for lack of space (too narrow, or too short below the tablet-landscape width) shows a
  plain notice with no retry action, not a notation error (D144). A phrase whose notes do not fit
  a window that has room for the staff is replaced with the normal fresh-seed retries, as in a
  session; only when every retry fails does the notice show (D145). Below the tablet-landscape
  width the `Sixteenth` note density is unavailable: phrases generate with `Eighth`, and a
  `Sixteenth` chosen while the window was wider is kept (D146). Opened **O91** (the density when
  the window crosses that width, at Idle and in a session, plus its interactions with unsupported
  rhythm settings and the mutation flag) and **O92** (which phrase the notice keeps).
- **Settled (D147–D150, owner, ux D110, ux D112): O91 and O92 closed.** The density a phrase is
  generated with follows the window's width when that phrase is generated, at Idle and in a
  session; a phrase on screen or already checked is never regenerated for it, and the history
  records each phrase's density (D147). Unsupported rhythm settings are judged on that density;
  a session that has generated with `Eighth` keeps it until it ends, never stepping back up, so
  item 11 holds mid-session (D148). The notice always clears to a new phrase (D149). The v2.1
  mutation flag treats `Sixteenth` as unavailable below that width (D150). Opened **O93** (the
  mutation flag in a session generating with `Eighth`, v2.1) and **O94** (the notice clearing
  under unsupported rhythm settings).
- **Settled (D151–D152, owner, ux D114, ux D116): O94 closed.** When the notice clears while the
  rhythm combination is unsupported, no phrase is shown and generation stays blocked until the
  settings change, with the unsupported-rhythm alert showing (D151). When the notice shows
  because every retry was too dense, a wider window, a changed setting or regenerating by hand
  starts a fresh round of retries; the first phrase that fits clears it, a failed round leaves
  it, and a narrower window starts nothing (D152). Opened **O95** (such a change landing on
  unsupported rhythm settings).
- **Settled (D153–D154, owner, ux D117, ux D118): O95 closed.** While the notice shows because
  every retry was too dense, a change that makes the rhythm combination unsupported starts no
  round, and the notice gives way to no phrase with the unsupported-rhythm alert, as when it
  clears under unsupported settings; nothing is generated by itself once the combination is
  allowed again (D153, O95's named alternative, not its proposal). A phrase already on screen
  still stays when a rhythm setting makes the combination unsupported, as in v1. A wider window
  while a round runs starts nothing: the round carries on, and if it fails the notice stays
  until the next change (D154). Opened **O96** (which note density a round's later attempts use
  when the window crosses the tablet-landscape width during the round).
- **Settled (D155–D156, `ux-writer` under the owner's delegation, ux D119, ux D120, ux D121): O96
  closed** with its proposal. Each attempt of a round of retries takes its note density from the
  window when it is generated; a widening that makes the rhythm combination unsupported stops the
  round and gives way to no phrase with the unsupported-rhythm alert, and a narrowing steps the
  remaining attempts down to `Eighth` (D155). At Idle, a phrase on screen that stops fitting while
  the combination is unsupported gives way to no phrase with the alert, not to the notice; a
  window with no room still shows the notice (D156).
- **Corrected (D157–D163, `spec-writer` under the owner's rule for minor issues, from the gaps
  `documentalist` found while drawing ATD atoms from v1.18):** a join made without carry-in (the
  failure ladder's standalone phrase, or a repeat) is not smoothed and settles nothing owed
  (D157); a phrase generated with carry-in may end owing a leap recovery or a tense note's
  resolution (D158); the review shows every phrase that started sounding (D159); a look-ahead
  phrase already partly on screen is never discarded for a setting change (D160); applying a
  setting change at a phrase boundary ships in v2.1 with the settings-mutation flag (D161); v2.0
  records played notes without showing them (D162); the struggling notice stays until a newly
  generated phrase starts sounding (D163). Opened **O97** (a session's last phrase ending with a
  leap recovery or a tense note owed), **O98** (the multi-phrase tension arc's mechanics and
  default, v2.2) and **O99** (adaptive tempo while the controller is lost, and its default, v2.2).
  Master spec v1.19.
- **Corrected (D164–D166, `spec-writer` under the owner's rule for minor issues, from
  inconsistencies `coding-leader` found while writing the v2 build plan):** ux D71's two
  alternating staff systems supersede D95's two switchable display modes, so there is no mode
  toggle (D164); the MuseScore check of the MusicXML export covers the two transposing templates
  with `<transpose>` and the C keyboard without it, since only two of the three templates
  transpose (D165); the session-start wording below follows master spec §6 (D166). Nothing newly
  opened. Master spec v1.20.
- **Settled (D167, the owner's answer to O97, 2026-09-29):** the carry-over between phrases is
  kept, and a session's last phrase, in the review and the export, may end with a leap recovery or
  a tense note's resolution still owed, as it may be cut off mid-phrase; the same holds before the
  failure ladder's standalone phrase or a repeat. Master spec v1.21.
- **Settled (D168, the owner's decision on the acknowledgement window, 2026-09-29):** the
  boundary between two consecutive expected notes is the later of 150 ms before the second onset
  and the halfway point between the two onsets, so every window contains its own onset and an
  on-time note always matches; windows include both ends, and a phrase's last expected note is
  bounded by the next phrase's first the same way. Master spec v1.22.
- **Settled (D169, from ux D137 under the owner's delegation of unit 6, 2026-09-30; closes
  O84):** at every session end once phrase 1 has sounded, a fresh phrase is generated from the
  current settings; the next session's phrase 1 is the phrase on screen when it starts, first
  generated fresh at that end. Master spec v1.23. Its start from the Review was replaced by D170.
- **Settled (D170, the owner's decision, 2026-09-30; ux D143):** one leaves the Review before
  starting a new session. While the Review shows, no session starts, by the Start click or any
  note, the starting note included; leaving keeps it reachable until the next session starts,
  and only that start discards it. Master spec v1.24.
- Open: 13 questions across the register, including O87, O93, O98 and O99 (above);
  O86 (what makes a favorite "exported") is still open but now belongs to v3 (D130);
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

- **O47, O48, O49** are governance/later-version questions, unrelated to v2's own scope. Full
  text is in the [register](../../open-questions.md).
- **O57, O68, O69, O71** are the remaining research-track questions. **O77** (settings-mutation
  flag) is narrowed by D103, and its release is settled at v2.1 (D107) — but its cadence and
  default state are still open. Full text is in
  [open-questions.md](../../open-questions.md) and [master-spec.md §12](master-spec.md#12-open-questions-carried-forward).
- **O84** (starting a session from the Review) was settled 2026-09-30 (D169, from ux D137); its
  start from the Review was replaced the same day by the owner (D170).
  **O86** (what makes a
  favorite "exported", opened by D129) moved to v3 with favorites (D130).
- **O87** (the screen wake lock dropped mid-session, D131) is a small v2 gap, carried in
  [master-spec.md §12](master-spec.md#12-open-questions-carried-forward); it does not block v2.0.
  **O88** (the click volume during the count-in, D132) was settled the same day (D134).
- **O89** (a portrait-shaped view without turning the device, D137) was settled the same day
  (D138). **O90** (starting a session while the staff is not shown, D138) was settled the same
  day too (D139).
- **O97** (a session's last phrase ending with a leap recovery or a tense note owed) was settled
  by the owner on 2026-09-29 (D167). **O98** (the multi-phrase tension arc's mechanics and
  default) and **O99** (adaptive tempo while the controller is lost, and its default) block only
  those v2.2 behaviours. Both are carried in
  [master-spec.md §12](master-spec.md#12-open-questions-carried-forward).
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
