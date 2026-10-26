import { describe, expect, it } from 'vitest'

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevel,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import {
  ALL_GROUPS_ALLOWED,
  MUTABLE_SETTINGS,
  MUTATION_SCALES,
  SettingsMutationError,
  mutationCandidates,
  scaleNeighbours,
  type MutableSetting,
  type MutationContext,
} from '@/session/settings-mutation'
import type { SessionSettings } from '@/session/session-types'

const WIDE: MutationContext = {
  belowTabletLandscape: false,
  sessionSteppedDown: false,
  resolvedRegister: 'Middle',
}

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
    allowedRhythmChanges: [],
  }
}

/** The values one grade away from the current one, as the real candidate list gives them. */
function stepsOf(
  setting: MutableSetting,
  settings: SessionSettings,
  context: MutationContext = WIDE,
): readonly string[] {
  return mutationCandidates(settings, context)
    .filter((candidate) => candidate.setting === setting)
    .map((candidate) => candidate.to)
}

const ORDERED_SCALES: readonly (readonly [MutableSetting, readonly string[]])[] = [
  ['harmonicMotion', HARMONIC_MOTIONS],
  ['tension', TENSION_ARCS],
  ['noteDensity', NOTE_DENSITIES],
  ['rhythmicVariety', RHYTHMIC_VARIETIES],
  ['syncopation', SYNCOPATIONS],
  ['silenceDensity', SILENCE_DENSITIES],
  ['leapiness', LEAPINESS_VALUES],
  ['arpeggioChaos', ARPEGGIO_CHAOS_VALUES],
]

/** The ten preset-held controls: a step of any of them marks the selection Custom. */
const PRESET_HELD: readonly MutableSetting[] = [
  'harmonicMotion',
  'tension',
  'noteDensity',
  'rhythmicVariety',
  'syncopation',
  'silenceDensity',
  'contour',
  'register',
  'leapiness',
  'arpeggioChaos',
]
/** The written key and the mode: a step of either never changes the selection. */
const KEY_OR_MODE: readonly MutableSetting[] = ['tonalCenter', 'collection']

/** Intent: whether a step marks Custom: a preset-held control's, or a figure level's. */
function marksCustom(setting: MutableSetting): boolean {
  return PRESET_HELD.includes(setting) || setting === 'figureLevels'
}

// @test-link [[module_settings_mutation]]
// @test-link [[req_settings_mutation_flag]]
describe('settings-mutation eligible settings', () => {
  it("holds one scale per eligible setting, the figure levels in the profile's last place, and never tempo or the instrument", () => {
    expect([...MUTABLE_SETTINGS].sort()).toStrictEqual(Object.keys(MUTATION_SCALES).sort())
    expect(MUTABLE_SETTINGS).toHaveLength(13)
    expect(MUTABLE_SETTINGS.at(-1)).toBe('figureLevels')
    expect(MUTABLE_SETTINGS).not.toContain('musicalProfile')
    expect(MUTABLE_SETTINGS).not.toContain('tempo')
    expect(MUTABLE_SETTINGS).not.toContain('instrumentProfileId')
    expect(Object.isFrozen(MUTATION_SCALES)).toBe(true)
  })

  it('offers at least one step for every eligible setting', () => {
    for (const setting of MUTABLE_SETTINGS)
      expect(stepsOf(setting, settingsWith({})).length, setting).toBeGreaterThan(0)
  })
})

