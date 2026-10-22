---
id: module_doodle_quantizer
status: DRAFT
type: MODULE
layer: ARCHITECTURE
version: 0.2
priority: 1
parents:
  - [[entity_quantized_doodle]]
  - [[rule_doodle_capture_start]]
  - [[rule_doodle_is_one_line]]
  - [[rule_doodle_quantized_to_sixteenths]]
  - [[rule_stray_notes_filtered_on_reading]]
dependents: []
human_name: The Doodle Quantizer
tags: [v3, release-v3.2, jam, midi]
---

# The Doodle Quantizer

## INTENT
Turn a capture's raw notes into the quantized doodle, once, with whole-number arithmetic, so the same notes always give the same doodle.

## THE RULE / LOGIC
A pure function inside Jam's code. It takes the raw notes as played, on the audio clock, the grid origin (the first beat after the count-in), the capture tempo, a whole number of BPM, and the barline at which the capture ended the doodle, and returns a quantized doodle; the capture decides where the doodle ends, and the quantizer only applies that end. It applies the very-short-note filter first, so a very short note never starts, extends or shapes the doodle. Each time is converted once to whole microseconds; everything after that conversion is integer arithmetic. Each start and end snaps to the nearest tick by integer division, a tie going to the later tick; a note keeps at least one tick. Overlapping notes are cut: the later start ends the earlier note. Two notes snapped onto one tick keep the longer, then the higher. Notes snapped before the grid origin are dropped, as count-in notes. Notes starting at or after the doodle's end barline are dropped, and a note past it is cut at it. The doodle starts at the measure holding its first note, rests included. A capture left with no doodle note, or spanning more than four measures, is refused. Two helpers serve the capture: one gives the grid tick nearest a time on the audio clock, by the same snapping, and one the doodle measure a snapped start falls in, for the capture's end rule. Nothing outside Jam's code imports the quantizer.

## TECHNICAL INTERFACE
src/jam/doodle-quantizer.ts: `quantizeDoodle(capture)`, the capture a `DoodleCapture` (`{ gridOriginAt, tempoBpm, notes, endMeasure }`: the grid, a `DoodleGrid`, the raw notes, each a `RawDoodleNote` with its onset, release and concert pitch, and `endMeasure`, the grid measure index of the end barline, exclusive), reusing withoutVeryShortNotes (src/domain/played-notes/stray-notes.ts) and returning the quantized doodle of src/domain/doodle/quantized-doodle.ts; `snappedTickOf(at, grid)`, the nearest grid tick, negative in the count-in; and `doodleMeasureOf(snappedStart)`. The import boundary is an ESLint rule in eslint.config.js, which refuses an import of the quantizer anywhere in src/ outside src/jam/. Nothing calls the quantizer yet: Jam's capture does when it is built. Tests: tests/unit/jam/doodle-quantizer.spec.ts and tests/unit/boundaries/eslint-boundaries.spec.ts.

## EXPECTATION
- A fixed list of raw notes quantizes identically on every run.
- No floating-point operation follows the one conversion to microseconds.
- A note played a little early onto the first beat after the count-in is the doodle's first note; one that snaps before it is dropped.
- Overlaps, chords and notes colliding on one tick reduce to one line, the longer and then the higher kept.
- No note starts at or after the end barline the capture gives, and none extends past it.
- A very short note never starts, extends or shapes the doodle.
- Only Jam's code imports the quantizer.
