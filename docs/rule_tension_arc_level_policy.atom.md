---
id: rule_tension_arc_level_policy
status: DRAFT
priority: 1
tags: tension,melody,harmony,controls
human_name: Tension Arc Level Policy
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
dependents: []
type: RULE
version: 0.1
---

# Tension Arc Level Policy

## INTENT
Apply the selected tension arc as a bounded schedule of diatonic instability and local resolution.

## THE RULE / LOGIC
Settled prioritizes chord tones on metrically strong locations and resolves an active scale degree by the next strong onset. Lift permits a small amount of active diatonic motion in measures 2-3 and one resolution deferred to the following beat or bar. Build concentrates active notes and permits one limited two-note diatonic approach in the middle of the phrase. Edge places the greatest permitted instability in measure 3 and uses the latest valid local resolution. Lift is the default.

## TECHNICAL INTERFACE
The tension-arc control selects Settled, Lift, Build, or Edge.

## EXPECTATION
A phrase applies only the instability and local-resolution timing permitted by its selected tension arc.
