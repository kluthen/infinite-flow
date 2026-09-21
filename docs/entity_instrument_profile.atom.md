---
id: entity_instrument_profile
status: DRAFT
tags: instrument-profile,range-policy,register-policy,declarative
version: 1.0
dependents:
  - [[module_phrase_generation_profile_policy]]
type: ENTITY
layer: ARCHITECTURE
parents:
  - [[rule_conservative_tenor_range]]
human_name: Instrument Profile
priority: 1
---

# Instrument Profile

## INTENT
Represent each supported instrument as a validated declarative profile.

## THE RULE / LOGIC
An instrument profile supplies one stable identity, one concert-pitch playable range, one register-window policy, and any instrument metadata required by profile consumers. Profile validation rejects missing identities, invalid playable ranges, or invalid register-window policies. Registering a valid future profile is a data addition and validation event, not a change to melodic, harmonic, rhythm, or notation-rendering logic.

## TECHNICAL INTERFACE
Profile consumers receive a selected validated profile with its stable identity, concert-pitch playable range, register-window policy, and metadata.

## EXPECTATION
A valid profile can be registered using declarative data and validation. Invalid profile data is rejected before it reaches profile consumers.
