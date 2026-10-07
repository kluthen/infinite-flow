---
id: module_session_failure_ladder
status: DRAFT
dependents: []
layer: ARCHITECTURE
version: 0.2
parents:
  - [[rule_repeat_phrase_marked_internally_only]]
  - [[rule_session_generation_failure_ladder]]
  - [[rule_session_never_pauses]]
  - [[rule_varying_register_once_per_session]]
  - [[service_session_engine]]
notes: Revised 2026-10-07 before code (previous version 0.1, pre-code architecture capture) for the owner-approved failure ladder version 0.3 (spec D200-D202): a carry-in attempt failing with no_legal_pitch_plan skips to the standalone rung, with the skipped rungs' seeds and request ids drawn and discarded; retry keeps its meaning as the rung number. Status DRAFT until the code lands. The worker-cannot-cancel text is unchanged, pending a separate decision on cancelling a dropped attempt. Earlier: split out on 2026-10-05 from service_session_engine (version 0.5) during documentation debt paydown; the text was moved unchanged in meaning.
type: MODULE
priority: 1
human_name: Session Failure Ladder
tags: session,look-ahead,failure-ladder
---

# Session Failure Ladder

## INTENT
Turn every failed look-ahead attempt into a bounded series of retries and, when no valid phrase exists at the deadline, a repeat of the phrase before, so no failure ever ends the session.

## THE RULE / LOGIC
One attempt per look-ahead phrase is in flight at a time. The first attempt carries in from the phrase before, with a fresh seed. A failed attempt (a generation that found no phrase, a rejected generate request, whether a worker crash or a dead worker, or a phrase that does not fit) leads to up to three retries with a fresh seed and the same carry-in, requested only before the deadline, then one standalone retry with no carry-in and a fresh seed, its register fixed to the session's resolved register window so a Varying register stays resolved once per session. The rung after a failure is decided by a pure function of the failed rung and the failure: a failed carry-in attempt whose generation failure code is no_legal_pitch_plan goes straight to the standalone rung, since for a carry-in request that code means exactly that its one window was searched to exhaustion (no fuel cutoff, no validation failure), and the seed only orders candidates, so every carry-in retry would fail the same way. Every other failure, a search_limit_exceeded fuel cutoff, a result validation failure, a crash and a failed fit check included, goes to the next rung. Only the outcome's failure code is read, never its diagnostics. When carry-in rungs are skipped, the engine draws and discards the seeds and request ids those rungs would have used, so the standalone intent is identical to the one built after three failed carry-in retries. A successful outcome becomes ready only after its fit check passes. If no valid phrase exists at the deadline, whether the ladder is exhausted or an attempt is still in flight, the previous phrase is repeated as the next one, decided at the deadline and not earlier. The phrase after a standalone or a repeat carries in normally from that record. Results for an unknown or superseded attempt, or arriving after the deadline or the end, are dropped, since the worker cannot cancel a request; after the end, ticks and controller events are dropped too. No failure ever ends the session.

## TECHNICAL INTERFACE
The engine's request-generation output carries `step` (carry-in or standalone) and `retry`, the rung number (0 for the first carry-in attempt, 1 to 3 for the carry-in retries, 4 for the standalone retry, also when carry-in retries were skipped); a repeat is a `SessionPhrase` with origin `repeat` and `repeatOf`. The rung ladder and the pure next-rung function, which takes the failed rung and the failure, are in `src/session/failure-ladder.ts`; the engine's climb, which reads only the generation outcome's `code` and draws and discards the skipped rungs' seeds and request ids, is in `src/session/session-engine.ts`. The phrase being looked ahead for, not yet decided, with its deadline and the attempt in flight, if any (none once the ladder is exhausted), is `LookAhead` in `src/session/failure-ladder.ts`.

## EXPECTATION
Mixed generation failures, crashes and failed fit checks run up to three carry-in retries, then one standalone retry keeping the resolved register, before the deadline; with no valid phrase at the deadline the previous phrase is repeated, marked as a repeat of the phrase directly before, and the session keeps running. A carry-in attempt failing with no_legal_pitch_plan is followed directly by the standalone retry (retry 4), whose intent, seed and request id equal those it would have had after three failed carry-in retries; a carry-in attempt failing with search_limit_exceeded or result_validation_failed, a crash or a failed fit check is followed by the next carry-in retry. A late or superseded result never becomes a phrase.
