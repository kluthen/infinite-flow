# Open Questions

Only questions that are truly open appear here. Closed questions from the first release are
archived verbatim: [Q15](archive/v1/open-questions-Q15.md), closed by D37 (see `decisions.md`). IDs are
stable; numbering continues from Q17.

- **Q16 — the guaranteed exit Q15/D37 relies on (switching instrument profile) is not signposted from either notation-error state, and is a heavy action for a player who does not want to change instruments.** Both **Notation error** and **Notation error over a retained generation failure** in `screens/phrase-workspace/handoff.md` name only `Retry notation` as their action; nothing in either state's copy tells the player that switching instrument profile (available the whole time, since controls stay editable) will also clear the error, one way or another. A tenor player stuck on a repeatedly-failing `Retry notation` has no visible hint that switching to another profile and back is an available escape, and doing so costs two full regenerations to get back to their own instrument. Not decided here — options range from leaving it undocumented (current state, technically correct but undiscoverable) to adding a hint in the notation-error copy pointing at instrument profile as a fallback, to a dedicated "start over" action. Lower priority than Q15 was, since a way out now exists either way; this is about whether players can find it.

  **User input (2026-09-26).** Instrument-switch-as-escape "makes little to no sense from the
  user's point of view when he doesn't change instrument" — it is not an acceptable player-facing
  answer to a recurring notation error, even though it technically clears the state. The direction
  the user wants explored instead is a **generation action reachable from the notation-error
  states themselves** (rather than routing the player through an unrelated control). Q16 stays
  open: this narrows the design space but does not decide it. Deferred past v1.0; `ux-writer`
  designs the actual action and copy. Also logged as a deferred v2 item in
  [`specs/versions/v2/README.md`](../specs/versions/v2/README.md) (Direction, not yet scoped).
  Confirmed standalone (2026-09-27): the earlier note tying this to Q20 was a mistake — Q20 is now
  resolved, and an in-session notation failure structurally cannot occur at all (see the closed Q20
  entry below), so there is no in-session recovery path to reconcile this against. Q16 is entirely
  about the pre-session, Idle-only static workspace.

## v2 (Rolling Phrase) — opened 2026-09-27, reviewing `specs/versions/v2/master-spec.md`

Numbering continues from Q17. Q17 is a self-directed design question — `ux-writer` resolves it in
a future session, no `spec-writer` input needed. Q18–Q21 were routed to `spec-writer`; Q22 was
`ux-writer`'s own presentation call. All five were answered 2026-09-27 (see spec D109–D110 in
[`specs/decisions.md`](../specs/decisions.md), ux D46 in this tree's `decisions.md`, and the
master-spec passages cited below). Q17, Q25 and Q27 are open in this section; Q26 and Q28–Q30 are closed, at the end of this file.

- **Q17 — how the rolling display actually presents the phrase sequence on screen.** The master
  spec requires at least one measure of the next phrase visible as read-ahead at all times
  (`master-spec.md` §4), and requires that an automatic control change apply "with no highlight,
  scroll, or screen shift" (§5), but never states the spatial presentation itself: does the
  existing single four-measure staff system get replaced in place at each phrase turnover (closest
  to the v1 `phrase-workspace` pattern, per ux D45 in `decisions.md`), or does the session show a wider
  multi-phrase strip that a new phrase enters and an old one leaves? And however that's answered,
  is the read-ahead phrase visually distinguished at all from the currently-sounding one (e.g. by
  position alone vs. some quiet visual state), or does it read identically until its own turn
  comes? This blocks starting the Session core-loop flow and screen work. `ux-writer` will
  propose a default and settle it, not `spec-writer` — logged here only so it isn't lost.

