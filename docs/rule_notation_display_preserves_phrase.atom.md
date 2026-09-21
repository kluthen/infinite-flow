---
id: rule_notation_display_preserves_phrase
status: DRAFT
human_name: Notation Display Preserves Phrase
type: RULE
priority: 1
tags: notation,transposition,display
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_notation_display_convention]]
layer: BUSINESS
version: 0.1
---

# Notation Display Preserves Phrase

## INTENT
Allow notation transposition changes without changing the generated phrase.

## THE RULE / LOGIC
Standard staff notation is rendered from the concert-pitch event timeline. Concert, B-flat, and E-flat are display modes only, with B-flat selected on first load. Switching modes never changes generated pitches, harmony, seed, or active range policy. Tonal-center labels and written notation use sharp or flat spelling appropriate to the selected tonal center and collection.

## TECHNICAL INTERFACE
The player selects Concert, B-flat, or E-flat notation display for a generated phrase; B-flat is the initial display selection.

## EXPECTATION
B-flat notation is selected on first load. Changing notation display mode changes only written display values, including context-appropriate spellings, and leaves the original phrase identical.
