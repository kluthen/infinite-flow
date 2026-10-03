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
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
  type ProfileSelection,
} from '@/domain/controls/profile-selection'
import {
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
  musicalProfile: ProfileSelection = DEFAULT_PROFILE_SELECTION,
): SessionSettings {
  return { controls: { ...DEFAULT_GENERATION_CONTROLS, ...controls }, musicalProfile }
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

const PROFILE_CONTROLLED: readonly MutableSetting[] = [
  'harmonicMotion',
  'noteDensity',
  'rhythmicVariety',
  'syncopation',
  'silenceDensity',
  'contour',
  'register',
]
const NOT_PROFILE_CONTROLLED: readonly MutableSetting[] = [
  'tonalCenter',
  'collection',
  'tension',
  'leapiness',
  'arpeggioChaos',
]

// @test-link [[module_settings_mutation]]
// @test-link [[req_settings_mutation_flag]]
describe('settings-mutation eligible settings', () => {
  it('holds one scale per eligible setting and never tempo or the instrument', () => {
    expect([...MUTABLE_SETTINGS].sort()).toStrictEqual(Object.keys(MUTATION_SCALES).sort())
    expect(MUTABLE_SETTINGS).toHaveLength(13)
    expect(MUTABLE_SETTINGS).toContain('musicalProfile')
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

// @test-link [[rule_mutation_profile_flip_keeps_controls]]
describe('settings-mutation musical profile flip', () => {
  it('flips Neutral and Jazz, keeps every control and marks the profile customized', () => {
    for (const musicalProfile of ['Neutral', 'Jazz'] as const) {
      const settings = settingsWith({}, { musicalProfile, isCustom: false })
      const candidates = mutationCandidates(settings, WIDE).filter(
        (candidate) => candidate.setting === 'musicalProfile',
      )
      expect(candidates).toHaveLength(1)
      const [flip] = candidates
      expect(flip?.from).toBe(musicalProfile)
      expect(flip?.to).toBe(musicalProfile === 'Neutral' ? 'Jazz' : 'Neutral')
      expect(flip?.settings.controls).toStrictEqual(settings.controls)
      expect(flip?.settings.musicalProfile).toStrictEqual({
        musicalProfile: flip?.to,
        isCustom: true,
      })
    }
  })
})

// @test-link [[rule_mutation_marks_profile_customized]]
describe('settings-mutation customized mark', () => {
  it('marks the profile customized after a profile-controlled step, keeping its identity', () => {
    const settings = settingsWith({}, { musicalProfile: 'Jazz', isCustom: false })
    for (const candidate of mutationCandidates(settings, WIDE))
      if (PROFILE_CONTROLLED.includes(candidate.setting))
        expect(candidate.settings.musicalProfile, candidate.setting).toStrictEqual({
          musicalProfile: 'Jazz',
          isCustom: true,
        })
  })

  it('leaves the customized mark as it was after a step of a value the profile does not control', () => {
    for (const isCustom of [false, true]) {
      const settings = settingsWith({}, { musicalProfile: 'Neutral', isCustom })
      const candidates = mutationCandidates(settings, WIDE).filter((candidate) =>
        NOT_PROFILE_CONTROLLED.includes(candidate.setting),
      )
      expect(candidates.length).toBeGreaterThan(0)
      for (const candidate of candidates)
        expect(candidate.settings.musicalProfile, candidate.setting).toStrictEqual({
          musicalProfile: 'Neutral',
          isCustom,
        })
    }
  })

  it('classifies every eligible setting as profile-controlled, free, or the profile itself', () => {
    expect(
      [...PROFILE_CONTROLLED, ...NOT_PROFILE_CONTROLLED, 'musicalProfile'].sort(),
    ).toStrictEqual([...MUTABLE_SETTINGS].sort())
  })
})
