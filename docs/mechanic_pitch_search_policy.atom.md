---
id: mechanic_pitch_search_policy
status: REVIEW
dependents: []
layer: ARCHITECTURE
priority: 1
parents:
  - [[entity_pitch_candidate_domain]]
version: 1.0
human_name: Pitch Search Policy
type: MECHANIC
tags: pitch
---

# Pitch Search Policy

## INTENT
Classify deterministic pitch-search completion with versioned fuel independently of wall-clock execution.

## THE RULE / LOGIC
For one bound pitch search, the policy applies a versioned deterministic fuel allowance and decrements it only for documented search work. It returns natural exhaustion only after the finite candidate space is exhausted, and returns search_limit_exceeded only when fuel is consumed first. The allowance and classification are independent of wall-clock time, machine speed, iterator chunking, and diagnostics.

## TECHNICAL INTERFACE
The pitch planner supplies one versioned policy and immutable bound input, then receives a deterministic allowance and success, natural exhaustion, or search_limit_exceeded. The policy exposes no timer, adaptive counter, or mutable global budget.

## EXPECTATION
Equivalent bound searches under one policy version receive the same completion classification on every machine. Natural exhaustion is never reported as search_limit_exceeded, and a fuel cutoff is never reported as natural exhaustion.
