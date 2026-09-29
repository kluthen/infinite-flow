# Open Questions

Status: draft v0.24

Only questions that are truly open appear here. IDs are stable. Each question's full text lives in
exactly one place: here, or in the document named. When a question is resolved it leaves this
register and its answer goes to the [decisions log](decisions.md). Resolved questions from earlier
work are recorded in the archived logs:
[D1–D46](archive/v1/decisions-D1-D46.md) and
[D47–D71](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md).

O24 was resolved 2026-09-27 (D108): the check is kept, ships in v2.3, and fires only on measures
where the player goes off-script. Six v2 questions (O78–O83) were opened the same day by the
controller-connection answers (D111–D118) and resolved later that day (D119–D124). O84 was opened
while recording them (see the last section). O85, opened while recording D125, was resolved the
same day (D126). O86 was opened 2026-09-28 by the export-by-content change (D129), and deferred
to v3 the same day, when favorites moved there (D130). O87 and O88 were opened 2026-09-28 while
recording the screen wake lock (D131) and the count-in that always clicks (D132). O88 was
resolved the same day (D134): the count-in plays at the click volume, which never reaches silence.
O89 was opened 2026-09-28 while recording the landscape lock and the portrait rule (D137), and
resolved the same day (D138): a session ends whenever the staff can no longer be shown, whether or
not the device was turned. O90 was opened while recording D138, and resolved the same day (D139):
no session starts while the staff is not shown. O91 and O92 were opened 2026-09-28 while
recording the changes to v1 at Idle (D144–D146), and resolved the same day (D147–D150): the
density follows the window's width for the next phrase generated, and a session's density only
steps down (O91); a new phrase is generated when the notice clears (O92). O93 and O94 were opened
while recording them. O94 was resolved the same day (D151): when the notice clears under
unsupported rhythm settings, no phrase is shown and generation stays blocked until the settings
change. O95 was opened while recording what clears the "these notes need more room" notice
(D152), and resolved the same day (D153): a change that lands on unsupported rhythm settings while
that notice shows gives way to no phrase, as D151 does. O96 was opened 2026-09-29 while recording
that a wider window during a round of retries starts nothing (D154), and resolved the same day
(D155): each attempt of a round takes its note density from the window when it is generated, and
a crossing that makes the rhythm combination disallowed stops the round. O97–O99 were opened
2026-09-29 while correcting the gaps `documentalist` found in the v2 master spec (D157–D163).

### Registered from the v2 proposal and the prerequisites analysis (2026-09-25)

The original proposal is archived: [v2 highlights proposal](archive/v2/highlights-proposal.md) and
[prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions). O32 and
O33 were resolved on 2026-09-26 (D73, D72). O10 was resolved 2026-09-27 (D83). O36, O40 and O43
were resolved 2026-09-27 (D94, D95, D96). O40 stays resolved, but by ux D71's two alternating
staff systems, which supersede D95's two display modes (D164).

**Later and governance**

- **O47 - Ornament representation** _(v2/v3 embellishment, endgame)_: is a trill or mordent an expanded event figure, or a notated symbol with playback expansion?
- **O48 - Import normalization** _(v4 file seed)_: for non-4/4 meters, tuplets, pickups and polyphony: reject, normalize, or lift the policy?
- **O49 - ATD atom lifecycle** _(v2 onward)_: amend the first-release atoms in place, or scope them to v1 and add v2 atoms beside them?

## v2 spec questions (O50+)

Raised on 2026-09-26 while drafting the v2 topic documents, since consolidated into
[versions/v2/master-spec.md §12](versions/v2/master-spec.md#12-open-questions-carried-forward)
(plain-language form, no IDs) and the archived
[questions-for-user.md](archive/v2/questions-for-user.md) (full working history). O52 was
resolved 2026-09-27 (D97). O24 was resolved 2026-09-27 (D108).

- **O77 - The settings-mutation flag's cadence and default** _(2026-09-27; scope, magnitude, the
  invalid-combination rule and release settled — D103, D107, ships v2.1)_: an opt-in that lets
  every eligible setting (everything except instrument selection and tempo) drift by at most one
  grade every few phrases, re-mutating on an unsupported combination rather than applying or
  skipping it. Still open: the exact cadence (how many phrases between mutations, fixed or
  randomized within a range), and whether the flag defaults on or off when a session starts.
  [master-spec.md §5](versions/v2/master-spec.md#5-control-changes-during-a-session).
- **O57 - Backing voicing and register** _(listening test, confirmed happening later)_: proposed
  default is bass in MIDI 36–47 and chords in close position with the top note at or below MIDI
  64 (E4), attacked per harmony event and per downbeat. Is that acceptable for v2.0, or should the
  chords sit higher or comp rhythmically?
  [master-spec.md §6](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo).
- **O68 - Main-thread engraving vs audio scheduling** _(prototype needed)_: does engraving a
  phrase (VexFlow, main thread) ever block longer than the scheduler's look-ahead window (200 ms
  proposed)? The v2 prototype should measure the longest main-thread task during a session at 240
  BPM. [master-spec.md §6](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo).
