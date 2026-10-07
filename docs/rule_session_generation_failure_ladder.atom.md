---
id: rule_session_generation_failure_ladder
status: STABLE
type: RULE
version: 0.3
priority: 1
dependents:
  - [[mechanic_pitch_search_policy]]
  - [[module_session_failure_ladder]]
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
notes: Revised 2026-10-07 to version 0.3 (previous version 0.2) with the product owner's 2026-10-07 approval (spec D200-D202): a carry-in attempt whose search covered every candidate skips its remaining carry-in retries, the standalone attempt then uses the request and seed it would have had after three failed retries, and every other failed attempt (a search-allowance cutoff or a phrase that does not fit included) keeps its retries. It stays STABLE because the wording matches the approved directions. Earlier: revised 2026-09-30 in v2 chunk 8 (previous version 0.1) as a clarification of existing behaviour, accepted by the chunk owner under the owner standing rule to settle minor issues and record them; the product owner accepted it on 2026-10-05 (spec D186). Adds a rejected generation request (a generator crash on that request, or a generator that stopped working) as a failed attempt like no phrase found; states that the standalone retry gets a fresh seed and keeps the session register window; states that the repeat is decided at the deadline.
---

# Session Generation Failure Ladder

## INTENT

Keep a session running through a generation failure without ever blocking or penalizing the player.

## THE RULE / LOGIC
During a session the player never sees a blocking generation-failure alert. A failed attempt is a generation that found no phrase, a generation request that was rejected because the generator crashed on it or had stopped working, or a phrase that does not fit the staff; each counts the same way. When an attempt for the next phrase fails, the app:

1. retries silently, up to three times, with a fresh seed and the same carry-in, while the deadline still allows it. A carry-in attempt whose search covered every candidate without finding a phrase is not retried with carry-in: the candidates do not depend on the seed, which only orders them, so every such retry would fail the same way, and the app goes straight to step 2. Every other failed attempt keeps its carry-in retries, including a carry-in attempt stopped by its search allowance (the bounded amount of search work one attempt may do) and a phrase that does not fit the staff;
2. if that keeps failing, retries once more without carry-in, as a standalone phrase with a fresh seed that keeps the register window the session already uses: the join is not smoothed, but a valid phrase is shown. When step 1's retries were skipped, the standalone attempt is generated with the same request and seed it would have had after three failed retries, so skipping changes which attempts run, never what the standalone attempt generates;
3. if no valid phrase exists when the deadline comes, repeats the previous phrase as the next one, and records the repeat in the session history. The repeat is decided at the deadline, never earlier.

A phrase is repeated only when no attempt has produced a valid phrase by the deadline, and the repeat is recorded the same way whichever kind of failure led to it. A generation failure never stops the session: stopping would penalize the player for something they did not cause, while repeating a phrase is musically harmless.

## TECHNICAL INTERFACE

Failure handling runs silently behind a session; its only visible outcomes are a shown phrase, a repeated phrase, or the struggling-generator notice.

## EXPECTATION
- Through any generation failure, a rejected generation request included, the session keeps running and no blocking alert appears.
- Each next phrase is a successful retry with carry-in, a standalone phrase in the session's register window, or a repeat of the previous phrase recorded in the history.
- A carry-in attempt whose search covered every candidate without finding a phrase is followed directly by the standalone attempt, which generates exactly what the standalone attempt would have generated after three failed retries.
- A carry-in attempt stopped by its search allowance, a rejected request, or a phrase that does not fit the staff is still retried with carry-in while the deadline allows.
- A repeat happens only when no attempt produced a valid phrase by the deadline, and is decided at the deadline.
