---
id: rule_join_tense_note_resolution
status: DRAFT
dependents: []
type: RULE
version: 0.2
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
A tense note (an unresolved scale tone) at the very end of a session phrase generated with carry-in may resolve onto the next phrase's first note, rather than having to resolve before its own phrase's last note; the next phrase, when generated with carry-in, starts on that resolution. Resolution is never pushed further forward than that first note: resolving into the next phrase's own material past its first note is not attempted. A phrase generated without carry-in (the Idle phrase that becomes a session's phrase 1, or the standalone phrase the failure handling falls back to) obeys in full the requirement that a tense note resolve before the phrase's last note, so it never ends owing a resolution. Across a join into a phrase generated without carry-in, or into a repeated phrase (the previous phrase shown again as it was), a resolution left owing is not settled: it is dropped at that join.

## TECHNICAL INTERFACE
The carried-in last sounding pitch and final harmony event let the next phrase's first note serve as the resolution.

## EXPECTATION
- When a session phrase ends on a tense note and the next phrase is generated with its carry-in, that next phrase's first note resolves it.
- No tense note is ever left to resolve on a note later than the next phrase's first note.
- A phrase generated without carry-in never ends on an unresolved tense note.
- A join into a phrase generated without carry-in, or into a repeated phrase, settles no resolution left owing by the phrase before.
