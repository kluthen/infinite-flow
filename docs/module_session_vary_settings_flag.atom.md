---
id: module_session_vary_settings_flag
status: REVIEW
type: MODULE
layer: ARCHITECTURE
version: 0.1
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
Keep the player's vary-settings choice for the page's lifetime, changeable only outside a session.

## THE RULE / LOGIC
The controller keeps the vary-settings flag in memory in its state for the page's lifetime: off at load, kept from one session to the next, never persisted. It changes only outside a session, at Idle or while the review shows; changing it during the count-in or a running session throws. A session's start carries the flag as the player's vary-settings choice (varySettings), in place of the engine's settings-mutation flag.

## TECHNICAL INTERFACE
The controller's readonly state includes varySettings, the page's vary-settings flag, in memory for the page's lifetime, and its action setVarySettings(on) throws during the count-in or a running session. The flag is createVarySettingsFlag in src/components/workspace/workspace-session-settings.ts.

## EXPECTATION
The vary-settings flag is off at page load, kept from one session to the next while the page stays open and never persisted; changing it during the count-in or a running session throws.
