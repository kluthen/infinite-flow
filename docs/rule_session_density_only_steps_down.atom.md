---
id: rule_session_density_only_steps_down
status: DRAFT
priority: 1
parents:
  - [[req_rolling_practice_session]]
  - [[rule_generated_density_follows_window_width]]
dependents:
  - [[service_session_engine]]
type: RULE
layer: BUSINESS
version: 0.2
human_name: Session Note Density Only Steps Down
tags: [v2, release-v2.0, session, rhythm]
notes: Revised 2026-09-30 in v2 chunk 8 (previous version 0.1) as a clarification of existing behaviour, accepted by the chunk owner under the owner standing rule to settle minor issues and record them; AWAITING THE OWNER ACCEPTANCE. The step-down is now stated to happen when a phrase request is built with Eighth for a chosen Sixteenth, a failed attempt included, instead of when a phrase is generated with Eighth, so a retry cannot step back up onto a blocked combination.
---

# Session Note Density Only Steps Down

## INTENT
Keep a session's generated note density from switching back up once it has stepped down.

## THE RULE / LOGIC
Once a session has asked for a phrase with Eighth because a chosen Sixteenth fell below the tablet-landscape layout's width, every later phrase of that session is generated with Eighth too, even if the window becomes wide enough again; the chosen value applies again from Idle. The session steps down as soon as it builds a phrase request with Eighth for a chosen Sixteenth, whether or not that attempt then produces a phrase: a failed attempt counts too, so a retry never steps back up to Sixteenth. Phrase 1 is the phrase already on screen at Start, generated at Idle with the density that applied then; the session's own generation starts with phrase 2. Because the density can only step from Sixteenth down to Eighth, never back up, and no rhythm-settings combination that blocks generation uses Eighth, a change of window never brings a running session onto a blocked combination.

## TECHNICAL INTERFACE
A session remembers, until it ends, whether it has stepped its generated note density down to Eighth; it starts remembering when it builds the first phrase request with Eighth for a chosen Sixteenth.

## EXPECTATION
- After a session builds a phrase request with Eighth under the window-width rule, whether or not that attempt succeeds, every later phrase of that session is generated with Eighth, whatever the window does.
- The chosen value applies again from Idle.
- No change of window ever brings a running session onto a rhythm-settings combination that blocks generation.
