---
id: rule_extensions_never_chord_tones
status: REVIEW
dependents:
  - [[module_pitch_domain_validation]]
  - [[module_pitch_search_context]]
version: 0.1
human_name: Ninths, Elevenths and Thirteenths Are Not Chord Tones
parents:
  - [[req_seventh_chords_level]]
type: RULE
layer: BUSINESS
priority: 1
tags: [v3, release-v3.3, generation, melody, chords]
---

# Ninths, Elevenths and Thirteenths Are Not Chord Tones

## INTENT

Keep the chord tones to the notes of the chord the phrase actually uses.

## THE RULE / LOGIC

A chord extension, the ninth, eleventh or thirteenth above a chord's root, is never a chord tone: it stays a decorating note, as every note outside the chord is, and is never targeted or held on purpose.

## TECHNICAL INTERFACE

Chord extensions are never part of a harmony event's chord tones.

## EXPECTATION

- No chord extension is tried as a chord tone by the search or accepted as one by the check of the result.
