/**
 * The legal-move check: for the settings in effect and a mutation context, whether at least one
 * step lands on a supported combination inside the allowed groups, the Rhythm group not counting
 * under the rhythm lock and a key or mode step counting only inside the restriction the settings
 * carry. It is false exactly when a mutation of those settings has no move to make.
 */

import { describe, expect, it } from 'vitest'

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type Collection,
  type GenerationControls,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import {
  FIGURE_LEVEL_IDS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESET_IDS } from '@/domain/presets/built-in-presets'
import {
  makeKeyAndModeRestriction,
  onlyKeyAndMode,
  type KeyAndModeRestriction,
  type RestrictionHalf,
} from '@/domain/presets/key-and-mode-restriction'
import { createMulberry32, type Mulberry32Generator } from '@/domain/random/prng'
import { makeSeed } from '@/domain/random/seed'
import { CANONICAL_REGISTER_ORDER } from '@/domain/profile/register-id'
import type { SessionSettings } from '@/session/session-types'
import {
  ALL_GROUPS_ALLOWED,
  SettingsMutationError,
  hasLegalMove,
  mutateSettings,
  type AllowedGroups,
  type MutationContext,
} from '@/session/settings-mutation'
import {
  EVERY_GROUP_SUBSET,
  GROUP_CONTEXTS,
  groupsOn,
  pick,
  presetStart,
  specAllows,
  specGroupOf,
  specMarkedCandidates,
  withGroups,
} from './vary-settings-groups-cases'

const WIDE: MutationContext = {
  belowTabletLandscape: false,
  sessionSteppedDown: false,
  resolvedRegister: 'Middle',
}

/** Generous timeout for the tests that draw many mutations, on a loaded machine too. */
const MANY_DRAWS_TIMEOUT_MS = 60_000

/** The random settings the legal-move property checks. */
const PROPERTY_TRIALS = 2500

/** Intent: a restriction half: any, or the current value with up to two others. */
function randomHalf<T extends string>(
  random: Mulberry32Generator,
  catalog: readonly T[],
  current: T,
): RestrictionHalf<T> {
  if (random.nextFloat() < 1 / 3) return 'any'
  const others = Array.from({ length: Math.floor(random.nextFloat() * 3) }, () =>
    pick(catalog, random.nextFloat()),
  ).filter((value, at, all) => value !== current && all.indexOf(value) === at)
  return [current, ...others]
}

/**
 * Intent: a restriction holding the current key and mode, as one frozen at a session's start
 * does, or none when both halves allow anything.
 */
function randomRestriction(
  random: Mulberry32Generator,
  tonalCenter: PitchClass,
  collection: Collection,
): KeyAndModeRestriction | undefined {
  const keys = randomHalf(random, PITCH_CLASSES, tonalCenter)
  const modes = randomHalf(random, COLLECTIONS, collection)
  if (keys === 'any' && modes === 'any') return undefined
  return makeKeyAndModeRestriction({ keys, modes })
}

/** Intent: settings with every mutable control and figure level drawn at random. */
function randomSettings(random: Mulberry32Generator): SessionSettings {
  const draw = <T>(catalog: readonly T[]): T => pick(catalog, random.nextFloat())
  const controls: GenerationControls = {
    ...DEFAULT_GENERATION_CONTROLS,
    tonalCenter: draw(PITCH_CLASSES),
    collection: draw(COLLECTIONS),
    harmonicMotion: draw(HARMONIC_MOTIONS),
    tension: draw(TENSION_ARCS),
    noteDensity: draw(NOTE_DENSITIES),
    rhythmicVariety: draw(RHYTHMIC_VARIETIES),
    syncopation: draw(SYNCOPATIONS),
    silenceDensity: draw(SILENCE_DENSITIES),
    contour: draw(CONTOURS),
    register: draw(REGISTER_CHOICES),
    leapiness: draw(LEAPINESS_VALUES),
    arpeggioChaos: draw(ARPEGGIO_CHAOS_VALUES),
  }
  const figureLevels: FigureLevels = {
    passingTone: draw(FIGURE_LEVEL_IDS),
    accentedPassingTone: draw(FIGURE_LEVEL_IDS),
    neighborTone: draw(FIGURE_LEVEL_IDS),
    appoggiatura: draw(FIGURE_LEVEL_IDS),
    diatonicEnclosure: draw(FIGURE_LEVEL_IDS),
    chromaticApproach: draw(FIGURE_LEVEL_IDS),
    chromaticEnclosure: draw(FIGURE_LEVEL_IDS),
  }
  const restriction = randomRestriction(random, controls.tonalCenter, controls.collection)
  return {
    controls,
    figureLevels,
    selection: { kind: 'custom', baseId: draw(BUILT_IN_PRESET_IDS) },
    ...(restriction === undefined ? {} : { restriction }),
    allowedGroups: draw(EVERY_GROUP_SUBSET),
    rhythmLockOn: random.nextFloat() < 0.5,
  }
}

/** Intent: C Ionian settings with Neutral's levels and the given groups, lock and controls. */
function cIonian(
  allowedGroups: AllowedGroups,
  rhythmLockOn: boolean,
  controls: Partial<GenerationControls> = {},
): SessionSettings {
  return {
    controls: { ...DEFAULT_GENERATION_CONTROLS, ...controls },
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    selection: { kind: 'preset', presetId: 'neutral' },
    allowedGroups,
    rhythmLockOn,
  }
}

