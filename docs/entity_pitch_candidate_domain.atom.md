---
id: entity_pitch_candidate_domain
status: REVIEW
layer: ARCHITECTURE
priority: 1
tags: pitch
parents:
  - [[entity_concert_event_timeline]]
version: 1.0
dependents:
  - [[mechanic_pitch_contour_forward_check]]
  - [[mechanic_pitch_search_policy]]
  - [[mechanic_pitch_tie_break_ordering]]
  - [[module_pitch_attack_timeline]]
  - [[module_pitch_domain_validation]]
  - [[module_pitch_planner]]
  - [[module_pitch_search_context]]
  - [[module_pitch_search_inspection]]
  - [[module_pitch_search_transition]]
human_name: Pitch Candidate Domain
type: ENTITY
---

# Pitch Candidate Domain

## INTENT
Represent each candidate pitch assignment as an immutable, self-contained domain value that combines a resolved GenerationRequest, pitch policy, selected harmony and rhythm candidates, and one concrete tension binding.

## THE RULE / LOGIC
A bound planner input contains exactly one resolved GenerationRequest with a Low, Middle, or High register identity, an inclusive register window contained within the active range, immutable pitch policy, one selected canonical harmony candidate, one selected canonical rhythm candidate, and one concrete tension binding. The candidate domain enumerates legal concert-pitch assignments for that bound input without using the seed. Candidate identity is derived only from immutable musical content, so ranking and tie keys are deterministic and identity-derived rather than dependent on enumeration timing, mutable planner state, or the seed. Values are immutable and do not expose player-facing GenerationIntent, unresolved Varying, profile identity, presentation state, diagnostics, calibration values, or search counters.

## TECHNICAL INTERFACE
The pitch planner receives one immutable bound planner input and obtains immutable pitch candidates with a stable identity. Construction accepts no unresolved GenerationIntent, mutable session state, diagnostics, random source, wall-clock value, or numeric calibration table.

## EXPECTATION
The same bound input always defines the same seed-independent pitch-candidate domain and stable candidate identities. Every bound input contains one resolved contained Low, Middle, or High window, and no consumer can mutate its request, policy, selected structural candidates, tension binding, or returned pitch candidates.
