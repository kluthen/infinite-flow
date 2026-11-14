---
id: module_seventh_chords_level_options
status: DRAFT
layer: ARCHITECTURE
version: 0.1
tags: [v3, release-v3.3, player-controls, chords]
parents:
  - [[module_jam_settings]]
  - [[module_profile_control_customization]]
  - [[req_seventh_chords_level]]
  - [[rule_custom_selection]]
  - [[rule_jam_has_own_seventh_chords_level]]
  - [[rule_pregeneration_discarded_on_change]]
  - [[rule_session_settings_locked]]
human_name: The Seventh Chords Control's Option Model
type: MODULE
priority: 1
dependents: []
---

# The Seventh Chords Control's Option Model

## INTENT
Give the Seventh chords level one option model, shared by session mode's control and Jam's, so both offer the same four steps under the same words and every change of the level reaches generation the way any setting change of its mode does.

## THE RULE / LOGIC
The option model is pure data: one list of four options, in the level's increasing order, each valued by a level id and labelled for the player: off is labelled Off, sometimes Sometimes, favored Often and stronglyFavored Always. The labels belong to the interface and can change without touching the level ids, which the generation request, the replay key and the stored records hold. The list is the Seventh chords level's own and never the figure levels' list (Off, Rarely, Often, Very often), even where a label is the same.

Every option is always selectable: the model disables no option and refuses no level.

Session mode's control sits in the foundation group, after Harmonic motion and before Tension, as a four-segment control with a figure level's look and keyboard behaviour and a note the control names as its description. A change goes through the Idle session's one level action for the chord families, the routing point every edit of a generation setting at Idle goes through (module_profile_control_customization): with a preset selected the selection becomes Custom based on it, the change is saved like any other setting, and since the level is part of the pre-generation queue's key (module_idle_pregeneration_queue) a change discards every pre-generated phrase without the control calling the queue. The phrase on screen stays: a change never regenerates it. The control holds no level of its own: it shows the level the session holds, editable at Idle and in the review mode, read-only during Loading and a session.

Jam's control reuses the same option model and the same note, in Jam's own Foundation group after Harmonic motion. A change there is a change of Jam's own settings (module_jam_settings), made at Jam's Idle only and read-only during a Jam; it never reaches session mode's level, and session mode's control never reaches Jam's.

## TECHNICAL INTERFACE
src/components/controls/control-options.ts: seventhChordsOptions, the option model, four options (level id and label) in the order of CHORD_FAMILY_LEVEL_IDS (src/domain/chords/chord-families.ts), pinned apart from the figure levels' options (src/components/controls/figure-level-options.ts) by a unit test. src/components/controls/FoundationControls.vue renders session mode's control and its note and emits the chosen level, which reaches the Idle session's setChordFamilyLevel (src/composables/generation-session-control-actions.ts) for the seventh-chords family. src/jam/JamControls.vue renders Jam's control from the same seventhChordsOptions and note, its change going to Jam's settings store (src/jam/jam-settings.ts, through src/components/workspace/use-jam-settings.ts).

## EXPECTATION
- The model offers exactly four options, in the order off, sometimes, favored, stronglyFavored, labelled Off, Sometimes, Often, Always, and is not the figure levels' list.
- No option is ever disabled by the model.
- A change of session mode's level reaches the Idle session's level action: with a preset selected the selection becomes Custom based on it, every pre-generated phrase is discarded when the level differs from the one held, and the phrase on screen stays.
- Session mode's control is editable at Idle and in the review mode and read-only during Loading and a session; Jam's control is editable at Jam's Idle only.
- Jam's control shows the same four options and note as session mode's, and a change of either mode's level never changes the other's.
- The model reads no storage, session or rendering state.
