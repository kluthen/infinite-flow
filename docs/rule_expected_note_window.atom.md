---
id: rule_expected_note_window
status: DRAFT
layer: BUSINESS
version: 0.1
priority: 1
human_name: Expected-Note Timing Window
parents:
  - [[req_midi_controller_input]]
dependents:
  - [[rule_acknowledgement_exact_pitch]]
  - [[rule_played_onset_latency_compensation]]
type: RULE
tags: [v2, release-v2.0, midi, acknowledgement]
---

# Expected-Note Timing Window

## INTENT
Give every expected note a fair timing window in which the player's note can count.

## THE RULE / LOGIC
Every fresh attack in the generated phrase is an expected note: a tie continuation belongs to its original attack, and rests have none. Each expected note has a timing window that opens 150 ms before the attack's own onset and closes at the later of 200 ms after the onset or the end of that note's full, possibly tied, sounding span, but never later than the next expected note's own window opening.

## TECHNICAL INTERFACE
Expected notes and their windows are derived from the phrase's timeline on the audio clock.

## EXPECTATION
- Each fresh attack yields exactly one expected note; ties and rests yield none of their own.
- Each window runs from 150 ms before the onset to the later of 200 ms after it or the end of the note's sounding span, cut off at the next expected note's window opening.
