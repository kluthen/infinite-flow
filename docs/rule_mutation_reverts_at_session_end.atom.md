---
id: rule_mutation_reverts_at_session_end
status: DRAFT
priority: 1
tags: [v2, release-v2.1, session, session-end, player-controls]
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_session_end_generates_next_phrase_one]]
dependents: []
human_name: Mutated Settings Return to the Player's Choice at Session End
type: RULE
layer: BUSINESS
notes: Ingested 2026-10-03 from the settled master spec (D182, from ux Q64), a product owner decision. Not built yet: the session engine only reports each settings change, and the restore is planned for the session controller (v2 build plan chunk 25); no code implements this rule.
version: 0.1
---

# Mutated Settings Return to the Player's Choice at Session End

## INTENT
Make a mutation a variation inside one session, never a new choice made for the player: once the session ends, the player finds the settings they chose.

## THE RULE / LOGIC
A mutation lasts only for its session. When the session ends, however it ends, every setting the settings-mutation flag changed during it returns to the value the player had chosen before the session started, just as adaptive tempo returns the tempo control to the tempo the session started from. A register mutated from Varying returns to Varying, and the musical profile's customized marking returns to what it was before the session. The restore does not touch the flag's own on/off choice. It happens as the session ends, before the fresh phrase generated at the session's end, so that phrase is generated from the restored settings.

## TECHNICAL INTERFACE
At every session end, the settings controls show the values the player chose before the session, and the fresh end-of-session phrase is generated from them.

## EXPECTATION
- After a session ends, however it ends, every setting the flag changed during it holds the value the player chose before the session.
- A register mutated from Varying is Varying again after the session.
- The musical profile's customized marking after the session is what it was before the session.
- The flag's own on/off choice is the same after the session as during it.
- The fresh phrase generated at the session's end is generated from the restored settings.
