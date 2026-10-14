/**
 * The session controller's most recent session beyond the Review itself: how the session that
 * ended is kept follows its own save (not pinned at once and once saved, not saved once the save
 * is refused or skipped, not saved at once while saving is off, never waiting on a save that may
 * never settle), and after a reload the most recent session is the readable kept one with the
 * latest start, read from the device by its key when it is shown, then held in memory. On the
 * fake audio clock at 240 BPM from 5 s: phrase 1 starts sounding at 6.1 s.
 */
import { describe, expect, it, vi } from 'vitest'

import type { SessionHistory } from '@/session/session-history'
import { encodeKeptSession } from '@/storage/records/kept-session-record'
import type { SessionSaveOutcome } from '@/storage/save-policy'
import { StorageError } from '@/storage/storage-port'
import {
  APP_VERSION,
  recordedKeptSession,
  storedRecords,
} from '../../storage/kept-session-fixtures'
import {
  controllerRig,
  flush,
  playTo,
  type ControllerRig,
  type ControllerRigOptions,
} from './session-controller-rig'

/** Intent: a rig whose first session sounded `phrases` phrases, then ended by Stop. */
async function afterSoundedEnd(
  phrases: number,
  options: ControllerRigOptions,
): Promise<ControllerRig> {
  const rig = controllerRig(undefined, undefined, options)
  rig.controller.start()
  await playTo(rig, 6.1 + (phrases - 1) * 4 + 0.5)
  rig.controller.stop()
  expect(rig.controller.state.lastEnd?.soundedPhraseCount).toBe(phrases)
  return rig
}

/** Intent: a promise and the function that settles it, for a save the test resolves by hand. */
function deferredOutcome(): {
  promise: Promise<SessionSaveOutcome>
  settle: (outcome: SessionSaveOutcome) => void
} {
  /** Intent: settle the save; replaced once the save's promise exists. */
  let settle: (outcome: SessionSaveOutcome) => void = () => {
    throw new Error('the save was never asked for')
  }
  const promise = new Promise<SessionSaveOutcome>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

// @test-link [[module_kept_session_save]]
// @test-link [[rule_failed_save_never_disturbs_session]]
describe("session controller: how the session is kept, from its save's outcome", () => {
  // @test-link [[module_kept_session_save]]
  it('reads not pinned while the save runs and once it is saved', async () => {
    const save = deferredOutcome()
    const rig = await afterSoundedEnd(1, { sessionSaveOutcome: () => save.promise })
    await vi.waitFor(() => expect(rig.sessionSaves).toHaveLength(1))

    expect(rig.controller.state.review?.keeping).toBe('not-pinned')
    save.settle({ status: 'saved' })
    await flush()

    expect(rig.controller.state.review?.keeping).toBe('not-pinned')
  })

  for (const outcome of [
    { status: 'refused', kind: 'other' },
    { status: 'refused', kind: 'quota' },
    { status: 'saving-off' },
  ] as const) {
    // @test-link [[module_kept_session_save]]
    // @test-link [[rule_failed_save_never_disturbs_session]]
    it(`reads not saved, in the Review and the most recent session, once the save ends ${outcome.status === 'refused' ? `refused as ${outcome.kind}` : 'skipped'}`, async () => {
      const save = deferredOutcome()
      const rig = await afterSoundedEnd(1, { sessionSaveOutcome: () => save.promise })
      rig.controller.closeReview()
      await vi.waitFor(() => expect(rig.sessionSaves).toHaveLength(1))

      save.settle(outcome)
      await flush()

      expect(rig.controller.state.review?.keeping).toBe('not-saved')
      expect(rig.controller.state.review?.showing).toBe(false)
      const recent = rig.controller.state.mostRecent
      expect(recent?.kind === 'held' && recent.session.keeping).toBe('not-saved')
    })
  }

  // @test-link [[module_kept_session_save]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('reads not saved at once while saving is off, never waiting on a save that may never settle', async () => {
    const rig = await afterSoundedEnd(1, {
      sessionSaveOutcome: () => new Promise<SessionSaveOutcome>(() => {}),
      keptSessions: { savingOff: () => true },
    })

    expect(rig.controller.state.review?.keeping).toBe('not-saved')
    const recent = rig.controller.state.mostRecent
    expect(recent?.kind === 'held' && recent.session.keeping).toBe('not-saved')
  })

  // @test-link [[module_kept_session_save]]
  it("leaves a later session's keeping alone when an earlier save ends late", async () => {
    const first = deferredOutcome()
    const outcomes = [first.promise, Promise.resolve<SessionSaveOutcome>({ status: 'saved' })]
    const rig = await afterSoundedEnd(1, { sessionSaveOutcome: () => outcomes.shift()! })
    rig.controller.closeReview()
    rig.controller.start()
    await playTo(rig, rig.audioRig.now() + 1.5)
    rig.controller.stop()
    await vi.waitFor(() => expect(rig.sessionSaves).toHaveLength(2))

    first.settle({ status: 'refused', kind: 'other' })
    await flush()

    expect(rig.controller.state.review?.keeping).toBe('not-pinned')
    const recent = rig.controller.state.mostRecent
    expect(recent?.kind === 'held' && recent.session.keeping).toBe('not-pinned')
  })
})

