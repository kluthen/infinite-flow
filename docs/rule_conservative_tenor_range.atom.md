---
id: rule_conservative_tenor_range
status: DRAFT
type: RULE
version: 0.2
priority: 1
tags: range,instrument-profile,hard-constraint
dependents:
  - [[entity_instrument_profile]]
  - [[module_phrase_generation_profile_policy]]
human_name: Instrument Profile Ranges
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
---

# Instrument Profile Ranges

## INTENT
Keep every generated source pitch inside the selected first-release instrument profile's active concert range and resolved whole-phrase register window.

## THE RULE / LOGIC
The validated first-release profiles use inclusive active concert ranges and contained overlapping windows: C MIDI keyboard 48-72 with Low 48-60, Middle 54-66, High 60-72; B-flat tenor saxophone 46-70 with Low 46-58, Middle 52-64, High 58-70; and E-flat alto saxophone 51-75 with Low 51-63, Middle 57-69, High 63-75. Varying deterministically selects one feasible Low, Middle, or High window before planning the complete phrase and never changes it mid-phrase. Notation display transposition does not change the active range or source events.

## TECHNICAL INTERFACE
The generation request includes a selected validated profile's active concert range and resolved register window; the result contains concert-pitch events.

## EXPECTATION
Every generated concert event falls inside the selected profile's active range and resolved whole-phrase register window. No display-convention change alters those source events or generation constraints.
