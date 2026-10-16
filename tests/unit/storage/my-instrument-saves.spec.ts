/**
 * My instrument's saves among the visit's saves: its record written whole, before the selection
 * that names it, one batch through the save policy, each write asking the policy for persistent
 * storage; deleting it, and a write erasing its kept sessions, one batch in the policy's
 * kept-change line with the sessions' deletes, its outcome resolved to the caller (spec D326).
 */
import { describe, expect, it } from 'vitest'

import { makeMyInstrument } from '@/domain/profile/my-instrument'
import {
  encodeMyInstrumentRecord,
  MY_INSTRUMENT_RECORD_KEY,
} from '@/storage/records/my-instrument-record'
import { encodeSettingRecord } from '@/storage/records/settings-record'
import type { KeptChangeOutcome, KeptChanges, KeptRecordsReader } from '@/storage/save-policy'
import { createVisitSaves } from '@/storage/settings-saver'
import type { StorageChange } from '@/storage/storage-port'

import { PAGE_STAYS, recordingPolicy, type PolicyCall } from './recording-save-policy'

const APP_VERSION = '3.0.0-test'

const LOW_TENOR = makeMyInstrument({
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

/**
 * Intent: the visit's saves over a loaded recording policy whose kept changes resolve `outcome`,
 * and the calls it records.
 */
async function loadedSaves(outcome: KeptChangeOutcome = { status: 'saved' }) {
  const recording = recordingPolicy()
  const calls: PolicyCall[] = recording.calls
  const policy = {
    ...recording.policy,
    changeKept: (changes: KeptChanges, refusal: 'notice' | 'caller') => {
      calls.push({ method: 'changeKept', changes, refusal })
      return Promise.resolve(outcome)
    },
  }
  const saves = createVisitSaves(Promise.resolve(policy), APP_VERSION)
  await Promise.resolve()
  return { saves, calls }
}

/** A reader the batch is never expected to read through: the sessions' deletes below read none. */
const NO_READ: KeptRecordsReader = {
  read: () => Promise.reject(new Error('no read')),
  readKeyed: () => Promise.reject(new Error('no read')),
  readKeys: () => Promise.reject(new Error('no read')),
}

/** The deletes of one kept session under `key`, as the batch's sessions give them. */
function sessionDeletes(key: string): StorageChange[] {
  return (['sessionSummaries', 'sessionBodies', 'playedNotes'] as const).map((store) => ({
    kind: 'delete',
    store,
    key,
  }))
}

/** The deletes of the kept sessions `s1` and `s2`, built without reading. */
const TWO_SESSIONS: KeptChanges = () =>
  Promise.resolve([...sessionDeletes('s1'), ...sessionDeletes('s2')])

/** Intent: the batch of the one kept change the policy was asked for, with its refusal. */
async function keptBatch(calls: readonly PolicyCall[]) {
  const kept = calls.filter((call) => call.method === 'changeKept')
  expect(kept).toHaveLength(1)
  const [call] = kept
  if (call?.method !== 'changeKept') throw new Error('no kept change')
  return { refusal: call.refusal, batch: await call.changes(NO_READ) }
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
  it('delete its record with its counted sessions in one kept change told to the caller, asking nothing', async () => {
    const { saves, calls } = await loadedSaves()

    await expect(saves.deleteMyInstrument(TWO_SESSIONS)).resolves.toEqual({ status: 'saved' })

    const { refusal, batch } = await keptBatch(calls)
    expect(refusal).toBe('caller')
    expect(batch).toEqual([
      { kind: 'delete', store: 'instrument', key: MY_INSTRUMENT_RECORD_KEY },
      ...sessionDeletes('s1'),
      ...sessionDeletes('s2'),
    ])
    expect(calls.map((call) => call.method)).toEqual(['changeKept'])
  })

  // @test-link [[entity_my_instrument_record]]
  it('delete its record alone in that batch when it has no session', async () => {
    const { saves, calls } = await loadedSaves()

    await saves.deleteMyInstrument(() => Promise.resolve([]))

    const { batch } = await keptBatch(calls)
    expect(batch).toEqual([{ kind: 'delete', store: 'instrument', key: MY_INSTRUMENT_RECORD_KEY }])
  })

  // @test-link [[entity_my_instrument_record]]
  // @test-link [[rule_persistent_storage_requested]]
  it('write its record and erase its sessions in one batch, then ask for persistent storage', async () => {
    const { saves, calls } = await loadedSaves()

    await expect(saves.saveMyInstrumentErasing(LOW_TENOR, TWO_SESSIONS)).resolves.toEqual({
      status: 'saved',
    })
    await Promise.resolve()

    const { refusal, batch } = await keptBatch(calls)
    expect(refusal).toBe('caller')
    expect(batch).toEqual([
      {
        kind: 'write',
        store: 'instrument',
        key: MY_INSTRUMENT_RECORD_KEY,
        record: encodeMyInstrumentRecord(LOW_TENOR, APP_VERSION),
      },
      ...sessionDeletes('s1'),
      ...sessionDeletes('s2'),
    ])
    expect(calls.map((call) => call.method)).toEqual(['changeKept', 'requestProtection'])
  })

  // @test-link [[entity_my_instrument_record]]
  it('resolve a refused or saving-off batch to the caller, asking nothing more', async () => {
    for (const outcome of [
      { status: 'refused', kind: 'quota' },
      { status: 'saving-off' },
    ] as const) {
      const { saves, calls } = await loadedSaves(outcome)

      await expect(saves.saveMyInstrumentErasing(LOW_TENOR, TWO_SESSIONS)).resolves.toEqual(outcome)
      await expect(saves.deleteMyInstrument(TWO_SESSIONS)).resolves.toEqual(outcome)
      await Promise.resolve()

      expect(calls.map((call) => call.method)).toEqual(['changeKept', 'changeKept'])
    }
  })

  // @test-link [[entity_my_instrument_record]]
  it('run the batch after every session save asked for before it', async () => {
    const { saves, calls } = await loadedSaves()

    void saves.saveSession(() => [], PAGE_STAYS)
    void saves.deleteMyInstrument(TWO_SESSIONS)

    expect(calls.map((call) => call.method)).toEqual(['saveSession', 'changeKept'])
  })
})
