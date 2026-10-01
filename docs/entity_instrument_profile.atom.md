---
id: entity_instrument_profile
status: DRAFT
tags: instrument-profile,range-policy,register-policy,declarative
version: 1.4
dependents:
  - [[entity_concert_event_timeline]]
  - [[module_phrase_generation_profile_policy]]
type: ENTITY
layer: ARCHITECTURE
parents:
  - [[rule_instrument_profile_range]]
human_name: Instrument Profile
priority: 1
notes: Revised 2026-10-01 in v2 chunk 13 (controller connection) to add the controller-transposition check to the transposition's consumers. Status unchanged.
---

# Instrument Profile

## INTENT

Represent each supported instrument as a validated declarative profile.

## THE RULE / LOGIC
An instrument profile supplies one stable identity, one inclusive concert-pitch playable range, one contained overlapping register-window policy, one open concert-to-written transposition, and any instrument metadata required by profile consumers. Transposition is open data: an integer chromatic semitone count and an integer diatonic letter-step count, validated as a consistent pair, never a closed list of display conventions or a literal-valued type. The first-release profiles are C MIDI keyboard 48-72 with transposition +0/+0, B-flat tenor saxophone 46-70 with transposition +14/+8 (major ninth), and E-flat alto saxophone 51-75 with transposition +9/+5 (major sixth). Profile validation rejects missing identities, non-integer or invalid playable ranges, an inconsistent chromatic/diatonic transposition pair, unsupported window policy versions, windows outside the active range, or non-intersecting adjacent windows. The transposition is consumed only by request construction (to convert a written tonal center to the concert tonal center), by notation (to render written pitch), by the MusicXML export (to write the transposition that takes the exported written pitch back to concert pitch), and by the controller-transposition check (to place the written note it shows inside the profile's written range, to derive the concert pitch a correctly set controller sends for that note, and to name another registered profile whose chromatic transposition would make the played note right as is); no planner reads it. Registering a valid future profile, including a test-only profile whose transposition none of the first-release profiles use, is a data addition and validation event, not a change to melodic, harmonic, rhythm, or notation-rendering logic, and requires no new type, enumeration member, or user-interface branch.

## TECHNICAL INTERFACE

Profile consumers receive a selected validated profile with its stable identity, concert-pitch playable range, register-window policy, open chromatic/diatonic transposition pair, and metadata.

## EXPECTATION

A valid profile, including its open transposition pair, can be registered using declarative data and validation. Invalid profile data, including an inconsistent transposition pair, is rejected before it reaches profile consumers, and the selected profile supplies a valid whole-phrase register policy and transposition.
