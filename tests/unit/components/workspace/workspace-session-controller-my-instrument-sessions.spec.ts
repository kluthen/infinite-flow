/**
 * The session controller's count of my instrument's kept sessions (spec D295, D326, D338): the
 * session list's rows naming my instrument, and the session that just ended when it was played
 * with it and has no row yet. The count names them by their keys (one held in memory only because
 * its save failed adding no delete while nothing of it is stored) and, once the batch is saved,
 * makes them leave memory as `Delete session` does: their rows, a Review of one (the list in its
 * place when it showed) and the most recent session when it is one. Another instrument's sessions
 * stay. On the fake audio clock at 240 BPM from 5 s: phrase 1 sounds from 6.1 s.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import type { SessionHistory } from '@/session/session-history'
import { encodeKeptSession } from '@/storage/records/kept-session-record'
import type { KeptRecordsReader, SessionChanges, SessionSaveOutcome } from '@/storage/save-policy'
import type { StorageChange, StoredEntry } from '@/storage/storage-port'

import { BASE_CONTROLS, generateSuccess } from '../../domain/generation/carry-in/carry-in-fixture'
import { lowHorn, recordedMyInstrumentSession } from '../../session/my-instrument-session'
import {
  APP_VERSION,
  recordedKeptSession,
  storedRecords,
} from '../../storage/kept-session-fixtures'
import {
  controllerRig,
  flush,
  playTo,
  RIG_SESSION_SEED,
  RIG_TEMPO,
  type ControllerRig,
} from './session-controller-rig'

const HORN = lowHorn('treble')
let mine: SessionHistory
const tenor = recordedKeptSession('bb-tenor', 2)

beforeAll(async () => {
  mine = await recordedMyInstrumentSession(HORN, 2)
})

/** Intent: the stored summary of `history` started at `startedAt`, kept under `key`. */
function summaryAt(history: SessionHistory, key: string, startedAt: number): StoredEntry {
  const shifted = { ...history, phrases: () => history.phrases(), startedAt }
  const facts = { pinned: false, favorites: [], comment: '', playedNotesKept: false }
  const records = storedRecords(encodeKeptSession(shifted, facts, APP_VERSION))
  return { key, value: records.summary as never }
}

/** Intent: three kept sessions of my instrument and two of the tenor, as a reload loads them. */
function loaded(): StoredEntry[] {
  return [
    summaryAt(mine, 'mine-1', 1_000),
    summaryAt(tenor, 'tenor-1', 2_000),
    summaryAt(mine, 'mine-2', 3_000),
    summaryAt(tenor, 'tenor-2', 4_000),
    summaryAt(mine, 'mine-3', 5_000),
  ]
}

/** Intent: a reader over `summaries`, as the device holds them, for the count's deletes. */
function readerOver(summaries: readonly StoredEntry[]): KeptRecordsReader {
  const byKey = new Map(summaries.map(({ key, value }) => [key, value]))
  return {
    read: (store, key) =>
      Promise.resolve(store === 'sessionSummaries' ? byKey.get(key) : undefined),
    readKeyed: () => Promise.reject(new Error('no keyed read')),
    readKeys: () => Promise.reject(new Error('no key read')),
  }
}

/** Intent: the keys the deletes name, once each. */
function deletedKeys(batch: readonly StorageChange[]): string[] {
  return [...new Set(batch.map((change) => change.key))].sort()
}

/** Whether saving is off for the rigs built next: set by a test, reset after each. */
let savingOff = false

afterEach(() => {
  savingOff = false
})

/** Intent: a rig over `summaries` whose sessions' own saves resolve `outcome`. */
function rigOver(
  summaries: readonly StoredEntry[],
  outcome: SessionSaveOutcome = { status: 'saved' },
): ControllerRig {
  return controllerRig(undefined, undefined, {
    keptSessions: {
      summaries,
      savingOff: () => savingOff,
    },
    sessionSaveOutcome: (changes: SessionChanges) => {
      changes([])
      return Promise.resolve(outcome)
    },
  })
}

/** Intent: play a two-phrase session with my instrument selected at Idle, then Stop. */
async function playedWithMyInstrument(rig: ControllerRig): Promise<void> {
  const controls = makeGenerationControls({
    ...BASE_CONTROLS,
    tempo: RIG_TEMPO,
    instrumentProfileId: 'my-instrument',
  })
  const intent = createGenerationIntent({
    requestId: makeRequestId('mine-idle'),
    seed: makeSeed(11),
    controls,
    musicalProfile: rig.idle.profileSelection,
    instrumentProfile: HORN.profile,
  })
  rig.idle.controls = controls
  rig.idle.latestIntent = intent
  rig.idle.result = {
    intent,
    outcome: generateSuccess(intent),
    settings: { controls, profileSelection: rig.idle.profileSelection },
    sessionSeed: RIG_SESSION_SEED,
  }
  rig.controller.start()
  await playTo(rig, 10.2)
  rig.controller.stop()
  await flush()
}

