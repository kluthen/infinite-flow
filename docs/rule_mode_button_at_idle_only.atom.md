---
id: rule_mode_button_at_idle_only
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
human_name: The Mode Button Works at Idle Only
tags: [v3, release-v3.2, jam, session-mode, idle]
priority: 1
parents:
  - [[req_jam]]
dependents: []
---

# The Mode Button Works at Idle Only

## INTENT
Switch between session mode and Jam mode only when nothing is playing or under review, and never by accident.

## THE RULE / LOGIC
The mode button switches from session mode to Jam mode, and from Jam mode back. It works at Idle only: never while a session or a Jam is playing, and never while a review is shown. Jam is a mode rather than a second Start button, so that a played note can start a Jam without two starts competing for one note: in Jam mode the home note starts a Jam, in session mode the starting note starts a session, and the two never meet. Only the mode button, and Jam again on this doodle in a kept Jam session's review, change the mode: presets neither hold nor change it, and no controller event or played note does.

## TECHNICAL INTERFACE
A mode button, available at Idle only.

## EXPECTATION
- The mode button switches modes at Idle and is unavailable while a session or a Jam plays or a review shows.
- No preset, controller event or played note changes the mode.
