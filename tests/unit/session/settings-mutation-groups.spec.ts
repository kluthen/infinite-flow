/**
 * Vary settings' allowed groups: each mutable setting belongs to one of six groups, the settings
 * in effect say which groups are on and whether the rhythm lock is on, and a mutation moves only
 * settings of the groups it may move, never the Rhythm group under the lock. A step of a group
 * that is not allowed is drawn again from the same stream, as a step onto an unsupported
 * combination is.
 */

import { describe, expect, it } from 'vitest'

import { BUILT_IN_PRESET_IDS } from '@/domain/presets/built-in-presets'
import { createMulberry32 } from '@/domain/random/prng'
import { makeSeed } from '@/domain/random/seed'
import {
  ALL_GROUPS_ALLOWED,
  MUTABLE_SETTING_GROUPS,
  MUTABLE_SETTINGS,
  VARY_SETTINGS_GROUPS,
  isGroupAllowed,
  mutationCandidates,
  type MutationContext,
  type VarySettingsGroup,
} from '@/session/settings-mutation'
import { drawnMove, mutatedMove } from './settings-mutation-moves'
import {
  EVERY_GROUP_SUBSET,
  GROUP_CONTEXTS,
  SPEC_GROUP_ORDER,
  SPEC_GROUP_SETTINGS,
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

/** The seeded sessions the allowed-groups property draws. */
const PROPERTY_TRIALS = 1500

// @test-link [[rule_vary_settings_allowed_groups]]
// @test-link [[module_settings_mutation]]
describe('Vary settings groups', () => {
  // @test-link [[rule_vary_settings_allowed_groups]]
  // @test-link [[module_settings_mutation]]
  it('puts every mutable setting in exactly one group, each group as the spec lists it, the six groups in order', () => {
    expect(VARY_SETTINGS_GROUPS).toStrictEqual(SPEC_GROUP_ORDER)
    expect(Object.keys(MUTABLE_SETTING_GROUPS).sort()).toStrictEqual([...MUTABLE_SETTINGS].sort())
    for (const setting of MUTABLE_SETTINGS) {
      const listedIn = SPEC_GROUP_ORDER.filter((group) =>
        SPEC_GROUP_SETTINGS[group].includes(setting),
      )
      expect(listedIn, setting).toHaveLength(1)
      expect(MUTABLE_SETTING_GROUPS[setting], setting).toBe(listedIn[0])
    }
    for (const group of SPEC_GROUP_ORDER)
      expect(
        MUTABLE_SETTINGS.filter((setting) => MUTABLE_SETTING_GROUPS[setting] === group),
        group,
      ).toStrictEqual(SPEC_GROUP_SETTINGS[group])
    expect(Object.isFrozen(VARY_SETTINGS_GROUPS)).toBe(true)
    expect(Object.isFrozen(MUTABLE_SETTING_GROUPS)).toBe(true)
    expect(Object.isFrozen(ALL_GROUPS_ALLOWED)).toBe(true)
    expect(SPEC_GROUP_ORDER.every((group) => ALL_GROUPS_ALLOWED[group])).toBe(true)
  })

  // @test-link [[rule_vary_settings_allowed_groups]]
  it('offers at least one supported step in every group from the start settings of every built-in preset', () => {
    for (const presetId of BUILT_IN_PRESET_IDS) {
      const candidates = mutationCandidates(presetStart(presetId), WIDE)
      for (const group of SPEC_GROUP_ORDER)
        expect(
          candidates.filter(
            (candidate) => candidate.supported && specGroupOf(candidate.setting) === group,
          ).length,
          `${presetId} ${group}`,
        ).toBeGreaterThan(0)
    }
  })

  // @test-link [[rule_vary_settings_allowed_groups]]
  it('counts the Rhythm group as not allowed while the rhythm lock is on, every other group as its switch says', () => {
    for (const allowedGroups of EVERY_GROUP_SUBSET)
      for (const rhythmLockOn of [false, true])
        for (const group of SPEC_GROUP_ORDER)
          expect(isGroupAllowed(group, { allowedGroups, rhythmLockOn }), group).toBe(
            group === 'rhythm' ? allowedGroups.rhythm && !rhythmLockOn : allowedGroups[group],
          )
  })
})

// @test-link [[rule_vary_settings_allowed_groups]]
// @test-link [[module_settings_mutation]]
describe('mutateSettings inside the allowed groups', () => {
  // @test-link [[rule_vary_settings_allowed_groups]]
  // @test-link [[module_settings_mutation]]
  it(
    'with any subset of the groups, moves only settings of allowed groups, never the Rhythm group under the lock, drawn by the same route as an unsupported landing',
    () => {
      const random = createMulberry32(0x5eed_0015)
      const moved = new Map<string, number>()
      let deadEnds = 0
      for (let trial = 0; trial < PROPERTY_TRIALS; trial += 1) {
        const allowedGroups = pick(EVERY_GROUP_SUBSET, random.nextFloat())
        const rhythmLockOn = random.nextFloat() < 0.5
        const start = presetStart(pick(BUILT_IN_PRESET_IDS, random.nextFloat()))
        const settings = withGroups(start, allowedGroups, rhythmLockOn)
        const context = pick(GROUP_CONTEXTS, random.nextFloat())
        const seed = makeSeed(random.nextUint32())
        const k = 1 + Math.floor(random.nextFloat() * 6)
        const marked = specMarkedCandidates(settings, context)
        if (!marked.some((candidate) => candidate.supported)) {
          deadEnds += 1
          continue
        }
        const label = `trial ${trial}`
        const result = mutatedMove(settings, context, seed, k)
        const group = specGroupOf(result.setting)
        expect(specAllows(group, allowedGroups, rhythmLockOn), label).toBe(true)
        const expected = drawnMove(marked, seed, k)
        expect(
          { setting: result.setting, figure: result.figure, from: result.from, to: result.to },
          label,
        ).toStrictEqual({
          setting: expected.setting,
          figure: expected.figure,
          from: expected.from,
          to: expected.to,
        })
        expect(result.settings.allowedGroups, label).toStrictEqual(allowedGroups)
        expect(result.settings.rhythmLockOn, label).toBe(rhythmLockOn)
        const key = `${group} ${rhythmLockOn ? 'locked' : 'unlocked'}`
        moved.set(key, (moved.get(key) ?? 0) + 1)
      }
      for (const group of SPEC_GROUP_ORDER) {
        expect(moved.get(`${group} unlocked`), group).toBeGreaterThan(0)
        if (group !== 'rhythm') expect(moved.get(`${group} locked`), group).toBeGreaterThan(0)
      }
      expect(moved.has('rhythm locked')).toBe(false)
      expect(deadEnds).toBeGreaterThan(0)
    },
    MANY_DRAWS_TIMEOUT_MS,
  )

  // @test-link [[rule_vary_settings_allowed_groups]]
  it('never moves the Rhythm group under the lock with every group on, and moves each other group', () => {
    const settings = withGroups(presetStart('neutral'), ALL_GROUPS_ALLOWED, true)
    const groups = new Set<VarySettingsGroup>()
    for (let seed = 0; seed < 400; seed += 1)
      for (const k of [1, 2, 3]) {
        const result = mutatedMove(settings, WIDE, makeSeed(seed), k)
        groups.add(specGroupOf(result.setting))
      }
    expect([...groups].sort()).toStrictEqual(
      SPEC_GROUP_ORDER.filter((group) => group !== 'rhythm').sort(),
    )
  })
})
