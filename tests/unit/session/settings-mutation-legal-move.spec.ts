/**
 * The legal-move check: for the settings in effect and a mutation context, whether at least one
 * step lands on a supported combination inside the allowed groups, the Rhythm group not counting
 * under the rhythm lock and a key or mode step counting only inside the restriction the settings
 * carry. It is false exactly when a mutation of those settings is a dead end, which throws nothing.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESET_IDS } from '@/domain/presets/built-in-presets'
import {
  makeKeyAndModeRestriction,
  onlyKeyAndMode,
} from '@/domain/presets/key-and-mode-restriction'
import { createMulberry32 } from '@/domain/random/prng'
import { makeSeed } from '@/domain/random/seed'
import { CANONICAL_REGISTER_ORDER } from '@/domain/profile/register-id'
import type { SessionSettings } from '@/session/session-types'
import {
  ALL_GROUPS_ALLOWED,
  MUTATION_DEAD_END,
  hasLegalMove,
  isMutationDeadEnd,
  mutateSettings,
  type AllowedGroups,
  type MutationContext,
} from '@/session/settings-mutation'
import {
  GROUP_CONTEXTS,
  groupsOn,
  pick,
  presetStart,
  specAllows,
  specGroupOf,
  specMarkedCandidates,
  withGroups,
} from './vary-settings-groups-cases'
import { randomSettings } from './vary-settings-random-settings'

const WIDE: MutationContext = {
  belowTabletLandscape: false,
  sessionSteppedDown: false,
  resolvedRegister: 'Middle',
}

/** Generous timeout for the tests that draw many mutations, on a loaded machine too. */
const MANY_DRAWS_TIMEOUT_MS = 60_000

/** The random settings the legal-move property checks. */
const PROPERTY_TRIALS = 2500

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
  // @test-link [[rule_vary_settings_skips_dead_end]]
  // @test-link [[module_settings_mutation]]
  it(
    'is false exactly when no step lands on a supported combination inside the allowed groups, and exactly when a mutation is a dead end',
    () => {
      const random = createMulberry32(0x1e6a_1015)
      const seen = { legal: 0, none: 0, mutated: 0, deadEnd: 0, blocked: 0 }
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
        const drawn = mutateSettings(settings, context, makeSeed(trial), 1)
        expect(isMutationDeadEnd(drawn), label).toBe(!legal)
        if (isMutationDeadEnd(drawn)) {
          expect(drawn, label).toStrictEqual(MUTATION_DEAD_END)
          seen.deadEnd += 1
        } else {
          expect(
            specAllows(specGroupOf(drawn.setting), settings.allowedGroups, settings.rhythmLockOn),
          ).toBe(true)
          seen.mutated += 1
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
