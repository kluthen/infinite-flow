# Infinite Flow Specification Index

Status: draft v0.30

## Status Snapshot

- **v1 (First Release) is released as `v1.0`** (2026-09-26; `v1.0-rc1` = `2418069` is now history).
  The v1.0 gate — "no open issue in `issues/`" — is closed: ISS-005 (capability flags, D73),
  ISS-003 (written-pitch key, transposition as instrument data) and ISS-004 (rhythmic variety,
  D74) are all resolved and merged. The master spec reflects them at draft v2.1. The gate's
  working record is archived: [gate-execution-report.md](archive/v1/gate-execution-report.md) and
  [iss004-feasibility-review.md](archive/v1/iss004-feasibility-review.md).
- Infinite Flow is a client-side web practice partner for a monophonic player. v1 generates one
  coherent four-measure 4/4 phrase with harmony, in staff notation. The player regenerates it
  explicitly. It has no playback, MIDI or persistence.
- **Guiding principle:** Infinite Flow acknowledges and encourages; it never penalizes, grades,
  ranks or scores the player. Anything that adapts to how you play is opt-in and visible. See the
  [far vision](vision/far-vision.md).
- **Personas:** P1, the Curious Improviser (primary); P2, the Speed Builder; P3, the Fledgling
  Composer.
