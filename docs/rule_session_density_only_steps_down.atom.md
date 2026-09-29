---
id: rule_session_density_only_steps_down
status: DRAFT
priority: 1
parents:
  - [[req_rolling_practice_session]]
  - [[rule_generated_density_follows_window_width]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
human_name: Session Note Density Only Steps Down
tags: [v2, release-v2.0, session, rhythm]
---

# Session Note Density Only Steps Down

## INTENT
Keep a session's generated note density from switching back up once it has stepped down.

## THE RULE / LOGIC
Once a session has generated a phrase with Eighth because a chosen Sixteenth fell below the tablet-landscape layout's width, every later phrase of that session is generated with Eighth too, even if the window becomes wide enough again; the chosen value applies again from Idle. Phrase 1 is the phrase already on screen at Start, generated at Idle with the density that applied then; the session's own generation starts with phrase 2. Because the density can only step from Sixteenth down to Eighth, never back up, and no rhythm-settings combination that blocks generation uses Eighth, a change of window never brings a running session onto a blocked combination.

## TECHNICAL INTERFACE
A session remembers, until it ends, whether it has stepped its generated note density down to Eighth.

## EXPECTATION
- After a session generates a phrase with Eighth under the window-width rule, every later phrase of that session is generated with Eighth, whatever the window does.
- The chosen value applies again from Idle.
- No change of window ever brings a running session onto a rhythm-settings combination that blocks generation.
