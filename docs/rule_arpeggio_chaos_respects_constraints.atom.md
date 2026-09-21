---
id: rule_arpeggio_chaos_respects_constraints
status: DRAFT
version: 0.1
priority: 2
tags: arpeggio,control,constraints
parents:
  - [[req_four_measure_phrase]]
layer: BUSINESS
dependents: []
human_name: Arpeggio Chaos Respects Constraints
type: RULE
---

# Arpeggio Chaos Respects Constraints

## INTENT
Constrain arpeggio chaos to variations that preserve phrase safety and musical direction.

## THE RULE / LOGIC
Arpeggio chaos ranges from predictable nearby chord-tone order to reordered chord tones with stronger interval contrast. It cannot select pitches outside the selected profile or bypass contour, range, or resolution constraints.

## TECHNICAL INTERFACE
The arpeggio-chaos control influences chord-tone ordering and interval contrast during generation.

## EXPECTATION
Changing arpeggio chaos never causes a phrase to violate its active profile, contour, range, or resolution constraint.
