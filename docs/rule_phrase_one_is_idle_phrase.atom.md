---
id: rule_phrase_one_is_idle_phrase
status: REVIEW
layer: BUSINESS
human_name: Phrase on Screen Becomes Phrase 1
parents:
  - [[req_rolling_practice_session]]
type: RULE
version: 0.3
priority: 1
tags: [v2, release-v2.0, session, session-start]
dependents:
  - [[module_session_rolling_display]]
  - [[module_session_staff_refill]]
  - [[service_session_engine]]
  - [[service_workspace_session_flow]]
---

# Phrase on Screen Becomes Phrase 1

## INTENT
Start a session from exactly the phrase the player is looking at.

## THE RULE / LOGIC
When a session starts from Idle, the phrase already on screen becomes phrase 1 of the session; there is no separate step that generates phrase 1. No session can start while a new phrase is being generated, so which phrase becomes phrase 1 is never ambiguous. No session starts while the last session's review shows: the player leaves it first, and phrase 1 is then the phrase on screen at Idle, first generated fresh when the previous session ended and possibly replaced since as at Idle (a Regenerate, an instrument-profile switch, a too-wide replacement), never one the previous session played.

## TECHNICAL INTERFACE
Starting a session from Idle takes the phrase on screen, unchanged, as the session's first phrase.

## EXPECTATION
- Phrase 1 of every session is exactly the phrase that was on screen at Idle when it started, with the same request and seed.
- Phrase 1 of a session started after a previous session is never a phrase the previous session played.
