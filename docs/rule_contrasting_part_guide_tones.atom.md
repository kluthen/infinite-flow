---
id: rule_contrasting_part_guide_tones
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: The Contrasting Part Plays One Guide Tone per Chord
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_contrasting_part]]
dependents: []
---

# The Contrasting Part Plays One Guide Tone per Chord

## INTENT
Let the counter-melody spell out each chord with its most telling notes.

## THE RULE / LOGIC
For each harmony event of the phrase (one span of one chord), the contrasting part plays one note in its lane: for a seventh chord, the chord's third or its seventh; for a triad, its third or its fifth.

## TECHNICAL INTERFACE
The candidates for each chord are read from the phrase's harmony.

## EXPECTATION
- Each harmony event gets at most one new contrasting note, and none only when no candidate can be placed.
- A seventh chord's note is its third or its seventh; a triad's is its third or its fifth.
