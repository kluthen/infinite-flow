---
id: rule_optional_midi_privacy
status: DRAFT
human_name: Optional MIDI Privacy
layer: BUSINESS
version: 0.1
priority: 2
tags: midi,privacy,non-scoring
dependents: []
type: RULE
parents:
  - [[req_four_measure_phrase]]
---

# Optional MIDI Privacy

## INTENT
Exclude MIDI controller connection and input feedback from the first release.

## THE RULE / LOGIC
The first release provides no MIDI controller connection, input, match or mismatch feedback, timing evaluation, MIDI-seeded continuation, scoring, generation change, or phrase advancement.

## TECHNICAL INTERFACE
The first-release phrase workspace has no MIDI-controller connection or input-feedback interface.

## EXPECTATION
First-release behavior neither requests MIDI controller access nor presents MIDI input or feedback.
