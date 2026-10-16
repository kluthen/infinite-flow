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
dependents: []
type: SERVICE
layer: ARCHITECTURE
human_name: Practice Session Start
version: 0.3
priority: 1
---

# Practice Session Start

## INTENT
Start a practice session synchronously inside the player's Start click, so that it either sets up everything the session needs or leaves nothing acquired.

## THE RULE / LOGIC
Start first looks at phrase 1. Once every start condition holds, it compares the settings phrase 1 was generated under, which the Idle result records, with the current controls, profile selection and, while the controls name my instrument, its profile as saved now, by value, over what the generation reads. When they differ, Start acquires and starts nothing: it opens the stale-phrase prompt, at Idle, fixing as it opens which settings differ and whether the Start click or the starting note opened it; a second Start while it shows asks again and changes nothing. The prompt's Use it closes it and runs the start below inside its own click, unless a start condition no longer holds, when nothing starts; its dismissal closes it, starting nothing; and a start condition that stops holding while it shows closes it as a dismissal. A Start while a start condition fails is refused as before and opens no prompt. When phrase 1 is not stale, the start below runs at once.

Start runs synchronously inside the player's Start click: it first discards the last session's kept review, then freezes the current controls and musical profile as the session's settings, beside the settings phrase 1 was generated under at the session's tempo, which the session start carries and from which the read-only controls are shown through the count-in and phrase 1 (module_session_shown_settings), holds the staff layout the window's width selects and takes from the Idle pre-generation queue the phrases it has ready that fit that layout (the take aborts the background attempt in flight and never waits for it; none when pre-generation is off or nothing is ready); then it unlocks the audio, requests the screen wake lock and the landscape orientation lock (a refusal changes nothing), starts the audio transport and queues phrase 1's backing, opens the session history and starts the session runner, from phrase 1, its session seed and the ready phrases taken, the count-in display, the audio-clock wake-ups and the end watchers; a throw at any step once the locks are requested undoes everything set up and propagates.

## TECHNICAL INTERFACE
The session controller's start action: start (synchronous, for the Start click; throws while a start condition does not hold), returning 'started', or 'asked' when it opened the stale-phrase prompt instead; the prompt's answers useStalePhrase() (inside its click; false when a start condition no longer holds and nothing started) and dismissStalePhrase(), each throwing when no prompt shows; and the prompt itself, the controller state's stalePhrasePrompt, a StalePhrasePrompt { opener: 'start' | 'note', changed } or null. The stale-aware start is createStalePhraseStart in src/components/workspace/workspace-stale-phrase.ts, over the Idle state, the controller's state, its start blocker and its own start; the comparison is staleSettingsOf, with phraseOneSettings, in src/session/stale-phrase-one.ts. The start passes phrase 1's own settings, phraseOneSettings(result.settings, result.intent, tempo), as SessionStart.phraseOneSettings and builds the shown settings from them. It takes the ready phrases through the pre-generation queue's `take(heldLayout)` and passes them to the runner's start as `SessionStart.readyPhrases` (`src/components/workspace/workspace-session-start.ts`, then `workspace-session-begin.ts`).

## EXPECTATION
A start inside the Start click unlocks the audio and requests both locks, and a start that fails part-way leaves nothing acquired. A start while a background pre-generation attempt runs aborts it and starts at once, with the phrases already ready that fit the held layout. With a stale phrase 1 and every start condition holding, Start acquires nothing and opens the stale-phrase prompt; its Use it starts the session inside its click, unless a start condition no longer holds; a blocked start opens no prompt.
