---
id: rule_acknowledgement_exact_pitch
status: REVIEW
human_name: Acknowledgement Requires the Exact Pitch
version: 0.1
tags: [v2, release-v2.0, midi, acknowledgement]
parents:
  - [[rule_expected_note_window]]
dependents:
  - [[rule_acknowledgement_highlights_expected_note_only]]
type: RULE
layer: BUSINESS
priority: 1
---

# Acknowledgement Requires the Exact Pitch

## INTENT
Acknowledge a played note only when it is exactly the written note, octave included.

## THE RULE / LOGIC
A played note acknowledges an expected note only if it matches that note's exact concert pitch, octave included. This is deliberately strict on octave, because acknowledgement is meant to train reading, including which octave is written, and the transposition check already catches a constant octave mismatch. Each expected note can be acknowledged at most once: a played note is matched to the earliest unacknowledged expected note whose window contains the played note and whose pitch matches. On a chord played on a keyboard, only the one note that matches the expectation is acknowledged; the extra notes are simply recorded, without penalty.

## TECHNICAL INTERFACE
Matching compares each played note's latency-compensated onset and concert pitch against open expected-note windows.

## EXPECTATION
- Only the exact expected concert pitch, octave included, played inside the note's window is ever acknowledged.
- No expected note is acknowledged twice; extra notes of a chord are recorded without penalty.
