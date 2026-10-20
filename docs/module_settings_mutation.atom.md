---
id: module_settings_mutation
status: REVIEW
layer: ARCHITECTURE
version: 0.4
priority: 1
tags: [v2, release-v2.0, part-v2.1, session, player-controls]
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
  - [[rule_mutation_rerolls_unsupported_combination]]
  - [[rule_mutation_setting_scales]]
  - [[rule_mutation_sixteenth_blocked_after_step_down]]
  - [[rule_restriction_in_force]]
  - [[rule_vary_settings_figure_step]]
  - [[rule_vary_settings_marks_custom]]
  - [[rule_vary_settings_stays_inside_restriction]]
---

# Settings Mutation

## INTENT

Decide each settings mutation and its landing phrase as a pure seeded function of the session's inputs, from a scale table kept as data.

## THE RULE / LOGIC
A pure, deterministic module with no clock, browser, Vue or session-state access, which decides what one settings mutation changes and when the next one lands.

Scale table. The mutation scales are data: one table entry per eligible setting, giving its kind of scale and its values. The kinds are ordered with no wrap (harmonic motion, tension arc, note density, rhythmic variety, syncopation, silence density, leapiness, arpeggio chaos, register over Low, Middle and High only, and each figure's level over Off, As today, Favored and Strongly favored), circular (the written tonal center around the circle of fifths), split into separate ordered scales that are never crossed (collection: Major and Minor; the modes from Lydian to Locrian), and unordered, where every other value is one grade away (contour). The seven figure levels together hold one entry, the one place in the draw the musical profile had, so the draw's number of places is unchanged and every other setting is drawn as often as before. Instrument and tempo have no entry and can never be mutated. Adding a value to a setting, such as a future Custom note density, is an edit of that setting's table entry, not new code.

Mutation. `mutateSettings` takes the settings in effect; whether the window is below the tablet-landscape layout's width and whether the session has stepped down, from which it derives the note density the session generates with and whether Sixteenth is unavailable (either of the two holds); the register the session resolved (used when the register setting is Varying); the session's mutation seed (the settings-mutation seed the session seed plan derives from the session seed; this module draws no seed) and the mutation number k, from which it derives the mutation's own indexed stream. It draws one eligible setting; for the figure levels' entry, one figure; then one direction available from that setting's or figure's current value; and it redraws all of them from the same stream while the result is a combination the generator does not support, uses an unavailable value, or is a key or mode step landing outside the restriction the settings carry; it returns the first supported result. The restriction is the one in force at the session's start, frozen into the session's start settings by `withRestrictionAtStart` from the selection, the written key, the collection and the presets the session knows; settings carrying none, because none was in force or the one in force allows every key and mode, bound nothing, so their draws are those of a session with no restriction. A half with no allowed value one step away therefore never moves. A caller may pass an observer that is told how many draws a mutation took; the draw is the same with or without it. Settings that are unsupported to begin with, a set of steps none of which is supported, or no supported draw within a fixed bound of draws are refused with a typed error rather than looping. A note-density mutation steps from the density generated with. A register mutation never lands on Varying, and from Varying steps from the resolved register. A figure step moves one figure one level and never goes past Off or Strongly favored; it never makes a rhythm combination unsupported. A mutation of a preset-held setting, one of the ten preset-held controls (Tension, Leapiness and Arpeggio chaos among them) or a figure level, marks the selection Custom based on the selected preset, for the session; a key or mode mutation never marks it, and a mutation never switches preset. The selection and every mutated setting return to the player's own when the session ends, outside this module.

Gap. The gap function returns, for the session's mutation seed and a mutation number k, the number of phrases between mutation k - 1 (or phrase 1, for k = 1) and mutation k, drawn from 2 to 4 from a seeded indexed stream that depends only on that seed and k, separate from the mutation's own stream, so each landing phrase is known without replaying earlier mutations' draws. From the gaps, the module also gives the phrase mutation k lands on, and the number of the mutation landing on a given phrase, if any. Named constants hold the gap bounds (2 and 4) and the flag's default (off).

## TECHNICAL INTERFACE
`src/session/settings-mutation-scales.ts` holds the scale table `MUTATION_SCALES` (one `MutationScaleEntry` per `MutableSetting`, each a scale of kind `ordered`, `circular`, `separate` or `nominal`, the value a step starts from and how a step is applied; the figure levels' one entry, in the musical profile's place, steps one figure chosen by the draw), the draw order `MUTABLE_SETTINGS`, `scaleNeighbours`, the `MutationContext` (`belowTabletLandscape`, `sessionSteppedDown`, `resolvedRegister`) and `SettingsMutationError`. A step's apply sets the selection after the move with the preset model's `selectionAfterChange` (src/domain/presets/preset-selection.ts). `src/session/settings-mutation.ts` re-exports them and exports the pure seeded `mutateSettings(settings, context, seed, k)`, returning `{ setting, from, to, settings }`, with `mutationCandidates` and `drawMutation` behind it, each of `mutateSettings` and `drawMutation` taking an optional `MutationDrawsObserver` (`(draws: number) => void`) after `k`; `withRestrictionAtStart(settings, presets)`, which returns the settings with `restriction` set to the restriction in force (`restrictionInForce`, src/domain/presets/preset-selection.ts), or without one when none is in force or it allows every key and mode, and is called by the session start (src/components/workspace/workspace-session-start.ts) and the pre-generation queue (src/components/workspace/workspace-pregeneration.ts) with the presets the Idle session knows; the gap function `mutationGap(seed, k)`, with `mutationPhrase(seed, k)` and `mutationIndexLandingOn(seed, phraseNumber)`; the named constants `MUTATION_GAP_MIN` (2), `MUTATION_GAP_MAX` (4), `SETTINGS_MUTATION_OFF` and `SETTINGS_MUTATION_DEFAULT` (off); and the flag type `SettingsMutationFlag`, `{ kind: 'off' } | { kind: 'on', seed }`, whose seed is `settingsMutationSeed(sessionSeed)` from `src/session/session-seed-plan.ts`. A mutation draws from `deriveIndexedStream(seed, 'settings-mutation', k)` and a gap from `deriveIndexedStream(seed, 'settings-mutation-gap', k)`. The settings are the session's `{ controls, figureLevels, selection, instrumentProfile?, restriction? }` (module_generative_profile_selection); a key or mode step is unsupported when the settings' `restriction` does not allow the key and mode it lands on (`allowsKeyAndMode`), and the redraw bound is a private constant of 10,000 draws. It imports the closed control vocabularies from the generation control catalog and is called only by the session engine, through `src/session/session-mutation-step.ts`.

## EXPECTATION
- The same inputs and seed always give the same mutated settings and the same gaps.
- Every result changes exactly one eligible setting by one grade, a figure step one figure by one level within Off and Strongly favored, never the instrument or the tempo, and is a supported combination.
- Over many seeded sessions, every setting other than the figure levels is drawn as often as when the musical profile held the figure levels' place.
- A mutation of a preset-held setting or a figure level marks the selection Custom based on the selected preset; a key or mode mutation never does.
- No result lands on Varying, or on Sixteenth while Sixteenth is unavailable.
- No key or mode step lands outside the restriction the settings carry; with none carried, the draws are those of settings with no restriction.
- Every gap is 2, 3 or 4.
- Adding a value to a setting's scale needs a table edit only.
