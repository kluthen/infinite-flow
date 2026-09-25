---
id: module_pitch_planner
status: DRAFT
priority: 1
version: 1.1
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
Plan one complete immutable concert-pitch phrase for a bound planner input by depth-first search without replacement over its precompiled search context, in deterministically ranked candidate order.

## THE RULE / LOGIC
The planner compiles the bound input's static search context once, and fails immediately with no_legal_pitch_plan if the compiled context's contour plan is impossible (including the zero-attack, all-rest case) before search starts. It orders each attack's candidate domain once per distinct (attack, required tie-key midi, prior midi) combination -- required midi and prior midi are fixed by a chaos/seed/tie-key-factory triple that never changes within one run -- filtering to a pending tie-continuation's required MIDI when one is due. Depth-first, it tries each attack's ordered candidates in turn, advancing through the shared search-state transition and charging one fuel unit per attempted candidate; a state whose subtree is proven exhausted is recorded by its exact memo key and never re-expanded, which cannot change the first plan the search finds. The search stops and returns a complete phrase the first time every attack has an accepted assignment, stops with search_limit_exceeded once fuel is spent with no complete phrase found, or stops with no_legal_pitch_plan once every candidate at every reachable state has been exhausted without one. The public entry points select between the production tie-key function and an injected tie-key factory (to force tie-key collisions under test) but otherwise plan identically.

## TECHNICAL INTERFACE
Callers supply one immutable bound planner input, and for the injectable entry point a tie-key factory, and receive a typed PitchPlanResult: a complete candidate phrase with its fuel used, search_limit_exceeded, or no_legal_pitch_plan, each carrying its own fuel used.

## EXPECTATION
A successful candidate satisfies the bound request range/window and every encoded contour, interval, recovery, and arpeggio obligation. Repeating the same bound input yields the same identity-derived ranked search behavior, and no candidate occurrence is retried within one search.
