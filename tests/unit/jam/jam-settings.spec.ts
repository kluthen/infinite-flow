/**
 * Jam's own settings (master spec C5.16, C10.2, C10.4, C10.7): their first values, taken from
 * session mode's key, mode and tempo the first time they are needed (the tempo kept inside 60 to
 * 180 BPM); each one saved as its own record of the `jam` group when it changes and back after a
 * reload, through the real saver, policy and settings store; a corrupt record loading that one
 * setting's first value; session mode's records never written by a Jam change and never reading
 * Jam's; a visit that saves nothing keeping them in memory; Delete everything resetting them; and
 * the one Embellishments level and the controls a Jam is generated with.
 */
import { describe, expect, it, vi } from 'vitest'

import { readAudioMixDesign, type AudioMixDesign } from '@/audio/audio-mix'
import { FIGURE_IDS, FIGURE_LEVEL_IDS } from '@/domain/figures/figure-levels'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import {
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamFirstValues,
  jamGenerationControls,
  JAM_TEMPO_VALUES,
  type JamSettings,
  type SessionModeStart,
} from '@/jam/jam-settings'
import { loadSavedData, type SavedDataLoadDependencies } from '@/storage-bootstrap'
import { createSavePolicy } from '@/storage/save-policy'
import { createVisitSaves, type SettingChanges } from '@/storage/settings-saver'
import { defaultSettings } from '@/storage/records/setting-defaults'
import {
  decodeSettings,
  encodeSettingRecord,
  JAM_SETTING_KEYS,
  jamSettingRecords,
  type SettingKey,
} from '@/storage/records/settings-record'
import type { StoragePort } from '@/storage/storage-port'

import { readyPort } from '../storage/save-policy-doubles'
import { freshFactory, TEST_APP_VERSION } from '../storage/storage-test-doubles'

/** The mix design as the stylesheet's `--mix-*` tokens give it today. */
const MIX_DESIGN: AudioMixDesign = readAudioMixDesign({
  getPropertyValue: (name: string) =>
    ({
      '--mix-click-volume-default': '0.8',
      '--mix-backing-volume-default': '0.8',
      '--mix-click-volume-min': '0.2',
      '--mix-backing-volume-min': '0',
      '--mix-volume-max': '1',
      '--mix-melody-guide-volume-default': '0.8',
      '--mix-rhythm-guide-volume-default': '0.6',
      '--mix-melody-guide-volume-min': '0',
      '--mix-rhythm-guide-volume-min': '0',
    })[name] ?? '',
})

/** Session mode's current values in these tests: D Dorian at 140 BPM. */
const SESSION: SessionModeStart = { tempo: 140, tonalCenter: 'D', collection: 'Dorian' }

/** Jam's first values from SESSION, written out from C5.16. */
const FIRST: JamSettings = {
  tempo: 140,
  tonalCenter: 'D',
  collection: 'Dorian',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Lift',
  embellishments: 'asToday',
  drift: 'Near',
  rhythmLockOn: false,
  allowedRhythmChanges: [],
}

/** A value other than its first value for every Jam setting. */
const CHANGED: JamSettings = {
  tempo: 170,
  tonalCenter: 'F#',
  collection: 'Mixolydian',
  harmonicMotion: 'Static',
  tension: 'Edge',
  embellishments: 'stronglyFavored',
  drift: 'Free',
  rhythmLockOn: true,
  allowedRhythmChanges: ['move_rest', 'merge_notes'],
}

/** Intent: one well-formed stored record of a Jam setting. */
function jamRecord(field: keyof JamSettings, value: unknown): Record<string, unknown> {
  return { key: `jam.${field}`, dataVersion: 1, appVersion: TEST_APP_VERSION, value }
}

/** Intent: a saver that records every batch it is given, and writes nothing. */
function recordingSaver(): { save: (changes: SettingChanges) => void; batches: SettingChanges[] } {
  const batches: SettingChanges[] = []
  return { save: (changes) => batches.push(changes), batches }
}

/** Intent: the load's dependencies over `openPort`, whose start-up wait never ends. */
function dependencies(openPort: () => Promise<StoragePort>): SavedDataLoadDependencies {
  return { openPort, startupWait: () => new Promise<void>(() => {}), mixDesign: () => MIX_DESIGN }
}

/** Intent: the settings store's records by key, as stored. */
async function storedSettings(port: StoragePort): Promise<Map<string, unknown>> {
  const records = (await port.readAll('settings')) as { key: string }[]
  return new Map(records.map((record) => [record.key, record]))
}

