---
id: module_rhythm_lock_order
status: DRAFT
tags: [v3, release-v3.2, rhythm-lock, generation]
layer: ARCHITECTURE
version: 0.1
human_name: The Rhythm Lock's Order
parents:
  - [[entity_request_rhythm_lock]]
  - [[entity_rhythm_candidate_domain]]
  - [[rule_forced_bend]]
  - [[rule_locked_rhythm_is_phrase_one]]
  - [[rule_rhythm_lock_strict]]
dependents: []
type: MODULE
priority: 1
---

# The Rhythm Lock's Order

## INTENT
Order a locked phrase's rhythm candidates so the locked bars are kept whenever they can make a phrase, and a forced bend takes the nearest rhythm only when they cannot.

## THE RULE / LOGIC
The module acts only when the request's rhythm lock group is on with locked bars. It gives each rhythm candidate of the phrase's own domain its preference rank for the ordering seam (module_ranked_candidate_ordering), in three tiers. First, the candidates of the rhythm change the phrase drew, when it drew one with candidates (module_rhythm_change_draw). Then the candidates whose written bars equal the locked bars. Then every other candidate in the forced bend's order: a candidate that sounds as the locked bars but is written with other ties, at distance 0, first, then by fewest total edits from the locked bars, the measure of the rhythm distance. Inside a tier, the seeded tie key, then the candidate index, break every tie.

Candidates are matched to the locked bars by their written bars, through the domain's bar key, never by index or identity, since identical rhythms carry different identities. The locked bars may be missing from the domain, as after a tension step down from Build to Lift, which changes the rhythms the phrase's settings allow: the forced bend's order then follows the drawn change's candidates at once. The forced bend's order is computed only when the search reaches past the first two tiers, and at most once per request.

In the state "on, nothing locked yet" without a steering block, and with no lock group, the module gives no preference and the phrase is an ordinary one.

The window search tries each rhythm in this order with every chord plan before the next rhythm (service_generation_window_search), so the locked rhythm gives way only when no phrase can be made with it at all. It runs under the fuel the request already has. Every attempt of the failure handling, the standalone one included, carries the same lock group and so the same order.

The outcome. The search reports whether the phrase took the locked bars or a forced bend, beside the rhythm change draw's own record. It goes into the generation result's provenance, which the session history keeps, and never into the timeline; nothing the player sees marks it.

## TECHNICAL INTERFACE
Not built yet. src/domain/rhythm/rhythm-lock-order.ts computes the preference ranks from the request's rhythm lock group (RequestRhythmLock, src/domain/generation/request-rhythm-lock.ts) and the phrase's rhythm candidates, matching bars through the bar key of src/domain/rhythm/rhythm-bars.ts and measuring total edits with its rhythm distance. Rhythm ranking (src/domain/generation/orchestration/candidate-ranking.ts) takes the ranks; the window search (src/domain/generation/orchestration/window-search.ts) walks rhythm-major under the lock; the outcome is a provenance field declared in src/domain/generation/orchestration/orchestration-types.ts. Names are written in when the code exists.

## EXPECTATION
- With the locked bars among a phrase's candidates and no drawn change, every phrase takes them, on every attempt of the failure handling.
- The locked rhythm is tried with every chord plan before any other rhythm.
- A step from Build to Lift whose domain lacks the locked bars gives a forced bend at the fewest total edits, a rhythm written with other ties at distance 0 first, then the seeded order.
- Without the lock group, or with nothing locked yet and no steering block, the order and the phrase are those of a request without the lock.
- A search under the lock uses no more fuel than the request allows.
- The outcome, locked bars or forced bend, is in the provenance and never in the timeline.
