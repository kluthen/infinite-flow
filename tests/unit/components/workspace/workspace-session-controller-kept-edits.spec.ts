/**
 * The session controller's side of the Review's changes to its session: a favorite mark, a pin or
 * unpin, the comment and `Delete session`, each applied at once in memory to the Review and the
 * most recent session alike, then saved when made: through the change path for a session kept on
 * the device, by a retry of its own save for a session whose save was refused, not at all while
 * saving is off. The first pin or favorite asks for persistent storage. On the fake audio clock at
 * 240 BPM from 5 s: phrase 1 sounds from 6.1 s.
 */
import { describe, expect, it } from 'vitest'

import type {
  KeptSessionsSeam,
  ReviewedSession,
} from '@/components/workspace/workspace-session-controller-types'
import { decodeKeptSessionSummary } from '@/storage/records/kept-session-record'
import type { KeptChangeOutcome, KeptRefusal, SessionSaveOutcome } from '@/storage/save-policy'
import type { KeptSessionChanges } from '@/storage/settings-saver'
import type { StorageChange } from '@/storage/storage-port'

import { controllerRig, flush, playTo, type ControllerRig } from './session-controller-rig'

/** One change that reached the fake kept-session changes, with its refusal kind. */
type KeptCall = KeptRefusal

/** Fake kept-session changes and protection requests, logged; changes resolve as the test sets. */
interface FakeKept {
  readonly seam: Partial<KeptSessionsSeam>
  readonly calls: KeptCall[]
  protectionRequests: number
  changeOutcome: () => Promise<KeptChangeOutcome>
}

/** Intent: a fake seam over saving on (unless `savingOff`), logging changes and requests. */
function fakeKept(savingOff = false): FakeKept {
  const fake: FakeKept = {
    calls: [],
    protectionRequests: 0,
    changeOutcome: () => Promise.resolve({ status: 'saved' }),
    seam: {},
  }
  const changes: KeptSessionChanges = {
    changeKept: (_changes, refusal) => {
      fake.calls.push(refusal)
      return fake.changeOutcome()
    },
    readKept: () => {
      throw new Error('no read at a change is asked for')
    },
  }
  Object.assign(fake.seam, {
    changes,
    savingOff: () => savingOff,
    requestProtection: () => {
      fake.protectionRequests += 1
    },
  })
  return fake
}

/** Intent: a rig whose two-phrase session ended with a Review, its save resolving `outcome`. */
async function afterSession(
  fake: FakeKept,
  outcomes: (() => Promise<SessionSaveOutcome>)[] = [],
): Promise<ControllerRig> {
  const rig = controllerRig(undefined, undefined, {
    keptSessions: fake.seam,
    sessionSaveOutcome: () => outcomes.shift()?.() ?? Promise.resolve({ status: 'saved' }),
  })
  rig.controller.start()
  await playTo(rig, 10.2)
  rig.controller.stop()
  await flush()
  return rig
}

/** Intent: the Review's session, which must exist. */
function reviewed(rig: ControllerRig): ReviewedSession {
  const review = rig.controller.state.review
  if (review === null) throw new Error('no Review exists')
  return review
}

/** Intent: the most recent session, which must be held in memory. */
function mostRecent(rig: ControllerRig): ReviewedSession {
  const recent = rig.controller.state.mostRecent
  if (recent?.kind !== 'held') throw new Error('no most recent session is held')
  return recent.session
}

/** Intent: the session-wide record the `index`th session save wrote, from no kept summary. */
function savedSummary(rig: ControllerRig, index: number): Record<string, unknown> {
  const changes = rig.sessionSaves[index]
  if (changes === undefined) throw new Error(`no session save ${index} was asked for`)
  const write = changes([]).find(
    (change): change is Extract<StorageChange, { kind: 'write' }> =>
      change.kind === 'write' && change.store === 'sessionSummaries',
  )
  if (write === undefined) throw new Error('the save wrote no session-wide record')
  const reading = decodeKeptSessionSummary(write.record)
  if (reading.reading !== 'current') throw new Error('the save wrote an unreadable record')
  return { ...reading.value }
}

const REFUSED = (): Promise<SessionSaveOutcome> =>
  Promise.resolve({ status: 'refused', kind: 'other' })

