---
id: module_musical_profile_capabilities
status: REVIEW
human_name: Generator Capabilities From the Figure Levels
layer: ARCHITECTURE
version: 0.2
parents:
  - [[module_figure_levels]]
  - [[rule_chromatic_notes_need_a_chromatic_figure]]
  - [[rule_jazz_chromatic_resolution]]
type: MODULE
priority: 2
tags: musical-profile,capability,jazz-profile
dependents: []
---

# Generator Capabilities From the Figure Levels

## INTENT
Gate every planner and validator decision that varies with what may be written on what the generation request's figure levels allow, never on a musical profile's or a preset's name.

## THE RULE / LOGIC
No musical profile or preset declares capabilities. The capability the pitch policy and the result validator carry, whether chromatic approaches and enclosures may be written, is worked out from the generation request's figure levels through the figures module's allowance: it holds exactly when the chromatic approach or the chromatic enclosure is not off. Neutral's levels give no such capability and Jazz's give it, so every generated result is unchanged. Any planner or validator decision that varies with what may be written reads the allowance, never a musical profile's or a preset's name or identity, nor a table keyed by one; a new preset needs only its levels, with no planner or validator change.

## TECHNICAL INTERFACE
The pitch policy (makePitchPolicy, src/domain/pitch/pitch-policy.ts) and the result validator (src/domain/validation/generation-result-validator.ts) build their capabilities from the intent's figureLevels through the allowance of src/domain/figures/figure-levels.ts (module_figure_levels). makePitchPolicy takes the figure levels in place of a musical profile, which it read only for this lookup; its one caller, bindingPitchPolicy (src/domain/generation/orchestration/window-search.ts), passes the intent's figureLevels, and neither the pitch policy (PitchPolicy, src/domain/pitch/pitch-types.ts) nor the validation context's policy (src/domain/pitch/validation/pitch-validation-types.ts) holds a musical profile. No table of capabilities keyed by a musical profile's name exists.

## EXPECTATION
No planner or validator code path reads a musical profile's or a preset's name, or a table keyed by one, to decide a note; each such decision reads the allowance worked out from the request's figure levels. Neutral's levels allow no chromatic approach or enclosure and Jazz's allow both, and the golden fixtures, the replay-key corpora and existing generated results are unchanged.
