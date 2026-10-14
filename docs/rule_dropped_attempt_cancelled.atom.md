---
id: rule_dropped_attempt_cancelled
status: STABLE
human_name: Dropped Attempt Is Cancelled
dependents:
  - [[module_generation_prewarm]]
  - [[module_generation_worker_cancellation]]
  - [[module_session_failure_ladder]]
  - [[service_session_engine]]
  - [[service_session_runner]]
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, session, look-ahead, error-handling]
parents:
  - [[rule_session_generation_failure_ladder]]
type: RULE
version: 0.3
---

# Dropped Attempt Is Cancelled

## INTENT
Keep a generation attempt the session no longer needs from delaying the attempts after it.

## THE RULE / LOGIC
During a session, a generation attempt still running when its phrase's deadline comes, whether a carry-in attempt or the standalone attempt, is cancelled where it runs, so a later generation request never waits behind it. Without the cancellation, a dropped attempt that takes far longer than a successful one would keep the generator busy past the deadline and make the next phrase miss its own deadline too. The cancelled attempt is already dropped: the previous phrase is repeated as the failure ladder says or, for a Jam's phrase 1, which has no phrase before it, the Jam ends as that ladder says; nothing the cancelled attempt would have produced is ever shown. At Idle there is no deadline, so nothing is cancelled for this reason.

## TECHNICAL INTERFACE
Cancellation runs silently behind a session; the player sees no sign of it beyond the next phrases arriving on time.

## EXPECTATION
- An attempt still generating at its phrase's deadline is cancelled, and the next phrase's generation starts without waiting for it to finish.
- A cancelled attempt never becomes a shown phrase. It never ends a session, apart from a Jam's phrase 1: when its last attempt is cancelled at the deadline, the Jam ends as its own failure ladder says.
