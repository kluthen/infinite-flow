---
id: module_pitch_steering
status: REVIEW
human_name: The Generator's Pitch Steering
tags: [v3, release-v3.2, jam, generation, melody]
dependents: []
priority: 1
parents:
  - [[entity_steering_block]]
  - [[rule_doodle_only_orders_candidates]]
  - [[rule_jam_drift_positions]]
  - [[rule_jam_melody_follows_doodle_moves]]
type: MODULE
layer: ARCHITECTURE
version: 0.1
---

# The Generator's Pitch Steering

## INTENT
Order the pitch search's candidates by the request's steering block's moves, so a Jam's melody takes the doodle's ups and downs while every rule still decides which notes are allowed.

## THE RULE / LOGIC
The pitch part of the generator's steering module, inside the generation worker. It acts only when the request holds a steering block whose strength is not none and whose list of moves is not empty; otherwise the pitch order is exactly what it is without the module.

For each note of the phrase it takes the block's next move, the list cycled in order and counted by the moves the phrase makes: a joined phrase's first note is reached by a move from the carried pitch, so the list starts there; an unjoined phrase's first note is reached by none, so the list starts at its second note. A candidate's move from the note before is read as the block's moves are read, by one shared reading: the same note, or up or down by a step (1 or 2 half steps), a skip (3 or 4) or a leap (5 or more). Its disagreement with the steering move, lower first: with direction only, 0 when the direction agrees, else 1; with size and direction, 0 when both agree, 1 when only the direction does, else 2.

The pitch rank takes the disagreement as one more term after all its existing ones (the favored figure's priority, chord tones before every other candidate, arpeggio chaos's distance) and before the seeded tie key, so it orders candidates only within a rank and never moves one across. The hard rules still decide what the search accepts: the term changes only which allowed candidate is tried first, never adds or removes one, and draws on no random stream. Under Predictable or Chaotic arpeggio chaos, chaos's distance already orders the chord tones, so the term moves them little. The search's ordering memo is local to one run, which sees one block, so no ordering outlives its block. An accepted note's published ranking facts carry the same term as the search ranks it.

## TECHNICAL INTERFACE
src/domain/generation/steering/pitch-steering.ts, in the generation worker's code: `pitchSteeringTerm(block, attackIndex, joined)` gives a note's `PitchSteeringTerm` (its move and its `PitchSteeringStrength`) or none; `moveDisagreement(term, priorMidi, midi)` scores a candidate; `melodicMoveBetween(fromMidi, toMidi)` reads a move, and is also how Jam's steering block builder (src/jam/steering-block-builder.ts, module_steering_block_builder) reads the doodle's. `pitchRank` and `orderCandidates` (src/domain/pitch/pitch-ranking.ts) take the term as an optional last argument and add the disagreement as the rank tuple's fourth entry, only with a term and a note before; `searchPitchPlan` (src/domain/pitch/pitch-search.ts) builds each attack's term from the request's `steering` and whether it holds a carry-in, inside its per-run ordering memo; the transition's ranking facts (src/domain/pitch/pitch-advance.ts) pass the same term. The block is the request's `steering` (entity_steering_block).

## EXPECTATION
- Without a steering block, or at strength none, every pitch order, and so every phrase, is unchanged.
- At size and direction, candidates matching the next move's direction and size come first within their rank, then those matching its direction only; at direction only, those matching its direction.
- The term never moves a candidate across ranks, and every phrase still passes the validator.
- A joined phrase's first note follows the block's first move; an unjoined phrase's second note does.
- No ordering is reused across two blocks.
