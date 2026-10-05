---
id: service_workspace_session_flow
status: DRAFT
layer: ARCHITECTURE
version: 1.7
parents:
  - [[module_generation_request_construction]]
  - [[req_adaptive_tempo]]
  - [[req_last_session_review]]
  - [[req_multi_phrase_tension_arc]]
  - [[rule_acknowledgement_highlights_expected_note_only]]
  - [[rule_adaptive_tempo_resets_after_session]]
  - [[rule_audio_unlocked_by_player_click]]
  - [[rule_click_track]]
  - [[rule_controller_loss_mid_session]]
  - [[rule_controller_reconnection_window]]
  - [[rule_controllerless_session_never_gains_controller]]
  - [[rule_count_in_ending_returns_to_idle]]
  - [[rule_count_in_shown_on_screen]]
  - [[rule_ephemeral_session_state]]
  - [[rule_hidden_tab_ends_session]]
  - [[rule_landscape_lock_during_session]]
  - [[rule_midi_never_blocks_session]]
  - [[rule_midi_starting_note]]
  - [[rule_new_session_discards_review]]
  - [[rule_phrase_one_is_idle_phrase]]
  - [[rule_played_onset_latency_compensation]]
  - [[rule_playhead_follows_audio_clock]]
  - [[rule_presentation_preference_preserves_phrase]]
  - [[rule_screen_wake_lock_during_session]]
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_session_ends_on_portrait_view]]
  - [[rule_session_ends_when_staff_too_small]]
  - [[rule_session_history_records_played_notes]]
  - [[rule_session_layout_fixed_at_start]]
  - [[rule_session_never_pauses]]
  - [[rule_session_settings_locked]]
  - [[rule_session_start_conditions]]
  - [[rule_silence_timeout_ends_session]]
  - [[rule_start_while_controller_away]]
  - [[rule_starting_note_only_starts_count_in]]
  - [[rule_stop_ends_session]]
  - [[rule_struggling_generator_notice]]
  - [[user_story_controlled_phrase_generation]]
human_name: Workspace Session Flow
priority: 1
tags: workspace,session-state,operation-flow
dependents:
  - [[module_generation_prewarm]]
  - [[module_idle_generation_error_recovery]]
  - [[module_idle_layout_gate]]
  - [[module_idle_window_width_density]]
  - [[module_session_adaptive_tempo_control]]
  - [[module_session_controller_loss]]
  - [[module_session_note_acknowledgement]]
  - [[module_session_phrase_steps]]
  - [[module_session_shown_settings]]
  - [[module_session_silence_timeout]]
  - [[module_session_starting_note]]
  - [[module_session_tension_across_phrases_flag]]
  - [[module_session_transport_tempo_map]]
  - [[module_session_vary_settings_flag]]
  - [[rule_generation_failure_alert_copy]]
  - [[rule_readonly_controls_keep_contrast]]
  - [[service_idle_generation_session]]
  - [[service_session_controller]]
  - [[service_session_end]]
  - [[service_session_midi]]
  - [[service_session_start]]
  - [[service_workspace_session_runner_factory]]
