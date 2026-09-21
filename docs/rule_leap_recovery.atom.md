---
id: rule_leap_recovery
status: DRAFT
human_name: Leap Recovery
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
type: RULE
version: 0.1
priority: 2
tags: melody,leaps,playability
dependents: []
---

# Leap Recovery

## INTENT
Make larger melodic leaps recover in a playable, directional way.

## THE RULE / LOGIC
After a large leap or a recognized same-direction chord-tone run, recovery is an opposite-direction step of 1-2 semitones or short contrary motion of 3-4 semitones. A recognized arpeggio is a coherent 2-3-note same-direction chord-tone run under one harmony; an unrecognized chain of two same-direction leaps is invalid. The planner reserves enough active range for the selected contour and required recovery before accepting an outward leap.

## TECHNICAL INTERFACE
Leapiness and register controls constrain melodic interval selection.

## EXPECTATION
A phrase with a large leap or recognized arpeggio run contains the required recovery. It contains no unrecognized chain of two same-direction leaps, and selected contour remains feasible after every accepted outward leap.
