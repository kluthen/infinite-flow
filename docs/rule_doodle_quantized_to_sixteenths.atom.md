---
id: rule_doodle_quantized_to_sixteenths
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.2
parents:
  - [[req_jam]]
priority: 1
human_name: The Doodle Is Snapped to Sixteenth Notes
tags: [v3, release-v3.2, session, jam]
dependents:
  - [[rule_doodle_is_one_line]]
---

# The Doodle Is Snapped to Sixteenth Notes

## INTENT
Turn the doodle as played into a stable musical input the generator can compare rhythms with.

## THE RULE / LOGIC
The doodle is quantized: the start and end of each note snap to the nearest sixteenth note (a quarter of a beat), at every tempo, and a note keeps at least one sixteenth. At 180 BPM, the top of Jam's tempo range, a sixteenth lasts about 83 ms, so a start moves by at most about 42 ms; the doodle sets Jam's controls from its quantized form and then only steers the order of candidates, so a near miss costs little. The quantized doodle is computed once, when the doodle ends, with whole-number arithmetic, and holds each note's start and length in sixteenths and its concert pitch; every later step reads it: the controls read from it, the steering block, the key and mode suggestion, the review and the exports. The tempo it was played at is kept beside it, for the review and the exports; generation never reads it, so tempo still never affects what is generated.

## TECHNICAL INTERFACE
The quantized doodle is a list of notes with start and length in sixteenths and a concert pitch, plus its capture tempo.

## EXPECTATION
- Every quantized note starts and ends on a sixteenth-note boundary and lasts at least one sixteenth.
- The capture tempo never changes what is generated.
