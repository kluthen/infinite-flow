---
id: module_profile_control_customization
status: REVIEW
type: MODULE
priority: 1
parents:
  - [[module_preset_model]]
  - [[rule_custom_names_its_base]]
  - [[rule_custom_selection]]
  - [[rule_profile_control_customization]]
  - [[rule_restriction_in_force]]
version: 1.2
dependents:
  - [[module_figure_level_options]]
human_name: The Routing Point That Decides Custom
layer: ARCHITECTURE
tags: [v3, release-v3.1, presets, player-controls, profile]
---

# The Routing Point That Decides Custom

## INTENT
Decide in one place, for every edit of a generation setting at Idle, whether the selection becomes Custom, so the preset box, the saved settings and the session all see the same selection.

## THE RULE / LOGIC
Every edit of a generation setting at Idle goes through one routing point. It works out the selection after the edit with the preset model (module_preset_model), never by comparing values with the preset's, then applies the new settings and the new selection together and hands what changed to the settings saver.

- A change of any of the ten preset-held controls (harmonic motion, Tension, note density, rhythmic variety, syncopation, silence density, contour, register, Leapiness and Arpeggio chaos) makes Custom.
- A change of one figure's level, through its own action, makes Custom.
- A change of the written key or of the collection makes Custom only when the new key and collection lie outside the restriction in force (opting out); inside it, the selection stays.
- The tempo never makes Custom.
- The instrument switch does not go through this point, which refuses the instrument, and never makes Custom.

With a preset selected, Custom is based on that preset. Custom stays Custom with the same base, a value changed back stays Custom, and only choosing a preset leaves it (module_generative_profile_selection). The phrase on screen stays after every edit. An edit of a setting the phrase is generated from, every one but the tempo, reacts under the too-many-notes or no-room notice as any change does, starting a round or a room check, and one that changes the rhythm setting posts a prewarm. Edits apply only at Idle.

## TECHNICAL INTERFACE
src/composables/generation-session-control-actions.ts: setControl(key, value), the new setFigureLevel(figure, level), and selectPreset each end in applyChosen, which sets the state's controls, figureLevels and selection together and saves what changed (chosenControlChanges, src/storage/settings-saver.ts). The selection after an edit comes from selectionAfterChange, and the restriction in force from restrictionInForce, in src/domain/presets/preset-selection.ts, over the presets the session knows. setControl refuses instrumentProfileId; the instrument switch is src/composables/generation-session-profile-switch.ts, outside the routing point. The reactions are afterGenerationSettingChange (src/composables/generation-session-room-notice.ts) and the rhythm prewarm.

## EXPECTATION
- With a preset selected, a change of any of the ten preset-held controls or of a figure level makes Custom based on it, and so does a key or mode outside the restriction in force.
- The tempo, the instrument, and a key or mode inside the restriction in force never make Custom.
- A value changed back stays Custom; only choosing a preset leaves it.
- Every edit keeps the phrase on screen and hands what it changed to the settings saver.
