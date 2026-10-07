# Open Questions

Status: draft v0.44

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

Open on 2026-10-07: O10 (planner authority, reopened for v3 Jam), O47, O48 and O49 (later and
governance), O86 (favorites, v3.0), O100–O102
(v4 rhythm ratios and editor) and O103 (v3.2 rhythm lock), O107–O111 (v3.0 pre-generation at
Idle), O112–O116 and O125 (v3.2 Jam; O115–O116 v3.x learning), O118 and O121 (v3 release plan) and O122–O124 (v3.0 storage). Release
placements follow D211 and D212. None of them blocks anything planned.

## Later and governance (O47–O49)

Registered from the v2 highlights proposal and
[prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions) on
2026-09-25.

- **O47 - Ornament representation** _(v2/v3 embellishment, endgame)_: is a trill or mordent an expanded event figure, or a notated symbol with playback expansion? The [embellishment catalogue](../docs/music/embellishment-catalogue.md) (2026-10-07) leans toward a notated symbol, with only the main note checked for acknowledgement; ornaments are v3.1's larger piece (D210).
- **O48 - Import normalization** _(v4 file seed)_: for non-4/4 meters, tuplets, pickups and polyphony: reject, normalize, or lift the policy?
- **O49 - ATD atom lifecycle** _(v2 onward)_: amend the first-release atoms in place, or scope them to v1 and add v2 atoms beside them?

## Favorites, deferred to v3 (O86)

- **O86 - What makes a favorite "exported"** _(v3.0; D88, D129, D130; noticed by `spec-writer`
  while recording D129)_: v2's spec used to ask for confirmation before starting a new session
  when the review held unexported favorites. With the export split by scope and by content, a
  favorite could leave the app in part: its played notes only, or inside a whole-session export.
  Does that count as exported? Since D130 v2 has no favorites and asks no confirmation, so this
  is not a v2 question. The owner: "leave this as open question for later". It is settled with
  favorites in v3, and may change shape there, since v3 adds local persistence. Earlier proposed
  default, not confirmed: a favorite counts as exported once any export that included its phrase
  has been triggered, whatever the scope and content.
  [v3 favorites](versions/v3/README.md#favorites). **Recommended (2026-10-07, for the owner's
  overall review): close as moot.** In the v3.0 draft, marking a favorite pins its session, so
  starting a new session loses nothing and needs no confirmation
  ([kept-sessions.md](versions/v3/kept-sessions.md) §4).

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
- **O103 - What the rhythm lock holds, and how far it bends** _(D175, D176, D211; v3.2)_: is
  "this rhythm" the editor's rhythm only, or whatever rhythm is in effect when the lock is set,
  including one drawn from the ratios? What is "a little bending" for tension and release: how
  often, how far from the locked rhythm, always returning to it, and is a bend shown? With the
  mutation flag on, is a mutation's temporary bend the same thing as generation's own bend, or a
  separate one?

## v3 pre-generation at Idle (O107+)

Since D211 and D212 this is v3.0 scope. The proposals below are carried as recommendations in
[pre-generation.md](versions/v3/pre-generation.md), for the owner's overall review.