// @test-link [[rule_vary_settings_needs_legal_move]]
// @test-link [[rule_vary_settings_allowed_groups]]
// @test-link [[module_settings_mutation]]
describe('the legal-move check', () => {
  // @test-link [[rule_vary_settings_needs_legal_move]]
  // @test-link [[module_settings_mutation]]
  it(
    'is false exactly when no step lands on a supported combination inside the allowed groups, and exactly when a mutation has no move to make',
    () => {
      const random = createMulberry32(0x1e6a_1015)
      const seen = { legal: 0, none: 0, mutated: 0, refused: 0, blocked: 0 }
      for (let trial = 0; trial < PROPERTY_TRIALS; trial += 1) {
        const settings = randomSettings(random)
        const context = pick(GROUP_CONTEXTS, random.nextFloat())
        const label = `trial ${trial}`
        const legal = specMarkedCandidates(settings, context).some((step) => step.supported)
        expect(hasLegalMove(settings, context), label).toBe(legal)
        seen[legal ? 'legal' : 'none'] += 1
        if (isRhythmSettingBlocked(settings.controls, context)) {
          seen.blocked += 1
          continue
        }
        const mutate = () => mutateSettings(settings, context, makeSeed(trial), 1)
        if (legal) {
          const { setting } = mutate()
          expect(
            specAllows(specGroupOf(setting), settings.allowedGroups, settings.rhythmLockOn),
          ).toBe(true)
          seen.mutated += 1
        } else {
          expect(mutate, label).toThrow(SettingsMutationError)
          seen.refused += 1
        }
      }
      for (const [kind, count] of Object.entries(seen)) expect(count, kind).toBeGreaterThan(0)
    },
    MANY_DRAWS_TIMEOUT_MS,
  )

  // @test-link [[rule_vary_settings_needs_legal_move]]
  it('is false with every group off, and true with every group on', () => {
    for (const presetId of BUILT_IN_PRESET_IDS) {
      const start = presetStart(presetId)
      expect(hasLegalMove(withGroups(start, groupsOn([]), false), WIDE), presetId).toBe(false)
      expect(hasLegalMove(withGroups(start, ALL_GROUPS_ALLOWED, false), WIDE), presetId).toBe(true)
    }
  })

  // @test-link [[rule_vary_settings_needs_legal_move]]
  it('is false with only the Rhythm group on while the lock is on, and true with the lock off', () => {
    const onlyRhythm = groupsOn(['rhythm'])
    expect(hasLegalMove(cIonian(onlyRhythm, true), WIDE)).toBe(false)
    expect(hasLegalMove(cIonian(onlyRhythm, false), WIDE)).toBe(true)
  })

  // @test-link [[rule_vary_settings_needs_legal_move]]
  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  it('is false with only Key and mode on under a restriction admitting no neighbouring key or mode', () => {
    const onlyKeyAndModeGroup = groupsOn(['keyAndMode'])
    const dDorian = cIonian(onlyKeyAndModeGroup, false, {
      tonalCenter: 'D',
      collection: 'Dorian',
    })
    expect(hasLegalMove({ ...dDorian, restriction: onlyKeyAndMode('D', 'Dorian') }, WIDE)).toBe(
      false,
    )
    expect(hasLegalMove(dDorian, WIDE)).toBe(true)
    const dDorianOrMixolydian = makeKeyAndModeRestriction({
      keys: ['D'],
      modes: ['Dorian', 'Mixolydian'],
    })
    expect(hasLegalMove({ ...dDorian, restriction: dDorianOrMixolydian }, WIDE)).toBe(true)
  })

  // @test-link [[rule_vary_settings_needs_legal_move]]
  it('gives the same answer for a Varying register whatever register the session resolved', () => {
    const random = createMulberry32(0x7a41_0015)
    for (let trial = 0; trial < 300; trial += 1) {
      const settings = randomSettings(random)
      const varying: SessionSettings = {
        ...settings,
        controls: { ...settings.controls, register: 'Varying' },
      }
      const context = pick(GROUP_CONTEXTS, random.nextFloat())
      const answers = CANONICAL_REGISTER_ORDER.map((resolvedRegister) =>
        hasLegalMove(varying, { ...context, resolvedRegister }),
      )
      expect(new Set(answers).size, `trial ${trial}`).toBe(1)
    }
  })

  // @test-link [[rule_vary_settings_needs_legal_move]]
  it('counts, for settings unsupported to begin with, the rhythm steps that lead out of the block', () => {
    const blocked: Partial<GenerationControls> = {
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
    }
    expect(isRhythmSettingBlocked(cIonian(ALL_GROUPS_ALLOWED, false, blocked).controls, WIDE)).toBe(
      true,
    )
    expect(hasLegalMove(cIonian(ALL_GROUPS_ALLOWED, false, blocked), WIDE)).toBe(true)
    expect(hasLegalMove(cIonian(ALL_GROUPS_ALLOWED, true, blocked), WIDE)).toBe(false)
    const allButRhythm = groupsOn(['keyAndMode', 'harmony', 'tension', 'melodyShape', 'figures'])
    expect(hasLegalMove(cIonian(allButRhythm, false, blocked), WIDE)).toBe(false)
  })
})
