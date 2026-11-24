---
id: rule_responding_part_shapes
status: DRAFT
version: 0.2
priority: 1
human_name: A Fill Takes One of Five Shapes
parents:
  - [[req_responding_part]]
layer: BUSINESS
tags: [v4, release-v4.0, session, audio, accompaniment]
dependents: []
type: RULE
---

# A Fill Takes One of Five Shapes

## INTENT
Vary the answers while keeping each one simple.

## THE RULE / LOGIC
Each fill takes one of five shapes, drawn for that fill from the phrase's seed: a rising arpeggio or a falling arpeggio, on the tones of the chord sounding at each note; a rising scale or a falling scale, by steps of the phrase's scale; or a turn around the target: a step above, the target, a step below, the target. Every shape is four notes long and is built backwards from the target. A fill with room for fewer than four notes plays the shape's last notes, so it always ends on the target.

## TECHNICAL INTERFACE
The shape is the responding part's only random choice.

## EXPECTATION
- Every fill follows one of the five shapes, each four notes long.
- Each fill ends on its target, its earlier notes built backwards from it.
- A fill with room for fewer than four notes plays its shape's last notes.
