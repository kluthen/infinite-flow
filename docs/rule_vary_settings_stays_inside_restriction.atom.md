---
id: rule_vary_settings_stays_inside_restriction
status: DRAFT
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_restriction_in_force]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.1, session, player-controls, presets]
priority: 1
human_name: Vary Settings Stays Inside the Restriction
---

# Vary Settings Stays Inside the Restriction

## INTENT
Never let the app opt the player out of their preset by itself.

## THE RULE / LOGIC
Vary settings' key and mode moves stay inside the restriction in force at the session's start. A move outside it is drawn again, exactly as a move onto an unsupported combination is, and the player never sees it. The bound is fixed for the session. When no allowed value is one step away, that half simply does not move: under a preset meant for Mixolydian or Dorian the mode may move between the two; under a preset meant for one mode the mode never moves and the key moves freely; under a player preset kept to one key and mode neither moves. A session started with no restriction in force is not bounded, and no move is drawn again for a restriction's sake.

## TECHNICAL INTERFACE
Vary settings redraws a key or mode move that leaves the restriction in force at the session's start.

## EXPECTATION
- No Vary settings move takes the key or mode outside the restriction in force at the session's start.
- With no restriction in force at the start, no move is drawn again for a restriction's sake.
