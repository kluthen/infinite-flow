---
id: rule_no_carry_in_output_matches_v1
status: REVIEW
version: 0.1
tags: [v2, release-v2.0, session, determinism, changes-in-v3.2]
dependents:
  - [[mechanic_pitch_search_policy]]
type: RULE
priority: 1
human_name: Generation Without Carry-In Matches the First Release
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_seeded_phrase_reproduction]]
layer: BUSINESS
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): a phrase generated with a doodle or a locked rhythm is not a first-release phrase even without carry-in, and a held doodle's phrase 1 at Idle has a join (rule_jam_and_lock_off_reproduce_earlier_phrases). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
---

# Generation Without Carry-In Matches the First Release

## INTENT
Guarantee that adding sessions leaves phrase generation without carry-in exactly as the first release made it.

## THE RULE / LOGIC
With no carry-in at all, as for the phrase generated at Idle, which becomes a session's phrase 1, the generated output for a given complete request and seed is byte-identical to what the first release produced for that request and seed. At Idle, only which request and seed end up shown may differ from the first release: an Idle phrase too dense for the staff is replaced by fresh-seed retries, and below the tablet-landscape layout's width a chosen Sixteenth note density is generated as Eighth.

## TECHNICAL INTERFACE
The generator keeps the first release's complete-request-and-seed contract for every generation without carry-in.

## EXPECTATION
For every complete request and seed, generation without carry-in yields output byte-identical to the first release's output for the same request and seed.
