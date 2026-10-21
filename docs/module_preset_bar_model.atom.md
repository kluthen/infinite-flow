---
id: module_preset_bar_model
status: REVIEW
priority: 1
parents:
  - [[module_preset_model]]
  - [[req_presets]]
  - [[rule_custom_names_its_base]]
  - [[rule_player_preset_names]]
dependents: []
type: MODULE
layer: ARCHITECTURE
version: 0.4
human_name: The Preset Bar Model
tags: [v3, release-v3.1, player-controls, presets]
---

# The Preset Bar Model

## INTENT
Work out everything the preset box and its description line show from the presets and a selection, in one pure place, so the box and the control summary always name the selection the same way.

## THE RULE / LOGIC
The preset bar model is a pure function of the presets the session knows, the eight built-ins then the player's, and a selection. It gives the box's groups in order: Practice (Neutral, Gentle, Speed drill), Styles (Jazz, Bebop, Pop song, Reel, Modal (Dorian)), and Your presets, the player presets in alphabetical order ignoring case, duplicate names listed as they are, the group absent while there are none. Each option is one preset, valued by its id and labelled by its name; a built-in is placed in its group by its fixed id, never by its name, so renaming a built-in moves nothing. Your data lists the player presets in the same Your presets order.

In Custom the model gives one Custom option, the box's value but never in its list, labelled with the preset label, the same text the control summary shows: Custom, based on the base's name, or Custom alone when there is no base or no preset has it. Outside Custom there is no Custom option. The box's full text, for when its width cuts it, is that label or the selected preset's name.

The description, by selection: each built-in its own fixed sentence, keyed by its id; a player preset, Your preset., followed, unless its restriction is any, by Meant for and the restriction in words; Custom based on a built-in, Changed from {name}. Save as a new preset to keep these settings under a name.; Custom based on a player preset, Changed from {name}. Save as a new preset to keep these settings under a name, or save the changes into {name}.; Custom with no base, Your own settings. Save them as a preset to keep them under a name.

The model takes the selection it is given and holds none: during a session the box follows the selection shown, which may turn Custom, while the description is given the selection of the session's start settings, which the session controller exposes, never the selection shown, so it keeps its text and nothing under it moves. It reads no storage, renders nothing and announces nothing.

## TECHNICAL INTERFACE
src/components/controls/preset-bar-model.ts: pure functions over Preset and PresetSelection (src/domain/presets/preset-selection.ts), the preset label (src/domain/controls/preset-label.ts) and the restriction in words (src/domain/presets/key-and-mode-restriction.ts), giving the box's groups and options, the Custom option or none, the full text and the description; playerPresetsInBoxOrder, the player presets alone in the Your presets order, which Your data's preset list uses; RESTRICTION_LABELS, the controls' key and mode labels the restriction in words uses here and in the preset sheet; and the actions row's types, PresetActionsRow (whether the row offers Save changes, Rename preset and Delete preset, and whether the 50-preset limit is reached) and PresetActionKind (the action pressed), the row's content being worked out in src/components/workspace/use-preset-sheet.ts from the player presets composable, the row a session started with kept for its whole length (module_player_presets). src/components/controls/PresetBar.vue, the first row of the control section, renders them as a native select with optgroups and the description field-note, followed by the actions row, src/components/controls/PresetActions.vue, which reports the action pressed upward.

## EXPECTATION
- The groups hold the built-ins in their listed order by id, and Your presets sorted ignoring case, duplicates kept, absent while empty.
- Custom gives one Custom option whose label equals the control summary's preset label; outside Custom there is none.
- Every selection gives its description; a player preset whose restriction is any gives Your preset. alone.
- The same presets and selection always give the same result.
