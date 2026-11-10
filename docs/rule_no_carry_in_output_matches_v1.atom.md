---
id: rule_no_carry_in_output_matches_v1
status: REVIEW
version: 0.2
tags: [v2, release-v2.0, session, determinism, changes-in-v3.3]
dependents:
  - [[mechanic_pitch_search_policy]]
type: RULE
priority: 1
human_name: Generation Without Carry-In Matches the First Release
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_seeded_phrase_reproduction]]
layer: BUSINESS
---

# Generation Without Carry-In Matches the First Release

## INTENT
Guarantee that adding sessions leaves phrase generation without carry-in exactly as the first release made it.

## THE RULE / LOGIC
With no carry-in at all, as for the phrase generated at Idle, which becomes a session's phrase 1, the generated output for a given complete request and seed is byte-identical to what the first release produced for that request and seed. At Idle, only which request and seed end up shown may differ from the first release: an Idle phrase too dense for the staff is replaced by fresh-seed retries, and below the tablet-landscape layout's width a chosen Sixteenth note density is generated as Eighth. A phrase generated with an input the first release had no equivalent of is not a first-release phrase, and this rule does not cover it: a phrase generated with a Jam's steering block, and a phrase generated under the rhythm lock with locked bars.

## TECHNICAL INTERFACE
The generator keeps the first release's complete-request-and-seed contract for every generation without carry-in, steering block or locked bars.

## EXPECTATION
For every complete request and seed, generation without carry-in, without a steering block and without locked bars yields output byte-identical to the first release's output for the same request and seed.