// @test-link [[req_favorite_phrases]]
// @test-link [[rule_favorite_pins_session]]
// @test-link [[module_kept_session_changes]]
describe('session controller: a favorite marked in the Review', () => {
  it('shows at once in the Review and the most recent session alike, pins it, and is saved as a change', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake)
    const { key, history } = reviewed(rig)

    await rig.controller.setFavorite(key, 2, true)

    expect(reviewed(rig)).toEqual(
      expect.objectContaining({ favorites: [2], pinned: true, keeping: 'pinned' }),
    )
    expect(mostRecent(rig).favorites).toEqual([2])
    expect(mostRecent(rig).history).toBe(history)
    expect(reviewed(rig).history).toBe(history)
    expect(fake.calls).toEqual(['notice'])
  })

  it('removing the last favorite leaves the session pinned', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake)
    const { key } = reviewed(rig)

    await rig.controller.setFavorite(key, 1, true)
    await rig.controller.setFavorite(key, 1, false)

    expect(reviewed(rig)).toEqual(
      expect.objectContaining({ favorites: [], pinned: true, keeping: 'pinned' }),
    )
    expect(fake.calls).toEqual(['notice', 'notice'])
  })

  // @test-link [[rule_persistent_storage_requested]]
  it('asks for persistent storage on marking, and so does a pin; never on removing or unpinning', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake)
    const { key } = reviewed(rig)

    await rig.controller.setFavorite(key, 1, true)
    await rig.controller.setFavorite(key, 1, false)
    await rig.controller.setPinned(key, false)
    expect(fake.protectionRequests).toBe(1)
    await rig.controller.setPinned(key, true)
    expect(fake.protectionRequests).toBe(2)
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('refused, stays in memory for the visit', async () => {
    const fake = fakeKept()
    fake.changeOutcome = () => Promise.resolve({ status: 'refused', kind: 'quota' })
    const rig = await afterSession(fake)

    await rig.controller.setFavorite(reviewed(rig).key, 1, true)

    expect(reviewed(rig).favorites).toEqual([1])
  })

  it('throws for a phrase the session does not hold, or a session not held', async () => {
    const rig = await afterSession(fakeKept())
    const { key } = reviewed(rig)

    await expect(async () => rig.controller.setFavorite(key, 9, true)).rejects.toThrow(/phrase 9/)
    await expect(async () => rig.controller.setFavorite('session-1-1', 1, true)).rejects.toThrow(
      /no held session/,
    )
  })
})

// @test-link [[rule_pinned_session_kept]]
// @test-link [[module_kept_session_changes]]
describe('session controller: Pin and Unpin', () => {
  it('change the pin and the keeping at once, each saved as a change; the same pin again saves nothing', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake)
    const { key } = reviewed(rig)

    await rig.controller.setPinned(key, true)
    expect(reviewed(rig)).toEqual(expect.objectContaining({ pinned: true, keeping: 'pinned' }))
    await rig.controller.setPinned(key, true)
    await rig.controller.setPinned(key, false)
    expect(mostRecent(rig)).toEqual(
      expect.objectContaining({ pinned: false, keeping: 'not-pinned' }),
    )
    expect(fake.calls).toEqual(['notice', 'notice'])
  })
})

// @test-link [[rule_session_comment]]
// @test-link [[module_kept_session_changes]]
describe('session controller: the comment', () => {
  it('is trimmed and saved as a change; an unchanged one saves nothing; an emptied one removes it', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake)
    const { key } = reviewed(rig)

    await rig.controller.setComment(key, '  \n Slower next time. \n\n')
    expect(reviewed(rig).comment).toBe('Slower next time.')
    await rig.controller.setComment(key, 'Slower next time.')
    await rig.controller.setComment(key, '   ')
    expect(mostRecent(rig).comment).toBe('')
    expect(fake.calls).toEqual(['notice', 'notice'])
  })

  it('throws on a comment over 500 characters', async () => {
    const rig = await afterSession(fakeKept())

    await expect(async () =>
      rig.controller.setComment(reviewed(rig).key, 'x'.repeat(501)),
    ).rejects.toThrow(/at most 500/)
  })
})