// @test-link [[rule_mutation_setting_scales]]
// @test-link [[module_settings_mutation]]
describe('settings-mutation scales', () => {
  it('steps an ordered setting to its catalog neighbours, with one neighbour at each end', () => {
    for (const [setting, catalog] of ORDERED_SCALES)
      catalog.forEach((value, index) => {
        const expected = [catalog[index - 1], catalog[index + 1]].filter((v) => v !== undefined)
        expect(stepsOf(setting, settingsWith({ [setting]: value })), `${setting} ${value}`).toEqual(
          expected,
        )
      })
  })

  it('steps the tonal center a fifth down or up around the circle, wrapping', () => {
    PITCH_CLASSES.forEach((value, index) => {
      expect(stepsOf('tonalCenter', settingsWith({ tonalCenter: value }))).toStrictEqual([
        PITCH_CLASSES[(index + 5) % 12],
        PITCH_CLASSES[(index + 7) % 12],
      ])
    })
    expect(stepsOf('tonalCenter', settingsWith({ tonalCenter: 'C' }))).toStrictEqual(['F', 'G'])
    expect(stepsOf('tonalCenter', settingsWith({ tonalCenter: 'B' }))).toStrictEqual(['E', 'F#'])
    expect(stepsOf('tonalCenter', settingsWith({ tonalCenter: 'F' }))).toStrictEqual(['A#', 'C'])
  })

  it('moves the collection inside the tonal pair or along the modes, never across', () => {
    const steps = (collection: GenerationControls['collection']) =>
      stepsOf('collection', settingsWith({ collection }))
    expect(steps('Major')).toStrictEqual(['Minor'])
    expect(steps('Minor')).toStrictEqual(['Major'])
    expect(steps('Lydian')).toStrictEqual(['Ionian'])
    expect(steps('Ionian')).toStrictEqual(['Lydian', 'Mixolydian'])
    expect(steps('Mixolydian')).toStrictEqual(['Ionian', 'Dorian'])
    expect(steps('Dorian')).toStrictEqual(['Mixolydian', 'Aeolian'])
    expect(steps('Aeolian')).toStrictEqual(['Dorian', 'Phrygian'])
    expect(steps('Phrygian')).toStrictEqual(['Aeolian', 'Locrian'])
    expect(steps('Locrian')).toStrictEqual(['Phrygian'])
    for (const collection of COLLECTIONS) {
      const tonal = collection === 'Major' || collection === 'Minor'
      for (const to of steps(collection))
        expect(to === 'Major' || to === 'Minor', `${collection} → ${to}`).toBe(tonal)
    }
  })

  it('places every collection in exactly one of its separate scales', () => {
    const scale = MUTATION_SCALES.collection.scale
    expect(scale.kind).toBe('separate')
    if (scale.kind !== 'separate') return
    expect(scale.groups.flat().sort()).toStrictEqual([...COLLECTIONS].sort())
  })

  it('treats contour as unordered: every other contour is one grade away', () => {
    for (const contour of CONTOURS)
      expect(stepsOf('contour', settingsWith({ contour }))).toStrictEqual(
        CONTOURS.filter((other) => other !== contour),
      )
  })

  it('steps the register along Low, Middle, High, never onto Varying', () => {
    expect(stepsOf('register', settingsWith({ register: 'Low' }))).toStrictEqual(['Middle'])
    expect(stepsOf('register', settingsWith({ register: 'Middle' }))).toStrictEqual(['Low', 'High'])
    expect(stepsOf('register', settingsWith({ register: 'High' }))).toStrictEqual(['Middle'])
  })

  it('steps a Varying register from the resolved register and holds a concrete one after', () => {
    const varying = settingsWith({ register: 'Varying' })
    for (const resolvedRegister of ['Low', 'Middle', 'High'] as const) {
      const context = { ...WIDE, resolvedRegister }
      const candidates = mutationCandidates(varying, context).filter(
        (candidate) => candidate.setting === 'register',
      )
      expect(candidates.length).toBeGreaterThan(0)
      for (const candidate of candidates) {
        expect(candidate.from).toBe(resolvedRegister)
        expect(candidate.to).not.toBe('Varying')
        expect(candidate.settings.controls.register).toBe(candidate.to)
      }
    }
    expect(stepsOf('register', varying, { ...WIDE, resolvedRegister: 'Low' })).toStrictEqual([
      'Middle',
    ])
  })

  it('steps note density from the generated density, not the chosen one', () => {
    const sixteenth = settingsWith({ noteDensity: 'Sixteenth' })
    for (const context of [
      { ...WIDE, sessionSteppedDown: true },
      { ...WIDE, belowTabletLandscape: true },
    ]) {
      const candidates = mutationCandidates(sixteenth, context).filter(
        (candidate) => candidate.setting === 'noteDensity',
      )
      expect(candidates.map(({ from, to, supported }) => ({ from, to, supported }))).toStrictEqual([
        { from: 'Eighth', to: 'Quarter', supported: true },
        { from: 'Eighth', to: 'Sixteenth', supported: false },
      ])
    }
    expect(stepsOf('noteDensity', sixteenth)).toStrictEqual(['Eighth'])
  })

  it('rejects a value that is not on the scale', () => {
    expect(() => scaleNeighbours(MUTATION_SCALES.register.scale, 'Varying')).toThrow(
      SettingsMutationError,
    )
  })
})

/** Intent: Neutral's levels with one figure at a level. */
function levelsWith(figure: (typeof FIGURE_IDS)[number], level: FigureLevel): FigureLevels {
  return { ...NEUTRAL_FIGURE_LEVELS, [figure]: level }
}

