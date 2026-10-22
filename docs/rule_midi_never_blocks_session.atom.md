---
id: rule_midi_never_blocks_session
status: STABLE
tags: [v2, release-v2.0, midi, session-start]
dependents:
  - [[service_session_midi]]
  - [[service_workspace_session_flow]]
type: RULE
version: 0.2
priority: 1
human_name: MIDI State Never Blocks Session Mode
parents:
  - [[req_midi_controller_input]]
layer: BUSINESS
---

# MIDI State Never Blocks Session Mode

## INTENT
Keep MIDI optional, so its absence or failure never stands in the player's way.

## THE RULE / LOGIC
Every MIDI connection state is non-blocking in session mode, where the app always opens: no MIDI support in this browser, not yet connected, permission denied, no device found, or the selected controller unplugged. In session mode a session without any controller connected is always possible, and nothing about MIDI ever blocks Start. Jam mode's sessions begin with a doodle played on the controller, so in Jam mode Start needs a controller attached and, without one, is unavailable and says why; even then Jam mode opens, its settings can be set, and no MIDI state ever switches the mode.

## TECHNICAL INTERFACE
In session mode the Start action never depends on any MIDI connection state; in Jam mode it needs a controller attached.

## EXPECTATION
In session mode a session works with no MIDI at all, with permission denied or the MIDI API unsupported, without ever blocking Start. In Jam mode without a controller attached, Start is unavailable and says why, while Jam mode still opens and its settings can be set.
