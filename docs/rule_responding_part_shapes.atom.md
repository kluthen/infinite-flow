---
id: rule_responding_part_shapes
status: DRAFT
version: 0.3
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
Each fill takes one of five shapes, drawn for that fill from the phrase's seed: a rising arpeggio or a falling arpeggio, on the tones of the chord sounding at each note; a rising scale or a falling scale, by steps of the phrase's scale; or a turn around the target: a scale step above, the target, a scale step below, the target. Every shape is four notes long and is built backwards from the target. A fill with room for fewer than four notes plays the shape's last notes, so it always ends on the target. The shapes are drawn one per lead rest of a beat or longer, in the rests' order, each before its fill is built, so a fill that comes out empty still takes its draw.

## TECHNICAL INTERFACE
The shape is the responding part's only random choice, drawn from a named stream of the phrase's seed kept for the fill shapes alone.

## EXPECTATION
- Every fill follows one of the five shapes, each four notes long.
- Each fill ends on its target, its earlier notes built backwards from it.
- A fill with room for fewer than four notes plays its shape's last notes.
- Each rest of a beat or longer takes the same shape whether or not an earlier fill came out empty.
