---
id: req_presets
status: DRAFT
type: REQUIREMENT
layer: BUSINESS
version: 0.1
human_name: Presets
tags: [v3, release-v3.1, player-controls, presets]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents:
  - [[rule_built_in_preset_values]]
  - [[rule_choosing_preset_sets_its_settings]]
  - [[rule_custom_selection]]
  - [[rule_key_and_mode_restriction]]
  - [[rule_no_preset_leaves_device]]
  - [[rule_player_presets_saved_on_device]]
  - [[rule_preset_contents]]
  - [[rule_preset_management_actions]]
  - [[rule_tension_across_phrases_never_marks_custom]]
  - [[rule_vary_settings_marks_custom]]
priority: 1
parents:
  - [[user_story_controlled_phrase_generation]]
---

# Presets

## INTENT
Let the player choose a whole set of generation settings in one step, and keep the sets they like.

## THE RULE / LOGIC
From v3.1 a preset is a named set of generation settings the player chooses in one step. There are two kinds: built-in presets, the project's own, which the player can use and copy but never change; and player presets, saved by the player under a name of their own. The two musical profiles of earlier versions, Neutral and Jazz, become two of the built-in presets. A preset may carry a key and mode restriction, the keys and modes it is meant for; choosing a restricted preset moves the key and mode inside it, the key and mode controls then highlight what it allows, and nothing is ever blocked. A preset selector lists the built-in presets and the player's own, told apart, and shows the selection: one preset, or Custom.

## TECHNICAL INTERFACE
A preset selector at Idle and in the review lists every preset and shows the current selection.

## EXPECTATION
- The player can choose any built-in or player preset in one step at Idle or in the review.
- Built-in and player presets are told apart wherever they are listed.
