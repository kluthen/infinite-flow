---
id: rule_midi_starting_note
status: REVIEW
dependents:
  - [[module_session_starting_note]]
  - [[rule_starting_note_named]]
  - [[rule_starting_note_only_starts_count_in]]
  - [[service_workspace_session_flow]]
type: RULE
priority: 1
tags: [v2, release-v2.0, session, session-start, midi]
parents:
  - [[req_midi_controller_input]]
  - [[rule_session_start_conditions]]
layer: BUSINESS
version: 0.3
human_name: Only Phrase 1's First Note Starts a Session From MIDI
---

# Only Phrase 1's First Note Starts a Session From MIDI

## INTENT
Let the player start a session from Idle without leaving their instrument, by playing the note the phrase begins with.

## THE RULE / LOGIC
Only one MIDI note can start a session: the note phrase 1 starts on, that is, the first attacked note of the phrase on screen at Idle. It must be that exact note, octave included: its position on the staff fixes its octave, so C4 and C5 (12 half steps apart) are different notes here. The match uses the same rule as expected-note acknowledgement: the exact concert pitch of that written note under the instrument profile's transposition. Any other note played at Idle starts nothing, and while the last session's review shows, no note starts anything, that one included. Nothing played while the player is connecting a controller or running its transposition check can start a session, not even that same note, and no note starts one while a session cannot start at all. A note that starts nothing changes nothing on screen: there is no mismatch hint.

## TECHNICAL INTERFACE
With a controller attached at Idle, outside the review, playing phrase 1's first note at its exact concert pitch starts the count-in.

## EXPECTATION
- From MIDI, only phrase 1's first note at its exact concert pitch, octave included, starts a session, and only at Idle while a session can start and outside the connection step.
- Every other note, any note played while the review shows, and any note played during the connection step or the transposition check, starts nothing and changes nothing on screen.