// @test-link [[module_jam_settings]]
describe("Jam's settings: their first values", () => {
  // @test-link [[rule_jam_settings_first_values]]
  it("start from session mode's key, mode and tempo, then C5.16's values", () => {
    expect(jamFirstValues(SESSION)).toEqual(FIRST)
  })

  // @test-link [[rule_jam_settings_first_values]]
  // @test-link [[rule_jam_tempo_range]]
  it.each([
    [60, 60],
    [180, 180],
    [190, 180],
    [240, 180],
  ])('take session mode tempo %i as %i, inside 60 to 180 BPM', (tempo, jam) => {
    expect(jamFirstValues({ ...SESSION, tempo }).tempo).toBe(jam)
  })

  // @test-link [[rule_jam_tempo_range]]
  it("offer 60 to 180 BPM in steps of 10 on Jam's tempo control", () => {
    expect(JAM_TEMPO_VALUES).toEqual([60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180])
  })

  // @test-link [[rule_jam_settings_first_values]]
  // @test-link [[rule_jam_settings_saved_on_change]]
  it('save the key, mode and tempo taken from session mode the first time, and nothing else', () => {
    const saver = recordingSaver()

    const store = createJamSettings({ records: [], session: SESSION, saveSettings: saver.save })

    expect(store.settings.value).toEqual(FIRST)
    expect(saver.batches).toEqual([
      { 'jam.tempo': 140, 'jam.tonalCenter': 'D', 'jam.collection': 'Dorian' },
    ])
  })

  // @test-link [[rule_jam_settings_first_values]]
  it('save nothing at creation when every record reads', () => {
    const saver = recordingSaver()
    const records = Object.entries(CHANGED).map(([field, value]) =>
      jamRecord(field as keyof JamSettings, value),
    )

    const store = createJamSettings({ records, session: SESSION, saveSettings: saver.save })

    expect(store.settings.value).toEqual(CHANGED)
    expect(saver.batches).toEqual([{}])
  })
})

// @test-link [[module_jam_settings]]
describe("Jam's settings: tolerant loading", () => {
  /** Every Jam setting saved with CHANGED's value. */
  const allChanged = Object.entries(CHANGED).map(([field, value]) =>
    jamRecord(field as keyof JamSettings, value),
  )

  /** One corruption of each kind, applied to the record of one setting. */
  const corruptions: readonly [string, (record: Record<string, unknown>) => unknown][] = [
    ['an unknown value', (record) => ({ ...record, value: 'Loud' })],
    ['a value of the wrong type', (record) => ({ ...record, value: { nested: true } })],
    ['a newer data version', (record) => ({ ...record, dataVersion: 2 })],
    ['an extra field', (record) => ({ ...record, extra: 1 })],
    ['a missing app version', ({ appVersion, ...record }) => (void appVersion, record)],
    ['not an object', () => 'jam'],
  ]

  // @test-link [[rule_jam_settings_load_tolerantly]]
  it.each(Object.keys(CHANGED).flatMap((field) => corruptions.map(([kind]) => [field, kind])))(
    'load %s at its first value for %s, every other setting as saved',
    (field, kind) => {
      const corrupt = corruptions.find(([name]) => name === kind)![1]
      const records = allChanged.map((record) =>
        record.key === `jam.${field}` ? corrupt(record) : record,
      )

      const { settings } = decodeJamSettings(records, SESSION)

      expect(settings).toEqual({ ...CHANGED, [field]: FIRST[field as keyof JamSettings] })
    },
  )

  // @test-link [[rule_jam_settings_load_tolerantly]]
  it.each([
    ['out of 60 to 180', 190],
    ['off the steps of 10', 125],
  ])('load a saved tempo %s at its first value', (_case, tempo) => {
    const { settings } = decodeJamSettings([jamRecord('tempo', tempo)], SESSION)

    expect(settings.tempo).toBe(140)
  })

  // @test-link [[rule_jam_settings_load_tolerantly]]
  it.each([
    ['out of order', ['merge_notes', 'move_rest']],
    ['named twice', ['move_rest', 'move_rest']],
    ['holding an unknown kind', ['move_rest', 'swing']],
  ])('load allowed rhythm changes %s as every change off', (_case, kinds) => {
    const { settings } = decodeJamSettings([jamRecord('allowedRhythmChanges', kinds)], SESSION)

    expect(settings.allowedRhythmChanges).toEqual([])
  })

  // @test-link [[rule_jam_settings_load_tolerantly]]
  it('load a setting saved twice at its first value, since which is the player’s is unknown', () => {
    const records = [jamRecord('drift', 'Close'), jamRecord('drift', 'Free')]

    expect(decodeJamSettings(records, SESSION).settings.drift).toBe('Near')
  })

  // @test-link [[rule_jam_settings_load_tolerantly]]
  // @test-link [[rule_jam_settings_first_values]]
  it("take a corrupt key from session mode and save it again, the others' corruption unsaved", () => {
    const records = allChanged.map((record) =>
      record.key === 'jam.tonalCenter' || record.key === 'jam.drift'
        ? { ...record, value: 'nonsense' }
        : record,
    )

    const decoded = decodeJamSettings(records, SESSION)

    expect(decoded.settings.tonalCenter).toBe('D')
    expect(decoded.settings.drift).toBe('Near')
    expect(decoded.startedFromSessionMode).toEqual({ 'jam.tonalCenter': 'D' })
  })
})

