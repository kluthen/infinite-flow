# Open Questions

Status: draft v0.11

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
same day (D126).

### Registered from the v2 proposal and the prerequisites analysis (2026-09-25)

The original proposal is archived: [v2 highlights proposal](archive/v2/highlights-proposal.md) and
[prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions). O32 and
O33 were resolved on 2026-09-26 (D73, D72). O10 was resolved 2026-09-27 (D83). O36, O40 and O43
were resolved 2026-09-27 (D94, D95, D96).

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
  controller's BLE MIDI to Chromium, and its measured jitter.
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
  part collides with §7's rule that starting a new session asks for confirmation when the review
  holds unexported favorites: a confirmation needs a click, which a MIDI start doesn't give.
  Proposed default for the second part: from the Review, only a Start click starts a session; a
  MIDI note starts nothing there. The first part has no proposed default yet: it depends on what
  the Review screen shows besides the review, which `ux-writer` designs. Not confirmed by the
  owner.
  [master-spec.md §6](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo).
