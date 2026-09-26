---
id: module_musical_profile_capabilities
status: DRAFT
human_name: Musical Profile Capabilities
layer: ARCHITECTURE
version: 0.1
parents:
  - [[rule_jazz_chromatic_resolution]]
type: MODULE
priority: 2
tags: musical-profile,capability,jazz-profile
dependents: []
---

# Musical Profile Capabilities

## INTENT

Let a musical profile declare named capabilities as data so planner and validator behavior is gated by a declared capability, never by comparing a musical-profile name.

## THE RULE / LOGIC

Each musical profile (first-release: neutral, jazz; later presets and characters) declares its own set of named capabilities as data alongside its other profile data. The first-release capability is chromatic approach and enclosure figures allowed: the jazz profile declares it and the neutral profile does not. Any planner or validator decision that varies by profile must read a declared capability's presence, never compare the profile's name or identity. Adding a musical profile means declaring its capabilities in one data entry; it requires no planner or validator code change. Moving planner and validator checks from profile-name comparison to capability declaration leaves every generated result unchanged.

## TECHNICAL INTERFACE

The musical-profile data structure exposes a set of declared named capabilities per profile. Planner and validator code reads whether a specific named capability is declared on the active profile and branches on that boolean, never on the profile's name or identity.

## EXPECTATION

No planner or validator code path compares a musical-profile name to decide behavior; each such decision instead checks a declared capability. Adding a new musical profile or capability requires only a new data entry, with no change to planner or validator code. Golden fixtures and existing generated results are unchanged after the capability read replaces a name comparison.
