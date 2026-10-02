---
id: rule_starting_note_only_starts_count_in
status: DRAFT
version: 0.1
priority: 1
parents:
  - [[rule_midi_starting_note]]
dependents:
  - [[service_workspace_session_flow]]
type: RULE
layer: BUSINESS
human_name: Starting Note Only Starts the Count-In
tags: [v2, release-v2.0, session, session-start, midi]
---

# Starting Note Only Starts the Count-In

## INTENT
Keep the note that starts a session out of the phrase the player is about to play.

## THE RULE / LOGIC
The starting note only starts the count-in. It is not phrase 1's first note already played, and it belongs to no phrase in the session history or in any export. After the count-in, the player plays phrase 1 from its first note, on beat 1.

## TECHNICAL INTERFACE
The starting note triggers the count-in and is otherwise ignored by acknowledgement, history and export.

## EXPECTATION
- The starting note is recorded in no phrase and appears in no export.
- Phrase 1's first expected note still has to be played after the count-in to be acknowledged.
