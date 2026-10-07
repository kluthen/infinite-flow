# Open Questions

> **Archived 2026-10-07.** Every question of the v2 design work, Q17-Q64, is closed, and v2 is
> released as version 2.0.0 after the v2.0 release gate. Kept verbatim: the register's v2
> section, header paragraph included. Q16, still open, stays in the live
> [open-questions.md](../../open-questions.md). Live summary: [README.md](README.md). Text was
> written from `ui_ux/`: "below" and "the end of this file" refer to this section, and
> paths in code spans are relative to `ui_ux/`. The one link's path was repaired for this
> location.

## v2 (Rolling Phrase) — opened 2026-09-27, reviewing `specs/versions/v2/master-spec.md`

Numbering continues from Q17. Q17 is a self-directed design question — `ux-writer` resolves it in
a future session, no `spec-writer` input needed. Q18–Q21 were routed to `spec-writer`; Q22 was
`ux-writer`'s own presentation call. All five were answered 2026-09-27 (see spec D109–D110 in
[`specs/decisions.md`](../../../specs/decisions.md), ux D46 in this tree's `decisions.md`, and the
master-spec passages cited below). Q17, Q25 and Q27 are closed in place in this section; Q26 and Q28–Q30 are closed, at the end of this file. Q64 and Q31 are closed in place. Still open: Q16.

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
  **Closed 2026-09-28 by ux D71** (two alternating systems; playhead only, no dimming).

- **Q25 — what a session started from the Review uses as phrase 1, and what the Review screen
  shows besides the review itself.** Spec O84 (logged by `spec-writer` 2026-09-27) notes that
  `master-spec.md` §4 defines phrase 1 as "the phrase already on screen before Start" and §6's
  starting-note rule speaks of Idle, while §7 also lets a new session start from the Review. Spec
  O84's proposed default: only a Start click starts a session from the Review (a MIDI start would
  collide with the unexported-favorites confirmation, which needs a click). Which phrase becomes
  phrase 1 there depends on what the Review screen shows, which is `ux-writer`'s to design. Ties in
  with `ux-critic`'s earlier note that ux D45's grounds support Idle and session sharing one
  screen but not the Review. Settle before unit 6 (Review); does not block unit 1 or unit 2.
  **Updated 2026-09-28:** with favorites moved to v3 (ux D69, spec D130) there is no confirmation
  left, so the reason behind spec O84's click-only default is gone. The open question is now
  whether a MIDI note may start a session from the Review at all.
  **Closed 2026-09-30 by ux D137** (`ux-writer`'s call under the owner's delegation, ux D135):
  at the session end a fresh phrase is generated on the staff above the Review and is phrase 1;
  the Review changes no start condition, so the starting note works there as at idle.
  **Start part superseded 2026-09-30 by ux D143** (owner): no session starts while the Review
  shows; the player leaves it first (ux D144). See `flows/review-and-export/intent.md`, Reviewing
  Is a Mode, and Playing Starts Outside It.

- **Q27 — when does the session's reserved disconnect slot appear?** The disconnect banner sits in
  `session-alert-slot`, kept free for the whole session so the banner never moves the staff. If
  the slot only appears when a session starts, the staff moves down by the slot's height at the
  Start click or starting note, just before the count-in. Proposed in the tier docs: the slot is
  in place from the session's start, before the count-in's first beat. Alternatives: reserve it at
  Idle too whenever a controller is connected (no shift at start, but empty space above the staff
  at Idle), or fold it into whatever space the session layout already changes at start. Settle
  with unit 2 (session core loop, Q17), which owns the session layout. See
  `screens/phrase-workspace/handoff.md`, "Session disconnect slot".
  **Closed 2026-09-28 by ux D76** (an always-present session cue row).

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
  **Corrected 2026-09-28 by ux D100:** content-dependent fit can fail mid-session (found by `ux-critic`, Q48).

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
  is the note the phrase starts on. This differs from `master-spec.md` §6, where _any_ first note
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

