---
id: module_pitch_search_transition
status: DRAFT
human_name: Pitch Search Transition
type: MODULE
layer: ARCHITECTURE
version: 0.1
tags: pitch,search-transition
parents:
  - [[entity_pitch_candidate_domain]]
priority: 1
dependents: []
---

# Pitch Search Transition

## INTENT
Evaluate one proposed pitch candidate against a search state and the full selected melodic policy in one shared transition, producing either the accepted next state or a typed rejection reason, without ever rescanning the assignment prefix.

## THE RULE / LOGIC
The transition resolves the proposed candidate to its canonical domain-member entry at the next unassigned attack by stable identity and MIDI, rejecting anything outside that attack's compiled candidate domain; a search run resolves this lookup through a per-run lazily built identity index rather than rescanning the domain on every call. It derives the candidate's chord-tone and collection-membership facts, rejects a final-attack candidate whose MIDI is not one of the context's precompiled open-endpoint MIDI values, then composes the figure, motion, and contour reducers for that one candidate in order -- a rejection from any of the three rejects the whole transition -- and, once the final attack is accepted, checks that every whole-phrase obligation is already settled (figure closed, leap-recovery settled, contour complete), rejecting an otherwise-accepted final candidate that leaves any of them open. An accepted transition's next state always advances exactly one attack past the state it was given. The module's own published transition freezes its result and computes the candidate's ranking facts; the search's internal step transition skips both, since the search only reads the transition's kind and next state and never exposes or mutates either.

## TECHNICAL INTERFACE
Callers supply a compiled search context, a search state, and one proposed pitch candidate, plus for the internal step a domain-member lookup, and receive either an accepted result carrying the next state (and, for the published transition, ranking facts) or a rejected result carrying one typed reason. The module also exposes the search's initial pre-first-attack state, a lazily-indexed domain-member lookup builder, and a state's exact memo key covering every field that can influence the remainder of the search.

## EXPECTATION
The same context, state, and proposed candidate always produce the same accepted-or-rejected transition and, on acceptance, the same next state. A transition never mutates the state or context it was given, and the internal search step's next state is exactly reproducible by the published transition given the same domain-member resolution.
