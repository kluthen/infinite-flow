---
id: rule_pregenerated_phrase_matches_session
status: DRAFT
priority: 1
human_name: Pre-Generated Phrase Equals the Session's Phrase
tags: [v3, release-v3.0, generation, determinism]
notes: Synced 2026-10-13 at the v3.0 wave-2 post-task sync, same version 0.3: chunk 24's code (merge 0b744ae) implements the identity for a phrase 1 that is not stale, with linked tests (session-pregeneration-identity.spec.ts: with every attempt succeeding at once, a session's phrases are identical with pre-generation on and off). Pending implementation, chunk 24b-1, unchanged: the stale phrase 1 clause of version 0.3. No change of meaning; status stays DRAFT. Earlier: Revised 2026-10-13 to version 0.3 (previous version 0.2) before code, on the product owner rulings recorded as spec D297 (master spec Part A v1.12, sections 8 and 16; v3.0 build plan v9, chunk 24b); stays DRAFT. The identity holds when a stale phrase 1 is used (rule_stale_phrase_prompt_at_start): pre-generation keeps running on it and builds the phrases Use it plays, joined as after a settings change at the phrase 1/2 boundary. Pending implementation: chunk 24b. Earlier: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: the identity is stated for where the session's own attempt would have succeeded in time; where it would have failed or fallen back, the pre-generated phrase is the one a successful attempt would have produced. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
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
