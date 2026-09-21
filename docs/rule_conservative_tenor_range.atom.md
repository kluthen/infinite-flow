---
id: rule_conservative_tenor_range
status: DRAFT
type: RULE
version: 0.1
priority: 1
tags: range,tenor-saxophone,hard-constraint
dependents: []
human_name: Conservative Tenor Range
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
---

# Conservative Tenor Range

## INTENT
Keep every generated source pitch within the first-release conservative tenor saxophone range.

## THE RULE / LOGIC
All generated source pitches are concert MIDI 45 through 58 inclusive. The active range policy does not change when notation display transposition changes.

## TECHNICAL INTERFACE
The generation request includes the active tenor range and the result contains concert-pitch events.

## EXPECTATION
Every generated concert pitch is between MIDI 45 and MIDI 58 inclusive.
