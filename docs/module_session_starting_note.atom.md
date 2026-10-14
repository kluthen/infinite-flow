---
id: module_session_starting_note
status: REVIEW
dependents: []
type: MODULE
human_name: Session Starting Note
parents:
  - [[rule_midi_starting_note]]
  - [[rule_starting_note_only_starts_count_in]]
  - [[service_workspace_session_flow]]
layer: ARCHITECTURE
version: 0.1
priority: 1
tags: workspace,session,midi
---

# Session Starting Note

## INTENT
Let the player start a practice session from the MIDI controller by playing phrase 1's starting note at Idle.

## THE RULE / LOGIC
At Idle the session's MIDI side names phrase 1's starting note, its first fresh attack, exactly while Start may be clicked, the MIDI controller is connected, the connection sheet is closed and the staff shows Idle's phrase; a played note with exactly that concert pitch, octave included, starts the session through the controller's own start, the path the Start click takes, so every start condition, lock and count-in is the same, and any other note at Idle does nothing.

## TECHNICAL INTERFACE
The MIDI side's readonly readings include the starting note or null, which the controller's readonly state publishes; createSessionMidi reads whether the connection sheet is open and whether Start may be clicked, the Idle result and the written phrase the staff shows, and the controller's own start.

## EXPECTATION
A played note at Idle starts a session, exactly as the Start click does, only when it is the named starting note; any other note at Idle does nothing.
