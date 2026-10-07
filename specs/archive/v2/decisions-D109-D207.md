> **Archived 2026-10-07.** Closed range for the v2 milestone: the v2.0 release gate (build plan
> chunk 21) passed, and v2.0 is released as version 2.0.0, its tag pending the owner's approval.
> These decisions span the v2 design and build, from `ux-writer`'s design kickoff (D109) to the
> last gate rulings (D207). Archived IDs keep their meaning and may be cited anywhere; each
> decision's content is now stated as settled fact in a live document, or is history, as the
> "where it now lives" table in [archive/v2/README.md](README.md) records. Relative links in the
> entries below were written from `specs/decisions.md`; their paths were repaired on 2026-10-07 so
> they resolve from this folder.

## Decision Log (D109–D207)

- **D109 (2026-09-27): a failure-ladder repeat phrase (master-spec §4) is never visibly marked in
  the review.** Raised by `ux-writer` while starting v2 design (their Q18): does the review flag a
  phrase that the failure ladder repeated, or stay silent? Decided: stays silent in the review UI.
  It is still recorded internally (session history and export data already carry the repeat, per
  §7), but the review shows it identically to any other phrase. This matches the product's
  encouraging tone — a repeat is a generator implementation detail, not a flaw worth surfacing to
  the player.
- **D110 (2026-09-27): the v2.2 multi-phrase tension arc (master-spec §3) is a player-facing
  opt-in, not an invisible generation behavior.** Raised by `ux-writer` (their Q21): unlike the
  existing single-phrase tension arc (which has no toggle and never has), the longer multi-phrase
  arc gets its own visible on/off control, on the same footing as the settings-mutation flag and
  adaptive tempo. `ux-writer` owns the control's placement, copy and any further presentation
  detail; this decision only settles that a control must exist at all.
- **D111 (2026-09-27): losing the controller and falling silent are different events; the silence
  rule is unchanged.** Answered by the product owner on ux Q23, raised by `ux-critic`'s validation
  of the controller-connection design unit. With a controller attached, a session still ends after
  more than 30 s without a note, and that timer still arms only on the first note played
  (master-spec §7, D85). A controller disappearing mid-session is handled by its own rule (D114),
  not by the silence timer. Where D114's 30 s counts from is still open (O78).
- **D112 (2026-09-27): a controller unplugged mid-session must be clearly visible to the player.**
  Owner, ux Q23. The owner accepts that this briefly draws attention away from playing. This
  settles only that the loss is made clearly visible; how it looks is `ux-writer`'s call. It
  replaces the archived draft's "a non-blocking notice is shown"
  ([midi-and-acknowledgement.md §3](midi-and-acknowledgement.md), connection-state
  table). See master-spec §8.
- **D113 (2026-09-27): a controller can only be connected between sessions.** Owner, ux Q23.
  Connecting a controller (the "Connect controller" click, MIDI permission, picking the one input,
  the transposition check) happens only while the app is Idle or showing the Review. A session
  started with no controller stays controller-less for its whole length: only Stop ends it, as
  before, and the silence timer never arms. The one exception is reconnecting a controller lost
  mid-session (D114). The transposition check stays re-runnable, but only between sessions. See
  master-spec §7 and §8.
