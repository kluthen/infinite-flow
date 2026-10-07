---
id: mechanic_pitch_search_policy
status: REVIEW
dependents: []
layer: ARCHITECTURE
priority: 1
parents:
  - [[entity_pitch_candidate_domain]]
  - [[rule_no_carry_in_output_matches_v1]]
  - [[rule_session_generation_failure_ladder]]
version: 1.1
human_name: Pitch Search Policy
type: MECHANIC
tags: pitch
notes: Status DRAFT to REVIEW on 2026-10-07 (post-task sync, same version 1.1): the code landed in 888b548 (merged in eb70983): src/domain/generation/orchestration/search-ledger.ts builds generation-search-v1 (250,000 units per window) and generation-search-carry-in-v1 (160,000), with linked tests (tests/unit/domain/generation/orchestration/generation-search-policy-choice.spec.ts, search-ledger.spec.ts); the later pitch-search speed-ups (11336a5, 3911d03) left fuel accounting and outputs unchanged. Earlier: Revised 2026-10-07 before code (previous version 1.0, pre-code architecture capture) for the owner-approved failure ladder version 0.3 and its search allowance (spec D200-D202): a second policy version, generation-search-carry-in-v1 with 160,000 units per window, for generations with carry-in, documented with the 2026-10-07 sweep evidence; generation-search-v1 is unchanged. Parents rule_session_generation_failure_ladder and rule_no_carry_in_output_matches_v1 added, the business rules the two allowances serve. Status DRAFT until the code lands.
---

# Pitch Search Policy

## INTENT
Classify deterministic pitch-search completion with versioned fuel independently of wall-clock execution, under one of two versioned allowances: the first release's, and a smaller one for attempts with carry-in.

## THE RULE / LOGIC
For one bound search, the policy applies a versioned deterministic fuel allowance per window and decrements it only for documented search work. It returns natural exhaustion only after the finite candidate space is exhausted, and returns search_limit_exceeded only when fuel is consumed first. The allowance and classification are independent of wall-clock time, machine speed, iterator chunking, and diagnostics.

Two policy versions exist, each with a fixed allowance:

- `generation-search-v1`, 250,000 fuel units per window: the first release's allowance, used by every generation without carry-in, so its output for a given request and seed stays byte-identical to the first release.
- `generation-search-carry-in-v1`, 160,000 fuel units per window: used by every generation with carry-in, so a carry-in attempt that cannot succeed stops sooner, fails like any other attempt and climbs the failure ladder instead of using up the look-ahead deadline. The allowance is set with a margin above every successful carry-in attempt measured: on 2026-10-07 the full deadline sweep's 3,366 distinct successful carry-in attempts used at most 131,137 units (99.9th percentile 73,646, 99th percentile 11,276; this larger sample supersedes the 2026-10-06 figure of 71,551), and 160,000 is 22% above that maximum.

The allowance counts search work, not time, so it does not by itself bound how long an attempt takes.

## TECHNICAL INTERFACE
The pitch planner and window search receive one versioned `GenerationSearchPolicy` (`version`, `windowFuel`) and immutable bound input, then receive a deterministic allowance and success, natural exhaustion, or search_limit_exceeded. Both policies are deep-frozen values built in `src/domain/generation/orchestration/search-ledger.ts`, with version labels `generation-search-v1` and `generation-search-carry-in-v1`. Which policy a generation uses is picked by generation orchestration from its intent, not by the policy. The policy exposes no timer, adaptive counter, or mutable global budget.

## EXPECTATION
Equivalent bound searches under one policy version receive the same completion classification on every machine. Natural exhaustion is never reported as search_limit_exceeded, and a fuel cutoff is never reported as natural exhaustion. A generation without carry-in searches under `generation-search-v1` with 250,000 units per window, unchanged from the first release; a generation with carry-in searches under `generation-search-carry-in-v1` with 160,000 units per window.
