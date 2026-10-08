---
id: rule_jam_start_conditions
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.2, session, jam, session-start]
parents:
  - [[req_jam]]
  - [[rule_session_start_conditions]]
priority: 1
human_name: When a Jam Can Start
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
---

# When a Jam Can Start

## INTENT
Let a Jam start with no phrase on screen while keeping every other condition a session needs.

## THE RULE / LOGIC
A Jam without a held doodle can start under the same conditions as any session, apart from two that need a phrase: a phrase on screen, and no new phrase being generated. Settings the generator does not support still block the start, and no note starts anything while a review shows, while the player is connecting a controller, or while the transposition check runs. Notes played at Idle never become part of a doodle: the doodle is captured only after the count-in.

## TECHNICAL INTERFACE
The start check skips the phrase-on-screen and no-generation conditions in Jam mode without a held doodle.

## EXPECTATION
- A Jam without a held doodle can start with no phrase on screen.
- Unsupported rhythm settings, a shown review, the connection step and the transposition check still prevent a start.
- No note played at Idle is ever part of a doodle.
