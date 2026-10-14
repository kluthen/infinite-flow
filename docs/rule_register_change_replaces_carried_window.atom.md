---
id: rule_register_change_replaces_carried_window
status: REVIEW
tags: [v2, release-v2.0, part-v2.1, session, phrase-join, register]
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_session_change_applies_at_phrase_boundary]]
  - [[rule_varying_register_once_per_session]]
layer: BUSINESS
version: 0.1
dependents:
  - [[module_register_intent_boundary]]
  - [[module_session_carry_in_after_change]]
  - [[service_session_engine]]
type: RULE
priority: 1
human_name: Register Change Replaces the Carried Window
---

# Register Change Replaces the Carried Window

## INTENT

Make a register change applied during a session take effect in the very next phrase.

## THE RULE / LOGIC

When a register change applies at a phrase boundary during a session, the register window carried into the next phrase is replaced by the new register's window. A change to Varying, which only a source other than the settings-mutation flag can make, drops the carry-in: the next phrase is generated standalone with Varying, so its register window is resolved again, as phrase 1's was.

## TECHNICAL INTERFACE

After a register change, the next phrase's carry-in holds the new register's window; after a change to Varying, the next phrase's request has no carry-in.

## EXPECTATION

- After a register change to Low, Middle or High, the next phrase is generated in that register's window.
- After a register change to Varying, the next phrase is generated standalone and its register window is resolved again.
