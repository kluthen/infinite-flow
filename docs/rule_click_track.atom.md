---
id: rule_click_track
status: REVIEW
priority: 1
human_name: Metronome Click
tags: [v2, release-v2.0, session, audio, changes-in-v3.2]
parents:
  - [[req_session_audio_mix]]
dependents:
  - [[module_session_transport_tempo_map]]
  - [[service_workspace_session_flow]]
type: RULE
layer: BUSINESS
version: 0.2
---

# Metronome Click

## INTENT
Make the tempo readable before the backing makes musical sense.

## THE RULE / LOGIC
The metronome click is on by default and plays quarter notes with beat 1 accented. The click on/off setting governs the session from phrase 1 on; the count-in clicks whatever it says, and so, in a Jam that begins with a doodle not yet played, does every beat before phrase 1 sounds: the capture, the generation measure, any extended wait and the read-in measure.

## TECHNICAL INTERFACE
The click sounds on every beat of a session while the click is on, beat 1 accented.

## EXPECTATION
- On first load the click is on.
- With the click on, every quarter note of a session clicks, beat 1 accented; with it off, no click sounds from phrase 1 on.
- In a Jam begun with a doodle not yet played, every beat before phrase 1 sounds clicks, whatever the click setting says.
