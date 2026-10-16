---
id: module_session_starting_note
status: REVIEW
dependents: []
type: MODULE
human_name: Session Starting Note
parents:
  - [[rule_midi_starting_note]]
  - [[rule_starting_note_only_starts_count_in]]
  - [[rule_starting_note_waits_for_first_gesture]]
  - [[service_workspace_session_flow]]
layer: ARCHITECTURE
version: 0.3
priority: 1
tags: workspace,session,midi
---

# Session Starting Note

## INTENT
Let the player start a practice session from the MIDI controller by playing phrase 1's starting note at Idle.

## THE RULE / LOGIC
At Idle the session's MIDI side names phrase 1's starting note, its first fresh attack, exactly while Start may be clicked, the MIDI controller is connected, neither the connection sheet nor the stale-phrase prompt is open and the staff shows Idle's phrase; a played note with exactly that concert pitch, octave included, starts the session through the controller's own start, the path the Start click takes, so every start condition, lock and count-in is the same, and any other note at Idle does nothing. On a stale phrase 1 the starting note, like the Start click, opens the stale-phrase prompt, which then says the note did not start the session, and starts nothing; while the prompt shows no starting note is named, so no note starts anything.

After the page loads, the starting note starts nothing until the page's first click, tap or key press, a note played on the controller not counting, because browsers let a page make sound only after one. While the page's audio is still locked (no Start or Connect controller click yet) and the page has had no such gesture, the starting note is dropped, and the MIDI side says that the starting note waits for it, which the starting-note line asks for. Once the page has had one, the starting note played while the audio is still locked reaches the MIDI side without a time on the audio clock; it unlocks the audio and is then read, starting the session as above. Any other note played while the audio is locked does nothing.

## TECHNICAL INTERFACE
The MIDI side's readonly readings include the starting note or null, which the controller's readonly state publishes; createSessionMidi reads whether the connection sheet is open and whether Start may be clicked, the Idle result and the written phrase the staff shows, and the controller's own start. It also reads the page's activation, a PageActivation (src/session/session-browser-ports.ts) that the browser adapter in src/components/workspace/browser-page-activation.ts sets from real input events only, and publishes whether the starting note waits for the page's first click, tap or key press (startingNoteAwaitsClick); it hears the MIDI controller's onUnclockedNoteOn, the note-ons it cannot place on the audio clock. The starting note's readings are createIdleStartingNote in src/components/workspace/workspace-session-starting-note.ts, which createSessionMidi (src/components/workspace/workspace-session-midi.ts) builds; the controller hands it the connection sheet as open while the stale-phrase prompt shows, and its start is the controller's stale-aware start, opened by the note.

## EXPECTATION
A played note at Idle starts a session, exactly as the Start click does, only when it is the named starting note; any other note at Idle does nothing. After a load, the starting note played before any click, tap or key press on the page starts nothing; after one, it starts the session with sound. On a stale phrase 1 the starting note opens the stale-phrase prompt and starts nothing; while the prompt shows, no note starts anything.
