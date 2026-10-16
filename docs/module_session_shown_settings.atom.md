---
id: module_session_shown_settings
status: REVIEW
human_name: Session Shown Settings
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_session_change_applies_at_phrase_boundary]]
  - [[rule_session_settings_locked]]
  - [[rule_stale_phrase_prompt_at_start]]
  - [[service_workspace_session_flow]]
dependents: []
type: MODULE
tags: workspace,session,settings-mutation
layer: ARCHITECTURE
version: 0.3
priority: 1
---

# Session Shown Settings

## INTENT
Show during a session the settings of the music on screen and sounding, phrase 1's own settings until phrase 2, and give the player's own settings back to the controls at every end.

## THE RULE / LOGIC
The controller publishes the settings shown: during the count-in and while phrase 1 sounds, the settings phrase 1 was generated with, carried by the session start (phrase 1's first measure is on screen through the count-in), with one exception: the musical profile preset always shows the player's selection as it was when they pressed Start, never phrase 1's, even when the profile is one of the settings phrase 1 differs in, changing only as an automatic change changes it; every other setting, the Written key included, shows phrase 1's value; then, from phrase 2, those the phrase now sounding was generated with. Phrase 1's settings are the session's start settings, the player's own, except when phrase 1 is stale and the player chose to use it: the shown settings then become the session's settings when the first generated phrase after phrase 1 starts sounding, on the audio clock, as at any change. Each settings-changed output is kept until the first phrase it applies to, or a later one, starts sounding as a generated phrase, on the audio clock, and the shown settings become its settings then; a repeated phrase shows nothing new. The session never writes the player's Idle controls or profile selection: at every end the teardown drops the shown settings, so the controls show the player's own choices again, a Varying register and the profile's customized marking included, before Idle is asked for the end's fresh phrase, which is generated from them.

## TECHNICAL INTERFACE
The controller's readonly state includes shownSettings, the settings the read-only controls show during a session (phrase 1's own settings, carried by the session start, during the count-in and phrase 1, then those the phrase now sounding was generated with), null outside a session. The shown settings are createSessionShownSettings(phraseOne, session) in src/components/workspace/workspace-session-settings.ts: the start (src/components/workspace/workspace-session-start.ts) gives phrase 1's own settings with the session's profile selection, and the session's settings, pending from phrase 2 when they are other settings.

## EXPECTATION
- The read-only controls show the settings phrase 1 was generated with during the count-in and phrase 1, then the settings the phrase now sounding was generated with, a repeated phrase showing nothing new.
- After a stale phrase 1 is used, they show phrase 1's own settings during the count-in and phrase 1, and the session's settings from the first generated phrase after it; the musical profile preset shows the player's selection throughout, never phrase 1's.
- At every end they show the player's own choices again before Idle's fresh phrase is generated from them.
