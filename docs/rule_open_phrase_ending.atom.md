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
The four-bar phrase ends open so the player can continue playing. Local dissonances, appoggiaturas, jazz approaches, and jazz enclosures resolve before the final sounding event. When generated tonal motion ends on dominant, the final event is a dominant chord tone. With static tonic prolongation or modal material, the final event is a profile-approved non-final tonic-area continuation such as scale degree 5, never an asserted tonic closure.

## TECHNICAL INTERFACE
Generated phrase endings are rendered as part of the final measure.

## EXPECTATION
No first-release generated phrase concludes with a closed tonic ending. Its final sounding event follows the active harmonic or modal open-ending policy and has no unresolved local dissonance.
