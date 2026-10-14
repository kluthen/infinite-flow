---
id: rule_suggestion_ignores_restriction
status: DRAFT
type: RULE
layer: BUSINESS
human_name: The Suggestion Ignores a Preset's Restriction
tags: [v3, release-v3.2, jam, key-and-mode-suggestion, presets]
dependents: []
version: 0.1
priority: 1
parents:
  - [[req_key_and_mode_suggestion]]
---

# The Suggestion Ignores a Preset's Restriction

## INTENT
Report what the doodle sounds in, whatever preset is selected.

## THE RULE / LOGIC
A preset's key and mode restriction neither bounds nor reweights the suggestion's candidates: the suggestion reports what the doodle sounds in, and a restriction guides, never blocks. Using an answer outside the restriction in force is opting out, like any key or mode chosen by hand: the selection becomes Custom based on the preset.

## TECHNICAL INTERFACE
The suggestion's candidates are computed without the restriction.

## EXPECTATION
- A suggestion may name a key or mode outside the restriction in force.
- Using such an answer makes the selection Custom based on the preset.
