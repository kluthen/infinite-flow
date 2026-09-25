---
id: rule_tension_arc_level_policy
status: DRAFT
priority: 1
tags: tension,melody,harmony,controls
human_name: Tension Arc Level Policy
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_harmony_candidate_domain]]
type: RULE
version: 0.1
---

# Tension Arc Level Policy

## INTENT
Apply the selected tension arc as a bounded schedule of diatonic instability and local resolution.

## THE RULE / LOGIC
The tension-arc control selects exactly one of four named schedules — Settled, Lift, Build, or Edge — each governing where diatonic instability may occur across the phrase and how promptly it must locally resolve. Lift is the schedule applied when no tension arc is explicitly selected. Rests may separate the members of a bound tension figure from its resolution target under every schedule, subject to that schedule's own resolution-delay bound.

## TECHNICAL INTERFACE
The tension-arc control selects Settled, Lift, Build, or Edge.

## EXPECTATION
A phrase applies only the instability and local-resolution timing permitted by its selected tension arc.
