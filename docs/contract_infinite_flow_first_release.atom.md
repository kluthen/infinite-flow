---
id: contract_infinite_flow_first_release
status: DRAFT
human_name: Infinite Flow First-Release Contract
type: CONTRACT
layer: BUSINESS
version: 1.2
priority: 1
tags: contract,first-release
parents: []
dependents: []
notes: Revised 2026-10-05 (previous version 1.1). MINOR bump - seventeen atoms promoted to STABLE that day with the product owner acceptance (specs D184, D185 and D186, and earlier owner approvals of their text) join the surface; req_tech_debt_backlog, already STABLE but not enumerated, is listed; the outdated first-release exclusion of MIDI controller connection and feedback is replaced by the v2 scope VISION states, the change v2 chunk 13 proposed and the owner accepted (spec D186); the transposition clause follows rule_instrument_profile_range version 0.3. No guarantee is weakened or removed.
---

# Infinite Flow First-Release Contract

## INTENT

Record the current guaranteed public surface for the first release: the STABLE, human-confirmed non-negotiable invariants that hold regardless of what remains in development.

## THE RULE / LOGIC
The guaranteed surface is the set of STABLE, human-confirmed BUSINESS atoms below; each guarantee is read from its own atom, not restated here.

- Instrument range: rule_instrument_profile_range. Every generated concert pitch falls inside the selected instrument profile's inclusive active concert range and resolved whole-phrase register window; the profile's concert-to-written transposition only converts between written and concert pitch and never alters those source events or generation constraints.
- Phrase material: rule_leap_recovery, rule_open_phrase_ending, rule_tempo_never_affects_generation.
- Session generation: rule_session_generation_failure_ladder, rule_struggling_generator_notice, rule_repeat_phrase_marked_internally_only, rule_session_density_only_steps_down.
- Session end with a controller: rule_silence_timeout_ends_session, rule_controller_reconnection_window.
- Backing: req_session_backing_track.
- Settings mutation and carry-in: rule_key_change_drops_harmonic_carry_in, rule_mutation_setting_scales, rule_mutation_marks_profile_customized, rule_mutation_profile_flip_keeps_controls, rule_mutation_sixteenth_blocked_after_step_down.
- Review and privacy: rule_review_played_notes_toggle, rule_optional_midi_privacy.
- Governance: req_tech_debt_backlog.

v2 brings MIDI controller input into scope, as VISION states; it is guaranteed only through the STABLE atoms listed here. Every other BUSINESS or ARCHITECTURE atom is DRAFT or REVIEW and is not enumerated.

## TECHNICAL INTERFACE
Contract review evaluates only STABLE BUSINESS and ARCHITECTURE atoms that qualify for the contract surface. Each guarantee is read from its governing atom, not restated as independent contract logic.

## EXPECTATION
The contract remains singular project-wide. Weakening or removing any guarantee listed here requires a MAJOR version bump on this contract with explicit human confirmation; promoting a further atom to STABLE that qualifies for the surface requires a MINOR bump. Version 1.2 adds the atoms promoted to STABLE on 2026-10-05 with the product owner's acceptance (spec D184 to D186) and drops the first-release exclusion of MIDI controller connection, which v2 lifted.