// @test-link [[rule_vary_settings_figure_step]]
// @test-link [[module_settings_mutation]]
describe('settings-mutation figure step', () => {
  // @test-link [[rule_vary_settings_figure_step]]
  it('moves one figure one level, within Off to Strongly favored, and nothing else', () => {
    for (const figure of FIGURE_IDS)
      FIGURE_LEVEL_IDS.forEach((level, index) => {
        const settings = settingsWith({}, DEFAULT_PRESET_SELECTION, levelsWith(figure, level))
        const steps = mutationCandidates(settings, WIDE).filter(
          (candidate) => candidate.setting === 'figureLevels' && candidate.figure === figure,
        )
        const expected = [FIGURE_LEVEL_IDS[index - 1], FIGURE_LEVEL_IDS[index + 1]].filter(
          (to) => to !== undefined,
        )
        expect(
          steps.map((step) => step.to),
          `${figure} ${level}`,
        ).toStrictEqual(expected)
        for (const step of steps) {
          expect(step.from).toBe(level)
          expect(step.supported).toBe(true)
          expect(step.settings.figureLevels).toStrictEqual({
            ...settings.figureLevels,
            [figure]: step.to,
          })
          expect(step.settings.controls).toStrictEqual(settings.controls)
        }
      })
  })

  // @test-link [[rule_vary_settings_figure_step]]
  it('offers every figure as one setting, figure by figure, and names the figure only on a figure step', () => {
    const candidates = mutationCandidates(settingsWith({}), WIDE)
    const figureSteps = candidates.filter((candidate) => candidate.setting === 'figureLevels')
    expect([...new Set(figureSteps.map((step) => step.figure))]).toStrictEqual([...FIGURE_IDS])
    for (const candidate of candidates)
      expect(Object.hasOwn(candidate, 'figure'), candidate.setting).toBe(
        candidate.setting === 'figureLevels',
      )
    const scale = MUTATION_SCALES.figureLevels.scale
    expect(scale).toStrictEqual({ kind: 'ordered', values: FIGURE_LEVEL_IDS })
  })
})

// @test-link [[rule_vary_settings_marks_custom]]
// @test-link [[rule_mutation_marks_profile_customized]]
describe('settings-mutation Custom mark', () => {
  // @test-link [[rule_vary_settings_marks_custom]]
  // @test-link [[rule_mutation_marks_profile_customized]]
  it('makes Custom based on the selected preset after a step of any of the ten preset-held controls or of a level', () => {
    expect(PRESET_HELD).toEqual(expect.arrayContaining(['tension', 'leapiness', 'arpeggioChaos']))
    for (const presetId of ['neutral', 'jazz', 'reel']) {
      const settings = settingsWith({}, { kind: 'preset', presetId })
      const marking = mutationCandidates(settings, WIDE).filter((candidate) =>
        marksCustom(candidate.setting),
      )
      expect(new Set(marking.map((candidate) => candidate.setting)).size).toBe(11)
      for (const candidate of marking)
        expect(candidate.settings.selection, `${presetId} ${candidate.setting}`).toStrictEqual({
          kind: 'custom',
          baseId: presetId,
        })
    }
  })

  // @test-link [[rule_vary_settings_marks_custom]]
  it('keeps Custom as Custom with its base after every step', () => {
    for (const selection of [
      { kind: 'custom', baseId: 'jazz' },
      { kind: 'custom', baseId: null },
    ] as const) {
      for (const candidate of mutationCandidates(settingsWith({}, selection), WIDE))
        expect(candidate.settings.selection, candidate.setting).toStrictEqual(selection)
    }
  })

  // @test-link [[rule_vary_settings_marks_custom]]
  it('never changes the selection after a key or mode step', () => {
    for (const selection of [
      { kind: 'preset', presetId: 'neutral' },
      { kind: 'preset', presetId: 'reel' },
      { kind: 'custom', baseId: 'jazz' },
    ] as const) {
      const candidates = mutationCandidates(settingsWith({}, selection), WIDE).filter((candidate) =>
        KEY_OR_MODE.includes(candidate.setting),
      )
      expect(candidates.length).toBeGreaterThan(0)
      for (const candidate of candidates)
        expect(candidate.settings.selection, candidate.setting).toStrictEqual(selection)
    }
  })

  it('classifies every eligible setting as preset-held, key or mode, or the figure levels', () => {
    expect([...PRESET_HELD, ...KEY_OR_MODE, 'figureLevels'].sort()).toStrictEqual(
      [...MUTABLE_SETTINGS].sort(),
    )
  })
})
