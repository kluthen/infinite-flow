---
id: rule_join_inherits_leap_recovery
status: DRAFT
layer: BUSINESS
version: 0.1
priority: 1
human_name: Leap Recovery Carries Across a Join
tags: [v2, release-v2.0, session, phrase-join, leaps]
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
If a session phrase ends mid-leap (its last interval is a large leap whose recovery step has not happened yet), the next phrase generated with its carry-in inherits that recovery obligation exactly as if the leap had occurred inside a single phrase: the next phrase satisfies it under the same leap-recovery rules that apply between notes of one phrase.

## TECHNICAL INTERFACE
The carried-in leap and leap-recovery state is part of the next phrase's generation input.

## EXPECTATION
Whenever a session phrase ends with a pending leap recovery and the next phrase is generated with its carry-in, that next phrase completes the recovery under the same rules that apply within one phrase.