- **Q25 — what a session started from the Review uses as phrase 1, and what the Review screen
  shows besides the review itself.** Spec O84 (logged by `spec-writer` 2026-09-27) notes that
  `master-spec.md` §4 defines phrase 1 as "the phrase already on screen before Start" and §6's
  starting-note rule speaks of Idle, while §7 also lets a new session start from the Review. Spec
  O84's proposed default: only a Start click starts a session from the Review (a MIDI start would
  collide with the unexported-favorites confirmation, which needs a click). Which phrase becomes
  phrase 1 there depends on what the Review screen shows, which is `ux-writer`'s to design. Ties in
  with `ux-critic`'s earlier note that ux D45's grounds support Idle and session sharing one
  screen but not the Review. Settle before unit 6 (Review); does not block unit 1 or unit 2.

- **Q27 — when does the session's reserved disconnect slot appear?** The disconnect banner sits in
  `session-alert-slot`, kept free for the whole session so the banner never moves the staff. If
  the slot only appears when a session starts, the staff moves down by the slot's height at the
  Start click or starting note, just before the count-in. Proposed in the tier docs: the slot is
  in place from the session's start, before the count-in's first beat. Alternatives: reserve it at
  Idle too whenever a controller is connected (no shift at start, but empty space above the staff
  at Idle), or fold it into whatever space the session layout already changes at start. Settle
  with unit 2 (session core loop, Q17), which owns the session layout. See
  `screens/phrase-workspace/handoff.md`, "Session disconnect slot".

### Closed — Q18–Q22 (answered 2026-09-27)

- **Q18 — is a failure-ladder repeat ever shown to the player, in the review or otherwise?**
  Answered: no. **Spec D109** — the review never visibly marks a repeated phrase; it stays internal
  bookkeeping (session history and export data already carry it per §7). No repeat-marker element
  is needed anywhere in the review screen. Closes the "can be stubbed" item on todo.md unit 6.

- **Q19 — does the settings-mutation flag (§5, v2.1) get any player-facing affordance beyond "it
  just changes"?** Answered: this was already settled in `master-spec.md` §5 itself and the
  question was raised in error — the settings UI "updates to stay truthful about what's currently
  in effect, but with no highlight, scroll, or screen shift." No affordance beyond the plain on/off
  toggle plus the settings panel reflecting the new value, unannounced. Nothing further to design
  beyond the toggle itself (todo.md unit 10) and the panel already reading correctly.

- **Q20 — how does an engraving (notation) failure behave inside a running session?** Answered: it
  cannot occur — no in-session notation-failure recovery path needs designing at all. Grounds:
  `master-spec.md` §5 (nothing manual can change settings mid-session — the settings lock) plus
  DoD item 11, §11 ("a rhythm-setting combination v1 already disallows can neither start nor be
  applied during a session") together mean any settings combination that would trigger v1's
  notation-error mode is either blocked at session start or never reached by an automatic
  mutation. §4's failure ladder is solely about generation failure (the algorithm not finding a
  valid phrase), a different, already-fully-specified thing. This does **not** intersect with Q16
  — Q16 (the static-workspace escape hatch) stays a separate, still-open, lower-priority item about
  the Idle screen only; the earlier note tying the two together was a mistake, now corrected.

- **Q21 — does the multi-phrase tension arc (§3, confirmed v2.2 scope) have any visible surface at
  all?** Answered: yes. **Spec D110** — it gets its own visible on/off toggle, on the same footing as
  the settings-mutation flag and adaptive tempo, not an invisible generation behavior like the
  existing single-phrase arc. The master spec only settles that a control must exist; the
  control's placement, copy, and any further presentation detail are `ux-writer`'s to design (see
  todo.md unit 11 — now an unblocked design task, not an open question).

- **Q22 — does the idle screen reference the tempo reached in the last session (adaptive tempo,
  §10, v2.2)?** This was `ux-writer`'s own call (pure presentation, no business-rule content).
  Resolved: yes, with a quiet, non-comparative reference — see `decisions.md` D46 (ux).

### Closed — Q23–Q24 (answered 2026-09-27)

Both answered by the user and recorded on the spec side as spec D111–D124 (`master-spec.md` §6, §7,
§8, §11); the presentation parts are ux D51 (disconnection banner) and ux D52 (count-in and
starting-note line). Entries kept verbatim below.

