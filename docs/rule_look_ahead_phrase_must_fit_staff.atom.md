---
id: rule_look_ahead_phrase_must_fit_staff
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
human_name: Look-Ahead Phrase Must Fit the Session Staff
tags: [v2, release-v2.0, session, look-ahead, notation]
parents:
  - [[rule_look_ahead_deadline]]
dependents: []
version: 0.1
---

# Look-Ahead Phrase Must Fit the Session Staff

## INTENT
Never show a session phrase that the staff cannot draw readably.

## THE RULE / LOGIC
During a session, a generated phrase is valid only if it can be drawn at the staff's minimum readable size (the smallest size the interface design allows for the staff) in the staff layout the session holds. Whether it fits depends on the phrase's own content, so a generated phrase can fail to fit. A phrase that does not fit is never shown: it counts as a failed attempt, exactly like a generation that found no phrase, and goes through the same failure steps. The check is invisible to the player. A phrase is checked against the window's size at the time it is checked; once it has passed, it is not retried, and if a later change to the window's size means it no longer fits before it is drawn, the session ends instead. A session never shows a notation error for a look-ahead phrase.

## TECHNICAL INTERFACE
Each look-ahead phrase is checked against the session's held staff layout, at the window's current size, before it is accepted.

## EXPECTATION
- No phrase that cannot be drawn at the staff's minimum readable size in the session's layout is ever shown during a session.
- Each such phrase is treated as a failed generation attempt.
- No notation error ever appears during a session.
