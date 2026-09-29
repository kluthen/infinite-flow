---
id: rule_session_settings_locked
status: DRAFT
layer: BUSINESS
version: 0.1
priority: 1
human_name: Settings Locked During a Session
tags: [v2, release-v2.0, session, player-controls]
dependents:
  - [[rule_session_change_applies_at_phrase_boundary]]
type: RULE
parents:
  - [[req_rolling_practice_session]]
  - [[user_story_controlled_phrase_generation]]
---

# Settings Locked During a Session

## INTENT
Keep every setting control read-only while a session runs, so the player's hands stay on their instrument.

## THE RULE / LOGIC
Once a session is running, the settings are locked: every control a phrase is generated from (instrument profile, note density, syncopation, register, key and collection, and every other generation setting), and the tempo control too, can be edited only while the app is Idle or showing the review. There is no manual editing of a setting mid-session. The lock does not cover the transport (Stop) or the audio mix (backing and click on/off and volume): these change nothing about what is generated and stay reachable throughout a session, the way a mixer's physical controls would. Mid-session, a setting changes only through an automatic source the player opted into (the settings-mutation flag or adaptive tempo); the instrument profile is never touched by either and stays locked for the whole session.

## TECHNICAL INTERFACE
While a session runs, every setting control is read-only; Stop and the audio-mix controls stay operable.

## EXPECTATION
- No setting can be edited by the player during a session.
- Stop and the four audio-mix controls work at every moment of a session.
- The instrument profile never changes during a session.
