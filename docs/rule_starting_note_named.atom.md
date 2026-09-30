---
id: rule_starting_note_named
status: DRAFT
version: 0.2
human_name: Starting Note Named Neutrally
tags: [v2, release-v2.0, session, session-start, midi]
type: RULE
layer: BUSINESS
priority: 1
parents:
  - [[rule_midi_starting_note]]
dependents:
  - [[module_notation_note_identity_overlays]]
---

# Starting Note Named Neutrally

## INTENT
Tell the player which note would start the session, exactly when playing it would.

## THE RULE / LOGIC
A neutral line names the note that starts the session whenever playing it would start one: a controller is attached, the player is not connecting one, and a session can start. This holds at Idle whether or not the review of the last session is showing, the note being named with the review showing exactly as without it. At any other time no note is named, since none would start anything; this includes having no controller attached, a selected controller that is currently away, and every state in which a session cannot start. How the line looks belongs to the interface design.

## TECHNICAL INTERFACE
At Idle, the review showing or not, a neutral line names the starting note only while it would start a session.

## EXPECTATION
- The starting note is named, neutrally, exactly when playing it would start a session, with the review showing as without it.
- No note is named without a controller attached (including a selected controller that is away), while connecting one, or while a session cannot start.
