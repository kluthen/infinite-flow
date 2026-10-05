---
id: rule_tension_arc_lift
status: REVIEW
dependents:
  - [[module_harmony_candidate_domain]]
human_name: Tension Arc: Lift
type: RULE
priority: 1
version: 0.1
tags: tension,melody,harmony,controls
parents:
  - [[req_four_measure_phrase]]
layer: BUSINESS
---

# Tension Arc: Lift

## INTENT
Apply the Lift tension arc, and its status as the default tension arc, as a small amount of permitted diatonic activity in the phrase's middle measures.

## THE RULE / LOGIC
Under the Lift tension arc, the phrase permits a small amount of active diatonic motion in measures 2 and 3, with one resolution deferred to the following beat or bar. Lift is the tension arc applied when no tension arc is explicitly selected.

## TECHNICAL INTERFACE
The tension-arc control selects Lift as one of its four permitted values, and Lift is the control's default value.

## EXPECTATION
A phrase using the Lift tension arc, whether explicitly selected or left at the default, confines its permitted active diatonic motion to measures 2 and 3 and defers at most one resolution to the following beat or bar.
