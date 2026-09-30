---
id: rule_midi_starting_note
status: DRAFT
dependents:
  - [[rule_starting_note_named]]
  - [[rule_starting_note_only_starts_count_in]]
type: RULE
priority: 1
tags: [v2, release-v2.0, session, session-start, midi]
parents:
  - [[req_midi_controller_input]]
  - [[rule_session_start_conditions]]
layer: BUSINESS
version: 0.2
human_name: Only Phrase 1's First Note Starts a Session From MIDI
---

# Only Phrase 1's First Note Starts a Session From MIDI

## INTENT
Let the player start a session without leaving their instrument, by playing the note the phrase begins with, whether or not the review of the last session is showing.

## THE RULE / LOGIC
Only one MIDI note can start a session: the note phrase 1 starts on, that is, the first attacked note of the phrase on screen at Idle, the review showing or not. It must be that exact note, octave included: its position on the staff fixes its octave, so C4 and C5 (12 half steps apart) are different notes here. The match uses the same rule as expected-note acknowledgement: the exact concert pitch of that written note under the instrument profile's transposition. Any other note played at Idle, the review showing or not, starts nothing. Nothing played while the player is connecting a controller or running its transposition check can start a session, not even that same note, and no note starts one while a session cannot start at all. A note that starts nothing changes nothing on screen: there is no mismatch hint.

## TECHNICAL INTERFACE
With a controller attached at Idle, the review showing or not, playing phrase 1's first note at its exact concert pitch starts the count-in.

## EXPECTATION
- From MIDI, only phrase 1's first note at its exact concert pitch, octave included, starts a session, and only while a session can start and outside the connection step; this holds the same with the review showing.
- Every other note, and any note played during the connection step or the transposition check, starts nothing and changes nothing on screen.
