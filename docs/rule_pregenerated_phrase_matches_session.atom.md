---
id: rule_pregenerated_phrase_matches_session
status: DRAFT
priority: 1
human_name: Pre-Generated Phrase Equals the Session's Phrase
tags: [v3, release-v3.0, generation, determinism]
notes: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: the identity is stated for where the session's own attempt would have succeeded in time; where it would have failed or fallen back, the pre-generated phrase is the one a successful attempt would have produced. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents: []
version: 0.2
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
From v3.0, a pre-generated phrase is exactly the phrase the session would have generated at that place: the same request and seed, the same mutation schedule, tension arc and density step-down. Where the session's own attempt at that place would have succeeded in time, the phrase is identical with or without pre-generation. Where that attempt would have failed or fallen back (as for the second phrase at the fastest tempos, which is otherwise generated without joining the first), the pre-generated phrase is the one a successful attempt would have produced; that difference is the purpose of pre-generation. To make this possible, a session's seeds and schedules are fixed, from phrase 1, before Start.

## TECHNICAL INTERFACE
The session's seeds and schedules are drawn before Start and shared by pre-generation and the session.

## EXPECTATION
- For the same inputs, each pre-generated phrase is identical to the phrase the session produces at that place when the session's own attempt succeeds in time.
- Where the session's own attempt would have failed or fallen back, the pre-generated phrase is the one a successful attempt at that place produces.
