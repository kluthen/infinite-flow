// @vitest-environment node
/**
 * The batch that deletes or changes my instrument with its kept sessions (spec D326), over a real
 * save policy and port on an in-memory IndexedDB: the record's delete or write and the summary,
 * body and played notes of each counted session, by its key, in one transaction, all or none;
 * another instrument's sessions, and a session the count did not name, stay.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { keptSessionsDeletes } from '@/components/workspace/kept-session-review-changes'
import { keptSessionKey } from '@/components/workspace/workspace-session-save'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import type { SessionHistory } from '@/session/session-history'
import { APP_VERSION } from '@/storage/app-version'
import {
  encodeMyInstrumentRecord,
  MY_INSTRUMENT_RECORD_KEY,
} from '@/storage/records/my-instrument-record'
import { encodeKeptSession } from '@/storage/records/kept-session-record'
import { createSavePolicy } from '@/storage/save-policy'
import { createVisitSaves } from '@/storage/settings-saver'
import type { StorageChange, StoragePort } from '@/storage/storage-port'

import { recordedKeptSession } from '../../storage/kept-session-fixtures'
import { readyPort, recordFailures, refusingPort } from '../../storage/save-policy-doubles'
import { freshFactory } from '../../storage/storage-test-doubles'

const LOW_TENOR = makeMyInstrument({
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

const WIDER = makeMyInstrument({ ...LOW_TENOR, writtenRange: { minMidi: 40, maxMidi: 70 } })

/** The three kept sessions of my instrument and the tenor's one, by key. */
const MINE = ['mine-pinned', 'mine-notes', 'mine-recent'] as const
const TENOR = 'tenor-1'

/** Intent: the writes that keep `history` under `key`, its played notes kept. */
function keptRecords(history: SessionHistory, key: string): StorageChange[] {
  const records = encodeKeptSession(
    history,
    { pinned: false, favorites: [], comment: '', playedNotesKept: true },
    APP_VERSION,
  )
  const changes: StorageChange[] = [
    { kind: 'write', store: 'sessionSummaries', key, record: records.summary },
    { kind: 'write', store: 'sessionBodies', key, record: records.body },
  ]
  if (records.playedNotes !== null)
    changes.push({ kind: 'write', store: 'playedNotes', key, record: records.playedNotes })
  return changes
}

/** Intent: a port holding my instrument, its three sessions and the tenor's one. */
async function seededPort(): Promise<StoragePort> {
  const port = await readyPort(freshFactory())
  const mine = recordedKeptSession('bb-tenor', 2)
  await port.apply([
    {
      kind: 'write',
      store: 'instrument',
      key: MY_INSTRUMENT_RECORD_KEY,
      record: encodeMyInstrumentRecord(LOW_TENOR, APP_VERSION),
    },
    ...MINE.flatMap((key) => keptRecords(mine, key)),
    ...keptRecords(recordedKeptSession('bb-tenor', 2), TENOR),
  ])
  return port
}

/** Intent: the keys each kept-session store and the instrument store hold. */
async function keysOf(port: StoragePort) {
  const stores = ['instrument', 'sessionSummaries', 'sessionBodies', 'playedNotes'] as const
  const keys = await Promise.all(stores.map((store) => port.readKeys(store)))
  return Object.fromEntries(stores.map((store, index) => [store, [...(keys[index] ?? [])].sort()]))
}

afterEach(() => {
  vi.restoreAllMocks()
})

// @test-link [[entity_my_instrument_record]]
// @test-link [[module_kept_session_changes]]
describe("my instrument's batch with its kept sessions", () => {
  // @test-link [[entity_my_instrument_record]]
  it('deleting it deletes its record and the three counted sessions in one batch; the tenor one stays', async () => {
    const port = await seededPort()
    const apply = vi.spyOn(port, 'apply')
    const saves = createVisitSaves(Promise.resolve(createSavePolicy(port)), APP_VERSION)

    expect(await saves.deleteMyInstrument(keptSessionsDeletes(MINE))).toEqual({ status: 'saved' })

    expect(apply).toHaveBeenCalledOnce()
    expect(await keysOf(port)).toEqual({
      instrument: [],
      sessionSummaries: [TENOR],
      sessionBodies: [TENOR],
      playedNotes: [TENOR],
    })
  })

  // @test-link [[entity_my_instrument_record]]
  it('a change erasing them writes the record and deletes only the counted sessions', async () => {
    const port = await seededPort()
    const saves = createVisitSaves(Promise.resolve(createSavePolicy(port)), APP_VERSION)
    const [first, second] = MINE

    expect(
      await saves.saveMyInstrumentErasing(WIDER, keptSessionsDeletes([first, second, 'gone'])),
    ).toEqual({ status: 'saved' })

    expect(await port.read('instrument', MY_INSTRUMENT_RECORD_KEY)).toEqual(
      encodeMyInstrumentRecord(WIDER, APP_VERSION),
    )
    const keys = await keysOf(port)
    expect(keys.sessionSummaries).toEqual(['mine-recent', TENOR])
    expect(keys.playedNotes).toEqual(['mine-recent', TENOR])
  })

  // @test-link [[entity_my_instrument_record]]
  it('refused, deletes and writes nothing, and tells only its caller', async () => {
    const real = await seededPort()
    const before = await keysOf(real)
    const { port, refuse } = refusingPort(real)
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    const saves = createVisitSaves(Promise.resolve(policy), APP_VERSION)
    refuse('quota')

    expect(await saves.deleteMyInstrument(keptSessionsDeletes(MINE))).toEqual({
      status: 'refused',
      kind: 'quota',
    })
    expect(await saves.saveMyInstrumentErasing(WIDER, keptSessionsDeletes(MINE))).toEqual({
      status: 'refused',
      kind: 'quota',
    })

    expect(await keysOf(real)).toEqual(before)
    expect(await real.read('instrument', MY_INSTRUMENT_RECORD_KEY)).toEqual(
      encodeMyInstrumentRecord(LOW_TENOR, APP_VERSION),
    )
    expect(failures).toEqual([])
  })

  // @test-link [[entity_my_instrument_record]]
  it('the session that just ended, saved first in the line, is erased by the key its save minted', async () => {
    const port = await readyPort(freshFactory())
    const saves = createVisitSaves(Promise.resolve(createSavePolicy(port)), APP_VERSION)
    const ended = recordedKeptSession('bb-tenor', 2)
    const key = keptSessionKey(ended)

    const saving = saves.saveSession(
      () => keptRecords(ended, key),
      () => false,
    )
    const deleting = saves.deleteMyInstrument(keptSessionsDeletes([key]))

    expect(await saving).toEqual({ status: 'saved' })
    expect(await deleting).toEqual({ status: 'saved' })
    expect((await keysOf(port)).sessionSummaries).toEqual([])
  })
})
