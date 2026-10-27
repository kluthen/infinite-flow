---
id: module_steering_block_builder
status: DRAFT
type: MODULE
priority: 1
human_name: Building the Steering Block From the Doodle
dependents: []
layer: ARCHITECTURE
version: 0.1
tags: [v3, release-v3.2, jam, generation, rhythm, melody]
parents:
  - [[entity_steering_block]]
  - [[rule_jam_drift_positions]]
  - [[rule_jam_melody_follows_doodle_moves]]
  - [[rule_jam_rhythm_ordered_by_doodle]]
  - [[rule_jam_steering_block]]
---

# Building the Steering Block From the Doodle

## INTENT
Turn a quantized doodle and the drift into the one steering block a Jam's requests carry, so the generator receives plain data and never the doodle, the drift or Jam.

## THE RULE / LOGIC
A pure function inside Jam's code, run when a doodle ends and for a kept doodle, in whole numbers only.

The target rhythm lays the doodle's measures over a phrase's four: a one-measure doodle four times, two measures twice, three as measures 1, 2, 3, 1, and four as they are. Each doodle measure is written as its starts as heard, in sixteenths from the measure's start: a note start where each note starts; a rest start where a silence begins, that is where a note ends and no note starts; a rest start at 0 when the measure opens in silence, a silence crossing the barline included, since a rest is never tied; no start for a note held across the barline, so a measure may hold none; and never two rest starts in a row.

The drift gives the band and the move strength: Close the close band with size and direction, Near the near band with direction only, Free the unbounded band with no strength.

The moves are the doodle's own, between neighbouring notes, in the doodle's order: up, down or the same note, an up or down move sized a step (1 or 2 half steps), a skip (3 or 4) or a leap (5 or more).

The block holds no pitch and nothing else of the doodle, the drift or the tempo. How a short silence between two doodle notes (a detached note) is read is not decided yet: under the starts above it is a rest start, and this part of the module follows the decision. Not built yet.

## TECHNICAL INTERFACE
src/jam/steering-block-builder.ts, pure, inside Jam's code (module_jam_code_boundary). It takes the quantized doodle (QuantizedDoodle, src/domain/doodle/quantized-doodle.ts) and Jam's drift, and returns a SteeringBlock built with makeSteeringBlock (src/domain/generation/steering-block.ts, entity_steering_block), so every block it builds passes the checks the generation worker applies: band `close`, `near` or `unbounded`, strength `size-and-direction`, `direction` or `none`. Jam's path to phrase 1 calls it when the doodle ends, and Jam's kept doodle when it is used again. Not built yet.

## EXPECTATION
- A doodle of one, two, three or four measures gives the four-measure overlay stated.
- A doodle measure's starts follow the definition: a rest start where a note ends and none starts; one at 0 for a measure opening in silence, a silence crossing the barline included; none for a note held across the barline; never two rest starts in a row.
- Close, Near and Free give their band and strength.
- The moves follow the doodle's order and sizes; the block holds no pitch.
