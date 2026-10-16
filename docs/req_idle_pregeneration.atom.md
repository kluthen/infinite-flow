---
id: req_idle_pregeneration
status: REVIEW
priority: 1
human_name: Pre-Generating Phrases at Idle
tags: [v3, release-v3.0, idle, generation, session, changes-in-v3.2]
parents:
  - [[req_rolling_practice_session]]
type: REQUIREMENT
layer: BUSINESS
dependents:
  - [[module_idle_pregeneration_queue]]
  - [[module_session_pregeneration_plan]]
  - [[module_session_ready_phrases]]
  - [[rule_pregenerated_phrase_matches_session]]
  - [[rule_pregeneration_discarded_on_change]]
  - [[rule_pregeneration_yields_to_player]]
  - [[rule_start_never_waits_for_pregeneration]]
version: 0.1
---

# Pre-Generating Phrases at Idle

## INTENT
Have phrases ready before Start, so that even the fastest sessions begin with time in hand.

## THE RULE / LOGIC
From v3.0, while the app is Idle with a phrase 1 on screen that a session could start from, it generates in the background, one after another, up to four phrases that would follow that phrase 1 in a session. A session spends them first, then looks one phrase ahead as before. They are never topped up during a session. Generated before Start with no deadline, the second phrase can join the first smoothly even at the fastest tempos. Background generation does not run while a review is shown, and pre-generated phrases are never saved: they are gone on reload.

## TECHNICAL INTERFACE
At Idle, a background queue of up to four phrases following phrase 1, consumed by the next session.

## EXPECTATION
- At Idle, up to four phrases following phrase 1 are generated in the background.
- No phrase is pre-generated while the review shows, and none survives a reload.
- A session uses the pre-generated phrases first and never tops them up.
