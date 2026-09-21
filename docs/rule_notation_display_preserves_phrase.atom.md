---
id: rule_notation_display_preserves_phrase
status: DRAFT
human_name: Notation Display Preserves Phrase
type: RULE
priority: 1
tags: notation,transposition,display
parents:
  - [[req_four_measure_phrase]]
dependents: []
layer: BUSINESS
version: 0.1
---

# Notation Display Preserves Phrase

## INTENT
Allow notation transposition changes without changing the generated phrase.

## THE RULE / LOGIC
Standard staff notation is rendered from the concert-pitch event timeline. Concert, B-flat, and E-flat are display modes only; switching modes never changes generated pitches, harmony, seed, or active range policy.

## TECHNICAL INTERFACE
The player selects Concert, B-flat, or E-flat notation display for a generated phrase.

## EXPECTATION
Changing notation display mode changes written display values only and leaves the original phrase identical.
