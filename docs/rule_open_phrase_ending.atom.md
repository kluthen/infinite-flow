---
id: rule_open_phrase_ending
status: DRAFT
human_name: Open Phrase Ending
type: RULE
version: 0.3
priority: 2
layer: BUSINESS
tags: phrase-ending,continuation
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_harmony_candidate_domain]]
  - [[rule_join_tense_note_resolution]]
notes: Revised 2026-09-29 for v2 sessions (previous version 0.1). Version 0.2 lets a phrase generated with carry-in end on a tense note that the next phrase generated with that carry-in resolves on its first note, the tense note staying unresolved when no such phrase follows; the owner approved that text on 2026-09-29. Version 0.3 applies the owner's approval of the same date to widen the intent from every first-release phrase to every generated phrase, matching the expectation. Status stays DRAFT.
---

# Open Phrase Ending

## INTENT
End every generated phrase with an open continuation rather than a closed tonic cadence.

## THE RULE / LOGIC
The four-bar phrase ends open so the player can continue playing. Local dissonances, appoggiaturas, jazz approaches, and jazz enclosures resolve before the final sounding event. When generated tonal motion ends on dominant, the final event is a dominant chord tone. With static tonic prolongation or modal material, the final event is a profile-approved non-final tonic-area continuation such as scale degree 5, never an asserted tonic closure. In a session, a phrase generated with carry-in may instead end on a tense note (a scale tone outside the final chord) whose resolution the next phrase generated with that carry-in makes on its first note. If no phrase generated with that carry-in follows (the session ends, or the next phrase is a standalone or repeated phrase), the tense note stays unresolved.

## TECHNICAL INTERFACE
Generated phrase endings are rendered as part of the final measure.

## EXPECTATION
No generated phrase concludes with a closed tonic ending. The final sounding event of a phrase generated without carry-in follows the active harmonic or modal open-ending policy and has no unresolved local dissonance; a phrase generated with carry-in may instead end on a tense note that the next phrase generated with that carry-in resolves on its first note.