- **Q64 — after a session in which `Vary settings` changed some settings, do the controls return
  to the player's own values, or keep the ones the session ended on?** Found 2026-10-03 designing
  unit 10 (v2.1). Master spec §5 says what happens during a session, not at its end. Recommended
  (ux D157): they return to the values they had at the session start, silently, as the rising
  tempo and a stepped-down note density already do; the fresh phrase for the next session uses
  them. The alternative keeps the drifted values, so each session starts where the last one
  wandered to. A product rule for the owner, then `spec-writer`. Designed as recommended, marked
  `(proposed)`: see `screens/phrase-workspace/handoff.md`, States, **Session end**, and
  `flows/play-session/handoff.md`, End.
  **Closed 2026-10-03 by ux D167** (the owner answered yes, as recommended; spec D182).

- **Q31 — the balance between backing, click and the player's own instrument.** The product owner
  confirms backing volume is a real problem (an acoustic tenor is loud in the room; a Travel Sax or
  keyboard plays through the same speakers or headphones as the backing) but cannot give levels
  yet. Needs listening tests before the audio-mix controls' defaults and ranges are designed. Not
  blocking the strategy pass; blocks the audio-mix part of the session screen. See
  `strategy.md`, context of use.
  **Closed 2026-10-05 by spec D188** (the owner accepted the audio mix as built, by ear: its
  volume ranges, defaults and linear volume-to-gain mapping are final for v2.0).

