---
id: rule_starting_note_named
status: DRAFT
version: 0.3
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
A neutral line names the note that starts the session whenever playing it would start one: at Idle, a controller is attached, the player is not connecting one, and a session can start. At any other time no note is named, since none would start anything; this includes having no controller attached, a selected controller that is currently away, the time the last session's review shows, and every state in which a session cannot start. How the line looks belongs to the interface design.

## TECHNICAL INTERFACE
At Idle, a neutral line names the starting note only while it would start a session; it is never shown while the review shows.

## EXPECTATION
- The starting note is named, neutrally, exactly when playing it would start a session.
- No note is named without a controller attached (including a selected controller that is away), while connecting one, while the review shows, or while a session cannot start.
