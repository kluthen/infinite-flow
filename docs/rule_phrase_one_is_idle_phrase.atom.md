---
id: rule_phrase_one_is_idle_phrase
status: DRAFT
layer: BUSINESS
human_name: Phrase on Screen Becomes Phrase 1
parents:
  - [[req_rolling_practice_session]]
type: RULE
version: 0.2
priority: 1
tags: [v2, release-v2.0, session, session-start]
dependents:
  - [[service_session_engine]]
---

# Phrase on Screen Becomes Phrase 1

## INTENT
Start a session from exactly the phrase the player is looking at, whether or not the review of the last session is showing.

## THE RULE / LOGIC
When a session starts from Idle, the review showing or not, the phrase already on screen becomes phrase 1 of the session; there is no separate step that generates phrase 1. No session can start while a new phrase is being generated, so which phrase becomes phrase 1 is never ambiguous. While the review shows, the phrase on screen was first generated fresh when the previous session ended, and may since have been replaced as at Idle (a Regenerate, an instrument-profile switch, a too-wide replacement); it is never a phrase the previous session played.

## TECHNICAL INTERFACE
Starting a session, from Idle or with the review showing, takes the phrase on screen, unchanged, as the session's first phrase.

## EXPECTATION
- Phrase 1 of every session is exactly the phrase that was on screen when it started, with the same request and seed, whether or not the review was showing.
- Phrase 1 of a session started with the review showing is never a phrase the previous session played.
