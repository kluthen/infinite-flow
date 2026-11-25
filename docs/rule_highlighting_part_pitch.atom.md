---
id: rule_highlighting_part_pitch
status: REVIEW
type: RULE
version: 0.1
human_name: The Highlighting Part Takes the Third or the Sixth Below
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_highlighting_part]]
layer: BUSINESS
priority: 1
dependents: []
---

# The Highlighting Part Takes the Third or the Sixth Below

## INTENT
Double a lead note at the interval that fits the chord.

## THE RULE / LOGIC
A doubled lead note is doubled either by the note a diatonic third below it in the phrase's scale or by the note a diatonic sixth below it. The one that is a chord tone of the chord sounding at the lead note's start is chosen; when both are chord tones, or neither is, the third is chosen.

## TECHNICAL INTERFACE
The doubling's pitch is read from the phrase's scale and its harmony.

## EXPECTATION
- Every highlighting note is a diatonic third or a diatonic sixth below the lead note it doubles.
- When exactly one of the two is a tone of the chord sounding at the lead note's start, that one is taken; otherwise the third.
