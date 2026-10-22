---
id: module_session_seed_plan
status: STABLE
version: 0.3
human_name: Session Seed Plan
parents:
  - [[module_named_stream_pseudorandomness]]
  - [[rule_jam_phrase_one_failure_ladder]]
  - [[rule_pregenerated_phrase_matches_session]]
  - [[rule_seeded_phrase_reproduction]]
  - [[rule_session_generation_failure_ladder]]
dependents:
  - [[entity_kept_session_record]]
  - [[module_session_pregeneration_plan]]
type: MODULE
layer: ARCHITECTURE
priority: 1
tags: [v3, release-v3.0, seed, session, determinism]
---

# Session Seed Plan

## INTENT
Fix every seed a session will use before it runs: from the moment its phrase 1 is published at Idle or, for a fresh Jam, which has no phrase 1 at Idle, at Start, so that a phrase generated before Start is exactly the phrase the session would generate at that place and a fresh Jam is reproducible from its session seed.

## THE RULE / LOGIC
One session seed, a 32-bit unsigned seed of the project's existing seed type, is drawn at Idle by the Idle generation session each time it publishes a phrase 1 a session could start from, that is, each time a successful fit run's result becomes the Idle result. It comes from its own injected provider, crypto-backed in production like the phrase seeds' provider but separate from it. It is drawn once per published phrase 1, never once per fit attempt, and travels with that phrase 1 as part of the Idle result. Phrase 1 keeps the seed it was generated with; the session seed is a separate draw. A fresh Jam, a Jam started in Jam mode with no kept doodle, has no phrase 1 at Idle, since its phrase 1 is written after the doodle: its session seed is drawn once at Start (the Start click or the starting note, Jam's home note), before the count-in, from the same provider. Nothing after Start draws a seed.

Only a new phrase 1 at Idle renews the session seed: Generate, Regenerate, a retry, a profile or instrument switch that regenerates, the fresh phrase 1 after a session ends, a regeneration after a room notice, and a phrase 1 newly written from Jam mode's kept doodle each come with a newly drawn session seed. Showing the same phrase 1 again keeps its session seed. Apart from a fresh Jam's draw at Start, nothing in a session draws a seed.

Every seed a session uses after phrase 1 is derived from the session seed by one fixed integer derivation: the session seed XOR the project's FNV-1a 32-bit hash of a versioned label, forced to an unsigned 32-bit value. The labels belong to plan version 1:

- the seed of rung r of phrase n, for a phrase number n of 2 or more and r the failure ladder's rung index (0 the first carry-in attempt, 1 to 3 the carry-in retries, 4 the standalone attempt), uses the label `session-seed-plan-v1:phrase:<n>:rung:<r>`;
- the Vary settings mutation seed uses the label `session-seed-plan-v1:settings-mutation`. It is derived only when Vary settings is on: at Idle by pre-generation, for the phrases it builds, and at Start, for the session; both derive the same seed from the same session seed, and the mutation's indexed streams then derive from it exactly as before;
- the seed of rung r of a fresh Jam's phrase 1, r being 0 for the first attempt with the doodle's join and the steering block, 1 to 3 for its retries, 4 for the attempt with the steering block and no join and 5 for the standalone phrase, uses the label `session-seed-plan-v1:jam-phrase-one:rung:<r>`. An attempt started at a silent barline and cancelled by a further doodle note is a rung-0 attempt; the next one, on the longer doodle, takes the same seed, its request differing only by what the longer doodle gives (the controls, the join and the steering block). A Jam's phrase 2 onward take the labels above from the same session seed. The existing labels still refuse phrase 1 and do not change, so every seed derived before v3.2 is unchanged.

A phrase number below 2, a rung outside the ladder, a fresh Jam's phrase 1 rung outside 0 to 5 or a value that is not a whole number is refused with a typed error.

Each derived seed depends only on the session seed and its label: not on which rungs ran, how earlier phrases went (a success, a standalone phrase or a repeat), the tempo, the window, the machine's speed or the clock. So each ladder rung has its own seed; a skipped rung's seed is simply unused and shifts no other seed; the standalone attempt's seed is the same however many rungs ran; and a phrase requested again after a settings change gets the same seeds for its rungs, its request differing only by the new settings. The plan covers seeds only: the tension arc stays a pure function of the phrase number and takes no seed, the note density is still decided when a phrase is requested, from the window, and only steps down, and the tempo never feeds the plan.

Request ids identify attempts and are not part of the plan: they never affect what is generated. They are still drawn from the page-wide request-id provider when an attempt is requested and stay unique for the page's lifetime, so a late result of a superseded attempt is never mistaken for a new one. A skipped rung still draws and discards its request id, so the attempt requested after a skip keeps the request id it would have had in that phrase's ladder; no seed is drawn for the skipped rung.

