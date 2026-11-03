---
id: rule_jam_rhythm_ordered_by_doodle
status: DRAFT
dependents:
  - [[module_rhythm_steering]]
  - [[module_steering_block_builder]]
layer: BUSINESS
priority: 1
type: RULE
version: 0.3
human_name: A Jam's Rhythms Are Ordered by the Doodle
tags: [v3, release-v3.2, session, jam, rhythm]
parents:
  - [[req_jam]]
---

# A Jam's Rhythms Are Ordered by the Doodle

## INTENT
Give the phrases a rhythm close to the doodle's while they keep varying.

## THE RULE / LOGIC
Rhythm candidates are ordered by their distance to the steering block's target rhythm, ahead of the seeded order. The target rhythm is built from the doodle's note starts and rest starts: a note start where each note starts, and a rest start where each of its rests starts, a silence holding a rest only where a whole rest of the doodle's note density value fits in it, from the first such grid point, so a short silence between two notes is part of the note before it and starts nothing. A candidate is compared with it as heard: a rest written right after another rest starts nothing. The doodle's measures are laid over the phrase in order and repeated to fill its four measures: a one-measure doodle four times, two measures twice, three as measures 1, 2, 3, 1, and four as they are. Candidates whose every measure lies within the drift position's band come first, in seeded order, so phrases still vary; then the rest, closest first by their total number of edits over the four measures, then in seeded order. This orders the rhythms tried with each chord plan, which the search still walks as it does without a doodle: a candidate in the band comes first among the rhythms tried with the chord plan the search is on. With Jam's rhythm lock on, phrase 1 takes the rhythm nearest the doodle whatever the band: the nearest one that makes a phrase with the first chord plan any rhythm makes one with.

## TECHNICAL INTERFACE
Rhythm candidates are ranked by drift band, then total edits from the target rhythm, then seed, within the rhythms tried with each chord plan.

## EXPECTATION
- Among the rhythms tried with one chord plan, every rhythm inside the drift band is tried before any rhythm outside it.
- Outside the band, fewer total edits come first.
- A candidate that writes one of the doodle's silences as two rests is at no edit from it.
- A silence too short to hold a whole rest of the doodle's note density value starts nothing in the target rhythm.
- With Jam's rhythm lock on, phrase 1 takes the rhythm nearest the doodle among those that make a phrase with the first chord plan any rhythm makes one with, whatever the band.