- **O71 - Bluetooth MIDI** _(research on the owner's setup)_: is USB the tested path for v2.0,
  with BLE best-effort (proposed)? Depends on whether the owner's OS exposes the reference
  controller's BLE MIDI to Chromium, and its measured jitter. Note (2026-09-28, D127): the owner
  also plays occasionally on an Android phone with the Travel Sax, so "the owner's OS" covers
  Android Chrome as well as the main computer. How the controller connects to the phone
  (Bluetooth or USB) is not known.
  [master-spec.md §12](versions/v2/master-spec.md#12-open-questions-carried-forward).
- **O69 - Latency after ISS-004** _(measurement)_: re-run the latency harness after ISS-004,
  including cold runs after a mid-session control change. Does the cold worst case stay under a
  quarter of the one-bar deadline at 240 BPM (250 ms in Chromium)?
  [master-spec.md §11](versions/v2/master-spec.md#11-definition-of-done).

## v2 controller connection and session start (O78+)

O78–O83 were opened 2026-09-27 by the product owner's answers to ux Q23 and ux Q24 (D111–D118)
and resolved the same day (D119–D124). O85 was resolved the same day too (D126).

- **O84 - Starting a session from the Review** _(D113, D115, D124; noticed by `spec-writer` while
  recording D119–D124)_: master-spec §4 makes phrase 1 "the phrase already on screen before
  Start", and §6 says which note starts a session "while the app is Idle", but a new session can
  also be started from the Review (§7), where the screen shows the past session. Which phrase
  becomes phrase 1 there, and can a MIDI note start the session from the Review at all? The second
  part used to collide with a confirmation before discarding unexported favorites, which a MIDI
  start can't answer; since D130 the review has no favorites and starting from it asks no
  confirmation, so that collision is gone. Proposed default for the second part, kept though its
  original reason is gone: from the Review, only a Start click starts a session; a MIDI note
  starts nothing there. The first part has no proposed default yet: it depends on what
  the Review screen shows besides the review, which `ux-writer` designs. Not confirmed by the
  owner. Since D135 (2026-09-28) no session starts over a generation failure at Idle, and since
  D139–D140 the spec lists every state in which no session starts at Idle (master-spec §6, "When a
  session can start"); the answer also has to say how those conditions apply when starting from
  the Review.
  [master-spec.md §6](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo).

## Favorites, deferred to v3 (O86)

- **O86 - What makes a favorite "exported"** _(v3; D88, D129, D130; noticed by `spec-writer`
  while recording D129)_: v2's spec used to ask for confirmation before starting a new session
  when the review held unexported favorites. With the export split by scope and by content, a
  favorite could leave the app in part: its played notes only, or inside a whole-session export.
  Does that count as exported? Since D130 v2 has no favorites and asks no confirmation, so this
  is not a v2 question. The owner: "leave this as open question for later". It is settled with
  favorites in v3, and may change shape there, since v3 adds local persistence. Earlier proposed
  default, not confirmed: a favorite counts as exported once any export that included its phrase
  has been triggered, whatever the scope and content.
  [v3 favorites](versions/v3/README.md#favorites-v3-scope-to-be-settled).

## v2 session behaviour (O87+)

Opened 2026-09-28 by `spec-writer` while recording owner decisions from the `ux-writer` unit-2
session core-loop review, and later that day from `ux-writer`'s play-session decisions. O88 was
resolved the same day (D134), O89 too (D138), and O90 too (D139). O87 does not block starting
v2.0 implementation.

- **O87 - The screen wake lock dropped mid-session** _(D131, from ux D73)_: the app holds a
  screen wake lock for the whole session, and a refused or missing lock is silent. A browser may
  also release a granted lock by itself while the session is still running (for example to save
  battery). Does the app ask for it again? Proposed default, not confirmed by the owner: it asks
  again, silently, while the session runs and the page is visible; nothing is shown either way.
  [master-spec.md §6](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo).

## v2 changes to v1 at Idle (O91+)

Opened 2026-09-28 by `spec-writer` while recording the owner's decisions from `ux-writer` (ux
D107–D109, spec D144–D146). O91 and O92 were resolved the same day (ux D110 and ux D112, spec
D147–D150): O91's defaults (a) and (b) were replaced by D147 (the density follows the window's
width when each phrase is generated, at Idle and in a session) and D148 (a session's density only
steps down); (c) was settled with its proposal (D148), and so was (d) (D150). O92 was settled
against its proposal (D149): the notice always clears to a new phrase. O93 and O94 were opened
while recording those answers. O94 was settled with its proposal the same day (ux D114, spec
D151). O95 was opened while recording ux D116 (spec D152), and settled the same day against its
proposal, with the alternative it named (ux D117, spec D153). O96 was opened 2026-09-29 while
recording ux D118 (spec D154), and settled the same day with its proposal by `ux-writer` under
the owner's delegation of minor calls (ux D120 and ux D119, spec D155). O93 does not block
starting v2.0 implementation; it blocks only the behaviour it names.

- **O93 - The settings-mutation flag in a session generating with `Eighth`** _(D150, D147, D148;
  v2.1, with O77)_: when a chosen `Sixteenth` generates as `Eighth`, which of the two does a
  note-density mutation step from? From the chosen `Sixteenth`, a step down to `Eighth` changes
  nothing generated. And does `Sixteenth` count as unavailable in a session that stepped down to
  `Eighth` (D148) and whose window is now wide enough, where landing on it would change nothing
  generated either? D150 covers only "below the width". Proposed, not confirmed by the owner: a
  mutation steps from the density generated with, and `Sixteenth` counts as unavailable whenever
  the session generates with `Eighth` under D146, whatever the window's width.
  [master-spec.md §5](versions/v2/master-spec.md#5-control-changes-during-a-session).

## v2 gaps from the atom ingestion (O97+)

Opened 2026-09-29 by `spec-writer` while correcting the gaps `documentalist` found when it drew
ATD atoms from master spec v1.18 (D157–D163). They are product decisions, left for the owner. O97
blocks only how a phrase generated with carry-in may end, in v2.0; O98 and O99 block only the
v2.2 behaviour they name.

- **O97 - A session's last phrase ending with something owed** _(D80, D81, D157, D158; gaps 1
  and 2)_: inside a session a phrase may end just after a big leap (7 to 12 half steps), whose
  recovery (a move back the other way of 1 to 4 half steps) the next phrase starts with (D80), or
  on a tense note (one that clashes with the chord and wants to step onto a chord note), which the
  next phrase's first note resolves (D81). v1 never lets a phrase end either way. D81 kept v1's
  rule "where the music really stops", at Stop or the session's end, but the app cannot know which
  phrase will be the last: a session ends at any moment, usually mid-phrase. The same debt goes
  unsettled before the failure ladder's standalone phrase or a repeat, whose join is not smoothed
  (D157). Proposed, not confirmed by the owner: keep the carry-over, and accept that a session's
  last phrase, in the review and the export, may end with a recovery or a resolution still owed,
  as it may be cut off mid-phrase; the same holds before a standalone phrase or a repeat.
  Alternative: every session phrase ends as v1 requires, so any phrase is a clean place to stop
  and every seam is clean, at the cost of joins that sound more like one phrase stopping and the
  next starting. Either way, v1's atoms `rule_leap_recovery` and `rule_open_phrase_ending` need a
  v2 scope once this is settled.
  [master-spec.md §3](versions/v2/master-spec.md#3-the-generation-unit-and-how-phrases-join).
- **O98 - How the multi-phrase tension arc runs, and its default** _(D99, D110; v2.2; gap 8)_: the
  tension-arc setting (Settled, Lift, Build, Edge) decides how much melodic tension (a note that
  clashes with the chord before settling onto a chord note) a phrase has and where. D110 makes the
  longer arc a visible toggle; how it moves tension across phrases, and whether the toggle starts
  on or off, are undecided. Proposed, not confirmed by the owner: the arc repeats every four
  phrases (16 measures), counted from phrase 1: the first phrase of each group is generated with
  the chosen tension arc (so phrase 1, generated at Idle, already fits), the second one step
  tenser, the third as chosen, the fourth one step calmer, in the order Settled, Lift, Build,
  Edge, with no step past either end. The setting keeps showing the player's choice. The toggle
  starts off. Its interaction with the settings-mutation flag (O77), which may change the tension
  arc itself, follows: the arc steps around whatever value is in effect.
  [master-spec.md §3](versions/v2/master-spec.md#3-the-generation-unit-and-how-phrases-join).
- **O99 - Adaptive tempo when the controller is lost, and its default** _(D101, D114; v2.2; gap
  9)_: adaptive tempo is available only with a controller attached, but a controller lost
  mid-session may come back within 30 seconds (D114). Does the rise carry on meanwhile, and does
  the flag start on or off? Proposed, not confirmed by the owner: the rise carries on its schedule,
  since it never depends on what or whether the player plays (D101), so a reconnected player may
  find the tempo up to 15 BPM higher at a fast tempo; a session started while the selected
  controller is away (D126) has no controller, so adaptive tempo does not run in it. Alternative:
  pause the rise while the controller is away. Adaptive tempo starts off when the page loads, and
  the player's choice is kept between sessions for as long as the page stays open.
  [master-spec.md §10](versions/v2/master-spec.md#10-adaptive-tempo).
