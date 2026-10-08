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
tags: [v3, release-v3.0, storage, player-controls, changes-in-v3.2]
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): the five new settings load tolerantly with their defaults (Jam off, drift Near, lock off, every allowed rhythm change off, all six groups on), and settings saved by v3.0 or v3.1 load with those defaults. Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
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
