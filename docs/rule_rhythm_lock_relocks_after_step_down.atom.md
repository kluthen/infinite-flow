---
id: rule_rhythm_lock_relocks_after_step_down
status: DRAFT
parents:
  - [[req_rhythm_lock]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
type: RULE
version: 0.1
priority: 1
human_name: A Narrow Window Re-Locks an Eighth-Note Rhythm
layer: BUSINESS
tags: [v3, release-v3.2, session, rhythm, rhythm-lock]
---

# A Narrow Window Re-Locks an Eighth-Note Rhythm

## INTENT
Keep the lock working when a narrow window steps the note density down.

## THE RULE / LOGIC
When a session steps the note density down from Sixteenth to Eighth because the window became too narrow, and the locked rhythm uses sixteenth notes, the first phrase generated with Eighth takes the nearest Eighth rhythm by total edits, and that rhythm becomes the locked one for the rest of the session.

## TECHNICAL INTERFACE
A density step-down replaces the locked bars once.

## EXPECTATION
- After a step-down, the first Eighth phrase's rhythm is locked for the rest of the session.
