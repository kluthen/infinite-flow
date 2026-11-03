---
id: module_rhythm_steering
status: REVIEW
version: 0.2
human_name: The Generator's Rhythm Steering
tags: [v3, release-v3.2, jam, generation, rhythm]
parents:
  - [[entity_steering_block]]
  - [[rule_doodle_only_orders_candidates]]
  - [[rule_jam_drift_positions]]
  - [[rule_jam_rhythm_ordered_by_doodle]]
  - [[rule_rhythm_distance]]
type: MODULE
layer: ARCHITECTURE
priority: 1
dependents: []
---

# The Generator's Rhythm Steering

## INTENT
Order a phrase's rhythm candidates by the request's steering block, so a Jam's rhythms come close to the doodle's while every candidate stays possible and phrases keep varying.

## THE RULE / LOGIC
The rhythm part of the generator's steering module, inside the generation worker. It acts only when the request holds a steering block; without one, the rhythm order is exactly what it is without the module.

With a block and no locked bars, each rhythm candidate gets a preference rank: 0 when every one of its four measures lies within the block's band from the target rhythm's measure, else 1 plus its total edits from the target rhythm; under the unbounded band every candidate is within it, so the seeded order stands. With the rhythm lock on and nothing locked yet (a Jam's phrase 1) and a block, the rank is the total edits alone, so the phrase takes the rhythm nearest the doodle, whatever the band. With locked bars the block orders no rhythm, and the lock's order (module_rhythm_lock_order) stands.

The rank enters the ordering seam (module_ranked_candidate_ordering): each candidate is placed by its preference rank, then its seeded tie key, then its candidate index, keys compared in UTF-16 code-unit order, never by locale. It is an order, never a filter: every candidate stays exactly once. Bands and edits are the rhythm distance's. A candidate is compared with the target as heard: over the bar key's start lists, a rest start right after another rest is dropped, so a silence written as two rests is at no edit from one; the target's own starts, and the lock's comparisons, keep the written lists.

The order is computed once per request, after the seeded ranking and before any register window is searched, never per rung or per chord plan; the per-measure distance is memoized by measure pair. It is built inside the span whose time the diagnostics report as the rhythm orderings' time. A block never changes the search's walk: without locked bars it stays harmony-major, so the band orders the rhythms tried with each chord plan, and phrase 1's nearest rhythm is the nearest one that makes a phrase with the first chord plan any rhythm makes one with. A target far from every rhythm the settings allow is only approached: no_legal_rhythm_plan arises only where it arises without a block. It draws on no random stream.

## TECHNICAL INTERFACE
src/domain/generation/steering/rhythm-steering.ts, in the generation worker's code: `steerRhythmOrder({ domain, seeded, target, ordering })` ranks each bar key once (`barsKeyedDomainOf`, src/domain/rhythm/rhythm-bars.ts) and orders the seeded list through orderRhythmByPreference (src/domain/generation/orchestration/candidate-ranking.ts), the ordering `band` with the lock off or `nearest` with the lock on and nothing locked yet (`RhythmSteeringOrdering`); under `band` with the unbounded band it returns the seeded list itself; `heardMeasureStarts(starts)` reads a written measure as heard. Bands and edits come from `measureBand` and `measureEdits` (src/domain/rhythm/rhythm-distance.ts). The generation orchestrator (src/domain/generation/orchestration/generation-orchestrator.ts) builds the steered order once per request, after the seeded ranking (rankMaterializedRhythmCandidates) and only when the lock gives no order (`steeredRhythmFor`, the nearest ordering when the request's rhythm lock group is pending), and hands it to every window through `withRhythmOrder` (candidate-ranking.ts), which gives the ranked rhythm cache that order of the same domain; with a clock passed and a block, `timedSteeredRhythmFor` adds its building time to GenerationDiagnostics.rhythmOrderingsSeconds (entity_generation_diagnostics). The block is the request's `steering` (entity_steering_block); the lock state is the request's rhythm lock group (src/domain/generation/request-rhythm-lock.ts).

## EXPECTATION
- Without a steering block, every request's rhythm order, and so its phrase, is unchanged.
- With a block and no locked bars, the chosen rhythm's measures lie in the band whenever a candidate in the band makes a phrase with the chord plan the search settles on; under the unbounded band the seeded order stands.
- With the lock on, nothing locked yet and a block, phrase 1 takes the candidate nearest the target among those making a phrase with that chord plan, whatever the band.
- A candidate writing one of the target's silences as two rests is at no edit from it.
- The same block and seed give the same order twice, under any collation; every candidate appears once.
- With a clock passed and a block, the reported rhythm orderings' time includes the rank's.