// @test-link [[rule_outdated_tab_stops_saving]]
// @test-link [[module_kept_session_changes]]
describe('session controller: changes while saving is off', () => {
  it('hold in memory for the visit, and nothing is saved', async () => {
    const fake = fakeKept(true)
    const rig = await afterSession(fake)
    const { key } = reviewed(rig)

    await rig.controller.setFavorite(key, 1, true)
    await rig.controller.setPinned(key, false)
    await rig.controller.setComment(key, 'Mine.')

    expect(reviewed(rig)).toEqual(
      expect.objectContaining({
        favorites: [1],
        pinned: false,
        comment: 'Mine.',
        keeping: 'not-saved',
      }),
    )
    expect(fake.calls).toEqual([])
    expect(rig.sessionSaves).toHaveLength(1)
    await expect(async () => rig.controller.deleteSession(key)).rejects.toThrow(/saving is off/)
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_failed_save_never_disturbs_session]]
describe('session controller: a session whose own save was refused', () => {
  it('a favorite retries its own save with the facts held then; once saved, the keep line is pinned', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake, [REFUSED])
    const { key } = reviewed(rig)
    expect(reviewed(rig).keeping).toBe('not-saved')

    await rig.controller.setComment(key, 'Before.')
    expect(rig.sessionSaves).toHaveLength(2)
    expect(reviewed(rig).keeping).toBe('not-pinned')
    expect(savedSummary(rig, 1)).toEqual(
      expect.objectContaining({ comment: 'Before.', pinned: false, favoritesCount: 0 }),
    )
    expect(fake.calls).toEqual([])

    await rig.controller.setFavorite(key, 2, true)
    expect(fake.calls).toEqual(['notice'])
    expect(rig.sessionSaves).toHaveLength(2)
  })

  it('a pin retries it too, the keep line taking the pinned wording; a failed retry changes nothing shown', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake, [REFUSED, REFUSED])
    const { key } = reviewed(rig)

    await rig.controller.setPinned(key, true)
    expect(rig.sessionSaves).toHaveLength(2)
    expect(reviewed(rig)).toEqual(expect.objectContaining({ pinned: true, keeping: 'not-saved' }))

    await rig.controller.setFavorite(key, 1, true)
    expect(rig.sessionSaves).toHaveLength(3)
    expect(savedSummary(rig, 2)).toEqual(
      expect.objectContaining({ pinned: true, favoritesCount: 1 }),
    )
    expect(reviewed(rig).keeping).toBe('pinned')
    expect(mostRecent(rig).keeping).toBe('pinned')
    expect(fake.calls).toEqual([])
  })

  it('a change made while the retry runs waits for it, then goes through the change path', async () => {
    const fake = fakeKept()
    let settle: (outcome: SessionSaveOutcome) => void = () => {}
    const held = (): Promise<SessionSaveOutcome> =>
      new Promise((resolve) => {
        settle = resolve
      })
    const rig = await afterSession(fake, [REFUSED, held])
    const { key } = reviewed(rig)

    const retried = rig.controller.setPinned(key, true)
    await flush()
    const after = rig.controller.setComment(key, 'During.')
    await flush()
    expect(fake.calls).toEqual([])
    settle({ status: 'saved' })
    await Promise.all([retried, after])

    expect(rig.sessionSaves).toHaveLength(2)
    expect(savedSummary(rig, 1)).toEqual(expect.objectContaining({ pinned: true, comment: '' }))
    expect(fake.calls).toEqual(['notice'])
    expect(reviewed(rig)).toEqual(
      expect.objectContaining({ keeping: 'pinned', comment: 'During.' }),
    )
  })
})

// @test-link [[req_kept_session_list]]
// @test-link [[module_kept_session_changes]]
describe('session controller: Delete session', () => {
  it('deletes it from the device, then from memory: no Review, no most recent session', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake)

    expect(await rig.controller.deleteSession(reviewed(rig).key)).toBe('deleted')

    expect(fake.calls).toEqual(['caller'])
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.mostRecent).toBeNull()
  })

  it('refused, leaves it as it was', async () => {
    const fake = fakeKept()
    fake.changeOutcome = () => Promise.resolve({ status: 'refused', kind: 'other' })
    const rig = await afterSession(fake)
    const review = reviewed(rig)

    expect(await rig.controller.deleteSession(review.key)).toBe('refused')

    expect(rig.controller.state.review).toBe(review)
    expect(mostRecent(rig).key).toBe(review.key)
  })

  it('of a session held in memory only because its save failed, deletes it from memory alone', async () => {
    const fake = fakeKept()
    const rig = await afterSession(fake, [REFUSED])

    expect(await rig.controller.deleteSession(reviewed(rig).key)).toBe('deleted')

    expect(fake.calls).toEqual([])
    expect(rig.sessionSaves).toHaveLength(1)
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.mostRecent).toBeNull()
  })
})