- **Q32 — the tablet on the music stand is an iPad, and iPads cannot connect a controller.** Every
  browser on iPadOS runs on WebKit, which has no Web MIDI; spec v2 is Chromium-only for that
  reason. So the owner's stand tablet can only run controller-less sessions (reading at a fixed
  tempo, stopped by tapping Stop), with no acknowledgement, no silence stop, no adaptive tempo.
  Whether that is an accepted, designed-for mode on iPad or out of scope is a product-scope
  decision for `spec-writer`; the design consequence (what the iPad sees at the `Connect
controller` entry: today the Unsupported browser state) follows from it. An Android tablet or the
  S20 FE in Chrome does have Web MIDI (USB; Bluetooth is best-effort per the spec's open item).
  **Closed 2026-09-28 by ux D63** (no iPad support in v2; wider browser scope is v4 or v5).

- **Q33 — the Review on a phone: a plainer layout, or fewer functions?** The product owner expects
  no real reviewing on a phone and wants the phone Review kept minimal; for a true review of a
  phone session, the player would move to another device. The v2 spec gives the Review the same
  functions everywhere (every phrase shown engraved, mark favorites, export whole session or
  favorites). A plainer phone layout with those functions intact is a design call; dropping a
  function on phones changes product scope and goes to `spec-writer`. Also noted to the owner: no
  version plans an import that reopens an exported session for review. v2's cross-device path is
  export, then opening the MusicXML or MIDI in another tool; v4's whole-file seed feeds a
  continuation, not a review. See `strategy.md`, trade-offs (phone and larger screens).
  **Closed 2026-09-28 by ux D64** (spec baseline functions, minimal annotation, no added tooling).

- **Q34 — export shape: the owner's picture differs from the v2 spec.** The owner expects to
  export _either_ the generated notes _or_ the played notes, and two separate files when both are
  wanted. The v2 spec (§7) has MusicXML carrying only the generated line (played notes never), and
  one MIDI file with the generated line, an optional backing track and an optional played-notes
  track in the same file. A spec question; needs the owner's call, then `spec-writer`. Blocks the
  export part of the Review screen. See `strategy.md`, problem alignment (the Fledgling Composer).
  **Closed 2026-09-28 by ux D66** (generated or played; played is MIDI only; both means two files).

- **Q35 — keeping more than one session: v2 or later?** The owner spoke of session content being in
  local storage, with more than one session kept only when the player asks (pinning a session),
  suitable access to older sessions, and perhaps a comment on a session. The v2 spec stores nothing
  (§2, §7: closing or reloading discards everything); local persistence and reviewing older
  sessions are v3. Likely the owner means v3 or later; to confirm, then pinning and comments go to
  `spec-writer` as candidates. See `strategy.md`, trade-offs (review and flow).
  **Closed 2026-09-28 by ux D67** (v3 or later; pinning and comments are candidates).

- **Q36 — session-time text legibility from the stand.** The strategy's context of use requires
  anything read mid-session away from the staff to be legible from music-stand distance
  (proposed). Today's tokens don't show it: `.tempo-readout` is `--text-sm` and muted (spec §10
  wants the tempo in effect shown during an adaptive-tempo session), and `.session-alert` sets no
  size, so the disconnect banner inherits body text. To settle in unit 2 (session screen), with
  the owner, in `screens/phrase-workspace/` and the token source. Raised by `ux-critic` on the
  strategy persona pass. See `strategy.md`, context of use (distance).
  **Narrowed 2026-09-28 by ux D70:** only the disconnect countdown must be legible from the stand;
  the tempo readout and other session text are secondary. What remains: the countdown's size.
  **Closed 2026-09-28 by ux D83** (sentence at `--text-lg`, countdown at `--text-2xl`, bold).

- **Q37 — a staff-only session view: which elements may it hide?** The owner floated letting the
  player remove everything but the staff and Stop from the screen during a session (ux D70). The
  spec mandates some session elements: audio volume controls reachable at all times (§6), the tempo
  in effect shown during an adaptive-tempo session (§10), the count-in counted on screen and the
  starting-note line (§6), the repeat notice (§4), the disconnect countdown (§8). Which may a
  staff-only view hide, and is "reachable" still met by un-hiding? To settle in unit 2 with the
  owner; any hide of a spec-mandated element goes to `spec-writer`. See `strategy.md`, context of
  use (hands and eyes during a session).
  **Closed 2026-09-28 by ux D72** (no staff-only view in v2; the owner places it in v5).

- **Q38 — a generation-failure banner still showing when a session starts.** A session may start
  from Generation error over a retained phrase (ux D79), and that banner sits between the score
  toolbar and the cue row. Keeping it through the session leaves a stale error above the staff for
  the whole session; removing it at Start moves the cue row and the staff up, the one layout shift
  ux D71/D76 set out to prevent. Proposed: remove it at Start, before the count-in's first click
  (the jump-to-top happens at the same moment), accepting that one shift. Unit 2, logged
  2026-09-28 at write-up. See `screens/phrase-workspace/handoff.md`, Layout Tree and States
  (Session count-in).
  **Closed 2026-09-28 by ux D87 (no session starts over a generation error).**

- **Q39 — a controller lost during the count-in.** The disconnect banner and the count-in both
  want the one cue row. Proposed (written into the handoff as proposed): the banner takes the row
  and the count-in keeps sounding; after beat 4 the session runs as in any disconnect. Alternative:
  the count-in keeps the row and the banner appears after beat 4, three or four seconds late.
  See `screens/phrase-workspace/handoff.md`, Components and Content (session cue row).
  **Closed 2026-09-28 by ux D88.**

- **Q40 — a session that ends before phrase 1 sounds.** Stop, or a hidden tab, during the count-in
  ends the session with no phrase ever sounded, so the session history is empty (spec §7 records
  only phrases that started sounding). Does the Review open on nothing? Proposed: return straight
  to idle, with no Review, the phrase still on screen. This touches spec §7, so it goes to
  `spec-writer` as well. See `flows/play-session/handoff.md` (End).
  **Closed 2026-09-28 by ux D89.**

- **Q41 — a viewport change during a session.** Rotating a phone or tablet to portrait shows the
  orientation notice in place of the workspace, hiding the staff and `Stop`; resizing a window
  across `bp-tablet-landscape` changes between the one-system and split layouts, which refill
  differently, and a redraw of the systems mid-phrase. Not designed. Options include: keep the
  session running behind the orientation notice with `Stop` still shown on it; end the session on
  portrait; hold the layout chosen at Start until the session ends. See
  `screens/phrase-workspace/handoff.md`, Responsive Behavior.
  **Closed 2026-09-28 by ux D90.**

- **Q42 — the session does not fit one landscape phone screen.** At `bp-mobile-landscape` the
  header (with `Stop`), the score toolbar (with the audio mix on its own line), the cue row and two
  staff systems are taller than a landscape phone's viewport, so part of the lower system sits
  below the fold, and nothing scrolls during a session. Options: accept it (the phone is the
  lesser, occasional device, ux D65), trim the chrome above the staff on the phone during a session,
  or reconsider what the phone header holds. Needs a check against real phone viewport heights.
  See `screens/phrase-workspace/handoff.md`, Responsive Behavior, and `strategy.md`, context of use
  (device).
  **Closed 2026-09-28 by ux D91.**

- **Q43 — where focus goes when the connection sheet closes and `Start session` is disabled.** The
  controller-connection docs send focus to the session action on close (ux D49); on an empty
  workspace, or while a phrase generates, that button is disabled and can't take focus. Proposed
  (written into the controller-connection docs as proposed): the phrase action instead. See
  `flows/controller-connection/handoff.md`, Entry and exit, and
  `screens/controller-connection/handoff.md`.
  **Closed 2026-09-28 by ux D92** (the phrase action). The case where both actions are disabled
  remains open as Q44.

- **Q44 — focus when the connection sheet closes and both header actions are disabled.** ux D92
  sends focus to the phrase action when `Start session` is disabled, but in **Loading** (a
  generation in flight, e.g. one started just before the sheet opened) and under an
  **Unsupported rhythm combination** the phrase action is disabled too, so neither can take
  focus; the sheet's stated fallback is the session action, also disabled. Options: the
  `controller-status` element that opened the sheet; the first control of the rhythm group
  when the rhythm combination is unsupported; the session action once the phrase lands (Loading
  only). Not decided; the docs state the D92 rule only. Found 2026-09-28 applying D92. See
  `screens/controller-connection/handoff.md`, Focus Management, and
  `flows/controller-connection/handoff.md`, Entry and exit.
  **Closed 2026-09-28 by ux D95.**

- **Q45 — the phone's cue row: does the disconnect banner still fit beside the compact `Stop` and
  `Volume`?** ux D91 puts a compact `Stop` and `Volume` at the cue row's trailing end on the phone
  during a session; ux D83 sized `--session-cue-row-block-size` for the disconnect banner wrapping
  to at most two lines at `bp-mobile-landscape`, with the full row width. The two buttons take
  roughly a quarter of a narrow landscape phone's row, so on the narrowest supported phones the
  sentence may wrap to three lines and overflow the fixed row. Proposed: keep the token and check
  on the narrowest supported landscape phone at build; if it overflows, choose between a taller
  row (less room for the staff, which ux D91 needs whole on screen) and shortening what shares the
  row. Also carried here, tagged (proposed) in the handoff: the volume popover, when opened from
  the compact `Volume`, closes as the session ends and that button goes. Found 2026-09-28
  applying D91. See `src/styles/theme.css` (`--session-cue-row-block-size` comment) and
  `screens/phrase-workspace/handoff.md`, Components and Content (`session-cue-actions`) and
  Responsive Behavior.
  **Closed 2026-09-28 by ux D96.**

- **Q46 — a window resized during a session, within the held layout.** ux D90 keeps the staff
  layout chosen at Start (one system per phrase, or the split layout) until the session ends.
  Undecided: whether the systems re-engrave at the new width (and when: at once, or only at each
  system's next refill, so the system being read never redraws), and what happens when a window
  narrowed mid-session can no longer hold one system per phrase at the legibility floor, since a
  session never shows the notation-error panel. Mostly a desktop case (a phone's width does not
  change without a turn to portrait, which ends the session). Found 2026-09-28 applying D90. See
  `screens/phrase-workspace/handoff.md`, Responsive Behavior, and `flows/play-session/handoff.md`
  (Staff layout held).
  **Closed 2026-09-28 by ux D94.**

- **Q47 — a session ended by a too-narrow window, when the idle layout cannot engrave the phrase
  either.** ux D94 ends a session when the held staff layout no longer fits at the legibility floor;
  once ended, the idle layout is chosen afresh at the new width, and the ordinary idle rules then
  apply. If that idle attempt fails too (a held split layout that no longer fits, or a width where
  the idle one-system layout does not fit at `bp-tablet-landscape` and up), the workspace lands in
  **Notation error** rather than **Ready**, with `Start session` disabled, yet both end routes send
  focus to `Start session`. Proposed (written into the play-session and phrase-workspace handoffs
  as proposed, count-in end only): focus goes to the phrase action, `Retry notation`, following
  ux D95's order. Open for the end after phrase 1 has sounded, which opens the Review: what the
  Review shows over a staff in notation error, and where focus goes, belongs to unit 6. Mostly a
  desktop case (a narrow window). Found 2026-09-28 applying D94. See
  `flows/play-session/handoff.md` (Ended before phrase 1 sounds, End) and
  `screens/phrase-workspace/handoff.md`, States, **Session ended during the count-in**.
  **Narrowed 2026-09-28 by ux D99:** the count-in end is settled (`Retry notation`); still open
  only for the end after phrase 1, in unit 6. **Updated 2026-09-28 by ux D107/D108:** a too-small
  end now lands on the "needs more room" notice (or regenerates when only the phrase is too wide),
  not on Notation error; the unit-6 part becomes what the Review shows over that notice.
  **Closed 2026-09-30 by ux D139** (with D138; `ux-writer`'s call under the owner's delegation,
  ux D135): the Review opens; its list gives way to the same no-room sentence while the staff
  has no room, its export keeps working, and focus goes to the staff area's `room-notice` (on
  leaving the Review, per ux D144). See
  `flows/review-and-export/intent.md`, When the Window Has No Room.

- **Q48 — a look-ahead phrase that does not fit the held staff layout mid-session.** Found by
  `ux-critic` on 2026-09-28. Whether a phrase fits at the legibility floor depends on its content
  (the widest measure), not only on the locked settings, so Q20's "cannot occur" is wrong for
  content-dependent fit. The screen handoff currently treats it as a missed deadline (a failure-
  ladder repeat that can raise the struggling notice) with no fresh-seed retries, and the phone's
  held layout is effectively picked by phrase 1's content. Proposed, awaiting the owner: fit to the
  held layout is part of a valid session phrase (a misfit is a failed attempt with the normal
  retries; spec §4/§7 side to `spec-writer`), and below `bp-tablet-landscape` a session always uses
  the split layout. See `screens/phrase-workspace/handoff.md`, States, **Session running**, and the
  Notation Contract; `flows/play-session/intent.md`.
  **Closed 2026-09-28 by ux D100.**

- **Q49 — the acknowledgement colour against the staff ink.** Found by `ux-critic` on 2026-09-28.
  The flow and screen intents claim `--color-note-ack` differs from `--color-staff` in lightness
  enough for red–green colour-blind players, but `src/styles/theme.css` records 2.8:1 (light) and
  1.67:1 (dark), under the 3:1 non-colour-distinction guide (WCAG G183), and acknowledgement is
  carried by colour alone. Either the token reaches 3:1 against the staff ink in both themes or the
  claim is withdrawn and a non-colour cue considered. See `flows/play-session/intent.md`
  (Acknowledgement), `screens/phrase-workspace/intent.md` (The Staff During a Session).
  **Closed 2026-09-28 by ux D101.**

- **Q50 — a session started on a phone from a phrase shown on one system.** Found 2026-09-28
  applying ux D100. D100 pins a phone session (below `bp-tablet-landscape`) to the split layout
  but keeps the idle layout rules, under which a phone shows a phrase on one system when it fits.
  Starting a session from such a phrase must then redraw phrase 1 over both systems, which
  contradicts D71's "Start causes no layout shift" (the staff area keeps its size, but bars 3–4
  move to the lower system). Proposed, written into the docs as proposed: redraw phrase 1 in the
  split layout instantly, with no fade, before the count-in's first click. Alternative for the
  owner: the phone's idle layout also always splits, so Start never moves a note (a change to
  v1's idle rule, touching the Focal Point reasoning and the Notation Contract). See
  `screens/phrase-workspace/handoff.md`, Notation Contract (**Session staff layout**) and States
  (**Session count-in**); `flows/play-session/handoff.md` (Session staff layout);
  `flows/play-session/intent.md` (Which staff layout a session keeps); `motion.md`.
  **Closed 2026-09-28 by ux D102.**

