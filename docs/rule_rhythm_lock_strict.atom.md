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
dependents:
  - [[module_ranked_candidate_ordering]]
  - [[module_rhythm_lock_order]]
  - [[service_generation_window_search]]
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
