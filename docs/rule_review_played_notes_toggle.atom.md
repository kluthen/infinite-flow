---
id: rule_review_played_notes_toggle
status: STABLE
type: RULE
priority: 1
parents:
  - [[req_last_session_review]]
dependents:
  - [[module_notation_engraving_anchors]]
  - [[module_review_played_notes_lane]]
layer: BUSINESS
version: 0.2
human_name: Played Notes in the Review on a Toggle
tags: [v2, release-v2.0, part-v2.1, review, midi, non-scoring]
notes: Revised 2026-10-08 to version 0.2 (previous version 0.1) with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A16), together with the CONTRACT 3.0 MAJOR bump; stays STABLE. Clarification: a Jam's review opens with an always-shown doodle section engraved from the quantized doodle, which is not played notes; the doodle's raw notes stay behind the toggle, unquantized. Nothing weakens for played notes.
---

# Played Notes in the Review on a Toggle

## INTENT
Let the player see what they actually played, as an appreciation rather than a score.

## THE RULE / LOGIC
In the review, the notes the player actually played are optional, shown only when the player turns a toggle on; the generated notes are always shown. When shown, played notes are unquantized and neutrally colored: an appreciation of what was played, never a score. No played note is ever marked as matched or unmatched, by color or by any other sign. A Jam's review also opens with a doodle section engraved from the quantized doodle. That section is a generation input the app used, always shown and never marked, not the player's played notes, which stay behind the toggle and unquantized, the doodle's raw notes included.

## TECHNICAL INTERFACE
A review toggle shows or hides the played notes beside the generated notes.

## EXPECTATION
- Played notes appear in the review only when the toggle is on.
- Shown played notes are unquantized and neutral; no played note is ever marked as matched or unmatched.
- A Jam's doodle section, engraved from the quantized doodle, is not played notes; the doodle's raw notes appear only with the toggle on, unquantized.
