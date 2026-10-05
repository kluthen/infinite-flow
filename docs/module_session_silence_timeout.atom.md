---
id: module_session_silence_timeout
status: REVIEW
type: MODULE
layer: ARCHITECTURE
human_name: Session Silence Timeout
tags: workspace,session,midi
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning. Revised 2026-10-05 (previous version 0.1) to state, as built in v2 chunk 17 and accepted by the product owner (spec D184), that after a reattachment the timer counts again from the reconnection once a played note has armed it.
version: 0.2
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
The silence timer is armed by the first note played (in a session the starting note started, the starting note itself, from its onset), re-armed by every played note whether it matches or not, and suspended while the controller is lost; once a played note has armed it, it counts again from the moment the controller reattaches. The session ends with the silence-timeout cause once the audio clock is strictly past 30 seconds after the last arming, and a session in which no note is ever played never times out.

## TECHNICAL INTERFACE
The session end causes include silence-timeout. The silence timer is set on the session's audio-time agenda.

## EXPECTATION
In a session with a controller, more than 30 seconds without a played note after the first ends it with silence-timeout.
