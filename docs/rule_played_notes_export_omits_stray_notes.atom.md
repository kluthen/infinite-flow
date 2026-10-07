---
id: rule_played_notes_export_omits_stray_notes
status: DRAFT
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, export, midi]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents: []
version: 0.1
priority: 1
human_name: Played-Notes Export Omits Stray Notes by Default
parents:
  - [[req_played_notes_export]]
  - [[rule_stray_notes_filtered_on_reading]]
---

# Played-Notes Export Omits Stray Notes by Default

## INTENT
Give the player a clean played-notes file by default, with the raw one still within reach.

## THE RULE / LOGIC
From v3.0, the played-notes export leaves very short notes out by default and offers an option to include them. The review's Played notes lane follows the default and has no switch of its own.

## TECHNICAL INTERFACE
The played-notes export offers an include-very-short-notes option, off by default.

## EXPECTATION
- By default the played-notes file holds no very short note.
- With the option chosen, it holds them too.
