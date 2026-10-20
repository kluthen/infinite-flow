import { describe, expect, it } from 'vitest'

import { JAZZ_FIGURE_LEVELS, NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { ANY_KEY_AND_MODE } from '@/domain/presets/key-and-mode-restriction'
import { makePreset } from '@/domain/presets/preset-selection'
import type { SavedSettings } from '@/storage/records/setting-defaults'
import {
  decodeSettings,
  decodeV30ProfileSelectionRecord,
  settingDataVersion,
  V30_PROFILE_SELECTION_KEY,
  type SettingKey,
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

const JAZZ = builtInPreset('jazz')
const REEL = builtInPreset('reel')

/** A full set saved with Jazz selected: Jazz's ten controls and seven levels with it. */
const SAVED_JAZZ: SavedSettings = {
  ...NON_DEFAULT,
  controls: { ...NON_DEFAULT.controls, ...JAZZ.controls },
  figureLevels: JAZZ_FIGURE_LEVELS,
  presetSelection: { kind: 'preset', presetId: 'jazz' },
}

/** Intent: the records of `settings` with the value of `key` replaced by `value`. */
function withValue(settings: SavedSettings, key: SettingKey, value: unknown): unknown[] {
  return corrupt(rawRecords(settings), key, (record) => ({ ...record, value }))
}

describe('the loaded preset selection', () => {
  // @test-link [[rule_preset_load_values_win]]
  it('keeps a preset whose ten controls, seven levels and restriction all match the loaded values', () => {
    const decoded = decodeSettings(rawRecords(SAVED_JAZZ), CONTEXT)

    expect(decoded.presetSelection).toEqual({ kind: 'preset', presetId: 'jazz' })
    expect(decoded).toEqual(SAVED_JAZZ)
  })

  // @test-link [[rule_preset_load_values_win]]
  it('loads a preset whose saved held control differs as Custom based on it, the value kept', () => {
    const decoded = decodeSettings(withValue(SAVED_JAZZ, 'controls.tension', 'Build'), CONTEXT)

    expect(decoded.presetSelection).toEqual({ kind: 'custom', baseId: 'jazz' })
    expect(decoded.controls).toEqual({ ...SAVED_JAZZ.controls, tension: 'Build' })
  })

  // @test-link [[rule_preset_load_values_win]]
  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('loads a preset whose held control fell back as Custom based on it', () => {
    const decoded = decodeSettings(withValue(SAVED_JAZZ, 'controls.register', 'Nowhere'), CONTEXT)

    expect(decoded.presetSelection).toEqual({ kind: 'custom', baseId: 'jazz' })
    expect(decoded.controls).toEqual({ ...SAVED_JAZZ.controls, register: 'Middle' })
  })

  // @test-link [[rule_preset_load_values_win]]
  it('loads a preset whose saved figure level differs as Custom based on it, the level kept', () => {
    const records = withValue(SAVED_JAZZ, 'figureLevels.appoggiatura', 'stronglyFavored')
    const decoded = decodeSettings(records, CONTEXT)

    expect(decoded.presetSelection).toEqual({ kind: 'custom', baseId: 'jazz' })
    expect(decoded.figureLevels).toEqual({ ...JAZZ_FIGURE_LEVELS, appoggiatura: 'stronglyFavored' })
  })

  // @test-link [[rule_preset_load_values_win]]
  it('loads a preset whose restriction leaves out the saved key and mode as Custom based on it, never moving them', () => {
    const savedReel: SavedSettings = {
      ...SAVED_JAZZ,
      controls: {
        ...SAVED_JAZZ.controls,
        ...REEL.controls,
        tonalCenter: 'D',
        collection: 'Ionian',
      },
      figureLevels: REEL.levels,
      presetSelection: { kind: 'preset', presetId: 'reel' },
    }
    const inside: SavedSettings = {
      ...savedReel,
      controls: { ...savedReel.controls, collection: 'Dorian' },
    }

    const decoded = decodeSettings(rawRecords(savedReel), CONTEXT)

    expect(decoded.presetSelection).toEqual({ kind: 'custom', baseId: 'reel' })
    expect(decoded.controls.tonalCenter).toBe('D')
    expect(decoded.controls.collection).toBe('Ionian')
    expect(decodeSettings(rawRecords(inside), CONTEXT).presetSelection).toEqual({
      kind: 'preset',
      presetId: 'reel',
    })
  })

  // @test-link [[rule_preset_load_values_win]]
  it('loads a selected preset that no longer exists as Custom with no base, the values kept', () => {
    const records = withValue(SAVED_JAZZ, 'presetSelection', { kind: 'preset', presetId: 'gone' })
    const decoded = decodeSettings(records, CONTEXT)

    expect(decoded.presetSelection).toEqual({ kind: 'custom', baseId: null })
    expect(decoded.controls).toEqual(SAVED_JAZZ.controls)
    expect(decoded.figureLevels).toEqual(SAVED_JAZZ.figureLevels)
  })

  // @test-link [[rule_preset_load_values_win]]
  it('loads Custom based on a preset that no longer exists as Custom with no base', () => {
    const records = withValue(NON_DEFAULT, 'presetSelection', { kind: 'custom', baseId: 'gone' })

    expect(decodeSettings(records, CONTEXT).presetSelection).toEqual({
      kind: 'custom',
      baseId: null,
    })
  })

  // @test-link [[rule_preset_load_values_win]]
  it('keeps Custom with no base, and Custom based on a preset that exists, whatever the values', () => {
    const none = withValue(NON_DEFAULT, 'presetSelection', { kind: 'custom', baseId: null })

    expect(decodeSettings(none, CONTEXT).presetSelection).toEqual({ kind: 'custom', baseId: null })
    expect(decodeSettings(rawRecords(NON_DEFAULT), CONTEXT).presetSelection).toEqual({
      kind: 'custom',
      baseId: 'jazz',
    })
  })

  // @test-link [[rule_preset_load_values_win]]
  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('reads an unreadable selection as Neutral, judged by the loaded values', () => {
    const unreadable = { musicalProfile: 'Jazz', isCustom: false }
    const decoded = decodeSettings(withValue(SAVED_JAZZ, 'presetSelection', unreadable), CONTEXT)
    const neutralValues = withValue(DEFAULTS, 'presetSelection', unreadable)

    expect(decoded.presetSelection).toEqual({ kind: 'custom', baseId: 'neutral' })
    expect(decoded.controls).toEqual(SAVED_JAZZ.controls)
    expect(decodeSettings(neutralValues, CONTEXT).presetSelection).toEqual({
      kind: 'preset',
      presetId: 'neutral',
    })
  })

  // @test-link [[rule_preset_load_values_win]]
  it('judges the selection against the presets the load is given', () => {
    const mine = makePreset({
      id: 'player-1',
      name: 'Mine',
      controls: JAZZ.controls,
      levels: NEUTRAL_FIGURE_LEVELS,
      restriction: ANY_KEY_AND_MODE,
      kind: 'player',
    })
    const saved: SavedSettings = {
      ...SAVED_JAZZ,
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      presetSelection: { kind: 'preset', presetId: 'player-1' },
    }

    const withMine = decodeSettings(rawRecords(saved), {
      ...CONTEXT,
      presets: [...BUILT_IN_PRESETS, mine],
    })

    expect(withMine.presetSelection).toEqual({ kind: 'preset', presetId: 'player-1' })
    expect(decodeSettings(rawRecords(saved), CONTEXT).presetSelection).toEqual({
      kind: 'custom',
      baseId: null,
    })
  })
})

describe('the data version of each setting record', () => {
  // @test-link [[module_settings_upgrade_step]]
  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('reads the preset selection and the levels at data version 3, every other setting at 1', () => {
    expect(settingDataVersion('presetSelection')).toBe(3)
    expect(settingDataVersion('figureLevels.chromaticEnclosure')).toBe(3)
    expect(settingDataVersion('controls.tension')).toBe(1)
    expect(settingDataVersion('theme')).toBe(1)
    expect(decodeSettings(rawRecords(NON_DEFAULT), CONTEXT)).toEqual(NON_DEFAULT)
  })

  // @test-link [[module_settings_upgrade_step]]
  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('reads a preset selection or level record at data version 1 as unreadable', () => {
    for (const key of ['presetSelection', 'figureLevels.passingTone'] as const) {
      const records = corrupt(rawRecords(NON_DEFAULT), key, (record) => ({
        ...record,
        dataVersion: 1,
      }))
      const decoded = decodeSettings(records, CONTEXT)

      if (key === 'presetSelection') {
        expect(decoded.presetSelection).toEqual({ kind: 'custom', baseId: 'neutral' })
      } else {
        expect(decoded.figureLevels.passingTone).toBe(NEUTRAL_FIGURE_LEVELS.passingTone)
      }
      expect(decoded.controls).toEqual(NON_DEFAULT.controls)
    }
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('leaves a preset selection or level record at data version 4 unread, as newer', () => {
    /** Intent: a copy of a record as a newer app wrote it. */
    const newer = (record: RawRecord) => ({ ...record, dataVersion: 4 })
    const records = corrupt(
      corrupt(rawRecords(NON_DEFAULT), 'presetSelection', newer),
      'figureLevels.neighborTone',
      newer,
    )
    const decoded = decodeSettings(records, CONTEXT)

    expect(decoded.presetSelection).toEqual({ kind: 'custom', baseId: 'neutral' })
    expect(decoded.figureLevels).toEqual({
      ...NON_DEFAULT.figureLevels,
      neighborTone: NEUTRAL_FIGURE_LEVELS.neighborTone,
    })
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('keeps reading the controls at data version 1 and leaves one at 3 unread', () => {
    const records = corrupt(rawRecords(NON_DEFAULT), 'controls.tension', (record) => ({
      ...record,
      dataVersion: 3,
    }))
    const decoded = decodeSettings(records, CONTEXT)

    expect(decoded.controls).toEqual({
      ...NON_DEFAULT.controls,
      tension: DEFAULTS.controls.tension,
    })
    expect(decoded.figureLevels).toEqual(NON_DEFAULT.figureLevels)
  })

  // @test-link [[module_settings_upgrade_step]]
  it("never reads v3.0's selection record into the loaded settings", () => {
    const v30 = {
      key: V30_PROFILE_SELECTION_KEY,
      dataVersion: 1,
      appVersion: APP_VERSION,
      value: { musicalProfile: 'Jazz', isCustom: false },
    }

    expect(decodeSettings([v30], CONTEXT)).toEqual(DEFAULTS)
  })
})

/** Intent: v3.0's stored selection record holding `value`. */
function v30Record(value: unknown): RawRecord {
  return { key: V30_PROFILE_SELECTION_KEY, dataVersion: 1, appVersion: '3.0.0', value }
}

describe("v3.0's selection record reader", () => {
  // @test-link [[module_settings_upgrade_step]]
  // @test-link [[rule_saved_profile_becomes_preset]]
  it('reads a data version 1 record of Neutral, Jazz or a customized profile', () => {
    for (const selection of [
      { musicalProfile: 'Neutral', isCustom: false },
      { musicalProfile: 'Jazz', isCustom: false },
      { musicalProfile: 'Jazz', isCustom: true },
    ]) {
      expect(decodeV30ProfileSelectionRecord(v30Record(selection))).toEqual(selection)
    }
  })

  // @test-link [[module_settings_upgrade_step]]
  it('reads anything else as nothing, never throwing', () => {
    const jazz = { musicalProfile: 'Jazz', isCustom: false }
    const unreadable: unknown[] = [
      undefined,
      null,
      'profileSelection',
      [],
      { ...v30Record(jazz), key: 'presetSelection' },
      { ...v30Record(jazz), extra: true },
      { ...v30Record(jazz), dataVersion: 2 },
      { ...v30Record(jazz), dataVersion: 0 },
      { ...v30Record(jazz), appVersion: '' },
      v30Record({ musicalProfile: 'Blues', isCustom: false }),
      v30Record({ musicalProfile: 'Jazz' }),
      v30Record({ ...jazz, extra: 1 }),
      v30Record('Jazz'),
    ]

    for (const stored of unreadable) {
      expect(decodeV30ProfileSelectionRecord(stored), JSON.stringify(stored)).toBeNull()
    }
  })
})
