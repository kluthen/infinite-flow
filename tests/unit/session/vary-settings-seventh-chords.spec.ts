/**
 * Vary settings and the Seventh chords level: the level is no mutable setting and belongs to no
 * allowed group, so no draw ever moves it and it never makes the selection Custom. Over many seeded
 * sessions with Vary settings on and every group allowed, each landing at a level is the landing at
 * Off with the level kept; the recorded v3.1 draws and v3.2's group cases give the very same moves
 * at every level.
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { CHORD_FAMILY_LEVEL_IDS, type ChordFamilies } from '@/domain/chords/chord-families'
import { BUILT_IN_PRESET_IDS } from '@/domain/presets/built-in-presets'
import { createMulberry32 } from '@/domain/random/prng'
import { makeSeed } from '@/domain/random/seed'
import { landingMutation } from '@/session/session-mutation-step'
import type { SessionSettings } from '@/session/session-types'
import {
  MUTABLE_SETTING_GROUPS,
  MUTABLE_SETTINGS,
  VARY_SETTINGS_GROUPS,
} from '@/session/settings-mutation'
import { mutatedMove } from './settings-mutation-moves'
import {
  VARY_SETTINGS_DRAWS_V31_CONTEXTS,
  VARY_SETTINGS_DRAWS_V31_LAST_PHRASE,
  VARY_SETTINGS_DRAWS_V31_PRESETS,
  VARY_SETTINGS_DRAWS_V31_SESSION_SEEDS,
  canonicalJson,
  contextOnPhrase,
  sessionDrawRows,
  startSettings,
  type DrawsRow,
} from './vary-settings-draws-v31-cases'
import {
  EVERY_GROUP_SUBSET,
  GROUP_CONTEXTS,
  pick,
  presetStart,
  specMarkedCandidates,
  withGroups,
} from './vary-settings-groups-cases'

/** Each level above Off, as the session's Seventh chords level. */
const LEVELS_ABOVE_OFF: readonly ChordFamilies[] = CHORD_FAMILY_LEVEL_IDS.filter(
  (level) => level !== 'off',
).map((level) => ({ 'seventh-chords': level }))

/** Generous timeout for the tests that draw many mutations, on a loaded machine too. */
const MANY_DRAWS_TIMEOUT_MS = 120_000

/** The seeded sessions the never-moves property runs. */
const SESSION_TRIALS = 120

/** The seeded draws the group-cases property makes at each level. */
const GROUP_TRIALS = 600

/** The recorded v3.1 corpus's rows. */
const RECORDED_ROWS: readonly DrawsRow[] = (
  JSON.parse(readFileSync('tests/fixtures/vary-settings/v3.1-mutation-draws.json', 'utf8')) as {
    readonly rows: readonly DrawsRow[]
  }
).rows

/** Intent: the settings with the level replaced, nothing else changed. */
function atLevel(settings: SessionSettings, chordFamilies: ChordFamilies): SessionSettings {
  return { ...settings, chordFamilies }
}

