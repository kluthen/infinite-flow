---
id: rule_no_grading_or_mismatch_signal
status: DRAFT
type: RULE
version: 0.1
human_name: No Grading or Mismatch Signal
tags: [v2, release-v2.0, non-scoring, acknowledgement]
layer: BUSINESS
priority: 1
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_notation_note_identity_overlays]]
  - [[rule_acknowledgement_highlights_expected_note_only]]
---

# No Grading or Mismatch Signal

## INTENT
Keep the app encouraging by never penalizing, grading, ranking or scoring the player.

## THE RULE / LOGIC
As a permanent, product-wide constraint, the app never grades, scores, ranks or marks a note as wrong, in any view, at any point. It only ever marks a positive catch: a note played as expected, or, where offered, a measure whose notes fit the harmony. A played note that matches nothing, a wrong pitch, a missed note, silence, or a measure that does not fit produces no visible or audible signal of any kind: there is never a mismatch hint and never an "almost" signal.

## TECHNICAL INTERFACE
No view, notice, export or stored record carries a grade, a score, a ranking, an accuracy figure or a wrong-note mark.

## EXPECTATION
- Across every view, the live session, the review and every export, nothing is ever graded, scored, ranked or marked wrong.
- Only positive acknowledgements ever appear; an unmatched or wrong note changes nothing the player can see or hear.
