---
id: rule_session_generation_failure_ladder
status: STABLE
type: RULE
version: 0.4
priority: 1
dependents:
  - [[mechanic_pitch_search_policy]]
  - [[module_generation_worker_cancellation]]
  - [[module_session_failure_ladder]]
  - [[module_session_look_ahead_timing]]
  - [[rule_dropped_attempt_cancelled]]
  - [[rule_repeat_phrase_marked_internally_only]]
  - [[rule_setting_change_rechecks_pitch_carry_in]]
  - [[rule_struggling_generator_notice]]
  - [[service_session_engine]]
  - [[service_session_runner]]
layer: BUSINESS
human_name: Session Generation Failure Ladder
tags: [v2, release-v2.0, session, look-ahead, error-handling]
parents:
  - [[rule_look_ahead_deadline]]
notes: Revised 2026-10-07 to version 0.4 (previous version 0.3) with the product owner's ruling of 2026-10-07 approving the time-aware ladder (spec D203, with D200): the ladder keeps time for the standalone attempt, cancelling a running carry-in attempt and requesting the standalone attempt at once when the time left before the deadline falls below what the standalone attempt needs (its time budget plus the cost of cancelling where it runs, measured constants), applying from the moment of the request, sending a later carry-in failure straight to the standalone attempt, keeping the standalone attempt's request and seed, and leaving Idle unchanged. It stays STABLE because the wording matches the approved ruling; CONTRACT takes a MINOR bump to 1.7. Cancelling the attempt still in flight at the deadline stays its own rule, rule_dropped_attempt_cancelled. Earlier: Revised 2026-10-07 to version 0.3 (previous version 0.2) with the product owner's 2026-10-07 approval (spec D200-D202): a carry-in attempt whose search covered every candidate skips its remaining carry-in retries, the standalone attempt then uses the request and seed it would have had after three failed retries, and every other failed attempt (a search-allowance cutoff or a phrase that does not fit included) keeps its retries. It stays STABLE because the wording matches the approved directions. Earlier: revised 2026-09-30 in v2 chunk 8 (previous version 0.1) as a clarification of existing behaviour, accepted by the chunk owner under the owner standing rule to settle minor issues and record them; the product owner accepted it on 2026-10-05 (spec D186). Adds a rejected generation request (a generator crash on that request, or a generator that stopped working) as a failed attempt like no phrase found; states that the standalone retry gets a fresh seed and keeps the session register window; states that the repeat is decided at the deadline.
---

# Session Generation Failure Ladder

## INTENT

Keep a session running through a generation failure without ever blocking or penalizing the player.

## THE RULE / LOGIC
During a session the player never sees a blocking generation-failure alert. A failed attempt is a generation that found no phrase, a generation request that was rejected because the generator crashed on it or had stopped working, or a phrase that does not fit the staff; each counts the same way. When an attempt for the next phrase fails, the app:

1. retries silently, up to three times, with a fresh seed and the same carry-in, while the time left before the deadline still leaves the standalone attempt of step 2 the time it needs (below). A carry-in attempt whose search covered every candidate without finding a phrase is not retried with carry-in: the candidates do not depend on the seed, which only orders them, so every such retry would fail the same way, and the app goes straight to step 2. Every other failed attempt keeps its carry-in retries while the time allows, including a carry-in attempt stopped by its search allowance (the bounded amount of search work one attempt may do) and a phrase that does not fit the staff;
2. if that keeps failing, retries once more without carry-in, as a standalone phrase with a fresh seed that keeps the register window the session already uses: the join is not smoothed, but a valid phrase is shown;
3. if no valid phrase exists when the deadline comes, repeats the previous phrase as the next one, and records the repeat in the session history. The repeat is decided at the deadline, never earlier.

The ladder keeps time for the standalone attempt. What the standalone attempt needs is its own time budget plus the cost of cancelling an attempt where it runs, both constants the build measures and documents with their evidence. Once the time left before the deadline falls below that amount, no carry-in attempt starts: the carry-in attempt running at that moment is cancelled where it runs and the standalone attempt is requested at once, and a carry-in attempt that fails after that moment is followed directly by the standalone attempt. This holds from the moment the phrase is requested: when the deadline is already that close, as a one-measure deadline can be at a fast tempo, the standalone attempt is the first one made. This bounds the time generation takes whatever the generator does.

Whenever step 1's carry-in retries are skipped or cut short, for either reason above, the standalone attempt is generated with the same request and seed it would have had after three failed retries, so skipping changes which attempts run, never what the standalone attempt generates. Which attempt produces a phrase can therefore depend on the machine's speed, as whether a phrase is repeated already could; what each attempt generates for its request and seed never does.

A phrase is repeated only when no attempt has produced a valid phrase by the deadline, and the repeat is recorded the same way whichever kind of failure led to it. A generation failure never stops the session: stopping would penalize the player for something they did not cause, while repeating a phrase is musically harmless. At Idle a phrase has no carry-in and no deadline, so none of this ladder's timing applies there.

## TECHNICAL INTERFACE

Failure handling runs silently behind a session; its only visible outcomes are a shown phrase, a repeated phrase, or the struggling-generator notice.

## EXPECTATION
- Through any generation failure, a rejected generation request included, the session keeps running and no blocking alert appears.
- Each next phrase is a successful retry with carry-in, a standalone phrase in the session's register window, or a repeat of the previous phrase recorded in the history.
- A carry-in attempt whose search covered every candidate without finding a phrase is followed directly by the standalone attempt.
- A carry-in attempt stopped by its search allowance, a rejected request, or a phrase that does not fit the staff is still retried with carry-in while the time left before the deadline leaves the standalone attempt the time it needs.
- When the time left before the deadline falls below what the standalone attempt needs, the carry-in attempt running then is cancelled and the standalone attempt is requested at once; a carry-in attempt failing after that point is followed directly by the standalone attempt; when the deadline is already that close at the request, the standalone attempt is the first attempt made.
- However step 1 is skipped or cut short, the standalone attempt generates exactly what it would have generated after three failed carry-in retries.
- What each attempt generates for its request and seed is the same whatever the machine's speed.
- A repeat happens only when no attempt produced a valid phrase by the deadline, and is decided at the deadline.