- **Q51 — the session view is taller than a landscape phone.** Found by `ux-critic` (second pass)
  on 2026-09-28. `staff-frame` keeps v1's fixed minimum block size at every width below
  `bp-desktop`, and with `--session-cue-row-block-size` the session view needs more height than a
  landscape phone has (typical phone viewports are about 360–412 CSS px tall before browser
  chrome), so the promised jump cannot put the cue row and both systems wholly in view, and no
  rule ends or blocks a session whose staff cannot fit vertically (the legibility checks test width
  only). See `flows/play-session/handoff.md` (Jump), `screens/phrase-workspace/handoff.md`
  (Responsive Behavior; States, **Session count-in**), `src/styles/components.css` (`staff-frame`).
  **Closed 2026-09-28 by ux D104.**

- **Q52 — split-layout material already checked but not yet drawn when the window narrows.** Found
  by `ux-critic` (second pass) on 2026-09-28. The viewport-change end rule tests the systems on
  screen and the look-ahead fit test covers phrases not yet requested; neither covers material
  already checked and waiting for a refill (the next phrase's bars 3–4, or a repeated phrase's bars
  1–2). See `flows/play-session/handoff.md` (Viewport change, Look-ahead) and
  `screens/phrase-workspace/handoff.md` (Responsive Behavior; Notation Contract).
  **Closed 2026-09-28 by ux D105.**

