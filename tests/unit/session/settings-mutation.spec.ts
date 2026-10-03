import { describe, expect, it } from 'vitest'

import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import { makeSeed, type Seed } from '@/domain/random/seed'
import {
  MUTABLE_SETTINGS,
  SettingsMutationError,
  drawMutation,
  mutateSettings,
  mutationCandidates,
  type MutationContext,
  type SettingsMutationResult,
} from '@/session/settings-mutation'
import type { SessionSettings } from '@/session/session-types'

const WIDE: MutationContext = {
  belowTabletLandscape: false,
  sessionSteppedDown: false,
  resolvedRegister: 'Middle',
}

const CONTEXTS: readonly MutationContext[] = [false, true].flatMap((belowTabletLandscape) =>
  [false, true].map((sessionSteppedDown) => ({
    belowTabletLandscape,
    sessionSteppedDown,
    resolvedRegister: 'Middle' as const,
  })),
)

function settingsWith(controls: Partial<GenerationControls>): SessionSettings {
  return {
    controls: { ...DEFAULT_GENERATION_CONTROLS, ...controls },
    musicalProfile: DEFAULT_PROFILE_SELECTION,
  }
}

function changedControls(before: GenerationControls, after: GenerationControls): string[] {
  return (Object.keys(before) as (keyof GenerationControls)[]).filter(
    (key) => before[key] !== after[key],
  )
}

/** The first seeds whose mutation k = 1 draws note density, found through the real draw. */
function densityMutations(
  settings: SessionSettings,
  context: MutationContext,
  wanted: number,
): SettingsMutationResult[] {
  const found: SettingsMutationResult[] = []
  for (let seed = 0; found.length < wanted && seed < 5000; seed += 1) {
    const result = mutateSettings(settings, context, makeSeed(seed), 1)
    if (result.setting === 'noteDensity') found.push(result)
  }
  expect(found).toHaveLength(wanted)
  return found
}

const SEEDS: readonly Seed[] = Array.from({ length: 300 }, (_, index) => makeSeed(index * 7919))

// @test-link [[rule_mutation_draws_setting_then_direction]]
// @test-link [[module_settings_mutation]]
describe('mutateSettings draw', () => {
  it('gives the same mutation for the same settings, context, seed and k', () => {
    const settings = settingsWith({})
    for (const seed of SEEDS.slice(0, 50))
      for (const k of [1, 2, 7])
        expect(mutateSettings(settings, WIDE, seed, k)).toStrictEqual(
          mutateSettings(settings, WIDE, seed, k),
        )
  })

  it('returns frozen, valid settings and leaves the input untouched', () => {
    const settings = settingsWith({})
    const snapshot = structuredClone(settings)
    const result = mutateSettings(settings, WIDE, makeSeed(9), 1)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.settings.controls)).toBe(true)
    expect(Object.isFrozen(result.settings.musicalProfile)).toBe(true)
    expect(settings).toStrictEqual(snapshot)
  })

  it('changes exactly one eligible setting by one step, never tempo or the instrument', () => {
    const settings = settingsWith({ register: 'Varying' })
    const drawn = new Set<string>()
    for (const seed of SEEDS)
      for (const k of [1, 2, 3]) {
        const result = mutateSettings(settings, WIDE, seed, k)
        drawn.add(result.setting)
        const changed = changedControls(settings.controls, result.settings.controls)
        if (result.setting === 'musicalProfile') {
          expect(changed).toStrictEqual([])
          expect(result.settings.musicalProfile.musicalProfile).toBe(result.to)
          expect(result.to).not.toBe(settings.musicalProfile.musicalProfile)
        } else {
          expect(changed).toStrictEqual([result.setting])
          expect(result.settings.controls[result.setting]).toBe(result.to)
        }
        expect(result.settings.controls.tempo).toBe(settings.controls.tempo)
        expect(result.settings.controls.instrumentProfileId).toBe(
          settings.controls.instrumentProfileId,
        )
        const steps = mutationCandidates(settings, WIDE).filter(
          (candidate) => candidate.setting === result.setting && candidate.supported,
        )
        expect(steps.map(({ from, to }) => ({ from, to }))).toContainEqual({
          from: result.from,
          to: result.to,
        })
      }
    expect([...drawn].sort()).toStrictEqual([...MUTABLE_SETTINGS].sort())
  })

  it('redraws from the same stream past unsupported candidates and never applies one', () => {
    const candidates = mutationCandidates(settingsWith({}), WIDE)
    const onlyOne = candidates.map((candidate, index) => ({
      ...candidate,
      supported: index === 5,
    }))
    for (const seed of SEEDS.slice(0, 20)) {
      const result = drawMutation(onlyOne, seed, 1)
      expect(result.setting).toBe(candidates[5]?.setting)
      expect(result.to).toBe(candidates[5]?.to)
    }
  })

  it('throws instead of looping when no candidate is supported', () => {
    const none = mutationCandidates(settingsWith({}), WIDE).map((candidate) => ({
      ...candidate,
      supported: false,
    }))
    expect(() => drawMutation(none, makeSeed(1), 1)).toThrow(SettingsMutationError)
    expect(() => drawMutation([], makeSeed(1), 1)).toThrow(SettingsMutationError)
  })

  it('throws when the input settings are themselves unsupported', () => {
    const blocked = settingsWith({
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
    })
    expect(() => mutateSettings(blocked, WIDE, makeSeed(1), 1)).toThrow(SettingsMutationError)
  })

  it('rejects a mutation number that is not a positive integer', () => {
    for (const k of [0, -1, 1.5, Number.NaN])
      expect(() => mutateSettings(settingsWith({}), WIDE, makeSeed(1), k)).toThrow(
        SettingsMutationError,
      )
  })
})

