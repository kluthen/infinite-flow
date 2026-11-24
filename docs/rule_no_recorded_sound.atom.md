---
id: rule_no_recorded_sound
status: DRAFT
type: RULE
priority: 1
human_name: The App Plays No Recorded Sound
parents:
  - [[req_rolling_practice_session]]
dependents: []
layer: BUSINESS
version: 0.1
tags: [v4, release-v4.0, session, audio, sound, hard-constraint]
---

# The App Plays No Recorded Sound

## INTENT
Keep every sound the app makes its own synthesis, with no recording in it.

## THE RULE / LOGIC
Every sound the app makes is synthesized by the app as it plays. No recorded sound, no sample and no audio file is ever loaded, decoded, streamed or shipped with the app. Software synthesizers, sound buffers the app generates itself, audio worklets and audio effects are allowed.

## TECHNICAL INTERFACE
The build holds no audio file, and the app's code decodes and streams no recorded audio.

## EXPECTATION
- The app ships with no audio file and loads none.
- Every sound in a session, the backing, the click, the guides and the parts included, is synthesized by the app.
