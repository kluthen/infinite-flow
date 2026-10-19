---
id: module_harmony_candidate_domain
status: REVIEW
human_name: Harmony Candidate Domain
layer: ARCHITECTURE
parents:
  - [[rule_jazz_chromatic_resolution]]
  - [[rule_neutral_profile_diatonic_harmony]]
  - [[rule_open_phrase_ending]]
  - [[rule_tension_arc_build]]
  - [[rule_tension_arc_edge]]
  - [[rule_tension_arc_level_policy]]
  - [[rule_tension_arc_lift]]
  - [[rule_tension_arc_settled]]
  - [[rule_tension_ranking_respects_constraints]]
  - [[user_story_controlled_phrase_generation]]
type: MODULE
version: 0.2
priority: 1
tags: harmony,candidate-domain,step5
dependents: []
---

# Harmony Candidate Domain

## INTENT
Produce an immutable, canonical structural harmony-candidate domain from normalized musical inputs before any generation-stage selection occurs.

## THE RULE / LOGIC
This pure domain boundary consumes a normalized tonal center, collection, harmonic motion and tension arc, and no musical profile, preset or figure levels: the domain is the same whatever the levels. It constructs the exact selected diatonic collection and its diatonic triads, then expands the applicable tonal or modal harmonic templates in one explicit canonical order. Each expansion emits an immutable harmony candidate with quarter-boundary harmonic events, a stable structural identity, contiguous zero-based indices, endpoint classes, and abstract tension requirements. Candidate construction encodes the diatonic constraints of the selected collection, which no figure alters (chromatic approaches and enclosures are written by the pitch search over this diatonic plan, never as altered harmony), the selected tension-arc requirements, and open-ending endpoint requirements. The module neither seeds nor draws randomness, binds rhythm or onsets, evaluates register or instrument feasibility, plans contour or pitches, ranks or selects candidates, nor orchestrates. Vue, browser, session, storage, and every other presentation/runtime dependency are outside this boundary. It returns the typed no_legal_harmony_plan outcome only when the constructed structural domain is empty; a nonempty domain is returned without ranking or selection.

## TECHNICAL INTERFACE
Callers provide normalized tonal center, collection, harmonic-motion and tension-arc inputs (HarmonyPlannerInput, src/domain/harmony/harmony-types.ts) to makeHarmonyCandidateDomain (src/domain/harmony/harmony-planner.ts). On success they receive an immutable ordered structural harmony domain containing exact diatonic collections, triads, and zero or more canonical harmony candidates. Each candidate exposes immutable quarter-boundary events, one stable structural identity, contiguous zero-based indices, one endpoint class, and abstract tension requirements. If and only if the structural domain has no candidates, the operation returns the typed no_legal_harmony_plan outcome. The interface accepts no musical profile, preset or figure levels, no seed, random source, rhythm/onset plan, register or instrument data, contour/pitch plan, candidate-ranking policy, selection policy, orchestration dependency, or Vue/browser/session/storage dependency.

## EXPECTATION
For identical normalized inputs, the boundary returns the same immutable domain and canonical candidate order, whatever musical profile or figure levels the request holds. Every returned candidate uses only exact diatonic collection and triad material, has quarter-boundary events, a stable identity, contiguous zero-based indices, an endpoint class consistent with the open-ending policy, and abstract tension requirements consistent with the selected tension arc. A nonempty structural domain never yields no_legal_harmony_plan. The boundary never performs randomness, rhythm binding, feasibility evaluation, pitch or contour planning, ranking, selection, orchestration, or runtime/presentation work.
