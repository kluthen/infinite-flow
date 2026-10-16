---
id: contract_infinite_flow_first_release
status: STABLE
human_name: Infinite Flow First-Release Contract
type: CONTRACT
layer: BUSINESS
version: 6.3.1
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

- Instrument range: rule_instrument_profile_range. Every generated concert pitch falls inside the selected instrument profile's inclusive active concert range and resolved whole-phrase register window; the profile's concert-to-written transposition only converts between written and concert pitch and never alters those source events or generation constraints. A player-made instrument obeys the same rule.
- Phrase material: rule_leap_recovery, rule_open_phrase_ending, rule_tempo_never_affects_generation.
- Session generation: rule_session_generation_failure_ladder, rule_dropped_attempt_cancelled, module_generation_worker_cancellation, rule_struggling_generator_notice, rule_repeat_phrase_marked_internally_only, rule_session_density_only_steps_down.
- Session start: rule_midi_never_blocks_session, rule_midi_starting_note, rule_count_in_shown_on_screen, rule_starting_note_waits_for_first_gesture.
- Phrases ready ahead and their seeds: module_session_ready_phrases, module_session_seed_plan.
- Controller connection: rule_controller_transposition_check, rule_same_controller_reattaches.
- Controller loss: rule_controller_loss_mid_session, rule_start_while_controller_away.
- Session end with a controller: rule_silence_timeout_ends_session, rule_controller_reconnection_window.
- Screen during a session: rule_screen_wake_lock_during_session.
- Backing and audio mix: req_session_backing_track, req_session_audio_mix, rule_click_volume_never_silent.
- Settings mutation and carry-in: rule_key_change_drops_harmonic_carry_in, rule_join_carry_in_limited, rule_harmony_change_drops_unfit_harmonic_carry_in, rule_setting_change_rechecks_pitch_carry_in, rule_mutation_setting_scales, rule_mutation_marks_profile_customized, rule_mutation_sixteenth_blocked_after_step_down, rule_mutation_reverts_at_session_end.
- Adaptive tempo and tension arc: rule_adaptive_tempo_flat_schedule, rule_multi_phrase_tension_arc_cycle.
- Review and privacy: req_last_session_review, rule_review_played_notes_toggle, rule_optional_midi_privacy, rule_played_notes_kept_only_after_opt_in.
- Saving on the device: rule_settings_saved_on_change, rule_saved_setting_is_players_choice, rule_saved_settings_load_tolerantly, rule_first_phrase_waits_for_saved_settings, rule_no_save_during_session, rule_failed_save_never_disturbs_session, rule_failed_read_told_to_player, rule_failed_read_offers_only_delete_everything, rule_outdated_tab_reads_what_it_can, rule_outdated_tab_stops_saving, rule_persistent_storage_requested, module_on_device_database, module_saved_data_loader, module_save_policy.
- What is kept, and deleting it: req_your_data, rule_delete_everything, rule_kept_played_notes_deletable.
- Kept sessions: req_kept_sessions, rule_most_recent_session_kept, rule_pinned_session_kept, req_kept_session_list, req_kept_session_review, rule_kept_session_content, rule_session_comment, entity_kept_session_record, module_kept_session_codec, module_kept_session_save, module_kept_session_changes, module_kept_session_reach.
- Favorites: req_favorite_phrases, rule_favorite_pins_session, rule_favorites_only_export, rule_new_session_never_asks_about_favorites.
- My instrument: req_my_instrument, rule_my_instrument_range_limits, rule_my_instrument_transposition_named_interval, entity_my_instrument, entity_my_instrument_record.
- Browser-only operation: specification_browser_only_operation_verification.
- Governance: req_tech_debt_backlog.

v2 brings MIDI controller input into scope, and v3.0 keeping things on the player's device, as VISION states; each is guaranteed only through the STABLE atoms listed here. Every other BUSINESS or ARCHITECTURE atom is DRAFT or REVIEW and is not enumerated.

## TECHNICAL INTERFACE
Contract review evaluates only STABLE BUSINESS and ARCHITECTURE atoms that qualify for the contract surface. Each guarantee is read from its governing atom, not restated as independent contract logic.

## EXPECTATION
The contract remains singular project-wide. Weakening or removing any guarantee listed here requires a MAJOR version bump on this contract with explicit human confirmation; promoting a further atom to STABLE that qualifies for the surface requires a MINOR bump. Version 3.0 (MAJOR) changes guarantees for v3.1 and v3.2, with the product owner's explicit confirmation: Vary settings no longer guarantees a flip between Neutral and Jazz, which leaves the surface; a mutation marks the selection customized for every value the selection holds, so from v3.1 Tension, Leapiness, Arpeggio chaos and figure-level mutations mark Custom; a Jam's quantized doodle is a generation input that may be stored without the played-notes opt-in and is exported with the generated notes, while played notes keep every guarantee and nothing is sent; in Jam mode the home note can start a session and the count-in may show no phrase; a Jam started without a held doodle ends before its phrase 1 when no doodle note comes within 30 seconds after its count-in, when its controller is lost from its count-in on, or when no attempt produces phrase 1 by its deadline, and the notes played before its phrase 1 do not arm the silence timer; and a Jam's doodle and the locked rhythm reach later phrases as session-wide inputs besides carry-in. The other changes are wording. Every other guarantee is unchanged. Version 6.3 (MINOR) adds the 42 v3.0 atoms promoted to STABLE on 2026-10-16 with the product owner's approval: keeping settings, my instrument, kept sessions, favorites and played notes on the device, deleting them, the starting note waiting for the page's first click, tap or key press, and the phrases made ready ahead with their seeds. Twelve of them are MODULE and ENTITY atoms, which the product owner put on the surface. No guarantee is weakened or removed.
