---
id: rule_chromatic_notes_need_a_chromatic_figure
status: DRAFT
dependents: []
layer: BUSINESS
priority: 1
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
type: RULE
version: 0.1
human_name: Chromatic Notes Come Only From Chromatic Figures
tags: [v3, release-v3.1, generation, figures]
parents:
  - [[req_embellishment_figure_levels]]
---

# Chromatic Notes Come Only From Chromatic Figures

## INTENT
Let the player decide whether notes from outside the key appear, from any preset.

## THE RULE / LOGIC
A note from outside the selected key and mode enters a melody only as a chromatic approach or a chromatic enclosure. With both of those figures Off, a phrase holds no such note. Being entirely diatonic is therefore a property of the figure levels, not of a preset: from v3.1 the player may turn the chromatic figures on from Neutral or from any other preset.

## TECHNICAL INTERFACE
The result check refuses a chromatic note unless a chromatic figure that is not Off accounts for it.

## EXPECTATION
- With the chromatic approach and the chromatic enclosure both Off, no generated melody note lies outside the selected key and mode.
- Turning either chromatic figure on is possible from every preset.
