---
id: rule_suggestion_same_doodle_same_answer
status: DRAFT
tags: [v3, release-v3.2, jam, key-and-mode-suggestion, determinism]
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: The Same Doodle Always Gives the Same Suggestion
parents:
  - [[rule_suggestion_candidates]]
---

# The Same Doodle Always Gives the Same Suggestion

## INTENT
Make the suggestion repeatable for a doodle while still varying between doodles.

## THE RULE / LOGIC
When several candidates are kept, the suggestion is a weighted draw among them, so the likeliest answer comes up most often. The draw is made in whole numbers only and seeded by the quantized doodle alone, so the same doodle always gives the same suggestion, across sessions and reloads, in every supported browser; two live doodles are practically never identical, so the draw still varies.

## TECHNICAL INTERFACE
The suggestion's draw is seeded by a hash of the quantized doodle.

## EXPECTATION
- The same quantized doodle gives the same suggestion in Chrome and Edge, on any machine, across sessions and reloads.