- **Q23 — what happens when a connected controller is unplugged mid-session, and when a
  controller may be connected at all.** Raised by `ux-critic`'s pass on the controller-connection
  unit. `master-spec.md` §8 currently says a mid-session unplug quietly turns the session into a
  no-controller session (only Stop ends it, the inactivity timer is disarmed), and the spec does
  not say whether a controller can be connected during a session. **User input (2026-09-27),
  which differs from §8:** (1) silence and disconnection are different things — silence keeps the
  §7 30-second auto-stop; (2) a disconnection must be clearly visible, even though that briefly
  pulls attention from playing; (3) a session started with no controller stays that way — a
  controller can only be connected between sessions; (4) the one exception is a controller lost
  mid-session, which the app expects back within 30 seconds, and the user is open to treating
  that like silence. Still to settle: what happens when those 30 seconds pass without a
  reconnection (the session ends, or it carries on without a controller), and whether notes
  played after a reconnection are recorded and acknowledged. This changes §8's business rules, so
  it belongs to `spec-writer`; `ux-writer` then designs the visible disconnection state. Blocks
  fixing the flow's and phrase-workspace's "controller lost mid-session" state.
  **User answer (2026-09-27):** a controller not reconnected within 30 seconds ends the session.
  Left for `spec-writer`: whether that 30 seconds counts from the unplug or is the ordinary silence
  timer left running, and whether notes played after a reconnection are recorded and
  acknowledged as usual.
  **Spec update (2026-09-27):** the business rules are now in `master-spec.md` §7/§8 (spec
  D111–D114, D118). Still open on the spec side: spec O78 (where the 30 seconds count from), O79
  (notes after a reconnection), O81 (when a device counts as connected), O82 (what counts as a
  reconnection). Left for `ux-writer`: how the visible disconnection message looks (a live
  countdown or not is waiting on the user, and depends on O78).
  **User answers (2026-09-27):** O78 — the 30 seconds count from the unplug, whatever came before;
  O79 — the phrase keeps rolling at tempo and the app just tracks which note is due by the clock;
  O81, O82 — defaults accepted. Countdown: yes (ux D51). Passed back to `spec-writer` to close
  on the spec side; this entry closes once it has.