// @test-link [[module_jam_settings]]
describe("Jam's settings: saved when changed", () => {
  // @test-link [[rule_jam_settings_saved_on_change]]
  it('save one record per setting a change changed, and none for an unchanged one', () => {
    const saver = recordingSaver()
    const store = createJamSettings({ records: [], session: SESSION, saveSettings: saver.save })

    store.change({ drift: 'Close', tension: 'Lift', rhythmLockOn: true })
    store.change({ drift: 'Close' })

    expect(saver.batches.slice(1)).toEqual([{ 'jam.drift': 'Close', 'jam.rhythmLockOn': true }])
    expect(store.settings.value).toEqual({ ...FIRST, drift: 'Close', rhythmLockOn: true })
  })

  // @test-link [[rule_jam_settings_saved_on_change]]
  it('refuse a value Jam’s controls never offer, a caller defect', () => {
    const store = createJamSettings({ records: [], session: SESSION, saveSettings: () => {} })

    expect(() => store.change({ tempo: 240 })).toThrow(/not a value of tempo/u)
    expect(store.settings.value).toEqual(FIRST)
  })

  // @test-link [[rule_jam_settings_saved_on_change]]
  // @test-link [[rule_jam_settings_load_tolerantly]]
  it("survive a reload, each through the saver, the settings store and the load's hand-off", async () => {
    const factory = freshFactory()
    const port = await readyPort(factory)
    const saves = createVisitSaves(Promise.resolve(createSavePolicy(port)), TEST_APP_VERSION)
    const store = createJamSettings({
      records: [],
      session: SESSION,
      saveSettings: saves.saveSettings,
    })

    for (const [field, value] of Object.entries(CHANGED)) store.change({ [field]: value })
    await vi.waitFor(async () => {
      const stored = await storedSettings(port)
      expect(JAM_SETTING_KEYS.every((key) => stored.has(key))).toBe(true)
      expect((stored.get('jam.allowedRhythmChanges') as { value: unknown }).value).toEqual(
        CHANGED.allowedRhythmChanges,
      )
    })

    const load = await loadSavedData(dependencies(() => readyPort(factory)))
    const reloaded = createJamSettings({
      records: load.jamSettingsRecords,
      session: { tempo: 90, tonalCenter: 'C', collection: 'Ionian' },
      saveSettings: () => {},
    })

    expect(reloaded.settings.value).toEqual(CHANGED)
  })

  // @test-link [[rule_jam_settings_saved_on_change]]
  it("never write a session-mode record, and leave session mode's saved values as they were", async () => {
    const factory = freshFactory()
    const port = await readyPort(factory)
    await port.write(
      'settings',
      'controls.tempo',
      encodeSettingRecord('controls.tempo', 200, TEST_APP_VERSION),
    )
    const before = await storedSettings(port)
    const saves = createVisitSaves(Promise.resolve(createSavePolicy(port)), TEST_APP_VERSION)
    const store = createJamSettings({
      records: [],
      session: { ...SESSION, tempo: 200 },
      saveSettings: saves.saveSettings,
    })

    for (const [field, value] of Object.entries(CHANGED)) store.change({ [field]: value })
    await vi.waitFor(async () => expect((await storedSettings(port)).size).toBe(1 + 9))

    const after = await storedSettings(port)
    const sessionKeys = [...after.keys()].filter((key) => !key.startsWith('jam.'))
    expect(sessionKeys).toEqual(['controls.tempo'])
    expect(after.get('controls.tempo')).toEqual(before.get('controls.tempo'))
    const load = await loadSavedData(dependencies(() => readyPort(factory)))
    expect(load.settings.controls.tempo).toBe(200)
    expect(load.settings.controls.tonalCenter).toBe(DEFAULT_GENERATION_CONTROLS.tonalCenter)
  })
})