- **Q53 — at idle, a phone too short for the staff shows a notation error its action cannot
  fix.** Found 2026-09-28 applying ux D104. D104 counts a floor that cannot fit the height as the
  staff not shown "as D98", and D98's idle form is **Notation error**, so the write-up puts a
  too-short phone at idle there. But `Retry notation` cannot succeed until the window changes, and
  the copy ("Notation error. Try again.") does not say the screen is too short. The same already
  holds for a too-narrow window (and touches Q16). Options: keep it (rare: about 262–282 px of
  small viewport height is needed, see `src/styles/theme.css`, `--staff-systems-phone-block-budget`),
  or give the size-caused case its own wording. See `screens/phrase-workspace/handoff.md` (Notation
  Contract, **Scale below `bp-tablet-landscape`**; States, **Notation error**).
  **Closed 2026-09-28 by ux D107** (with D108 and D109).

- **Q54 — two phrases drawn at different scales on screen together during a session.** Found
  2026-09-28 applying ux D104. The engraving scale is the largest that fits each phrase's width
  (and, below `bp-tablet-landscape`, the height), so it varies with each phrase's notes. During a
  session the two systems can hold different phrases (whole phrases alternating from
  `bp-tablet-landscape` up; phrase _N_'s bars 3–4 below phrase _N+1_'s bars 1–2 on a phone), so
  they can show different staff sizes, and on the phone the "aligned measure columns" of the split
  layout hold within one phrase only. The system positions do not change size (they follow the
  height-fit scale, not the phrase), so nothing moves; the question is whether the size difference
  matters to reading, or whether a session should hold one scale (for example the one it started
  with, a look-ahead phrase then having to fit at that scale, which makes misfits more likely). See
  `screens/phrase-workspace/handoff.md` (Notation Contract) and `flows/play-session/intent.md`
  (The Rolling Display).
  **Closed 2026-09-28 by ux D111.**

