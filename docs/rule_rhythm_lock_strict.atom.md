---
id: rule_rhythm_lock_strict
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
human_name: The Rhythm Lock Is Strict
parents:
  - [[req_rhythm_lock]]
version: 0.1
tags: [v3, release-v3.2, session, rhythm, rhythm-lock]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
---

# The Rhythm Lock Is Strict

## INTENT
Keep a locked rhythm exactly the same from phrase to phrase.

## THE RULE / LOGIC
The lock fixes every note start and length, and so every rest, across the four measures; the pitches keep changing. It lasts for the session. The locked rhythm is matched by its written bars, the note starts and lengths of its four measures, among the rhythms the phrase's own settings allow. Under the lock a phrase's rhythm is tried with every chord plan before any other rhythm, so the locked rhythm is given up only when no phrase can be made with it at all.

## TECHNICAL INTERFACE
The locked rhythm is identified by its bars, not by an internal identity.

## EXPECTATION
- With the lock on and no allowed rhythm change, every phrase has phrase 1's rhythm exactly, apart from forced bends.
- A rhythm is given up for a forced bend only when no chord plan makes a phrase with it.
