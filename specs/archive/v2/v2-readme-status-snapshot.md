> **Archived 2026-10-07.** The v2 milestone closed: the v2.0 release gate (build plan chunk 21)
> passed, and v2.0 is released as version 2.0.0, its tag pending the owner's approval. These are
> two sections of the v2 README, `specs/versions/v2/README.md`, moved here verbatim: its status
> snapshot, a running record of the v2 decisions as they were made, and its open-questions
> section, which by then listed closed questions only. The README keeps the settled scope and a
> short current status. Relative links were written from `specs/versions/v2/`; their paths were
> repaired on 2026-10-07 so they resolve from this folder.

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
  flag defaults on or off. _Settled 2026-10-03 (D176): every 2 to 4 phrases at random, seeded;
  off by default._
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
  class (full definition in [master-spec.md §9](../../versions/v2/master-spec.md#9-the-end-of-measure-chord-fit-check));
  "blue"/passing chromatic notes that don't resolve onto a chord tone get no signal, by design;
  and it fires **only** when the player deviates from the written phrase in that measure — never
  on a measure played exactly as written. It ships in its own release, **v2.3**, after played-note
  review/export and the O77 flag (v2.1) and adaptive tempo (v2.2). _Its release placement is
  replaced by D174 (2026-10-03): the check left v2 and is a v3 nice-to-have; the definition
  stands._
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
  Full rules in [master-spec.md §6–§8](../../versions/v2/master-spec.md#8-midi-input-and-note-acknowledgement).
- **Changed (D129, owner via `ux-writer`, ux D66): export by content.** For either scope (whole
  session, or favorites, a scope D130 then removed), the player exports the generated notes (one MusicXML or MIDI file, as
  before, the default), the played notes (one MIDI file only, unquantized, original velocity, same
  tempo map and phrase markers as the generated MIDI so both line up in a DAW), or both (two
  separate files). This replaces the opt-in played-notes track inside the one MIDI file. v2.0
  exports generated notes only; played notes and "both" arrive in v2.1. Opens **O86** (what makes
  a favorite "exported"). Keeping sessions stays later than v2 (ux D67): see
  [v3](../../versions/v3/README.md#keeping-sessions-candidates-not-committed).
- **Changed (D130, owner via `ux-writer`, ux D68, ux D69): favorites move to v3, one export
  action per content.** The review has no favorites; every export covers the whole session;
  starting a new session from the review asks no confirmation (closing or reloading still
  discards everything without asking). The review offers one export action for the generated
  notes (MusicXML or MIDI) and one for the played notes (MIDI), one file each; "both" means using
  both. The played-notes action is unavailable when the session holds no played note. **O86**
  is deferred to v3 with favorites ([v3](../../versions/v3/README.md#favorites-v3-scope-to-be-settled)).
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
- **Corrected (D171, `spec-writer`, from the chunk 20 preflight, 2026-10-02):** the MusicXML
  export closes every phrase but the last with a double barline and the last with a final
  barline, as the owner decided on 2026-09-29; master spec §7 had kept a double barline for every
  phrase. No new rule. Master spec v1.25.
- **Replanned (D173–D174, the owner's decisions, 2026-10-03).** The real-hardware checks leave
  the v2.0 gate for a new release, **v2.4** "real-hardware checks", placed after v2.2: the
  controller check on the reference hardware, tuning the acknowledgement windows (150/200 ms) and
  latency on it, opening real exports in MuseScore and a MIDI tool, and the playhead and
  main-thread measurements in real Chromium (former v2.0 items 6, 9 and 15, and part of 12).
  **v2.0 can ship before them**, with its timing constants untuned; the rest of the v2.0 gate
  stays (D173). The end-of-measure chord-fit check leaves v2: **v2.3 is empty**, its number not
  reused, and the check is a v3 nice-to-have, not committed scope (D174). **O104** (whether the v2.1
  and v2.2 gates' own real checks follow) was opened and answered the same day: yes, the v2.1
  gate's DAW and reference-machine checks move to v2.4 too (D180). Master spec v1.26.
- **Settled (D176–D179, the owner's answers, 2026-10-03): O77, O93, O98 and O99 closed.** The
  settings-mutation flag mutates every 2 to 4 phrases at random, from a seeded source, and starts
  off (D176). A note-density mutation steps from the density generated with, and `Sixteenth` is
  unavailable to it whenever the session generates with `Eighth` (D177). The multi-phrase tension
  arc repeats every four phrases, as chosen, tenser, as chosen, calmer, and its toggle starts off
  (D178). Adaptive tempo pauses while the controller is away, does not run in a session started
  without it, and starts off (D179, O99's alternative). Master spec v1.26.
- **Settled (D181, the owner's acceptance of chunk 24's proposal, 2026-10-03).** What one grade
  of the settings-mutation flag means per setting: ordered settings along their catalog order,
  the key around the circle of fifths, a collection within Major ↔ Minor or within the modes by
  brightness, any other contour, register among Low, Middle and High, the musical profile as an
  identity flip only. A harmony change also drops harmonic carry-in that no longer fits, and
  `Sixteenth` stays unavailable once the session has stepped down. Master spec v1.27.
- **Compacted into one release (D183, the owner's decision, 2026-10-05).** v2.1, v2.2 and v2.4
  ship together as **v2.0**, with one release gate, build plan chunk 21, which absorbs chunks 26,
  31 and 35. The real-hardware checks are part of the v2.0 gate again: v2.0 no longer ships before
  them (superseding D173 and D180 on that point). The labels v2.1, v2.2 and v2.4 stay as names for
  parts of v2.0's scope. **O105** opened: whether the real-program export checks block the v2.0
  tag (proposed: no). Master spec v1.29, build plan v0.5.
- **Settled (D184–D186, the owner, 2026-10-05).** The starting note arms the silence timer, and
  after a reattachment the silence timer counts again from the reconnection, as chunk 17 built
  them, with the chunk's other choices (D184). **O57 closed:** the backing's voicing, register,
  attack pattern and timbre stay as built (D185). The atom wording left open by chunks 8, 13, 20,
  27 and 29 is accepted (D186).
- **Settled (D187–D189, the owner, 2026-10-05).** **O87 closed:** a wake lock the browser drops
  while a session runs and the page is visible is asked for again, silently; a small v2.0 code
  unit adds it after the ISS-006 fix (D187). **ux Q31 closed:** the audio mix as built is final
  for v2.0 (D188). The CONTRACT 1.3, chunk 29's carry-in rules and a Disconnect rule are approved
  (D189).
- **Settled (D191, D193, the owner, 2026-10-06, after the hardware sitting).** **O71 closed:** USB
  is the tested path for v2.0 and Bluetooth MIDI is best-effort. The reference breath controller
  works over Bluetooth LE in Chrome on Linux, adding roughly 70–80 ms and delivering notes in
  batches; the app applies the USB correction to every controller, since Web MIDI does not say how
  a controller is connected. Android Chrome is still to try, not blocking (D191). **O105 closed:**
  the real-program export checks (MuseScore, a MIDI tool, a DAW) do not block the v2.0 tag; they
  are validated later, as a v2.0.x hand-check note (D193). A voluntary "Bluetooth" checkbox in the
  connection sheet is recorded as a candidate, version open, in
  [v3](../../versions/v3/README.md#controller-connection-candidates-not-committed) (D192). Master spec v1.31,
  build plan v0.7.
- **Measured (D194, D195, 2026-10-06), the machine measurements of the v2.0 gate.** **O68
  closed:** the longest main-thread block while engraving is about 50 ms, and at 240 BPM no task
  reaches 50 ms, against the 200 ms look-ahead window, so item 15 is met. The playhead's measure
  changes at most 14.5 ms after the heard barline, but the next painted frame is up to 30.4 ms
  after it; **O106** opened: which of the two item 6's 20 ms means (proposed: the first, so item
  6 is met) (D194). **O69 closed as
  measured:** the cold worst case is 277 ms in the page, narrowly over the 250 ms goal, which is
  not a gate (D181); the look-ahead deadline holds with wide headroom, so the cold-run check is
  met (D195). Master spec v1.32, build plan v0.8.
- **Settled (D197, the owner, 2026-10-06).** **O106 closed** with its proposal: item 6's 20 ms is
  measured to the moment the playhead band's measure changes, so item 6 is met. Master spec v1.34,
  build plan v0.9.
- **Settled (D198, D199, the owner, 2026-10-06).** The VISION is accepted for v2.0 as it stands;
  a full rewrite by the owner comes later, not scheduled (D198). The USB keyboard checks follow
  the v2.0 tag as v2.0.x hand checks; the breath controller's results stand for the tuning and the
  controller check, which calls for no manual input-transposition setting (D199). The v2.0 gate,
  build plan chunk 21, is blocked only by its own remaining work. Master spec v1.35, build plan
  v0.10.
- Open: 8 questions across the register, including O100–O103, the
  v3 rhythm candidates (D175); O86 (what makes a favorite "exported") is still open but belongs
  to v3 (D130); none is currently flagged ★. See [open-questions.md](../../open-questions.md) and
  [master-spec.md §12](../../versions/v2/master-spec.md#12-open-questions-carried-forward).

## Open questions

- **O47, O48, O49** are governance/later-version questions, unrelated to v2's own scope. Full
  text is in the [register](../../open-questions.md).
- No research-track question is left. **O68** (main-thread engraving) and **O69** (latency after
  ISS-004) were closed on 2026-10-06 by the machine measurements of the v2.0 gate (D194, D195).
  **O71** (Bluetooth MIDI) was settled
  on 2026-10-06: USB is the tested path, Bluetooth best-effort (D191). **O57** (backing voicing)
  was settled on 2026-10-05: the backing stays as built (D185). **O105** (whether the
  real-program export checks block the v2.0 tag, D183) was settled on 2026-10-06: they do not
  (D193). **O77** (settings-mutation
  flag) was settled on 2026-10-03 (D176), with O93 (D177). **O104** (whether the v2.1 and v2.2
  gates' own real checks move to v2.4, D173) was answered yes the same day (D180). Full text is in
  [open-questions.md](../../open-questions.md) and [master-spec.md §12](../../versions/v2/master-spec.md#12-open-questions-carried-forward).
- **O84** (starting a session from the Review) was settled 2026-09-30 (D169, from ux D137); its
  start from the Review was replaced the same day by the owner (D170).
  **O86** (what makes a
  favorite "exported", opened by D129) moved to v3 with favorites (D130).
- **O87** (the screen wake lock dropped mid-session, D131) was settled on 2026-10-05 (D187): the
  app asks for the lock again, silently.
  **O88** (the click volume during the count-in, D132) was settled the same day (D134).
- **O89** (a portrait-shaped view without turning the device, D137) was settled the same day
  (D138). **O90** (starting a session while the staff is not shown, D138) was settled the same
  day too (D139).
- **O97** (a session's last phrase ending with a leap recovery or a tense note owed) was settled
  by the owner on 2026-09-29 (D167). **O98** (the multi-phrase tension arc's mechanics and
  default) and **O99** (adaptive tempo while the controller is lost, and its default) were settled
  by the owner on 2026-10-03 (D178, D179).
- Every other question originally registered here (O10, O24, O33, O35–O39, O41–O46, O50–O56,
  O58–O67, O70, O72–O76) is now **settled** — see the status snapshot above and the
  [decisions log](../../decisions.md).
