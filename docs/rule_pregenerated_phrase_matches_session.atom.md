---
id: rule_pregenerated_phrase_matches_session
status: DRAFT
priority: 1
human_name: Pre-Generated Phrase Equals the Session's Phrase
tags: [v3, release-v3.0, generation, determinism]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents: []
version: 0.1
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
From v3.0, a pre-generated phrase is exactly the phrase the session would have generated in its place: the same request and seed, the same mutation schedule, tension arc and density step-down. A session's phrases therefore never depend on whether pre-generation ran, only on which attempts succeeded in time. To make this possible, a session's seeds and schedules are fixed, from phrase 1, before Start.

## TECHNICAL INTERFACE
The session's seeds and schedules are drawn before Start and shared by pre-generation and the session.

## EXPECTATION
- For the same inputs, a session's phrases are identical with pre-generation on or off, wherever the same attempts succeeded.
