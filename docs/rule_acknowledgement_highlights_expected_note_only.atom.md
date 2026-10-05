---
id: rule_acknowledgement_highlights_expected_note_only
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
tags: [v2, release-v2.0, midi, acknowledgement, non-scoring]
dependents:
  - [[module_notation_note_identity_overlays]]
  - [[module_session_note_acknowledgement]]
  - [[module_session_staff_overlays]]
  - [[service_workspace_session_flow]]
human_name: Only the Matched Expected Note Lights Up
parents:
  - [[rule_acknowledgement_exact_pitch]]
  - [[rule_no_grading_or_mismatch_signal]]
---

# Only the Matched Expected Note Lights Up

## INTENT
Mark only a positive catch in the live view, never what the player actually played.

## THE RULE / LOGIC
On a successful match, only the expected note itself lights up on screen, with a theme-colored highlight; there is no sound cue and no animation. The note that was actually played is never rendered anywhere in the live view. A note that is not matched, or is played at the wrong pitch, produces no visible change of any kind.

## TECHNICAL INTERFACE
The live staff highlights matched expected notes and draws no played notes.

## EXPECTATION
- The live view never renders a played pitch under any circumstance.
- A match lights up only the matched expected note, silently and without animation; anything else changes nothing on screen.
