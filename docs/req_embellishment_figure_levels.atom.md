---
id: req_embellishment_figure_levels
status: DRAFT
type: REQUIREMENT
human_name: Embellishment Figures, Each With a Level
parents:
  - [[user_story_controlled_phrase_generation]]
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.1, generation, player-controls, figures]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents:
  - [[rule_chromatic_notes_need_a_chromatic_figure]]
  - [[rule_embellishment_figures_defined]]
  - [[rule_figure_level_orders_search]]
  - [[rule_figures_resolve_onto_chord_tones]]
  - [[rule_levels_govern_free_figures_only]]
  - [[rule_neutral_and_jazz_figure_levels]]
  - [[rule_vary_settings_figure_step]]
---

# Embellishment Figures, Each With a Level

## INTENT
Let the player choose which decorations the melody uses, and how often, so decorations are actually heard.

## THE RULE / LOGIC
An embellishment (a decoration) is a note, or a small group of notes, that decorates a more important note without changing the chord underneath. From v3.1 the generator can write seven kinds, called figures, as ordinary notes, and the player sets a level for each one: Off, As today, Favored or Strongly favored. A level is a preference that changes the order in which the generator tries notes; it is never a quota. The seven levels are generation settings of the Idle screen like the controls: set at Idle, the review included, locked while a session runs, saved and restored after a reload, held by every preset, and part of what every phrase is generated from. Their first-load values are the Neutral preset's.

## TECHNICAL INTERFACE
Seven figure-level controls, four levels each, sit with the generation controls at Idle and in the review.

## EXPECTATION
- Each of the seven figures has a level of Off, As today, Favored or Strongly favored.
- The levels can be changed at Idle and in the review, never during a session.
- After a reload the levels are those the player last set; at first load they are Neutral's.
