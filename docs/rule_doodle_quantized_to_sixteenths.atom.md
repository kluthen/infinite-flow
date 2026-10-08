---
id: rule_doodle_quantized_to_sixteenths
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
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
The doodle is quantized: the start and end of each note snap to the nearest sixteenth note (a quarter of a beat), at every tempo, and a note keeps at least one sixteenth. At 240 BPM a sixteenth lasts 62.5 ms, so a start moves by at most about 31 ms; the doodle only steers the order of candidates, so a near miss costs little. The quantized doodle is computed once, when the doodle ends, with whole-number arithmetic, and holds each note's start and length in sixteenths and its concert pitch; every later step reads it. The tempo it was played at is kept beside it, for the review and the exports; generation never reads it, so tempo still never affects what is generated.

## TECHNICAL INTERFACE
The quantized doodle is a list of notes with start and length in sixteenths and a concert pitch, plus its capture tempo.

## EXPECTATION
- Every quantized note starts and ends on a sixteenth-note boundary and lasts at least one sixteenth.
- The capture tempo never changes what is generated.
