---
id: module_pitch_search_inspection
status: DRAFT
type: MODULE
tags: pitch
parents:
  - [[entity_pitch_candidate_domain]]
dependents: []
human_name: Pitch Search Inspection
layer: ARCHITECTURE
priority: 1
version: 0.1
---

# Pitch Search Inspection

## INTENT
Expose read-only inspection of a bound pitch planner input's derived attacks, prefix search-state replay, contour feasibility, and phrase-endpoint openness, without performing or mutating a search.

## THE RULE / LOGIC
Given one immutable bound planner input, the module derives its chronological sounding attacks with tie-inclusive spans and absolute-beat harmony; replays a chronological prefix of candidate assignments through the search-state transition, reporting undefined if any step would be rejected or is out of order; reports whether the selected contour can still hold given the checkpoint values already assigned, treating every unassigned checkpoint as free over its candidate MIDI values; and reports whether the last of a sequence of assignments is the final attack and leaves the phrase open. None of these operations perform a search, rank or select a candidate, or mutate the input or the assignments supplied to them.

## TECHNICAL INTERFACE
Callers supply one immutable bound planner input, and where relevant a sequence of chronological pitch assignments, and receive attacks, search state, or a boolean feasibility/openness result. The module accepts no seed, ranking policy, or search-fuel budget, and performs no candidate search of its own.

## EXPECTATION
Every inspection is a pure function of its immutable inputs: repeating the same bound input and assignment sequence yields the same attacks, search state, contour feasibility, or endpoint result, and no inspection call mutates the bound input or the assignments it was given.
