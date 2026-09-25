---
id: rule_tension_arc_edge
status: DRAFT
human_name: Tension Arc: Edge
priority: 1
tags: tension,melody,harmony,controls
parents:
  - [[req_four_measure_phrase]]
type: RULE
layer: BUSINESS
version: 0.1
dependents:
  - [[module_harmony_candidate_domain]]
---

# Tension Arc: Edge

## INTENT
Apply the Edge tension arc as the most active schedule of diatonic instability, placing the greatest permitted instability in measure 3.

## THE RULE / LOGIC
Under the Edge tension arc, the phrase places the greatest amount of permitted instability in measure 3 and resolves it using the latest valid local resolution.

## TECHNICAL INTERFACE
The tension-arc control selects Edge as one of its four permitted values.

## EXPECTATION
A phrase using the Edge tension arc concentrates its greatest permitted instability in measure 3 and resolves it at the latest valid local resolution point.
