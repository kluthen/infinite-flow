# v3.3 — Richer Chords: UI/UX Design

Status: **approved, not yet built.** Approved by the owner at the build plan's gate D0 on
2026-11-09, this folder is the v3.3 design as approved, frozen the same day, before it is built,
as v3.0's and v3.1's designs were. It is never edited again, except to correct it to match what
v3.3 actually ships (each such correction is recorded in the root `decisions.md`, and the same
correction is applied at the root). A correction v3.2's release gate makes to
[`versions/v3.2/`](../v3.2/README.md) is applied here too, since this copy holds v3.2's text
whole. The product scope is Part D of
[`specs/versions/v3/master-spec.md`](../../../specs/versions/v3/master-spec.md#part-d--v33). The
v3.2 design it extends is in [`versions/v3.2/`](../v3.2/README.md).

This copy is every tier document at the root as approved, nothing left out and nothing
reworded. Link paths were adjusted to this folder.

The documents keep their marks, in four layers. A `[v3 new]` or `[v3 changed]` tag, and each
document's unprefixed **Changes since v2** items, show what v3.0 changed from v2; a `[v3.1 new]`
or `[v3.1 changed]` tag, and the change-block items prefixed `_v3.1 new:_`, `_v3.1 changed:_` or
`_v3.1 removed:_`, what v3.1 changed from v3.0; a `[v3.2 new]` or `[v3.2 changed]` tag, and the
items prefixed `_v3.2 new:_` or `_v3.2 changed:_`, what v3.2 changed from v3.1; a `[v3.3 new]` or
`[v3.3 changed]` tag, and the items prefixed `_v3.3 new:_` or `_v3.3 changed:_`, what v3.3 changes
from v3.2. Every v3.3 change is its own tagged paragraph, item or annotation, so the earlier
releases' text stays whole; v3.3 removes nothing. Removed wording from earlier releases is in
[`versions/v3.0/`](../v3.0/README.md) and [`versions/v3.1/`](../v3.1/README.md).
`grep -rn "v3\(\.[123]\)\? \(new\|changed\)"` finds every mark.

v3.3 adds no token, class or motion, so there is no token-source document for it: its one
control and its chord symbols reuse the classes in `src/styles/components.css` and
`src/styles/theme.css`, whose shipped state, once v3.3 ships, is its release tag's.

## What v3.3 is

A chord can now be a seventh chord: the plain three-note chord with one more note stacked on top,
the richer sound of jazz. One level, **Seventh chords**, sets how often, in the backing, the chord
symbols and the melody's landing notes alike. Session mode and Jam mode each have their own. The
chord symbols get longer (`Cmaj7`, `Dm7`, `G7`, `Bm7♭5`), and the score's spoken description names
the new chords in words.

## The decisions worth keeping, and why

- **One level for the family, beside Harmonic motion.** A level, not a switch, because styles
  differ in how often they use sevenths; one level, not one per kind, because in a key and mode
  each kind sits on fixed chords. It sits with Harmonic motion, where a player looking at a chord
  symbol would look for its cause, not among the figures that decorate the melody.
  ([strategy, Trade-offs](strategy.md#trade-offs),
  [phrase-workspace intent](screens/phrase-workspace/intent.md#seventh-chords))
- **Labels for what the player hears: Off, Sometimes, Often, Always.** The figure levels' look,
  with "Often" meaning the same rank in both; "Always" says what the top step plays, every chord a
  seventh chord, as the build's first measurements showed (approved as "Mostly", corrected before
  the control was built). What is saved and sent names the spec's level, never the label.
  ([phrase-workspace intent](screens/phrase-workspace/intent.md#seventh-chords),
  [phrase-workspace handoff](screens/phrase-workspace/handoff.md#components-and-content))
- **A preference, never a promise.** A phrase with fewer seventh chords than the level suggests is
  never reported; the note under the control explains the term by example and says so.
  ([strategy, Edge-Case Policy](strategy.md#edge-case-policy))
- **The presets sound as before.** Every built-in holds the level at Off; Jazz, Bebop and Modal
  (Dorian) suggest raising it in their description instead.
  ([presets intent](flows/presets/intent.md#choosing-a-preset))
- **Seventh chords are only ever the player's choice.** Vary settings never moves the level, and
  its note says so; a session holds the level from start to end.
  ([play-session intent](flows/play-session/intent.md#the-session-workspace))
- **Jam mode has its own level.** A player who wants jazzier chords in a Jam leaves session mode as
  it was; with a doodle kept, changing it rewrites phrase 1 from the doodle at once and keeps the
  doodle. ([jam intent](flows/jam/intent.md#jams-settings))
- **The symbols are letters on one line, never shrunk.** A raised, smaller suffix would fall under
  the legibility floor first; the longest symbol must fit twice in a measure at every supported
  width, phones included, and a calibration failure comes back to the design rather than shrinking
  a symbol. ([strategy, Engraving Policy](strategy.md#engraving-policy),
  [phrase-workspace handoff](screens/phrase-workspace/handoff.md#notation-contract))
- **The spoken words name the chord, not the symbol**: "G dominant seventh", "B half-diminished
  seventh", as the lexicon names the qualities.
  ([phrase-workspace intent](screens/phrase-workspace/intent.md#seventh-chords))