type: SERVICE
notes: Split on 2026-10-05 during documentation debt paydown (previous version 1.6): the rules moved unchanged in meaning into child atoms, one concept each, aligned with the workspace session modules; this atom keeps the intent, the two-sided structure and the composition root, and indexes its children. Status stays DRAFT. Earlier: Revised 2026-10-05 before code in v2 chunk 30 (previous version 1.5, pre-code architecture capture; completed in the chunk 30 post-task sync as built, with the flag in workspace-session-settings.ts beside the vary-settings flag; status stays DRAFT) for the tension-across-phrases control: the page-lifetime tensionAcrossPhrases flag and setTensionAcrossPhrases, changeable outside a session only, carried as the session start's multiPhraseTensionArc; the read-only Tension control never shows a phrase's step. Earlier: revised 2026-10-05 before code in v2 chunk 28 (previous version 1.4, pre-code architecture capture; completed in the chunk 28 post-task sync as built: the reached tempo kept by the flag's sessionEnded, the screen's readings in use-rising-tempo-control.ts; status stays DRAFT) for the adaptive-tempo control: lastSessionReachedTempo, the reached tempo of the last session that ran adaptive tempo, set or cleared at an end once phrase 1 has sounded; the control's availability frozen during a session; the read-only tempo control showing the session tempo. Earlier: revised 2026-10-05 in v2 chunk 25 (previous version 1.3; pre-code architecture capture, completed in the post-task sync as built) for the settings-mutation control: the page-lifetime vary-settings flag and setVarySettings, the mutation seed drawn by the workspace runner, the rolling display as the engine's display reading, phrase-discarded handled by the phrase steps and the display, and shownSettings, the settings the controls show during a session, dropped at every end so the player's never-written settings show again (spec D182). Earlier: revised 2026-10-03 before code in v2 chunk 27 (previous version 1.2, pre-code architecture capture) for adaptive tempo: the page-lifetime flag in the controller state, backing, acknowledgement and sounding scheduled at the phrase tempo output, the transport click plan as a piecewise tempo map, the controller event sent by session MIDI, and the Idle tempo control never written by the session. Earlier: revised in the v2 chunk 24 post-task sync. Completed 2026-10-03 in the v2 chunk 27 post-task sync, as built: state.sessionTempo is the sounding phrase's tempo; setAdaptiveTempo(on) with state.adaptiveTempo and state.adaptiveTempoAvailable, changeable at Idle only; the controller event sent only in a session started with a controller, through the engine time floor; phrase steps in workspace-session-phrases.ts and the flag in workspace-adaptive-tempo.ts; the playhead keeps its own per-phrase tempo map. Status stays DRAFT.
---

# Workspace Session Flow

## INTENT
Coordinate the active phrase workspace as root-created, readonly in-memory session state, and the practice session the workspace runs from it, from the Start click to the session's end.

## THE RULE / LOGIC
The workspace session is the root-created, readonly, in-memory state behind the active phrase workspace, in two sides. The Idle side is a root-created Vue composable that owns the controls, the current generation intent and result, and the notation and error state between practice sessions. The practice session side is the session controller the workspace builds, which owns the one session the workspace runs at a time, from the Start click to the session's end. The rules of each side are stated in its child atoms; this atom adds none of its own.

Parts of the Idle side: [[service_idle_generation_session]] (the Idle composable, its actions, its fit runs and its one operation at a time), [[module_idle_generation_error_recovery]] (retry generation and when a captured error clears), [[module_idle_window_width_density]] (the note density the window's width gives) and [[module_generation_prewarm]] (the prewarm policy).

Parts of the practice session side: [[service_session_controller]] (the controller, its chunk and its audio-clock drive), [[service_session_start]] (the start inside the Start click), [[service_session_end]] (the one end path and the last session's review), [[module_idle_layout_gate]] (the staff's reports during and after a session), [[service_workspace_session_runner_factory]] (the runner bound to the shared generation worker), [[module_session_phrase_steps]] (phrases from 2 on, from ready to sounding), [[module_session_transport_tempo_map]] (the transport's piecewise tempo map), [[module_session_adaptive_tempo_control]] (the adaptive-tempo flag and the session tempo), [[module_session_vary_settings_flag]], [[module_session_shown_settings]] (the settings the read-only controls show), [[module_session_tension_across_phrases_flag]], [[service_session_midi]] (the controller's MIDI side), [[module_session_starting_note]], [[module_session_note_acknowledgement]], [[module_session_silence_timeout]] and [[module_session_controller_loss]].

## TECHNICAL INTERFACE
The workspace composition root is composeWorkspaceSession(deps) in src/components/workspace/create-workspace-session.ts, which createWorkspaceSession(options) calls with the production dependencies (options.prewarmPolicy among them). It creates the Idle composable and exposes, beside the composable's readonly state and actions, loadSessionRunner and createSessionController; the app root calls createSessionController() once at setup, which loads the runner through loadSessionRunner() and gives its starter to the session controller as the controller's createSessionRunner dependency. Each child atom states the part of this interface it owns.

## EXPECTATION
The app root creates one workspace session, through which consumers reach the Idle side's readonly state and actions and the practice session controller. Every rule of either side is verified against the expectation of the child atom that states it.
