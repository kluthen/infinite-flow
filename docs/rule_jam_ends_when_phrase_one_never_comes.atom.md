---
id: rule_jam_ends_when_phrase_one_never_comes
status: DRAFT
version: 0.1
tags: [v3, release-v3.2, session, jam, error-handling, session-end]
dependents: []
type: RULE
priority: 1
human_name: A Jam Whose Phrase 1 Never Comes Ends
parents:
  - [[rule_jam_phrase_one_failure_ladder]]
layer: BUSINESS
---

# A Jam Whose Phrase 1 Never Comes Ends

## INTENT
End honestly, and kindly, a Jam the app cannot continue.

## THE RULE / LOGIC
If every attempt for phrase 1 fails by the deadline, the Jam ends: back to Idle, no review, nothing kept, the doodle not held, and the player is told, at Idle, that the app could not continue with these settings. It should be rare: the settings were checked at Start, and the doodle only orders candidates.

## TECHNICAL INTERFACE
A notice at Idle reports a Jam that ended without phrase 1.

## EXPECTATION
- A Jam with no phrase 1 by the deadline returns to Idle with no review and nothing kept, and shows the notice there.
