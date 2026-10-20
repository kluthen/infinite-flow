---
id: module_preset_model
status: REVIEW
dependents:
  - [[entity_player_preset_record]]
  - [[module_generative_profile_selection]]
  - [[module_profile_control_customization]]
layer: ARCHITECTURE
priority: 1
human_name: The Preset Model
tags: [v3, release-v3.1, presets, player-controls]
parents:
  - [[req_presets]]
  - [[rule_built_in_preset_values]]
  - [[rule_choosing_preset_keeps_allowed_key_and_mode]]
  - [[rule_choosing_preset_sets_its_settings]]
  - [[rule_custom_names_its_base]]
  - [[rule_custom_selection]]
  - [[rule_deleting_base_preset_leaves_custom]]
  - [[rule_key_and_mode_restriction]]
  - [[rule_player_preset_limit]]
  - [[rule_player_preset_names]]
  - [[rule_preset_contents]]
  - [[rule_restriction_in_force]]
  - [[rule_save_changes_restriction]]
  - [[rule_saving_preset_asks_its_restriction]]
type: MODULE
version: 0.2
---

# The Preset Model

## INTENT
Hold every preset rule as pure functions over plain values, apart from storage and the interface, so the preset box, the preset sheet, the saved settings and Vary settings all apply one model.

## THE RULE / LOGIC
A key and mode restriction has two halves, the keys (written keys) and the modes (Collection values), each either any or an ordered list of at least one entry, its first entry the preset's main sound; Major and Ionian are different entries, and so are Minor and Aeolian. A preset has an id, a name, the ten preset-held controls, the seven figure levels (module_figure_levels), a restriction, and its kind, built-in or player. The selection is a preset, named by its id, or Custom, which names the id of the preset it is based on, or none.

The eight built-in presets are known by fixed ids that never change: neutral, jazz, gentle, speed-drill, reel, bebop, pop-song and modal-dorian, holding exactly the built-in values. Their names are working names: a selection and a Custom base hold the id, so a later rename of a built-in breaks neither. A player preset is known by an id taken from an injected id source, never derived from its name, so renaming it keeps it selected and keeps it as Custom's base.

Choosing a preset sets the ten controls and the seven levels to its values and, for each half of its restriction separately, keeps the current written key (or collection) when the half allows it, otherwise sets the half's first listed value; it never changes the tempo, the instrument or the session options, and the selection becomes that preset. Choosing the preset already selected, outside Custom, changes nothing; from Custom, choosing its base applies it like any other preset.

With a preset selected, changing a preset-held setting, or choosing a written key or collection outside the restriction in force, makes the selection Custom based on that preset; Custom stays Custom with the same base. Values are never compared with the preset's, and only choosing a preset leaves Custom. Changing the tempo or the instrument never makes Custom, nor does a key or mode inside the restriction in force. The restriction in force is worked out, never stored: the selected preset's restriction, or in Custom its base's, while the current written key and collection are both inside it; otherwise none, and Custom with no base has none. Deleting the selected player preset, or Custom's base, leaves Custom with no base and the same values.

Saving as new offers three restriction choices, the first the default: as now (the restriction in force, or any when none is), only the current written key and collection, and any key and mode; choices that would mean the same restriction are one, keeping the default. Saving changes into a player preset asks for its restriction only when the current written key or collection lies outside that preset's restriction, offering any key and mode (as now) and only the current key and mode; inside it, the preset keeps its restriction. A name is trimmed, of 1 to 40 characters, unique among all presets ignoring case, the built-in names included and the preset being renamed excepted, and never Custom in any letter case; a refused name gives its reason, the first that applies of empty, too long, reserved and taken. A new preset's suggested name is My preset, then My preset 2, My preset 3 and so on, the first no preset has, ignoring case. Uniqueness is checked only when saving or renaming. Saving a new player preset is refused while 50 or more are loaded. The restriction is also put in words, as the preset sheet and the preset's description line write it (Mixolydian or Dorian in any key, only G Dorian).

The model is pure: it reads and writes no storage, renders nothing, and reads no clock or random source beyond the injected id source.

## TECHNICAL INTERFACE
src/domain/presets/: key-and-mode-restriction.ts (KeyAndModeRestriction, membership, the restriction in words), built-in-presets.ts (the eight built-ins by fixed id), preset-selection.ts (Preset, PresetSelection, choosing, Custom, the restriction in force, deleting), preset-names.ts (name checks, the suggested name, the 50-preset limit) and preset-save-choices.ts (the save-as-new and save-changes restriction choices). The figure levels' type comes from src/domain/figures/figure-levels.ts. Nothing under src/domain/presets/ imports storage or interface code.

## EXPECTATION
- The eight built-ins hold exactly the built-in values, field by field, under their fixed ids, and each is a supported rhythm setting at its density and, at Sixteenth, stepped down to Eighth.
- Choosing a preset gives the key and mode moves of the five worked examples; a preset whose restriction is any never moves the key or mode, Neutral and Jazz included, from every key and mode.
- A preset-held change makes Custom; the tempo, the instrument, and a key or mode inside the restriction in force never do; a value changed back stays Custom; only choosing a preset leaves Custom.
- The restriction in force follows from the selection and the current written key and collection alone, and none is in force once either leaves it.
- Deleting the selected player preset or Custom's base leaves Custom with no base and the same values.
- Every refused name gives its reason; the suggested name skips names taken in any letter case; a new save is refused with 50 player presets loaded, and with 60.
- The save choices merge choices that mean the same restriction, and saving changes asks for the restriction only outside the preset's own.
