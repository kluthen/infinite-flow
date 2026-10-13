---
id: module_session_pregeneration_plan
status: DRAFT
priority: 1
tags: [v3, release-v3.0, idle, generation, session, determinism]
human_name: Session Pre-Generation Plan
notes: Revised 2026-10-13 to version 0.2 (previous version 0.1) before code, by the pre-code architecture capture for v3.0 build plan v9 chunk 24b (ISS-011), on the product owner rulings recorded as spec D297 (master spec Part A v1.12, sections 8 and 16); stays DRAFT. The plan takes the settings phrase 1 was generated under and plans phrase 2 from phrase 1 under them, joined as after a settings change at the phrase 1/2 boundary, as the session engine does after Use it: it keeps running on a stale phrase 1 and builds exactly the phrases Use it plays; a CarryInError is a programming error again. Pending implementation: chunk 24b-1 (initialCourse in src/session/session-pregeneration.ts today still assumes phrase 1 was generated under the chosen settings). Earlier: Created 2026-10-12 at DRAFT by the pre-code architecture capture for v3.0 build plan chunk 24, from master spec section 8, spec D290 and the design the coding leader settled. Describes intended v3.0 behaviour: no code implements it yet.
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
version: 0.2
layer: ARCHITECTURE
---

# Session Pre-Generation Plan

## INTENT
Build, purely and with no deadline, the phrases 2 to 5 a session would generate after a given phrase 1, so that what pre-generation makes at Idle is exactly what the session would have asked for at each place.

## THE RULE / LOGIC
A pure, deadline-free pre-generation plan in the session layer, which reads no clock, touches no page and posts nothing, builds the phrases that would follow a phrase 1 in a session, one at a time, from phrase 2 to phrase 5 at most. Its inputs are phrase 1 (the Idle result's intent and successful outcome), the session seed published with that phrase 1, the settings phrase 1 was generated under (recorded with the Idle result), the chosen settings (generation controls and musical-profile selection), the Vary settings choice (off, or on with the mutation seed the session seed plan derives from the session seed, derived at Idle), the Tension across phrases choice, the window-width reading and the page-wide request-identity provider. Its caller steps it: the plan gives the next attempt to request and takes back that attempt's result, a generation outcome and, for a success, whether it fits.

The plan builds each request through the very functions the session engine uses, never a copy of them: the mutation landing on its scheduled phrase, the tension-arc cycle step, the look-ahead basis and the carry-in from the phrase before, and the attempt intent built with the seed the session seed plan derives for that phrase and ladder rung. So each pre-generated request is the one the session would build at that place from the same inputs, and the density step-down memory follows exactly as building those requests would.

Phrase 1 is taken as decided under its own settings, as the session engine takes it: phrase 2 is planned from phrase 1 under phrase 1's own settings, its carry-in adapted to any difference from the chosen settings exactly as after a settings change applied at the boundary between phrase 1 and phrase 2, and the phrases after it follow as before. So while phrase 1 is stale the plan keeps building, and builds exactly the phrases the session plays when the player uses that phrase 1; when phrase 1 is not stale, its settings equal the chosen ones and nothing is adapted. A carry-in that cannot be built is never an expected outcome of the plan: it is a programming error.

No deadline applies at Idle, so each phrase climbs the failure ladder's rungs in order with no time rule: the first carry-in attempt, then the three carry-in retries, then the standalone attempt only after every carry-in rung has failed, or straight to it when a carry-in attempt fails with no_legal_pitch_plan, as the ladder already says. A skipped rung's request id is drawn and discarded and its seed is simply unused, as in the engine. A phrase is ready once an attempt's successful outcome fits; the next phrase is then planned from it as its carry-in source. The plan never decides a repeat: if the standalone attempt also fails, pre-generation stops at that phrase, and the session generates it under its own deadline.

The plan draws no seed from any provider: every seed comes from the session seed plan. Request ids are drawn from the page-wide provider at Idle as each attempt is requested; they identify attempts and change nothing generated, so a session's phrases, intents and seeds are the same with pre-generation on and off, request ids aside. Tempo and Rising tempo never reach the plan.

## TECHNICAL INTERFACE
`src/session/session-pregeneration.ts` (new), a pure module of the session layer with no browser API, no Vue and no clock read. It reuses, without copying, the session engine's own functions: `buildAttemptIntent` in `src/session/session-intents.ts` (seeds through `phraseAttemptSeed`), the mutation step, the tension-arc step, the look-ahead basis and carry-in, and the rung functions of `src/session/failure-ladder.ts`; and `settingsMutationSeed` from `src/session/session-seed-plan.ts` for the Vary settings mutation seed. Each ready phrase it yields is its phrase number, its ladder rung index, its intent and its successful outcome. The export names are the code's to choose.

## EXPECTATION
- For the same phrase 1, session seed, settings, session options, window and attempt results, the plan builds the same requests in the same order every time, and reads no clock.
- Each ready phrase's intent equals, request id aside, the intent the session engine builds for that phrase and rung from the same inputs; with every attempt succeeding at once, a session's phrases are identical with pre-generation on and off.
- A phrase climbs the carry-in rungs, then the standalone rung, with no time rule; a no_legal_pitch_plan carry-in failure goes straight to the standalone rung; a skipped rung's request id is drawn and discarded.
- When a phrase's standalone attempt fails, the plan stops at that phrase and decides no repeat.
- Phrases 2 to 5 at most are planned; no seed is drawn from any provider; tempo never reaches a request.
- With phrase 1 generated under settings that differ from the chosen settings (a stale phrase 1), the plan still builds phrases 2 to 5, phrase 2's carry-in adapted as after a settings change at the phrase 1/2 boundary, each identical, request id aside, to what the session engine builds after Use it from the same inputs; no carry-in error is thrown.
