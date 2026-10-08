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
notes: Revised 2026-10-08 to version 0.2 (previous version 0.1) with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A7), together with the CONTRACT 3.0 MAJOR bump; stays STABLE. Phrase 1's first measure is shown during the count-in whenever phrase 1 exists; a Jam that begins with a doodle not yet played has no phrase during its count-in. Earlier: Status REVIEW to STABLE on 2026-10-07 with the product owner's approval, together with the matching CONTRACT 1.5 MINOR bump. Backed by the v2.0 gate tests linked to it, among them tests/e2e/session/session-start.spec.ts (the count-in after a Start click) and tests/e2e/session/session-midi-start.spec.ts (the count-in started by the starting note, beat by beat with its clicks, phrase 1 in view; added in eab0519), with tests/unit/session/count-in-display.spec.ts.
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
