# Decisions

Status: draft v2.5

Append-only record of settled decisions. Earlier logs are archived verbatim:

- D1–D46 (first release): [archive/v1/decisions-D1-D46.md](archive/v1/decisions-D1-D46.md)
- D47–D71 (2026-09-25 persona and vision session):
  [archive/2026-09-25-personas-and-vision/decisions-D47-D71.md](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md)
- D72–D108 (v2 spec consolidated: v2.0–v2.3, from the v1.0 gate close through the rolling-phrase
  spec): [archive/v2/decisions-D72-D108.md](archive/v2/decisions-D72-D108.md)

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md) and
[archive/v2/README.md](archive/v2/README.md)). Numbering continues from **D109**.

## Decision Log

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
  ([midi-and-acknowledgement.md §3](archive/v2/midi-and-acknowledgement.md), connection-state
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
  operation, which stay `ux-writer`'s to weigh. [personas.md](personas.md) has no section for who
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
