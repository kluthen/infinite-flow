---
id: rule_playing_light_not_colour_alone
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
tags: [v4, release-v4.0, session, accompaniment, playing-lights, accessibility]
dependents: []
priority: 1
human_name: A Playing Light Is Not Read by Colour Alone
parents:
  - [[req_part_playing_lights]]
---

# A Playing Light Is Not Read by Colour Alone

## INTENT
Make the lights readable by every player, colour vision aside.

## THE RULE / LOGIC
A playing light's lit and unlit states differ by more than colour, and the light shows no animation beyond its change of state.

## TECHNICAL INTERFACE
Each light has two states told apart without colour.

## EXPECTATION
- A player who cannot tell colours apart can still tell a lit light from an unlit one.
- A light does not move, pulse or blink while it stays in one state.
