---
id: rule_played_notes_export_omits_stray_notes
status: REVIEW
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, export, midi]
dependents:
  - [[module_review_export_pipeline]]
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
