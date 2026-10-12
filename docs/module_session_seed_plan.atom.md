---
id: module_session_seed_plan
status: REVIEW
version: 0.1
human_name: Session Seed Plan
parents:
  - [[module_named_stream_pseudorandomness]]
  - [[rule_pregenerated_phrase_matches_session]]
  - [[rule_seeded_phrase_reproduction]]
  - [[rule_session_generation_failure_ladder]]
notes: Status DRAFT to REVIEW on 2026-10-12 with the owner's agreement (v3.0 wave-1 sign-off), same version: chunk 23's code (merge aee776c) matches the logic and expectation, with its linked tests. Earlier: Synced 2026-10-12 at the v3.0 wave-1 post-task sync, same version 0.1: chunk 23's code (merge aee776c) implements it, src/session/session-seed-plan.ts and the files the technical interface names, with linked tests; logic, interface and expectation match the code. The text below saying no code implements it is superseded. Status stays DRAFT; REVIEW proposed to the owner. Earlier: Created 2026-10-11 at DRAFT by the pre-code architecture capture for v3.0 build plan chunk 23, from master spec sections 8 and 5.2, spec D255 and D258 (owner rulings) and the decisions the coding leader settled. Describes intended v3.0 behaviour: no code implements it yet.
dependents: []
type: MODULE
layer: ARCHITECTURE
priority: 1
tags: [v3, release-v3.0, seed, session, determinism]
---

# Session Seed Plan

## INTENT
Fix every seed a session will use from the moment its phrase 1 is published at Idle, so that a phrase generated before Start is exactly the phrase the session would generate at that place.

## THE RULE / LOGIC
One session seed, a 32-bit unsigned seed of the project's existing seed type, is drawn at Idle by the Idle generation session each time it publishes a phrase 1 a session could start from, that is, each time a successful fit run's result becomes the Idle result. It comes from its own injected provider, crypto-backed in production like the phrase seeds' provider but separate from it. It is drawn once per published phrase 1, never once per fit attempt, and travels with that phrase 1 as part of the Idle result. Phrase 1 keeps the seed it was generated with; the session seed is a separate draw.

Only a new phrase 1 at Idle renews the session seed: Generate, Regenerate, a retry, a profile or instrument switch that regenerates, the fresh phrase 1 after a session ends, and a regeneration after a room notice each come with a newly drawn session seed. Showing the same phrase 1 again keeps its session seed. Nothing in a session draws a seed.

Every seed a session uses after phrase 1 is derived from the session seed by one fixed integer derivation: the session seed XOR the project's FNV-1a 32-bit hash of a versioned label, forced to an unsigned 32-bit value. The labels belong to plan version 1:

- the seed of rung r of phrase n, for a phrase number n of 2 or more and r the failure ladder's rung index (0 the first carry-in attempt, 1 to 3 the carry-in retries, 4 the standalone attempt), uses the label `session-seed-plan-v1:phrase:<n>:rung:<r>`;
- the Vary settings mutation seed uses the label `session-seed-plan-v1:settings-mutation`. It is derived only when Vary settings is on at Start, and the mutation's indexed streams then derive from it exactly as before.

A phrase number below 2, a rung outside the ladder or a value that is not a whole number is refused with a typed error.

Each derived seed depends only on the session seed and its label: not on which rungs ran, how earlier phrases went (a success, a standalone phrase or a repeat), the tempo, the window, the machine's speed or the clock. So each ladder rung has its own seed; a skipped rung's seed is simply unused and shifts no other seed; the standalone attempt's seed is the same however many rungs ran; and a phrase requested again after a settings change gets the same seeds for its rungs, its request differing only by the new settings. The plan covers seeds only: the tension arc stays a pure function of the phrase number and takes no seed, the note density is still decided when a phrase is requested, from the window, and only steps down, and the tempo never feeds the plan.

Request ids identify attempts and are not part of the plan: they never affect what is generated. They are still drawn from the page-wide request-id provider when an attempt is requested and stay unique for the page's lifetime, so a late result of a superseded attempt is never mistaken for a new one. A skipped rung still draws and discards its request id, so the attempt requested after a skip keeps the request id it would have had in that phrase's ladder; no seed is drawn for the skipped rung.

At Start the session takes phrase 1, exactly the Idle phrase with its request and seed unchanged, and its session seed, from the Idle result. From Start the session seed is held in the in-memory session history's session-wide facts, beside the start time and the instrument, and the session engine and runner receive it in their start and derive every attempt seed and the mutation seed from it. Nothing derivable from the session seed (the later phrases' seeds, the rungs' seeds, the mutation seed) is stored in the session-wide facts; each phrase record still keeps its own generation request with its own seed, so replay keys keep their form. Keeping the session-wide facts beyond the page belongs to the kept-session record, not to this module.

## TECHNICAL INTERFACE
`src/session/session-seed-plan.ts` (new) exports `SESSION_SEED_PLAN_VERSION` (1), `phraseAttemptSeed(sessionSeed, phraseNumber, rung)`, `settingsMutationSeed(sessionSeed)` and `SessionSeedPlanError`, thrown for a phrase number below 2, a rung outside 0 to 4 or an argument that is not an integer. Both functions return `(sessionSeed ^ fnv1a32(label)) >>> 0` as a `Seed`, with `fnv1a32` from `src/domain/random/hash32.ts`. The Idle generation session in `src/composables/use-generation-session.ts` draws the session seed from an injected `nextSessionSeed` provider, separate from the phrase seed's provider, when it publishes a phrase 1, and returns it as `WorkspaceSessionResult.sessionSeed`. The session start carries it as `SessionStart.sessionSeed`; `buildAttemptIntent` in `src/session/session-intents.ts` takes each attempt's seed from `phraseAttemptSeed`, and `mutationFlagFor` in `src/components/workspace/workspace-session-runner.ts` takes the mutation seed from `settingsMutationSeed`, the mutation's indexed streams still coming from `deriveIndexedStream`. `src/session/session-history.ts` holds it as `SessionHistory.sessionSeed`. Request ids stay drawn from the page-wide request-id provider.

## EXPECTATION
- The same session seed, phrase number and rung always give the same attempt seed, and the same session seed always gives the same mutation seed.
- Two runs of a session from the same phrase 1 and session seed give the same attempt seeds and mutation seed, and so the same phrases wherever the same attempts succeed, Vary settings and Tension across phrases on included.
- A skipped rung shifts no other seed: the attempt after a skip, and the standalone attempt however many rungs ran, each get the seed of their own rung.
- One session seed is drawn per published phrase 1, however many fit attempts it took; a new phrase 1 at Idle comes with a newly drawn session seed, showing the same phrase 1 again keeps it, and nothing during a session draws a seed.
- At Start, phrase 1 is exactly the Idle phrase with its seed, and the session history holds the session seed in its session-wide facts from Start, with no derived seed beside it.
- Each phrase record keeps its own seed, so replay keys are unchanged in form and existing replay keys reproduce the same phrases.
- A phrase number below 2, a rung outside 0 to 4 or a value that is not an integer is refused with `SessionSeedPlanError`.
- Request ids never change what is generated and stay unique for the page's lifetime; a skipped rung's request id is drawn and discarded.
