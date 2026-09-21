---
id: module_phrase_generation_profile_policy
status: DRAFT
type: MODULE
layer: ARCHITECTURE
tags: phrase-generation,instrument-profile,active-range,register-policy
parents:
  - [[entity_instrument_profile]]
  - [[rule_instrument_profile_range]]
dependents: []
human_name: Phrase Generation Profile Policy
priority: 1
version: 1.1
---

# Phrase Generation Profile Policy

## INTENT
Provide phrase generation with the selected profile's explicit active-range and register policy.

## THE RULE / LOGIC
The generation boundary receives only an explicit active playable range and resolved whole-phrase register-window policy derived from the selected validated profile. It does not branch on profile identity, display convention, or profile-specific metadata. The selected policy constrains concert-pitch phrase generation without determining notation display. On an instrument-profile switch, unchanged concert events are validated against the new active range; fitting events are retained, while any non-fitting event causes complete regeneration using retained controls and a fresh seed. Source events are never transposed to fit.

## TECHNICAL INTERFACE
The generation request accepts an active concert-pitch playable range and register-window policy as explicit inputs derived from the selected instrument profile.

## EXPECTATION
Adding a valid instrument profile does not require conditional changes to melodic, harmonic, or rhythm generation logic; generation uses the profile-derived policy instead. A profile switch retains a fitting concert timeline and otherwise regenerates the complete phrase without transposing source events.
