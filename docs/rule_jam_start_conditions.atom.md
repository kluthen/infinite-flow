---
id: rule_jam_start_conditions
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.2
tags: [v3, release-v3.2, session, jam, session-start]
parents:
  - [[req_jam]]
  - [[rule_session_start_conditions]]
priority: 1
human_name: When a Jam Can Start
dependents: []
---

# When a Jam Can Start

## INTENT
Let a Jam start with no phrase on screen while keeping every other condition a session needs.

## THE RULE / LOGIC
A Jam without a kept doodle can start under the same conditions as any session, apart from two that need a phrase (a phrase on screen, and no new phrase being generated), and with one more: a controller attached. Jam's own settings that the generator does not support still block the start. As for any session, no note starts anything while a review shows, while the player is connecting a controller, or while its transposition check runs. A doodle never starts anything by accident: notes played at Jam mode's Idle are ignored, apart from the starting note and, while tap-in listens, the taps; the doodle is captured only after the count-in.

## TECHNICAL INTERFACE
Jam mode's start check skips the phrase-on-screen and no-generation conditions without a kept doodle, and adds a controller attached.

## EXPECTATION
- A Jam without a kept doodle can start with no phrase on screen.
- Without a controller attached, no Jam starts.
- Settings the generator does not support, a shown review, the connection step and the transposition check still prevent a start.
- No note played at Idle is ever part of a doodle.
