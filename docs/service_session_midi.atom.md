---
id: service_session_midi
status: DRAFT
dependents: []
priority: 1
human_name: Session MIDI Side
tags: workspace,session,midi
parents:
  - [[req_midi_controller_input]]
  - [[rule_controllerless_session_never_gains_controller]]
  - [[rule_midi_never_blocks_session]]
  - [[rule_session_history_records_played_notes]]
  - [[rule_start_while_controller_away]]
  - [[service_workspace_session_flow]]
type: SERVICE
layer: ARCHITECTURE
version: 0.1
---

# Session MIDI Side

## INTENT
Follow the MIDI controller's state and every played note on the session controller's behalf, on the audio clock, from the controller's creation to its disposal.

## THE RULE / LOGIC
The session controller also has a MIDI side, which loads with the controller, never in the entry chunk: its module comes with the controller's chunk. From the controller's creation to its disposal the MIDI side follows the MIDI controller's state and every played note, handles every time on the audio clock and sets every timer on the session's audio-time agenda. The session's mode is fixed at its start by the MIDI controller's state: connected gives a session with a controller, which reads every note until it ends; any other state gives a session without a controller, which reads no note and sets no MIDI timer for its whole run, count-in included, even if a device attaches afterwards. When the selected controller is away at that start, the MIDI side holds the MIDI controller's reattachment, so the same device coming back is neither opened nor read until the session ends, and the teardown releases the hold; a port still opening at the start holds nothing. Every end, whatever its cause, first ends the notes still held on the controller at the current audio time and records them in the history, before the runner gets the end and the engine's end closes the history; the teardown then stops the MIDI side, dropping its timers, clearing the countdown and the acknowledged notes and releasing a held reattachment. A throw inside the MIDI side's handling of a note or of a state change is a programming error that ends the session loudly.

## TECHNICAL INTERFACE
The controller's MIDI side is createSessionMidi(deps), in its own module loaded with the controller. createSessionMidi reads the MIDI controller, the audio transport, the page's first click, tap or key press (a PageActivation), whether the connection sheet is open and whether Start may be clicked, the Idle result and the written phrase the staff shows, and the controller's own start. It exposes readonly readings (the MIDI controller's state, the starting note or null, whether the starting note waits for the page's first click, tap or key press, the controller-lost countdown as seconds left or null, the acknowledged expected notes, and whether the running session has a controller, null outside a session), which the controller's readonly state publishes, plus beginSession(seams), given the session's starting tempo, phrase 1's concert timeline, history, agenda, an end-for-a-cause, a fail-loudly sink and a controllerPresence sink told of each loss and reconnection, which returns phraseReady(phraseNumber, timeline, tempo) (add a phrase's expected notes at its tempo, once the engine has fixed that tempo), releaseHeld (end every held note now, before the engine's end) and stop (the teardown), and dispose. The MIDI controller exposes holdReattachment() and releaseReattachment() for the hold of a session started while it is away.

## EXPECTATION
A session started while the MIDI controller is not connected reads no note, never times out and never counts down, and a selected controller away at its start is neither reopened nor read until the session ends. Notes still held at any end are recorded before the history closes. The MIDI side is not in the entry chunk.
