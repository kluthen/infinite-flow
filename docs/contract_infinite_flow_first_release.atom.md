---
id: contract_infinite_flow_first_release
status: DRAFT
human_name: Infinite Flow First-Release Contract
type: CONTRACT
layer: BUSINESS
version: 0.2
priority: 1
tags: contract,first-release
parents: []
dependents: []
---

# Infinite Flow First-Release Contract

## INTENT
Record the current guaranteed public surface for the first release: the STABLE, human-confirmed non-negotiable invariants that hold regardless of what remains in development.

## THE RULE / LOGIC
Two invariants are confirmed STABLE and enter the guaranteed surface: (1) optional MIDI input never exposes an unmatched incoming pitch, and never changes generation, advances the phrase, evaluates timing, or creates a score (governed by [[rule_optional_midi_privacy]]); (2) every generated concert pitch falls inside the selected instrument profile's inclusive active concert range and resolved whole-phrase register window, and notation display transposition never alters those source events or generation constraints (governed by [[rule_instrument_profile_range]]). No other first-release BUSINESS or ARCHITECTURE atom is STABLE yet, so no further feature guarantee is enumerated.

## TECHNICAL INTERFACE
Contract review evaluates only STABLE BUSINESS and ARCHITECTURE atoms that qualify for the contract surface; the two invariants above are read from their governing RULE atoms, not restated as independent contract logic.

## EXPECTATION
The contract remains singular project-wide. Weakening or removing the MIDI-privacy or instrument-profile-range guarantee requires a MAJOR version bump on this contract with explicit human confirmation; promoting a further atom to STABLE that qualifies for the surface requires a MINOR bump.
