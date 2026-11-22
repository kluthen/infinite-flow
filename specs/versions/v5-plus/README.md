# v5+ — Library and Seeds

Status: direction (2026-09-25). These are far placements: "maybe v5 material", and microphone
"v5 or 8". A cross-device review candidate was added 2026-09-28 (D128), placed no earlier than
v6. A staff-only session view was placed in v5 2026-09-28 (D133). On 2026-11-22 v4's items other
than Tone.js and accompaniment with roles moved here (D553), microphone input was ruled out in any
version (D554), and the lexicon API moved to v3.4 (D555). The owner expects v5+ to move to the
game's app most probably: "Note that v5+ will probably be moved to the game app instead of here,
we will have to review this later" (D553, a direction, not ruled;
[O314](../../open-questions.md#after-v34-the-split-and-this-apps-horizon-o313)).

## Settled direction

- **Library (around v5).**
  - External files and past sessions are displayed alike.
  - The player selects a snippet and hands it over as a continuation seed.
- **"Not a DAW" boundary.**
  - Selecting a snippet is allowed **only as a way to create a seed**.
  - Editing, cutting and splicing, arranging and multitrack are out of scope. The app must not
    become "too professional".
- **Staff-only session view (v5).** Placed here 2026-09-28 (D133, from ux D72).
  - The idea: while a session runs, hide everything but the staff and Stop.
  - v2 does not have it. The v2 session layout keeps only session material on and near the
    staff, and v2's audio mix stays reachable throughout a session
    ([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session)).
  - To settle when it is specced: hiding the mix goes against that "reachable at all times"
    rule, so the rule has to be revisited for this view. Not designed here; `ux-writer` owns the
    view itself.

## Moved from v4 (D553)

The owner, 2026-11-22: "ok move rhythm ratio and editors, etc to v5", the "etc" confirmed the
same day. Recorded as they stood in [v4](../v4/README.md#moved-to-v5-d553):

- **Whole-file seed** (placed in v4 as a proposal until D553).
  - A complete MusicXML or MIDI file can be fed in as a continuation seed.
  - The whole file is used: there is no preview, cutting or editing. Infinite Flow is not a DAW.
  - The user said it "shouldn't be too difficult" but gave no version.
- **Rhythm ratios and the rhythm editor** _(moved from v3 to v4 by D211, from v4 to v5 by D553;
  recorded 2026-10-03, D175)_.
  - **Rhythm ratios:** the player sets how likely each note value is to appear, from the whole
    note down to the sixteenth note.
  - **Rhythm editor:** copy the rhythm of one of the bars, or enter a rhythm by hand.
  - Both are reached through a new note-density value, **Custom** (working name). A mutation can
    never move note density into Custom; while Custom is set, a mutation may alter the ratios.
  - The rhythm lock recorded with them stays in v3.2, with Jam
    ([v3](../v3/README.md#rhythm-lock-and-mutation)). Their full record is in
    [v3](../v3/README.md#moved-to-v4-rhythm-ratios-and-the-rhythm-editor).
  - Open: O100, O101, O102 ([register](../../open-questions.md#v3-rhythm-candidates-o100)).
- **Wider rhythm mutation options** _(owner, 2026-10-08, D232; v5 since D553)_. v3.2's rhythm
  lock is "a good first iteration on mutations": a short list of small, one-phrase rhythm
  changes. This widens it, for example to changes that stay (a rhythm that evolves), the
  catalogue's larger mutations (augmentation, diminution, metric displacement, regrouping) and
  mutations under the rhythm editor's own rhythm. See the
  [mutation catalogue](../../../docs/music/mutation-catalogue.md).

## Out of scope: microphone input (D554)

The owner, 2026-11-22: "microphone input is still out whichever the version." It is not planned
for any version. What was placed here until then ("v5 or 8"), kept as the record:

- Acoustic pitch detection as an input kind, alongside MIDI.
- It would have plugged into v3's "my instrument" input-kind setting.
- It stayed far out because browser-side detection adds latency and uncertainty.

## Moved to v3.4: the lexicon API (D555)

Planned for v4 or v5 until 2026-11-22 (D395); now step two of v3.4's
[lexicon page](../v3/lexicon-page.md#9-step-two-the-lexicon-api-d555).

## Candidates (not committed)

- **Cross-device review by export, then import (no earlier than v6).** Recorded 2026-09-28
  (D128, from ux D64).
  - The case: a player plays on the phone and wants a real review on a larger screen. They
    export the session, import it on another device, and it reopens for review.
  - The owner's words: "a maybe, but not prior v6", and "mostly composer stuff". It serves P3's
    C1, reviewing a session ([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)).
  - No version plans it today. The whole-file seed feeds a continuation, not a review.
  - Two things to settle if it is ever specced, noted here without a design:
    - **What an export carries.** A v2 export holds less than a review shows. The played notes
      travel only as their own MIDI file, when the player picks them as the export's content
      (D129); MusicXML and the generated-notes MIDI file never hold them. No file holds the
      phrases' reproduction inputs
      ([v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy)).
    - **Overlap with the library above.** The library already displays past sessions alongside
      external files.

## Depends on

- v3's persistence and earlier-session review.
- v3's continuation from outside material, for the whole-file seed.
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
