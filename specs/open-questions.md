# Open Questions

Status: draft v0.54

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

Open on 2026-10-12: O48 and O49 (later and governance), O100–O102 (v4 rhythm ratios and editor),
O115 and O116 (v3.x learning), and O176 (style packs and the chord level, below). D228–D234 closed O10 (for v3.2), O103, O114, O126 and every
question the v3.1 and v3.2 drafts opened (O127–O157, O160–O162); D257 and D258 closed O163 and
O164 the day they were opened. None blocks the v3.0 build.

Opened on 2026-10-12 with v3.3 (D261): O165–O175, richer chords. D262 closed O174 the same day.
D264–D273 settled the rest the same day in master spec Part D, as proposed for the owner's
approval with Part D; O175's precedence question goes on as O176.

## Later and governance (O47–O49)

Registered from the v2 highlights proposal and
[prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions) on
2026-09-25.

- **O48 - Import normalization** _(v4 file seed)_: for non-4/4 meters, tuplets, pickups and polyphony: reject, normalize, or lift the policy?
- **O49 - ATD atom lifecycle** _(v2 onward)_: amend the first-release atoms in place, or scope them to v1 and add v2 atoms beside them?

## v3 rhythm candidates (O100+)

Since D211, the rhythm ratios and the rhythm editor, with the Custom note density, are v4: O100,
O101 and O102 are v4 questions. The rhythm lock is v3.2, designed with Jam; O103 was closed by D232. The
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

## v3 Jam (O112+)

Opened 2026-10-07 while recording the owner's Jam insight (D209; recorded in
[v3](versions/v3/README.md#jam-growing-the-players-doodle)). The core is v3 scope; the questions
below are about it and its three candidates, so none of them blocks anything planned. Proposals
are strawmen, not decisions. Only the v3.x learning questions remain; the Jam ones were settled
by D234.

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

## v3.0 owner rulings (O163+)

Opened 2026-10-09 by `spec-writer` while writing the owner's rulings after the v3.0 wave-1 intent
preflight (D253–D256) into master spec v1.5. Both questions were answered by the owner the same
day: O163 (my instrument's transposition: where the sign sits, one control or two) by D257, and
O164 (the session-wide record's other facts) by D258. None is open here.

## v3.3 richer chords (O165+)

Opened 2026-10-12 while recording the owner's request for richer chords as v3.3 (D261; recorded
in [v3](versions/v3/README.md#v33--richer-chords-optional)). D262 closed O174 (the research is a
separate item). The chord research ([docs/music/chord-research.md](../docs/music/chord-research.md))
recommended an answer to each other question, and on 2026-10-12 spec-writer adopted them, settling
the research's open points itself, in [master spec Part D](versions/v3/master-spec.md#part-d--v33),
**proposed for the owner's approval with Part D**: O165 by D264 (one Seventh chords level, Off by
default), O166 by D265 (diatonic only), O167 by D266 (runs stay three notes), O168 by D267 (the
seventh a chord tone; endings read the triad until a listening check), O169 by D268 (a seeded
preference per event; the cost guard), O170 by D269 (symbols, exports, the backing plays the
seventh), O171 by D270 (presets, saved settings, Vary settings never moves the level, `ifk5.`),
O172 by D271 (Jam and the suggestion unchanged), O173 by D272 (the STABLE wording changes listed
for the owner) and O175's shape by D273. Their full text is in this register's history in git;
the answers are in the [decisions log](decisions.md). If the owner amends Part D, the decision
amended is revised, and no question comes back unless the owner reopens it.

- **O176 - Style packs and the chord level: which wins** _(D273, from O175; with style packs, no
  version)_: when a later style pack sets the `seventh-chords` capability as data and the player's
  Seventh chords level says otherwise, which applies, and how the player sees it? Not needed
  before style packs (D259, on branch `v4-accompaniment-research`, not merged). Proposed: decided
  with style packs.
