---
id: contract_infinite_flow_first_release
status: STABLE
human_name: Infinite Flow First-Release Contract
type: CONTRACT
layer: BUSINESS
version: 1.5
priority: 1
tags: contract,first-release
parents: []
dependents: []
notes: Revised 2026-10-07 to version 1.5 (MINOR bump) with the product owner's approval - rule_controller_loss_mid_session, rule_start_while_controller_away, rule_count_in_shown_on_screen, rule_midi_never_blocks_session, rule_midi_starting_note, req_last_session_review, rule_mutation_reverts_at_session_end, rule_adaptive_tempo_flat_schedule and rule_multi_phrase_tension_arc_cycle were promoted to STABLE, each backed by the v2.0 gate tests linked to it (commits eab0519 and 4dbf0e2), and join the surface. rule_same_controller_reattaches and specification_browser_only_operation_verification, approved the same day, stay REVIEW and are not listed - one clause of each expectation has no test linked to the atom. No guarantee is weakened or removed. Revised 2026-10-05 (previous version 1.1). MINOR bump - seventeen atoms promoted to STABLE that day with the product owner acceptance (specs D184, D185 and D186, and earlier owner approvals of their text) join the surface; req_tech_debt_backlog, already STABLE but not enumerated, is listed; the outdated first-release exclusion of MIDI controller connection and feedback is replaced by the v2 scope VISION states, the change v2 chunk 13 proposed and the owner accepted (spec D186); the transposition clause follows rule_instrument_profile_range version 0.3. No guarantee is weakened or removed. Version 1.2 was confirmed by the product owner on 2026-10-05. Revised the same day to version 1.3 (MINOR bump), as the owner asked with that confirmation: rule_join_carry_in_limited, rule_harmony_change_drops_unfit_harmonic_carry_in, rule_setting_change_rechecks_pitch_carry_in (owner-accepted version 0.2 wordings) and req_session_audio_mix and rule_click_volume_never_silent (owner-accepted mix levels, ux Q31) were promoted to STABLE and join the surface. No guarantee is weakened or removed. Status DRAFT to STABLE on that confirmation. Revised 2026-10-06 to version 1.4 (MINOR bump) with the product owner's confirmation: rule_controller_transposition_check (verified on the reference breath controller in the v2.0 gate) and rule_screen_wake_lock_during_session (owner-accepted version 0.2 wording, spec D187) were promoted to STABLE and join the surface. No guarantee is weakened or removed.
---

# Infinite Flow First-Release Contract

## INTENT

Record the current guaranteed public surface for the first release: the STABLE, human-confirmed non-negotiable invariants that hold regardless of what remains in development.

## THE RULE / LOGIC
The guaranteed surface is the set of STABLE, human-confirmed BUSINESS atoms below; each guarantee is read from its own atom, not restated here.

- Instrument range: rule_instrument_profile_range. Every generated concert pitch falls inside the selected instrument profile's inclusive active concert range and resolved whole-phrase register window; the profile's concert-to-written transposition only converts between written and concert pitch and never alters those source events or generation constraints.
- Phrase material: rule_leap_recovery, rule_open_phrase_ending, rule_tempo_never_affects_generation.
- Session generation: rule_session_generation_failure_ladder, rule_struggling_generator_notice, rule_repeat_phrase_marked_internally_only, rule_session_density_only_steps_down.
- Session start: rule_midi_never_blocks_session, rule_midi_starting_note, rule_count_in_shown_on_screen.
- Controller connection: rule_controller_transposition_check.
- Controller loss: rule_controller_loss_mid_session, rule_start_while_controller_away.
- Session end with a controller: rule_silence_timeout_ends_session, rule_controller_reconnection_window.
- Screen during a session: rule_screen_wake_lock_during_session.
- Backing and audio mix: req_session_backing_track, req_session_audio_mix, rule_click_volume_never_silent.
- Settings mutation and carry-in: rule_key_change_drops_harmonic_carry_in, rule_join_carry_in_limited, rule_harmony_change_drops_unfit_harmonic_carry_in, rule_setting_change_rechecks_pitch_carry_in, rule_mutation_setting_scales, rule_mutation_marks_profile_customized, rule_mutation_profile_flip_keeps_controls, rule_mutation_sixteenth_blocked_after_step_down, rule_mutation_reverts_at_session_end.
- Adaptive tempo and tension arc: rule_adaptive_tempo_flat_schedule, rule_multi_phrase_tension_arc_cycle.
- Review and privacy: req_last_session_review, rule_review_played_notes_toggle, rule_optional_midi_privacy.
- Governance: req_tech_debt_backlog.

v2 brings MIDI controller input into scope, as VISION states; it is guaranteed only through the STABLE atoms listed here. Every other BUSINESS or ARCHITECTURE atom is DRAFT or REVIEW and is not enumerated.

## TECHNICAL INTERFACE
Contract review evaluates only STABLE BUSINESS and ARCHITECTURE atoms that qualify for the contract surface. Each guarantee is read from its governing atom, not restated as independent contract logic.

## EXPECTATION
The contract remains singular project-wide. Weakening or removing any guarantee listed here requires a MAJOR version bump on this contract with explicit human confirmation; promoting a further atom to STABLE that qualifies for the surface requires a MINOR bump. Version 1.2 adds the atoms promoted to STABLE on 2026-10-05 with the product owner's acceptance (spec D184 to D186) and drops the first-release exclusion of MIDI controller connection, which v2 lifted. Version 1.3 adds the three carry-in rules extended for the multi-phrase tension arc, the audio mix requirement and the click volume floor, promoted to STABLE on 2026-10-05 with the product owner's acceptance. Version 1.4 adds the controller-transposition check and the screen wake lock during a session, promoted to STABLE on 2026-10-06 with the product owner's acceptance. Version 1.5 adds the session-start, controller-loss, mutation-restore, adaptive-tempo, tension-arc and last-session review atoms promoted to STABLE on 2026-10-07 with the product owner's approval, each backed by the v2.0 gate tests linked to it.