- **D114 (2026-09-27): a controller lost mid-session may be reconnected; if it is not reconnected
  within 30 s, the session ends.** Owner, ux Q23. This **replaces** the former master-spec §8 rule
  (inherited from the archived draft's connection-state table): "losing a previously connected
  controller mid-session simply turns it into a no-controller session — only Stop ends it, and the
  inactivity timer is disarmed." The session keeps running during the wait, because v2 has no
  pause state (D89). When the 30 s pass without a reconnection, the session ends the same way the
  silence timeout ends it. Still open: where the 30 s counts from (O78), whether notes after a
  reconnection are handled exactly as before (O79), and what counts as a reconnection (O82). See
  master-spec §8.
- **D115 (2026-09-27): a MIDI note starts a session only if it is the note phrase 1 starts on.**
  Owner, ux Q24. This **overrides** master-spec §6 as settled by D85 (from O44), under which the
  very first MIDI note, whatever its pitch, started the count-in and was deliberately not matched
  against phrase 1. Any other note played while Idle now starts nothing. The one-measure count-in
  is unchanged for both kinds of start (Start click or MIDI note). "The note phrase 1 starts on"
  means phrase 1's first attacked note, phrase 1 being the phrase already on screen at Idle (§4).
  Still open: whether that note also counts as phrase 1's first note already played (O80), and how
  strictly it is matched and whether a note that starts nothing gets any response (O83). See
  master-spec §6 and §7.
- **D116 (2026-09-27): the transposition check is a step of its own; nothing played while
  connecting can start a session.** Owner, ux Q24, confirming `ux-writer`'s proposed default. No
  note played while the player is connecting a controller or running the transposition check can
  start a session, even a note equal to phrase 1's first note. See master-spec §6 and §8.
- **D117 (2026-09-27): blind and screen-reader users are outside the product's target audience.**
  Owner, answered during the ux Q23/Q24 round on `ux-critic`'s findings. Neither the spec nor the
  UI/UX design has to make the app usable without sight. The answer covers non-visual use only. It
  does not by itself waive other accessibility concerns, such as contrast, low vision or keyboard
  operation, which stay `ux-writer`'s to weigh. [personas.md](../../personas.md) has no section for who
  is not a target, so this is recorded here only.
- **D118 (2026-09-27): clarification, no new rule. The "Connect controller" click is the click
  that unlocks audio.** Already implied by master-spec §6 and settled by D76 (from O54). The same
  single click unlocks audio and requests MIDI permission; there is no separate audio-unlock step.
  A Start click unlocks audio on its own. Stated explicitly now in master-spec §6 and §8.
- **D119 (2026-09-27): the 30 s after losing the controller count from the moment it is
  unplugged, whatever came before.** Owner, confirming O78's proposed default. Resolves O78. How
  long the player had already been silent does not matter: a player who rested 25 s before the
  cable slipped still gets the full 30 s to reconnect. While no controller is attached the silence
  timer (D111, master-spec §7) is suspended; after a reconnection it counts again from the
  reconnection. See master-spec §8.
- **D120 (2026-09-27): the phrase never waits for the player; after a reconnection, notes are
  handled as usual.** Owner, confirming O79's proposed default. Resolves O79. While the player is
  silent or the controller is unplugged, phrases keep being generated and played at tempo, and the
  app only tracks, on the audio clock, which note is due next. Expected notes due while the
  controller was away stay unacknowledged, like any note not played, with no signal. Notes played
  after a reconnection are recorded and acknowledged exactly as before. The gap is not marked in
  the review, in the same spirit as D109. See master-spec §7 and §8.
- **D121 (2026-09-27): the starting MIDI note only starts the count-in; the count-in is shown as
  well as heard.** Owner, confirming O80's proposed default and adding the on-screen part.
  Resolves O80. The note that starts a session (D115) belongs to no phrase in the history or
  export. After the one-measure count-in the player plays phrase 1 from its first note, on beat 1.
  For both kinds of start, the count-in's beats are also shown on screen in time with the click,
  and phrase 1's whole first measure stays fully visible throughout the count-in. How the count
  looks is `ux-writer`'s (ux D52). See master-spec §6.
- **D122 (2026-09-27): when a controller counts as connected, and when as lost.** Owner,
  accepting O81's proposed default. Resolves O81. Connected = MIDI permission granted, one input
  selected (the player's pick, or the only device present), and that input's port present and
  open. No note is required. Lost = that port reports disconnected. This is what "with a
  controller attached" means for the silence timer (master-spec §7), for a MIDI session start
  (§6) and for adaptive tempo (§10). The transposition check is a separate step that follows
  (D116). See master-spec §8.
- **D123 (2026-09-27): only the same device counts as a reconnection, and it reattaches by
  itself.** Owner, accepting O82's proposed default. Resolves O82. The same input coming back
  mid-session is reattached automatically, with no action from the player, and the transposition
  check is not re-run. A different device cannot be attached mid-session (D113). See master-spec
  §8.
- **D124 (2026-09-27): the starting note must be that exact note, octave included, and the app
  always shows which note it is.** Owner, answering O83. Resolves O83. The note's position on the
  staff fixes its octave, so it is one specific note: C4 and C5 are different notes here. (An
  octave is 12 half steps, for example from C4 up to C5; see the lexicon entries Octave and Octave
  number.) The match uses the same rule as expected-note acknowledgement: the exact concert pitch
  of that written note under the instrument's transposition (master-spec §8). A note that doesn't
  match changes nothing on screen, with no mismatch hint. A neutral, always-visible line names the
  note that starts the session; its design is `ux-writer`'s (ux D52). See master-spec §6.
- **D125 (2026-09-27): the same-device reconnection of D123 also holds between sessions.** Owner,
  answering ux Q26 (recorded on the UX side as ux D55). Extends D123, which covered only a
  controller lost mid-session. When the connected controller is unplugged while the app is Idle
  or showing the Review, its selection survives: plugging the **same device** back in reattaches
  it by itself, with no action from the player, and the transposition check is not re-run. A
  different device goes through the connection step as usual (D113, D116). While the selected
  controller is away between sessions, the app counts as having no controller (D122's "lost"
  state): this is not an error, and neither the mid-session 30 s window (D114, D119) nor any
  session end applies, since no session is running. Reconnection is therefore no longer a
  mid-session-only exception. Unchanged: a different device can never be attached during a
  session (D113). What happens when a session starts while the selected controller is away is
  still open (O85). See master-spec §8.
- **D126 (2026-09-27): a session started while the selected controller is away stays
  controller-less, and a selection survives a session that ends with the controller away.** Owner,
  accepting both proposed defaults of O85 (recorded on the UX side as ux D57, closing ux Q29).
  Resolves O85. (1) A Start click while the selected controller is unplugged (D125's "away" state)
  begins a no-controller session. Plugging that same device back in during that session does not
  reattach it: D113 holds, and a session started without a controller stays without one for its
  whole length. The session starts at the Start click, so this covers the count-in too. The
  selection is kept throughout, and once the session ends the device reattaches by itself (D125)
  if it is still plugged in, with no new transposition check. (2) A controller lost mid-session
  and still away when the session ends (by the 30 s rule of D114/D119, or by Stop) keeps its
  selection into the Review, exactly like a controller unplugged between sessions (D125).
  Clarification, not a new rule: the kept selection lives in memory only and does not survive a
  page reload, since v2 writes nothing to browser storage (master-spec §7); remembering the
  player's controller across visits belongs to v3 "my instrument". See master-spec §8.
- **D127 (2026-09-28): the context of use for all personas, no iPad support in v2, and wider
  browser support placed at v4 or v5.** Owner, confirmed to `ux-writer` (ux D62 and ux D63; ux D63
  closes ux Q32 on the UX side). (1) **Context of use.** Recorded as a shared section in
  [personas.md](../../personas.md#context-of-use), mainly from the owner's own setup as P1: a laptop or
  desktop in Chrome or Edge as the main device; a tablet on the music stand as a good candidate; a
  landscape phone (Samsung Galaxy S20 FE) occasionally, outside with the Travel Sax, which the
  owner calls "probably not ideal"; the screen read at music-stand distance, often standing; hands
  (and mouth, on sax or Travel Sax) on the instrument during a session, with no click expected
  while playing; hands free between sessions, with no oversized controls for distance beyond the
  normal accessibility floor; sessions of about 5 to 30 minutes, alone, at home; and a real but
  unquantified balance problem between the backing, the click and the player's own sound. (2)
  **No iPad (WebKit) support in v2**, consistent with the Chromium-only scope of master-spec §8.
  The tablet in (1) therefore means a Chromium tablet for v2. (3) **Wider browser support**
  (Chromium, Firefox, Safari) is placed at v4 or v5; which one is still open. Caveat recorded with
  it: Safari support does not bring MIDI controllers to the iPad, since WebKit has no Web MIDI; a
  controller becomes usable there only if Apple ships Web MIDI, or through the v5+ microphone
  input. See the [roadmap](../../roadmap.md#engineering-carry-overs-not-tied-to-one-version). No spec
  question is opened for the backing and click level defaults: the spec already requires separate
  backing and click volume controls (master-spec §6), and their default values are listening-test
  calibration tracked as ux Q31. O71 gains a note: the phone in (1) means the owner's setup
  includes an Android system as well as the main computer.
- **D128 (2026-09-28): the phone's Review is the plain baseline; richer review tooling and a
  cross-device review by import are recorded as roadmap candidates, not committed scope.** Owner,
  in direct conversation with `ux-writer` (ux D64, which closes ux Q33 on the UX side). (1)
  **Phone baseline.** On the phone the Review keeps exactly the functions the v2 spec gives it on
  every device (master-spec §7), with the least annotation the space allows and no phone-specific
  tooling. This is a layout matter owned by `ux-writer`; the spec tree only carries a pointer in
  [personas.md](../../personas.md#context-of-use). A player who wants a real review of a phone session
  exports it and moves to a larger screen. (2) **Richer review tooling, tablet and desktop only,
  version open.** Two examples from the owner: selecting a passage to replay, and showing on the
  same measure what was expected against what was played. Recorded next to v3's review of earlier
  sessions, which is where review next evolves; the owner gave no version, so this is not a v3
  placement. The expected-versus-played idea is bounded by the permanent constraint of
  master-spec §2: no wrong-note signal, grading or scoring in any view. See
  [v3](../../versions/v3/README.md#later-review-tooling-candidates-not-committed). (3) **Cross-device
  review by export, then import**, placed no earlier than v6 (the owner: "a maybe, but not prior
  v6", "mostly composer stuff", so it serves P3's C1). No version plans it today: v4's whole-file
  seed feeds a continuation, not a review. See
  [v5+](../../versions/v5-plus/README.md#candidates-not-committed). No open question is registered for
  the placements, following D127's browser-scope precedent: both are uncommitted candidates and
  nothing current depends on them. See the
  [roadmap](../../roadmap.md#candidates-not-committed).
- **D129 (2026-09-28): the v2 export is chosen by content, generated notes or played notes; keeping
  sessions stays later than v2, with the owner's ideas recorded as candidates.** Owner, in direct
  conversation with `ux-writer` (ux D66, closing ux Q34; ux D67, closing ux Q35). (1) **Export by
  content (ux D66), a v2 scope change.** Getting what was played out of the app matters to the
  owner. The export now offers, for either existing scope (whole session, or favorites only): the
  **generated notes**, as one MusicXML or MIDI file, with the MusicXML and generated-MIDI rules
  unchanged (concert pitch, tempo map, one marker per phrase, optional backing off by default);
  the **played notes**, as one MIDI file only, unquantized, at concert pitch as received, with
  their original velocity; or **both**, as two separate files. This replaces the opt-in
  played-notes track inside the one MIDI file. MusicXML stays generated-only, since unquantized
  playing cannot be engraved faithfully. With favorites, the played-notes file holds the played
  notes of the favorite phrases, in session order. `spec-writer`'s calls, recorded with it: the
  played-notes file carries the same tempo map, phrase markers, time resolution and time zero as
  the generated MIDI file of the same scope, so the two line up phrase by phrase in a DAW; the
  exported phrases sit back to back in session order in every file; the backing stays an option
  of the generated file only; generated notes are the default content, so played notes still
  leave only by the player's choice; played notes and "both" are unavailable when the scope holds
  no played note; "both" pairs the played-notes MIDI with the generated file in whichever format
  the player picks; no onset moves by more than 1 ms; a note-off now ends a played note (it is
  still never activity), a note held at the session's end stops there, and in a favorites export
  a note held past its phrase stops at the phrase's end when the next session phrase is not
  exported. Release placement unchanged: v2.0 exports generated notes only, played notes and
  "both" arrive in v2.1. The privacy rule still holds: a played note leaves the machine only
  through an export the player triggers with played notes chosen as its content. Opens **O86**
  (what makes a favorite "exported"). Master spec v1.5 → **v1.6**: §2, §7, §8, §11 (v2.0 item
  12, the v2.1 release row and its acceptance list), §12 and §13. (2) **Keeping sessions stays
  later than v2 (ux D67). No v2 change:** v2 stays ephemeral, and nothing survives a reload. The
  owner's ideas are recorded as candidates, version open, not committed: storing more than one
  session only when the player asks (for example by pinning it), suitable access to older
  sessions, and an optional comment on a session. They sit next to D128's review-tooling
  candidates in [v3](../../versions/v3/README.md#keeping-sessions-candidates-not-committed), where they
  meet v3's planned local persistence and review of earlier sessions. No open question is
  registered for their placement, following D127's and D128's precedent.
- **D130 (2026-09-28): favorites move from v2 to v3; the review offers one export action per
  content.** Owner, in direct conversation with `ux-writer` (ux D68, ux D69). (1) **Favorites move
  to v3 (ux D69), a v2 scope change.** The owner: "favorite and the like will be decided in v3,
  leave this as open question for later", and "next session is truly one click away". In v2 the
  review has no favorites and no per-phrase action, every export covers the whole session (the
  favorites-only scope is gone), and starting a new session from the review discards it without
  asking for confirmation. Closing or reloading the page still discards everything without
  asking. This supersedes, for v2, D88's favorite defaults (whole-phrase favorites, a
  favorites-only export scope, confirming before discarding unexported favorites) and D129's
  favorites-scope rules (played notes of the favorite phrases, a held note stopping at its
  phrase's end). Favorites are **v3 scope, to be settled there**, not a candidate with an open
  version; D88's defaults are kept in
  [v3](../../versions/v3/README.md#favorites-v3-scope-to-be-settled) as a starting point, not binding.
  **O86** (what makes a favorite "exported") stays open, re-scoped to v3. P3's C1 is served in
  v2 by looking back at the last session; marking is v3. C2 is served in v2 by exporting the
  whole session; exporting only the marked material comes with marking. O84's proposed default
  (from the Review, only a Start click starts a session) loses the reason it was given, the
  collision with the confirmation; O84 stays open. (2) **Two export actions (ux D68).** The
  review has one export action for the generated notes (which still offers MusicXML or MIDI)
  and one for the played notes (MIDI). Each action delivers exactly one file. "Both" means using
  both actions, one file each; no single action triggers two downloads, so the note about
  Chromium's multiple-download prompt is dropped. The played-notes action is unavailable when
  the session holds no played note. Played notes still leave only by the player's choice: the
  played-notes action has to be triggered, which replaces "generated notes are the default
  content". The privacy rule and every file rule of D129 hold otherwise. Release placement
  unchanged: v2.0 has the generated-notes action only, the played-notes action arrives in v2.1.
  Master spec v1.6 → **v1.7**: §2, §7, §11 (the release table, v2.0 item 12 and the v2.1
  acceptance list), §12 and §13.
- **D131 (2026-09-28): the screen stays awake during a session.** Owner, in the `ux-writer` unit-2
  session core-loop review (ux D73). New v2 behaviour, v2.0. The app holds a screen wake lock
  from the moment a session starts (the Start click or the starting note, so the count-in is
  covered) until the session ends, however it ends, and releases it then. If the browser refuses
  the lock or does not support it, the session runs as normal and nothing is shown: a message is
  not worth pulling the player's eyes off the staff. Why: a 5 to 30 minute session involves no
  touch ([context of use](../../personas.md#context-of-use), D127), so a tablet, phone or laptop would
  dim and lock mid-session, and on a phone a locked screen hides the tab, which ends the session
  (master-spec §6, D89). The lock stores nothing and sends nothing, so the privacy rule is
  untouched. Opens **O87** (what the app does if the browser drops the lock mid-session), noticed
  by `spec-writer` while recording it. Master spec §6 and §11 (new v2.0 item 21).
- **D132 (2026-09-28): the count-in always clicks.** Owner, in the `ux-writer` unit-2 session
  core-loop review (ux D74). The count-in's click sounds even when the player has turned the
  click off, because it is the only thing that sets the tempo before bar 1. The click on/off
  setting governs the session from phrase 1 on. This clarifies master-spec §6 ("one measure of
  click"); it changes no release placement. Opens **O88** (whether the click volume applies to the
  count-in), noticed by `spec-writer` while recording it. Master spec §6 and §11 (v2.0 item 18).
- **D133 (2026-09-28): a staff-only session view is placed in v5, not v2.** Owner, in the
  `ux-writer` unit-2 session core-loop review (ux D72, which closed ux Q37). The idea: during a
  session, hide everything but the staff and Stop. v2 has no such view: with the unit-2 layout,
  everything on or near the staff during a session already belongs to the session, and hiding the
  audio mix would conflict with master-spec §5 and §6, where the mix stays reachable at all times.
  The owner places the idea in v5, so it is recorded as v5 direction, not as a candidate with an
  open version ([v5+](../../versions/v5-plus/README.md#settled-direction)); whoever specs it there has
  to revisit the "mix reachable at all times" rule. No open question is registered. Master spec
  §2 (out of scope for v2). Master spec v1.7 → **v1.8** for D131–D133: §2, §6, §11 and §12.
- **D134 (2026-09-28): the count-in follows the click volume, and the click volume never reaches
  silence.** Owner (recorded on the UX side as ux D84, the audio mix placement).
  Resolves **O88**. The count-in plays at the click volume like any other click. The click volume
  control has no silent setting: its lowest setting is still audible, and turning the click off is
  the click on/off switch's job alone. So the count-in, which always clicks (D132), is always
  audible, with no special rule of its own. Exact ranges and default levels are an interface
  matter, waiting on listening tests (ux Q31); the spec does not fix them. Master spec v1.8 →
  **v1.9**: §6, §11 (v2.0 item 18) and §12.
- **D135 (2026-09-28): no session starts over a generation failure.** Owner (recorded on the UX
  side as ux D87, which closed ux Q38). While the app is Idle and reporting a failed generation
  (v1's generation-failure state, including a later failure that keeps the previous phrase on
  screen), neither a Start click nor any MIDI note starts a session, the starting note included,
  and no starting note is named. The player has to regenerate successfully first. Why: a session
  then never starts with a failure report on screen, and nothing on the screen shifts at Start.
  Narrows master-spec §6/§7's start rules; changes no release placement (v2.0). How the rule
  applies when starting from the Review is folded into **O84**. Master spec §6, §7, §11 (v2.0
  item 17 amended, new item 22) and §12.
- **D136 (2026-09-28): a session ended during the count-in goes back to Idle.** Owner (recorded on
  the UX side as ux D89, which closed ux Q40). A session that ends before phrase 1 starts
  sounding, by Stop or a hidden tab during the count-in (and, since D137, a turn to portrait),
  returns straight to Idle with phrase 1 still on screen. No review opens: no phrase started
  sounding, so there is nothing to review. The previous session's review is not restored: starting
  the session had already discarded it (master-spec §7). This refines §6's "a hidden tab ends the
  session … and the review opens" and §8's "keeps its selection into the Review" for that case.
  Master spec §6, §7, §8 and §11 (new v2.0 item 23).
- **D137 (2026-09-28): a session holds landscape, and turning to portrait ends it.** Owner
  (recorded on the UX side as ux D90, which closed ux Q41). New v2 behaviour, v2.0. At session
  start (the Start click or the starting note) the app asks the browser for a landscape
  orientation lock, and releases it when the session ends, however it ends; a refused or
  unsupported lock is silent, like the wake lock (D131). Chromium grants the lock only to a page
  in fullscreen, so on a phone in a normal tab it is usually refused, and the rule that applies in
  practice is the next one: a phone or tablet turned to portrait during a session, count-in
  included, ends the session exactly like Stop. This is a new way a session ends, next to the
  hidden-tab rule (§6). Why: as in v1, a portrait phone or tablet view shows a rotate-device notice
  instead of the staff, which would hide the staff and Stop mid-session. Other viewport changes
  keep the staff layout chosen at Start until the session ends; that is presentation, left to the
  UI documents. Opens **O89** (a portrait-shaped view without the device being turned), noticed
  by `spec-writer` while recording it. Master spec v1.9 → **v1.10** for D135–D137: §6, §7, §8,
  §11 (new v2.0 items 22–24) and §12.
- **D138 (2026-09-28): a session ends when the staff can no longer be shown.** Owner (recorded on
  the UX side as ux D94, which closed ux Q46). Resolves **O89** and generalizes D137's portrait
  rule (a turn to portrait is now one case of it). One rule covers every
  viewport change during a session, count-in included: the session ends exactly like Stop
  (during the count-in, back to Idle as D136) whenever the staff can no longer be shown. That
  happens when the view becomes portrait-shaped below the desktop breakpoint, where the
  rotate-device notice would replace the workspace, whether or not the device was turned (a
  split screen or a resized window count as well); or when the staff layout held since Start can
  no longer be engraved at its legibility floor (the minimum readable engraving size, a UI/UX
  quantity) at the new width, since a session never shows a notation error. Any other viewport
  change does not end the session: the staff is re-engraved at the new width in the held layout;
  the presentation details stay in the UI documents. Why: the staff and Stop are what a session
  needs on screen, however the view lost them. D137's landscape lock is unchanged. Opens **O90**
  (whether a session can start while the staff is not shown), noticed by `spec-writer` while
  recording it. Master spec v1.10 → **v1.11**: §6, §7, §11 (v2.0 items 23 and 24) and §12.
- **D139 (2026-09-28): no session starts while the staff is not shown.** Owner (recorded on the
  UX side as ux D98, which answers O90 and completes ux D94). Resolves **O90** with its proposed
  default. While the rotate-device notice replaces the workspace (a portrait-shaped view below the
  desktop breakpoint), and while the staff cannot be engraved at its legibility floor in the
  layout a session would hold, neither a Start click nor any MIDI note starts a session, the
  starting note included, and no starting note is named. Why: a session started there would end
  at once under D138. Once the view can show the staff again, the other start conditions apply as
  usual. Master spec §6 (new "When a session can start" list), §11 (v2.0 item 22) and §12 (the
  item is removed).
- **D140 (2026-09-28): the full list of states in which no session starts, and when the starting
  note is named.** Owner (recorded on the UX side as ux D79, the Start and Stop actions, and ux
  D93, where the starting-note line shows only while `Start session` is enabled; the gap was found
  by `ux-critic`). The spec named only a reported generation failure (D135) as a state in which no
  session starts, and v2.0 item 17 said the starting note is "always named" otherwise. The design
  also rules out a start while a new phrase is being generated (phrase 1 is "the phrase already on
  screen", which is then about to be replaced, so which phrase is phrase 1 is not clear), while the
  phrase cannot be drawn (notation error), under a rhythm combination v1 disallows (already v2.0
  item 11), before a first phrase exists, and (D139) while the staff is not shown. Taken from the
  ux play-session flow's start conditions and ux D98; no new condition. The spec now lists them
  all in one place, and the starting note is named exactly when playing it would start a session:
  a controller attached (§8), not while connecting one, and a session able to start. Changes no
  release placement (v2.0). How these conditions apply when starting from the Review stays with
  **O84**. Master spec §4, §6, §7, §11 (v2.0 items 17 and 22 rewritten) and §12.
- **D141 (2026-09-28): fitting the staff is part of a valid session phrase.** Owner (recorded on
  the UX side as ux D100, which closed ux Q48 and corrected ux Q20's "cannot occur"). Whether a
  phrase fits at the legibility floor depends on its content, so an in-session misfit can occur.
  During a session, a look-ahead phrase must fit the held staff layout at the legibility floor to
  be valid. One that does not fit is never shown: it is a failed attempt and takes master-spec
  §4's normal fresh-seed retries, exactly like a generation that found no phrase; only when no
  attempt produces a valid phrase by the deadline does the failure ladder repeat a phrase, and
  the repeat is recorded in §7's history like any other (D109: never visibly marked). The fit
  check is invisible to the player, and a session still never shows a notation error. The held
  layout is fixed at Start by breakpoint, never by phrase 1's content (on the UX side, the split
  layout below the tablet-landscape breakpoint and one system per phrase from it up); the spec
  records only that it depends on the window's width alone, and leaves the layouts themselves to
  the UI documents. Noted while recording it: each shown phrase's stored inputs (master-spec §7)
  are those of the attempt actually shown, so reproducibility from stored inputs is unchanged,
  though which fresh seed a session ends up using can now depend on the window's width. Master
  spec v1.11 → **v1.12** for D139–D141: §4, §6, §7, §11 (v2.0 items 17 and 22 rewritten, new
  item 25) and §12.
- **D142 (2026-09-28): below the tablet-landscape width, the staff must fit the window's height
  too.** Owner (recorded on the UX side as ux D104, which closed ux Q51). Extends D138 and D139:
  the "staff can no longer be shown" condition now also covers the window's height. Below the
  width where the UI/UX design switches to its tablet-landscape layout, the staff is sized to fit
  the window's height as well as its width: the whole staff, together with the row above it where
  the session shows the count-in and its notices, has to fit inside the window, measured with the
  browser's toolbars showing, so a toolbar appearing or hiding changes nothing. If even the
  staff's minimum readable size (its legibility floor) cannot fit that height, the staff counts as
  not shown: no session starts (as D139), and a running one ends exactly like Stop (as D138;
  during the count-in, back to Idle as D136). From the tablet-landscape width up, only the width
  counts, as before. The held layout is still chosen by the window's width alone (D141); the
  scale and the sizes involved stay in the UI documents. Master spec §6, §7 and §11 (v2.0 items
  22 and 24).
- **D143 (2026-09-28): a window change re-checks material already waiting to be drawn.** Owner
  (recorded on the UX side as ux D105, which closed ux Q52). Completes D138 and D141. On any
  change to the window's size during a session, count-in included, the fit check covers not only
  what is on screen but everything already checked and waiting to be drawn: in a layout that
  draws a phrase in parts, the part of the next phrase, or of a repeated phrase, not yet drawn. If
  any of it no longer fits the held layout at the legibility floor, the session ends exactly like
  Stop, as for any window too small for the staff. So a session never shows a notation error,
  whatever the window does. Noted while recording it, as a reading of D141 rather than a new rule:
  material already checked is not retried, since D141's retries apply to a look-ahead phrase when
  it is first checked, and a phrase still being generated at the time of the change is checked
  when it arrives, against the window as it is then. Master spec v1.12 → **v1.13** for D142–D143:
  §4, §6, §7 and §11 (v2.0 items 22, 24 and 25).
- **D144 (2026-09-28): a staff not shown for lack of space is a notice, not an error.** Owner
  (recorded on the UX side as ux D107, which closed ux Q53). **Changes v1's behaviour at Idle.**
  In v1, a phrase that could not be drawn in the window showed the notation error with its retry
  action, which cannot help until the window changes. Now, when the staff cannot be shown for lack
  of space (a window too narrow, or, below the tablet-landscape width, too short for the staff's
  minimum readable size, D142), the app shows a plain notice with no retry action, which clears by
  itself once the staff fits. The notation error, with its retry action, is kept only for failures
  a retry can cure. This notice is the Idle form of the "staff not shown" state of D139 and D142,
  so no session starts while it shows (unchanged); the rotate-device notice is unchanged. During a
  session nothing changes: a staff that can no longer be shown ends the session (D138). The
  notice's wording and look are UI/UX's (ux D107). Master spec §2, §6 and §11 (v2.0 item 22, new
  item 26).
- **D145 (2026-09-28): at Idle, a phrase whose notes do not fit is regenerated.** Owner (recorded
  on the UX side as ux D108). Extends D141 to Idle. **Changes v1's behaviour at Idle**, where such
  a phrase showed the notation error, and adds a second automatic regeneration to v1's one (an
  instrument switch). When the window has room for the staff but a phrase's content does not fit
  it (its notes need more width than the staff's minimum readable size allows), the phrase is not
  shown: the app quietly generates a new one with the normal fresh-seed retries, as in a session
  (D141). Only when every retry fails does the D144 notice show; no notation error is shown for
  it. Noted while recording it, as readings rather than new rules: an Idle phrase has no carry-in
  and no deadline, so only the first step of master-spec §4 applies (up to three fresh-seed
  retries); the rule covers any phrase about to be drawn at Idle, including the one on screen when
  a change to the window's size means it no longer fits; while the retries run, a new phrase is
  being generated, so no session starts (D140); and the generator's output for a given request and
  seed is unchanged, but which seed ends up shown at Idle can now depend on the window's size, as
  D141 already noted for a session. Opens **O92** (which phrase the notice keeps once every retry
  has failed), noticed by `spec-writer` while recording it. Master spec §2, §4, §6 and §11 (v2.0
  items 3 and 22, new item 26) and §12.
- **D146 (2026-09-28): below the tablet-landscape width, the `Sixteenth` note density is
  unavailable.** Owner (recorded on the UX side as ux D109, a product rule). **Changes v1's
  behaviour below that width.** Below the width where the UI/UX design switches to its
  tablet-landscape layout, the `Sixteenth` option of Note density cannot be chosen, since it is the
  most likely cause of a phrase too dense to fit a phone's staff. If `Sixteenth` was chosen while
  the window was wider, phrases below that width are generated with `Eighth`, and the chosen value
  is kept: it applies again once the window is wide enough. This is not a ban on sixteenth notes:
  other settings, such as rhythmic variety, can still produce some. How the unavailable option is
  shown is UI/UX's (ux D109). Two behaviours are still proposed, awaiting the owner, and are opened
  as **O91**: what happens when the window crosses that width at Idle, and during a session. Noted
  while recording it: v2 saves no settings across a page reload (master-spec §2), so "kept" means
  kept in memory for the page's lifetime, and `Sixteenth` can only reach a narrow window by having
  been chosen while it was wider (neither preset sets it); v3's local persistence will save the
  chosen value, not the one generated with; and a phrase's stored reproduction inputs (master-spec
  §7) hold the density it was actually generated with, so reproduction stays exact. Two further
  interactions, with the unsupported rhythm settings (v2.0 item 11) and with the settings-mutation
  flag (**O77**), are part of **O91**. Master spec v1.13 → **v1.14** for D144–D146: §2 (new
  "Changes to v1 at Idle"), §4, §5, §6, §7, §11 (v2.0 items 3, 11 and 22 updated, new items 26
  and 27) and §12.
- **D147 (2026-09-28): the note density a phrase is generated with follows the window's current
  width, at Idle and during a session.** Owner (recorded on the UX side as ux D110, which settles
  ux D109's two proposed behaviours). Replaces **O91**'s proposed defaults (a) and (b), including
  "fixed at Start". The density a phrase is generated with is derived from the window when that
  phrase is generated: below the tablet-landscape width a chosen `Sixteenth` generates as
  `Eighth`, and at or above it the chosen value applies (limited during a session by D148). This
  applies to the next phrase generated, at Idle and during a session alike: a session's locked
  setting is the chosen value, and the owner does not expect a desktop window to be resized
  mid-session. A phrase already on screen, or a look-ahead phrase already checked and waiting to
  be drawn, is never regenerated because the window crossed that width: it stays if it still fits,
  and otherwise D145 replaces it at Idle, or the session ends (D143). A session's history records,
  for each phrase, the density it was generated with (already true of the stored reproduction
  inputs, D146; now stated for a session whose density changes). Master spec §2, §5, §7 and §11
  (v2.0 item 27).
- **D148 (2026-09-28): unsupported rhythm settings are judged on the density generated with, and
  a session's density only steps down.** Owner (recorded on the UX side as ux D112, points 1 and
  2). Closes **O91**(c) with its proposal, and completes D147. (1) Whether a rhythm combination is
  one v1 disallows is judged on the note density a phrase is generated with: below the
  tablet-landscape width a chosen `Sixteenth` counts as `Eighth`, so a combination disallowed only
  because of `Sixteenth` blocks neither generation nor a start there, and a crossing at Idle can
  make the current settings blocked or unblocked. (2) During a session, widening the window
  changes nothing: once a session has generated a phrase with `Eighth` under D146, every later
  phrase of that session is generated with `Eighth` too, until it ends; the chosen value applies
  again from Idle. The density may step down mid-session, never up. Why v2.0 item 11 still holds
  during a session: the only change a window can make to a running session's density is the step
  from `Sixteenth` down to `Eighth`, and none of v1's disallowed combinations uses `Eighth`
  (checked against v1's list in `src/domain/controls/unsupported-rhythm-settings.ts`: four
  `Strict` and two `Slightly varied` combinations use `Sixteenth`, the rest `Quarter`), so the step
  can never land on one; the step back up, which could, is ruled out. If the rhythm grammar ever
  gains a disallowed `Eighth` combination, this reasoning must be checked again. Noted while
  recording it, as a reading rather than a new rule: phrase 1 is the phrase already on screen at
  Start (master-spec §4), generated at Idle with the density that applied then, so the session's
  own generation, and the step-down rule, start with phrase 2; a session whose phrase 1 was
  generated with `Eighth` in a window widened before Start generates phrase 2 with `Sixteenth`,
  and the Start check (1) is made on the window at Start. Master spec §2, §5, §6 and §11 (v2.0
  items 11 and 27).
- **D149 (2026-09-28): when the "staff needs more room" notice clears, a new phrase is
  generated.** Owner (recorded on the UX side as ux D112, point 3). Resolves **O92** against its
  proposed default, which kept the phrase last on screen if it fit: the owner chose "always a new
  one". Whenever the notice (D144) clears at Idle because the staff fits again, the phrase last on
  screen is not drawn again; a new phrase is generated with D145's fresh-seed retries. This holds
  whichever way the notice came up: a window too small for the staff, or every retry to replace a
  phrase too wide for it having failed. Opens **O94** (the notice clearing while the rhythm
  settings are unsupported, so that no phrase can be generated), noticed by `spec-writer` while
  recording it. Master spec §2, §4, §6, §11 (v2.0 item 26) and §12.
- **D150 (2026-09-28): the settings-mutation flag treats `Sixteenth` as unavailable below the
  tablet-landscape width.** Owner (recorded on the UX side as ux D112, point 4). Closes **O91**(d)
  with its proposal, and so closes **O91** as a whole (with D147 and D148). In v2.1, a mutation
  that would land on `Sixteenth` below that width mutates again, as for an unsupported combination
  (D103). Opens **O93** (how the flag treats note density in a session generating with `Eighth`:
  which value a density mutation steps from, and whether `Sixteenth` is unavailable in a session
  that stepped down and whose window is now wide), noticed by `spec-writer` while recording it.
  ux D111 (each phrase keeps its own engraving scale) is not recorded here: the spec leaves scale
  to the UI documents (D142). Master spec v1.14 → **v1.15** for D147–D150: §2, §4, §5, §6, §7,
  §11 (v2.0 items 11, 26 and 27) and §12.
- **D151 (2026-09-28): when the "staff needs more room" notice clears under unsupported rhythm
  settings, no phrase is shown.** Owner (recorded on the UX side as ux D114, which confirmed this
  question's proposed default). Closes **O94** with its proposal. When the notice (D144) clears at
  Idle because the staff fits again, while the rhythm settings are a combination v1 disallows
  (judged on the density a phrase would be generated with, D148), no phrase can be generated, so
  none is shown: the workspace is as it is before a first phrase exists, with the
  unsupported-rhythm alert showing as it does there, and generation stays blocked until the
  settings change. The phrase last on screen is not drawn again (D149). How it looks is UI/UX's
  (ux D114). Noted while recording it, as a reading rather than a new rule: once the settings are
  allowed again, the player generates a phrase as before a first phrase exists; nothing is
  generated by itself, since the notice has already cleared (compare D152). Master spec §6, §11
  (v2.0 item 26) and §12.
- **D152 (2026-09-28): what clears the "these notes need more room" notice.** Owner (recorded on
  the UX side as ux D116, which closed ux Q59). Completes D145 and D149. The notice (D144) has two
  causes: no room for the staff (a window too narrow, or, below the tablet-landscape width, too
  short, D142), or room for the staff but every one of D145's Idle retries too dense to fit it.
  For the second cause, anything that could cure it starts a fresh round of D145's retries
  automatically: a new phrase is generated from the current settings with a fresh seed, and
  retried with fresh seeds if it does not fit. Three things start a round: the window getting
  wider, a change to a setting (such as note density), and regenerating by hand, since the phrase
  action stays available beside the notice (ux D114). The first phrase that fits clears the notice
  and is shown; if the round fails too, the notice stays, and the next such change starts another
  round. The window getting narrower never starts a round. **Adds automatic regenerations at
  Idle**, only while this notice shows: a wider window or a changed setting regenerates without
  the player asking, besides v1's instrument switch and D145's retries. Checked against D149 ("a
  new phrase is generated when the notice clears") for both causes, as readings rather than new
  rules: for no room, the notice clears when the staff fits, and the new phrase D149 generates is
  itself such a round, so if every attempt is too dense the notice shows again, now with the
  second cause; for too-dense notes, the order is reversed, since the notice clears only once a
  round's phrase fits, and that phrase is the one shown. So D149 holds for both causes: the
  notice only ever gives way to a new phrase, never to the phrase last on screen or to any
  attempt too dense to fit. Further readings: "a setting" means one the phrase is generated from,
  since only those could cure it (tempo, the audio mix and the theme cannot change the notes,
  §6); "wider" is about width alone, since a phrase too dense needs more width than the staff's
  minimum readable size allows (D145); a narrowing that leaves no room for the staff gives the
  notice its first cause; while the window has no room, a phrase generated by hand cannot be
  shown either, so the notice stays (ux D114); and while a round runs, a new phrase is being
  generated, so no session starts (D140). Opens **O95** (a change that should start a round
  landing on a rhythm combination v1 disallows, so that no round can run), noticed by
  `spec-writer` while recording it: D151 covers the notice clearing under unsupported settings,
  but under the second cause the notice clears only when a phrase fits. ux D115 (the no-room
  sentence follows the width breakpoint) is not recorded here: the spec leaves the notice's
  wording to the UI documents (§6). Master spec v1.15 → **v1.16** for D151–D152: §2, §4, §6, §11
  (v2.0 item 26) and §12.
- **D153 (2026-09-28): unsupported rhythm settings under the "these notes need more room" notice
  give way to no phrase.** Owner (recorded on the UX side as ux D117, point 1). Closes **O95**
  against its proposed default, with the alternative it named, which follows D151. While the
  notice (D144) shows because every retry was too dense (D152's second cause), a change that would
  start a round but makes the rhythm settings a combination v1 disallows (judged on the density a
  phrase would be generated with, D148) starts no round, since no phrase can be generated. A
  setting change can do this, and so can the window getting wider past the tablet-landscape width
  with a chosen `Sixteenth`. The notice gives way: no phrase is shown, as before a first phrase
  exists, with the unsupported-rhythm alert showing as it does there, and generation stays blocked
  until the combination is allowed again. Once it is, whether by a setting change or by the window
  crossing that width (D148), nothing is generated by itself: the player generates a phrase by
  hand, as before a first phrase exists. So, whichever way the notice clears or gives way, a
  blocked combination leads to the same workspace (D151 for the notice clearing, this entry for a
  change made while it shows). This concerns the notice only. v1's behaviour when a phrase is on
  screen is unchanged: a rhythm setting that makes the combination unsupported leaves that phrase
  on screen, with the alert, and blocks generation. The rest of ux D117 (ux Q60 and ux Q61: how
  the notice looks during a round and over a generation-failure report) is UI-only and not
  recorded here. Its last sentence, that only a change to a setting the phrase is generated from
  starts a round, is already D152's reading. Master spec §2, §4, §6, §11 (v2.0 item 26) and §12.
- **D154 (2026-09-29): a wider window while a round of retries runs starts nothing.** Owner
  (recorded on the UX side as ux D118). A reading of D152, which says a wider window starts a
  round but not what happens while one runs. While the "these notes need more room" notice shows
  and a round of D145's retries is running, the window getting wider neither restarts that round
  nor queues another. The round carries on, each remaining attempt checked against the window's
  size when it is drawn, as every phrase is; the first that fits clears the notice and is shown,
  and if the round fails, the notice stays until the next widening, setting change or regenerating
  by hand. Rejected: queueing one more round when the window grew during a round that then failed
  (every widening would visibly get an answer, at the cost of one more rule); abandoning and
  restarting the round (it needs a settle delay, since dragging a window edge gives many size
  changes in a row). Accepted cost: a single widening that lands inside a round's brief run can
  look as if it did nothing; a player dragging an edge keeps widening after the round ends. Noted
  while recording it, as a reading rather than a new rule: of D152's three things that start a
  round, only the window can change during one, since while a phrase is being generated v1 makes
  the settings it is generated from read-only and disables the phrase action. Opens **O96**
  (which note density a round's later attempts use when the window crosses the tablet-landscape
  width during the round), noticed by `spec-writer` while recording it: D147 takes the density
  from the window when each phrase is generated, and with a chosen `Sixteenth` a crossing can
  make the rest of the round a combination v1 disallows. Master spec v1.16 → **v1.17** for
  D153–D154: §2, §4, §6, §11 (v2.0 item 26) and §12.
- **D155 (2026-09-29): during a round of retries, each attempt takes its note density from the
  window when it is generated.** `ux-writer`'s call under the owner's delegation of minor calls
  (recorded on the UX side as ux D120; the delegation is ux D119). Closes **O96** with its
  proposal, the literal reading of D147. Each fresh-seed attempt of a round of D145's retries
  under the "these notes need more room" notice takes its note density from the window's width
  at the moment it is generated, as every phrase does (D147). If a crossing of the
  tablet-landscape width during the round makes the rhythm settings a combination v1 disallows (a
  widening with a chosen `Sixteenth`, judged as in D148), the round stops at once and none of its
  attempts is drawn: the workspace is where D153 leaves it, with no phrase, the unsupported-rhythm
  alert, generation blocked until the combination is allowed again, and nothing generated by
  itself once it is. A narrowing below that width steps the remaining attempts down to `Eighth`,
  and the round carries on; that step can never land on a disallowed combination, since none
  uses `Eighth` (D148). Rejected: a round keeping the density it started with (a second density
  rule, for a rare case). Noted while recording it, as a reading rather than a new rule: the same
  holds for D145's first retries, those that replace a phrase that stopped fitting before any
  notice shows, since D147 applies to every phrase generated; a crossing that makes the
  combination disallowed during them stops them the same way, with the outcome D156 gives a
  phrase that stops fitting under such a combination. Master spec §2, §4, §5, §6, §11 (v2.0 item 26) and §12.
- **D156 (2026-09-29): at Idle, a phrase that stops fitting while the rhythm settings are
  disallowed gives way to no phrase.** `ux-writer`'s call under the owner's delegation (recorded
  on the UX side as ux D121, which closed ux Q62 with ux D120; the delegation is ux D119). Fills a
  gap in D145, which replaces a phrase on screen that no longer fits with fresh-seed retries:
  none can run while the rhythm settings are a combination v1 disallows (judged on the density a
  phrase would be generated with, D148), and the spec did not say what shows then. At Idle, while
  the combination is disallowed, a phrase on screen that stops fitting the room is not drawn and
  no retry runs: the workspace is where D153 leaves it, with no phrase, the unsupported-rhythm
  alert, generation blocked until the combination is allowed again, and nothing generated by
  itself once it is. It does not take the "these notes need more room" notice, whose cures cannot
  work while no phrase can be generated, whereas the alert names the actual block. Its most
  likely trigger is one widening past the tablet-landscape width, which both changes the staff's
  layout, so the phrase may no longer fit, and makes a chosen `Sixteenth` combination disallowed
  (D148); a narrowing can do it too. A window with no room for the staff at all still shows the
  notice (its first cause, D152), which is about the window and stays true; when it clears, D151
  applies. So D153's last point, that a phrase on screen stays when a rhythm setting makes the
  combination unsupported, as in v1, holds as long as that phrase fits. This replaces a UI detail
  the spec never recorded (confirmed in ux D114), where such a phrase took the notice. Master
  spec v1.17 → **v1.18** for D155–D156: §2, §4, §5, §6, §11 (v2.0 item 26) and §12.
- **D157 (2026-09-29): a join made without carry-in is not smoothed, and settles nothing the
  phrase before it owed.** `spec-writer`'s correction under the owner's rule for this pass (minor
  issues settled without asking), from gaps 1 and 3 of `documentalist`'s v2 ingestion report. No
  new rule. The failure ladder's second step retries "without carry-in, as a standalone phrase"
  and says the join isn't smoothed, while v2.0 item 2 said every join obeys the in-phrase
  interval and register rules. Carry-in is what carries the last pitch and its leap state across
  a join (D105), and the join rules act through it (D80, D81), so a join into the standalone
  phrase, or into a repeat (the previous phrase again, as it was), cannot obey them: no interval
  or register rule applies across it, and a leap recovery or a tense note's resolution the phrase
  before left owing is not settled. The standalone phrase obeys v1's rules in full, and its output
  for a given request and seed is v1's (v2.0 item 3 now names it). Item 2 now covers joins made
  with carry-in. Whether a phrase should be allowed to end owing something such a join, or the
  session's end, leaves unsettled is **O97**. Master spec §3, §4 and §11 (v2.0 items 2 and 3).
- **D158 (2026-09-29): a phrase generated with carry-in may end owing a leap recovery or a tense
  note's resolution, and a tense note resolves onto the next phrase's first note.**
  `spec-writer`'s correction under the owner's rule for this pass, from gaps 2 and 11 of the same
  report. No new rule. Master spec §3 said every phrase "remains a valid, self-contained v1
  result", which D80 and D81 contradict: v1 lets no phrase's final sounding event carry a leap
  recovery debt or an unresolved local dissonance. Stated now: a phrase generated without
  carry-in is exactly a v1 result; one generated with carry-in obeys every v1 rule except that it
  may end owing either, which the next phrase settles. D81's title says the tense note resolves
  "onto the join's last note", and the v2 README repeated it; D81's body, the archived
  rolling-phrase draft and the master spec all say the next phrase's first note, which is the
  reading kept, and the README now says so. D81's other half, full v1 resolution "where the music
  really stops", cannot be enforced, since no phrase is known in advance to be the last: it is
  opened as **O97**, and master spec §3 marks it open. Master spec §3; v2 README.
- **D159 (2026-09-29): the review shows every phrase that started sounding.** `spec-writer`'s
  correction, from gap 4 of the same report. No new rule. §7's review listed "every phrase that
  was shown", while the session history it is built from keeps only phrases that started sounding
  (D88), and says a look-ahead phrase only ever shown as read-ahead does not count. The history's
  definition wins: such a phrase, drawn but never sounded because the session ended first, is in
  neither the review nor any export. Master spec §7.
- **D160 (2026-09-29): a look-ahead phrase already partly on screen is never discarded for a
  setting change.** `spec-writer`'s correction, from gap 5 of the same report, settled by the rule
  that no note already on screen ever changes (v2.0 item 4 until now, and the intent of the
  phrase-boundary rule) and by the quiet update of D91. §5 discarded and regenerated a look-ahead
  phrase generated with the old settings whenever at least a measure remained before its
  deadline, but the rolling display draws a look-ahead phrase as soon as it is engraved (ux D82),
  in the one-system layout usually long before its deadline. Now such a phrase is discarded only
  if none of it is on screen yet and at least a measure remains; otherwise it stays as it is, and
  the change applies from the phrase after it. Rejected: discarding a phrase already drawn as
  read-ahead, which would change notes the player may already be reading. Master spec §5 and §11
  (v2.1).
- **D161 (2026-09-29): applying a setting change at a phrase boundary ships in v2.1, with the
  settings-mutation flag.** `spec-writer`'s correction, from gap 6 of the same report. The
  settings are locked for the whole session and only automatic sources may change one (D91); the
  first, the settings-mutation flag, ships in v2.1 (D107), and adaptive tempo (v2.2) changes only
  the tempo, which never changes what is generated (D84). So nothing changes a setting during a
  v2.0 session, and the v2.0 row's "control changes locked to phrase boundaries" and v2.0 item 4
  described a mechanism with nothing to trigger it. v2.0 now delivers the settings lock, which
  item 4 states; the phrase-boundary rule (with D160) and its acceptance criterion move to v2.1.
  Rejected: building it in v2.0 behind a test-only trigger. The note-density rule (D147, D148) is
  not a setting change and stays in v2.0. The latency prerequisite's cold run after a mid-session
  change applies from v2.1. Master spec §5 and §11.
- **D162 (2026-09-29): v2.0 records played notes in the session history but does not show them.**
  `spec-writer`'s correction, from gap 7 of the same report. The v2.1 row said played notes in
  the review were "already partly true in v2.0" without saying what. From D93, D104 and §7's
  history: v2.0 records the played notes and the acknowledgements in the session history, but its
  review does not show them; the toggle that shows them arrives in v2.1, with their export. Master
  spec §11.
- **D163 (2026-09-29): the "generator is struggling" notice stays until a newly generated phrase
  starts sounding.** `spec-writer`'s correction, from gap 10 of the same report, bringing the
  master spec in line with ux D83 (user-confirmed). The notice shows from the second consecutive
  repeated phrase until a newly generated phrase (not a repeat; the failure ladder's standalone
  phrase counts) starts sounding, and goes when the session ends. Master spec §4 and §11 (v2.0
  item 1). Master spec v1.18 → **v1.19** for D157–D163, which also lists **O97**, **O98** and
  **O99** in §12 (opened with them, from gaps 1–2, 8 and 9).
- **D164 (2026-09-29): the rolling display is two alternating staff systems with no mode toggle;
  ux D71 supersedes D95.** `spec-writer`'s correction under the owner's rule for minor issues,
  found by `coding-leader` while writing the v2 build plan and routed by `ux-writer`. No new rule.
  D95 (archived) had v2.0 ship two rolling-display behaviours, "fixed" and "scrolling", switchable
  by a toggle, so the app could be tried both ways before one was chosen. The design has since
  chosen: ux D71 (user-confirmed, 2026-09-28) settles one display, two staff systems one above the
  other, the one not being read refilled with what comes next and nothing scrolling or shifting,
  and rejects a scrolling strip. So v2 has one rolling display and no mode toggle, and D95 no
  longer holds. O40, which D95 resolved, stays resolved, by ux D71. The master spec never carried
  the two modes and leaves the display to the design, so it is unchanged. The v2 README's status
  snapshot, which still listed D95 as settled, now records the supersession, and its "Sessions"
  item, which said the phrase "keeps scrolling" through a silence, now says it keeps rolling, as
  master spec §7 does. v2 README; open-questions.md.
- **D165 (2026-09-29): the MuseScore check of the MusicXML export covers the two transposing
  templates with `<transpose>` and the C keyboard without it.** `spec-writer`'s correction, same
  route. No new rule. Master spec §11 (v2.0 item 12) asked for MusicXML to open correctly in
  MuseScore "for at least three transposing instrument templates", which cannot be checked: the
  app has three instrument templates and only two transpose. The B♭ tenor and E♭ alto saxophones
  carry a written-pitch transposition; the C MIDI keyboard carries none
  (`src/domain/profile/instrument-profiles.ts`), and §7 leaves `<transpose>` out for a C
  instrument. The criterion now covers each of the three: the two transposing templates with their
  `<transpose>` element, and the C keyboard without one, which also checks the omission. Master
  spec §11. Master spec v1.19 → **v1.20**.
- **D166 (2026-09-29): the v2 README's session start follows master spec §6.** `spec-writer`'s
  correction, same route. No new rule. The README's "Sessions" item said a session starts "on the
  first MIDI input or a Start click", the rule D115 replaced. Master spec §6: from MIDI, only the
  note phrase 1 starts on, at its exact pitch with the octave included, starts a session, and only
  while a session can start at all; any other note starts nothing. The item now says so and points
  to §6. v2 README.
- **D167 (2026-09-29): a session's last phrase may end with a leap recovery or a tense note's
  resolution still owed; the carry-over between phrases is kept.** The product owner's answer to
  **O97**, confirming its proposal: "if the session end, it ends, that's it. We allow tension to
  settle on the next phrase. but if the next phrase never happen due to session ending, that's
  ok." Inside a session a phrase may still end just after a big leap whose recovery the next
  phrase starts with (D80), or on a tense note the next phrase's first note resolves (D81, D158).
  The app cannot know which phrase a session ends on, so a session's last phrase, in the review
  and the export, may end with a recovery or a resolution still owed, as it may be cut off
  mid-phrase; the same holds before the failure ladder's standalone phrase or a repeat, whose join
  is not smoothed (D157). This replaces D81's "full v1 resolution where the music really stops".
  Rejected: every session phrase ending as v1 requires, which makes any phrase a clean place to
  stop at the cost of joins that sound more like one phrase stopping and the next starting. v1's
  atoms `rule_leap_recovery` and `rule_open_phrase_ending` need a v2 scope accordingly. Master
  spec §3, §11 (v2.0 item 2) and §12. Master spec v1.20 → **v1.21**.
- **D168 (2026-09-29): the boundary between two close expected notes splits the gap at the
  halfway point.** The product owner's decision, on a flaw the chunk 14 implementer found in master
  spec §8. The rule said a window opens 150 ms before its note's onset and closes at the later of
  200 ms after it or the end of the note's tied span, but never after the next expected note's
  window opens. When the next onset is less than 150 ms later (sixteenth notes from 110 BPM,
  eighth notes from 210 BPM), the earlier note's window then closes before its own onset: at
  120 BPM sixteenth notes are 125 ms apart, so note A's window becomes [−150, −25] ms and note B's
  [−25, 100] ms around A's onset, and A played on time falls in B's window and is rejected on
  pitch. At exactly 150 ms apart the two windows meet at A's onset. Decided: the boundary between
  two consecutive expected notes is the later of (the second note's onset − 150 ms) and the point
  halfway between the two onsets. A note's window closes at the later of 200 ms after its onset or
  the end of its tied span, but never after that boundary; the next note's window opens at that
  boundary. Every window then contains its own onset, and nothing changes when notes are 300 ms or
  more apart. Two readings the implementer proposed, which follow the spec's existing wording, are
  now stated explicitly: windows include both their ends, and at an instant two windows share, the
  earliest unacknowledged expected note whose pitch matches wins; a phrase's last expected note is
  bounded by the next phrase's first expected note in the same way (every phrase starts with a
  fresh attack on beat 1), and while the next phrase is not known yet its window is not cut short
  by it. Refines D78 (O41). v1 has no note acknowledgement, so nothing in v1 changes. The atom
  `rule_expected_note_window` still states the old cutoff and needs updating by `documentalist`.
  Master spec §8 and §11 (v2.0 item 7); v2 README. Master spec v1.21 → **v1.22**.
- **D169 (2026-09-30): the next session's phrase 1 is a fresh phrase generated at the session
  end, and a session starts from the Review exactly as from Idle, the starting note included.**
  Resolves **O84**. _Its start-from-Review part is superseded by **D170** (owner, same day): no
  session starts while the Review shows. The fresh phrase at the session end stands._ The owner delegated the unit 6 decisions (the last-session Review) to
  `ux-writer` on 2026-09-30, the Review's phrase 1 and its start included (ux D135: keep the
  Review as simple as possible), and `ux-writer` settled them as **ux D137**, recorded here as
  settled. At every session end once phrase 1 has started sounding, the ended session's phrases
  leave the staff and the app generates a fresh phrase from the current settings, with a fresh
  seed and no carry-in, as regenerating by hand at Idle would (the retries that replace a phrase
  whose notes do not fit included); if the staff has no room, nothing is generated until the
  notice clears. That phrase, on screen above the Review, is the next session's phrase 1, so §4's
  "the phrase already on screen before Start" holds unchanged. A session starts from the Review by
  a Start click or, with a controller attached, by that phrase's starting note, under the Idle
  start conditions (§6), which now say "at Idle, the review showing or not"; the starting note is
  named as at Idle. Either start discards the Review without asking (D130). Accepted risk: a note
  played while looking back can start a session and discard an unexported Review; the starting
  note is always named. Rejected: O84's click-only proposal (after a visit's first session a
  Review is almost always open, so the hands-free start of D115 would stop working or need an
  extra discard action), and phrase 1 as the ended session's last phrase or its phrase 1 again (a
  start on material already read, against P2.S1). A session ended during its count-in is
  unchanged: no Review, phrase 1 stays. No other product rule changes. Master spec §4, §6, §7,
  §11 (v2.0 items 12, 17 and 22, and new item 28) and §12; v2 README. Master spec v1.22 →
  **v1.23**. Wording fixed the same day, no new rule (from `ux-critic`'s narrow pass): phrase 1
  is the phrase on screen when the session starts, first generated fresh at the session end, since
  regenerating by hand, an instrument switch or a phrase that stops fitting still replaces it
  while the Review shows (ux D136).
- **D170 (2026-09-30): leave the Review before starting a session.** The product owner, through
  the coordinator, overriding part of ux D137 (recorded as **ux D143**, with the design details as
  ux D144): "one should leave review mode before starting a new session." Supersedes D169's
  start-from-Review part. While the Review shows, no session starts: not by a Start click, not by
  any MIDI note, the starting note included; no note played there starts anything and no
  starting note is named (connecting a controller still works there, master spec §8). The player leaves the Review, then starts from Idle under the usual conditions (master
  spec §6). Leaving keeps the Review, reachable again until the next session starts or the page
  closes; only that start discards it, still without confirmation (D130). D169's other parts
  stand: at every session end once phrase 1 has sounded, a fresh phrase is generated from the
  current settings, and phrase 1 is the phrase on screen at Idle when the session starts. The
  stray-note risk D169 accepted is gone. The next session is now two actions away from the Review
  (leave, then start) instead of one, by the owner's choice. How the Review is shown and left
  (ux D144: it replaces the staff and the controls, and the session button reads `Close review`)
  is the design's call. Master spec §4, §6, §7 and §11 (v2.0 items 12, 17, 22 and 28); v2 README;
  build plan chunk 20. Master spec v1.23 → **v1.24**. _Corrected the same day:_ ux D145 revised
  D144, so the Review takes only the staff area's place; the mix, tempo, settings and controller
  connection stay usable while it shows (§5, §6, §8, §10), and only the session start is
  withheld.
- **D171 (2026-10-02): the MusicXML export's last phrase closes with a final barline.**
  `spec-writer`'s correction, from a non-blocking finding of the chunk 20 preflight. No new rule.
  On 2026-09-29, while the MusicXML encoder was built (build plan chunk 18), the product owner
  decided that every phrase but the last ends with a double barline (two thin lines) and the last
  with a final barline (a thin line then a thick one); `rule_generated_notes_musicxml_export` v0.2
  and the encoder already say so, but master spec §7 still read "a rehearsal mark and a double
  barline" for each phrase. §7 now states both barlines. Master spec §7. Master spec v1.24 →
  **v1.25**.
- **D172 (2026-10-03): Neutral moves its harmony gently and first load varies its arpeggios.**
  The product owner's decision. The Neutral preset's harmonic motion changes from `Static` to
  `Gentle diatonic`, and the first-load arpeggio chaos from `Predictable` to `Varied`. Arpeggio
  chaos stays out of every preset bundle; Jazz is unchanged; what each control value does is
  unchanged, only the values Neutral and first load pick. Why: with `Static` (one tonic chord for
  all four bars) and `Predictable` (the nearest chord tone wins, so repeating the same note ranks
  first), the default phrase collapsed to about two repeated pitches. Phrase replay keys carry
  every control explicitly, so old keys replay unchanged. First-release master spec (header and
  musical profile preset), generator contract and architecture, generative process (the fixed
  reference pitch context is no longer called the default), phrase-workspace handoff and doc,
  lexicon, and the atoms `rule_profile_presets_apply_defined_controls` and
  `module_generation_control_catalog`.
- **D173 (2026-10-03): the real-hardware checks leave the v2.0 gate for a new release, v2.4
  "real-hardware checks", placed after v2.2.** The product owner's decision, through the
  coordinator. Four sets of checks move out of the v2.0 gate (build plan chunk 21, master spec
  §11 and §12) into v2.4:
  - the controller check verified on the reference hardware (master spec §12: with the device's
    own transpose setting at C, B♭ tenor and E♭ alto, which MIDI note a written middle C sends,
    whether an octave setting changes it, and the note-on velocity; it decides whether a manual
    input-transposition setting is needed);
  - tuning the acknowledgement windows (150 ms early, 200 ms late) and the latency constants on
    the reference hardware, by the procedure in `docs/midi-tuning.md` (v2.0 item 9);
  - the hand checks of real exports: the MusicXML files opened in MuseScore for the three
    instrument templates, and the MIDI files opened in a MIDI tool (the real-program part of
    v2.0 item 12; `docs/export.md#hand-check`, `tests/fixtures/export-hand-check/`);
  - the measurements in real Chromium on the reference machine and hardware: v2.0 items 6 (the
    playhead within 20 ms of the audio over five minutes), 9 and 15 (no main-thread task longer
    than the audio scheduler's look-ahead at 240 BPM).

  Everything else in the v2.0 gate stays there: O57's listening test, the audio mix levels (ux
  Q31), Bluetooth MIDI (O71), the screen wake lock dropped mid-session (O87), the owner's rulings
  on the silence timer and the reconnection window left by chunk 17, the VISION v0.4 sign-off,
  the atoms' status, the seed-matrix sweep of item 1, the v1 regression and offline checks, the
  privacy spy, the done-items table and the tag. **v2.0 can ship before the hardware checks.** It
  ships with the timing constants at their starting values, untuned: the 150 ms and 200 ms
  windows the owner approved as rule text, and the latency constants at their starting values
  (today no correction over USB). The definition-of-done
  items keep their numbers; items 6, 9 and 15 and item 12's real-program part are now listed
  under v2.4. v2.3 is left empty by D174 and the number is not reused: nothing is renumbered.
  Consequences, not new rules: if the controller check on the reference hardware shows that a
  manual input-transposition setting is needed, that setting arrives after v2.0 has shipped; if
  the tuning calls for another window value, `rule_expected_note_window` is still revised first,
  with the owner's sign-off. Opened **O104** (whether the v2.1 and v2.2 gates' own checks in real
  programs or on the reference machine follow). Master spec status line, §2, §11 and §12; build
  plan §1, chunks 17, 20 and 21, new chunk 35; v2 README; roadmap; versions index.

- **D174 (2026-10-03): the end-of-measure chord-fit check leaves v2 and becomes a v3
  nice-to-have.** The product owner's decision, through the coordinator. The v2.3 release
  (build plan chunks 32–34) is removed from v2's release sequence and waves; v2 ships as v2.0,
  v2.1, v2.2 and v2.4. The check is recorded in v3 as a nice-to-have, **not committed scope**.
  This replaces only D108's release placement (v2.3): D108's definition of the check (kept;
  judged per measure by pitch class; fires only on a measure where the player went off-script;
  "blue" and passing chromatic notes that don't resolve get no signal) is kept as the design
  starting point, in master spec §9, which stays in place marked as outside v2, and the build
  plan keeps chunks 32–34 as notes, out of every wave. The per-note acknowledgement of v2.0 is
  unchanged; with no chord-fit check, a player who embellishes gets no measure-level signal in
  v2. Interface unit 9 (the chord-fit presentation, `ui_ux/todo.md`) is no longer v2 work; that
  is `ux-writer`'s tree to update. Master spec status line, §2, §9, §11 and §12; build plan §1
  and chunks 32–34; v2 README; v3 README; roadmap; versions index.
- **D175 (2026-10-03): three rhythm features recorded as v3 candidates, reachable through a new
  note-density value, Custom.** The product owner's ideas, recorded as **candidates, not
  committed scope**. All three sit in the rhythm category of the settings and are reachable only
  when note density is set to a new value, **Custom** (working name):
  - **Rhythm ratios:** the player sets how likely each note value is to appear, from the whole
    note down to the sixteenth note.
  - **Rhythm editor:** either copy the rhythm of one of the bars, or enter a rhythm by hand.
  - **Rhythm lock:** when set, the rhythm does not change. Generation may bend that rule a
    little, to create tension and release, but the rhythm stays stable across the session.

  With the settings-mutation flag (v2.1): a mutation can never move note density into Custom;
  while Custom is set, a mutation may alter the ratios; while the lock is set, a mutation cannot
  alter the rhythm durably, a temporary bend being the only latitude. Opened **O100**–**O103**
  for what this leaves undecided. v3 README; roadmap.

- **D176 (2026-10-03): the settings-mutation flag fires at a random interval of 2 to 4 phrases,
  and starts off.** The product owner's answer to **O77**. The number of phrases between two
  mutations is drawn at random, from 2 to 4, from a seeded source, so a session's mutations can
  be replayed from its stored inputs. The flag is opt-in: it starts off. With D103 and D107, O77
  is closed. The count before the first mutation is drawn the same way, counted from the
  session's start (confirmed by the owner the same day). Master spec §5 and §12; build
  plan chunks 24 and 25.
- **D177 (2026-10-03): in a session generating with `Eighth`, a note-density mutation steps from
  the density generated with.** The product owner's answer to **O93**, with its proposal. A
  mutation steps from the note density a phrase is actually generated with, and `Sixteenth`
  counts as unavailable to a mutation whenever the session generates with `Eighth` under D146,
  whatever the window's width. Extends D150. Master spec §5 and §12; build plan chunk 24.
- **D178 (2026-10-03): the multi-phrase tension arc repeats every four phrases, and its toggle
  starts off.** The product owner's answer to **O98**, with its proposal. Counted from phrase 1,
  in groups of four phrases (16 measures): the first phrase of each group is generated with the
  chosen tension arc (so phrase 1, generated at Idle, already fits), the second one step tenser,
  the third as chosen, the fourth one step calmer, in the order Settled, Lift, Build, Edge, with
  no step past either end. The tension-arc setting keeps showing the player's choice; only what
  each phrase is generated with changes. The toggle starts off. When the settings-mutation flag
  changes the tension arc, the longer arc steps around whatever value is in effect. Master spec
  §3 and §12; build plan chunks 29 and 30.
- **D179 (2026-10-03): adaptive tempo pauses while the controller is away.** The product owner's
  answer to **O99**, choosing its alternative over its proposal. While a controller lost
  mid-session is away, the tempo does not rise; the rise resumes when the controller reconnects.
  A session started while the selected controller is away has no controller (D126), so adaptive
  tempo does not run in it. Adaptive tempo starts off when the page loads, and the player's
  choice is kept from one session to the next for as long as the page stays open. The phrases
  that start sounding while the controller is away do not count toward the next rise, and
  counting resumes where it stopped (confirmed by the owner the same day).
  Rejected: the rise carrying on its schedule while the controller is away. Master spec §10 and
  §12; build plan chunks 27 and 28.
- **D180 (2026-10-03): the v2.1 and v2.2 gates' checks in a real program or on the reference
  machine move to v2.4 too.** The product owner's answer to **O104**, with its proposal ("yes").
  Extends D173 to the later gates: the played-notes MIDI file and the generated-notes MIDI file of
  one session lining up when imported together into a real DAW (v2.1), and the first generation
  after an automatic setting change re-measured on the reference machine on the v2.1 code (the
  latency prerequisite's cold run) are checked in v2.4, not in the v2.1 gate. So v2.1 and v2.2,
  like v2.0, can ship before the hardware checks; their automated tests still gate them. v2.4
  runs every moved check on the code it ships with. The v2.2 gate had no such check of its own.
  Master spec §11 and §12; build plan chunks 26, 31 and 35.
- **D181 (2026-10-03): the settings-mutation flag's scale of one grade per setting.** The product
  owner accepted the scale the coding leader proposed while building chunk 24:
  - **Ordered settings** step along their catalog order, with no wrap: harmonic motion, tension
    arc, note density, rhythmic variety, syncopation, silence density, leapiness, arpeggio chaos.
  - **Key** (the written tonal center) steps one place around the circle of fifths, wrapping.
  - **Collection** steps within two separate groups that never cross: Major ↔ Minor, and the
    modes by brightness, Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian, with no
    wrap.
  - **Contour** has no order: any other contour is one step.
  - **Register** steps Low, Middle, High, with no wrap, and never lands on Varying. From Varying it
    steps from the register the session resolved, then holds that concrete register.
  - **Musical profile** flips Neutral ↔ Jazz as an identity change only: the controls are kept, the
    profile is marked customized, and the preset bundle is never applied.
  - Mutating a profile-controlled value marks the profile customized.
  - The harmonic part of carry-in also drops when it no longer fits a new harmonic-motion (or
    other harmony) setting, not only after a key or collection change.
  - `Sixteenth` stays unavailable to mutations for the rest of a session once it has stepped down.

  The owner also accepted chunk 24's latency figure as it stands: the 250 ms cold target is a
  goal, not a gate; `rule_look_ahead_deadline` is the gate, and it holds because a mutation always
  has 3 measures before its deadline. The re-measurement on real hardware is a v2.4 check (D180).
  Master spec §5; build plan chunk 24.

- **D182 (2026-10-03): settings changed by the settings-mutation flag return to the player's
  choice when the session ends.** The product owner's decision, from ux Q64. When a session ends,
  however it ends, every setting the flag changed during it returns to the value the player had
  chosen before the session started, just as adaptive tempo resets the tempo control to the
  starting tempo (master spec §10). Settled with it, as consequences of the rule: the "profile
  customized" marking that a mutation set (D181) returns to what it was before the session; a
  register mutated from Varying returns to Varying; the restore does not touch the flag's own
  on/off choice; and the fresh phrase the app generates at a session end is generated from the
  restored settings. The session engine (build plan chunk 24) only reports each change; the
  restore belongs to the session controller (chunk 25). Master spec §5 and §11; build plan
  chunk 25.

- **D183 (2026-10-05): v2.1, v2.2 and v2.4 are compacted into one release, v2.0.** The product
  owner's decision, through the coordinator. v2 ships as one official release, v2.0, with one
  release gate instead of four. Its definition of done is everything master spec §11 lists: the
  v2.0 items, the v2.1 and v2.2 criteria and the real-hardware checks. The labels v2.1, v2.2 and
  v2.4 stay as names for parts of that scope, as the build plan's chunks and the atoms' tags use
  them; none is a release of its own. Build plan chunk 21 becomes the single v2.0 gate and absorbs
  the done-when criteria of chunks 26 (v2.1), 31 (v2.2) and 35 (v2.4, the real-hardware checks),
  which stay in the plan as headings saying they were folded into it. With one release, no chunk
  waits for an earlier release to ship: each waits for the chunks it depends on and, for an
  interface chunk, its design.

  **Supersedes D173 and D180 on one point:** v2.0 no longer ships before the real-hardware checks.
  They are part of the v2.0 gate, and the owner runs them when they have time. What D173 and D180
  put among those checks is unchanged: the controller check on the reference hardware, the
  acknowledgement windows and latency constants tuned on it, real exports opened in MuseScore and
  a MIDI tool, the playhead and main-thread measurements in real Chromium, the played-notes and
  generated-notes MIDI files of one session lined up in a real DAW, and the cold run re-measured
  on the reference machine. So are the definition-of-done item numbers. v2.3 stays empty (D174):
  the chord-fit check is a v3 nice-to-have. The atoms' release tags (`release-v2.1`,
  `release-v2.2`, `v2.4-check` and the like) are `documentalist`'s to handle: it decides whether
  to merge them into `release-v2.0` or keep them as history. Opened **O105** (whether the
  real-program export checks block the v2.0 tag). Master spec status line, §2, §11 and §12; build
  plan §1 and chunks 21, 26, 31 and 35; v2 README; roadmap; versions index.

- **D184 (2026-10-05): the silence timer around the starting note and a reattachment, accepted as
  chunk 17 built it.** The product owner's rulings on what build plan chunk 17 left for
  acceptance. The starting note arms the silence timer: it is the session's first played note.
  After the controller reattaches mid-session, the silence timer counts again from the
  reconnection, once a played note has armed it; before a session's first played note, silence
  never ends it. Both match `rule_silence_timeout_ends_session`,
  `rule_controller_reconnection_window` and `module_session_silence_timeout` as they stand, so no
  rule changes. The owner also accepts chunk 17's other choices: the session history stores
  latency-compensated times; the USB correction applies to every controller; a session has two
  MIDI end causes, `silence-timeout` and `controller-lost`; reattachment is held only when the
  selection is away at a controller-less start; and expected notes that fell due during a loss are
  passed over, even when their window is still open at the reattachment. Build plan chunks 17 and 21.
- **D185 (2026-10-05): the backing is accepted as built; O57 is closed.** The product owner's
  answer to **O57**, after listening to the backing in sessions. The chords' voicing, register,
  attack pattern and timbre stay as build plan chunk 11 built them: the bass plays the chord's root
  in MIDI 36–47 (C2–B2), with the fifth on beats 3 and 4 of a measure under one chord, kept in the
  same band; the chords are the highest close-position triad whose top note is at or below E4,
  attacked on each chord change and each downbeat, never on beat 3; the voices are simple
  oscillators synthesized in the app. The bass line had already been judged adequate on
  2026-10-01. Not part of this answer: the audio mix's levels (ux Q31), still open. Kept as an
  undecided idea for later, not scope: Tone.js, mainly to add more accompaniment voices. Master
  spec §6 and §12; build plan chunk 21; roadmap.
- **D186 (2026-10-05): the atom wording left open by the v2 chunks is accepted.** The product
  owner agrees, as a whole, with the wording proposals that build plan chunks 8, 13, 20, 27 and 29
  left open in their atoms. `documentalist` applies them and may advance those atoms' status with
  this agreement. On the spec side, chunk 29's Atoms line gains
  `rule_multi_phrase_tension_arc_cycle`, the rule its cycle implements. Not covered, since it adds
  a rule rather than rewording one: chunk 13's question whether a Disconnect rule is added, which
  `documentalist` raises with a proposal if it is still wanted. Build plan chunks 21 and 29.
- **D187 (2026-10-05): O87 closed: a screen wake lock the browser drops mid-session is asked for
  again.** The product owner's answer to **O87**, with its proposal. While the session runs and
  the page is visible, the app asks again, silently, for a wake lock the browser has dropped;
  nothing is shown either way, whether the new lock is granted or refused. A hidden tab already
  ends a session (master spec §6), so the case is a lock dropped while the page stays visible, for
  example by power saving. The code does not do this yet: `createHeldLock` in
  `src/components/workspace/browser-screen-locks.ts` never asks again for a lock the browser has
  dropped. It is a small v2.0 code unit, scheduled after the ISS-006 fix, and
  `rule_screen_wake_lock_during_session` is updated with it. Master spec §6, §11 item 21 and §12;
  build plan chunks 15 and 21.
- **D188 (2026-10-05): ux Q31 closed: the audio mix as built is final for v2.0.** The product
  owner's acceptance, by ear, after hearing the backing in sessions: the click and backing volume
  ranges and default levels, and the linear mapping from a volume setting to its gain, stay as
  built. Build plan chunk 21's item on the audio mix's levels is thereby met. `documentalist` has
  advanced `req_session_audio_mix` and `rule_click_volume_never_silent` to STABLE with this
  acceptance. Build plan chunks 10, 11, 15 and 21.
- **D189 (2026-10-05): the CONTRACT 1.3, chunk 29's carry-in rules and a Disconnect rule are
  approved.** The product owner approved the CONTRACT's version 1.2 and its 1.3 (now STABLE);
  the three carry-in rules chunk 29 reworded, `rule_join_carry_in_limited`,
  `rule_harmony_change_drops_unfit_harmonic_carry_in` and
  `rule_setting_change_rechecks_pitch_carry_in` (STABLE); and a new rule,
  `rule_disconnect_forgets_controller`, which closes build plan chunk 13's question whether a
  Disconnect rule is added (left open by D186). Build plan chunks 13 and 29.

- **D190 (2026-10-06): a one-step profile switch from the transposition check, a v3 candidate.**
  The product owner's idea, after running the check on the reference breath controller. When the
  check finds that the controller, as it is set, matches another instrument profile, the check
  already names that profile in its copy ("choose the E-flat alto saxophone instrument profile
  instead"); the idea is to offer that switch as an action in the check itself, so the player
  changes profile without leaving the connection sheet. Not committed, version open; recorded with
  the v3 candidates ([v3](../../versions/v3/README.md#controller-connection-candidates-not-committed)).
- **D191 (2026-10-06): O71 closed: USB is the tested path for v2.0; Bluetooth MIDI is
  best-effort.** The product owner's answer to **O71**, with its proposal, after trying the
  reference breath controller (Travel Sax 2) over Bluetooth LE in Debian's Chrome on their Linux
  machine (hardware checklist part C, 2026-10-06). It pairs, appears under Connect controller, and
  the right notes light. Measured on the click: Bluetooth adds roughly 70–80 ms over USB (median
  +80 ms on single-pitch notes, against +2 and +9 ms over USB), and it delivers notes in batches,
  so its timing is coarse. Web MIDI does not say how a controller is connected, so the app applies
  the USB correction to every controller (as accepted in D184); the Bluetooth LE constant in the
  code is never used. The owner's feel: workable; the looser feedback was not a problem. So v2.0
  tests and tunes USB only, and a Bluetooth controller works as it is, with no Bluetooth-specific
  correction or tuning. Still to try, not blocking anything: the controller on the owner's Android
  phone in Chrome, which needs a deploy of the current main to the server. Master spec §8 and §12;
  build plan chunks 12, 17 and 21.
- **D192 (2026-10-06): a voluntary "Bluetooth" checkbox in the connection sheet, a candidate.**
  The product owner's idea, after the Bluetooth trial (D191): "We may add a volontary checkbox
  (bluetooth) in the device dialog that will extend grace period a slight bit." The player ticks
  it when the controller is connected over Bluetooth, and the app then gives played notes a little
  more timing tolerance. Not committed, version open; recorded with the controller-connection
  candidates ([v3](../../versions/v3/README.md#controller-connection-candidates-not-committed)). It
  needs a design pass first: it touches the expected-note timing window, the latency compensation
  of the played onset, and v2's stance that there is no player-facing calibration step.
- **D193 (2026-10-06): O105 closed: the real-program export checks do not block the v2.0 tag.**
  The product owner's answer to **O105**, with its proposal. The checks of exports in real
  programs, the MusicXML files opened in MuseScore for the three instrument templates, the MIDI
  files opened in a MIDI tool, and the played-notes and generated-notes MIDI files of one session
  lined up in a real DAW, may follow the tag: the owner has no MuseScore account or DAW at hand,
  so they are validated at a later date and written down as a v2.0.x hand-check note. The other
  real-hardware checks still block the tag, as D183 placed them: the controller-transposition
  check on the reference hardware, the tuning of the acknowledgement windows and latency
  constants, the playhead and main-thread measurements in real Chromium, and the cold run
  re-measured on the reference machine. Master spec §11 and §12; build plan chunks 20 and 21.
- **D194 (2026-10-06): the machine measurements of the v2.0 gate are met; O68 is closed.** Run
  on 2026-10-06 on the owner's Linux reference machine, Chromium 153, while the machine was partly
  busy (one-minute load 1.4–1.8 on 12 threads), which can only make the figures worse (hardware
  checklist part E). **O68 is answered:** engraving a phrase on the main thread never comes near
  the scheduler's 200 ms look-ahead window. The longest main-thread block while engraving was
  49.3 ms (2560 × 1440) and 52.8 ms (1920 × 1080, the first generation), against 90 ms in
  September; at 240 BPM on the densest setting, over 60 s, no task or animation frame lasted
  50 ms or more, and the longest timer wait was 36.1 ms and 33.5 ms. So master spec §11's item 15
  is met. **Item 6 is met when it is judged at the moment the playhead band's measure changes:**
  at 120 BPM, over 150 barlines in five minutes, it changes at most 14.5 ms after the heard
  barline (median 6.7 ms, 95th percentile 12.1 ms) and at most 11.2 ms before it, none over
  20 ms. Counted to the next animation frame, when the painted band can first reach the screen
  and so one frame later by construction, it is not met, as in the 2026-10-01 runs: at most
  30.4 ms, 94 of 150 barlines over 20 ms. Which of the two item 6 means was left for the owner by
  build plan chunk 16 without a register entry; it is now **O106**, opened while recording this.
  Master spec §11 and §12; build plan chunks 16 and 21.
- **D195 (2026-10-06): O69 is closed as measured: the cold worst case is narrowly over its
  250 ms goal, which is not a gate.** Same run as D194. The cold worst case (Sixteenth, Heavily
  varied, Sparse, Active displacement, Build) takes 277 ms in the page (321 ms from the click),
  against 829–951 ms in September; Straight with Edge takes 255 ms cold, the default settings
  42 ms cold, and warm generations 38–77 ms. The first generation after a one-control change into
  the worst case takes 206–229 ms in the page (317–326 ms from the click). So the answer to O69's
  question is no, by 27 ms. That does not block anything: the owner made the 250 ms target a goal
  to aim for, not a gate, on 2026-09-30, and accepted it again in D181; the gate is the
  look-ahead deadline, which these figures meet with wide headroom at 240 BPM (one measure is
  1 s, and a mutation has 3 measures before its deadline). So the v2.1 cold-run check of master
  spec §11 is met. Recorded by `spec-writer` from the measurements; it needs no new ruling from
  the owner, since it applies D181. Master spec §11 and §12; build plan chunk 21.
- **D196 (2026-10-06): stray notes from a controller are a generic matter, handled later if at
  all.** The product owner's ruling, after the hardware sitting. A controller can send short
  "stray" notes while the fingers change position: in-between notes a real instrument would
  swallow. The reference breath controller (Travel Sax 2) sends them often, at in-between pitches,
  often in pairs at velocity 127 (hardware checklist, part B3). The owner's words: "don't work
  specifically for the travel sax. The only true problem with these stray notes are: played notes
  gets bloated with nothing; futur chord recognition may fail due to this. we might work on
  something if a note doesn't last 'long enough' to be considered. but that's a future stuff
  (maybe annotate the problem with chord identification feature, as it will probably be
  impacted). we might add a prunning option to played note export to removed such notes, but
  that's either v3 or later feature." So:
  - The problem is treated as generic to controllers: nothing is built for one device.
  - v2 changes nothing. Stray notes are recorded as played notes like any other, so they show in
    the review's played notes and go into the played-notes MIDI export.
  - Acknowledgement needs no change, and must not be "fixed" for them: an expected note lights
    only when a played note has exactly its pitch inside its window, and a note that does not
    match changes nothing on screen (master spec §8). Being in-between pitches, stray notes
    normally light nothing.
  - The end-of-measure chord-fit check, a v3 nice-to-have, is annotated: a stray note outside
    the phrase's scale would make a measure fail its "every other note" condition, so a minimum
    duration for a played note to count is a likely prerequisite. Not committed.
  - A new candidate, not committed, version open (v3 or later): an option on the played-notes
    export that prunes notes shorter than a threshold
    ([v3](../../versions/v3/README.md#stray-notes-from-controllers-candidates-not-committed)).
  Master spec §9; v3 direction.
- **D197 (2026-10-06): O106 closed: the playhead's 20 ms is measured to the moment its measure
  changes; item 6 is met.** The product owner's answer to **O106**, with its proposal ("let's go
  with a"). Master spec §11's item 6 is judged at the moment the playhead band's measure changes,
  against the heard barline, as build plan chunk 16's criterion reads, not at the next painted
  frame, which comes one frame later by construction. On the reference machine on 2026-10-06
  (D194), at 120 BPM over 150 barlines, the band's measure changed at most 14.5 ms after the
  heard barline and at most 11.2 ms before it, none over 20 ms, so item 6 is met. Master spec §11
  and §12; build plan chunks 16 and 21.
- **D198 (2026-10-06): the VISION is accepted for v2.0 as it stands; a full rewrite comes
  later.** The product owner's sign-off: "i'll accept the vision for now, but i'll need to sit
  down at some point and rewrite it entirely, haha." The product vision
  (`vision_infinite_flow_first_release`, version 0.6 today) is accepted for v2.0 as it stands, so
  its sign-off no longer holds up build plan chunk 21. `documentalist` applies the status change,
  and D193's correction to the vision's line on the real-hardware checks (the real-program export
  checks follow the v2.0 tag). The owner plans to rewrite the vision entirely later; the rewrite is
  not scheduled and blocks nothing, and is listed with the roadmap's carry-overs. Build plan
  chunks 0 and 21; roadmap.
- **D199 (2026-10-06): the USB keyboard checks do not block the v2.0 tag.** The product owner's
  ruling: "keyboard isn't blocking for the version tag." The owner has no USB keyboard at hand
  yet. The checks that need one, the transposition check with the C MIDI keyboard profile
  (hardware checklist part A's keyboard row) and the output delay, the playing on the click and
  the playing of phrases for the keyboard (B1–B3), follow the tag as v2.0.x hand checks, as D193's
  real-program export checks do. The breath controller's results of 2026-10-06, over USB, stand
  as the evidence for the v2.0 tag: for the tuning of the acknowledgement windows and latency
  constants (item 9), which kept the latency constants and left the 150 ms and 200 ms windows unchanged,
  and for the controller check on the reference hardware, where the device's own transpose
  setting reached a match for every profile tried, so no manual input-transposition setting is
  called for. Master spec §11 and §12; build plan chunks 17 and 21.
- **D200 (2026-10-07): ISS-009 is fixed before the v2.0 tag; the failure ladder stops repeating
  a search that cannot succeed.** The product owner's ruling on the v2.0 gate's finding (build plan
  chunk 21) that master spec §11 item 1 is not met. ISS-009
  (`issues/Ref_20261006_failed_carry_in_attempts_slow.md`): a failed carry-in attempt takes 6 to
  28 s, while its window is searched to exhaustion or its search allowance (250,000 fuel units)
  runs out, against at most 280 ms and 71,551 units for every success measured; the failure ladder
  repeats the same failing carry-in search three times; and the single generation worker keeps
  computing an attempt the engine dropped at its deadline, so later requests queue behind it. A
  sweep timing every attempt at its real cost shows 7 of 568 cases repeating phrases at their
  deadline, all at Eighth or Sixteenth density (release notes, `docs/release/v2.0-release-notes.md`).
  Decided:
  - v2.0 is not tagged with this as a known limitation: the fix comes first.
  - Three fix directions are approved. They change the failure ladder (master spec §4) and its
    STABLE atom `rule_session_generation_failure_ladder`, which `documentalist` revises before the
    code changes:
    - (a) once a carry-in attempt's search covered every candidate without finding a phrase, the
      remaining carry-in retries are skipped and the ladder goes to the standalone attempt. The
      same carry-in would fail the same way: the generator's candidates do not depend on the seed,
      which only breaks ties in their order (generative process §9, checked in
      `generation-orchestrator.ts`). An attempt cut off by its allowance
      (`search_limit_exceeded`), which proves nothing, and a phrase that does not fit the staff
      are still retried.
    - (b) attempts with carry-in get a smaller search allowance, with a margin above every success
      observed, chosen and documented by the coding team with its evidence. Every attempt without
      carry-in, at Idle and in a session (its first phrase, the standalone attempt, a phrase whose
      carry-in a settings change left unusable), keeps v1's allowance and byte-identical output
      (§11 item 3). A carry-in attempt that would have needed more than the new allowance now
      fails and climbs the ladder; none was observed, and carry-in output has no v1 identity to
      keep.
    - (c) an attempt dropped at its deadline is cancelled on the worker, so later requests do not
      queue behind it. The coding team may drop (c) if (a) and (b) make the full real-cost sweep
      pass with margin, and must say why.
  - Settled by `spec-writer` as a minor design matter under the owner's standing delegation: when
    (a) skips the carry-in retries, the standalone attempt is generated with the same request and
    seed it would have had after three failed retries, so skipping changes which attempts run,
    never what the standalone attempt generates.
  - Item 1 is met only when the full real-cost sweep (568 cases, at 60, 120 and 240 BPM) shows
    **0 of 568** cases repeating a phrase at its deadline. So the question of which reading of
    item 1 governs is moot: `rule_look_ahead_deadline` gets no known-gap note, and §11 item 1
    stands as written. Chunk 21 stays open, and the milestone is not archived, until item 1
    passes.
  Master spec §4 and §11; build plan chunk 21.
- **D201 (2026-10-07): the gate's atom promotions are approved, with CONTRACT 1.5.** The product
  owner approves promoting to STABLE, with the CONTRACT at version 1.5:
  `rule_controller_loss_mid_session`, `rule_start_while_controller_away`,
  `rule_same_controller_reattaches`, `rule_count_in_shown_on_screen`,
  `rule_midi_never_blocks_session`, `rule_midi_starting_note`, `req_last_session_review`,
  `specification_browser_only_operation_verification`, `rule_mutation_reverts_at_session_end`,
  `rule_adaptive_tempo_flat_schedule` and `rule_multi_phrase_tension_arc_cycle`; and
  `req_browser_only_first_release` from DRAFT to REVIEW. The owner also gives the go-ahead to
  revise the v1-only wording of `specification_behavioral_quality_gates`. `documentalist` applies
  all of it in `docs/`; nothing in `specs/` changes beyond this record. Build plan chunk 21.
- **D202 (2026-10-07): §11 items 4 and 12 are aligned with what v2.0 ships.** The product owner's
  ruling. Both items were written for the v2.0 of before the compaction (D183) and went stale
  when v2.1 and v2.2 were folded into v2.0; the release notes' "Reading notes" explained them
  instead. They now say what was built and decided:
  - Item 4: the player can change no generation setting during a session, and Stop and the audio
    mix stay reachable. With the settings-mutation flag ("Vary settings") and the multi-phrase
    tension arc ("Tension across phrases") off, as at page load, nothing changes what is generated
    during a session except item 27's note-density rule; with either on, its changes are the only
    others, held to their own criteria. Adaptive tempo changes the tempo, never what is
    generated.
  - Item 12: the generated-notes export action has the played-notes action beside it, and no
    generated-notes file, MusicXML or MIDI, ever holds a played note. "In v2.0 only the
    generated-notes export action exists" is gone.
  No criterion is added or removed. The release notes' reading notes on items 4 and 12 are no
  longer needed; whoever owns the notes updates them. Archived files
  keep their wording. Master spec §11.
- **D203 (2026-10-07): the failure ladder becomes time-aware, so generation time is bounded
  whatever the generator does.** The product owner's ruling on what is left of ISS-009
  (`issues/Ref_20261006_failed_carry_in_attempts_slow.md`) after D200's first fixes. Shipped so
  far: a byte-identical speed-up of the pitch search, which makes failed carry-in searches 4 to 6
  times faster; direction (a); and direction (b) at 160,000 fuel units per carry-in window (every
  intent without carry-in keeps v1's 250,000 and byte-identical output). The real-cost sweep
  (`npm run test:sweep`) still fails 4 of 568 cases, #344, #349, #354 and #498. Their carry-in
  attempts stop on the search allowance (`search_limit_exceeded`), so under D200 they keep their
  three retries, and each takes about 2 to 2.5 s: that overruns the 3 s deadline at 240 BPM and the
  6 s deadline at 120 BPM. Direction (c) alone cannot fix it, since the attempts that run too long
  are the ones the ladder itself asks for. Decided:
  - When the time left before a phrase's look-ahead deadline falls below what a standalone attempt
    needs, the session cancels the carry-in attempt running on the worker (direction (c)) and
    requests the standalone attempt at once. The standalone attempt is the one the phrase would
    have had after three failed carry-in retries: the same request and seed, as with (a) under
    D200. The rule bounds generation time whatever the generator does.
  - What a standalone attempt needs, its time budget, and the cost of restarting the worker to
    cancel an attempt (about 0.3 s, still to be measured in Chromium) are implementation
    constants, measured and documented by the coding team with their evidence.
  - Chosen over three alternatives: also skipping the carry-in retries after a stop on the search
    allowance; a carry-in allowance of about 40,000 units, which loses successful carry-in
    attempts; and a faster candidate sort alone, which would not bound the time.
  - The fuel evidence in master spec §4 is updated: in the full sweep of 2026-10-07, the largest
    successful carry-in attempt used 131,137 units (3,366 successful carry-in attempts; 99.9th
    percentile 73,646), and carry-in attempts search under 160,000 units. Without carry-in the
    allowance stays 250,000.
  - Settled by `spec-writer` as consequences of the ruling, under the owner's standing delegation:
    - D200's clause letting the build leave out (c) no longer applies. (a) and (b) did not pass
      the sweep, and the time-aware ladder needs the cancellation, so an attempt still in flight
      at the deadline is cancelled too.
    - The rule applies from the moment the request is made. When the deadline is too close for
      any carry-in attempt to leave the standalone attempt its time, as phrase 2's one-measure
      deadline may be at fast tempos, the standalone attempt is requested first.
    - Which attempt produces a phrase can depend on the machine's speed, as whether a phrase is
      repeated already could. What each attempt generates for its request and seed never does.
    - The real-cost sweep charges a cancelled attempt the time it ran plus the worker's restart
      cost, so item 1 is measured on what the ladder really costs.
    - Idle has no deadline and no carry-in, so nothing changes there.
  - The ladder's STABLE atom `rule_session_generation_failure_ladder` is revised by
    `documentalist` before the code changes, as under D200.
  Master spec §4; build plan chunk 21.
- **D204 (2026-10-07): the generator orders its candidates the same way whatever the browser's
  locale, before the v2.0 tag.** The product owner's ruling. Today the pitch candidates' canonical
  order compares strings with `localeCompare` / the default `Intl.Collator`
  (`src/domain/pitch/pitch-candidates.ts`), so it depends in principle on the browser's locale: a
  phrase could then differ from its replay under an unusual language setting. Decided:
  - The order becomes plain code-unit order, with no locale-aware comparison. It is also about
    twice as fast on searches that cannot succeed.
  - v1's byte-identical output (master spec §11 item 3) must be proven against the golden outputs
    and the identity harness (629 intents, 101,484 compiled contexts). If any output differs, the
    coding team stops and reports instead of re-recording v1's goldens.
  - It is done before the v2.0 tag and tracked as a new issue, ISS-010.
  Master spec §11 item 3; build plan chunk 21.
- **D205 (2026-10-07): the phrase-2 join at 240 BPM is locked as shipped for v2.** The product
  owner's ruling ("Lock it as is for now") on the measured consequence of D203, which shipped in
  `5a587bb`. The build measured the time-aware ladder's two constants in Chromium
  (`docs/generation-latency.md`, "Failure-ladder reserve constants (2026-10-07)"): the worker's
  restart cost, median 49 ms and maximum 80 ms, gives `WORKER_RESPAWN_SECONDS` = 0.125 s; the
  standalone attempt's maximum of 618.6 ms, with a ×1.5 margin, gives
  `STANDALONE_BUDGET_SECONDS` = 0.95 s. Their sum, the standalone reserve of 1.075 s, is longer
  than one measure at 240 BPM (1 s), which is the whole of phrase 2's deadline. So at 240 BPM
  phrase 2 is always requested standalone first and never carries in from phrase 1 (568 of 568
  sweep cases): that join is never smoothed (master spec §3). Every later phrase, with a
  three-measure deadline, starts with its carry-in attempts. At 60 and 120 BPM the time rule drops
  carry-in only 1 to 2 times in 2,840 joins (once at 60 BPM, twice at 120 BPM). The real-cost
  sweep shows 0 of 568 cases repeating a phrase at 60, 120 and 240 BPM (load 1.08 → 3.00), so §11
  item 1 is met. Decided:
  - v2 keeps this as shipped: no constant is retuned to win back phrase 2's carry-in at 240 BPM.
  - Turned down: a look-ahead-only standalone budget, a reserve of 0.675 s, which would leave
    phrase 2 a carry-in window of 0.33 s at 240 BPM, at the cost of a tail risk: a standalone
    attempt near its fuel cap could outrun that budget.
  - Winning carry-in back at fast tempos is left to the owner's v3 candidate (D206).
  - Settled by `spec-writer` as consequences, under the owner's standing delegation: master spec
    §4 states the measured consequence and that it is kept for v2; build plan chunk 21 marks item
    1 met and the ISS-009 and time-aware-ladder items shipped. Closing ISS-009 in `issues/` is the
    coding team's.
  Master spec §4; build plan chunk 21.
- **D206 (2026-10-07): pre-generating phrases at Idle is a candidate for v3.** The product
  owner's proposal for the next version, in their words: "while start session isn't pushed have
  background generate a few phrases in advance (no more than 4) that give us some time ahead."
  Recorded as a v3 candidate, not committed scope and not designed:
  - While the app is Idle, before Start, the app generates in the background up to 4 look-ahead
    phrases following the phrase on screen, so a session starts with time in hand.
  - Why: phrase 2 would be generated before Start, with no deadline, so it could carry in from
    phrase 1 again at fast tempos, which D205 gives up for v2.
  - It changes a settled v2 fact: Idle has no deadline and generates no phrase with carry-in
    (D203). Pre-generated phrases would be phrases with carry-in, generated at Idle.
  - It is not v2's prewarm (`module_generation_prewarm`), which only warms the generator's rhythm
    memo for the current settings and produces no phrase.
  - Opened O107–O111, with proposals, in the [register](../../open-questions.md#v3-pre-generation-at-idle-o107)
    and recorded in [v3](../../versions/v3/README.md#pre-generating-phrases-at-idle-candidate-not-committed).
- **D207 (2026-10-07): `rule_dropped_attempt_cancelled` becomes its own STABLE rule and joins the
  CONTRACT.** The product owner's approval. `rule_dropped_attempt_cancelled` is promoted to STABLE
  as a rule of its own, beside `rule_session_generation_failure_ladder`, together with
  `module_generation_worker_cancellation`, and the rule joins the CONTRACT's surface
  (`contract_infinite_flow_first_release`, version 1.7 at this date). Only the approval is
  recorded here: `documentalist` applies it in `docs/`, under its own rules for promotion and for
  what the CONTRACT lists (it lists no ARCHITECTURE-layer module today). Nothing in `specs/`
  changes beyond this record. Build plan chunk 21.
