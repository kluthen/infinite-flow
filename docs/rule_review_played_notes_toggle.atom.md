---
id: rule_review_played_notes_toggle
status: REVIEW
type: RULE
priority: 1
parents:
  - [[req_last_session_review]]
dependents:
  - [[module_notation_engraving_anchors]]
  - [[module_review_played_notes_lane]]
layer: BUSINESS
version: 0.1
human_name: Played Notes in the Review on a Toggle
tags: [v2, release-v2.1, review, midi, non-scoring]
---

# Played Notes in the Review on a Toggle

## INTENT
Let the player see what they actually played, as an appreciation rather than a score.

## THE RULE / LOGIC
In the review, the notes the player actually played are optional, shown only when the player turns a toggle on; the generated notes are always shown. When shown, played notes are unquantized and neutrally colored: an appreciation of what was played, never a score. No played note is ever marked as matched or unmatched, by color or by any other sign.

## TECHNICAL INTERFACE
A review toggle shows or hides the played notes beside the generated notes.

## EXPECTATION
- Played notes appear in the review only when the toggle is on.
- Shown played notes are unquantized and neutral; no played note is ever marked as matched or unmatched.
