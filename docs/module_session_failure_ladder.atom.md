---
id: module_session_failure_ladder
status: DRAFT
dependents: []
layer: ARCHITECTURE
version: 0.1
parents:
  - [[rule_repeat_phrase_marked_internally_only]]
  - [[rule_session_generation_failure_ladder]]
  - [[rule_session_never_pauses]]
  - [[rule_varying_register_once_per_session]]
  - [[service_session_engine]]
notes: Split out on 2026-10-05 from service_session_engine (version 0.5) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
type: MODULE
priority: 1
human_name: Session Failure Ladder
tags: session,look-ahead,failure-ladder
---

# Session Failure Ladder

## INTENT
Turn every failed look-ahead attempt into a bounded series of retries and, when no valid phrase exists at the deadline, a repeat of the phrase before, so no failure ever ends the session.

## THE RULE / LOGIC
One attempt per look-ahead phrase is in flight at a time. The first attempt carries in from the phrase before, with a fresh seed. A failed attempt (a generation that found no phrase, a rejected generate request, whether a worker crash or a dead worker, or a phrase that does not fit) leads to up to three retries with a fresh seed and the same carry-in, requested only before the deadline, then one standalone retry with no carry-in and a fresh seed, its register fixed to the session's resolved register window so a Varying register stays resolved once per session. A successful outcome becomes ready only after its fit check passes. If no valid phrase exists at the deadline, whether the ladder is exhausted or an attempt is still in flight, the previous phrase is repeated as the next one, decided at the deadline and not earlier. The phrase after a standalone or a repeat carries in normally from that record. Results for an unknown or superseded attempt, or arriving after the deadline or the end, are dropped, since the worker cannot cancel a request; after the end, ticks and controller events are dropped too. No failure ever ends the session.

## TECHNICAL INTERFACE
The engine's request-generation output carries `step` (carry-in or standalone) and `retry`; a repeat is a `SessionPhrase` with origin `repeat` and `repeatOf`. The phrase being looked ahead for, not yet decided, with its deadline and the attempt in flight, if any (none once the ladder is exhausted), is `LookAhead` in `src/session/failure-ladder.ts`.

## EXPECTATION
Mixed generation failures, crashes and failed fit checks run up to three carry-in retries, then one standalone retry keeping the resolved register, before the deadline; with no valid phrase at the deadline the previous phrase is repeated, marked as a repeat of the phrase directly before, and the session keeps running. A late or superseded result never becomes a phrase.
