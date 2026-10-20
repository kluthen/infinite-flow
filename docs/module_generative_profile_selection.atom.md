---
id: module_generative_profile_selection
status: REVIEW
priority: 1
version: 1.3
dependents: []
tags: [v3, release-v3.1, presets, player-controls, profile]
parents:
  - [[module_preset_model]]
  - [[rule_choosing_preset_keeps_allowed_key_and_mode]]
  - [[rule_choosing_preset_sets_its_settings]]
  - [[rule_preset_contents]]
  - [[rule_selectable_generative_profiles]]
human_name: Preset Choice in the Session State
type: MODULE
layer: ARCHITECTURE
---

# Preset Choice in the Session State

## INTENT
Hold the player's generation settings as controls, figure levels and a preset selection, and let choosing a preset replace them in one step, so no musical profile is held anywhere in the session.

## THE RULE / LOGIC
The workspace's Idle generation session holds the player's generation settings in three parts: the controls (the generation controls, the written key and the collection among them), the seven figure levels, and the preset selection, a preset named by its id or Custom naming the preset it is based on, or none, as the preset model defines it (module_preset_model). No musical profile and no customized mark is held. A session's settings have the same three parts, frozen at Start, beside my instrument's profile when the controls name it and the restriction in force at Start when there is one; Tension, Leapiness and Arpeggio chaos are among the ten preset-held controls, so they are held, marked and restored with the rest. The generation request takes its figure levels from these settings, never from a profile's or a preset's name. A kept session's preset label is taken from the selection the session started with.

Choosing a preset at Idle is one action in place of the musical-profile switch. It applies the preset model's choice to the current settings: the ten preset-held controls and the seven levels take the preset's values; each half of its restriction keeps the current written key, or collection, when it allows it and otherwise sets its first listed value; the tempo, the instrument and the session options never change; and the selection becomes that preset. Choosing the preset already selected, outside Custom, changes nothing; from Custom, choosing its base applies it. The phrase on screen stays. What the choice changed is saved, as any edit's change is (module_profile_control_customization), and a choice that changes a setting the phrase is generated from reacts as any such edit does: a prewarm when the rhythm setting changed, and under the too-many-notes or no-room notice a round or a room check.

The presets the session chooses from are the eight built-ins, then the player presets read with the settings at start-up; the list never changes during a session. Until the preset bar, the existing two-segment control chooses the Neutral and Jazz built-ins through this action, and the other built-ins are reached through the harness.

## TECHNICAL INTERFACE
src/composables/generation-session-types.ts: GenerationSessionState and InitialGenerationSettings hold controls, figureLevels and selection (PresetSelection, src/domain/presets/preset-selection.ts) in place of profileSelection, GenerationSessionState also the presets the session knows (presets, the built-ins then InitialGenerationSettings.playerPresets), and GenerationSessionActions offers selectPreset in place of selectMusicalProfile, implemented in src/composables/generation-session-control-actions.ts over the preset model's choosePreset and applied through the one routing point's applyChosen. src/session/session-types.ts: SessionSettings is { controls, figureLevels, selection, instrumentProfile?, restriction? }, frozen by freezeSessionSettings (src/session/session-intents.ts). src/domain/controls/profile-selection.ts no longer offers a profile switch or a customized edit (applyMusicalProfile and applyControlledCustomValue go); it keeps the first-load controls, and v3.0's profile shape and bundles only for the storage code that reads and upgrades v3.0's data: the kept-session codec's data version 1 readers and the step to data version 3.

## EXPECTATION
- Choosing Neutral or Jazz sets the ten preset-held controls and the seven levels to that preset's values: from Tension at Build, Neutral sets Lift; the tempo, the instrument and the session options never change; the phrase on screen stays.
- Choosing Reel from A Aeolian lands on A Mixolydian; from A Dorian nothing moves.
- Choosing the preset already selected, outside Custom, changes nothing; from Custom, choosing its base applies it.
- Neither the Idle state nor a session's settings hold a musical profile or a customized mark, and the request's figure levels are the settings' own.
