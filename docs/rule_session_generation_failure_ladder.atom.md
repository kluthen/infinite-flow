---
id: rule_session_generation_failure_ladder
status: DRAFT
type: RULE
version: 0.1
priority: 1
dependents:
  - [[rule_repeat_phrase_marked_internally_only]]
  - [[rule_struggling_generator_notice]]
layer: BUSINESS
human_name: Session Generation Failure Ladder
tags: [v2, release-v2.0, session, look-ahead, error-handling]
parents:
  - [[rule_look_ahead_deadline]]
---

# Session Generation Failure Ladder

## INTENT
Keep a session running through a generation failure without ever blocking or penalizing the player.

## THE RULE / LOGIC
During a session the player never sees a blocking generation-failure alert. A failed attempt is either a generation that found no phrase or a phrase that does not fit the staff. When an attempt for the next phrase fails, the app:

1. retries silently, up to three times, with a fresh seed and the same carry-in, while the deadline still allows it;
2. if that keeps failing, retries once more without carry-in, as a standalone phrase: the join is not smoothed, but a valid phrase is shown;
3. if the deadline passes regardless, repeats the previous phrase as the next one, and records the repeat in the session history.

A phrase is repeated only when no attempt has produced a valid phrase by the deadline, and the repeat is recorded the same way whichever kind of failure led to it. A generation failure never stops the session: stopping would penalize the player for something they did not cause, while repeating a phrase is musically harmless.

## TECHNICAL INTERFACE
Failure handling runs silently behind a session; its only visible outcomes are a shown phrase, a repeated phrase, or the struggling-generator notice.

## EXPECTATION
- Through any generation failure, the session keeps running and no blocking alert appears.
- Each next phrase is a successful retry with carry-in, a standalone phrase, or a repeat of the previous phrase recorded in the history.
- A repeat happens only when no attempt produced a valid phrase by the deadline.
