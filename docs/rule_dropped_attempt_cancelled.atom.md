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
notes: Revised 2026-10-08 to version 0.3 (previous version 0.2) with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A12), together with the CONTRACT 3.0 MAJOR bump; stays STABLE. A cancelled attempt can end a session in one case: when the last attempt for a Jam's phrase 1 is cancelled at its deadline, the Jam ends as its own failure ladder says. The spec's list of contract changes names this since spec D245. Earlier: Status DRAFT to STABLE on 2026-10-07 with the product owner's approval, kept as its own rule rather than merged into rule_session_generation_failure_ladder, together with the matching CONTRACT 1.8 MINOR bump. Backed by the code of 5a587bb (the engine's cancel-generation output, the runner aborting that attempt's signal, the worker client replacing the worker) and its linked tests (tests/unit/session/session-engine-cancel.spec.ts, session-engine-cutover.spec.ts, session-runner-cancel.spec.ts, tests/unit/generation-worker/generation-worker-client-cancel.spec.ts), and by the real-cost deadline sweep of the same commit: 568 cases at 60, 120 and 240 BPM, no repeat and no undecided phrase. Earlier: Created 2026-10-07 at DRAFT during pre-code architecture capture, from the product owner's rulings of 2026-10-07 (spec D200, master spec section 4). Revised the same day to version 0.2 (previous version 0.1, never committed) for the owner's ruling approving the time-aware ladder (spec D203, master spec v1.37 section 4): the cancellation is now required, no longer something the build may leave out, and covers the standalone attempt as well as a carry-in one. Kept as its own rule rather than merged into rule_session_generation_failure_ladder: the ladder rule holds when the ladder gives up a carry-in attempt for the standalone one (and cancels it), while this rule holds that whatever attempt is still running at the deadline, after the ladder has run out of time, is cancelled where it runs, a separate guarantee about the generator staying free for the next phrase. The owner may confirm it (it would then join the CONTRACT surface with a MINOR bump) or ask for it to be merged into the ladder rule.
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
