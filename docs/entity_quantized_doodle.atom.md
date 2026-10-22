---
id: entity_quantized_doodle
status: DRAFT
type: ENTITY
version: 0.1
priority: 1
human_name: The Quantized Doodle
tags: [v3, release-v3.2, jam]
layer: ARCHITECTURE
parents:
  - [[rule_doodle_is_one_line]]
  - [[rule_doodle_quantized_to_sixteenths]]
  - [[rule_quantized_doodle_is_generation_input]]
dependents:
  - [[module_doodle_quantizer]]
---

# The Quantized Doodle

## INTENT
Hold a Jam's doodle, once quantized, as one immutable, validated value that every later step reads: the controls taken from it, the steering block, the key and mode suggestion, the kept session, the review and the exports.

## THE RULE / LOGIC
The quantized doodle is its own type, not a ConcertEventTimeline, which always spans four measures. It spans one to four measures. Each note is a start and a length, both whole numbers of ticks (sixteenth notes) counted from the start of the doodle's first measure, and a concert pitch. Notes are sorted by start and never overlap, every note lies inside the doodle's measures and lasts at least one tick, so a doodle holds at most 64 notes (one line over four measures of sixteen ticks). A validating constructor refuses anything else (zero or five measures, an overlap, a note outside its measures, a 65th note), and a parser reads the same shape from untrusted input with the same checks; the kept-session codec and Jam's code reuse that parser rather than a schema of their own. The tempo the doodle was captured at is kept beside the quantized doodle, never inside it, so it can never reach a generation request.

## TECHNICAL INTERFACE
src/domain/doodle/quantized-doodle.ts (new; not built yet): the quantized doodle type, its validating constructor and its parser. Tests: tests/unit/domain/doodle/quantized-doodle.spec.ts.

## EXPECTATION
- The constructor refuses zero or five measures, an overlap, a note outside its measures and a 65th note.
- The parser round-trips every valid doodle and refuses what the constructor refuses.
- No quantized doodle holds a tempo.
