---
id: rule_optional_midi_privacy
status: STABLE
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
Keep optional MIDI input limited to private visual pitch-match feedback.

## THE RULE / LOGIC
Optional MIDI input only validates connection and gives gentle visual match or mismatch feedback against a proposed staff note. An unmatched received pitch is never displayed, and MIDI input never changes generation, advances the phrase, evaluates timing, or creates a score.

## TECHNICAL INTERFACE
When enabled, MIDI input receives pitches and the interface shows only match or mismatch feedback.

## EXPECTATION
No unmatched incoming MIDI pitch is exposed, and MIDI input produces no generation change, timing evaluation, or performance score.
