---
id: rule_count_in_shown_on_screen
status: STABLE
type: RULE
version: 0.2
priority: 1
human_name: Count-In Shown on Screen
parents:
  - [[rule_count_in_always_clicks]]
layer: BUSINESS
tags: [v2, release-v2.0, session, session-start]
dependents:
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
---

# Count-In Shown on Screen

## INTENT
Let the player see the count-in as well as hear it.

## THE RULE / LOGIC
For both kinds of start, the count-in's beats are counted on screen in time with the click, and whenever phrase 1 exists at the start, its whole first measure stays fully visible throughout the count-in. In a Jam that begins with a doodle not yet played, no phrase exists during the count-in; the beats are still counted on screen. How the count looks belongs to the interface design.

## TECHNICAL INTERFACE
The session view shows a beat count in time with the count-in click, with phrase 1's first measure visible when phrase 1 exists.

## EXPECTATION
- For both kinds of start, the count-in's beats are shown on screen in time with the click.
- Whenever phrase 1 exists at the start, its whole first measure stays fully visible throughout the count-in.
