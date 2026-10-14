---
id: rule_midi_never_blocks_session
status: STABLE
tags: [v2, release-v2.0, midi, session-start]
dependents:
  - [[service_session_midi]]
  - [[service_workspace_session_flow]]
type: RULE
version: 0.1
priority: 1
human_name: MIDI State Never Blocks a Session
parents:
  - [[req_midi_controller_input]]
layer: BUSINESS
---

# MIDI State Never Blocks a Session

## INTENT
Keep MIDI optional, so its absence or failure never stands in the player's way.

## THE RULE / LOGIC
Every MIDI connection state is non-blocking: no MIDI support in this browser, not yet connected, permission denied, no device found, or the selected controller unplugged. A session without any controller connected is always possible, and nothing about MIDI ever blocks Start.

## TECHNICAL INTERFACE
The Start action never depends on any MIDI connection state.

## EXPECTATION
A session works with no MIDI at all, with permission denied or the MIDI API unsupported, without ever blocking Start.