Opened 2026-10-07 by `spec-writer` while recording the owner's v3 candidate of pre-generating up
to 4 look-ahead phrases at Idle, before Start (D206; recorded in
[v3](versions/v3/README.md#pre-generating-phrases-at-idle)). It is a
candidate, not committed scope, so none of these blocks anything planned. The proposals are
`spec-writer`'s strawmen, not decisions. Section numbers (§) are those of the
[v2 master spec](versions/v2/master-spec.md).

- **O107 - How many, and whether the session keeps them ahead** _(D206; v3.0 since D211, D212)_: "no more
  than 4": always up to 4, or only as many as the tempo needs? Are they only generated at Idle and
  spent by the session, which then goes back to looking one phrase ahead, or does the session keep
  topping them up? Proposed: up to 4, at Idle only, spent by the session. Topping up during a
  session would change v2's one-phrase look-ahead (§4) and where a setting change lands at
  a phrase boundary (§5), so it would be a decision of its own.
- **O108 - Changes before Start** _(D206; v3.0 since D211, D212)_: what happens to the pre-generated
  phrases when, before Start, the player changes a generation setting, switches profile,
  regenerates phrase 1 by hand, or the window changes size, which can change the note density
  phrases are generated with (§6) and the staff layout a session holds from Start (§4)? Proposed:
  anything that replaces phrase 1 or changes a setting a phrase is generated from discards every
  pre-generated phrase and starts again from phrase 1; a change to the window's size re-checks
  them against the layout the session would hold, and one that no longer fits is discarded with
  every phrase after it.
- **O109 - Pre-generation and the prewarm** _(D206; v3.0 since D211, D212)_: v2's prewarm
  (`module_generation_prewarm`) warms the generator's rhythm memo on the one generation worker
  and produces no phrase. Does pre-generation follow the prewarm, replace it, or make it
  unneeded? On that one worker, a regeneration at Idle must not wait behind a pre-generated phrase:
  is the background attempt cancelled, as a dropped attempt is in a session? And is background
  work at Idle acceptable on a tablet on battery? Proposed: pre-generation runs after the prewarm
  on the same worker, and any request the player makes at Idle cancels it.
- **O110 - The starting note and when a session can start** _(D206; v3.0 since D211, D212)_: phrase 1 is
  the phrase on screen and its first note is the starting note (§6), so pre-generation chains from
  phrase 1 and never changes the starting note. But no session starts while a new phrase is being
  generated (§6): does a background pre-generation count? Does it run while the review shows, or
  only once the player is back at Idle? Proposed: it does not count, Start never waits for it, and
  the session takes whatever is ready and generates the rest under its deadlines as v2 does; it
  runs only at Idle, with a phrase 1 on screen that a session could start from.
- **O111 - What only a session decides** _(D206; v3.0 since D211, D212)_: the settings-mutation flag, the
  multi-phrase tension arc, the session's note-density step-down and the seeds a session draws all
  shape phrases 2 onward. Must a pre-generated phrase be the phrase the session would have
  generated at that place, the same request and seed, so a session's phrases do not depend on
  whether pre-generation ran, only on which attempts succeeded in time? Proposed: yes.

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

- **O112 - What the doodle is** _(D209; v3.2)_: how the player gives it (played at Idle, during a
  session, a fixed number of bars, or until they stop), how long it may be, and whether the first
  generated phrase repeats it or only continues it. **Partly answered by D215:** the doodle ends on
  a silent measure or after four measures of notes, and at least one measure passes before the
  first generated phrase sounds. Still open: (1) where it is played (proposed: at Idle, over a
  pulse at the chosen tempo, since a silent measure needs a measure grid; v2's Idle has none;
  the tempo itself is O125);
  (2) whether the silent measure that ends a doodle is also the generation measure, or a further
  measure follows (proposed: the silent measure doubles as it; generation starts speculatively
  when a measure begins with no note sounding, and if the player plays again inside that measure
  the attempt is dropped and the doodle goes on); (3) what happens when a phrase is not ready
  after the measure at fast tempos, where one measure at 240 BPM is 1 s (proposed: the wait
  extends measure by measure with the pulse going on, and v2's standalone fallback applies);
  (4) repeated or only continued (proposed: continued). A "now generate the follow-up" played
  signal (D213, D214) would be another way to end a doodle, but played signals are v3.x at best;
  the played-pattern research recommends natural markers such as a pause or a fixed length, which
  D215 adopts.
- **O125 - The Jam tempo** _(v3.2; raised by the owner 2026-10-07)_: at what tempo is the doodle
  played, and the phrases that follow it? It decides the measure grid D215 needs (the silent
  measure, the four measures, the one measure of generation time) and how played notes are
  turned into written rhythm. Options: (a) the player plays over the app's pulse at the tempo
  already selected, so the tempo is known and the notes are snapped to the app's sixteenth-note
  grid; (b) the player sets the tempo first by tapping it or by playing a few beats, then plays
  over the pulse; (c) the player plays freely and the app works out the tempo and where the
  measures fall from the doodle itself (tempo estimation: hard on a short single line, and a
  tempo twice or half as fast often fits as well, which a dice cannot settle as harmlessly as a
  key). Recommended (for the owner's overall review): (a) for v3.2, the phrases after the doodle
  keep that tempo; (c) is a later candidate that needs its own research.
- **O113 - The key and mode suggestion** _(D209, D212; v3.2)_: suggest only, or also an "auto"
  setting? How many different notes or measures before a suggestion is allowed? Does it work in
  written or concert pitch, given that the controller sends concert pitch and the key is chosen in
  written pitch (D56)? What happens to a doodle whose notes fit none of the app's modes (blue
  notes, harmonic minor): the closest fit, or nothing? Proposed: suggest only; nothing below five
  different pitch classes; computed in written pitch after the instrument's transposition; nothing
  when no mode fits. **Amended by D212:** when several answers fit, the app no longer stays
  silent: it rates them and makes a seeded weighted draw among the most probable (the owner's
  "cast a dice"). Still open: how many candidates enter the draw, and whether the player still
  confirms the drawn answer (proposed: yes, D209 keeps the player's key and mode
  authoritative). **Research done** ([key and mode estimation](../docs/music/key-and-mode-estimation.md));
  **recommended (for the owner's overall review):** suggest only, the player confirms; at least 5
  different pitch classes, 6 notes and 2 beats of sounding time after the stray-note filter; at
  most 3 candidates within half of the best enter a seeded draw computed in integers; nothing is
  suggested when the selected key and mode is among those candidates (the player wins close
  calls); nothing either when under 80 % of the doodle's weighted length fits the winner (a scale
  the app does not offer, such as harmonic minor or blues); computed in concert pitch, named in
  written pitch (the same answer as written pitch, one conversion fewer).
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

## v3 release plan (O117+)

Opened 2026-10-07 by `spec-writer` while recording the owner's release plan for v3 (D211;
recorded in [v3](versions/v3/README.md#releases-d211)). Proposals are strawmen, not decisions.
O117 and O119 were closed the same day by D212, O120 by D213.

- **O118 - The list of allowed mutations** _(D211; v3.2)_: the owner's words, "rhythm
  lock/mutation option (with a list of allowed mutations)". Is the list (a) which settings v2's
  settings-mutation flag may change, chosen by the player (today it is every setting but the
  instrument and tempo, v2 master spec §5), or (b) which kinds of rhythm change are allowed while
  the rhythm lock holds (for example splitting a note in two, joining two, adding a rest, moving a
  note by a sixteenth)? D212: the owner wants a researched catalogue of mutations, like the embellishment catalogue,
  before deciding. **Research done:** [mutation catalogue](../docs/music/mutation-catalogue.md)
  (18 rhythm mutations, 13 motif-development transformations, a 0–4 drift-distance scale).
  **Recommended (spec-writer, for the owner's overall review):** keep both readings, apart.
  (a) Vary settings gets a player-chosen allowed list, offered as six groups of its settings, not
  thirteen switches. (b) Under Jam, a **drift** control with three or four positions, each allowing
  every mutation of the catalogue up to its distance, closest first; the rhythm lock's bends use
  the same Close list. **Constraint found:** a restricted allowed list can leave no legal move
  (e.g. `Eighth`, `Strict`, `Sparse`, active displacement, with only note density allowed), and
  `drawMutation` in `src/session/settings-mutation.ts` then throws; v2 can't reach that state
  today. A restricted list must be checked for a legal move before it is accepted, since v2's rule
  is that a mutation cycle is never silently skipped.
- **O121 - Vary settings and "the app never switches key or mode"** _(D209, found by the mutation
  research; v3.0 onward)_: D209 says the app never switches the key or mode on its own, but v2's
  Vary settings flag, when the player turns it on, steps the key around the circle of fifths and
  the mode by brightness during a session (v2 master spec §5). Recommended (spec-writer, for the
  owner's overall review): D209's rule governs the key and mode suggestion only; Vary settings is
  the player's own opt-in, keeps mutating key and mode as v2 built it, and everything reverts at
  session end. With (a) of O118, a player who wants a fixed key under Vary settings removes that
  group.

## v3.0 storage (O122+)

Opened 2026-10-07 by `spec-writer` while drafting the v3.0 documents from the
[storage grounding](versions/v3/storage-grounding.md). Each carries a recommendation for the
owner's overall review (D212).

- **O122 - The check's action and remembering the controller** _(v3.0; D79, D190, D211)_: (1)
  should the transposition check offer "use this for my instrument", which sets my instrument's
  transposition to match the controller after one confirmation? It is D79's settled direction,
  but it overlaps "switch profile from the check" (D190), which D211 dropped. (2) Should the app
  remember the last chosen controller and reselect it at load? That changes the STABLE contract
  atom `rule_same_controller_reattaches` (MAJOR contract version, owner's explicit confirmation).
  Recommended: yes to both. [my-instrument.md](versions/v3/my-instrument.md) §3–§4.
- **O123 - Ranges the generator struggles with** _(v3.0)_: a player-set range must span at least
  two octaves (the code's floor today), but only the three built-in ranges have been tested
  against the generator's feasibility. Should a range at the floor, or in an unusual place, be
  checked by a trial generation before it is accepted? Recommended: accept any range the code's
  rules allow, and measure the generator's success rate on narrow and extreme ranges before the
  v3.0 gate. [my-instrument.md](versions/v3/my-instrument.md) §2.
- **O124 - A full backup file** _(v3.0 or later)_: a file holding everything the app keeps, to
  move it to another browser or restore it; it needs an app-specific format, since the MusicXML
  and MIDI exports are one-way. Recommended: not v3.0; a candidate.
  [persistence.md](versions/v3/persistence.md) §7.
