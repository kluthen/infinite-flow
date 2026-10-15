/**
 * The start-up read of my instrument loads the record's read side on demand: an empty instrument
 * store gives no my instrument without loading it; a store holding a record loads it.
 */
import { describe, expect, it, vi } from 'vitest'

import { readAudioMixDesign, type AudioMixDesign } from '@/audio/audio-mix'
import { loadSavedData, type SavedDataLoadDependencies } from '@/storage-bootstrap'
import {
  encodeMyInstrumentRecord,
  MY_INSTRUMENT_RECORD_KEY,
} from '@/storage/records/my-instrument-record'
import type { StoragePort } from '@/storage/storage-port'

import { readyPort } from './save-policy-doubles'
import { freshFactory, TEST_APP_VERSION } from './storage-test-doubles'

const readSide = vi.hoisted(() => ({ loads: 0 }))

vi.mock('@/storage/records/my-instrument-record-read', async (importOriginal) => {
  readSide.loads += 1
  return importOriginal()
})

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

/** Intent: the dependencies of a load over `openPort`, whose start-up wait never ends. */
function dependencies(openPort: () => Promise<StoragePort>): SavedDataLoadDependencies {
  return { openPort, startupWait: () => new Promise<void>(() => {}), mixDesign: () => MIX_DESIGN }
}

// @test-link [[entity_my_instrument_record]]
describe('loadSavedData: my instrument, loaded on demand', () => {
  // @test-link [[entity_my_instrument_record]]
  it('gives no my instrument from an empty store without loading the read side, and loads it for a record', async () => {
    const factory = freshFactory()

    const empty = await loadSavedData(dependencies(() => readyPort(factory)))

    expect(empty.outcome).toBe('saved-data-read')
    expect(empty.myInstrument).toBeNull()
    expect(readSide.loads).toBe(0)

    const port = await readyPort(factory)
    const record = encodeMyInstrumentRecord(
      {
        template: 'bb-tenor',
        name: 'Low tenor',
        clef: 'bass',
        writtenRange: { minMidi: 40, maxMidi: 64 },
        transposition: { octaves: 1, semitones: 2, direction: 'lower' },
      },
      TEST_APP_VERSION,
    )
    await port.write('instrument', MY_INSTRUMENT_RECORD_KEY, record)

    const loaded = await loadSavedData(dependencies(() => readyPort(factory)))

    expect(loaded.myInstrument?.name).toBe('Low tenor')
    expect(readSide.loads).toBe(1)
  })
})
