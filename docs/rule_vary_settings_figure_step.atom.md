---
id: rule_vary_settings_figure_step
status: DRAFT
type: RULE
layer: BUSINESS
dependents:
  - [[module_settings_mutation]]
version: 0.1
priority: 1
human_name: Vary Settings Moves One Figure One Level
tags: [v3, release-v3.1, session, player-controls, figures]
parents:
  - [[req_embellishment_figure_levels]]
  - [[req_settings_mutation_flag]]
---

# Vary Settings Moves One Figure One Level

## INTENT
Let Vary settings drift the melody's decorations, one small step at a time.

## THE RULE / LOGIC
From v3.1 Vary settings' step for the figures moves one figure one level, up or down, never past Off or Strongly favored. It replaces the earlier flip between Neutral and Jazz, which has no meaning once the figures are settings. The seven levels together take the one place in the draw the musical profile had: the seeded draw picks the setting, then, for the figures, which figure, then the direction, so every other setting drifts as often as before. A figure step never lands on an unsupported rhythm combination, since levels do not affect rhythm.

## TECHNICAL INTERFACE
Vary settings' scale for the figures moves one figure's level one step.

## EXPECTATION
- A figure step changes exactly one figure's level by one level, within Off to Strongly favored.
- No Vary settings step flips between Neutral and Jazz.
- The seven figures together are drawn as one setting.
