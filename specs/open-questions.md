# Open Questions

Status: draft v0.35

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

Open on 2026-10-07: O47, O48 and O49 (later and governance), O86 (favorites, v3), O100–O103 (v3
rhythm candidates), O107–O111 (v3 pre-generation at Idle) and O112–O116 (v3 Jam). None of
them blocks anything planned.

## Later and governance (O47–O49)

Registered from the v2 highlights proposal and
[prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions) on
2026-09-25.

- **O47 - Ornament representation** _(v2/v3 embellishment, endgame)_: is a trill or mordent an expanded event figure, or a notated symbol with playback expansion?
- **O48 - Import normalization** _(v4 file seed)_: for non-4/4 meters, tuplets, pickups and polyphony: reject, normalize, or lift the policy?
- **O49 - ATD atom lifecycle** _(v2 onward)_: amend the first-release atoms in place, or scope them to v1 and add v2 atoms beside them?

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

## v3 pre-generation at Idle (O107+)

Opened 2026-10-07 by `spec-writer` while recording the owner's v3 candidate of pre-generating up
to 4 look-ahead phrases at Idle, before Start (D206; recorded in
[v3](versions/v3/README.md#pre-generating-phrases-at-idle-candidate-not-committed)). It is a
candidate, not committed scope, so none of these blocks anything planned. The proposals are
`spec-writer`'s strawmen, not decisions. Section numbers (§) are those of the
[v2 master spec](versions/v2/master-spec.md).

- **O107 - How many, and whether the session keeps them ahead** _(D206; v3 candidate)_: "no more
  than 4": always up to 4, or only as many as the tempo needs? Are they only generated at Idle and
  spent by the session, which then goes back to looking one phrase ahead, or does the session keep
  topping them up? Proposed: up to 4, at Idle only, spent by the session. Topping up during a
  session would change v2's one-phrase look-ahead (§4) and where a setting change lands at
  a phrase boundary (§5), so it would be a decision of its own.
- **O108 - Changes before Start** _(D206; v3 candidate)_: what happens to the pre-generated
  phrases when, before Start, the player changes a generation setting, switches profile,
  regenerates phrase 1 by hand, or the window changes size, which can change the note density
  phrases are generated with (§6) and the staff layout a session holds from Start (§4)? Proposed:
  anything that replaces phrase 1 or changes a setting a phrase is generated from discards every
  pre-generated phrase and starts again from phrase 1; a change to the window's size re-checks
  them against the layout the session would hold, and one that no longer fits is discarded with
  every phrase after it.
- **O109 - Pre-generation and the prewarm** _(D206; v3 candidate)_: v2's prewarm
  (`module_generation_prewarm`) warms the generator's rhythm memo on the one generation worker
  and produces no phrase. Does pre-generation follow the prewarm, replace it, or make it
  unneeded? On that one worker, a regeneration at Idle must not wait behind a pre-generated phrase:
  is the background attempt cancelled, as a dropped attempt is in a session? And is background
  work at Idle acceptable on a tablet on battery? Proposed: pre-generation runs after the prewarm
  on the same worker, and any request the player makes at Idle cancels it.
- **O110 - The starting note and when a session can start** _(D206; v3 candidate)_: phrase 1 is
  the phrase on screen and its first note is the starting note (§6), so pre-generation chains from
  phrase 1 and never changes the starting note. But no session starts while a new phrase is being
  generated (§6): does a background pre-generation count? Does it run while the review shows, or
  only once the player is back at Idle? Proposed: it does not count, Start never waits for it, and
  the session takes whatever is ready and generates the rest under its deadlines as v2 does; it
  runs only at Idle, with a phrase 1 on screen that a session could start from.
- **O111 - What only a session decides** _(D206; v3 candidate)_: the settings-mutation flag, the
  multi-phrase tension arc, the session's note-density step-down and the seeds a session draws all
  shape phrases 2 onward. Must a pre-generated phrase be the phrase the session would have
  generated at that place, the same request and seed, so a session's phrases do not depend on
  whether pre-generation ran, only on which attempts succeeded in time? Proposed: yes.

## v3 Jam (O112+)

Opened 2026-10-07 while recording the owner's Jam insight (D209; recorded in
[v3](versions/v3/README.md#jam-growing-the-players-doodle)). The core is v3 scope; the questions
below are about it and its three candidates, so none of them blocks anything planned. Proposals
are strawmen, not decisions.

- **O112 - What the doodle is** _(D209; v3)_: how the player gives it (played at Idle, during a
  session, a fixed number of bars, or until they stop), how long it may be, and whether the first
  generated phrase repeats it or only continues it. Proposed: played at Idle, one or two measures,
  continued rather than repeated.
- **O113 - The key and mode suggestion** _(D209; v3 candidate)_: suggest only, or also an "auto"
  setting? How many different notes or measures before a suggestion is allowed? Does it work in
  written or concert pitch, given that the controller sends concert pitch and the key is chosen in
  written pitch (D56)? What happens to a doodle whose notes fit none of the app's modes (blue
  notes, harmonic minor): the closest fit, or nothing? Proposed: suggest only; nothing below five
  different pitch classes; computed in written pitch after the instrument's transposition; nothing
  when no mode fits.
- **O114 - Jam and the rhythm controls** _(D209, D175; v3 candidate)_: is the doodle's rhythm what
  the rhythm lock holds, and does that settle part of O102 and O103? Is "how far phrases drift
  from the doodle" the mutation flag, a new setting, or the rhythm ratios? Proposed: design Jam and
  the rhythm candidates together.
- **O115 - Which signals count as approval** _(D209; v3 candidate)_: which positive signals are
  read (a fitting departure as defined by the chord-fit check, a repeated fragment, a return to
  the doodle, a favorite), over what span, and what each one changes in generation. Proposed:
  positive signals only, favorites weighted most, each change small and reversible.
- **O116 - Taste, difficulty and visibility** _(D209, D101; v3 candidate)_: how misses, late
  notes and silence adjust difficulty without ever counting against taste; whether this is where
  the performance-linked tempo deferred by D101 lands; how the player turns learning on, sees what
  it leans toward, and resets it; whether what it learned is kept across sessions (local
  persistence, opt-in like played notes). Proposed: off by default, one visible switch, a reset,
  and nothing kept across sessions without the player's opt-in.
