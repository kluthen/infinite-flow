---
id: rule_leapiness_interval_budget
status: DRAFT
priority: 1
parents:
  - [[req_four_measure_phrase]]
dependents: []
human_name: Leapiness Interval Budget
type: RULE
layer: BUSINESS
tags: melody,leapiness,intervals,hard-constraint
version: 0.1
---

# Leapiness Interval Budget

## INTENT
Limit adjacent sounding-note intervals and phrase leap budgets according to the selected leapiness.

## THE RULE / LOGIC
Leapiness measures intervals between adjacent sounding notes only, ignoring intervening rests. A step is 1-2 semitones, a skip 3-4, a leap 5-6, and a large leap 7-12; no interval exceeds an octave. Smooth permits intervals through 4 semitones and no leaps. Shaped permits intervals through 7 semitones, at most 2 leaps, and at most 1 large leap. Leaping permits intervals through 10 semitones, at most 4 leaps, and at most 2 large leaps. Angular permits intervals through 12 semitones, at most 6 leaps, and at most 3 large leaps. These limits are ceilings, not quotas.

## TECHNICAL INTERFACE
The leapiness control selects Smooth, Shaped, Leaping, or Angular.

## EXPECTATION
Every accepted phrase respects the selected interval cap and leap budget; intervening rests do not reset adjacent-sounding-note measurement.
