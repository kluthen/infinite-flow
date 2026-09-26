---
id: module_phrase_generation_profile_policy
status: DRAFT
type: MODULE
layer: ARCHITECTURE
tags: phrase-generation,instrument-profile,active-range,register-policy
parents:
  - [[entity_instrument_profile]]
  - [[rule_instrument_profile_range]]
dependents:
  - [[module_register_window_resolution_primitives]]
human_name: Phrase Generation Profile Policy
priority: 1
version: 1.1
---

# Phrase Generation Profile Policy

## INTENT

Provide phrase generation with the selected profile's explicit active-range and register policy.

## THE RULE / LOGIC

The generation boundary receives only an explicit active playable range and resolved whole-phrase register-window policy derived from the selected validated profile. It does not branch on profile identity, display convention, or profile-specific metadata. The selected policy constrains concert-pitch phrase generation without determining notation display. An instrument-profile switch does not validate or retain the previous concert timeline against the new profile: it always regenerates the complete phrase using the new profile's active range and register-window policy and a fresh seed (governed by [[rule_profile_switch_validates_phrase]]), except when the retained controls are one of the unsupported combinations that block generation, in which case no generation runs. Source events are never transposed to fit.

## TECHNICAL INTERFACE

The generation request accepts an active concert-pitch playable range and register-window policy as explicit inputs derived from the selected instrument profile.

## EXPECTATION

Adding a valid instrument profile does not require conditional changes to melodic, harmonic, or rhythm generation logic; generation uses the profile-derived policy instead. A profile switch never retains or revalidates the previous concert timeline against the new profile; it regenerates the complete phrase under the new profile's policy with a fresh seed, unless a blocked rhythm-settings combination is selected, without transposing source events to fit.
