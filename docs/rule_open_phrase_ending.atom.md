---
id: rule_open_phrase_ending
status: DRAFT
human_name: Open Phrase Ending
type: RULE
version: 0.1
priority: 2
layer: BUSINESS
tags: phrase-ending,continuation
parents:
  - [[req_four_measure_phrase]]
dependents: []
---

# Open Phrase Ending

## INTENT
End every first-release phrase with an open continuation rather than a closed tonic cadence.

## THE RULE / LOGIC
The four-bar phrase ends open so the player can continue playing. A closed tonic ending is not a first-release outcome.

## TECHNICAL INTERFACE
Generated phrase endings are rendered as part of the final measure.

## EXPECTATION
No first-release generated phrase concludes with a closed tonic ending.
