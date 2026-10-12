---
id: service_session_start
status: REVIEW
tags: workspace,session,start
parents:
  - [[rule_audio_unlocked_by_player_click]]
  - [[rule_count_in_shown_on_screen]]
  - [[rule_landscape_lock_during_session]]
  - [[rule_new_session_discards_review]]
  - [[rule_screen_wake_lock_during_session]]
  - [[rule_session_layout_fixed_at_start]]
  - [[rule_session_settings_locked]]
  - [[rule_session_start_conditions]]
  - [[service_workspace_session_flow]]
notes: v3.0 change pending (2026-10-12, pre-code architecture capture for build plan chunk 24): Start takes the ready phrases from the pre-generation queue, which aborts the background attempt in flight and re-checks their fit against the held layout, and passes them in the runner's start (module_idle_pregeneration_queue, module_session_ready_phrases). Text and status unchanged on purpose: it still describes the running code. Revise it at chunk 24's post-task sync. Earlier: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
type: SERVICE
layer: ARCHITECTURE
human_name: Practice Session Start
version: 0.1
priority: 1
---

# Practice Session Start

## INTENT
Start a practice session synchronously inside the player's Start click, so that it either sets up everything the session needs or leaves nothing acquired.

## THE RULE / LOGIC
Start runs synchronously inside the player's Start click: it first discards the last session's kept review, then unlocks the audio, requests the screen wake lock and the landscape orientation lock (a refusal changes nothing), starts the audio transport and queues phrase 1's backing, then freezes the current controls and musical profile as the session's settings, holds the staff layout the window's width selects, opens the session history and starts the session runner, the count-in display, the audio-clock wake-ups and the end watchers; a throw at any step once the locks are requested undoes everything set up and propagates.

## TECHNICAL INTERFACE
The session controller's start action: start (synchronous, for the Start click; throws while a start condition does not hold).

## EXPECTATION
A start inside the Start click unlocks the audio and requests both locks, and a start that fails part-way leaves nothing acquired.
