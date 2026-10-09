import { describe, expect, it } from 'vitest'

import { readAudioMixDesign, type AudioMixDesign } from '@/audio/audio-mix'
import { resolveGeneratedControls } from '@/domain/controls/generated-note-density'
import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  INSTRUMENT_PROFILE_IDS,
  LEAPINESS_VALUES,
  MUSICAL_PROFILES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TEMPO_VALUES,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import { createMulberry32 } from '@/domain/random/prng'
import { defaultSettings, type SavedSettings } from '@/storage/records/setting-defaults'
import {
  decodeSettings,
  encodeSettingRecord,
  encodeSettings,
  MY_INSTRUMENT_ID,
  SETTING_KEYS,
  SETTINGS_DATA_VERSION,
  type SettingKey,
  type SettingsDecodeContext,
} from '@/storage/records/settings-record'

/** The mix design as the stylesheet's `--mix-*` tokens give it today. */
const MIX_DESIGN: AudioMixDesign = readAudioMixDesign({
  getPropertyValue: (name: string) =>
    ({
      '--mix-click-volume-default': '0.8',
      '--mix-backing-volume-default': '0.8',
      '--mix-click-volume-min': '0.2',
      '--mix-backing-volume-min': '0',
      '--mix-volume-max': '1',
    })[name] ?? '',
})

const CONTEXT: SettingsDecodeContext = { mixDesign: MIX_DESIGN, myInstrumentLoaded: false }
const APP_VERSION = '3.0.0-test'
const DEFAULTS = defaultSettings(MIX_DESIGN.defaults)

/** A full set of settings in which every value differs from that setting's default. */
const NON_DEFAULT: SavedSettings = {
  controls: {
    tempo: 150,
    tonalCenter: 'F#',
    collection: 'Dorian',
    harmonicMotion: 'Active diatonic',
    tension: 'Edge',
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Heavily varied',
    syncopation: 'Active displacement',
    silenceDensity: 'Breath-heavy',
    contour: 'Falling',
    register: 'High',
    leapiness: 'Angular',
    arpeggioChaos: 'Chaotic',
    instrumentProfileId: 'eb-alto',
  },
  profileSelection: { musicalProfile: 'Jazz', isCustom: true },
  theme: 'Dark',
  mix: { clickOn: false, clickVolume: 0.35, backingOn: false, backingVolume: 0.15 },
  sessionOptions: { varySettings: true, tensionAcrossPhrases: true, risingTempo: true },
  review: { format: 'midi', backingTrack: true, playedNotesShown: true },
  keepPlayedNotes: true,
}

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
  'profileSelection',
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

/** Intent: read one setting's value out of a full set, by its record key. */
function settingAt(settings: SavedSettings, key: SettingKey): unknown {
  const [group, field] = key.split('.') as [string, string | undefined]
  const top = (settings as unknown as Record<string, unknown>)[group]
  return field === undefined ? top : (top as Record<string, unknown>)[field]
}

type RawRecord = Record<string, unknown>

/** Intent: the encoded records of a full set, as plain mutable copies a test may corrupt. */
function rawRecords(settings: SavedSettings): RawRecord[] {
  return encodeSettings(settings, APP_VERSION).map((record) => ({ ...record }))
}

/** Intent: replace the record of `key` in `records` with what `change` makes of a copy of it. */
function corrupt(
  records: readonly unknown[],
  key: SettingKey,
  change: (record: RawRecord) => unknown,
): unknown[] {
  return records.map((record) =>
    (record as RawRecord).key === key ? change({ ...(record as RawRecord) }) : record,
  )
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
  if (key === 'profileSelection') {
    return [
      { musicalProfile: 'Blues', isCustom: false },
      { musicalProfile: 'Jazz' },
      { musicalProfile: 'Jazz', isCustom: 'yes' },
      { musicalProfile: 'Jazz', isCustom: false, extra: 1 },
      'Jazz',
      null,
      [],
    ]
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
  if (key === 'profileSelection') {
    return { musicalProfile: pick(MUSICAL_PROFILES), isCustom: next() < 0.5 }
  }
  throw new Error(`no random value for ${key}`)
}

/** Intent: a random full set of valid settings, built through the codec's own key table. */
function randomSettings(next: () => number): SavedSettings {
  const grouped: Record<string, unknown> = {}
  for (const key of EXPECTED_KEYS) {
    const [group, field] = key.split('.') as [string, string | undefined]
    const value = randomValue(key, next)
    if (field === undefined) grouped[group] = value
    else grouped[group] = { ...(grouped[group] as object), [field]: value }
  }
  return grouped as unknown as SavedSettings
}

describe('settings record keys', () => {
  // @test-link [[rule_settings_saved_on_change]]
  it('writes one record per setting, every one of them, with its data and app version', () => {
    const records = encodeSettings(NON_DEFAULT, APP_VERSION)

    expect(SETTING_KEYS).toEqual(EXPECTED_KEYS)
    expect(records.map((record) => record.key)).toEqual(EXPECTED_KEYS)
    for (const record of records) {
      expect(record).toEqual({
        key: record.key,
        dataVersion: SETTINGS_DATA_VERSION,
        appVersion: APP_VERSION,
        value: settingAt(NON_DEFAULT, record.key),
      })
    }
    expect(SETTINGS_DATA_VERSION).toBe(1)
  })

  // @test-link [[rule_settings_saved_on_change]]
  it('encodes one setting on its own exactly as the full set encodes it', () => {
    const full = encodeSettings(NON_DEFAULT, APP_VERSION)

    expect(encodeSettingRecord('controls.tempo', 150, APP_VERSION)).toEqual(full[0])
    expect(encodeSettingRecord('mix.clickVolume', 0.35, APP_VERSION)).toEqual(
      full.find((record) => record.key === 'mix.clickVolume'),
    )
    expect(
      encodeSettingRecord('profileSelection', { musicalProfile: 'Jazz', isCustom: true }, '9'),
    ).toEqual({
      key: 'profileSelection',
      dataVersion: 1,
      appVersion: '9',
      value: { musicalProfile: 'Jazz', isCustom: true },
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
          const expected = other === key ? DEFAULTS : NON_DEFAULT
          expect(settingAt(decoded, other), `${key}=${String(invalid)}: ${other}`).toEqual(
            settingAt(expected, other),
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
        expect(settingAt(decoded, key), `round ${round}: ${key}`).toEqual(settingAt(expected, key))
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
        dataVersion: SETTINGS_DATA_VERSION + 1,
      }))
      const decoded = decodeSettings(records, CONTEXT)

      for (const other of EXPECTED_KEYS) {
        const expected = other === key ? DEFAULTS : NON_DEFAULT
        expect(settingAt(decoded, other), `${key} newer: ${other}`).toEqual(
          settingAt(expected, other),
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
