import { describe, expect, it } from 'vitest'

import { resolveGeneratedControls } from '@/domain/controls/generated-note-density'
import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  INSTRUMENT_PROFILE_IDS,
  LEAPINESS_VALUES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TEMPO_VALUES,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import { FIGURE_IDS, FIGURE_LEVEL_IDS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { allowsKeyAndMode } from '@/domain/presets/key-and-mode-restriction'
import {
  findPreset,
  PRESET_HELD_CONTROL_KEYS,
  type PresetSelection,
} from '@/domain/presets/preset-selection'
import { createMulberry32 } from '@/domain/random/prng'
import type { SavedSettings } from '@/storage/records/setting-defaults'
import {
  decodeSettings,
  encodeSettingRecord,
  encodeSettings,
  MY_INSTRUMENT_ID,
  PRESET_SETTINGS_DATA_VERSION,
  SETTING_KEYS,
  settingDataVersion,
  SETTINGS_DATA_VERSION,
  type SettingKey,
} from '@/storage/records/settings-record'

import {
  APP_VERSION,
  CONTEXT,
  corrupt,
  DEFAULTS,
  NON_DEFAULT,
  rawRecords,
  settingAt,
  type RawRecord,
} from './settings-record-fixtures'

/** Every record key the codec writes: one per setting, and nothing else. */
const EXPECTED_KEYS: readonly SettingKey[] = [
  'controls.tempo',
  'controls.tonalCenter',
  'controls.collection',
  'controls.harmonicMotion',
  'controls.tension',
  'controls.noteDensity',
  'controls.rhythmicVariety',
  'controls.syncopation',
  'controls.silenceDensity',
  'controls.contour',
  'controls.register',
  'controls.leapiness',
  'controls.arpeggioChaos',
  'controls.instrumentProfileId',
  'figureLevels.passingTone',
  'figureLevels.accentedPassingTone',
  'figureLevels.neighborTone',
  'figureLevels.appoggiatura',
  'figureLevels.diatonicEnclosure',
  'figureLevels.chromaticApproach',
  'figureLevels.chromaticEnclosure',
  'presetSelection',
  'theme',
  'mix.clickOn',
  'mix.clickVolume',
  'mix.backingOn',
  'mix.backingVolume',
  'sessionOptions.varySettings',
  'sessionOptions.tensionAcrossPhrases',
  'sessionOptions.risingTempo',
  'review.format',
  'review.backingTrack',
  'review.playedNotesShown',
  'keepPlayedNotes',
]

/**
 * Intent: what `other` decodes to when only the record of `key` in NON_DEFAULT is unreadable: its
 * default for `key`, the saved value for every other setting. NON_DEFAULT's values are not
 * Neutral's, so a fallen-back selection (Neutral) loads as Custom based on Neutral.
 */
function afterOneFallback(key: SettingKey, other: SettingKey): unknown {
  if (other !== key) return settingAt(NON_DEFAULT, other)
  if (key === 'presetSelection') return { kind: 'custom', baseId: 'neutral' }
  return settingAt(DEFAULTS, other)
}

/**
 * Intent: the selection a load gives for `selection` over the loaded settings, the values winning:
 * a built-in whose controls, levels or restriction the loaded values do not match loads as
 * Custom based on it.
 */
function loadedSelection(selection: PresetSelection, loaded: SavedSettings): PresetSelection {
  if (selection.kind === 'custom') return selection
  const preset = findPreset(BUILT_IN_PRESETS, selection.presetId)!
  const { controls, figureLevels } = loaded
  const own =
    PRESET_HELD_CONTROL_KEYS.every((key) => controls[key] === preset.controls[key]) &&
    FIGURE_IDS.every((figure) => figureLevels[figure] === preset.levels[figure]) &&
    allowsKeyAndMode(preset.restriction, controls.tonalCenter, controls.collection)
  return own ? selection : { kind: 'custom', baseId: preset.id }
}

/** Intent: whether a record key is one of the seven figure levels'. */
function isLevelKey(key: SettingKey): boolean {
  return key.startsWith('figureLevels.')
}

const BOOLEAN_KEYS = new Set<SettingKey>([
  'mix.clickOn',
  'mix.backingOn',
  'sessionOptions.varySettings',
  'sessionOptions.tensionAcrossPhrases',
  'sessionOptions.risingTempo',
  'review.backingTrack',
  'review.playedNotesShown',
  'keepPlayedNotes',
])

const CATALOGS: Partial<Record<SettingKey, readonly (string | number)[]>> = {
  'controls.tempo': TEMPO_VALUES,
  'controls.tonalCenter': PITCH_CLASSES,
  'controls.collection': COLLECTIONS,
  'controls.harmonicMotion': HARMONIC_MOTIONS,
  'controls.tension': TENSION_ARCS,
  'controls.noteDensity': NOTE_DENSITIES,
  'controls.rhythmicVariety': RHYTHMIC_VARIETIES,
  'controls.syncopation': SYNCOPATIONS,
  'controls.silenceDensity': SILENCE_DENSITIES,
  'controls.contour': CONTOURS,
  'controls.register': REGISTER_CHOICES,
  'controls.leapiness': LEAPINESS_VALUES,
  'controls.arpeggioChaos': ARPEGGIO_CHAOS_VALUES,
  'controls.instrumentProfileId': INSTRUMENT_PROFILE_IDS,
  theme: ['System', 'Light', 'Dark'],
  'review.format': ['musicxml', 'midi'],
}

const WRONG_TYPES: readonly unknown[] = [null, undefined, [], {}, true, 7, 'text']

/**
 * Intent: the invalid values of one setting: unknown values, wrong types and out-of-range numbers,
 * each of which the codec must read as that setting's default.
 */
function invalidValues(key: SettingKey): readonly unknown[] {
  if (BOOLEAN_KEYS.has(key)) return ['true', 1, 0, null, {}, []]
  if (key === 'controls.tempo') return [50, 250, 95, 90.5, -90, Number.NaN, Infinity, '90', null]
  if (key === 'mix.clickVolume') return [0, 0.1, -0.1, 1.01, Number.NaN, Infinity, '0.5', null]
  if (key === 'mix.backingVolume') return [-0.01, 1.5, Number.NaN, -Infinity, '0.5', true]
  if (key === 'presetSelection') {
    return [
      { kind: 'preset' },
      { kind: 'preset', presetId: '' },
      { kind: 'preset', presetId: 7 },
      { kind: 'preset', presetId: 'jazz', extra: 1 },
      { kind: 'preset', baseId: 'jazz' },
      { kind: 'custom' },
      { kind: 'custom', baseId: '' },
      { kind: 'custom', baseId: 7 },
      { kind: 'custom', baseId: null, presetId: 'jazz' },
      { kind: 'Custom', baseId: null },
      { musicalProfile: 'Jazz', isCustom: true },
      'jazz',
      null,
      [],
    ]
  }
  if (isLevelKey(key)) {
    return ['Off', 'favoured', 'asToday ', 'none', ...WRONG_TYPES.filter((v) => v !== 'text')]
  }
  const unknown = ['Unknown', '', 'quarter', 'Sixteenth ', 'C♯']
  const extra = key === 'controls.instrumentProfileId' ? [MY_INSTRUMENT_ID] : []
  return [...unknown, ...extra, ...WRONG_TYPES.filter((value) => typeof value !== 'string')]
}

/** Intent: a copy of `record` without its `field`. */
function without(record: RawRecord, field: string): RawRecord {
  const copy = { ...record }
  delete copy[field]
  return copy
}

/** Damage to a record's envelope rather than its value; each makes the setting unreadable. */
const ENVELOPE_DAMAGE: readonly ((record: RawRecord) => unknown)[] = [
  (record) => without(record, 'value'),
  (record) => ({ ...record, dataVersion: 0 }),
  (record) => ({ ...record, dataVersion: 1.5 }),
  (record) => ({ ...record, dataVersion: '1' }),
  (record) => without(record, 'dataVersion'),
  (record) => without(record, 'appVersion'),
  (record) => ({ ...record, appVersion: 3 }),
  (record) => ({ ...record, written: 'extra field' }),
]

/** Intent: a random valid value for one setting, drawn from `next`. */
function randomValue(key: SettingKey, next: () => number): unknown {
  /** Intent: one value of `values`, drawn from `next`. */
  const pick = <T>(values: readonly T[]): T => values[Math.floor(next() * values.length)]!
  const catalog = CATALOGS[key]
  if (catalog !== undefined) return pick(catalog)
  if (BOOLEAN_KEYS.has(key)) return next() < 0.5
  if (key === 'mix.clickVolume') return Math.round((0.2 + next() * 0.8) * 100) / 100
  if (key === 'mix.backingVolume') return Math.round(next() * 100) / 100
  if (isLevelKey(key)) return pick(FIGURE_LEVEL_IDS)
  if (key === 'presetSelection') {
    const id = pick(BUILT_IN_PRESETS).id
    return pick<PresetSelection>([
      { kind: 'preset', presetId: id },
      { kind: 'custom', baseId: id },
      { kind: 'custom', baseId: null },
    ])
  }
  throw new Error(`no random value for ${key}`)
}

/**
 * Intent: a random full set of valid settings, built through the codec's own key table. A preset
 * selected holds its own ten controls and seven levels, and a written key and mode it allows, as
 * the app saves it.
 */
function randomSettings(next: () => number): SavedSettings {
  const grouped: Record<string, unknown> = {}
  for (const key of EXPECTED_KEYS) {
    const [group, field] = key.split('.') as [string, string | undefined]
    const value = randomValue(key, next)
    if (field === undefined) grouped[group] = value
    else grouped[group] = { ...(grouped[group] as object), [field]: value }
  }
  const settings = grouped as unknown as SavedSettings
  const selection = settings.presetSelection
  if (selection.kind === 'custom') return settings
  const preset = findPreset(BUILT_IN_PRESETS, selection.presetId)!
  const { keys, modes } = preset.restriction
  const { tonalCenter, collection } = settings.controls
  return {
    ...settings,
    controls: {
      ...settings.controls,
      ...preset.controls,
      tonalCenter: keys === 'any' || keys.includes(tonalCenter) ? tonalCenter : keys[0],
      collection: modes === 'any' || modes.includes(collection) ? collection : modes[0],
    },
    figureLevels: preset.levels,
  }
}

describe('settings record keys', () => {
  // @test-link [[rule_settings_saved_on_change]]
  it('writes one record per setting, every one of them, with its data and app version', () => {
    const records = encodeSettings(NON_DEFAULT, APP_VERSION)

    expect(SETTING_KEYS).toEqual(EXPECTED_KEYS)
    expect(records.map((record) => record.key)).toEqual(EXPECTED_KEYS)
    for (const record of records) {
      const introducedAtVersion3 = record.key === 'presetSelection' || isLevelKey(record.key)
      expect(record).toEqual({
        key: record.key,
        dataVersion: introducedAtVersion3 ? 3 : 1,
        appVersion: APP_VERSION,
        value: settingAt(NON_DEFAULT, record.key),
      })
    }
    expect(SETTINGS_DATA_VERSION).toBe(1)
    expect(PRESET_SETTINGS_DATA_VERSION).toBe(3)
  })

  // @test-link [[rule_settings_saved_on_change]]
  it('encodes one setting on its own exactly as the full set encodes it', () => {
    const full = encodeSettings(NON_DEFAULT, APP_VERSION)

    expect(encodeSettingRecord('controls.tempo', 150, APP_VERSION)).toEqual(full[0])
    expect(encodeSettingRecord('mix.clickVolume', 0.35, APP_VERSION)).toEqual(
      full.find((record) => record.key === 'mix.clickVolume'),
    )
    expect(encodeSettingRecord('presetSelection', { kind: 'custom', baseId: 'jazz' }, '9')).toEqual(
      {
        key: 'presetSelection',
        dataVersion: 3,
        appVersion: '9',
        value: { kind: 'custom', baseId: 'jazz' },
      },
    )
    expect(encodeSettingRecord('figureLevels.appoggiatura', 'favored', '9')).toEqual({
      key: 'figureLevels.appoggiatura',
      dataVersion: 3,
      appVersion: '9',
      value: 'favored',
    })
  })

  // @test-link [[rule_settings_saved_on_change]]
  it('refuses to write a record without an app version, which would be read as damaged', () => {
    expect(() => encodeSettingRecord('theme', 'Dark', '')).toThrow(/app version/)
  })

  // @test-link [[rule_saved_setting_is_players_choice]]
  it('has no record for the tempo a Rising-tempo session reached, and reads none back', () => {
    expect(SETTING_KEYS.filter((key) => /reach/i.test(key))).toEqual([])

    const reached = {
      key: 'sessionOptions.reachedTempo',
      dataVersion: 1,
      appVersion: APP_VERSION,
      value: 180,
    }
    const decoded = decodeSettings([...rawRecords(NON_DEFAULT), reached], CONTEXT)

    expect(decoded).toEqual(NON_DEFAULT)
    expect(Object.keys(decoded.sessionOptions).sort()).toEqual([
      'risingTempo',
      'tensionAcrossPhrases',
      'varySettings',
    ])
    expect(decoded.controls.tempo).toBe(150)
  })
})

describe('decodeSettings', () => {
  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('starts from every default when nothing is saved', () => {
    expect(decodeSettings([], CONTEXT)).toEqual(DEFAULTS)
  })

  // @test-link [[rule_settings_saved_on_change]]
  it('gives back every saved setting, the fixture differing from every default', () => {
    for (const key of EXPECTED_KEYS) {
      expect(settingAt(NON_DEFAULT, key), key).not.toEqual(settingAt(DEFAULTS, key))
    }
    expect(decodeSettings(rawRecords(NON_DEFAULT), CONTEXT)).toEqual(NON_DEFAULT)
  })

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('builds the decoded controls through the strict control builder, frozen', () => {
    const decoded = decodeSettings(rawRecords(NON_DEFAULT), CONTEXT)

    expect(Object.isFrozen(decoded.controls)).toBe(true)
    expect(Object.isFrozen(decoded)).toBe(true)
  })

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('reads each invalid value of each setting as that setting default, keeping the others', () => {
    for (const key of EXPECTED_KEYS) {
      for (const invalid of invalidValues(key)) {
        const records = corrupt(rawRecords(NON_DEFAULT), key, (record) => ({
          ...record,
          value: invalid,
        }))
        const decoded = decodeSettings(records, CONTEXT)

        for (const other of EXPECTED_KEYS) {
          expect(settingAt(decoded, other), `${key}=${String(invalid)}: ${other}`).toEqual(
            afterOneFallback(key, other),
          )
        }
      }
    }
  })

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('reads a random corruption of random settings as each corrupted setting default only', () => {
    const random = createMulberry32(0x5e771265)
    const next = random.nextFloat

    for (let round = 0; round < 400; round += 1) {
      const saved = randomSettings(next)
      const corrupted = new Set(EXPECTED_KEYS.filter(() => next() < 0.25))
      let records: unknown[] = rawRecords(saved)
      for (const key of corrupted) {
        const values = invalidValues(key)
        const damage =
          next() < 0.7
            ? (record: RawRecord) => ({
                ...record,
                value: values[Math.floor(next() * values.length)],
              })
            : ENVELOPE_DAMAGE[Math.floor(next() * ENVELOPE_DAMAGE.length)]!
        records = corrupt(records, key, damage)
      }

      const decoded = decodeSettings(records, CONTEXT)

      for (const key of EXPECTED_KEYS) {
        const expected = corrupted.has(key) ? DEFAULTS : saved
        const value = settingAt(expected, key)
        const loaded =
          key === 'presetSelection' ? loadedSelection(value as PresetSelection, decoded) : value
        expect(settingAt(decoded, key), `round ${round}: ${key}`).toEqual(loaded)
      }
    }
  })

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('reads a record that is not a record, or a setting saved twice, without touching the rest', () => {
    const records = [
      ...rawRecords(NON_DEFAULT),
      null,
      'theme',
      42,
      { key: 'theme', dataVersion: 1, appVersion: APP_VERSION, value: 'Light' },
    ]
    const decoded = decodeSettings(records, CONTEXT)

    expect(decoded.theme).toBe(DEFAULTS.theme)
    expect({ ...decoded, theme: NON_DEFAULT.theme }).toEqual(NON_DEFAULT)
  })

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('reads a saved selection of my instrument as the default instrument while it does not load', () => {
    const records = corrupt(rawRecords(NON_DEFAULT), 'controls.instrumentProfileId', (record) => ({
      ...record,
      value: MY_INSTRUMENT_ID,
    }))
    const decoded = decodeSettings(records, CONTEXT)

    expect(decoded.controls.instrumentProfileId).toBe(DEFAULTS.controls.instrumentProfileId)
    expect(decoded.controls.tempo).toBe(NON_DEFAULT.controls.tempo)
  })

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('keeps a saved selection of my instrument when my instrument loads', () => {
    const records = corrupt(rawRecords(NON_DEFAULT), 'controls.instrumentProfileId', (record) => ({
      ...record,
      value: MY_INSTRUMENT_ID,
    }))
    const decoded = decodeSettings(records, { ...CONTEXT, myInstrumentLoaded: true })

    expect(decoded.controls.instrumentProfileId).toBe(MY_INSTRUMENT_ID)
  })

  // @test-link [[rule_played_notes_kept_only_after_opt_in]]
  it('keeps my played notes off unless the player turned it on', () => {
    expect(decodeSettings([], CONTEXT).keepPlayedNotes).toBe(false)
    const off = corrupt(rawRecords(NON_DEFAULT), 'keepPlayedNotes', (record) => ({
      ...record,
      value: 'on',
    }))
    expect(decodeSettings(off, CONTEXT).keepPlayedNotes).toBe(false)
    expect(decodeSettings(rawRecords(NON_DEFAULT), CONTEXT).keepPlayedNotes).toBe(true)
  })
})

describe('a record written by a newer version', () => {
  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('is left unread for that setting only', () => {
    for (const key of EXPECTED_KEYS) {
      const records = corrupt(rawRecords(NON_DEFAULT), key, (record) => ({
        ...record,
        dataVersion: settingDataVersion(key) + 1,
      }))
      const decoded = decodeSettings(records, CONTEXT)

      for (const other of EXPECTED_KEYS) {
        expect(settingAt(decoded, other), `${key} newer: ${other}`).toEqual(
          afterOneFallback(key, other),
        )
      }
    }
  })
})

describe('the chosen note density', () => {
  // @test-link [[rule_saved_setting_is_players_choice]]
  it('round-trips a chosen Sixteenth as Sixteenth, though a narrow window generates Eighth', () => {
    const chosen: SavedSettings = {
      ...NON_DEFAULT,
      controls: { ...NON_DEFAULT.controls, noteDensity: 'Sixteenth' },
    }
    const generated = resolveGeneratedControls(chosen.controls, {
      belowTabletLandscape: true,
      sessionSteppedDown: false,
    })
    expect(generated.noteDensity).toBe('Eighth')

    const records = encodeSettings(chosen, APP_VERSION)
    const density = records.find((record) => record.key === 'controls.noteDensity')
    expect(density?.value).toBe('Sixteenth')
    expect(decodeSettings(records, CONTEXT).controls.noteDensity).toBe('Sixteenth')
  })
})