At Start a session in session mode, or a Jam on a kept doodle, takes phrase 1, exactly the Idle phrase with its request and seed unchanged, and its session seed, from the Idle result, together with the phrases pre-generated at Idle that are ready (phrases 2 to 5 at most). Those were built with this plan's rung seeds for their phrase and rung, so nothing new is drawn for them; the request ids drawn for them at Idle stay outside the plan. From Start the session seed is held in the in-memory session history's session-wide facts, beside the start time and the instrument, and the session engine and runner receive it in their start and derive every attempt seed and the mutation seed from it. Nothing derivable from the session seed (the later phrases' seeds, the rungs' seeds, the mutation seed) is stored in the session-wide facts; each phrase record still keeps its own generation request with its own seed, so replay keys keep their form. Keeping the session-wide facts beyond the page belongs to the kept-session record, not to this module. A fresh Jam takes no phrase 1 at Start: it holds the session seed drawn at Start, and its phrase 1 is generated after the doodle with the seeds above.

## TECHNICAL INTERFACE
`src/session/session-seed-plan.ts` (new) exports `SESSION_SEED_PLAN_VERSION` (1), `phraseAttemptSeed(sessionSeed, phraseNumber, rung)`, `settingsMutationSeed(sessionSeed)` and `SessionSeedPlanError`, thrown for a phrase number below 2, a rung outside 0 to 4 or an argument that is not an integer. Both functions return `(sessionSeed ^ fnv1a32(label)) >>> 0` as a `Seed`, with `fnv1a32` from `src/domain/random/hash32.ts`. The Idle generation session in `src/composables/use-generation-session.ts` draws the session seed from an injected `nextSessionSeed` provider, separate from the phrase seed's provider, when it publishes a phrase 1, and returns it as `WorkspaceSessionResult.sessionSeed`. The session start carries it as `SessionStart.sessionSeed`; `buildAttemptIntent` in `src/session/session-intents.ts` takes each attempt's seed from `phraseAttemptSeed`, and `mutationFlagFor` in `src/components/workspace/workspace-session-runner.ts` takes the mutation seed from `settingsMutationSeed`, the mutation's indexed streams still coming from `deriveIndexedStream`. `src/session/session-history.ts` holds it as `SessionHistory.sessionSeed`. Request ids stay drawn from the page-wide request-id provider. The Idle pre-generation queue (`src/components/workspace/workspace-pregeneration.ts`) also calls `mutationFlagFor` with the Idle result's session seed, and the pre-generation plan (`src/session/session-pregeneration.ts`) builds its intents through `buildAttemptIntent`. A fresh Jam is not built yet: its phrase 1 attempt seeds (rung 0 to 5, anything else refused with `SessionSeedPlanError`) and its Start drawing the session seed from the same `nextSessionSeed` provider have no function or call site yet.

## EXPECTATION
- The same session seed, phrase number and rung always give the same attempt seed, and the same session seed always gives the same mutation seed.
- Two runs of a session from the same phrase 1 and session seed give the same attempt seeds and mutation seed, and so the same phrases wherever the same attempts succeed, Vary settings and Tension across phrases on included.
- A skipped rung shifts no other seed: the attempt after a skip, and the standalone attempt however many rungs ran, each get the seed of their own rung.
- One session seed is drawn per published phrase 1, however many fit attempts it took; a new phrase 1 at Idle comes with a newly drawn session seed, showing the same phrase 1 again keeps it, and nothing after Start draws a seed.
- At Start, in session mode or on a kept doodle, phrase 1 is exactly the Idle phrase with its seed, and the session history holds the session seed in its session-wide facts from Start, with no derived seed beside it.
- Each phrase record keeps its own seed, so replay keys are unchanged in form and existing replay keys reproduce the same phrases.
- A phrase number below 2, a rung outside 0 to 4 or a value that is not an integer is refused with `SessionSeedPlanError`.
- Request ids never change what is generated and stay unique for the page's lifetime; a skipped rung's request id is drawn and discarded.
- A phrase pre-generated at Idle has the seed this plan gives its phrase and rung, and the mutation seed pre-generation derives at Idle equals the one the session derives at Start; a session's seeds are the same with pre-generation on and off.
- A fresh Jam draws one session seed, at Start, before the count-in.
- Two runs of a fresh Jam from the same session seed, quantized doodle and Jam's settings give the same seed to every attempt, phrase 1's included.
- Every label used before v3.2 gives the same seed as before.
