---
id: rule_vary_settings_marks_custom
status: REVIEW
dependents:
  - [[module_settings_mutation]]
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: Vary Settings Marks Custom for the Session
tags: [v3, release-v3.1, session, player-controls, presets]
parents:
  - [[req_presets]]
  - [[req_settings_mutation_flag]]
---

# Vary Settings Marks Custom for the Session

## INTENT
Keep the selection truthful while Vary settings moves preset-held settings, and give the player's own back afterwards.

## THE RULE / LOGIC
A Vary settings move of a preset-held setting, one of the ten controls or a figure level, marks the selection Custom for that session; moves of Tension, Leapiness and Arpeggio chaos therefore mark it too. When the session ends, the selection and every mutated setting return to the player's own. Key and mode moves never mark Custom, and Vary settings never switches preset.

## TECHNICAL INTERFACE
Vary settings updates the selection's Custom mark during a session; session end restores it.

## EXPECTATION
- A move of any of the ten controls or a figure level marks the selection Custom during the session.
- A key or mode move never does.
- After the session the selection and every mutated setting are the player's own again.
