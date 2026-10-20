---
id: module_session_pregeneration_plan
status: REVIEW
priority: 1
tags: [v3, release-v3.0, idle, generation, session, determinism]
human_name: Session Pre-Generation Plan
type: MODULE
parents:
  - [[module_session_seed_plan]]
  - [[req_idle_pregeneration]]
  - [[rule_pregenerated_phrase_matches_session]]
  - [[rule_session_generation_failure_ladder]]
  - [[rule_stale_phrase_prompt_at_start]]
dependents:
  - [[module_idle_pregeneration_queue]]
  - [[module_session_ready_phrases]]
version: 0.3
layer: ARCHITECTURE
---

# Session Pre-Generation Plan

## INTENT
Build, purely and with no deadline, the phrases 2 to 5 a session would generate after a given phrase 1, so that what pre-generation makes at Idle is exactly what the session would have asked for at each place.

## THE RULE / LOGIC
A pure, deadline-free pre-generation plan in the session layer, which reads no clock, touches no page and posts nothing, builds the phrases that would follow a phrase 1 in a session, one at a time, from phrase 2 to phrase 5 at most. Its inputs are phrase 1 (the Idle result's intent and successful outcome), the session seed published with that phrase 1, the settings phrase 1 was generated under (recorded with the Idle result), the chosen settings (generation controls, figure levels and preset selection, with the restriction in force at Start frozen in them as the session's are, so the plan's mutations stay inside it), the Vary settings choice (off, or on with the mutation seed the session seed plan derives from the session seed, derived at Idle), the Tension across phrases choice, the window-width reading and the page-wide request-identity provider. Its caller steps it: the plan gives the next attempt to request and takes back that attempt's result, a generation outcome and, for a success, whether it fits.

The plan builds each request through the very functions the session engine uses, never a copy of them: the mutation landing on its scheduled phrase, the tension-arc cycle step, the look-ahead basis and the carry-in from the phrase before, and the attempt intent built with the seed the session seed plan derives for that phrase and ladder rung. So each pre-generated request is the one the session would build at that place from the same inputs, and the density step-down memory follows exactly as building those requests would.

Phrase 1 is taken as decided under its own settings, as the session engine takes it: phrase 2 is planned from phrase 1 under phrase 1's own settings, its carry-in adapted to any difference from the chosen settings exactly as after a settings change applied at the boundary between phrase 1 and phrase 2, and the phrases after it follow as before. So while phrase 1 is stale the plan keeps building, and builds exactly the phrases the session plays when the player uses that phrase 1; when phrase 1 is not stale, its settings equal the chosen ones and nothing is adapted. A carry-in that cannot be built is never an expected outcome of the plan: it is a programming error.

No deadline applies at Idle, so each phrase climbs the failure ladder's rungs in order with no time rule: the first carry-in attempt, then the three carry-in retries, then the standalone attempt only after every carry-in rung has failed, or straight to it when a carry-in attempt fails with no_legal_pitch_plan, as the ladder already says. A skipped rung's request id is drawn and discarded and its seed is simply unused, as in the engine. A phrase is ready once an attempt's successful outcome fits; the next phrase is then planned from it as its carry-in source. The plan never decides a repeat: if the standalone attempt also fails, pre-generation stops at that phrase, and the session generates it under its own deadline.

The plan draws no seed from any provider: every seed comes from the session seed plan. Request ids are drawn from the page-wide provider at Idle as each attempt is requested; they identify attempts and change nothing generated, so a session's phrases, intents and seeds are the same with pre-generation on and off, request ids aside. Tempo and Rising tempo never reach the plan.

## TECHNICAL INTERFACE
`src/session/session-pregeneration.ts`, a pure module of the session layer with no browser API, no Vue and no clock read. `createPregenerationPlan(seams, start, readyPhrases)` starts a plan from a `PregenerationStart` (the chosen settings, phrase 1's intent and outcome, the optional `phraseOneSettings`, the settings phrase 1 was generated under, taken through `phraseOneSettingsAtStart` in `src/session/stale-phrase-one.ts` as the engine takes them (absent, the chosen settings), the session seed, the settings-mutation flag and the multi-phrase tension arc flag) and its seams (the request-identity provider and the window-width reading), or resumes it after an existing ready list, which must still re-derive identically (the caller re-validates it first, else a `SessionEngineError` is thrown); no request id is drawn for the listed phrases. A plan is an immutable value `{ readyPhrases, attempt, stopped, after(result) }`: `attempt` is the next `PregenerationAttempt` (phrase number, rung index, step, intent), `after` takes back its `PregenerationResult` (fits with its outcome, a generation failure with its code, a crash, or not fitting) and gives the next plan, and `stopped` is `four-ready` or `ladder-exhausted`. `revalidatedReadyPhrases(seams, start, readyPhrases)` gives the longest prefix of a ready list whose intents still re-derive identically with the window read now, drawing no request id. It reuses, without copying, the session engine's own functions: `openNextPhrase` and `buildRungIntent` in `src/session/session-phrase-opening.ts` (the mutation landing, the tension-arc step, the look-ahead basis and carry-in, and each rung's intent through `buildAttemptIntent` in `src/session/session-intents.ts`, seeds through `phraseAttemptSeed`), `rederivedReadyPhrase` in `src/session/session-ready-phrases.ts`, and the rung functions of `src/session/failure-ladder.ts`; the Vary settings mutation seed reaches it through the settings-mutation flag, which the workspace builds with `mutationFlagFor` from `settingsMutationSeed` (`src/session/session-seed-plan.ts`). Each ready phrase it yields is a `ReadyPhrase`: its phrase number, its ladder rung index, its intent and its successful outcome.

## EXPECTATION
- For the same phrase 1, session seed, settings, session options, window and attempt results, the plan builds the same requests in the same order every time, and reads no clock.
- Each ready phrase's intent equals, request id aside, the intent the session engine builds for that phrase and rung from the same inputs; with every attempt succeeding at once, a session's phrases are identical with pre-generation on and off.
- A phrase climbs the carry-in rungs, then the standalone rung, with no time rule; a no_legal_pitch_plan carry-in failure goes straight to the standalone rung; a skipped rung's request id is drawn and discarded.
- When a phrase's standalone attempt fails, the plan stops at that phrase and decides no repeat.
- Phrases 2 to 5 at most are planned; no seed is drawn from any provider; tempo never reaches a request.
- With phrase 1 generated under settings that differ from the chosen settings (a stale phrase 1), the plan still builds phrases 2 to 5, phrase 2's carry-in adapted as after a settings change at the phrase 1/2 boundary, each identical, request id aside, to what the session engine builds after Use it from the same inputs; no carry-in error is thrown.
