---
id: rule_suggestion_ignores_restriction
status: DRAFT
type: RULE
layer: BUSINESS
human_name: The Suggestion Meets No Key and Mode Restriction
tags: [v3, release-v3.2, jam, key-and-mode-suggestion, presets]
dependents: []
version: 0.2
priority: 1
parents:
  - [[req_key_and_mode_suggestion]]
---

# The Suggestion Meets No Key and Mode Restriction

## INTENT
Report what the doodle sounds in, bounded by no preset.

## THE RULE / LOGIC
No key and mode restriction bounds or reweights the suggestion's candidates: Jam mode has no presets, so neither the suggestion nor Use it ever meets a preset's restriction, and the suggestion reports what the doodle sounds in.

## TECHNICAL INTERFACE
The suggestion's candidates are computed without any restriction.

## EXPECTATION
- A suggestion may name any of the app's keys and modes.
- Use it never changes a preset selection.
