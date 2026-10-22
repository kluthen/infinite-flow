import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS, PROFILE_BUNDLES } from '@/domain/controls/profile-selection'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { builtInPreset, DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import { makeSeed, type Seed } from '@/domain/random/seed'
import {
  ALL_GROUPS_ALLOWED,
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

function settingsWith(
  controls: Partial<GenerationControls>,
  selection: PresetSelection = DEFAULT_PRESET_SELECTION,
  figureLevels: FigureLevels = NEUTRAL_FIGURE_LEVELS,
): SessionSettings {
  return {
    controls: { ...DEFAULT_GENERATION_CONTROLS, ...controls },
    figureLevels,
    selection,
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: false,
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

/** Intent: every chosen rhythm setting the four rhythm controls can form, note density outermost. */
function everyChosenRhythmSetting() {
  return NOTE_DENSITIES.flatMap((noteDensity) =>
    RHYTHMIC_VARIETIES.flatMap((rhythmicVariety) =>
      SILENCE_DENSITIES.flatMap((silenceDensity) =>
        SYNCOPATIONS.map((syncopation) => ({
          noteDensity,
          rhythmicVariety,
          silenceDensity,
          syncopation,
        })),
      ),
    ),
  )
}

/**
 * Intent: from one supported starting setting, mutations k = 1 and k = 4 on the first three seeds
 * all land on a supported combination, and never on Sixteenth while it is unavailable.
 */
function expectMutationsLandSupported(
  settings: SessionSettings,
  context: MutationContext,
  settingLabel: string,
): void {
  const sixteenthUnavailable = context.belowTabletLandscape || context.sessionSteppedDown
  for (const seed of SEEDS.slice(0, 3))
    for (const k of [1, 4]) {
      const label = `${settingLabel} ${JSON.stringify(context)} ${seed}/${k}`
      const result = mutateSettings(settings, context, seed, k)
      expect(isRhythmSettingBlocked(result.settings.controls, context), label).toBe(false)
      if (sixteenthUnavailable && result.setting === 'noteDensity')
        expect(result.to, label).not.toBe('Sixteenth')
    }
}

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
    expect(Object.isFrozen(result.settings.figureLevels)).toBe(true)
    expect(Object.isFrozen(result.settings.selection)).toBe(true)
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
        if (result.setting === 'figureLevels') {
          const figure = result.figure
          if (figure === undefined) throw new Error('A figure step names its figure.')
          expect(changed).toStrictEqual([])
          expect(result.settings.figureLevels).toStrictEqual({
            ...settings.figureLevels,
            [figure]: result.to,
          })
          expect(result.from).toBe(settings.figureLevels[figure])
        } else {
          expect(changed).toStrictEqual([result.setting])
          expect(result.settings.controls[result.setting]).toBe(result.to)
          expect(result.settings.figureLevels).toStrictEqual(settings.figureLevels)
          expect(Object.hasOwn(result, 'figure')).toBe(false)
        }
        expect(result.settings.controls.tempo).toBe(settings.controls.tempo)
        expect(result.settings.controls.instrumentProfileId).toBe(
          settings.controls.instrumentProfileId,
        )
        const steps = mutationCandidates(settings, WIDE).filter(
          (candidate) => candidate.setting === result.setting && candidate.supported,
        )
        expect(steps.map(({ figure, from, to }) => ({ figure, from, to }))).toContainEqual({
          figure: result.figure,
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
      for (const rhythm of everyChosenRhythmSetting()) {
        const settings = settingsWith(rhythm)
        if (isRhythmSettingBlocked(settings.controls, context)) continue
        if (mutationCandidates(settings, context).some((c) => !c.supported))
          startsWithUnsupportedCandidates += 1
        const { noteDensity, rhythmicVariety, silenceDensity, syncopation } = rhythm
        expectMutationsLandSupported(
          settings,
          context,
          `${noteDensity}/${rhythmicVariety}/${silenceDensity}/${syncopation}`,
        )
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

/** One recorded v3.0 draw: the start, the seed number, k, and the setting, from and to drawn. */
type RecordedDraw = readonly [
  start: 'neutral' | 'jazz',
  seed: number,
  k: number,
  setting: string,
  from: string,
  to: string,
]

/** The v3.0 draws recorded before the figure step replaced the profile flip. */
const V30_DRAWS: {
  readonly context: MutationContext
  readonly rows: readonly RecordedDraw[]
} = JSON.parse(readFileSync('tests/fixtures/vary-settings/v3.0-mutation-draws.json', 'utf8'))

/** Intent: the v3.1 form of a recorded start: the preset's controls, levels and selection. */
function recordedStart(start: 'neutral' | 'jazz'): SessionSettings {
  const preset = builtInPreset(start)
  const controls =
    start === 'neutral'
      ? DEFAULT_GENERATION_CONTROLS
      : { ...DEFAULT_GENERATION_CONTROLS, ...preset.controls }
  return settingsWith(controls, { kind: 'preset', presetId: start }, preset.levels)
}

// @test-link [[rule_vary_settings_figure_step]]
// @test-link [[module_settings_mutation]]
describe('mutateSettings figure step', () => {
  // @test-link [[rule_vary_settings_figure_step]]
  // @test-link [[module_settings_mutation]]
  it('draws every other setting exactly as v3.0 did, and a figure step where v3.0 flipped the profile', () => {
    expect({ ...DEFAULT_GENERATION_CONTROLS, ...PROFILE_BUNDLES.Jazz }).toStrictEqual(
      recordedStart('jazz').controls,
    )
    expect(V30_DRAWS.rows.length).toBeGreaterThan(0)
    let flips = 0
    for (const [start, seed, k, setting, from, to] of V30_DRAWS.rows) {
      const label = `${start} seed ${seed} k ${k}`
      const result = mutateSettings(recordedStart(start), V30_DRAWS.context, makeSeed(seed), k)
      if (setting === 'musicalProfile') {
        flips += 1
        expect(result.setting, label).toBe('figureLevels')
      } else {
        expect({ setting: result.setting, from: result.from, to: result.to }, label).toStrictEqual({
          setting,
          from,
          to,
        })
      }
    }
    expect(flips).toBeGreaterThan(0)
  })

  // @test-link [[rule_vary_settings_figure_step]]
  it('moves one figure one level over many seeds, reaching every figure both ways', () => {
    const settings = settingsWith({})
    const reached = new Set<string>()
    for (let seed = 0; seed < 3000; seed += 1) {
      const result = mutateSettings(settings, WIDE, makeSeed(seed), 1)
      if (result.setting !== 'figureLevels') continue
      const figure = result.figure
      if (figure === undefined) throw new Error('A figure step names its figure.')
      const from = FIGURE_LEVEL_IDS.indexOf(settings.figureLevels[figure])
      const to = FIGURE_LEVEL_IDS.indexOf(result.settings.figureLevels[figure])
      expect(Math.abs(to - from), `seed ${seed}`).toBe(1)
      expect(result.settings.controls).toStrictEqual(settings.controls)
      reached.add(`${figure} ${to > from ? 'up' : 'down'}`)
    }
    const offFigures = FIGURE_IDS.filter((figure) => settings.figureLevels[figure] === 'off')
    const expected = FIGURE_IDS.flatMap((figure) =>
      offFigures.includes(figure) ? [`${figure} up`] : [`${figure} up`, `${figure} down`],
    )
    expect([...reached].sort()).toStrictEqual(expected.sort())
  })

  // @test-link [[rule_vary_settings_figure_step]]
  it('never moves a figure past Off or Strongly favored', () => {
    const levels: FigureLevels = {
      ...NEUTRAL_FIGURE_LEVELS,
      passingTone: 'stronglyFavored',
      appoggiatura: 'off',
    }
    const settings = settingsWith({}, DEFAULT_PRESET_SELECTION, levels)
    const moved = new Set<string>()
    for (let seed = 0; seed < 3000; seed += 1) {
      const result = mutateSettings(settings, WIDE, makeSeed(seed), 2)
      if (result.setting !== 'figureLevels' || result.figure === undefined) continue
      if (result.figure === 'passingTone') {
        moved.add('passingTone')
        expect(result.to).toBe('favored')
      }
      if (result.figure === 'appoggiatura') {
        moved.add('appoggiatura')
        expect(result.to).toBe('asToday')
      }
      for (const figure of FIGURE_IDS)
        expect(FIGURE_LEVEL_IDS).toContain(result.settings.figureLevels[figure])
    }
    expect([...moved].sort()).toStrictEqual(['appoggiatura', 'passingTone'])
  })
})

// @test-link [[rule_vary_settings_marks_custom]]
// @test-link [[rule_mutation_marks_profile_customized]]
describe('mutateSettings Custom mark', () => {
  /** Intent: the drawn mutations k = 1 of these settings over many seeds. */
  function drawn(settings: SessionSettings): readonly SettingsMutationResult[] {
    return Array.from({ length: 600 }, (_, seed) =>
      mutateSettings(settings, WIDE, makeSeed(seed), 1),
    )
  }

  // @test-link [[rule_vary_settings_marks_custom]]
  // @test-link [[rule_mutation_marks_profile_customized]]
  it('marks Custom based on the selected preset after a Tension, Leapiness, Arpeggio chaos or level move, never after a key or mode move', () => {
    const settings = settingsWith({}, { kind: 'preset', presetId: 'jazz' })
    const results = drawn(settings)
    const marking = ['tension', 'leapiness', 'arpeggioChaos', 'figureLevels']
    for (const setting of [...marking, 'tonalCenter', 'collection'])
      expect(
        results.some((result) => result.setting === setting),
        setting,
      ).toBe(true)
    for (const result of results) {
      const expected =
        result.setting === 'tonalCenter' || result.setting === 'collection'
          ? settings.selection
          : { kind: 'custom', baseId: 'jazz' }
      expect(result.settings.selection, result.setting).toStrictEqual(expected)
    }
  })

  // @test-link [[rule_vary_settings_marks_custom]]
  it('keeps Custom as Custom with its base whatever moves', () => {
    for (const selection of [
      { kind: 'custom', baseId: 'reel' },
      { kind: 'custom', baseId: null },
    ] as const)
      for (const result of drawn(settingsWith({}, selection)))
        expect(result.settings.selection, result.setting).toStrictEqual(selection)
  })
})
