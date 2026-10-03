# Open Questions

Status: draft v0.27

Only questions that are truly open appear here. IDs are stable. Each question's full text lives in
exactly one place: here, or in the document named. When a question is resolved it leaves this
register and its answer goes to the [decisions log](decisions.md). Resolved questions from earlier
work are recorded in the archived logs:
[D1–D46](archive/v1/decisions-D1-D46.md) and
[D47–D71](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md).

O24 was resolved 2026-09-27 (D108): the check is kept, ships in v2.3, and fires only on measures
where the player goes off-script. Six v2 questions (O78–O83) were opened the same day by the
controller-connection answers (D111–D118) and resolved later that day (D119–D124). O84 was opened
while recording them, and resolved 2026-09-30 (D169, from ux D137): a fresh phrase generated at
the session end is the next phrase 1. Its start from the Review was replaced the same day by the
owner (D170): no session starts while the Review shows; the player leaves it first. O85, opened while recording D125, was resolved the
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
2026-09-29 while correcting the gaps `documentalist` found in the v2 master spec (D157–D163). O97
was answered by the owner the same day (D167): the carry-over between phrases is kept, and a
session's last phrase may end with a leap recovery or a tense note's resolution still owed.
On 2026-10-03 the owner answered O77 (D176), O93 (D177) and O98 (D178) with their proposals, or
for O77 with a cadence of 2 to 4 phrases and the flag starting off, and O99 with its alternative
(D179): adaptive tempo pauses while the controller is away. The same day, O100–O103 were opened
by the v3 rhythm candidates (D175), and O104 by moving the real-hardware checks to v2.4 (D173);
O104 was answered the same day (D180).

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
resolved 2026-09-27 (D97). O24 was resolved 2026-09-27 (D108). O77 was resolved 2026-10-03
(D176).

- **O57 - Backing voicing and register** _(listening test, confirmed happening later)_: proposed
  default is bass in MIDI 36–47 and chords in close position with the top note at or below MIDI
  64 (E4), attacked per harmony event and per downbeat. Is that acceptable for v2.0, or should the
  chords sit higher or comp rhythmically? Note (2026-10-01, owner, after hearing the chunk 11
  backing in a session): the bass line is adequate. Still open: the chords' voicing and register,
  the attack pattern and the timbre. Idea for later, not decided: Tone.js, mainly to add more
  accompaniment voices (v2 synthesizes with raw Web Audio and bundles no audio library).
  [master-spec.md §6](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo).
- **O68 - Main-thread engraving vs audio scheduling** _(prototype needed)_: does engraving a
  phrase (VexFlow, main thread) ever block longer than the scheduler's look-ahead window (200 ms
  proposed)? The v2 prototype should measure the longest main-thread task during a session at 240
  BPM. Note (2026-10-03, D173): the final check on the reference machine is v2.0's former item
  15, which moved to the v2.4 real-hardware checks.
  [master-spec.md §6](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo).
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
and resolved the same day (D119–D124). O85 was resolved the same day too (D126). O84, the last
question of this section, was resolved 2026-09-30 (D169): `ux-writer` settled it as ux D137 under
the owner's delegation of unit 6 (ux D135); the owner replaced its start from the Review the same
day (D170, ux D143). No question of this section is open.

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
the owner's delegation of minor calls (ux D120 and ux D119, spec D155). O93 was resolved
2026-10-03 with its proposal (D177). No question of this section is open.

## v2 gaps from the atom ingestion (O97+)

Opened 2026-09-29 by `spec-writer` while correcting the gaps `documentalist` found when it drew
ATD atoms from master spec v1.18 (D157–D163). They are product decisions, left for the owner. O97
was answered by the owner on 2026-09-29 with its proposal (D167). On 2026-10-03 the owner
answered O98 with its proposal (D178) and O99 with its alternative (D179). No question of this
section is open.

## v2.4 real-hardware checks (O104)

O104 was opened 2026-10-03 while recording D173 and answered by the owner the same day with its
proposal (D180): the v2.1 gate's checks in a real DAW and on the reference machine move to v2.4
too. No question of this section is open.

## v3 rhythm candidates (O100+)

Opened 2026-10-03 by `spec-writer` while recording the owner's v3 candidates in the rhythm
category (D175): rhythm ratios, the rhythm editor and the rhythm lock, all reached through a new
note-density value, Custom. They are candidates, not committed scope, so none of these blocks
anything planned. Lexicon terms: [note density](../docs/music/lexicon.md#note-density),
[rhythmic variety](../docs/music/lexicon.md#rhythmic-variety),
[syncopation](../docs/music/lexicon.md#syncopation-1),
[silence density](../docs/music/lexicon.md#silence-density),
[unsupported rhythm combination](../docs/music/lexicon.md#unsupported-rhythm-combination).

- **O100 - Custom and the other rhythm settings** _(D175; v3 candidate)_: under Custom, do
  rhythmic variety, syncopation and silence density still apply on top of the custom rhythm,
  apply only to the ratios, or step aside? Which combinations does the rhythm grammar block under
  Custom, since the blocked list is keyed today by a note-density value? And does the narrow-window
  rule (no `Sixteenth` below the tablet-landscape width, D146) cap the sixteenth-note ratio there?
- **O101 - What the rhythm ratios hold, and what a mutation does to them** _(D175, D176; v3
  candidate)_: which note values get a ratio (whole, half, quarter, eighth and sixteenth notes;
  dotted values; rests, or are rests silence density's job), and how finely a ratio is set? What
  is one step of a mutation on the ratios, by analogy with "one grade" (D103)? And can a mutation
  move note density out of Custom, back to a fixed value (D175 only forbids moving into it)?
- **O102 - The rhythm editor's source and limits** _(D175; v3 candidate)_: "one of the bars" of
  which phrase, the one on screen at Idle or one in the last session's review? Is a rhythm one
  bar long, reused for all four bars, or four bars long? Must a rhythm entered by hand or copied
  pass the rhythm grammar's feasibility rules (every measure keeps a note sounding on beat 1 or
  3, no fully silent measure, no rest longer than half a measure), and if it does not, is it
  refused, adjusted, or allowed as the player's own choice?
- **O103 - What the rhythm lock holds, and how far it bends** _(D175, D176; v3 candidate)_: is
  "this rhythm" the editor's rhythm only, or whatever rhythm is in effect when the lock is set,
  including one drawn from the ratios? What is "a little bending" for tension and release: how
  often, how far from the locked rhythm, always returning to it, and is a bend shown? With the
  mutation flag on, is a mutation's temporary bend the same thing as generation's own bend, or a
  separate one?
