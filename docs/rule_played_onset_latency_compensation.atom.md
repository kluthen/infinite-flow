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
notes: Revised 2026-10-06 (previous version 0.2) on spec D191, the product owner answer to O71 - USB is the tested path for v2.0 and Bluetooth LE MIDI is best-effort. Version 0.2 gave Bluetooth LE roughly 10 to 15 ms plus jitter and implied a constant per connection type; Web MIDI exposes no transport, so the USB correction applies to every controller, and over Bluetooth LE the reference breath controller measured roughly 70 to 80 ms later than over USB, with batched delivery (hardware checklist part C, 2026-10-06). Also aligned with spec D183 - the tuning is one of the v2.0 release-gate checks, no longer a later v2.4 release, and the expectation that v2.0 ships untuned constants is gone. Tuned 2026-10-06 on the reference breath controller over USB (docs/midi-tuning.md, Results) - the output-latency and USB constants both stay 0, the 32 ms output latency the browser reports being cancelled on that setup by the player anticipating the click; the USB keyboard is still to be measured. The unused Bluetooth LE constant in the code is outside this rule. Recorded 2026-10-01 in v2 chunk 12 (MIDI input). Chunk 12 builds the mapping half. Each MIDI timestamp is mapped onto the audio clock through an anchor read afresh per message, one simultaneous reading of the audio clock (on the scheduling timeline the clicks and playhead use) and of the page performance.now() timeline. A time mapped from the selected input is never earlier than the previous one from that input, because Web MIDI delivers a port messages in order; this only absorbs anchor jitter of a few milliseconds. The latency correction is subtracted afterward, on the mapped time.
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
