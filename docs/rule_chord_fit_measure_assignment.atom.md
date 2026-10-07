---
id: rule_chord_fit_measure_assignment
status: DRAFT
human_name: Chord-Fit Measure Assignment
tags: [v3, nice-to-have, dropped-in-v3, acknowledgement, midi, harmony]
layer: BUSINESS
priority: 1
parents:
  - [[req_chord_fit_acknowledgement]]
dependents: []
type: RULE
version: 0.2
notes: Dropped by the v3 scope (2026-10-07, v3.0 spec ingestion): the approved v3 scope drops the end-of-measure chord-fit check, so this nice-to-have is no longer a candidate for any v3 release. Not deleted yet: the vision as it stands (STABLE) still names it as a v3 nice-to-have, so its retirement is proposed together with the vision revision in docs/release/v3.0-intent-change-set.md. No code or test links it.
---

# Chord-Fit Measure Assignment

## INTENT
Assign every played note to exactly one measure, judged against the chord sounding when it was played.

## THE RULE / LOGIC
Which measure a played note belongs to is decided by rounding its latency-compensated onset to the nearest sixteenth-note grid position, not by a fixed time window, which would misclassify the app's own fast notes into the wrong measure above roughly 160 BPM. A note sustained or tied across a barline counts only in the measure where it was originally attacked. The unit of judgement is the whole measure, never split into half-bars, even for a measure that holds two different chords; each note is judged against whichever chord is actually sounding at that note's own onset.

Not committed scope: like the chord-fit acknowledgement it belongs to, this rule is part of a nice-to-have for v3, not of v2, recorded for when that acknowledgement is scheduled.

## TECHNICAL INTERFACE
Played-note onsets are snapped to the sixteenth-note grid for measure assignment only.

## EXPECTATION
- Every played note belongs to the measure of its sixteenth-grid-rounded onset, and only to the measure where it was attacked.
- Each note is judged against the chord sounding at its own onset, the measure being judged as a whole.
