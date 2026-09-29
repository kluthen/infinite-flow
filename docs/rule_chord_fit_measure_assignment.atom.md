---
id: rule_chord_fit_measure_assignment
status: DRAFT
human_name: Chord-Fit Measure Assignment
tags: [v2, release-v2.3, acknowledgement, midi, harmony]
layer: BUSINESS
priority: 1
parents:
  - [[req_chord_fit_acknowledgement]]
dependents: []
type: RULE
version: 0.1
---

# Chord-Fit Measure Assignment

## INTENT
Assign every played note to exactly one measure, judged against the chord sounding when it was played.

## THE RULE / LOGIC
Which measure a played note belongs to is decided by rounding its latency-compensated onset to the nearest sixteenth-note grid position, not by a fixed time window, which would misclassify the app's own fast notes into the wrong measure above roughly 160 BPM. A note sustained or tied across a barline counts only in the measure where it was originally attacked. The unit of judgement is the whole measure, never split into half-bars, even for a measure that holds two different chords; each note is judged against whichever chord is actually sounding at that note's own onset.

## TECHNICAL INTERFACE
Played-note onsets are snapped to the sixteenth-note grid for measure assignment only.

## EXPECTATION
- Every played note belongs to the measure of its sixteenth-grid-rounded onset, and only to the measure where it was attacked.
- Each note is judged against the chord sounding at its own onset, the measure being judged as a whole.
