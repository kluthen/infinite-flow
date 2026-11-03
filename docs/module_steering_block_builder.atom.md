---
id: module_steering_block_builder
status: DRAFT
type: MODULE
priority: 1
human_name: Building the Steering Block From the Doodle
dependents: []
layer: ARCHITECTURE
version: 0.2
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

The target rhythm lays the doodle's measures over a phrase's four: a one-measure doodle four times, two measures twice, three as measures 1, 2, 3, 1, and four as they are. Each doodle measure is written as its starts as heard, in sixteenths from the measure's start: a note start where each note starts, and a rest start where each of its rests starts. A silence, a stretch of the measure where no note sounds, holds a rest only where a whole rest of the doodle's note density value fits in it on that grid (4 sixteenths for Quarter, also when the doodle does not show a note density; 2 for Eighth; 1 for Sixteenth, one read below the tablet-landscape width included); the rest starts at the first such grid tick and lasts to the silence's end. A shorter silence, and the part of a silence before that tick, start nothing: they are part of the note before them. A silence crossing the barline starts again in the next measure, since a rest is never tied, so a measure opening in a silence that holds a rest there has a rest start at 0; a note held across the barline starts nothing in the next measure, which may then hold no start; and a measure never holds two rest starts in a row. The silence density reading counts the same rests, read by the same function.

The drift gives the band and the move strength: Close the close band with size and direction, Near the near band with direction only, Free the unbounded band with no strength.

The moves are the doodle's own, between neighbouring notes, in the doodle's order: up, down or the same note, an up or down move sized a step (1 or 2 half steps), a skip (3 or 4) or a leap (5 or more), read by the generator's own move reading, so both sides read a move alike.

The block holds no pitch and nothing else of the doodle, the drift or the tempo.

## TECHNICAL INTERFACE
src/jam/steering-block-builder.ts, pure, inside Jam's code (module_jam_code_boundary): `buildSteeringBlock(doodle, drift)` returns a SteeringBlock built with makeSteeringBlock (src/domain/generation/steering-block.ts, entity_steering_block), so every block it builds passes the checks the generation worker applies: band `close`, `near` or `unbounded`, strength `size-and-direction`, `direction` or `none`. Its parts: `doodleOverlay(measureCount)`, `doodleMeasureStarts(doodle, measureIndex)` (the rests from `doodleMeasureRests` in src/jam/doodle-rhythm-reading.ts, which the silence density reading counts too), `doodleMoves(doodle)` (each move by `melodicMoveBetween`, src/domain/generation/steering/pitch-steering.ts, module_pitch_steering) and `driftSteering(drift)`. Jam's drift is `JamDrift` (`JAM_DRIFTS`: Close, Near, Free), defined here. It takes the quantized doodle (QuantizedDoodle, src/domain/doodle/quantized-doodle.ts). Nothing in the app calls it yet: Jam's path to phrase 1 calls it when the doodle ends, and Jam's kept doodle when it is used again.

## EXPECTATION
- A doodle of one, two, three or four measures gives the four-measure overlay stated.
- A doodle measure's starts follow the definition: a rest start at the first grid tick of a silence holding a whole rest of the note density's value, under Quarter, Eighth and Sixteenth, and none in a shorter silence; one at 0 for a measure opening in a silence that holds a rest there, a silence crossing the barline included; none for a note held across the barline; never two rest starts in a row.
- Close, Near and Free give their band and strength.
- The moves follow the doodle's order and sizes; the block holds no pitch.
