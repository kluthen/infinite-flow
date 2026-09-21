---
id: entity_instrument_profile
status: DRAFT
tags: instrument-profile,range-policy,register-policy,declarative
version: 1.1
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
An instrument profile supplies one stable identity, one inclusive concert-pitch playable range, one contained overlapping register-window policy, and any instrument metadata required by profile consumers. The first-release profiles are C MIDI keyboard 48-72, B-flat tenor saxophone 46-70, and E-flat alto saxophone 51-75. Profile validation rejects missing identities, non-integer or invalid playable ranges, unsupported window policy versions, windows outside the active range, or non-intersecting adjacent windows. Registering a valid future profile is a data addition and validation event, not a change to melodic, harmonic, rhythm, or notation-rendering logic.

## TECHNICAL INTERFACE
Profile consumers receive a selected validated profile with its stable identity, concert-pitch playable range, register-window policy, and metadata.

## EXPECTATION
A valid profile can be registered using declarative data and validation. Invalid profile data is rejected before it reaches profile consumers, and the selected profile supplies a valid whole-phrase register policy.
