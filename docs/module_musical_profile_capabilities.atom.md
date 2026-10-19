---
id: module_musical_profile_capabilities
status: REVIEW
human_name: Generator Capabilities From the Figure Levels
layer: ARCHITECTURE
version: 0.3
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
No musical profile or preset declares capabilities, and no capability value is worked out and carried beside the levels: the pitch policy and the result validator's validation context carry the generation request's figure levels themselves, and each decision that varies with what may be written reads the figures module's allowance from them, whether a figure may be written as a free figure (its level is not off) and whether a note from outside the key and mode may be written (the chromatic approach or the chromatic enclosure is not off). The search offers each chromatic figure, and each resolution of a free diatonic tone, only as their own levels allow, and the validator accepts exactly the figures the levels allow. Neutral's levels allow no chromatic note and Jazz's allow both chromatic figures, so with them every generated result is unchanged. Any planner or validator decision that varies with what may be written reads the allowance, never a musical profile's or a preset's name or identity, nor a table keyed by one; a new preset needs only its levels, with no planner or validator change.

## TECHNICAL INTERFACE
makePitchPolicy (src/domain/pitch/pitch-policy.ts) takes the figure levels in place of a musical profile and keeps them as they are, as PitchPolicy.figureLevels (src/domain/pitch/pitch-types.ts); its one caller, bindingPitchPolicy (src/domain/generation/orchestration/window-search.ts), passes the intent's figureLevels. The validation context's policy (PitchValidationContext, src/domain/pitch/validation/pitch-validation-types.ts) carries figureLevels too, filled from the intent's by the result validator (src/domain/validation/generation-result-validator.ts). The pitch search (src/domain/pitch/pitch-candidates.ts) and the validator's figure rules (src/domain/pitch/validation/figure-rules.ts) call allowsFreeFigure and allowsChromaticNotes (src/domain/figures/figure-levels.ts, module_figure_levels). Neither the policy nor the validation context holds a musical profile or a capabilities value, and no table of capabilities keyed by a musical profile's name exists.

## EXPECTATION
No planner or validator code path reads a musical profile's or a preset's name, or a table keyed by one, to decide a note; each such decision reads the allowance from the request's figure levels, which the pitch policy and the validation context carry. Neutral's levels allow no chromatic approach or enclosure and Jazz's allow both, and the golden fixtures, the replay-key corpora and existing generated results are unchanged.
