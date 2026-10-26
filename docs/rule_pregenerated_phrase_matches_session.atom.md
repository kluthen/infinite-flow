---
id: rule_pregenerated_phrase_matches_session
status: REVIEW
priority: 1
human_name: Pre-Generated Phrase Equals the Session's Phrase
tags: [v3, release-v3.0, generation, determinism]
dependents:
  - [[module_session_lock_and_groups_choices]]
  - [[module_session_pregeneration_plan]]
  - [[module_session_ready_phrases]]
  - [[module_session_seed_plan]]
version: 0.3
parents:
  - [[req_idle_pregeneration]]
  - [[rule_seeded_phrase_reproduction]]
type: RULE
layer: BUSINESS
---

# Pre-Generated Phrase Equals the Session's Phrase

## INTENT
Keep a session's phrases independent of whatever happened at Idle.

## THE RULE / LOGIC
From v3.0, a pre-generated phrase is exactly the phrase the session would have generated at that place: the same request and seed, the same mutation schedule, tension arc and density step-down. Where the session's own attempt at that place would have succeeded in time, the phrase is identical with or without pre-generation. Where that attempt would have failed or fallen back (as for the second phrase at the fastest tempos, which is otherwise generated without joining the first), the pre-generated phrase is the one a successful attempt would have produced; that difference is the purpose of pre-generation. To make this possible, a session's seeds and schedules are fixed, from phrase 1, before Start. This holds when the phrase on screen is out of date and the player uses it as phrase 1: pre-generation keeps running on that phrase 1 and builds its phrases the way the session then does, phrase 2 joined to phrase 1 as after a settings change at the boundary between them, so each pre-generated phrase is still exactly the session's phrase at that place.

## TECHNICAL INTERFACE
The session's seeds and schedules are drawn before Start and shared by pre-generation and the session.

## EXPECTATION
- For the same inputs, each pre-generated phrase is identical to the phrase the session produces at that place when the session's own attempt succeeds in time.
- Where the session's own attempt would have failed or fallen back, the pre-generated phrase is the one a successful attempt at that place produces.
- With an out-of-date phrase 1 that the player uses, the pre-generated phrases are the ones the session plays at those places, under the same conditions.
