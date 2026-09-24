---
id: module_pitch_planner
status: DRAFT
priority: 1
version: 1.0
layer: ARCHITECTURE
tags: pitch
parents:
  - [[entity_pitch_candidate_domain]]
dependents: []
human_name: Pitch Planner
type: MODULE
---

# Pitch Planner

## INTENT
Plan one complete immutable concert-pitch phrase from a fully bound planner input while enforcing the selected melodic obligations.

## THE RULE / LOGIC
The planner consumes the immutable bound input and performs depth-first candidate search without replacement. Its immutable planner state records the contour, interval, leap-recovery, and recognized-arpeggio obligations still required or already satisfied, so every extension is evaluated against the full selected policy. It uses seed-independent pitch enumeration; deterministic candidate ranking and tie keys derive from candidate identities. The planner neither resolves GenerationIntent nor Varying, selects harmony or rhythm candidates, changes a tension binding, mutates inputs, trusts unverified annotations, or calibrates numeric ceilings.

## TECHNICAL INTERFACE
Callers supply one immutable bound planner input and receive either an immutable candidate phrase for independent validation or a typed search outcome. The planner accepts no unresolved register intent, profile identity, browser/session state, mutable cross-run cache, wall-clock deadline, or diagnostics as an influence on candidate choice.

## EXPECTATION
A successful candidate satisfies the bound request range/window and every encoded contour, interval, recovery, and arpeggio obligation. Repeating the same bound input yields the same identity-derived ranked search behavior, and no candidate occurrence is retried within one search.
