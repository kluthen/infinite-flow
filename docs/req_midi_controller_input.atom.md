---
id: req_midi_controller_input
status: REVIEW
human_name: MIDI Controller Input
parents:
  - [[req_rolling_practice_session]]
version: 0.1
priority: 1
tags: [v2, release-v2.0, midi]
dependents:
  - [[req_jam]]
  - [[rule_controller_attached_definition]]
  - [[rule_controller_connects_between_sessions]]
  - [[rule_controllerless_session_never_gains_controller]]
  - [[rule_expected_note_window]]
  - [[rule_last_controller_remembered]]
  - [[rule_midi_never_blocks_session]]
  - [[rule_midi_starting_note]]
  - [[rule_only_note_on_counts_as_played]]
  - [[rule_optional_midi_privacy]]
  - [[rule_played_notes_kept_only_after_opt_in]]
  - [[rule_silence_timeout_ends_session]]
  - [[rule_stray_note_definition]]
  - [[service_session_midi]]
type: REQUIREMENT
layer: BUSINESS
---

# MIDI Controller Input

## INTENT
Let the player connect one MIDI controller so the app can hear the notes they play.

## THE RULE / LOGIC
The app supports one connected MIDI controller at a time: several connected inputs are never merged, and when more than one is present the player picks one. Notes are read as concert pitch on any channel. Connecting a controller is optional: everything except MIDI-specific behaviour works without one.

## TECHNICAL INTERFACE
A "Connect controller" action, available between sessions, requests MIDI permission and lets the player pick one input when several are present.

## EXPECTATION
- At most one MIDI input is read at a time, on every channel, as concert pitch.
- With several inputs present, the player chooses one; inputs are never merged.
