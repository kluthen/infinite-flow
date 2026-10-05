---
id: module_session_shown_settings
status: DRAFT
human_name: Session Shown Settings
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_session_change_applies_at_phrase_boundary]]
  - [[rule_session_settings_locked]]
  - [[service_workspace_session_flow]]
dependents: []
type: MODULE
tags: workspace,session,settings-mutation
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
layer: ARCHITECTURE
version: 0.1
priority: 1
---

# Session Shown Settings

## INTENT
Show during a session the settings the phrase now sounding was generated with, and give the player's own settings back to the controls at every end.

## THE RULE / LOGIC
The controller publishes the settings shown: during the count-in the session's start settings, the player's own, then those the phrase now sounding was generated with. Each settings-changed output is kept until the first phrase it applies to, or a later one, starts sounding as a generated phrase, on the audio clock, and the shown settings become its settings then; a repeated phrase shows nothing new. The session never writes the player's Idle controls or profile selection: at every end the teardown drops the shown settings, so the controls show the player's own choices again, a Varying register and the profile's customized marking included, before Idle is asked for the end's fresh phrase, which is generated from them.

## TECHNICAL INTERFACE
The controller's readonly state includes shownSettings, the settings the read-only controls show during a session (its start settings during the count-in, then those the phrase now sounding was generated with), null outside a session. The shown settings are createSessionShownSettings in src/components/workspace/workspace-session-settings.ts.

## EXPECTATION
The read-only controls show the session's start settings during the count-in, then the settings the phrase now sounding was generated with, a repeated phrase showing nothing new; at every end they show the player's own choices again before Idle's fresh phrase is generated from them.
