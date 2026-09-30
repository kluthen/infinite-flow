---
id: rule_phrase_one_is_idle_phrase
status: DRAFT
layer: BUSINESS
human_name: Phrase on Screen Becomes Phrase 1
parents:
  - [[req_rolling_practice_session]]
type: RULE
version: 0.1
priority: 1
tags: [v2, release-v2.0, session, session-start]
dependents:
  - [[service_session_engine]]
---

# Phrase on Screen Becomes Phrase 1

## INTENT
Start a session from exactly the phrase the player is looking at.

## THE RULE / LOGIC
When a session starts from Idle, the phrase already on screen becomes phrase 1 of the session; there is no separate step that generates phrase 1. No session can start while a new phrase is being generated, so which phrase becomes phrase 1 is never ambiguous.

## TECHNICAL INTERFACE
Starting a session from Idle takes the phrase on screen, unchanged, as the session's first phrase.

## EXPECTATION
Phrase 1 of every session started from Idle is exactly the phrase that was on screen when it started, with the same request and seed.
