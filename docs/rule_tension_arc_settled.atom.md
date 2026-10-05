---
id: rule_tension_arc_settled
status: REVIEW
layer: BUSINESS
tags: tension,melody,harmony,controls
human_name: Tension Arc: Settled
priority: 1
version: 0.1
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_harmony_candidate_domain]]
type: RULE
---

# Tension Arc: Settled

## INTENT
Apply the Settled tension arc as the least active schedule of diatonic instability, prioritizing chord tones on metrically strong locations.

## THE RULE / LOGIC
Under the Settled tension arc, the phrase prioritizes chord tones on metrically strong locations (beat 1 or beat 3 of a bar), and any active (non-chord-tone) scale degree resolves by the next strong onset.

## TECHNICAL INTERFACE
The tension-arc control selects Settled as one of its four permitted values.

## EXPECTATION
A phrase using the Settled tension arc places active scale degrees so that each resolves no later than the next strong onset, with chord tones favored on strong metrical locations.
