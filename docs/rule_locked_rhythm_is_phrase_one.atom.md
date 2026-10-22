---
id: rule_locked_rhythm_is_phrase_one
status: DRAFT
dependents:
  - [[entity_request_rhythm_lock]]
layer: BUSINESS
version: 0.2
human_name: The Locked Rhythm Is Phrase 1's
type: RULE
priority: 1
tags: [v3, release-v3.2, session, rhythm, rhythm-lock]
parents:
  - [[req_rhythm_lock]]
---

# The Locked Rhythm Is Phrase 1's

## INTENT
Lock the rhythm the player has just seen and chosen to start on.

## THE RULE / LOGIC
In session mode, the locked rhythm is phrase 1's, the phrase on screen at Start; regenerating at Idle changes it. In a Jam, phrase 1's rhythm is chosen nearest the doodle, by total edits, closest first, whatever the drift, and that rhythm is locked; a kept doodle's phrase 1, generated at Idle, is chosen the same way. A phrase 1 from a Jam's last attempt, the one without the steering block, keeps the rhythm it came with, which the lock then holds. Phrase 1 never takes a rhythm change. At the session's end the locked rhythm is not kept as a setting.

## TECHNICAL INTERFACE
The lock takes phrase 1's bars as the session's locked rhythm.

## EXPECTATION
- The locked rhythm is phrase 1's rhythm.
- In a Jam with the lock on, phrase 1's rhythm is the candidate nearest the doodle.
