---
id: contract_infinite_flow_first_release
status: STABLE
human_name: Infinite Flow First-Release Contract
type: CONTRACT
layer: BUSINESS
version: 5.0
priority: 1
tags: contract,first-release
parents: []
dependents: []
---

# Infinite Flow First-Release Contract

## INTENT

Record the current guaranteed public surface for the first release: the STABLE, human-confirmed non-negotiable invariants that hold regardless of what remains in development.

## THE RULE / LOGIC
The guaranteed surface is the set of STABLE, human-confirmed BUSINESS and ARCHITECTURE atoms below; each guarantee is read from its own atom, not restated here.

- Instrument range: rule_instrument_profile_range. Every generated concert pitch falls inside the selected instrument profile's inclusive active concert range and resolved whole-phrase register window; the profile's concert-to-written transposition only converts between written and concert pitch and never alters those source events or generation constraints.
- Phrase material: rule_leap_recovery, rule_open_phrase_ending, rule_tempo_never_affects_generation.
- Session generation: rule_session_generation_failure_ladder, rule_dropped_attempt_cancelled, module_generation_worker_cancellation, rule_struggling_generator_notice, rule_repeat_phrase_marked_internally_only, rule_session_density_only_steps_down.
- Session start: rule_midi_never_blocks_session, rule_midi_starting_note, rule_count_in_shown_on_screen.
- Controller connection: rule_controller_transposition_check, rule_same_controller_reattaches.
- Controller loss: rule_controller_loss_mid_session, rule_start_while_controller_away.
- Session end with a controller: rule_silence_timeout_ends_session, rule_controller_reconnection_window.
- Screen during a session: rule_screen_wake_lock_during_session.
- Backing and audio mix: req_session_backing_track, req_session_audio_mix, rule_click_volume_never_silent.
- Settings mutation and carry-in: rule_key_change_drops_harmonic_carry_in, rule_join_carry_in_limited, rule_harmony_change_drops_unfit_harmonic_carry_in, rule_setting_change_rechecks_pitch_carry_in, rule_mutation_setting_scales, rule_mutation_marks_profile_customized, rule_mutation_sixteenth_blocked_after_step_down, rule_mutation_reverts_at_session_end.
- Adaptive tempo and tension arc: rule_adaptive_tempo_flat_schedule, rule_multi_phrase_tension_arc_cycle.
- Review and privacy: req_last_session_review, rule_review_played_notes_toggle, rule_optional_midi_privacy.
- Browser-only operation: specification_browser_only_operation_verification.
- Governance: req_tech_debt_backlog.

v2 brings MIDI controller input into scope, as VISION states; it is guaranteed only through the STABLE atoms listed here. Every other BUSINESS or ARCHITECTURE atom is DRAFT or REVIEW and is not enumerated.

## TECHNICAL INTERFACE
Contract review evaluates only STABLE BUSINESS and ARCHITECTURE atoms that qualify for the contract surface. Each guarantee is read from its governing atom, not restated as independent contract logic.

## EXPECTATION
The contract remains singular project-wide. Weakening or removing any guarantee listed here requires a MAJOR version bump on this contract with explicit human confirmation; promoting a further atom to STABLE that qualifies for the surface requires a MINOR bump. Version 1.2 adds the atoms promoted to STABLE on 2026-10-05 with the product owner's acceptance (spec D184 to D186) and drops the first-release exclusion of MIDI controller connection, which v2 lifted. Version 1.3 adds the three carry-in rules extended for the multi-phrase tension arc, the audio mix requirement and the click volume floor, promoted to STABLE on 2026-10-05 with the product owner's acceptance. Version 1.4 adds the controller-transposition check and the screen wake lock during a session, promoted to STABLE on 2026-10-06 with the product owner's acceptance. Version 1.5 adds the session-start, controller-loss, mutation-restore, adaptive-tempo, tension-arc and last-session review atoms promoted to STABLE on 2026-10-07 with the product owner's approval, each backed by the v2.0 gate tests linked to it. Version 1.6 follows the failure-ladder rule's revision approved by the product owner on 2026-10-07: a carry-in attempt whose search covered every candidate without finding a phrase goes straight to the standalone attempt. Version 1.7 follows its further revision approved by the product owner the same day: the ladder keeps time for the standalone attempt, so generation time is bounded, while the session still never stops on a generation failure and the standalone attempt still generates what it would have after three failed retries. Version 1.8 adds the same controller reattaching by itself, the browser-only operation verification, the cancellation of a dropped generation attempt and the generation worker cancellation, promoted to STABLE on 2026-10-07 with the product owner's approval, and states the surface as STABLE BUSINESS and ARCHITECTURE atoms, since two of the atoms listed are ARCHITECTURE-layer. None of these versions weakens or removes a guarantee. Version 2.0 (MAJOR) narrows three guarantees for v3.0, with the product owner's explicit confirmation: the last-session review no longer guarantees that only the last session can be reviewed or that the review has no favorites; played notes may be written to storage with their session once the player opts in, and are still never sent; and the selected controller is no longer guaranteed to be forgotten on reload. Every other guarantee is unchanged. Version 3.0 (MAJOR) changes guarantees for v3.1 and v3.2, with the product owner's explicit confirmation: Vary settings no longer guarantees a flip between Neutral and Jazz, which leaves the surface; a mutation marks the selection customized for every value the selection holds, so from v3.1 Tension, Leapiness, Arpeggio chaos and figure-level mutations mark Custom; a Jam's quantized doodle is a generation input that may be stored without the played-notes opt-in and is exported with the generated notes, while played notes keep every guarantee and nothing is sent; in Jam mode the home note can start a session and the count-in may show no phrase; a Jam started without a held doodle ends before its phrase 1 when no doodle note comes within 30 seconds after its count-in, when its controller is lost from its count-in on, or when no attempt produces phrase 1 by its deadline, and the notes played before its phrase 1 do not arm the silence timer; and a Jam's doodle and the locked rhythm reach later phrases as session-wide inputs besides carry-in. The other changes are wording. Every other guarantee is unchanged. Version 3.1 (MINOR) follows the generation worker cancellation's revision, agreed by the product owner on 2026-10-12: the player's own requests at Idle are still never cancelled, and a background pre-generation attempt can be, by any request the player makes at Idle. Every guarantee the player relied on still holds; the change only adds a background attempt that gives way to the player, so the owner ruled it a minor version. The list of atoms on the surface is unchanged. Version 4.0 (MAJOR) narrows one guarantee for v3.0, with the product owner's explicit confirmation: the last-session review stays reachable until the next session starts, or until the player deletes its session after a confirmation, directly, by deleting the my instrument it was played with, or by changing that instrument's range or transposition. The owner ruled it a major version. Every other guarantee is unchanged, the review's engraving exactly as displayed included; the list of atoms on the surface is unchanged. Version 5.0 (MAJOR) narrows one guarantee for v3.0, with the product owner's explicit confirmation: when the phrase on screen is out of date (made under settings that differ from the current ones), the starting note no longer starts the count-in at once; it first asks, as the Start button does, whether to make a new phrase or use this one, the count-in starting only if the player uses it, and while it is asking no note starts anything. The owner ruled it a major version. Every other guarantee is unchanged; the list of atoms on the surface is unchanged.
