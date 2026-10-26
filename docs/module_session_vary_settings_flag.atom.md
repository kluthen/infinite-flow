---
id: module_session_vary_settings_flag
status: REVIEW
type: MODULE
layer: ARCHITECTURE
version: 0.3
priority: 1
tags: workspace,session,settings-mutation
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_ephemeral_session_state]]
  - [[rule_vary_settings_needs_legal_move]]
  - [[service_workspace_session_flow]]
dependents: []
human_name: Vary-Settings Flag
---

# Vary-Settings Flag

## INTENT
Hold the player's vary-settings choice for the page's lifetime, from the choice they saved, changeable only outside a session.

## THE RULE / LOGIC
The controller keeps the vary-settings flag in memory in its state for the page's lifetime, kept from one session to the next. The flag enters at the controller's creation, never through its actions, with the player's saved choice loaded before the first draw (off on a first visit). The controller never writes the flag to storage; the player's change handler saves a change the controller accepted. It changes only outside a session, at Idle or while the review shows; changing it during the count-in or a running session throws. A session's start carries the flag as the player's vary-settings choice (varySettings), in place of the engine's settings-mutation flag. The controller also tells whether Vary settings has a move: at Idle and while the review shows, judged live by the settings mutation's legal-move check on the settings a session started now would take, the player's rhythm lock and allowed groups among them, under the context phrase 1 gives at the current window width; with no phrase 1, or while an Idle generation runs, it keeps its last judgement, available before any; during a session it keeps the judgement it had when the session left Idle. It never changes the flag: an unavailable On is only shown off, and a session started meanwhile runs without it.

## TECHNICAL INTERFACE
The controller's readonly state includes varySettings, the page's vary-settings flag, from the player's saved choice and then in memory for the page's lifetime, and its action setVarySettings(on) throws during the count-in or a running session. The flag is createVarySettingsFlag(phase, initialOn) in src/components/workspace/workspace-session-settings.ts, initialOn being the saved choice the controller receives among its dependencies (savedSessionOptions.varySettings). The controller's readonly state includes varySettingsAvailable, from createVarySettingsAvailability(idle, phase, choices) in src/components/workspace/workspace-vary-settings-availability.ts.

## EXPECTATION
The vary-settings flag starts from the player's saved choice (off on a first visit), is kept from one session to the next while the page stays open and is never written to storage by the controller; changing it during the count-in or a running session throws. Vary settings is unavailable exactly while no move exists, judged live outside a session and held during one; the flag is never changed by it.