// @test-link [[module_jam_settings]]
describe("Jam's settings: the load hands them on undecoded", () => {
  // @test-link [[rule_jam_settings_load_tolerantly]]
  it("hands Jam's records as stored, even unreadable ones, and session mode's settings ignore them", () => {
    const records = [
      jamRecord('drift', 'Close'),
      jamRecord('tempo', 'fast'),
      encodeSettingRecord('controls.tempo', 120, TEST_APP_VERSION),
      { key: 'jam.unknown', dataVersion: 1, appVersion: TEST_APP_VERSION, value: 1 },
      'garbage',
    ]
    const context = { mixDesign: MIX_DESIGN, myInstrumentLoaded: false, presets: [] }

    expect(jamSettingRecords(records)).toEqual([records[0], records[1]])
    expect(decodeSettings(records, context)).toEqual(decodeSettings([records[2]], context))
  })

  // @test-link [[rule_jam_in_visits_that_save_nothing]]
  it('hands none in a visit started from the defaults, so Jam starts from its first values', async () => {
    const load = await loadSavedData({
      openPort: () => new Promise<StoragePort>(() => {}),
      startupWait: () => Promise.resolve(),
      mixDesign: () => MIX_DESIGN,
    })

    expect(load.outcome).toBe('started-from-defaults')
    expect(load.jamSettingsRecords).toEqual([])
    expect(decodeJamSettings(load.jamSettingsRecords, SESSION).settings).toEqual(FIRST)
  })

  // @test-link [[rule_jam_in_visits_that_save_nothing]]
  it('keep changes in memory for a visit whose saving is off, writing nothing', async () => {
    const factory = freshFactory()
    const port = await readyPort(factory)
    const policy = createSavePolicy(port)
    policy.stopSavingUnreadable()
    const saves = createVisitSaves(Promise.resolve(policy), TEST_APP_VERSION)
    const store = createJamSettings({
      records: [],
      session: SESSION,
      saveSettings: saves.saveSettings,
    })

    store.change({ drift: 'Free', embellishments: 'favored' })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(store.settings.value).toEqual({ ...FIRST, drift: 'Free', embellishments: 'favored' })
    expect((await storedSettings(port)).size).toBe(0)
  })

  // @test-link [[rule_jam_settings_first_values]]
  it('reset to their first values after Delete everything', async () => {
    const factory = freshFactory()
    const port = await readyPort(factory)
    const saves = createVisitSaves(Promise.resolve(createSavePolicy(port)), TEST_APP_VERSION)
    const store = createJamSettings({
      records: [],
      session: SESSION,
      saveSettings: saves.saveSettings,
    })
    store.change({ drift: 'Free', tempo: 60 })
    await vi.waitFor(async () => expect((await storedSettings(port)).has('jam.drift')).toBe(true))

    await createSavePolicy(port).deleteEverything()
    const load = await loadSavedData(dependencies(() => readyPort(factory)))
    const next = createJamSettings({
      records: load.jamSettingsRecords,
      session: { tempo: 100, tonalCenter: 'G', collection: 'Aeolian' },
      saveSettings: () => {},
    })

    expect(load.jamSettingsRecords).toEqual([])
    expect(next.settings.value).toEqual(
      jamFirstValues({ tempo: 100, tonalCenter: 'G', collection: 'Aeolian' }),
    )
  })
})

// @test-link [[module_jam_settings]]
describe("Jam's settings: what a Jam is generated with", () => {
  // @test-link [[rule_jam_embellishments_one_level]]
  it.each(FIGURE_LEVEL_IDS)('give Embellishments %s to all seven figures alike', (level) => {
    const levels = jamFigureLevels(level)

    expect(Object.keys(levels).sort()).toEqual([...FIGURE_IDS].sort())
    expect(FIGURE_IDS.every((figure) => levels[figure] === level)).toBe(true)
  })

  // @test-link [[req_jam_settings]]
  it("take Jam's own values, the shared instrument, the first-visit doodle controls and Varied", () => {
    const controls = jamGenerationControls(CHANGED, 'eb-alto')

    expect(controls).toEqual({
      ...DEFAULT_GENERATION_CONTROLS,
      tempo: 170,
      tonalCenter: 'F#',
      collection: 'Mixolydian',
      harmonicMotion: 'Static',
      tension: 'Edge',
      arpeggioChaos: 'Varied',
      instrumentProfileId: 'eb-alto',
    })
    expect(controls.noteDensity).toBe('Quarter')
  })

  // @test-link [[module_jam_settings]]
  it("list nine record keys of the jam group, none of them session mode's", () => {
    const sessionKeys = new Set<SettingKey>(
      Object.keys(defaultSettings(MIX_DESIGN.defaults)) as SettingKey[],
    )

    expect(JAM_SETTING_KEYS).toHaveLength(9)
    expect(JAM_SETTING_KEYS.every((key) => key.startsWith('jam.') && !sessionKeys.has(key))).toBe(
      true,
    )
  })
})
