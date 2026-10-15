/**
 * My instrument's saves among the visit's saves: its record written whole, before the selection
 * that names it, and deleted, each one batch through the save policy; each save asks the policy
 * for persistent storage.
 */
import { describe, expect, it } from 'vitest'

import { makeMyInstrument } from '@/domain/profile/my-instrument'
import {
  encodeMyInstrumentRecord,
  MY_INSTRUMENT_RECORD_KEY,
} from '@/storage/records/my-instrument-record'
import { encodeSettingRecord } from '@/storage/records/settings-record'
import { createVisitSaves } from '@/storage/settings-saver'

import { recordingPolicy } from './recording-save-policy'

const APP_VERSION = '3.0.0-test'

const LOW_TENOR = makeMyInstrument({
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

/** Intent: the visit's saves over a loaded recording policy, and the calls it records. */
async function loadedSaves() {
  const { policy, calls } = recordingPolicy()
  const saves = createVisitSaves(Promise.resolve(policy), APP_VERSION)
  await Promise.resolve()
  return { saves, calls }
}

// @test-link [[entity_my_instrument_record]]
describe("my instrument's saves", () => {
  // @test-link [[entity_my_instrument_record]]
  // @test-link [[rule_persistent_storage_requested]]
  it('write its record whole, then ask for persistent storage, before the selection naming it', async () => {
    const { saves, calls } = await loadedSaves()

    saves.saveMyInstrument(LOW_TENOR)
    saves.saveSettings({ 'controls.instrumentProfileId': 'my-instrument' })

    expect(calls).toEqual([
      {
        method: 'save',
        changes: [
          {
            kind: 'write',
            store: 'instrument',
            key: MY_INSTRUMENT_RECORD_KEY,
            record: encodeMyInstrumentRecord(LOW_TENOR, APP_VERSION),
          },
        ],
      },
      { method: 'requestProtection' },
      {
        method: 'save',
        changes: [
          {
            kind: 'write',
            store: 'settings',
            key: 'controls.instrumentProfileId',
            record: encodeSettingRecord(
              'controls.instrumentProfileId',
              'my-instrument',
              APP_VERSION,
            ),
          },
        ],
      },
    ])
  })

  // @test-link [[entity_my_instrument_record]]
  it('delete its record when it is deleted, asking nothing', async () => {
    const { saves, calls } = await loadedSaves()

    saves.deleteMyInstrument()

    expect(calls).toEqual([
      {
        method: 'save',
        changes: [{ kind: 'delete', store: 'instrument', key: MY_INSTRUMENT_RECORD_KEY }],
      },
    ])
  })
})
