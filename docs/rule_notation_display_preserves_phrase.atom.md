---
id: rule_notation_display_preserves_phrase
status: REVIEW
human_name: Notation Display Preserves Phrase
type: RULE
priority: 1
tags: notation,transposition,display
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_notation_display_convention]]
  - [[module_notation_layout_preflight]]
layer: BUSINESS
version: 0.3
notes: User sign-off 2026-09-24 (relayed by coordinator): approved promotion DRAFT to REVIEW; rule text unchanged.
---

# Notation Display Preserves Phrase

## INTENT
Allow notation transposition changes without changing the generated phrase.

## THE RULE / LOGIC
Standard staff notation is rendered in treble G2 clef from the concert-pitch event timeline. Concert, B-flat, and E-flat are display modes only, with B-flat selected on first load. Concert-to-written transforms are Concert +0 chromatic/+0 diatonic, B-flat tenor +14 chromatic/+8 diatonic, and E-flat alto +9 chromatic/+5 diatonic. They transform notes, key, tonal-center labels, chord roots, and slash bass, but preserve chord quality. Switching modes never changes generated pitches, harmony, seed, selected instrument profile, active range policy, or register policy.

## TECHNICAL INTERFACE
The player selects Concert, B-flat, or E-flat notation display for a generated phrase; B-flat is the initial display selection.

## EXPECTATION
B-flat notation is selected on first load. Changing notation display mode changes only written display values in treble G2 clef, including context-appropriate transformed spellings, and leaves the original phrase, chord quality, selected profile, and generator policy identical.
