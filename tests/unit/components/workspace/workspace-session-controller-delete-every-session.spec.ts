/**
 * The session controller's `Delete every session` (module_kept_session_reach): one change through
 * the change path, its refusal told to its caller alone; once it is saved, or finds nothing stored,
 * every session held in memory goes, the most recent one included, kept or held in memory only,
 * and every row goes, leaving no most recent session until the next session ends with a review. A
 * refusal changes nothing. It is not offered while saving is off, nor during a session. On the
 * fake audio clock at 240 BPM from 5 s: phrase 1 sounds from 6.1 s.
 */
import { describe, expect, it } from 'vitest'

import type { KeptSessionsSeam } from '@/components/workspace/workspace-session-controller-types'
import { encodeKeptSession, type KeptSessionFacts } from '@/storage/records/kept-session-record'
import type {
  KeptChangeOutcome,
  KeptRefusal,
  SessionChanges,
  SessionSaveOutcome,
} from '@/storage/save-policy'
import type { StoredEntry } from '@/storage/storage-port'

import {
  APP_VERSION,
  recordedKeptSession,
  storedRecords,
} from '../../storage/kept-session-fixtures'
import { controllerRig, flush, playTo, type ControllerRig } from './session-controller-rig'

const history = recordedKeptSession('eb-alto', 2)

/** The facts a session is first saved with: nothing pinned, chosen or commented. */
const FRESH: KeptSessionFacts = {
  pinned: false,
  favorites: [],
  comment: '',
  playedNotesKept: false,
}

/** Intent: the stored summary of the recorded session started at `startedAt`, with `facts`. */
function summaryAt(key: string, startedAt: number, facts: Partial<KeptSessionFacts> = {}) {
  const shifted = { ...history, phrases: () => history.phrases(), startedAt }
  const records = storedRecords(encodeKeptSession(shifted, { ...FRESH, ...facts }, APP_VERSION))
  return { key, value: records.summary as never } satisfies StoredEntry
}

/** The two kept sessions a reload loads, `newest` the most recent. */
const LOADED: readonly StoredEntry[] = [
  summaryAt('pinned', 1_000, { pinned: true, favorites: [1] }),
  summaryAt('newest', 3_000),
]

/** A fake kept-sessions seam, saving on unless told, its changes logged with their refusal. */
interface FakeKept {
  readonly seam: Partial<KeptSessionsSeam>
  readonly changes: KeptRefusal[]
  savingOff: boolean
  changeOutcome: KeptChangeOutcome
}

/** Intent: a fake seam over the loaded summaries, saving on, every change saved. */
function fakeKept(summaries: readonly StoredEntry[] = LOADED): FakeKept {
  const fake: FakeKept = {
    seam: {},
    changes: [],
    savingOff: false,
    changeOutcome: { status: 'saved' },
  }
  Object.assign(fake.seam, {
    summaries,
    savingOff: () => fake.savingOff,
    changes: {
      changeKept: (_changes: unknown, refusal: KeptRefusal) => {
        fake.changes.push(refusal)
        return Promise.resolve(fake.changeOutcome)
      },
      readKept: () => {
        throw new Error('no read at a change is asked for')
      },
    },
  })
  return fake
}

/** Intent: a rig over `fake` whose two-phrase session ended with a Review, its save `outcome`. */
async function afterSession(
  fake: FakeKept,
  outcome: SessionSaveOutcome = { status: 'saved' },
): Promise<ControllerRig> {
  const rig = controllerRig(undefined, undefined, {
    keptSessions: fake.seam,
    sessionSaveOutcome: (changes: SessionChanges) => {
      // Built from no kept summary, so the save deletes none and a saved one adds its row.
      changes([])
      return Promise.resolve(outcome)
    },
  })
  rig.controller.start()
  await playTo(rig, 10.2)
  rig.controller.stop()
  await flush()
  return rig
}

/** Intent: the keys of the controller's rows, in order. */
function rowKeys(rig: ControllerRig): string[] {
  return rig.controller.state.keptRows.map((row) => row.key)
}

// @test-link [[module_kept_session_reach]]
// @test-link [[module_kept_session_changes]]
// @test-link [[req_your_data]]
describe('session controller: Delete every session', () => {
  it('is one change told to its caller; once saved, no session, no row and no most recent session remain', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake)
    expect(rowKeys(rig)).toHaveLength(3)

    await expect(rig.controller.deleteEverySession()).resolves.toBe('deleted')

    expect(fake.changes).toEqual(['caller'])
    expect(rowKeys(rig)).toEqual([])
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rig.controller.state.listShowing).toBe(true)
  })

  it('after a reload, takes the kept most recent session and every row, the list not shown', async () => {
    const rig = controllerRig(undefined, undefined, { keptSessions: fakeKept().seam })
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'newest' })

    await expect(rig.controller.deleteEverySession()).resolves.toBe('deleted')

    expect(rowKeys(rig)).toEqual([])
    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rig.controller.state.listShowing).toBe(false)
  })

  it('finding nothing stored, takes a session held in memory only after a refused save, as a success', async () => {
    const fake = fakeKept([])
    fake.changeOutcome = { status: 'unchanged' }
    const rig = await afterSession(fake, { status: 'refused', kind: 'other' })
    expect(rig.controller.state.review?.keeping).toBe('not-saved')
    rig.controller.closeReview()

    await expect(rig.controller.deleteEverySession()).resolves.toBe('deleted')

    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rig.controller.state.listShowing).toBe(false)
  })

  it('refused, leaves every session held in memory and every row', async () => {
    const fake = fakeKept()
    fake.changeOutcome = { status: 'refused', kind: 'quota' }
    const rig = await afterSession(fake)
    const { review, mostRecent } = rig.controller.state
    const rows = rowKeys(rig)

    await expect(rig.controller.deleteEverySession()).resolves.toBe('refused')

    expect(rig.controller.state.review).toBe(review)
    expect(rig.controller.state.mostRecent).toBe(mostRecent)
    expect(rowKeys(rig)).toEqual(rows)
  })

  it('turned off as it ran (an outdated tab), changes nothing', async () => {
    const fake = fakeKept()
    fake.changeOutcome = { status: 'saving-off' }
    const rig = await afterSession(fake)

    await expect(rig.controller.deleteEverySession()).resolves.toBe('saving-off')

    expect(rig.controller.state.review).not.toBeNull()
    expect(rowKeys(rig)).toHaveLength(3)
  })

  it('throws while saving is off and during a session, changing nothing', async () => {
    const fake = fakeKept()
    const rig = controllerRig(undefined, undefined, { keptSessions: fake.seam })
    fake.savingOff = true
    await expect(rig.controller.deleteEverySession()).rejects.toThrow(/saving is off/)

    fake.savingOff = false
    rig.controller.start()
    await expect(rig.controller.deleteEverySession()).rejects.toThrow(/during a session/)
    expect(fake.changes).toEqual([])
    expect(rowKeys(rig)).toEqual(['newest', 'pinned'])
  })
})
