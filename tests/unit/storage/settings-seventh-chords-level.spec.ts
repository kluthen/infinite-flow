import { describe, expect, it } from 'vitest'

import {
  CHORD_FAMILY_LEVEL_IDS,
  OFF_CHORD_FAMILIES,
  type ChordFamilyLevel,
} from '@/domain/chords/chord-families'
import { JAZZ_FIGURE_LEVELS, NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { ANY_KEY_AND_MODE } from '@/domain/presets/key-and-mode-restriction'
import { makePreset } from '@/domain/presets/preset-selection'
import { createMulberry32 } from '@/domain/random/prng'
import type { SavedSettings } from '@/storage/records/setting-defaults'
import {
  decodeSettings,
  encodeSettingRecord,
  SETTING_KEYS,
  settingDataVersion,
} from '@/storage/records/settings-record'

import {
  APP_VERSION,
  CONTEXT,
  corrupt,
  DEFAULTS,
  NON_DEFAULT,
  rawRecords,
  type RawRecord,
} from './settings-record-fixtures'

const KEY = 'chordFamilies.seventh-chords' as const

const JAZZ = builtInPreset('jazz')

/** A full set saved with Jazz selected: Jazz's ten controls, seven levels and level with it. */
const SAVED_JAZZ: SavedSettings = {
  ...NON_DEFAULT,
  controls: { ...NON_DEFAULT.controls, ...JAZZ.controls },
  figureLevels: JAZZ_FIGURE_LEVELS,
  chordFamilies: JAZZ.chordFamilies,
  presetSelection: { kind: 'preset', presetId: 'jazz' },
}

/** Intent: NON_DEFAULT with the Seventh chords level at `level`. */
function atLevel(level: ChordFamilyLevel): SavedSettings {
  return { ...NON_DEFAULT, chordFamilies: { 'seventh-chords': level } }
}

/** Intent: the records of `settings` with the level's record replaced by what `change` makes. */
function withLevelRecord(settings: SavedSettings, change: (record: RawRecord) => unknown) {
  return corrupt(rawRecords(settings), KEY, change)
}

/** Stored level values no version of the app writes: each must load as Off. */
const UNKNOWN_LEVELS: readonly unknown[] = [
  'Off',
  'Sometimes',
  'Mostly',
  'often',
  'asToday',
  'favored ',
  '',
  null,
  7,
  true,
  [],
  {},
  { 'seventh-chords': 'favored' },
]

/** Damage to the level record's envelope; each makes the level unreadable. */
const ENVELOPE_DAMAGE: readonly ((record: RawRecord) => unknown)[] = [
  (record) => ({ key: record.key, dataVersion: record.dataVersion, appVersion: record.appVersion }),
  (record) => ({ ...record, dataVersion: 0 }),
  (record) => ({ ...record, dataVersion: 2 }),
  (record) => ({ ...record, dataVersion: '1' }),
  (record) => ({ ...record, appVersion: 3 }),
  (record) => ({ ...record, written: 'extra field' }),
  () => null,
]

describe('the Seventh chords level record', () => {
  // @test-link [[req_seventh_chords_level]]
  // @test-link [[rule_settings_saved_on_change]]
  it('is one record, chordFamilies.seventh-chords, at data version 1, among the settings', () => {
    expect(SETTING_KEYS).toContain(KEY)
    expect(settingDataVersion(KEY)).toBe(1)
    expect(encodeSettingRecord(KEY, 'stronglyFavored', APP_VERSION)).toEqual({
      key: KEY,
      dataVersion: 1,
      appVersion: APP_VERSION,
      value: 'stronglyFavored',
    })
  })

  // @test-link [[req_seventh_chords_level]]
  it('round-trips at each of its four values, every other setting with it', () => {
    for (const level of CHORD_FAMILY_LEVEL_IDS) {
      const saved = atLevel(level)
      const levelRecord = rawRecords(saved).find((record) => record.key === KEY)

      expect(levelRecord?.value, level).toBe(level)
      expect(decodeSettings(rawRecords(saved), CONTEXT), level).toEqual(saved)
    }
  })

  // @test-link [[req_seventh_chords_level]]
  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('loads Off when no record holds it, as in every store written before v3.3', () => {
    const before = rawRecords(NON_DEFAULT).filter((record) => record.key !== KEY)

    expect(decodeSettings(before, CONTEXT)).toEqual({
      ...NON_DEFAULT,
      chordFamilies: OFF_CHORD_FAMILIES,
    })
    expect(DEFAULTS.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
    expect(decodeSettings([], CONTEXT).chordFamilies).toEqual(OFF_CHORD_FAMILIES)
  })

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('loads a corrupt or unknown stored level as Off, every other setting kept (seeded property)', () => {
    const random = createMulberry32(0x7e7e5701)
    const next = random.nextFloat
    /** Intent: one value of `values`, drawn from `next`. */
    const pick = <T>(values: readonly T[]): T => values[Math.floor(next() * values.length)]!

    for (let round = 0; round < 300; round += 1) {
      const saved = atLevel(pick(CHORD_FAMILY_LEVEL_IDS))
      const damage =
        next() < 0.6
          ? (record: RawRecord) => ({ ...record, value: pick(UNKNOWN_LEVELS) })
          : pick(ENVELOPE_DAMAGE)

      const decoded = decodeSettings(withLevelRecord(saved, damage), CONTEXT)

      expect(decoded, `round ${round}`).toEqual({ ...saved, chordFamilies: OFF_CHORD_FAMILIES })
    }
  })

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('loads Off for a level saved twice, without touching the rest', () => {
    const twice = [
      ...rawRecords(atLevel('favored')),
      encodeSettingRecord(KEY, 'sometimes', APP_VERSION),
    ]

    expect(decodeSettings(twice, CONTEXT)).toEqual({
      ...NON_DEFAULT,
      chordFamilies: OFF_CHORD_FAMILIES,
    })
  })
})

describe('the preset selection judged with the level', () => {
  // @test-link [[rule_preset_load_values_win]]
  it('keeps a built-in selected while the saved level is its own', () => {
    const decoded = decodeSettings(rawRecords(SAVED_JAZZ), CONTEXT)

    expect(JAZZ.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
    expect(decoded.presetSelection).toEqual({ kind: 'preset', presetId: 'jazz' })
  })

  // @test-link [[rule_preset_load_values_win]]
  // @test-link [[req_seventh_chords_level]]
  it("loads a saved level differing from the selected built-in's as Custom based on it, the level kept", () => {
    for (const level of CHORD_FAMILY_LEVEL_IDS.filter((id) => id !== 'off')) {
      const saved: SavedSettings = { ...SAVED_JAZZ, chordFamilies: { 'seventh-chords': level } }
      const decoded = decodeSettings(rawRecords(saved), CONTEXT)

      expect(decoded.presetSelection, level).toEqual({ kind: 'custom', baseId: 'jazz' })
      expect(decoded.chordFamilies, level).toEqual({ 'seventh-chords': level })
      expect(decoded.controls, level).toEqual(SAVED_JAZZ.controls)
    }
  })

  // @test-link [[rule_preset_load_values_win]]
  // @test-link [[req_seventh_chords_level]]
  it('keeps a player preset holding Always selected with Always saved, and makes it Custom at another level', () => {
    const mostly = makePreset({
      id: 'player-mostly',
      name: 'Rich',
      controls: JAZZ.controls,
      levels: NEUTRAL_FIGURE_LEVELS,
      chordFamilies: { 'seventh-chords': 'stronglyFavored' },
      restriction: ANY_KEY_AND_MODE,
      kind: 'player',
    })
    const context = { ...CONTEXT, presets: [...BUILT_IN_PRESETS, mostly] }
    const saved: SavedSettings = {
      ...SAVED_JAZZ,
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      chordFamilies: { 'seventh-chords': 'stronglyFavored' },
      presetSelection: { kind: 'preset', presetId: 'player-mostly' },
    }
    const atOff = withLevelRecord(saved, (record) => ({ ...record, value: 'off' }))

    expect(decodeSettings(rawRecords(saved), context)).toEqual(saved)
    expect(decodeSettings(atOff, context).presetSelection).toEqual({
      kind: 'custom',
      baseId: 'player-mostly',
    })
  })
})