- **Context of use and browser scope (2026-09-28, D127)**, from the owner via `ux-writer` (ux D62,
  ux D63). A shared [context of use](personas.md#context-of-use) now covers all personas: laptop
  or desktop in Chrome or Edge first, a Chromium tablet on the music stand as a candidate, a
  landscape phone occasionally; music-stand distance, often standing; no click while playing;
  no oversized controls; 5 to 30 minute sessions, alone. v2 has no iPad support. Wider browser
  support (Chromium, Firefox, Safari) is placed at v4 or v5, undecided; Safari alone would not
  bring controllers to the iPad ([roadmap](roadmap.md#engineering-carry-overs-not-tied-to-one-version)).
- **Review on the phone, and review candidates (2026-09-28, D128)**, from the owner via
  `ux-writer` (ux D64). The phone's Review is the plain baseline: the spec's review functions,
  nothing more. Two roadmap candidates, neither committed: richer review tooling on tablet and
  desktop (replaying a selected passage; expected against played on one measure, bounded by the
  "no wrong-note signal" constraint), version open; and a cross-device review by export then
  import, for P3, no earlier than v6 ([roadmap](roadmap.md#candidates-not-committed)).
- **Export by content, and keeping sessions later (2026-09-28, D129)**, from the owner via
  `ux-writer` (ux D66, ux D67). A v2 scope change: the export offers the generated notes
  (MusicXML or MIDI), the played notes (MIDI only, unquantized, lining up with the generated MIDI
  in a DAW), or both as two files, replacing the opt-in played-notes track. It opened **O86**
  (what makes a favorite "exported"). v2 stays ephemeral; pinning sessions, access to older
  sessions and session comments are candidates, version open
  ([v3](versions/v3/README.md#keeping-sessions-candidates-not-committed)).
- **Favorites move to v3; one export action per content (2026-09-28, D130)**, from the owner via
  `ux-writer` (ux D68, ux D69). A v2 scope change: the review has no favorites, every export
  covers the whole session, and starting a new session from the review asks no confirmation.
  The review has one export action for the generated notes (MusicXML or MIDI) and one for the
  played notes (MIDI), one file each. Favorites are v3 scope, to be settled there, and **O86**
  moves with them ([v3](versions/v3/README.md#favorites-v3-scope-to-be-settled)). P3's C1 is
  served in v2 by looking back at the last session. The v2 master spec became v1.7.
- **Wake lock, count-in click, staff-only view (2026-09-28, D131–D133)**, from the owner via
  `ux-writer`'s unit-2 session review (ux D72–D74). The app holds a screen wake lock for the whole
  session and releases it at the end; a refused or missing lock is silent (D131). The count-in
  always clicks, even with the click turned off (D132). A staff-only session view is placed in
  v5, not v2 (D133, [v5+](versions/v5-plus/README.md#settled-direction)). Opened **O87** (the
  lock dropped mid-session) and **O88** (the click volume during the count-in). The v2 master
  spec became v1.8.
- **Count-in volume (2026-09-28, D134)**, from the owner (ux D84). The count-in plays at the click
  volume, and the click volume control never reaches silence: turning the click off is the on/off
  switch's job alone, so the count-in is always audible. Closes **O88**. The v2 master spec became
  v1.9.
- **Session start and end (2026-09-28, D135–D137)**, from the owner via `ux-writer`'s play-session
  decisions (ux D87, D89, D90). No session starts while a generation failure is being reported at
  Idle, even over a kept phrase: the player regenerates successfully first (D135). A session ended
  during the count-in goes back to Idle with phrase 1 on screen, with no review, and the previous
  review is not restored (D136). The app asks for a landscape lock during a session (a refusal is
  silent, and usually happens on a phone), and a phone or tablet turned to portrait ends the
  session like Stop (D137). Opened **O89** (a portrait-shaped view without turning the device).
  The v2 master spec became v1.10.
- **When the staff can't be shown (2026-09-28, D138)**, from the owner (ux D94). A session ends
  like Stop whenever the staff can no longer be shown: the view becomes portrait-shaped below the
  desktop breakpoint, whether or not the device was turned, or the window gets too narrow for the
  staff layout held since Start. Other viewport changes keep the session running. Closes **O89**;
  opened **O90** (whether a session can start while the staff is not shown). The v2 master spec
  became v1.11.
- **When a session can start, and fitting the staff (2026-09-28, D139–D141)**, from the owner (ux
  D98, D79, D93, D100). No session starts while the staff is not shown (D139, closes **O90**). The
  master spec now lists every state in which no session starts at Idle: no phrase yet, a new
  phrase being generated, a phrase that cannot be drawn, a generation failure being reported,
  unsupported rhythm settings, the staff not shown; the starting note is named exactly when
  playing it would start a session (D140). During a session a look-ahead phrase must fit the staff
  layout held since Start, which the window's width alone fixes; one that does not fit is retried
  like a failed generation, and repeated only when every attempt fails (D141). The v2 master spec
  became v1.12.
- **A window too short, and material waiting to be drawn (2026-09-28, D142–D143)**, from the owner
  (ux D104, D105). Below the tablet-landscape width the staff must fit the window's height too,
  with the session's cue row, measured with the browser's toolbars showing: if even its minimum
  readable size cannot fit, no session starts and a running one ends like Stop (D142, extending
  D138/D139). A change to the window's size during a session also re-checks the phrase material
  already checked and waiting to be drawn, and ends the session like Stop if any of it no longer
  fits, so a session never shows a notation error (D143). The v2 master spec became v1.13.
- **Three changes to v1 at Idle (2026-09-28, D144–D146)**, from the owner (ux D107–D109). A staff
  that cannot be shown for lack of space shows a plain notice with no retry action, not a notation
  error (D144). A phrase whose notes do not fit a window with room for the staff is replaced with
  the normal fresh-seed retries, as in a session, and the notice shows only when every retry fails
  (D145). Below the tablet-landscape width the `Sixteenth` note density is unavailable: phrases
  generate with `Eighth`, and a `Sixteenth` chosen while the window was wider is kept (D146).
  Opened **O91** (the density when the window crosses that width, still proposed) and **O92**
  (which phrase the notice keeps). The v2 master spec became v1.14.
- **The density rule's crossings, and the notice clearing (2026-09-28, D147–D150)**, from the
  owner (ux D110, ux D112). **O91 and O92 closed.** The density a phrase is generated with follows
  the window's width when that phrase is generated, at Idle and in a session; a phrase on screen
  or already checked is never regenerated for it (D147). Unsupported rhythm settings are judged
  on that density, and a session that has generated with `Eighth` keeps it until it ends, so
  v2.0 item 11 still holds mid-session (D148). When the "staff needs more room" notice clears, a
  new phrase is always generated (D149, against O92's proposal). The v2.1 mutation flag treats
  `Sixteenth` as unavailable below that width (D150). Opened **O93** (the mutation flag in a
  session generating with `Eighth`) and **O94** (the notice clearing under unsupported rhythm
  settings). The v2 master spec became v1.15.
- **What clears the "needs more room" notice (2026-09-28, D151–D152)**, from the owner (ux D114,
  ux D116). **O94 closed** with its proposal: when the notice clears while the rhythm combination
  is unsupported, no phrase is shown, the unsupported-rhythm alert shows, and generation stays
  blocked until the settings change (D151). When the notice shows because every retry was too
  dense, a wider window, a changed setting or regenerating by hand starts a fresh round of
  retries by itself; the first phrase that fits clears the notice, a failed round leaves it, and
  a narrower window starts nothing. So the notice, whatever its cause, only ever gives way to a
  new phrase (D152). ux D115 (the no-room sentence per breakpoint) is wording, left to the UI
  documents. Opened **O95** (a change that should restart the retries landing on unsupported
  rhythm settings). The v2 master spec became v1.16.
- **Unsupported settings and a wider window under the notice (2026-09-28/29, D153–D154)**, from
  the owner (ux D117, ux D118). **O95 closed** against its proposal, with the alternative it
  named: while the notice shows because every retry was too dense, a change that makes the rhythm
  combination unsupported starts no round, and the notice gives way to no phrase with the
  unsupported-rhythm alert, as D151 does; nothing is generated by itself once the combination is
  allowed again (D153). A phrase already on screen still stays when a rhythm setting makes the
  combination unsupported, as in v1. A wider window while a round of retries runs starts
  nothing: the round carries on, and if it fails the notice stays until the next change (D154).
  The rest of ux D117 is UI-only. Opened **O96** (which note density a round's later attempts use
  when the window crosses the tablet-landscape width during the round). The v2 master spec
  became v1.17.
- **A crossing during a round, and a phrase that stops fitting under unsupported settings
  (2026-09-29, D155–D156)**, `ux-writer`'s calls under the owner's delegation of minor calls (ux
  D119; ux D120, ux D121). **O96 closed** with its proposal, the literal reading of D147: each
  attempt of a round of retries takes its note density from the window when it is generated; a
  widening past the tablet-landscape width that makes the rhythm combination unsupported stops
  the round and gives way to no phrase with the unsupported-rhythm alert, as D153 does, and a
  narrowing steps the remaining attempts down to `Eighth` (D155). At Idle, a phrase on screen that
  stops fitting while the combination is unsupported gives way to no phrase with the alert too,
  not to the notice; a window with no room still shows the notice (D156). Nothing newly opened.
  The v2 master spec became v1.18.
- **Gaps found by the atom ingestion (2026-09-29, D157–D163)**: `documentalist` found 11 gaps
  while drawing ATD atoms from master spec v1.18; `spec-writer` corrected the minor ones under
  the owner's rule for this pass. A join made without carry-in is not smoothed and settles nothing
  owed (D157); a phrase generated with carry-in may end owing a leap recovery or a tense note's
  resolution, which resolves onto the next phrase's first note (D158); the review shows every
  phrase that started sounding (D159); a look-ahead phrase already partly on screen is never
  discarded for a setting change (D160); applying a setting change at a phrase boundary ships in
  v2.1 (D161); v2.0 records played notes without showing them (D162); the struggling notice
  stays until a newly generated phrase starts sounding (D163). Opened for the owner: **O97** (a
  session's last phrase ending with something owed), **O98** (the multi-phrase tension arc) and
  **O99** (adaptive tempo while the controller is lost). The v2 master spec became v1.19.
- **Inconsistencies found by the v2 build plan (2026-09-29, D164–D166)**: `coding-leader` found
  three while writing the v2 build plan, routed by `ux-writer`; `spec-writer` corrected them under
  the owner's rule for minor issues. ux D71's two alternating staff systems supersede D95's two
  switchable display modes: one display, nothing scrolling, no mode toggle (D164); the MuseScore
  check of the MusicXML export covers the two transposing templates with `<transpose>` and the C
  keyboard without it, since only two of the three templates transpose (D165); the v2 README's
  session start follows master spec §6, only phrase 1's first note at its exact pitch starting a
  session from MIDI (D166). Nothing newly opened. The v2 master spec became v1.20.
- **A session's last phrase ending with something owed (2026-09-29, D167)**: the owner answered
  O97 with its proposal. The carry-over between phrases is kept, and a session's last phrase, in
  the review and the export, may end with a leap recovery or a tense note's resolution still
  owed, as it may be cut off mid-phrase; the same holds before the failure ladder's standalone
  phrase or a repeat. The v2 master spec became v1.21.
- **The acknowledgement window between close notes (2026-09-29, D168)**: the chunk 14 build found
  that cutting a window off 150 ms before the next expected note's onset leaves an on-time note
  unmatchable when the next onset is less than 150 ms later. The owner decided to split the gap
  at the halfway point: the boundary between two consecutive expected notes is the later of 150 ms
  before the second onset and the halfway point, so every window contains its own onset; nothing
  changes for notes 300 ms or more apart. Windows include both ends, and a phrase's last expected
  note is bounded by the next phrase's first the same way. Nothing newly opened. The v2 master
  spec became v1.22.
- **Starting a session from the Review (2026-09-30, D169)**: closes O84 from ux D137, settled by
  `ux-writer` under the owner's delegation of unit 6 (ux D135). At every session end once phrase 1
  has sounded, a fresh phrase is generated from the current settings, as regenerating by hand
  would; phrase 1 is then the phrase on screen when the next session starts, first generated
  fresh at that end. Its start from the Review, by the Start click or the starting note, was
  replaced the same day by the owner (next item). The v2 master spec became v1.23.
- **Leave the Review before starting a session (2026-09-30, D170, owner; ux D143)**: while the
  Review shows, no session starts, by the Start click or any note, the starting note included;
  the player leaves it first. Leaving keeps it reachable until the next session starts, and only
  that start discards it. The fresh phrase at the session end stands. Nothing newly opened. The
  v2 master spec became v1.24.
- **The MusicXML export's last barline (2026-10-02, D171)**: a correction found by the chunk 20
  preflight. Master spec §7 now says what the owner decided on 2026-09-29 and the encoder does:
  every phrase but the last ends with a double barline, the last with a final barline. No new
  rule; nothing newly opened. The v2 master spec became v1.25.
- **Livelier defaults (2026-10-03, D172, owner)**: the Neutral preset's harmonic motion is now
  `Gentle diatonic` instead of `Static`, and the first-load arpeggio chaos is `Varied` instead of
  `Predictable`, because the default phrase had collapsed to about two repeated pitches. Arpeggio
  chaos stays out of the presets, Jazz is unchanged, and no control value changes what it does.
  Nothing newly opened.
- **v2 replanned (2026-10-03, D173–D174)**, the owner's decisions. The real-hardware checks leave
  the v2.0 gate for a new release, **v2.4** "real-hardware checks", after v2.2: the controller
  check on the reference hardware, tuning the acknowledgement windows (150/200 ms) and latency on
  it, opening real exports in MuseScore and a MIDI tool, and the playhead and main-thread
  measurements in real Chromium. v2.0 can ship before them, its timing constants untuned; the rest
  of the v2.0 gate stays (D173). The end-of-measure chord-fit check (v2.3, build plan chunks
  32–34) leaves v2 and is a v3 nice-to-have, not committed scope; v2.3 is empty and its number is
  not reused (D174). **O104**, opened by it, was answered the same day (D180): the v2.1 gate's
  checks in a real DAW and on the reference machine move to v2.4 too.
- **v3 rhythm candidates (2026-10-03, D175)**, the owner's ideas, not committed: rhythm ratios,
  a rhythm editor and a rhythm lock, all reached by a new note-density value, Custom; the
  settings-mutation flag never moves density into Custom, may alter the ratios under it, and
  cannot durably alter a locked rhythm
  ([v3](versions/v3/README.md#rhythm-candidates-custom-note-density-candidates-not-committed)).
  Opened **O100–O103**.
- **Four v2.1/v2.2 questions answered (2026-10-03, D176–D179)**, by the owner. **O77:** the
  settings-mutation flag mutates every 2 to 4 phrases at random, seeded so a session replays, and
  starts off (D176). **O93:** a note-density mutation steps from the density generated with, and
  `Sixteenth` is unavailable to it whenever the session generates with `Eighth` (D177). **O98:**
  the multi-phrase tension arc repeats every four phrases (as chosen, tenser, as chosen, calmer)
  and its toggle starts off (D178). **O99:** adaptive tempo pauses while the controller is away,
  O99's alternative, and starts off (D179). The v2 master spec is now v1.26, and the build plan
  v0.4.
- **Timeline** ([roadmap](roadmap.md)):
  - **v2:** a rolling phrase, MIDI acknowledgement, backing, sessions, and last-session review
    with export.
  - **v3:** MIDI-seeded continuation, "my instrument", local persistence and favorites; the
    chord-fit check as a nice-to-have (D174).
  - **v4:** accompaniment with roles.
  - **v5+:** a library, microphone input and a staff-only session view.
  - **Endgame:** a rhythm RPG.
- **Controller connection and session start (2026-09-27, D111–D118)**, from the owner's answers to
  ux Q23/Q24 on `ux-critic`'s findings. Silence and losing the controller are different events.
  A controller connects only between sessions. A controller lost mid-session is shown clearly and
  may be reconnected; after 30 s without a reconnection the session ends (**D114** replaces the
  old "becomes a no-controller session" rule). A MIDI note starts a session only if it is phrase
  1's first note (**D115** overrides the old "any first note" count-in rule). Nothing played while
  connecting or during the transposition check can start a session. Blind and screen-reader users
  are not a target (D117). The same day the owner settled the six sub-points this opened
  (O78–O83, **D119–D124**): the 30 s count from the moment the controller is unplugged, and the
  silence timer is suspended meanwhile (D119); the phrase keeps playing at tempo while the player
  is silent or unplugged, and notes after a reconnection are handled as usual (D120); the starting
  note only starts the count-in, which is shown as well as heard, with phrase 1's first measure
  visible (D121); "connected" = permission, one input selected, port open (D122); only the same
  device reconnects, automatically (D123); the starting note must be that exact note, octave
  included, and a neutral line always names it (D124). **D125** (owner, ux Q26) extends D123 to
  between sessions: a controller unplugged at Idle or in the Review keeps its selection and the
  same device reattaches by itself, with no new transposition check; while away it counts as no
  controller, not an error. **D126** (owner, O85 / ux Q29) settles starting while the selected
  controller is away: a Start click then begins a controller-less session, the device is not
  reattached during it, and it reattaches by itself once the session ends; a controller lost
  mid-session and still away at the end keeps its selection into the Review. The selection lives
  in memory only and does not survive a page reload (v2 saves nothing to browser storage). The
  master spec was then at v1.5 (v1.25 since D171). The one gap left open then (**O84**: starting
  a session from the Review) was closed 2026-09-30 (D169).
- **Open:** 13 questions remain live: O86 (D129, a v3 question since D130), O87
  (D131) and O100–O103 (D175, v3 rhythm candidates), plus the 7
  older ones this bullet goes on to describe; O77, which it also describes, was settled on
  2026-10-03 (D176). None is flagged ★. The 5 most-blocking ones
  settled first (**D104** O75 v2.0 cut line is the full loop; **D105** O34 continuation boundary;
  **D76** O54 audio unlock; **D77** O55 controller check ships; **D78** O41 acknowledgement
  window), then two large 2026-09-27 batches closed nearly everything else (**D80–D88**:
  leap-across-join, tense-note resolution at a join, register window, planner authority,
  tempo-as-input, count-in, backing, click, timeout arming, trailing silence, MIDI activity,
  browser scope, history storage, export scope/extras, favorites, discard confirmation, session
  length; **D92–D102**: the live view highlights a matched expected note, never the played
  pitch; the review always shows generated notes with played notes optional on a toggle;
  look-ahead/failure ladder, event identity and the v1-workspace-in-v2 shape all confirmed;
  the rolling display ships two candidate modes behind a toggle rather than picking one; the
  harmonic horizon stays phrase-by-phrase for v2.0, with a v2.2 multi-phrase arc noted as
  non-urgent; latency calibration moves to v3, not v2.1; adaptive tempo (v2.2) is a flat +5 BPM
  every 2 phrases, unconditional, resetting to the starting tempo on Stop/Start). Three of that
  series are **overrides** of the proposed default rather than confirmations (**D89** hidden tab
  now ends the session immediately; **D90** v2.0 expects a single MIDI input, no merging;
  **D101**, which replaces the proposed performance-linked adaptive-tempo metric with an
  unconditional flat schedule, decoupling it from O24 entirely), and one is a **substantive
  modification** (**D91**: the settings UI is locked for the whole session, not just the
  instrument selector). **O24 is settled (D108):** the chord-fit check is kept, judged per
  measure by pitch class, fires only when the player deviates from the written phrase (accepting
  that "blue"/passing chromatic notes get no signal), and ships in its own new release, **v2.3**.
  **O77's release is settled at v2.1 (D107)**; it is otherwise narrowed by **D103**: every
  setting except instrument selection and tempo is eligible, each mutation shifts one by at most
  one grade in either direction, and landing on an unsupported combination re-mutates until a
  supported one is found — but the exact cadence and the flag's default on/off state are still
  open. The rest of what's open is verification/research work, not a design decision: O47,
  O48, O49 (later/governance, outside v2's own scope), and O57, O68, O69, O71 (listening test,
  prototype, measurement, and Bluetooth-MIDI research). **D79** notes that v3's "my instrument"
  should inherit the controller check's detected offset. **The v2 spec (v2.0–v2.3 then; v2.0,
  v2.1, v2.2 and v2.4 since D173–D174) is now consolidated** into [versions/v2/master-spec.md](versions/v2/master-spec.md); the draft topic
  documents that fed it, including the original questions-for-user, are archived at
  [archive/v2/](archive/v2/README.md). See the live [register](open-questions.md) for what
  remains open.

## Documents

### Direction

- [Roadmap](roadmap.md): the ordered timeline from the v1.0 gate to the endgame, with no dates,
  plus uncommitted candidates.
- [Versions](versions/README.md): one folder per version (v1, v2, v3, v4, v5+) holding its scope,
  dependencies and version-specific open questions. Also holds the cross-version
  [prerequisites](versions/prerequisites.md).
- [Personas](personas.md) (draft): who the product serves.
- [Far vision](vision/far-vision.md) (draft): the long-term direction and the guiding principles.
  The [endgame](vision/endgame.md) describes the rhythm RPG horizon.
- [Product foundation](product-foundation.md): the v1-era product intent. Where it conflicts with
  the documents above, they win. It will be revised when the vision is consolidated.

### Engineering

- [Generator architecture](generator-architecture.md): decoupling rules and seams for evolving
  musical generators.
- [Generator contract](generator-contract.md): the request, result and event boundary.
- [Features](features/): feature notes. For now this holds the
  [v1 feature note](features/v1-first-release.md).

### Tracking

- [Open questions](open-questions.md): only truly open questions.
- [Decisions](decisions.md): the live append-only log, numbered from D109.

### v1 reference (kept in place because other files link to them)

- [First-release master spec](first-release-master-spec.md): what v1 was built against.
- [First-release plan](first_release_plan.md): v1 implementation steps.
- [Generative process](generative-process.md): the generation-process reference.
- Music reference: [`docs/music/`](../docs/music/README.md).

### Archive

- [Archive index](archive/README.md): archived records (kept verbatim), and where each archived
  decision now lives as settled fact.
  - [v1 archive](archive/v1/README.md): the first-release working record, including decisions
    D1–D46 and the closed v1.0 gate's working documents (the gate execution report and the
    ISS-004 feasibility review).
  - [2026-09-25 persona and vision session](archive/2026-09-25-personas-and-vision/README.md):
    decisions D47–D71 and the pre-vision stage roadmap cited by `docs/release/`.
  - [v2 archive](archive/v2/README.md): the v2.0–v2.3 spec-consolidation working record —
    decisions D72–D108 and the eight draft topic documents, superseded by
    [versions/v2/master-spec.md](versions/v2/master-spec.md).
