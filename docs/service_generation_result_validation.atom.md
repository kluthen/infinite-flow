---
id: service_generation_result_validation
status: REVIEW
layer: ARCHITECTURE
type: SERVICE
priority: 1
version: 0.6
tags: generation
parents:
  - [[entity_concert_event_timeline]]
  - [[rule_seventh_chord_draws_reproducible]]
  - [[rule_triad_fallback_per_phrase]]
dependents: []
human_name: Generation Result Validation
---

# Generation Result Validation

## INTENT
Independently re-check one assembled GenerationResult against every structural, correspondence, provenance, and range rule it must satisfy, as a check wholly separate from the search and assembly that produced it, so a defect in the search or assembly path cannot silently ship an invalid result.

## THE RULE / LOGIC
Validation runs a fixed sequence of independent check groups over the resolved request and its assembled result, each returning its own list of typed failure codes, and reports the union of all of them rather than stopping at the first group that fails: envelope failures (result identity, seed, and meter consistency with the resolved request), resolved-request failures (delegating instrument-profile active-range legality to the same rule the profile-switch and generation paths already enforce), carry-in failures (the intent and the request hold the same carry-in or none, the resolved window is the carried window, and the harmony opens on the tonic after the carried chord), timeline structure failures (delegating four-four completeness to the same rule generation itself enforces), rhythm correspondence failures (the assembled timeline's event kinds, durations, and tie flags exactly mirror the chosen rhythm candidate bar by bar), harmony provenance failures (every note's recorded harmony identity matches the harmony actually sounding at its tick under the resolved request's harmony domain; the recorded plan is one of the list generation searched, rebuilt from the intent's Seventh chords level and seed: the domain's candidates and, above Off, their plan variants (service_generation_orchestration), identity and content alike, so a plan claiming seventh forms the level and seed do not give is refused), tie failures (a tie-continuation note's pitch exactly equals its preceding attack's pitch), range failures (every note falls within the resolved request's instrument-profile active range), and melodic failures (delegated to the pitch domain's own validation of contour, interval, leap-recovery, and arpeggio obligations and of the figures, accepting exactly those the request's figure levels allow, which judges the join from a carried pitch like two notes inside one phrase and accepts only the settleable debts a phrase generated with carry-in may end owing). The rhythm correspondence group also runs the full rhythm validator on the chosen rhythm candidate and reports rhythm_candidate_invalid, with the validator's codes, when it fails; since the sped-up rhythm enumeration no longer runs that validator itself, this is the only full validation a candidate chosen from the sped-up path receives. Every check group reads only the resolved request and the assembled result; none re-runs or re-derives what generation already decided.

## TECHNICAL INTERFACE
Callers supply one resolved GenerationRequest and one assembled GenerationResult and receive the flat union of every failure code found by every check group, empty when the result is fully valid. Each check group is independently invokable with the same two inputs for a caller that wants only one category of failure. The harmony provenance group is `harmonyProvenanceFailures` in `src/domain/validation/generation-result-validator-checks.ts`: it re-derives the structural domain with `makeHarmonyCandidateDomain` and rebuilds the searched list with `harmonyPlanVariants` (`src/domain/generation/orchestration/harmony-variants.ts`) from the domain's candidates, the intent's Seventh chords level and its seed, then matches the recorded plan by identity and content.

## EXPECTATION
A GenerationResult correctly assembled from a resolved request and a legal rhythm/harmony/pitch search always validates with zero failures. Any single structural, correspondence, provenance, range, or melodic defect deterministically produces at least the one specific failure code naming that defect, and validating the same request/result pair twice always returns the identical failure set. A result whose plan claims seventh forms the intent's level and seed do not give fails harmony provenance; every result generated above Off validates with zero failures.