/** A kept session as the load read it: its history, start and stored records. */
interface LoadedKept {
  readonly key: string
  readonly history: SessionHistory
  readonly startedAt: number
  readonly pinned: boolean
}

/** Intent: the kept sessions' summaries and a read of their records, as a reload gives them. */
function reloadedKept(sessions: readonly LoadedKept[]) {
  const stored = new Map(
    sessions.map(({ key, history, startedAt, pinned }) => [
      key,
      storedRecords(
        encodeKeptSession(
          { ...history, phrases: () => history.phrases(), startedAt },
          { pinned, favorites: [], comment: '', playedNotesKept: false },
          APP_VERSION,
        ),
      ),
    ]),
  )
  const read = vi.fn((key: string) => {
    const records = stored.get(key)
    if (records === undefined) return Promise.reject(new StorageError('other', 'no such session'))
    return Promise.resolve(records)
  })
  const summaries = [...stored].map(([key, records]) => ({ key, value: records.summary }))
  return { summaries, read }
}

// @test-link [[module_kept_session_save]]
// @test-link [[req_kept_session_review]]
describe('session controller: the most recent session after a reload', () => {
  const history = recordedKeptSession('eb-alto', 2)
  const sessions: readonly LoadedKept[] = [
    { key: 'session-old', history, startedAt: 1_000, pinned: true },
    { key: 'session-new', history, startedAt: 2_000, pinned: true },
  ]

  // @test-link [[module_kept_session_save]]
  it('is the readable kept session with the latest start, read by its key when shown', async () => {
    const kept = reloadedKept(sessions)
    const rig = controllerRig(undefined, undefined, { keptSessions: kept })

    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'session-new' })
    expect(rig.controller.state.review).toBeNull()
    const showing = rig.controller.showReview()
    expect(rig.controller.state.readingMostRecent).toBe(true)
    expect(() => rig.controller.showReview()).toThrow(/being read/)

    await expect(showing).resolves.toBe(true)

    expect(kept.read).toHaveBeenCalledExactlyOnceWith('session-new')
    expect(rig.controller.state.readingMostRecent).toBe(false)
    const { review } = rig.controller.state
    expect(review?.showing).toBe(true)
    expect(review?.history.startedAt).toBe(2_000)
    expect(review?.history.phraseCount).toBe(2)
    expect(review?.instrumentName).toBe('E-flat alto saxophone')
    expect(review?.keeping).toBe('pinned')
    expect(rig.controller.state.startBlocker).toBe('review_showing')
  })

  // @test-link [[req_kept_session_review]]
  it('is held in memory once read, so showing it again reads nothing', async () => {
    const kept = reloadedKept(sessions)
    const rig = controllerRig(undefined, undefined, { keptSessions: kept })
    await rig.controller.showReview()
    rig.controller.closeReview()

    await expect(rig.controller.showReview()).resolves.toBe(true)

    expect(kept.read).toHaveBeenCalledTimes(1)
    expect(rig.controller.state.mostRecent?.kind).toBe('held')
  })

  // @test-link [[req_kept_session_review]]
  it('shows nothing when its read is refused, and can be asked for again', async () => {
    const kept = reloadedKept(sessions)
    const rig = controllerRig(undefined, undefined, {
      keptSessions: {
        summaries: kept.summaries,
        read: () => Promise.reject(new StorageError('other', 'refused')),
      },
    })

    await expect(rig.controller.showReview()).resolves.toBe(false)

    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.readingMostRecent).toBe(false)
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'session-new' })
  })

  // @test-link [[req_kept_session_review]]
  it('shows nothing when a session started while it was read', async () => {
    const kept = reloadedKept(sessions)
    const rig = controllerRig(undefined, undefined, { keptSessions: kept })

    const showing = rig.controller.showReview()
    rig.controller.start()

    await expect(showing).resolves.toBe(false)
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.phase).toBe('count-in')
  })

  // @test-link [[module_kept_session_save]]
  it('is none when no kept session was loaded', () => {
    const rig = controllerRig()

    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rig.controller.state.readingMostRecent).toBe(false)
  })
})