// @test-link [[rule_mutation_rerolls_unsupported_combination]]
// @test-link [[rule_mutation_sixteenth_blocked_after_step_down]]
describe('mutateSettings support property', () => {
  it('always lands on a supported combination, and never on an unavailable Sixteenth', () => {
    let startsWithUnsupportedCandidates = 0
    for (const context of CONTEXTS) {
      const sixteenthUnavailable = context.belowTabletLandscape || context.sessionSteppedDown
      for (const noteDensity of NOTE_DENSITIES)
        for (const rhythmicVariety of RHYTHMIC_VARIETIES)
          for (const silenceDensity of SILENCE_DENSITIES)
            for (const syncopation of SYNCOPATIONS) {
              const settings = settingsWith({
                noteDensity,
                rhythmicVariety,
                silenceDensity,
                syncopation,
              })
              if (isRhythmSettingBlocked(settings.controls, context)) continue
              if (mutationCandidates(settings, context).some((c) => !c.supported))
                startsWithUnsupportedCandidates += 1
              for (const seed of SEEDS.slice(0, 3))
                for (const k of [1, 4]) {
                  const label = `${noteDensity}/${rhythmicVariety}/${silenceDensity}/${syncopation} ${JSON.stringify(context)} ${seed}/${k}`
                  const result = mutateSettings(settings, context, seed, k)
                  expect(isRhythmSettingBlocked(result.settings.controls, context), label).toBe(
                    false,
                  )
                  if (sixteenthUnavailable && result.setting === 'noteDensity')
                    expect(result.to, label).not.toBe('Sixteenth')
                }
            }
    }
    expect(startsWithUnsupportedCandidates).toBeGreaterThan(0)
  })
})

// @test-link [[rule_density_mutation_steps_from_generated_density]]
// @test-link [[rule_mutation_sixteenth_blocked_after_step_down]]
describe('mutateSettings note density (D177)', () => {
  const chosenSixteenth = settingsWith({ noteDensity: 'Sixteenth' })

  it('steps from Eighth to Quarter after a step-down, even once the window is wide again', () => {
    const context = { ...WIDE, sessionSteppedDown: true }
    for (const result of densityMutations(chosenSixteenth, context, 5)) {
      expect(result.from).toBe('Eighth')
      expect(result.to).toBe('Quarter')
      expect(result.settings.controls.noteDensity).toBe('Quarter')
    }
  })

  it('steps from Eighth to Quarter below the width, without a step-down', () => {
    const context = { ...WIDE, belowTabletLandscape: true }
    for (const result of densityMutations(chosenSixteenth, context, 5)) {
      expect(result.from).toBe('Eighth')
      expect(result.to).toBe('Quarter')
    }
  })

  it('steps from the chosen Sixteenth when no step-down applies', () => {
    for (const result of densityMutations(chosenSixteenth, WIDE, 3)) {
      expect(result.from).toBe('Sixteenth')
      expect(result.to).toBe('Eighth')
    }
  })

  it('never lands a density mutation on Sixteenth while it is unavailable', () => {
    const eighth = settingsWith({ noteDensity: 'Eighth' })
    for (const context of CONTEXTS.filter((c) => c.belowTabletLandscape || c.sessionSteppedDown))
      for (const result of densityMutations(eighth, context, 5)) {
        expect(result.from).toBe('Eighth')
        expect(result.to).toBe('Quarter')
      }
  })
})
