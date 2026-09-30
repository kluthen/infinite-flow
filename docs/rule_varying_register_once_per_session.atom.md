---
id: rule_varying_register_once_per_session
status: DRAFT
version: 0.1
priority: 1
tags: [v2, release-v2.0, session, register]
parents:
  - [[rule_join_carry_in_limited]]
human_name: Varying Register Resolved Once per Session
dependents:
  - [[service_session_engine]]
type: RULE
layer: BUSINESS
---

# Varying Register Resolved Once per Session

## INTENT
Keep a session in one register window instead of letting the register jump from phrase to phrase.

## THE RULE / LOGIC
When the register control is set to Varying, the register window is resolved once per session, for phrase 1, and then stays fixed for every later phrase of that session. Only a register change applied during the session re-resolves it. A fixed register setting (Low, Middle or High) behaves exactly as it does outside a session.

## TECHNICAL INTERFACE
Carry-in passes the resolved register window from each phrase to the next.

## EXPECTATION
- With Varying selected, every phrase of a session uses the register window resolved for phrase 1 unless a register change applied during the session re-resolves it.
- The register stays stable across a whole session unless a setting genuinely changes it.
