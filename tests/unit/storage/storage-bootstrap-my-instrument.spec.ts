/**
 * The start-up read of my instrument: the load reads the instrument store with the settings,
 * within the start-up wait, hands on my instrument when its record loads, and keeps a saved
 * selection of it exactly when it loaded; otherwise the selection falls back to the default.
 */
import { describe, expect, it } from 'vitest'

import { readAudioMixDesign, type AudioMixDesign } from '@/audio/audio-mix'
import { makeMyInstrument, type MyInstrumentInput } from '@/domain/profile/my-instrument'
import { loadSavedData, type SavedDataLoadDependencies } from '@/storage-bootstrap'
import {
  encodeMyInstrumentRecord,
  MY_INSTRUMENT_RECORD_KEY,
} from '@/storage/records/my-instrument-record'
import type { RecordVersions } from '@/storage/record-envelope'
import { defaultSettings } from '@/storage/records/setting-defaults'
import { encodeSettingRecord } from '@/storage/records/settings-record'
import { StorageError, type StoragePort } from '@/storage/storage-port'

import { readyPort } from './save-policy-doubles'
import { freshFactory, TEST_APP_VERSION } from './storage-test-doubles'

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

const DEFAULT_PROFILE = defaultSettings(MIX_DESIGN.defaults).controls.instrumentProfileId

const TENOR_IN_BASS: MyInstrumentInput = {
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
}

/** Intent: the dependencies of a load over `openPort`, whose start-up wait never ends. */
function dependencies(openPort: () => Promise<StoragePort>): SavedDataLoadDependencies {
  return { openPort, startupWait: () => new Promise<void>(() => {}), mixDesign: () => MIX_DESIGN }
}

/** Intent: a port over a fresh database holding `record` as my instrument, and my instrument selected. */
async function seeded(record: RecordVersions): Promise<IDBFactory> {
  const factory = freshFactory()
  const port = await readyPort(factory)
  await port.write('instrument', MY_INSTRUMENT_RECORD_KEY, record)
  const selection = encodeSettingRecord(
    'controls.instrumentProfileId',
    'my-instrument',
    TEST_APP_VERSION,
  )
  await port.write('settings', 'controls.instrumentProfileId', selection)
  return factory
}

// @test-link [[entity_my_instrument_record]]
// @test-link [[module_saved_data_loader]]
describe('loadSavedData: my instrument', () => {
  // @test-link [[entity_my_instrument_record]]
  // @test-link [[module_saved_data_loader]]
  it('hands on the saved my instrument, unchanged, and keeps a saved selection of it', async () => {
    const factory = await seeded(encodeMyInstrumentRecord(TENOR_IN_BASS, TEST_APP_VERSION))

    const load = await loadSavedData(dependencies(() => readyPort(factory)))

    expect(load.myInstrument).toEqual(makeMyInstrument(TENOR_IN_BASS))
    expect(load.settings.controls.instrumentProfileId).toBe('my-instrument')
  })

  // @test-link [[entity_my_instrument_record]]
  // @test-link [[rule_saved_settings_load_tolerantly]]
  it.each([
    ['one its rules refuse', { writtenRange: { minMidi: 40, maxMidi: 60 } }],
    ["one whose id is not my instrument's", { id: 'bb-tenor' }],
    ['one that does not decode', { clef: 'tenor' }],
  ])(
    'loads %s as absent, and the saved selection falls back to the default profile',
    async (_case, change) => {
      const record = { ...encodeMyInstrumentRecord(TENOR_IN_BASS, TEST_APP_VERSION), ...change }
      const factory = await seeded(record)

      const load = await loadSavedData(dependencies(() => readyPort(factory)))

      expect(load.myInstrument).toBeNull()
      expect(load.settings.controls.instrumentProfileId).toBe(DEFAULT_PROFILE)
      expect(load.outcome).toBe('saved-data-read')
    },
  )

  // @test-link [[entity_my_instrument_record]]
  it('has no my instrument with no record, a saved selection of it falling back', async () => {
    const factory = freshFactory()
    const port = await readyPort(factory)
    const selection = encodeSettingRecord(
      'controls.instrumentProfileId',
      'my-instrument',
      TEST_APP_VERSION,
    )
    await port.write('settings', 'controls.instrumentProfileId', selection)

    const load = await loadSavedData(dependencies(() => readyPort(factory)))

    expect(load.myInstrument).toBeNull()
    expect(load.settings.controls.instrumentProfileId).toBe(DEFAULT_PROFILE)
  })

  // @test-link [[entity_my_instrument_record]]
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('a visit started from the defaults has no my instrument', async () => {
    const factory = await seeded(encodeMyInstrumentRecord(TENOR_IN_BASS, TEST_APP_VERSION))
    const refuse = () => Promise.reject(new StorageError('other', 'the read failed'))

    const load = await loadSavedData(
      dependencies(async () => ({ ...(await readyPort(factory)), readAll: refuse })),
    )

    expect(load.outcome).toBe('started-from-defaults')
    expect(load.myInstrument).toBeNull()
  })
})
