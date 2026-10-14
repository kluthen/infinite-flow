---
id: rule_mutation_lands_on_scheduled_phrase
status: REVIEW
type: RULE
version: 0.1
tags: [v2, release-v2.0, part-v2.1, session, player-controls]
dependents:
  - [[module_session_mutation_step]]
  - [[module_settings_mutation]]
  - [[service_session_engine]]
layer: BUSINESS
priority: 1
human_name: Each Mutation Lands on Its Scheduled Phrase
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_session_change_applies_at_phrase_boundary]]
---

# Each Mutation Lands on Its Scheduled Phrase

## INTENT

Make every mutation land on a phrase known in advance, so a session's mutations replay exactly and no phrase is generated twice because of one.

## THE RULE / LOGIC

Mutations are numbered from 1 in the order they happen. Mutation k lands on phrase p(k) of the session: p(1) = 1 + g(1), and p(k+1) = p(k) + g(k+1), where each gap g(k) is drawn from 2 to 4 from a seeded sequence that depends only on the session's mutation seed and k. Phrases 1 to g(1) are therefore generated with the settings the player chose. Mutation k is decided when phrase p(k) - 1 starts sounding, just before phrase p(k) is requested, so it always applies exactly from phrase p(k), no look-ahead phrase generated with the old settings is ever discarded because of it, and replaying a session gives the same mutations on the same phrase numbers. If phrase p(k) ends up repeating the phrase before it, because no valid phrase was ready by its deadline, mutation k still counts as applied at p(k), and the next generated phrase uses it.

## TECHNICAL INTERFACE

The session derives each mutation's landing phrase from its mutation seed and the mutation's number, and decides the mutation just before it requests that phrase.

## EXPECTATION

- With the flag on, the first mutation lands on phrase 3, 4 or 5, and each later mutation 2 to 4 phrases after the one before.
- The same mutation seed gives the same mutations on the same phrase numbers.
- No look-ahead phrase is ever discarded because of a mutation.
- A mutation whose phrase ends up a repeat is not lost: the next generated phrase uses it, and the next mutation's phrase is still counted from the repeat's phrase number.
