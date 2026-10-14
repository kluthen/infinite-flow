---
id: rule_join_inherits_leap_recovery
status: REVIEW
layer: BUSINESS
version: 0.2
priority: 1
human_name: Leap Recovery Carries Across a Join
tags: [v2, release-v2.0, session, phrase-join, leaps, changes-in-v3.2]
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_leap_recovery]]
dependents: []
type: RULE
---

# Leap Recovery Carries Across a Join

## INTENT
Honour a large leap's recovery obligation even when the leap ends a session phrase.

## THE RULE / LOGIC
A session phrase generated with carry-in may end mid-leap: its last interval is a large leap whose recovery step has not happened yet. The next phrase, when generated with that carry-in, inherits the recovery obligation exactly as if the leap had occurred inside a single phrase, and satisfies it under the same leap-recovery rules that apply between notes of one phrase. A phrase generated without carry-in (the Idle phrase that becomes a session's phrase 1, or the standalone phrase the failure handling falls back to) obeys the leap-recovery rules in full, so it never ends owing a recovery. Across a join into a phrase generated without carry-in, or into a repeated phrase (the previous phrase shown again as it was), a recovery left owing is not settled: it is dropped at that join.

## TECHNICAL INTERFACE
The carried-in leap and leap-recovery state is part of the next phrase's generation input.

## EXPECTATION
- Whenever a session phrase ends with a pending leap recovery and the next phrase is generated with its carry-in, that next phrase completes the recovery under the same rules that apply within one phrase.
- A phrase generated without carry-in never ends with a pending leap recovery.
- A join into a phrase generated without carry-in, or into a repeated phrase, settles no recovery left owing by the phrase before.