- **Q55 — confirm the proposed details of the phone density rule (ux D109, D110, D112).** Found
  2026-09-28 applying them. The write-up proposes: the disabled segment's reason, "Sixteenth isn't
  available on small screens.", in a `field-note` under the control; the substitution is not a
  manual edit, so it never clears the musical profile preset or changes `preset-status`; clicking
  the already-checked `Eighth` over a stored `Sixteenth` changes nothing; during a session the
  read-only control shows the effective density (`Eighth` after a step down) and `Sixteenth`'s
  disabled treatment and note follow the current breakpoint. Also check the labels: the lexicon's
  Note density entry says "Quarter notes" / "Eighth notes" / "Sixteenth" while the handoff's
  segments read `Quarter` / `Eighth` / `Sixteenth`. See `screens/phrase-workspace/handoff.md`
  (Components and Content, Note density; Responsive Behavior) and `docs/music/lexicon.md`.
  **Closed 2026-09-28 by ux D114.**

- **Q56 — confirm the proposed details of the "needs more room" notice (ux D107, D108, D112).**
  Found 2026-09-28 applying them. The write-up proposes: `Start session` keeps its primary
  emphasis while disabled, and `Regenerate phrase` stays enabled and secondary (so a player whose
  retries all failed can lower the density and try again); after a session ended by a viewport
  change lands on the notice, focus moves to `room-notice` (`tabindex="-1"`, never in the tab
  order) rather than the usual order, which would reach a `Regenerate phrase` that cannot help;
  when the staff has room but phrase 1 is too wide after such an end, focus goes to
  `controller-status` during the regeneration's Loading; `notation-status` announces the notice
  at idle; "no room" means the layout's fixed parts plus four measures at the engraver's minimum
  width; retries count only misfits, and an attempt that finds no phrase ends the run with the
  ordinary generation banner; a too-wide phrase with the rhythm combination unsupported goes to
  the notice at once; a notice that clears with the rhythm combination unsupported returns to
  Empty with the unsupported-rhythm alert; shrinking the window at idle can replace the phrase on
  screen; the Loading after a viewport change shows no score; the phone `staff-frame`'s block
  size stays the height budget's maximum while the notice shows. See
  `screens/phrase-workspace/handoff.md` (Notation Contract, **Room for the staff**; States,
  **Needs more room**, **Loading**, **Session ended during the count-in**) and
  `flows/play-session/handoff.md`.
  **Closed 2026-09-28 by ux D114.**

