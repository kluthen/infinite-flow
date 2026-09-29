---
id: rule_join_tense_note_resolution
status: DRAFT
dependents: []
type: RULE
version: 0.1
priority: 1
tags: [v2, release-v2.0, session, phrase-join, tension]
layer: BUSINESS
human_name: Tense Phrase Ending May Resolve Across a Join
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_open_phrase_ending]]
---

# Tense Phrase Ending May Resolve Across a Join

## INTENT
Let a tense note at the very end of a session phrase resolve onto the next phrase instead of forcing it to resolve early.

## THE RULE / LOGIC
A tense note (an unresolved scale tone) at the very end of a phrase in a session may resolve onto the next phrase's first note, rather than having to resolve before its own phrase's last note. Resolution is never pushed further forward than that first note: resolving into the next phrase's own material past its first note is not attempted. The requirement that a tense note resolve before the phrase's last note still applies in full where the music actually stops: at Stop, or at the end of a session.

## TECHNICAL INTERFACE
The carried-in last sounding pitch and final harmony event let the next phrase's first note serve as the resolution.

## EXPECTATION
- When a session phrase ends on a tense note and the next phrase is generated with its carry-in, that next phrase's first note resolves it.
- No tense note is ever left to resolve on a note later than the next phrase's first note.
