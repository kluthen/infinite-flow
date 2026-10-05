---
id: module_session_silence_timeout
status: DRAFT
type: MODULE
layer: ARCHITECTURE
human_name: Session Silence Timeout
tags: workspace,session,midi
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
version: 0.1
priority: 1
parents:
  - [[rule_silence_timeout_ends_session]]
  - [[service_workspace_session_flow]]
dependents: []
---

# Session Silence Timeout

## INTENT
End a session with a controller once the player has stopped playing for longer than the silence timeout.

## THE RULE / LOGIC
The silence timer is armed by the first note played (in a session the starting note started, the starting note itself, from its onset), re-armed by every played note whether it matches or not, and suspended while the controller is lost; the session ends with the silence-timeout cause once the audio clock is strictly past 30 seconds after the last arming, and a session in which no note is ever played never times out.

## TECHNICAL INTERFACE
The session end causes include silence-timeout. The silence timer is set on the session's audio-time agenda.

## EXPECTATION
In a session with a controller, more than 30 seconds without a played note after the first ends it with silence-timeout.
