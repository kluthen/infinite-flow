# Open Questions

Status: draft v0.49

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
Jam), O48 and O49 (later and governance), O100–O102 (v4 rhythm ratios and editor), O114 (Jam and the rhythm controls), O115 and O116 (v3.x learning). O126 closed by D228. Since then the v3.1 and v3.2 drafts opened
O127–O139, O161–O162 and O140–O157; D232 closed O103 and O151. None
of them blocks anything planned.

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
  the rhythm lock holds (yes, answered by D232: the rhythm nearest the doodle that the grammar can
  write)? Is "how far phrases drift from the
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

## v3.1 drafts (O127–O139, O161–O162)

Opened 2026-10-07 by the v3.1 drafts (D228–D231). Each question's full text and proposal lives in
its draft's Open section; IDs are listed here so none is lost. O160 was closed by D230.

- **O127 - Ornaments' release**: full text and proposal in [embellishment-flags.md](versions/v3/embellishment-flags.md#11-open).
- **O128 - The v3.1 figure set**: full text and proposal in [embellishment-flags.md](versions/v3/embellishment-flags.md#11-open).
- **O129 - What a level means**: full text and proposal in [embellishment-flags.md](versions/v3/embellishment-flags.md#11-open).
- **O130 - Levels against Tension's figure**: full text and proposal in [embellishment-flags.md](versions/v3/embellishment-flags.md#11-open).
- **O131 - Chromatic figures outside Jazz**: full text and proposal in [embellishment-flags.md](versions/v3/embellishment-flags.md#11-open).
- **O132 - The cost guard**: full text and proposal in [embellishment-flags.md](versions/v3/embellishment-flags.md#11-open).
- **O133 - The replay key for figure levels**: full text and proposal in [embellishment-flags.md](versions/v3/embellishment-flags.md#11-open).
- **O134 - Vary settings' style step**: full text and proposal in [embellishment-flags.md](versions/v3/embellishment-flags.md#11-open).
- **O135 - What a preset holds**: full text and proposal in [presets.md](versions/v3/presets.md#11-open).
- **O136 - The built-in list**: full text and proposal in [presets.md](versions/v3/presets.md#11-open).
- **O137 - Managing player presets**: full text and proposal in [presets.md](versions/v3/presets.md#11-open).
- **O138 - Custom and loading**: full text and proposal in [presets.md](versions/v3/presets.md#11-open).
- **O139 - What records a preset**: full text and proposal in [presets.md](versions/v3/presets.md#11-open).
- **O161 - How a restriction is written, and where choosing a preset moves the key and mode**: full text and proposal in [presets.md](versions/v3/presets.md#11-open).
- **O162 - The restriction under Custom, in Vary settings and when a player preset is saved**: full text and proposal in [presets.md](versions/v3/presets.md#11-open).

## v3.2 drafts (O140–O157)

Opened 2026-10-07 by the v3.2 drafts. Full text and proposals live in each draft's Open section.
The drafts also propose answers to O10 and O114 (above; O103 was closed by D232): [jam.md §6](versions/v3/jam.md#6-planner-authority-o10-proposed)
and [rhythm-lock.md](versions/v3/rhythm-lock.md).

- **O140 - How a Jam is entered**: full text and proposal in [jam.md](versions/v3/jam.md#11-open).
- **O141 - The measures before phrase 1**: full text and proposal in [jam.md](versions/v3/jam.md#11-open).
- **O142 - Quantising the doodle**: full text and proposal in [jam.md](versions/v3/jam.md#11-open).
- **O143 - Capture edge cases**: full text and proposal in [jam.md](versions/v3/jam.md#11-open).
- **O144 - The doodle's status (generation input or played notes)**: full text and proposal in [jam.md](versions/v3/jam.md#11-open).
- **O145 - What "matching" means in v3.2**: full text and proposal in [jam.md](versions/v3/jam.md#11-open).
- **O146 - Drift's positions and distance**: full text and proposal in [rhythm-lock.md](versions/v3/rhythm-lock.md#9-open).
- **O147 - A Jam's review and exports**: full text and proposal in [jam.md](versions/v3/jam.md#11-open).
- **O148 - Where the key and mode suggestion is shown**: full text and proposal in [key-and-mode-suggestion.md](versions/v3/key-and-mode-suggestion.md#7-open).
- **O149 - The draw's seed**: full text and proposal in [key-and-mode-suggestion.md](versions/v3/key-and-mode-suggestion.md#7-open).
- **O150 - Labels, priors and alternatives**: full text and proposal in [key-and-mode-suggestion.md](versions/v3/key-and-mode-suggestion.md#7-open).
- **O152 - When a phrase bends**: full text and proposal in [rhythm-lock.md](versions/v3/rhythm-lock.md#9-open).
- **O153 - The lock and the narrow-window step-down**: full text and proposal in [rhythm-lock.md](versions/v3/rhythm-lock.md#9-open).
- **O154 - The allowed list's dead ends and defaults**: full text and proposal in [rhythm-lock.md](versions/v3/rhythm-lock.md#9-open).
- **O155 - Sound during the capture**: full text and proposal in [jam.md](versions/v3/jam.md#11-open).
- **O156 - The replay key for v3.2**: full text and proposal in [jam.md](versions/v3/jam.md#11-open).
- **O157 - Allowed rhythm changes under the lock** _(v3.2; D232)_: which small edits the list
  offers in v3.2, its default (proposed: empty, a strict lock), and how often a change happens
  (proposed: at most one per phrase, in a seeded share of phrases, more often on a tenser phrase
  when Tension across phrases is on). Also whether a bend is shown (D232 keeps the draft's "not
  shown" as proposed).