/** Intent: the keys of the controller's rows, sorted. */
function rowKeys(rig: ControllerRig): string[] {
  return rig.controller.state.keptRows.map((row) => row.key).sort()
}

// @test-link [[entity_my_instrument_record]]
// @test-link [[module_kept_session_reach]]
// @test-link [[req_kept_sessions]]
describe("session controller: my instrument's kept sessions", () => {
  // @test-link [[module_kept_session_reach]]
  it('counts the rows naming my instrument, and its deletes name exactly them', async () => {
    const summaries = loaded()
    const rig = rigOver(summaries)

    const counted = rig.controller.myInstrumentSessions()

    expect(counted.count).toBe(3)
    expect(deletedKeys(await counted.deletes(readerOver(summaries)))).toEqual([
      'mine-1',
      'mine-2',
      'mine-3',
    ])
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('once the batch is saved, they leave: their rows and the most recent kept one; the tenor ones stay', () => {
    const rig = rigOver(loaded())
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'mine-3' })

    rig.controller.myInstrumentSessions().leave()

    expect(rowKeys(rig)).toEqual(['tenor-1', 'tenor-2'])
    expect(rig.controller.state.mostRecent).toBeNull()
  })

  // @test-link [[rule_most_recent_session_kept]]
  // @test-link [[req_kept_session_review]]
  it('counts the session that just ended once, by the key its save minted; leaving closes its Review for the list', async () => {
    const summaries = loaded()
    const rig = rigOver(summaries)
    await playedWithMyInstrument(rig)
    const ended = rig.controller.state.review
    if (ended === null) throw new Error('no Review opened')
    expect(rowKeys(rig)).toContain(ended.key)

    const counted = rig.controller.myInstrumentSessions()
    expect(counted.count).toBe(4)
    expect(counted.reviewed).toBe(true)
    expect(counted.withheld).toBe(false)

    counted.leave()
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.listShowing).toBe(true)
    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rowKeys(rig)).toEqual(['tenor-1', 'tenor-2'])
  })

  // @test-link [[entity_my_instrument_record]]
  it('counts a session whose own save failed, deletes nothing of it from the device, and it only leaves memory', async () => {
    const summaries = loaded()
    const rig = rigOver(summaries, { status: 'refused', kind: 'quota' })
    await playedWithMyInstrument(rig)
    const ended = rig.controller.state.mostRecent
    if (ended?.kind !== 'held') throw new Error('no session held')
    expect(ended.session.keeping).toBe('not-saved')

    const counted = rig.controller.myInstrumentSessions()
    expect(counted.count).toBe(4)
    expect(deletedKeys(await counted.deletes(readerOver(summaries)))).toEqual([
      'mine-1',
      'mine-2',
      'mine-3',
    ])

    counted.leave()
    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rig.controller.state.review).toBeNull()
  })

  // @test-link [[module_kept_session_reach]]
  it("counts no session of another instrument, and leaving keeps that session's Review", async () => {
    const rig = rigOver([summaryAt(tenor, 'tenor-1', 2_000)])
    rig.controller.start()
    await playTo(rig, 10.2)
    rig.controller.stop()
    await flush()

    const counted = rig.controller.myInstrumentSessions()
    expect(counted.count).toBe(0)
    counted.leave()
    expect(rig.controller.state.review?.showing).toBe(true)
    expect(rig.controller.state.mostRecent?.kind).toBe('held')
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  // @test-link [[rule_failed_read_offers_only_delete_everything]]
  it('while saving is off counts no held session, so it keeps its Review; with rows read, erasing them is withheld', async () => {
    savingOff = true
    const fromDefaults = rigOver([], { status: 'saving-off' })
    await playedWithMyInstrument(fromDefaults)
    const none = fromDefaults.controller.myInstrumentSessions()
    expect(none).toMatchObject({ count: 0, reviewed: false, withheld: false })
    none.leave()
    expect(fromDefaults.controller.state.review?.showing).toBe(true)

    const outdated = rigOver(loaded(), { status: 'saving-off' })
    await playedWithMyInstrument(outdated)
    expect(outdated.controller.myInstrumentSessions()).toMatchObject({
      count: 3,
      reviewed: false,
      withheld: true,
    })
  })
})
