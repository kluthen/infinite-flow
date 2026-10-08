---
id: rule_choosing_preset_sets_its_settings
status: DRAFT
parents:
  - [[req_presets]]
dependents: []
type: RULE
version: 0.1
human_name: Choosing a Preset Sets All Its Settings
tags: [v3, release-v3.1, player-controls, presets]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
layer: BUSINESS
priority: 1
---

# Choosing a Preset Sets All Its Settings

## INTENT
Make choosing a preset a single, complete and predictable step.

## THE RULE / LOGIC
Choosing a preset, from any state, sets all ten preset-held controls and all seven figure levels to the preset's values, replacing any unsaved Custom changes without asking. It never changes the tempo, the instrument or the options for during a session. Like any change of settings at Idle, it leaves the phrase on screen until the player regenerates. A preset can be chosen whenever the controls can be changed: at Idle, the review included, never during a session, and not while a phrase is being generated.

## TECHNICAL INTERFACE
Choosing a preset writes its ten controls and seven levels into the current settings.

## EXPECTATION
- After choosing a preset, the ten controls and seven levels equal the preset's values, whatever the state before.
- The tempo, the instrument and the session options are unchanged, and the phrase on screen stays.
- No preset can be chosen during a session or while a phrase is being generated.
