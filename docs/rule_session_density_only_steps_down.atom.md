---
id: rule_session_density_only_steps_down
status: DRAFT
priority: 1
parents:
  - [[req_rolling_practice_session]]
  - [[rule_generated_density_follows_window_width]]
dependents:
  - [[module_session_density_step_down]]
  - [[rule_mutation_sixteenth_blocked_after_step_down]]
  - [[service_session_engine]]
type: RULE
layer: BUSINESS
version: 0.3
human_name: Session Note Density Only Steps Down
tags: [v2, release-v2.0, session, rhythm]
notes: Revised 2026-09-30 in v2 chunk 8 (previous version 0.1) as a clarification of existing behaviour, accepted by the chunk owner under the owner standing rule to settle minor issues and record them; AWAITING THE OWNER ACCEPTANCE. The step-down is now stated to happen when a phrase request is built with Eighth for a chosen Sixteenth, a failed attempt included, instead of when a phrase is generated with Eighth, so a retry cannot step back up onto a blocked combination. Revised 2026-10-03 in v2 chunk 24 (previous version 0.2) to follow the owner decision of 2026-10-03 (D177, with D181) on note-density mutations; after the step-down a chosen Sixteenth keeps generating as Eighth for the rest of the session, and the rule covers the window-width step-down only, not a settings mutation, which steps from the Eighth generated (to Quarter) and never lands on Sixteenth after a step-down. Resolves the conflict with the chunk 24 mutation atoms.
---

# Session Note Density Only Steps Down

## INTENT

Keep a session's generated note density from switching back up to Sixteenth once the window-width rule has stepped it down.

## THE RULE / LOGIC

Once a session has asked for a phrase with Eighth because a chosen Sixteenth fell below the tablet-landscape layout's width, a chosen Sixteenth keeps being generated as Eighth for the rest of that session, even if the window becomes wide enough again; the chosen value applies again from Idle. The session steps down as soon as it builds a phrase request with Eighth for a chosen Sixteenth, whether or not that attempt then produces a phrase: a failed attempt counts too, so a retry never steps back up to Sixteenth. Phrase 1 is the phrase already on screen at Start, generated at Idle with the density that applied then; the session's own generation starts with phrase 2. Because the window can only step a chosen Sixteenth down to Eighth, never back up, and no rhythm-settings combination that blocks generation uses Eighth, a change of window never brings a running session onto a blocked combination.

This rule governs the window-width step-down only, not a settings mutation. A note-density mutation in a session that has stepped down steps from the Eighth being generated, so it can move the density to Quarter, and it never lands on Sixteenth for the rest of that session.

## TECHNICAL INTERFACE

A session remembers, until it ends, whether it has stepped its generated note density down to Eighth; it starts remembering when it builds the first phrase request with Eighth for a chosen Sixteenth. While it remembers, a chosen Sixteenth is requested as Eighth.

## EXPECTATION

- After a session builds a phrase request with Eighth under the window-width rule, whether or not that attempt succeeds, every later phrase of that session generated for a chosen Sixteenth is generated with Eighth, whatever the window does.
- In such a session, a note-density mutation steps from Eighth and may land on Quarter, never on Sixteenth.
- The chosen value applies again from Idle.
- No change of window ever brings a running session onto a rhythm-settings combination that blocks generation.
