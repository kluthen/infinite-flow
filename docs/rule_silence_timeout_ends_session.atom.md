---
id: rule_silence_timeout_ends_session
status: DRAFT
type: RULE
version: 0.1
human_name: Silence Timeout Ends a Session
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, midi, session-end]
parents:
  - [[req_midi_controller_input]]
  - [[rule_stop_ends_session]]
dependents:
  - [[service_workspace_session_flow]]
---

# Silence Timeout Ends a Session

## INTENT
End a session with a controller once the player has clearly stopped playing.

## THE RULE / LOGIC
With a controller attached, a session ends after more than 30 seconds without any note played. The 30-second timer only starts counting once the player has played at least one note in the session, so clicking Start and taking a moment before playing never times out. Only a played note (a note-on with non-zero velocity) counts as activity. While a connected controller falls silent mid-session, because the player is catching a breath or has lost their place, phrases keep being generated and played at tempo, and expected notes that fall due during the silence simply go unacknowledged, like any note not played. Falling silent is not losing the controller: a lost controller follows its own reconnection rule, and the silence timer is suspended while no controller is attached.

## TECHNICAL INTERFACE
A silence timer runs during a session with a controller attached, armed by the first played note and reset by every played note.

## EXPECTATION
- With a controller attached, more than 30 seconds without a played note, counted from the latest played note, ends the session.
- Before the first played note of a session, silence never ends it.
- Silence alone ends a session only under this rule.
