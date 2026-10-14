---
id: module_session_vary_settings_flag
status: REVIEW
type: MODULE
layer: ARCHITECTURE
version: 0.2
priority: 1
tags: workspace,session,settings-mutation
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_ephemeral_session_state]]
  - [[service_workspace_session_flow]]
dependents: []
human_name: Vary-Settings Flag
---

# Vary-Settings Flag

## INTENT
Hold the player's vary-settings choice for the page's lifetime, from the choice they saved, changeable only outside a session.

## THE RULE / LOGIC
The controller keeps the vary-settings flag in memory in its state for the page's lifetime, kept from one session to the next. The flag enters at the controller's creation, never through its actions, with the player's saved choice loaded before the first draw (off on a first visit). The controller never writes the flag to storage; the player's change handler saves a change the controller accepted. It changes only outside a session, at Idle or while the review shows; changing it during the count-in or a running session throws. A session's start carries the flag as the player's vary-settings choice (varySettings), in place of the engine's settings-mutation flag.

## TECHNICAL INTERFACE
The controller's readonly state includes varySettings, the page's vary-settings flag, from the player's saved choice and then in memory for the page's lifetime, and its action setVarySettings(on) throws during the count-in or a running session. The flag is createVarySettingsFlag(phase, initialOn) in src/components/workspace/workspace-session-settings.ts, initialOn being the saved choice the controller receives among its dependencies (savedSessionOptions.varySettings).

## EXPECTATION
The vary-settings flag starts from the player's saved choice (off on a first visit), is kept from one session to the next while the page stays open and is never written to storage by the controller; changing it during the count-in or a running session throws.
