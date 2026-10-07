---
id: rule_saved_settings_load_tolerantly
status: DRAFT
layer: BUSINESS
priority: 1
human_name: Saved Settings Load One by One
parents:
  - [[rule_settings_saved_on_change]]
dependents: []
type: RULE
version: 0.1
tags: [v3, release-v3.0, storage, player-controls]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
---

# Saved Settings Load One by One

## INTENT
Keep every valid saved choice when one saved value no longer makes sense.

## THE RULE / LOGIC
From v3.0, each saved setting is checked on its own when the app loads. A saved value that is unknown or no longer valid falls back to that one setting's default, and every other saved setting is still restored. No notice is shown: the control simply shows the default.

## TECHNICAL INTERFACE
Loading validates each saved setting separately and replaces only an invalid one with its default, before the settings are used.

## EXPECTATION
- A saved value that is unknown or invalid loads as that setting's default.
- Every other saved setting still loads with its saved value.
- No notice is shown for a value that fell back to its default.
