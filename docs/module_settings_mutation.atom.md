---
id: module_settings_mutation
status: STABLE
layer: ARCHITECTURE
version: 0.5
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
  - [[rule_vary_settings_allowed_groups]]
  - [[rule_vary_settings_figure_step]]
  - [[rule_vary_settings_marks_custom]]
  - [[rule_vary_settings_needs_legal_move]]
  - [[rule_vary_settings_skips_dead_end]]
  - [[rule_vary_settings_stays_inside_restriction]]
---

# Settings Mutation

## INTENT

Decide each settings mutation and its landing phrase as a pure seeded function of the session's inputs, from a scale table kept as data.

## THE RULE / LOGIC
A pure, deterministic module with no clock, browser, Vue or session-state access, which decides what one settings mutation changes and when the next one lands.

Scale table. The mutation scales are data: one table entry per eligible setting, giving its kind of scale and its values. The kinds are ordered with no wrap (harmonic motion, tension arc, note density, rhythmic variety, syncopation, silence density, leapiness, arpeggio chaos, register over Low, Middle and High only, and each figure's level over Off, As today, Favored and Strongly favored), circular (the written tonal center around the circle of fifths), split into separate ordered scales that are never crossed (collection: Major and Minor; the modes from Lydian to Locrian), and unordered, where every other value is one grade away (contour). The seven figure levels together hold one entry, the one place in the draw the musical profile had, so the draw's number of places is unchanged and every other setting is drawn as often as before. Instrument and tempo have no entry and can never be mutated. Adding a value to a setting, such as a future Custom note density, is an edit of that setting's table entry, not new code. Each entry belongs to one of Vary settings' six groups: Key and mode (the written tonal center and the collection), Harmony (harmonic motion), Tension (tension arc), Rhythm (note density, rhythmic variety, syncopation and silence density), Melody shape (contour, register, leapiness and arpeggio chaos) and Figures (the figure levels' entry).

Mutation. `mutateSettings` takes the settings in effect, which carry the allowed groups and whether the rhythm lock is on; whether the window is below the tablet-landscape layout's width and whether the session has stepped down, from which it derives the note density the session generates with and whether Sixteenth is unavailable (either of the two holds); the register the session resolved (used when the register setting is Varying); the session's mutation seed (the settings-mutation seed the session seed plan derives from the session seed; this module draws no seed) and the mutation number k, from which it derives the mutation's own indexed stream. It draws one setting among those with a step; for the figure levels' entry, one figure; then one direction available from that setting's or figure's current value; and it redraws all of them from the same stream while the result is a combination the generator does not support, uses an unavailable value, is a key or mode step landing outside the restriction the settings carry, or moves a setting whose group is not allowed, the Rhythm group counting as not allowed while the rhythm lock is on; it returns the first result that is none of these. A step of a group that is not allowed is redrawn by the same route as an unsupported landing, so with all six groups allowed and the lock off the draws consume the stream exactly as they did before the groups existed, and give the same mutations. The restriction is the one in force at the session's start, frozen into the session's start settings by `withRestrictionAtStart` from the selection, the written key, the collection and the presets the session knows; settings carrying none, because none was in force or the one in force allows every key and mode, bound nothing, so their draws are those of a session with no restriction. A half with no allowed value one step away therefore never moves. A caller may pass an observer that is told how many draws a mutation took; the draw is the same with or without it. When no step of the settings is a supported one inside the allowed groups, the mutation is a dead end: the module returns no move instead of a result and throws nothing; the session skips that mutation and records it, and the next mutation draws from its own stream as usual. Settings that are unsupported to begin with, or no supported draw within a fixed bound of draws, are refused with a typed error rather than looping. A note-density mutation steps from the density generated with. A register mutation never lands on Varying, and from Varying steps from the resolved register. A figure step moves one figure one level and never goes past Off or Strongly favored; it never makes a rhythm combination unsupported. A mutation of a preset-held setting, one of the ten preset-held controls (Tension, Leapiness and Arpeggio chaos among them) or a figure level, marks the selection Custom based on the selected preset, for the session; a key or mode mutation never marks it, and a mutation never switches preset. The selection and every mutated setting return to the player's own when the session ends, outside this module.

Legal-move check. A pure function tells, for the settings in effect and a mutation context, whether at least one step exists onto a supported combination inside the allowed groups: the Rhythm group does not count while the rhythm lock is on, and a key or mode step counts only inside the restriction the settings carry. It is false exactly when a mutation of those settings would be a dead end. The controls call it at Idle, and a session started while it is false runs without Vary settings, which is decided outside this module.

Gap. The gap function returns, for the session's mutation seed and a mutation number k, the number of phrases between mutation k - 1 (or phrase 1, for k = 1) and mutation k, drawn from 2 to 4 from a seeded indexed stream that depends only on that seed and k, separate from the mutation's own stream, so each landing phrase is known without replaying earlier mutations' draws. From the gaps, the module also gives the phrase mutation k lands on, and the number of the mutation landing on a given phrase, if any. Named constants hold the gap bounds (2 and 4) and the flag's default (off).

## TECHNICAL INTERFACE
`src/session/settings-mutation-scales.ts` holds the scale table `MUTATION_SCALES` (one `MutationScaleEntry` per `MutableSetting`, each a scale of kind `ordered`, `circular`, `separate` or `nominal`, the value a step starts from and how a step is applied; the figure levels' one entry, in the musical profile's place, steps one figure chosen by the draw), the draw order `MUTABLE_SETTINGS`, each mutable setting's group (`MUTABLE_SETTING_GROUPS`, over `VarySettingsGroup`, `'keyAndMode' | 'harmony' | 'tension' | 'rhythm' | 'melodyShape' | 'figures'`, the six listed in order by `VARY_SETTINGS_GROUPS`), the allowed groups `AllowedGroups` (each group on or off) with `ALL_GROUPS_ALLOWED`, `isGroupAllowed(group, settings)` (false for the Rhythm group while the rhythm lock is on), `scaleNeighbours`, the `MutationContext` (`belowTabletLandscape`, `sessionSteppedDown`, `resolvedRegister`) and `SettingsMutationError`. A step's apply sets the selection after the move with the preset model's `selectionAfterChange` (src/domain/presets/preset-selection.ts). `src/session/settings-mutation.ts` re-exports them and exports the pure seeded `mutateSettings(settings, context, seed, k)`, returning `{ setting, from, to, settings }`, with `mutationCandidates` and `drawMutation` behind it, each of `mutateSettings` and `drawMutation` taking an optional `MutationDrawsObserver` (`(draws: number) => void`) after `k`; a dead end returned instead of a result when no step is supported, `MutationDeadEnd` (`{ kind: 'dead-end' }`, the one value `MUTATION_DEAD_END`, told apart by `isMutationDeadEnd`), so `mutateSettings` and `drawMutation` return `SettingsMutationResult | MutationDeadEnd`; the legal-move check `hasLegalMove(settings, context): boolean`; `withRestrictionAtStart(settings, presets)`, which returns the settings with `restriction` set to the restriction in force (`restrictionInForce`, src/domain/presets/preset-selection.ts), or without one when none is in force or it allows every key and mode, and is called by the session start (src/components/workspace/workspace-session-start.ts) and the pre-generation queue (src/components/workspace/workspace-pregeneration.ts) with the presets the Idle session knows; the gap function `mutationGap(seed, k)`, with `mutationPhrase(seed, k)` and `mutationIndexLandingOn(seed, phraseNumber)`; the named constants `MUTATION_GAP_MIN` (2), `MUTATION_GAP_MAX` (4), `SETTINGS_MUTATION_OFF` and `SETTINGS_MUTATION_DEFAULT` (off); and the flag type `SettingsMutationFlag`, `{ kind: 'off' } | { kind: 'on', seed }`, whose seed is `settingsMutationSeed(sessionSeed)` from `src/session/session-seed-plan.ts`. A mutation draws from `deriveIndexedStream(seed, 'settings-mutation', k)` and a gap from `deriveIndexedStream(seed, 'settings-mutation-gap', k)`. The settings are the session's `{ controls, figureLevels, selection, instrumentProfile?, restriction? }` (module_generative_profile_selection), with the allowed groups and whether the rhythm lock is on, `allowedGroups: AllowedGroups` and `rhythmLockOn: boolean` (`SessionSettings`, src/session/session-types.ts), both validated by `freezeSessionSettings` (src/session/session-intents.ts); a key or mode step is unsupported when the settings' `restriction` does not allow the key and mode it lands on (`allowsKeyAndMode`), and the redraw bound is a private constant of 10,000 draws. It imports the closed control vocabularies from the generation control catalog. Its mutation is called only by the session engine, through `src/session/session-mutation-step.ts`; its legal-move check by the controls at Idle (not built yet) and by the session start: `mutationFlagFor(varySettings, sessionSeed, settings, context)` (src/components/workspace/workspace-session-runner.ts), called by the session start and by pre-generation, gives the flag off when the check is false, under the context `mutationContextAtStart(phraseOne, belowTabletLandscape)` (src/session/session-mutation-step.ts) gives. Outside this module, the session's mutation step turns a dead end into a `MutationSkippedOutput` (`{ kind: 'mutation-skipped', phraseNumber, mutationNumber }`, src/session/session-types.ts), the settings in effect unchanged, and the session history keeps each skip as a `SkippedMutation`, read through `SessionHistory.skippedMutations()` (src/session/session-history.ts), in memory only.

## EXPECTATION
- The same inputs and seed always give the same mutated settings, or the same dead end, and the same gaps.
- Every result changes exactly one setting of an allowed group by one grade, a figure step one figure by one level within Off and Strongly favored, never the instrument or the tempo, and is a supported combination.
- While the rhythm lock is on, no result moves note density, rhythmic variety, syncopation or silence density.
- With all six groups allowed and the lock off, every mutation, its number of draws and the selection it leaves are those the module gave before the groups existed.
- With all six groups allowed, every setting other than the figure levels is drawn as often as when the musical profile held the figure levels' place.
- A mutation of a preset-held setting or a figure level marks the selection Custom based on the selected preset; a key or mode mutation never does.
- No result lands on Varying, or on Sixteenth while Sixteenth is unavailable.
- No key or mode step lands outside the restriction the settings carry; with none carried, the draws are those of settings with no restriction.
- The legal-move check is false exactly when a mutation of the settings would be a dead end.
- A dead end throws nothing; settings that are unsupported to begin with are still refused.
- Every gap is 2, 3 or 4.
- Adding a value to a setting's scale needs a table edit only.
