---
id: rule_played_onset_latency_compensation
status: DRAFT
type: RULE
version: 0.1
human_name: Latency-Compensated Played Onset
parents:
  - [[rule_expected_note_window]]
dependents: []
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, midi, acknowledgement]
---

# Latency-Compensated Played Onset

## INTENT
Judge each played note at the moment the player actually played it.

## THE RULE / LOGIC
The played onset used for matching is the controller's timestamp mapped onto the audio clock, minus the output latency (the delay between scheduling a sound and it reaching the speakers) and minus a small constant for the connection type: negligible for USB, roughly 10 to 15 ms plus jitter for Bluetooth LE. These are tuned, hard-coded constants; there is no player-facing latency calibration step.

## TECHNICAL INTERFACE
Played-note onsets are converted to audio-clock time with fixed latency constants per connection type.

## EXPECTATION
The acknowledgement windows and latency constants are tuned and documented against the reference hardware: a breath controller over USB, and a USB keyboard.
