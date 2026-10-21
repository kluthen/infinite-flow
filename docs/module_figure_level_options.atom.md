---
id: module_figure_level_options
status: STABLE
tags: [v3, release-v3.1, player-controls, figures]
dependents: []
type: MODULE
layer: ARCHITECTURE
version: 0.2
priority: 1
human_name: The Figure Level Controls' Option Model
parents:
  - [[module_figure_levels]]
  - [[module_profile_control_customization]]
  - [[req_embellishment_figure_levels]]
  - [[rule_custom_selection]]
  - [[rule_pregeneration_discarded_on_change]]
---

# The Figure Level Controls' Option Model

## INTENT
Give the Embellishments group's seven level controls one option model and one change path, so every figure offers the same four levels and every level change reaches generation the way any setting change does.

## THE RULE / LOGIC
The option model is pure data: for each of the seven figures, in the fixed figure order (module_figure_levels), its four options, each valued by a level id and labelled for the player: off is labelled Off, asToday Rarely, favored Often and stronglyFavored Very often. The labels belong to the interface and can change without touching the level ids, which the generation request, the replay key and the stored records hold.

Every option of every figure is always selectable, in any combination, every figure Off included: the model disables no option and refuses no level.

A level change goes through the Idle session's one figure-level action, setFigureLevel, the routing point every edit of a generation setting at Idle goes through (module_profile_control_customization). With a preset selected the selection becomes Custom based on it, and the change is saved like any other setting. The seven levels are part of the pre-generation queue's key (module_idle_pregeneration_queue), so a level change discards every pre-generated phrase without the controls calling the queue. Choosing the level a figure already has is still a level change, as a re-click of any control group's checked segment is: with a preset selected it makes Custom based on it, and it discards nothing, since the key holds the levels and the restriction in force, never the selection. The phrase on screen stays: a level change never regenerates it.

The controls hold no level of their own: they show the levels the session holds, editable at Idle and in the review mode, read-only during Loading and a session, where a Vary settings figure step shows as that figure's level changing in place.

## TECHNICAL INTERFACE
src/components/controls/figure-level-options.ts: the option model, one list of four options (level id and label) per figure id, in the figure order, built from the figure and level ids of src/domain/figures/figure-levels.ts. src/components/controls/EmbellishmentControls.vue renders the group, one segmented control per figure, and emits a figure id with a level id, the checked segment's own level included; src/components/controls/ControlPanel.vue forwards that event as set-figure-level; src/components/workspace/WorkspaceShell.vue hands it to the setFigureLevel of its control-panel actions (useControlPanelActions, src/components/workspace/use-control-panel-actions.ts), which calls the Idle session's setFigureLevel (src/composables/generation-session-control-actions.ts).

## EXPECTATION
- Each of the seven figures offers exactly four options, in the order off, asToday, favored, stronglyFavored, labelled Off, Rarely, Often, Very often.
- No option of any figure is ever disabled by the model, every figure Off included.
- A level change reaches setFigureLevel: with a preset selected the selection becomes Custom based on it, every pre-generated phrase is discarded when the level differs from the one held, and the phrase on screen stays.
- The model reads no storage, session or rendering state.
