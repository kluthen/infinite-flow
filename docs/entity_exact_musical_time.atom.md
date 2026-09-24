---
id: entity_exact_musical_time
status: REVIEW
type: ENTITY
human_name: Exact Musical Time
tags: time-model
parents:
  - [[req_four_measure_phrase]]
  - [[rule_complete_four_four_measures]]
layer: ARCHITECTURE
version: 0.1
priority: 1
dependents:
  - [[entity_concert_event_timeline]]
---

# Exact Musical Time

## INTENT
Represent every generated duration and position as an exact value so four-measure phrase timing is never subject to floating-point drift.

## THE RULE / LOGIC
Durations and positions in a generated phrase are exact rationals expressed in whole-note units, stored as a normalized integer numerator and denominator reduced by their greatest common divisor, with no floating-point representation anywhere in the core time model. A sixteenth note is the rational 1/16, a 4/4 bar is the rational 1, and the four-measure phrase totals exactly 4. A separate integer sixteenth-note tick view (bar as the half-open interval [0,16), phrase as [0,64), bar starts at 0, 16, 32, 48) is derived from the rational value for consumers that need the documented tick grid; the core rational type itself does not require every duration to land on an integer sixteenth tick. First-release policy that forbids tuplets and sub-sixteenth durations is enforced by a separate grid validator that checks the derived tick view, not by restricting the rational type, so the representation does not foreclose tuplets or finer subdivisions in a later release.

## TECHNICAL INTERFACE
Rhythm, pitch, and orchestration code that needs a duration or position constructs or consumes the normalized rational value; code that needs the documented sixteenth-note grid derives the integer tick view from that rational rather than tracking ticks independently.

## EXPECTATION
Every duration and position in an accepted phrase is representable as a reduced integer-over-integer rational in whole-note units with no floating-point value anywhere in the core time model. The four-measure phrase always totals exactly 4 whole notes. The derived tick view always agrees with the documented bar/phrase tick grid (bar [0,16), phrase [0,64), bar starts 0/16/32/48). Grid-conformance failures (non-sixteenth-aligned durations, tuplets) are rejected by the separate grid validator, never by the rational type refusing to represent the value.
