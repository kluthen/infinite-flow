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
  - [[rule_start_never_waits_for_pregeneration]]
  - [[service_workspace_session_flow]]
notes: Revised 2026-10-13 to version 0.2 (previous version 0.1) at the v3.0 wave-2 post-task sync, for build plan chunk 24 (merge 0b744ae); stays REVIEW. Start takes the phrases the Idle pre-generation queue has ready that fit the held layout, aborting its background attempt in flight and never waiting for it, and passes them in the runner's start (module_idle_pregeneration_queue, module_session_ready_phrases). The order of the steps now follows the code: the settings are frozen, the layout held and the ready phrases taken before the audio is unlocked, all inside the same synchronous click. This is what the merged code does, with linked tests (workspace-session-controller-pregeneration.spec.ts, the pre-generation e2e spec). The chunk 24 change pending below is done. Earlier: v3.0 change pending (2026-10-12, pre-code architecture capture for build plan chunk 24): Start takes the ready phrases from the pre-generation queue, which aborts the background attempt in flight and re-checks their fit against the held layout, and passes them in the runner's start (module_idle_pregeneration_queue, module_session_ready_phrases). Text and status unchanged on purpose: it still describes the running code. Revise it at chunk 24's post-task sync. Earlier: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
type: SERVICE
layer: ARCHITECTURE
human_name: Practice Session Start
version: 0.2
priority: 1
---

# Practice Session Start

## INTENT
Start a practice session synchronously inside the player's Start click, so that it either sets up everything the session needs or leaves nothing acquired.

## THE RULE / LOGIC
Start runs synchronously inside the player's Start click: it first discards the last session's kept review, then freezes the current controls and musical profile as the session's settings, holds the staff layout the window's width selects and takes from the Idle pre-generation queue the phrases it has ready that fit that layout (the take aborts the background attempt in flight and never waits for it; none when pre-generation is off or nothing is ready); then it unlocks the audio, requests the screen wake lock and the landscape orientation lock (a refusal changes nothing), starts the audio transport and queues phrase 1's backing, opens the session history and starts the session runner, from phrase 1, its session seed and the ready phrases taken, the count-in display, the audio-clock wake-ups and the end watchers; a throw at any step once the locks are requested undoes everything set up and propagates.

## TECHNICAL INTERFACE
The session controller's start action: start (synchronous, for the Start click; throws while a start condition does not hold). It takes the ready phrases through the pre-generation queue's `take(heldLayout)` and passes them to the runner's start as `SessionStart.readyPhrases` (`src/components/workspace/workspace-session-start.ts`, then `workspace-session-begin.ts`).

## EXPECTATION
A start inside the Start click unlocks the audio and requests both locks, and a start that fails part-way leaves nothing acquired. A start while a background pre-generation attempt runs aborts it and starts at once, with the phrases already ready that fit the held layout.