// @test-link [[rule_vary_settings_never_moves_seventh_chords_level]]
// @test-link [[rule_vary_settings_allowed_groups]]
describe('Vary settings never moves the Seventh chords level', () => {
  // @test-link [[rule_vary_settings_never_moves_seventh_chords_level]]
  // @test-link [[rule_vary_settings_allowed_groups]]
  it('is no mutable setting and belongs to none of the six groups', () => {
    expect(MUTABLE_SETTINGS).not.toContain('chordFamilies')
    expect(Object.keys(MUTABLE_SETTING_GROUPS)).not.toContain('chordFamilies')
    expect(Object.keys(MUTABLE_SETTING_GROUPS).sort()).toStrictEqual([...MUTABLE_SETTINGS].sort())
    expect(VARY_SETTINGS_GROUPS).toStrictEqual([
      'keyAndMode',
      'harmony',
      'tension',
      'rhythm',
      'melodyShape',
      'figures',
    ])
  })

  // @test-link [[rule_vary_settings_never_moves_seventh_chords_level]]
  // @test-link [[rule_mutation_marks_profile_customized]]
  // @test-link [[rule_mutation_draws_setting_then_direction]]
  it(
    'over many seeded sessions with every group allowed, lands at each level exactly what it lands at Off, the level kept and never making Custom',
    () => {
      const random = createMulberry32(0x5eed_0016)
      let landings = 0
      for (let trial = 0; trial < SESSION_TRIALS; trial += 1) {
        const presetId = pick(BUILT_IN_PRESET_IDS, random.nextFloat())
        const context = pick(VARY_SETTINGS_DRAWS_V31_CONTEXTS, random.nextFloat())
        const level = pick(LEVELS_ABOVE_OFF, random.nextFloat())
        const flag = { kind: 'on', seed: makeSeed(random.nextUint32()) } as const
        let off = startSettings(presetId)
        let leveled = startSettings(presetId, level)
        for (let phrase = 2; phrase <= VARY_SETTINGS_DRAWS_V31_LAST_PHRASE; phrase += 1) {
          const label = `trial ${trial} ${presetId} ${context.id} phrase ${phrase}`
          const onPhrase = contextOnPhrase(context, phrase)
          const atOff = landingMutation(flag, phrase, off, () => onPhrase)
          const atLevelLanding = landingMutation(flag, phrase, leveled, () => onPhrase)
          if (atOff === undefined) {
            expect(atLevelLanding, label).toBeUndefined()
            continue
          }
          if (atLevelLanding === undefined) throw new Error(`${label}: no landing at the level.`)
          landings += 1
          expect(atLevelLanding.settings.chordFamilies, label).toStrictEqual(level)
          expect(atLevelLanding.settings.selection, label).toStrictEqual(atOff.settings.selection)
          expect(canonicalJson(atLevelLanding.settings), label).toBe(
            canonicalJson(atLevel(atOff.settings, level)),
          )
          expect({ ...atLevelLanding.output, settings: null }, label).toStrictEqual({
            ...atOff.output,
            settings: null,
          })
          off = atOff.settings
          leveled = atLevelLanding.settings
        }
      }
      expect(landings).toBeGreaterThan(SESSION_TRIALS * 4)
    },
    MANY_DRAWS_TIMEOUT_MS,
  )

  // @test-link [[rule_vary_settings_never_moves_seventh_chords_level]]
  // @test-link [[rule_mutation_draws_setting_then_direction]]
  it.each(LEVELS_ABOVE_OFF.map((level) => [level['seventh-chords'], level] as const))(
    'lands every recorded v3.1 move exactly as recorded with the session at %s',
    (_name, level) => {
      for (const presetId of VARY_SETTINGS_DRAWS_V31_PRESETS)
        for (const context of VARY_SETTINGS_DRAWS_V31_CONTEXTS)
          for (const seed of VARY_SETTINGS_DRAWS_V31_SESSION_SEEDS) {
            const recorded = RECORDED_ROWS.filter(
              (row) => row[0] === presetId && row[1] === context.id && row[2] === seed,
            )
            expect(
              sessionDrawRows(presetId, context, seed, level),
              `${presetId} ${context.id} ${seed}`,
            ).toStrictEqual(recorded)
          }
    },
    MANY_DRAWS_TIMEOUT_MS,
  )

  // @test-link [[rule_vary_settings_never_moves_seventh_chords_level]]
  // @test-link [[rule_vary_settings_allowed_groups]]
  it.each(LEVELS_ABOVE_OFF.map((level) => [level['seventh-chords'], level] as const))(
    "gives v3.2's group cases the same steps and the same moves at %s as at Off",
    (_name, level) => {
      const random = createMulberry32(0x5eed_1600)
      for (let trial = 0; trial < GROUP_TRIALS; trial += 1) {
        const allowedGroups = pick(EVERY_GROUP_SUBSET, random.nextFloat())
        const rhythmLockOn = random.nextFloat() < 0.5
        const presetId = pick(BUILT_IN_PRESET_IDS, random.nextFloat())
        const context = pick(GROUP_CONTEXTS, random.nextFloat())
        const seed = makeSeed(random.nextUint32())
        const k = 1 + Math.floor(random.nextFloat() * 6)
        const label = `trial ${trial} ${presetId}`
        const off = withGroups(presetStart(presetId), allowedGroups, rhythmLockOn)
        const leveled = withGroups(presetStart(presetId, level), allowedGroups, rhythmLockOn)
        const marked = specMarkedCandidates(leveled, context)
        expect(canonicalJson(marked), label).toBe(
          canonicalJson(
            specMarkedCandidates(off, context).map((candidate) => ({
              ...candidate,
              settings: atLevel(candidate.settings, level),
            })),
          ),
        )
        if (!marked.some((candidate) => candidate.supported)) continue
        const atOff = mutatedMove(off, context, seed, k)
        const atLevelMove = mutatedMove(leveled, context, seed, k)
        expect(
          {
            setting: atLevelMove.setting,
            figure: atLevelMove.figure,
            from: atLevelMove.from,
            to: atLevelMove.to,
          },
          label,
        ).toStrictEqual({
          setting: atOff.setting,
          figure: atOff.figure,
          from: atOff.from,
          to: atOff.to,
        })
        expect(canonicalJson(atLevelMove.settings), label).toBe(
          canonicalJson(atLevel(atOff.settings, level)),
        )
      }
    },
    MANY_DRAWS_TIMEOUT_MS,
  )
})