- **Q24 — which MIDI note starts a session, and whether notes played while the connection sheet is
  open can start one.** Raised by `ux-critic`: the transposition check asks the player to play a
  note, and nothing says whether that note (or any note played while the sheet is open) starts a
  session and its count-in. **User input (2026-09-27):** a MIDI note starts a session only when it
  is the note the phrase starts on. This differs from `master-spec.md` §6, where *any* first note
  starts the one-measure count-in and is deliberately not matched against phrase 1. Knock-on
  questions for `spec-writer`: whether that first note is then counted as played or has to be
  played again after the count-in; what a player sees (nothing, per the no-mismatch-hint rule) when
  a different first note does nothing; and whether a check note that happens to equal phrase 1's
  first note may start a session. `ux-writer`'s proposed default for that last point: notes played
  while the connection sheet is open never start a session. **User confirmed (2026-09-27):** the
  transposition check is its own step, and nothing played during it can start a session.
  **Spec update (2026-09-27):** now in `master-spec.md` §6/§7 (spec D115–D116). Still open on the
  spec side: spec O80 (whether the starting note has to be played again after the count-in) and
  O83 (how exactly it must match, and whether a neutral, always-visible message says which note
  starts the session; if yes, designing it is `ux-writer`'s, in the session core-loop unit).
  **User answers (2026-09-27):** O80 — an on-screen beat count during the count-in, with the first
  measure fully visible, then the player plays from the first note; O83 — exact note, octave
  included, and yes to the neutral start line (ux D52). Passed back to `spec-writer`; this entry
  closes once it has.

### Closed — Q26, Q28–Q30 (2026-09-27)

- **Q26 — between sessions, what happens when the connected controller is unplugged and plugged
  back in?** Raised by the unit-1 fix pass. Spec §8 defines "connected" (permission granted, one
  input selected, port present and open) and "lost" (the port reports disconnected), and gives the
  mid-session rule (same device reattaches by itself within 30 s), but says nothing about an
  unplug at Idle or in the Review. The tier docs currently say, tagged (proposed): the header
  switches to the neutral no-controller badge, and the player reconnects from the sheet. Open:
  does the selection survive the unplug, so that plugging the same device back in between
  sessions reattaches it by itself (with or without a new transposition check), as it does
  mid-session? This touches what "connected" means, so it may belong to `spec-writer`. See
  `flows/controller-connection/intent.md` (header forms) and
  `screens/phrase-workspace/handoff.md` (`controller-status`, no-controller badge).
  **Closed 2026-09-27 by ux D55.** The user accepted `ux-writer`'s default, put to them in conversation, which reverses the interim proposal above: the same device plugged back in between sessions reattaches by itself, with no new check.

- **Q28 — confirm the proposed behaviors for devices plugged in or unplugged while the connection
  sheet is open.** Added by the unit-1 fix pass to cover `ux-critic`'s missing-states finding;
  marked (proposed) in the tier docs until the user confirms. In short: No device found moves on
  by itself when a device is plugged in; the picker appends new devices at the end and removes
  unplugged ones (one left: the picker stays; none left: No device found); unplugging the device
  being checked or already connected ends the connection and returns to the picker or No device
  found with a "{device} was unplugged." line, never switching to another device by itself. See
  `screens/controller-connection/handoff.md`, "Device changes while the sheet is open".
  **Closed 2026-09-27 by ux D55** (user confirmed the proposal).

- **Q29 — the selected controller is away (unplugged between sessions) when a session starts, or
  is still away when a session ends.** Mirrors spec O85, raised by `spec-writer` 2026-09-27 while
  recording spec D125 (between-sessions reattach). Two cases: a Start click while the selected
  controller is away begins a no-controller session, and under spec D113 that session stays
  without a controller even if the device is plugged back in during it; and a controller lost
  mid-session and still away when the session ends — does its selection carry into the Review?
  Spec O85's proposed defaults: no reattach during that session (it reattaches by itself once the
  session ends, if still plugged in); and yes, the selection carries into the Review. Needs the
  user's confirmation, then `spec-writer`. Tier docs follow the proposed defaults, tagged
  (proposed). See `flows/controller-connection/intent.md` (header forms).
  **Closed 2026-09-27 by ux D57** (user accepted both proposed defaults).

- **Q30 — the selected controller unplugged while the connection sheet is open: is its selection
  kept?** Raised by the unit-1 second fix pass, applying ux D55. The sheet rule confirmed by ux D55
  (from Q28) says that unplugging the device being checked or already connected "ends the
  connection" and returns the sheet to the picker or No device found. The between-sessions rule
  (ux D55 from Q26, spec D125: "unplugging it does not clear the player's selection") says the same
  device plugged back in reattaches by itself with no new check. Inside the open sheet the two
  meet: if the same device is plugged back in while the sheet shows No device found, the sheet
  rule moves on "as `Try again` would", into a new transposition check; the selection rule would
  reattach it with no check. And if the player closes the sheet without choosing, is the device
  still selected (so a later replug reattaches it) or not? Proposed default: the sheet's own rules
  govern while it is open (the player is actively choosing, so a replug goes through the check
  there), and the selection is kept once the sheet closes without another device being chosen.
  Tier docs are unchanged for now (they state the sheet rule only). May touch spec §8's meaning of
  "selection", so possibly `spec-writer`'s. See `screens/controller-connection/handoff.md`,
  "Device changes while the sheet is open", and `flows/controller-connection/handoff.md` (routing
  rules, between sessions).
  **Closed 2026-09-27 by ux D58** (`ux-writer`'s own interaction call within spec D125; the
  proposed default above is refined, not taken as is).
