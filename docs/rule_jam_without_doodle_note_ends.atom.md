---
id: rule_jam_without_doodle_note_ends
status: DRAFT
tags: [v3, release-v3.2, session, jam, session-end]
parents:
  - [[req_jam]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: A Jam With No Doodle Note Ends
---

# A Jam With No Doodle Note Ends

## INTENT
End a Jam the player never begins, since there is nothing rolling to read.

## THE RULE / LOGIC
If no doodle note comes within 30 seconds after the count-in, the Jam ends as a Jam ends before phrase 1 sounds. Notes the very-short-note filter drops do not count. This differs from a session, whose silence timer starts only after a first note, because a capture has nothing rolling to read.

## TECHNICAL INTERFACE
A 30-second timer runs from the end of a Jam's count-in until its first doodle note.

## EXPECTATION
- A Jam with no doodle note within 30 seconds after the count-in returns to Idle with no review and nothing kept.
- Very short notes do not stop that timer.
