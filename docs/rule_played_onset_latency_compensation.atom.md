---
id: rule_played_onset_latency_compensation
status: REVIEW
type: RULE
version: 0.3
human_name: Latency-Compensated Played Onset
parents:
  - [[rule_expected_note_window]]
dependents:
  - [[module_session_note_acknowledgement]]
  - [[service_workspace_session_flow]]
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, v2.4-check, midi, acknowledgement]
---

# Latency-Compensated Played Onset

## INTENT
Judge each played note at the moment the player actually played it.

## THE RULE / LOGIC
The played onset used for matching is the controller's timestamp mapped onto the audio clock, minus a correction for the output latency (the delay between scheduling a sound and it reaching the speakers) and for the connection delay (the extra time a controller's note takes to reach the app). Web MIDI does not say how a controller is connected, so one correction, the one tuned for USB, applies to every controller. USB is the tested path, and its connection delay is negligible. Bluetooth LE MIDI is best-effort: a Bluetooth controller works with that same correction, with no Bluetooth-specific correction or tuning, although on the reference breath controller Bluetooth adds roughly 70 to 80 ms over USB and delivers notes in batches, so its timing is coarse. The correction is made of hard-coded constants; there is no player-facing latency calibration step. They are tuned on the reference hardware, a breath controller over USB and a USB keyboard, as one of the real-hardware checks of the v2.0 release gate.

## TECHNICAL INTERFACE
Played-note onsets are converted to audio-clock time and corrected by one set of fixed latency constants, the USB ones, for every controller.

## EXPECTATION
- Every controller, however it is connected, gets the same USB latency correction; no session applies a Bluetooth-specific correction.
- The latency constants are tuned and documented against the reference hardware, a breath controller over USB and a USB keyboard, as one of the real-hardware checks of the v2.0 release gate.
- A Bluetooth LE MIDI controller is best-effort: v2.0 neither tests nor tunes it.