- **Q57 — the notice names only the window when fewer notes would also cure it.** Found
  2026-09-28 applying ux D107/D108. When every idle retry was too wide, the room is enough for
  the staff but not for these settings, and a lower note density or rhythmic variety is a second
  cure; the copy, "The staff needs more room. Make the window larger.", names only the first.
  Options: keep one copy (the case is rare below `bp-tablet-landscape` now that `Sixteenth` is
  unavailable there), or give this case its own sentence. Also for `spec-writer`: the idle retry
  count is written as "up to three fresh-seed retries, no carry-in" from "the normal fresh-seed
  retries"; the spec should state it. See `screens/phrase-workspace/handoff.md` (Notation Contract,
  **Room for the staff**).
  **Closed 2026-09-28 by ux D113.**

- **Q58 — a narrow desktop window gets the phone's "too small" sentence.** Found 2026-09-28
  applying ux D113. The no-room sentence follows the width-only breakpoint query the engraver uses,
  so a desktop window narrowed below `bp-tablet-landscape` reads "This screen is too small to show
  the staff." although enlarging the window would help. See `screens/phrase-workspace/handoff.md`,
  States, **Needs more room** (sentence table).
  **Closed 2026-09-28 by ux D115.**

- **Q59 — when does the "these notes need more room" notice clear?** Found 2026-09-28 applying
  ux D113. In that case the staff already has room, so "clears once the staff fits" gives no
  trigger: any widening, any viewport change, or only a settings change or `Regenerate phrase`?
  See `screens/phrase-workspace/handoff.md`, States, **Needs more room**.
  **Closed 2026-09-28 by ux D116.**

- **Q60 — two details of a round of retries under the "these notes need more room" notice.**
  Found 2026-09-28 applying ux D116. The write-up proposes: while the round runs, `room-notice`
  stays in the frame, dimmed by `staff-loading` (`staff-frame staff-no-room staff-loading`),
  rather than giving way to the empty Loading frame and coming back if the round fails, which
  would blink the notice off and on; and when the round ends with every attempt too wide,
  `notation-status` announces the sentence again, so a screen-reader player who changed a setting
  hears that it did not help (otherwise `Generating phrase` is followed by silence). See
  `screens/phrase-workspace/handoff.md`, States, **Needs more room** (Clearing, too-many-notes
  cause) and **Loading**; `motion.md`, Rules.
  **Closed 2026-09-28 by ux D117.**

