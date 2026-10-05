---
id: module_settings_mutation
status: REVIEW
layer: ARCHITECTURE
version: 0.1
priority: 1
tags: [v2, release-v2.0, part-v2.1, session, player-controls]
notes: Captured 2026-10-03 before code in v2 chunk 24 (pre-code architecture capture) from the coding leader plan. The scales it encodes for tonal center, collection, contour, register and musical profile, and the profile customized marking, were proposed by the coding leader and accepted by the owner on 2026-10-03 (D181). Aligned with the code in the same chunk post-task sync: the scale table in its own file, the mutation and gap drawn from indexed streams of (seed, k), the mutation context, the landing-phrase helpers and the refusals. Status stays DRAFT.
dependents:
  - [[module_session_mutation_step]]
  - [[service_session_engine]]
type: MODULE
human_name: Settings Mutation
parents:
  - [[module_generation_control_catalog]]
  - [[req_settings_mutation_flag]]
  - [[rule_density_mutation_steps_from_generated_density]]
  - [[rule_mutation_draws_setting_then_direction]]
  - [[rule_mutation_lands_on_scheduled_phrase]]
  - [[rule_mutation_marks_profile_customized]]
  - [[rule_mutation_profile_flip_keeps_controls]]
  - [[rule_mutation_rerolls_unsupported_combination]]
  - [[rule_mutation_setting_scales]]
  - [[rule_mutation_sixteenth_blocked_after_step_down]]
---

# Settings Mutation

## INTENT

Decide each settings mutation and its landing phrase as a pure seeded function of the session's inputs, from a scale table kept as data.

## THE RULE / LOGIC
A pure, deterministic module with no clock, browser, Vue or session-state access, which decides what one settings mutation changes and when the next one lands.

Scale table. The mutation scales are data: one table entry per eligible setting, giving its kind of scale and its values. The kinds are ordered with no wrap (harmonic motion, tension arc, note density, rhythmic variety, syncopation, silence density, leapiness, arpeggio chaos, and register over Low, Middle and High only), circular (the written tonal center around the circle of fifths), split into separate ordered scales that are never crossed (collection: Major and Minor; the modes from Lydian to Locrian), and unordered, where every other value is one grade away (contour, and the musical profile, whose two values Neutral and Jazz make each step an identity flip). Instrument and tempo have no entry and can never be mutated. Adding a value to a setting, such as a future Custom note density, is an edit of that setting's table entry, not new code.

Mutation. `mutateSettings` takes the settings in effect; whether the window is below the tablet-landscape layout's width and whether the session has stepped down, from which it derives the note density the session generates with and whether Sixteenth is unavailable (either of the two holds); the register the session resolved (used when the register setting is Varying); the session's mutation seed and the mutation number k, from which it derives the mutation's own indexed stream. It draws one eligible setting, then one direction available from that setting's current value, and redraws both from the same stream while the result is a combination the generator does not support or uses an unavailable value; it returns the first supported result. Settings that are unsupported to begin with, a set of steps none of which is supported, or no supported draw within a fixed bound of draws are refused with a typed error rather than looping. A note-density mutation steps from the density generated with. A register mutation never lands on Varying, and from Varying steps from the resolved register. A musical-profile mutation flips the identity only, keeps every controlled value and never applies a bundle. A mutation of a musical-profile identity or of a profile-controlled value marks the profile customized.

Gap. The gap function returns, for the session's mutation seed and a mutation number k, the number of phrases between mutation k - 1 (or phrase 1, for k = 1) and mutation k, drawn from 2 to 4 from a seeded indexed stream that depends only on that seed and k, separate from the mutation's own stream, so each landing phrase is known without replaying earlier mutations' draws. From the gaps, the module also gives the phrase mutation k lands on, and the number of the mutation landing on a given phrase, if any. Named constants hold the gap bounds (2 and 4) and the flag's default (off).

## TECHNICAL INTERFACE
`src/session/settings-mutation-scales.ts` holds the scale table `MUTATION_SCALES` (one `MutationScaleEntry` per `MutableSetting`, each a scale of kind `ordered`, `circular`, `separate` or `nominal`, the value a step starts from and how a step is applied), the draw order `MUTABLE_SETTINGS`, `scaleNeighbours`, the `MutationContext` (`belowTabletLandscape`, `sessionSteppedDown`, `resolvedRegister`) and `SettingsMutationError`. `src/session/settings-mutation.ts` re-exports them and exports the pure seeded `mutateSettings(settings, context, seed, k)`, returning `{ setting, from, to, settings }`, with `mutationCandidates` and `drawMutation` behind it; the gap function `mutationGap(seed, k)`, with `mutationPhrase(seed, k)` and `mutationIndexLandingOn(seed, phraseNumber)`; the named constants `MUTATION_GAP_MIN` (2), `MUTATION_GAP_MAX` (4), `SETTINGS_MUTATION_OFF` and `SETTINGS_MUTATION_DEFAULT` (off); and the flag type `SettingsMutationFlag`, `{ kind: 'off' } | { kind: 'on', seed }`. A mutation draws from `deriveIndexedStream(seed, 'settings-mutation', k)` and a gap from `deriveIndexedStream(seed, 'settings-mutation-gap', k)`. It imports the closed control vocabularies from the generation control catalog and is called only by the session engine, through `src/session/session-mutation-step.ts`.

## EXPECTATION

- The same inputs and seed always give the same mutated settings and the same gaps.
- Every result changes exactly one eligible setting by one grade, never the instrument or the tempo, and is a supported combination.
- No result lands on Varying, or on Sixteenth while Sixteenth is unavailable.
- Every gap is 2, 3 or 4.
- Adding a value to a setting's scale needs a table edit only.
