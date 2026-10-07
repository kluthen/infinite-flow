---
id: rule_count_in_shown_on_screen
status: STABLE
type: RULE
version: 0.1
priority: 1
human_name: Count-In Shown on Screen
parents:
  - [[rule_count_in_always_clicks]]
layer: BUSINESS
tags: [v2, release-v2.0, session, session-start]
dependents:
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
notes: Status REVIEW to STABLE on 2026-10-07 with the product owner's approval, together with the matching CONTRACT 1.5 MINOR bump. Backed by the v2.0 gate tests linked to it, among them tests/e2e/session/session-start.spec.ts (the count-in after a Start click) and tests/e2e/session/session-midi-start.spec.ts (the count-in started by the starting note, beat by beat with its clicks, phrase 1 in view; added in eab0519), with tests/unit/session/count-in-display.spec.ts.
---

# Count-In Shown on Screen

## INTENT
Let the player see the count-in as well as hear it.

## THE RULE / LOGIC
For both kinds of start, the count-in's beats are counted on screen in time with the click, and phrase 1's whole first measure stays fully visible throughout the count-in. How the count looks belongs to the interface design.

## TECHNICAL INTERFACE
The session view shows a beat count in time with the count-in click, with phrase 1's first measure visible.

## EXPECTATION
- For both kinds of start, the count-in's beats are shown on screen in time with the click.
- Phrase 1's whole first measure stays fully visible throughout the count-in.
