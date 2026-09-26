---
id: rule_notation_display_preserves_phrase
status: REVIEW
human_name: Notation Transposition Preserves Phrase
type: RULE
priority: 1
tags: notation
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_notation_display_convention]]
  - [[module_notation_layout_preflight]]
layer: BUSINESS
version: 1.0
notes: User sign-off 2026-09-24 (relayed by coordinator): approved promotion DRAFT to REVIEW; rule text unchanged. Re-confirmed 2026-09-26 against current (post-ISS-003) text: promotion DRAFT to REVIEW approved, verified against code as merged on main.
---

# Notation Transposition Preserves Phrase

## INTENT

Guarantee that rendering written notation in the selected instrument profile's written pitch never changes the generated phrase.

## THE RULE / LOGIC

Standard staff notation is rendered in treble G2 clef from the concert-pitch event timeline, in the selected instrument profile's written pitch only. There is no independently selected display convention and no Concert-display override: written pitch always follows the selected instrument profile's own concert-to-written transposition (an integer chromatic semitone count and integer diatonic letter-step count), for example C MIDI keyboard +0/+0, B-flat tenor saxophone +14/+8 (major ninth), and E-flat alto saxophone +9/+5 (major sixth). The transposition transforms notes, key, tonal-center labels, chord roots, and slash bass, but preserves chord quality. Rendering written pitch never changes generated pitches, harmony, seed, active range policy, or register policy; the only way written pitch changes is by switching the selected instrument profile, which is a separate, governed regeneration event, not a display-mode change.

## TECHNICAL INTERFACE

Notation renders a generated phrase in the selected instrument profile's written pitch; there is no player-facing selection of an independent display mode.

## EXPECTATION

Written pitch always matches the selected instrument profile's transposition. Rendering written pitch changes only written display values in treble G2 clef, including the context-appropriate transposed spelling, and leaves the original concert phrase, chord quality, selected profile policy, and generator policy identical. A change in written pitch can occur only through an instrument-profile switch, never through an independent display-mode selection.