- **Q61 — confirm the notice under a generation-failure banner.** Found 2026-09-28 applying ux
  D114. Two lines about **Needs more room** while a generation-failure banner shows are still
  tagged (proposed), because Q56's list did not name them: the banner stays above
  `session-cue-row`, `Retry generation` keeps the phrase action and the primary emphasis, and
  `Start session` is secondary and disabled. See `screens/phrase-workspace/handoff.md`,
  Components and Content (the header actions table) and States, **Needs more room**.
  **Closed 2026-09-28 by ux D117.**

- **Q62 — the "these notes need more room" notice beside the unsupported-rhythm alert, with no
  change that would start a round.** Found 2026-09-29 applying ux D117 (1). D117 (1) says a
  blocked rhythm combination shows the empty staff with the unsupported-rhythm alert, the notice
  giving way; the write-up applies it, as briefed, to a widening or a setting change made while
  that notice shows. Two paths can still put the notice beside the alert: (a) a phrase that stops
  fitting at idle while the combination is unsupported "takes **Needs more room** at once" (a
  Q56 detail, confirmed by ux D114). One widening past `bp-tablet-landscape` can do both at once:
  it switches to the one-system layout, where the phrase may no longer fit, and can make a stored
  `Sixteenth` combination unsupported. (b) Under ux D118 a widening during a round starts
  nothing; one past `bp-tablet-landscape` can make a stored `Sixteenth` combination unsupported
  while the round runs. Do the round's remaining attempts keep the density it started with, and
  if the round then fails, does the notice stay beside the alert? Proposed, not confirmed by the
  owner: D117 (1) applies whenever the too-many-notes notice would show under an unsupported
  combination, so (a) goes to **Empty** with the alert, as a profile switch does; in (b) the
  round keeps the density it started with, and a round that fails under a combination now
  unsupported gives way to **Empty** the same way. Tier docs are unchanged for now: they keep
  D114's rule for (a) and say nothing for (b). Spec §6 covers neither, so possibly
  `spec-writer`'s too. See `screens/phrase-workspace/handoff.md`, Notation Contract, **Room for
  the staff** (the last sentence of the item on every idle engraving), and States, **Needs more
  room** (A widening during a round; Under an unsupported rhythm combination).
  **Closed 2026-09-29 by ux D120 and D121** (`ux-writer`'s calls under the owner's D119): (a) goes
  to **Empty** with the alert, as proposed; (b) each attempt takes the density the window gives
  when it is generated, not the round's starting density, and a round that meets an unsupported
  combination stops and gives way to **Empty**.

- **Q63 — the shortest phone screen the staff must fit, and whether to go further than D127 and
  D128.** Found 2026-09-29 reworking the phone staff height after build-plan chunk 3. With ux
  D127 (one system size for every instrument, sized for one instrument's reach) and D128 (a
  smaller block padding in the phone's staff frame), two staff systems fit at the legibility floor
  (5 px per staff space) down to a small viewport height of about 276 px (about 291 px if the
  start marker must sit above a chord symbol, D129). That covers the working figure of about
  300 px for a 360-px-tall landscape phone with its browser toolbar showing, at about 5.8 px per
  space, and about 330 px at about 6.8 px. Real phones vary: where the system status bar also
  stays visible in landscape, a 360-px phone can leave the page about 280 px, which the
  recommendation only just covers. Two further levers exist, neither applied: (a) a phone cue row
  of `4rem` instead of `6rem` (32 px more, down to about 244 px; the phone's disconnect banner
  then has to fit one line beside the compact `Stop` and `Volume`, so it gets smaller or shorter,
  which touches the owner's D51 and D97); (b) a lower legibility floor, a product call, since the
  owner signed off 5 px on 2026-09-24 (4.5 px saves 15 px with D127, 4 px saves 30 px; below
  5 px a sight-reading staff is smaller than a pocket score). Proposed default, per D119 (2): no
  further change; about 276 px is the phone minimum, and a shorter screen gets "This screen is too
  small to show the staff." The owner confirms, or names the shortest small viewport height the
  staff must fit. See `screens/phrase-workspace/handoff.md`, Notation Contract (**Scale below
  `bp-tablet-landscape`**, **System position size and staff placement**).
  **Closed 2026-09-29 by ux D130** (the owner accepts D127–D129 as recommended; about 276 px is the
  phone minimum; no `4rem` phone cue row; the 5 px floor stays).
