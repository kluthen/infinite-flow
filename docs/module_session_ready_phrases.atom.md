---
id: module_session_ready_phrases
status: REVIEW
layer: ARCHITECTURE
parents:
  - [[module_session_pregeneration_plan]]
  - [[req_idle_pregeneration]]
  - [[rule_pregenerated_phrase_matches_session]]
  - [[rule_start_never_waits_for_pregeneration]]
  - [[service_session_engine]]
dependents: []
human_name: Session Ready Phrases
type: MODULE
priority: 1
tags: [v3, release-v3.0, session, look-ahead, generation, determinism]
version: 0.1
---

# Session Ready Phrases

## INTENT
Let the session engine spend the phrases pre-generated at Idle in place of generating them, without changing what the session would otherwise produce at those places.

## THE RULE / LOGIC
The session start carries the ready phrases Start took from the Idle queue, in order from phrase 2, each with its phrase number, its ladder rung index, its intent and its successful outcome; none when pre-generation is off or nothing is ready. They are part of the start, so the engine stays pure: the same start and event list still give the same outputs.

The engine opens each look-ahead exactly as without them: the mutation landing and its settings-changed output, the tension-arc step, the look-ahead basis, the deadline and its wake-at, the phrase's tempo still fixed at its deadline. When a ready phrase has the number of the phrase being opened, the engine re-derives the intent of that phrase's rung from the settings in effect, its carry-in source and the window read now, with the ready phrase's own request id. If that intent is identical to the ready phrase's, the engine decides the phrase at once: it outputs phrase ready, with origin carry-in for a carry-in rung or standalone for the standalone rung, updates the density step-down memory as building that intent would, and makes no generation request. On the first mismatch it drops that ready phrase and every later one, and requests that phrase as without pre-generation. The engine does not check a ready phrase's fit again: Start's take checked it against the held layout. After the last ready phrase the session looks one phrase ahead as before, and nothing is topped up during the session.

A ready phrase was built with no deadline, so the rung it holds can be one the session's own ladder would not have reached in time, such as phrase 2's carry-in at 240 BPM, where the session alone requests phrase 2 standalone first; that is the purpose of pre-generation. A spent phrase's replay key is logged at its phrase ready, through the existing replay-key announcer, like any accepted session phrase; a ready phrase never spent is never logged.

## TECHNICAL INTERFACE
`SessionStart.readyPhrases` (in `src/session/session-types.ts`), optional, absent meaning none as an empty list does, filled by Start (`src/components/workspace/workspace-session-start.ts` and `workspace-session-begin.ts`) and passed through the session runner (`src/session/session-runner.ts`) to `createSessionEngine` in `src/session/session-engine.ts`. `src/session/session-ready-phrases.ts` holds the `ReadyPhrase` type (phrase number, rung index, intent, successful outcome), `MAX_READY_PHRASES` (4) and `requireReadyPhrases`, which checks the list a start or a plan is given (phrase numbers consecutive from 2, at most four, each rung index on the failure ladder, from 0 to 4, each outcome a success) and throws a `SessionEngineError` otherwise; `rederivedReadyPhrase`, which rebuilds a ready phrase's rung intent at its place through `buildRungIntent` (`src/session/session-phrase-opening.ts`, over `buildAttemptIntent` in `src/session/session-intents.ts`) with the window read now and the ready phrase's own request id, so it draws none from the provider; and `takeReadyPhrase`, the engine's step for a look-ahead it has just opened. The phrase-ready output and the phrase record (`SessionPhrase`) keep their form.

## EXPECTATION
- With every attempt succeeding at once, a session's phrases, intents and seeds are identical with pre-generation on and off, for the same phrase 1 and session seed, request ids aside.
- A ready phrase whose re-derived intent is identical is output as phrase ready when its look-ahead opens, with no request generation; the look-ahead's deadline, wake-at, phrase tempo and settings-changed outputs are as without it.
- The first ready phrase whose re-derived intent differs, and every later one, are dropped, and that phrase is requested as without pre-generation.
- After the last ready phrase the session looks one phrase ahead as before; nothing is topped up.
- A spent phrase's replay key is logged at its phrase ready; a dropped one's never is.
