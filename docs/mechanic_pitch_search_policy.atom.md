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
