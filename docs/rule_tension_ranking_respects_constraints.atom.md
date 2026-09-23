---
id: rule_tension_ranking_respects_constraints
status: DRAFT
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_harmony_candidate_domain]]
human_name: Tension Ranking Respects Constraints
version: 0.1
type: RULE
layer: BUSINESS
priority: 1
tags: tension,constraints,determinism
---

# Tension Ranking Respects Constraints

## INTENT
Prevent tension selection from overriding higher-priority phrase constraints.

## THE RULE / LOGIC
Tension ranks only legal candidates. Candidate selection prioritizes hard feasibility and cadence policy; profile, tonal collection, range, and contour; density and silence budgets; syncopation onset plan; leapiness and arpeggio-chaos candidates; tension ranking; then the seeded deterministic tie-break. Tension cannot add onsets, remove rests, change register, exceed leap limits, or turn syncopation into a monotonic tension control.

## TECHNICAL INTERFACE
Tension arc ranks candidates after higher-priority generation constraints have filtered them.

## EXPECTATION
Changing tension arc never violates hard feasibility, cadence, profile, tonal, range, contour, density, silence, syncopation, leapiness, arpeggio-chaos, or deterministic seed policy.
