# Open Questions

Status: draft v0.47

Only questions that are truly open appear here. IDs are stable. Each question's full text lives in
exactly one place: here, or in the document named. When a question is resolved it leaves this
register and its answer goes to the [decisions log](decisions.md). Resolved questions from earlier
work are recorded in the archived logs:
[D1–D46](archive/v1/decisions-D1-D46.md),
[D47–D71](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md),
[D72–D108](archive/v2/decisions-D72-D108.md) and
[D109–D207](archive/v2/decisions-D109-D207.md). The notes this register kept on the questions
closed during v2 (O24, O50–O99 and O104–O106, apart from O86) are archived verbatim in
[archive/v2/open-questions-history.md](archive/v2/open-questions-history.md), and the
[v2 archive index](archive/v2/README.md) says where each answer now lives.

Open on 2026-10-07, after the owner's overall review of v3 (D216): O10 (planner authority, for
Jam), O48 and O49 (later and governance), O100–O102 (v4 rhythm ratios and editor), O103 (the rest
of the v3.2 rhythm lock), O114 (Jam and the rhythm controls), O115 and O116 (v3.x learning). O126 closed by D228. None
of them blocks anything planned.

## Later and governance (O47–O49)

Registered from the v2 highlights proposal and
[prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions) on
2026-09-25.

- **O48 - Import normalization** _(v4 file seed)_: for non-4/4 meters, tuplets, pickups and polyphony: reject, normalize, or lift the policy?
- **O49 - ATD atom lifecycle** _(v2 onward)_: amend the first-release atoms in place, or scope them to v1 and add v2 atoms beside them?

## v3 rhythm candidates (O100+)

Since D211, the rhythm ratios and the rhythm editor, with the Custom note density, are v4: O100,
O101 and O102 are v4 questions. The rhythm lock is v3.2, designed with Jam: O103 stays v3. The
section keeps its name so its links hold.

Opened 2026-10-03 by `spec-writer` while recording the owner's v3 candidates in the rhythm
category (D175): rhythm ratios, the rhythm editor and the rhythm lock, all reached through a new
note-density value, Custom. They are candidates, not committed scope, so none of these blocks
anything planned. Lexicon terms: [note density](../docs/music/lexicon.md#note-density),
[rhythmic variety](../docs/music/lexicon.md#rhythmic-variety),
[syncopation](../docs/music/lexicon.md#syncopation-1),
[silence density](../docs/music/lexicon.md#silence-density),
[unsupported rhythm combination](../docs/music/lexicon.md#unsupported-rhythm-combination).

- **O100 - Custom and the other rhythm settings** _(D175; v4 since D211)_: under Custom, do
  rhythmic variety, syncopation and silence density still apply on top of the custom rhythm,
  apply only to the ratios, or step aside? Which combinations does the rhythm grammar block under
  Custom, since the blocked list is keyed today by a note-density value? And does the narrow-window
  rule (no `Sixteenth` below the tablet-landscape width, D146) cap the sixteenth-note ratio there?
- **O101 - What the rhythm ratios hold, and what a mutation does to them** _(D175, D176; v4
  since D211)_: which note values get a ratio (whole, half, quarter, eighth and sixteenth notes;
  dotted values; rests, or are rests silence density's job), and how finely a ratio is set? What
  is one step of a mutation on the ratios, by analogy with "one grade" (D103)? And can a mutation
  move note density out of Custom, back to a fixed value (D175 only forbids moving into it)?
- **O102 - The rhythm editor's source and limits** _(D175; v4 since D211)_: "one of the bars" of
  which phrase, the one on screen at Idle or one in the last session's review? Is a rhythm one
  bar long, reused for all four bars, or four bars long? Must a rhythm entered by hand or copied
  pass the rhythm grammar's feasibility rules (every measure keeps a note sounding on beat 1 or
  3, no fully silent measure, no rest longer than half a measure), and if it does not, is it
  refused, adjusted, or allowed as the player's own choice?
- **O103 - What the rhythm lock holds, and how far it bends** _(D175, D176, D211, D216; v3.2)_:
  **partly answered by D216:** the lock holds the note starts on beats 1 and 3 and the number of
  notes in each measure; a bend is one Close mutation, or one Near mutation in one measure,
  dropped at the next phrase; the bend is the same mechanism as a mutation's. Still open: whether
  a bend is shown, and whether the lock can hold the doodle's own rhythm (O114). Original question: is
  "this rhythm" the editor's rhythm only, or whatever rhythm is in effect when the lock is set,
  including one drawn from the ratios? What is "a little bending" for tension and release: how
  often, how far from the locked rhythm, always returning to it, and is a bend shown? With the
  mutation flag on, is a mutation's temporary bend the same thing as generation's own bend, or a
  separate one?

## v3 Jam (O112+)

- **O10 - Planner authority** _(reopened for v3; D83)_: can a later planner stage revise an
  earlier one without recoupling the stages? D83 settled it for v2 only: carry-in flows forward,
  and no stage of a new phrase revises anything generated for an earlier one; the question itself
  was deferred to v3. Jam brings it back: a doodle's rhythm, contour and intervals would reach
  several stages at once. Grounding: [jam-grounding.md](versions/v3/jam-grounding.md).

Opened 2026-10-07 while recording the owner's Jam insight (D209; recorded in
[v3](versions/v3/README.md#jam-growing-the-players-doodle)). The core is v3 scope; the questions
below are about it and its three candidates, so none of them blocks anything planned. Proposals
are strawmen, not decisions.

- **O114 - Jam and the rhythm controls** _(D209, D175, D211; v3.2)_: is the doodle's rhythm what
  the rhythm lock holds, and does that settle part of O103? Is "how far phrases drift from the
  doodle" the mutation option (O118) or a new setting? Proposed: design Jam and the rhythm lock
  together, as D211 places them. (Since D211 the rhythm ratios and the editor, and with them
  O102, are v4.)
- **O115 - Which signals count as approval** _(D209; v3.x, likely to move or go, D211)_: which positive signals are
  read (a fitting departure as defined by the chord-fit check — dropped by D211, so this signal would
  need that definition back — a repeated fragment, a return to
  the doodle, a favorite), over what span, and what each one changes in generation. Proposed:
  positive signals only, favorites weighted most, each change small and reversible.
- **O116 - Taste, difficulty and visibility** _(D209, D101; v3.x, likely to move or go, D211)_: how misses, late
  notes and silence adjust difficulty without ever counting against taste; whether this is where
  the performance-linked tempo deferred by D101 lands; how the player turns learning on, sees what
  it leans toward, and resets it; whether what it learned is kept across sessions (local
  persistence, opt-in like played notes). Proposed: off by default, one visible switch, a reset,
  and nothing kept across sessions without the player's opt-in.
