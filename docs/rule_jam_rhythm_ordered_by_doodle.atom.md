---
id: rule_jam_rhythm_ordered_by_doodle
status: DRAFT
dependents: []
layer: BUSINESS
priority: 1
type: RULE
version: 0.1
human_name: A Jam's Rhythms Are Ordered by the Doodle
tags: [v3, release-v3.2, session, jam, rhythm]
parents:
  - [[req_jam]]
---

# A Jam's Rhythms Are Ordered by the Doodle

## INTENT
Give the phrases a rhythm close to the doodle's while they keep varying.

## THE RULE / LOGIC
Rhythm candidates are ordered by their distance to the doodle's rhythm, ahead of the seeded order. The doodle's measures are laid over the phrase in order and repeated to fill its four measures: a one-measure doodle four times, two measures twice, three as measures 1, 2, 3, 1, and four as they are. Candidates whose every measure lies within the drift position's band come first, in seeded order, so phrases still vary; then the rest, closest first by their total number of edits over the four measures, then in seeded order. A doodle far from everything the settings allow is only approached.

## TECHNICAL INTERFACE
Rhythm candidates are ranked by drift band, then total edits, then seed.

## EXPECTATION
- Every rhythm inside the drift band is tried before any rhythm outside it.
- Outside the band, fewer total edits come first.
