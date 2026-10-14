---
id: rule_tension_across_phrases_never_marks_custom
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
parents:
  - [[req_multi_phrase_tension_arc]]
  - [[req_presets]]
dependents: []
version: 0.1
human_name: Tension Across Phrases Never Marks Custom
tags: [v3, release-v3.1, session, tension, presets]
---

# Tension Across Phrases Never Marks Custom

## INTENT
Keep the selection unchanged by an option that varies what phrases are generated with, not the settings.

## THE RULE / LOGIC
Tension across phrases changes only what each phrase is generated with, never the Tension setting, so it never marks the selection Custom, although Tension is now preset-held. It does not change the figure levels: a tenser phrase gets Tension's tenser scheduled figure, not more free figures.

## TECHNICAL INTERFACE
Tension across phrases leaves the selection and the figure levels untouched.

## EXPECTATION
- Tension across phrases never marks Custom.
- A tenser phrase is generated with the same figure levels as the others.
