---
id: contract_infinite_flow_first_release
status: DRAFT
human_name: Infinite Flow First-Release Contract
type: CONTRACT
layer: BUSINESS
version: 1.1
priority: 1
tags: contract,first-release
parents: []
dependents: []
---

# Infinite Flow First-Release Contract

## INTENT

Record the current guaranteed public surface for the first release: the STABLE, human-confirmed non-negotiable invariants that hold regardless of what remains in development.

## THE RULE / LOGIC

One invariant is confirmed STABLE and enters the guaranteed surface: every generated concert pitch falls inside the selected instrument profile's inclusive active concert range and resolved whole-phrase register window, and the selected instrument profile's concert-to-written transposition, used only by notation and by request construction's written-to-concert tonal-center conversion, never alters those source events or generation constraints (governed by [[rule_instrument_profile_range]]). MIDI controller connection and match or mismatch feedback are excluded from the first release and are not a first-release contract guarantee. No other first-release BUSINESS or ARCHITECTURE atom is STABLE yet, so no further feature guarantee is enumerated.

## TECHNICAL INTERFACE

Contract review evaluates only STABLE BUSINESS and ARCHITECTURE atoms that qualify for the contract surface. The instrument-profile range invariant is read from its governing RULE atom, not restated as independent contract logic.

## EXPECTATION

The contract remains singular project-wide. Weakening or removing the instrument-profile-range guarantee requires a MAJOR version bump on this contract with explicit human confirmation; promoting a further atom to STABLE that qualifies for the surface requires a MINOR bump. Removing the former MIDI-feedback guarantee changes the contract from version 0.2 to 1.0 with the invoking human's confirmation.
