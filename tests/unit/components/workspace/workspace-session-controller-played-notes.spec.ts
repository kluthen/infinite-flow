/**
 * The session controller's side of `Keep my played notes`: the setting, from the player's saved
 * choice, decides at a session's end whether its save keeps the played notes; turned on in the
 * Review of the session that just ended, it keeps that session's too; turned off with played
 * notes kept, it asks for the deletion, counted at the switch; one session's played notes, or
 * every kept one, are deleted after their save, from memory too once the device has. While saving
 * is off, the switch changes for the visit only. On the fake audio clock at 240 BPM from 5 s:
 * phrase 1 sounds from 6.1 s.
 */
import { describe, expect, it, vi } from 'vitest'

import type {
  KeptSessionsSeam,
  ReviewedSession,
  SessionReview,
} from '@/components/workspace/workspace-session-controller-types'
import { encodeKeptSession } from '@/storage/records/kept-session-record'
import type {
  KeptChangeOutcome,
  KeptChanges,
  KeptReadOutcome,
  KeptRefusal,
  SessionSaveOutcome,
} from '@/storage/save-policy'
import type { KeptSessionChanges } from '@/storage/settings-saver'
import type { StorageChange } from '@/storage/storage-port'

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
import { connectKeys, lift, press } from './session-controller-midi'

/** One change or read that reached the fake kept-session changes. */
interface KeptCall {
  readonly call: 'change' | 'read'
  readonly refusal: KeptRefusal
  readonly changes?: KeptChanges
}

/** Fake kept-session changes: each call logged and resolved as the test says. */
interface FakeKeptChanges {
  readonly changes: KeptSessionChanges
  readonly calls: KeptCall[]
  /** What the next changes resolve; `saved` by default. */
  changeOutcome: () => Promise<KeptChangeOutcome>
  /** What the next reads resolve; none kept by default. */
  readOutcome: () => Promise<KeptReadOutcome<number>>
}

/** Intent: kept-session changes that log every call and resolve what the test sets. */
function fakeKeptChanges(): FakeKeptChanges {
  const fake: FakeKeptChanges = {
    calls: [],
    changeOutcome: () => Promise.resolve({ status: 'saved' }),
    readOutcome: () => Promise.resolve({ status: 'read', value: 0 }),
    changes: {
      changeKept: (changes, refusal) => {
        fake.calls.push({ call: 'change', refusal, changes })
        return fake.changeOutcome()
      },
      readKept: (_read, refusal) => {
        fake.calls.push({ call: 'read', refusal })
        return fake.readOutcome() as Promise<KeptReadOutcome<never>>
      },
    },
  }
  return fake
}

/** Intent: a rig whose session was played with the keyboard, one note in phrase 1, then Stop. */
async function afterPlayedSession(
  options: ControllerRigOptions & { readonly played?: boolean } = {},
): Promise<ControllerRig> {
  const rig = controllerRig(undefined, undefined, options)
  await connectKeys(rig)
  rig.controller.start()
  await playTo(rig, 6.5)
  if (options.played !== false) {
    press(rig, 60)
    await playTo(rig, 6.75)
    lift(rig, 60)
  }
  await playTo(rig, 7)
  rig.controller.stop()
  await flush()
  return rig
}

/** Intent: the Review's session, which must exist. */
function reviewed(rig: ControllerRig): SessionReview {
  const review = rig.controller.state.review
  if (review === null) throw new Error('no Review exists')
  return review
}

/** Intent: the played notes the Review's session holds, phrase by phrase. */
function playedNoteCounts(session: ReviewedSession): number[] {
  return session.history.phrases().map((phrase) => phrase.playedNotes.length)
}

/** Intent: the batch the session's own save built, from no kept summary. */
function sessionBatch(rig: ControllerRig): readonly StorageChange[] {
  const changes = rig.sessionSaves[0]
  if (changes === undefined) throw new Error('no session save was asked for')
  return changes([])
}

/** Intent: the kept-session seam for a rig: saving on unless said, over `fake`. */
function seam(fake: FakeKeptChanges, savingOff = false): Partial<KeptSessionsSeam> {
  return { changes: fake.changes, savingOff: () => savingOff }
}

// @test-link [[rule_played_notes_kept_only_after_opt_in]]
// @test-link [[module_kept_session_changes]]
describe("session controller: a session's played notes kept by its save", () => {
  it('with Keep my played notes off, saves the session without them, held in memory for the Review', async () => {
    const rig = await afterPlayedSession({ keptSessions: seam(fakeKeptChanges()) })

    expect(rig.controller.state.keepPlayedNotes).toBe(false)
    expect(sessionBatch(rig).map((change) => change.store)).not.toContain('playedNotes')
    expect(reviewed(rig).playedNotesKept).toBe(false)
    expect(playedNoteCounts(reviewed(rig))).toEqual([1])
  })

  it('with it on, saves them with the session under the key its save minted', async () => {
    const rig = await afterPlayedSession({
      savedKeepPlayedNotes: true,
      keptSessions: seam(fakeKeptChanges()),
    })

    const session = reviewed(rig)
    expect(session.playedNotesKept).toBe(true)
    expect(sessionBatch(rig).map((change) => `${change.store} ${change.key}`)).toEqual([
      `sessionSummaries ${session.key}`,
      `sessionBodies ${session.key}`,
      `playedNotes ${session.key}`,
    ])
    expect(session.key).toMatch(/^session-\d+-\d+$/)
  })

  it('with it on but no note played, keeps none: a session without played notes has none to keep', async () => {
    const rig = await afterPlayedSession({
      played: false,
      savedKeepPlayedNotes: true,
      keptSessions: seam(fakeKeptChanges()),
    })

    expect(reviewed(rig).playedNotesKept).toBe(false)
    expect(sessionBatch(rig).map((change) => change.store)).not.toContain('playedNotes')
  })
})

// @test-link [[rule_played_notes_kept_only_after_opt_in]]
// @test-link [[module_kept_session_changes]]
describe('session controller: Keep my played notes turned on', () => {
  it("in the just-ended session's Review keeps that session's played notes too, as a change told by the notice row", async () => {
    const fake = fakeKeptChanges()
    const rig = await afterPlayedSession({ keptSessions: seam(fake) })

    expect(await rig.controller.setKeepPlayedNotes(true)).toEqual({ kind: 'done' })

    expect(rig.controller.state.keepPlayedNotes).toBe(true)
    expect(fake.calls.map(({ call, refusal }) => `${call} ${refusal}`)).toEqual(['change notice'])
    const session = reviewed(rig)
    expect(session.playedNotesKept).toBe(true)
    const recent = rig.controller.state.mostRecent
    expect(recent?.kind === 'held' && recent.session.history).toBe(session.history)
    expect(playedNoteCounts(session)).toEqual([1])
  })

  it('refused, stays kept in memory for the visit', async () => {
    const fake = fakeKeptChanges()
    fake.changeOutcome = () => Promise.resolve({ status: 'refused', kind: 'other' })
    const rig = await afterPlayedSession({ keptSessions: seam(fake) })

    await rig.controller.setKeepPlayedNotes(true)

    expect(reviewed(rig).playedNotesKept).toBe(true)
  })

  it('changes nothing stored for a session already kept with its notes, or without any', async () => {
    const fake = fakeKeptChanges()
    const rig = await afterPlayedSession({ played: false, keptSessions: seam(fake) })

    await rig.controller.setKeepPlayedNotes(true)

    expect(fake.calls).toEqual([])
    expect(reviewed(rig).playedNotesKept).toBe(false)
  })

  // @test-link [[module_kept_session_save]]
  it("made while the session's own save runs, still settles how the session is kept", async () => {
    const fake = fakeKeptChanges()
    let settle: (outcome: SessionSaveOutcome) => void = () => {
      throw new Error('the save was never asked for')
    }
    const rig = await afterPlayedSession({
      keptSessions: seam(fake),
      sessionSaveOutcome: () => new Promise((resolve) => (settle = resolve)),
    })
    await vi.waitFor(() => expect(rig.sessionSaves).toHaveLength(1))

    await rig.controller.setKeepPlayedNotes(true)
    settle({ status: 'refused', kind: 'other' })
    await flush()

    expect(reviewed(rig).keeping).toBe('not-saved')
    const recent = rig.controller.state.mostRecent
    expect(recent?.kind === 'held' && recent.session.keeping).toBe('not-saved')
  })
})

// @test-link [[rule_kept_played_notes_deletable]]
// @test-link [[module_kept_session_changes]]
describe('session controller: Keep my played notes turned off', () => {
  it('with played notes kept with some session, as read at the switch, asks for the deletion', async () => {
    const fake = fakeKeptChanges()
    fake.readOutcome = () => Promise.resolve({ status: 'read', value: 3 })
    const rig = await afterPlayedSession({ savedKeepPlayedNotes: true, keptSessions: seam(fake) })

    expect(await rig.controller.setKeepPlayedNotes(false)).toEqual({
      kind: 'confirm-deletion',
      sessionCount: 3,
    })
    expect(rig.controller.state.keepPlayedNotes).toBe(false)
    expect(fake.calls.map(({ call, refusal }) => `${call} ${refusal}`)).toEqual(['read notice'])
  })

  it('with none kept, or the read refused, asks nothing', async () => {
    const fake = fakeKeptChanges()
    const rig = await afterPlayedSession({ savedKeepPlayedNotes: true, keptSessions: seam(fake) })

    expect(await rig.controller.setKeepPlayedNotes(false)).toEqual({ kind: 'done' })
    await rig.controller.setKeepPlayedNotes(true)
    fake.readOutcome = () => Promise.resolve({ status: 'refused', kind: 'other' })
    expect(await rig.controller.setKeepPlayedNotes(false)).toEqual({ kind: 'done' })
  })
})

// @test-link [[rule_kept_played_notes_deletable]]
// @test-link [[module_kept_session_changes]]
describe("session controller: deleting a session's played notes", () => {
  it("deletes them, from memory too once the device has, the session's history kept otherwise", async () => {
    const fake = fakeKeptChanges()
    const rig = await afterPlayedSession({ savedKeepPlayedNotes: true, keptSessions: seam(fake) })
    const before = reviewed(rig)

    expect(await rig.controller.deletePlayedNotes()).toBe('deleted')

    expect(fake.calls.map(({ call, refusal }) => `${call} ${refusal}`)).toEqual(['change caller'])
    const after = reviewed(rig)
    expect(after.playedNotesKept).toBe(false)
    expect(playedNoteCounts(after)).toEqual([0])
    expect(after.history.phrases().map((phrase) => phrase.outcome)).toEqual(
      before.history.phrases().map((phrase) => phrase.outcome),
    )
    expect(after.key).toBe(before.key)
    expect(after.showing).toBe(true)
    const recent = rig.controller.state.mostRecent
    expect(recent?.kind === 'held' && recent.session.history).toBe(after.history)
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('refused, keeps them, in memory and as kept', async () => {
    const fake = fakeKeptChanges()
    fake.changeOutcome = () => Promise.resolve({ status: 'refused', kind: 'other' })
    const rig = await afterPlayedSession({ savedKeepPlayedNotes: true, keptSessions: seam(fake) })
    const before = reviewed(rig)

    expect(await rig.controller.deletePlayedNotes()).toBe('refused')

    expect(reviewed(rig)).toBe(before)
  })

  it('is out of turn with no kept played notes in the Review: it throws', async () => {
    const rig = await afterPlayedSession({ keptSessions: seam(fakeKeptChanges()) })

    await expect(rig.controller.deletePlayedNotes()).rejects.toThrow(/no kept played notes/)
  })
})

// @test-link [[rule_kept_played_notes_deletable]]
// @test-link [[module_kept_session_changes]]
describe('session controller: deleting every kept played note', () => {
  it('deletes them across sessions, and from memory those of the session that kept them', async () => {
    const fake = fakeKeptChanges()
    const rig = await afterPlayedSession({ savedKeepPlayedNotes: true, keptSessions: seam(fake) })

    expect(await rig.controller.deleteEveryKeptPlayedNote()).toBe('deleted')

    expect(fake.calls.map(({ call, refusal }) => `${call} ${refusal}`)).toEqual(['change caller'])
    expect(reviewed(rig).playedNotesKept).toBe(false)
    expect(playedNoteCounts(reviewed(rig))).toEqual([0])
  })

  it('leaves in memory the played notes of a session that did not keep them', async () => {
    const rig = await afterPlayedSession({ keptSessions: seam(fakeKeptChanges()) })

    await rig.controller.deleteEveryKeptPlayedNote()

    expect(playedNoteCounts(reviewed(rig))).toEqual([1])
  })
})

// @test-link [[rule_outdated_tab_stops_saving]]
// @test-link [[module_kept_session_changes]]
describe('session controller: Keep my played notes while saving is off', () => {
  it('changes for the visit only: nothing is read, written or deleted, nothing asked', async () => {
    const fake = fakeKeptChanges()
    fake.readOutcome = () => Promise.resolve({ status: 'read', value: 2 })
    const rig = await afterPlayedSession({
      savedKeepPlayedNotes: true,
      keptSessions: seam(fake, true),
    })

    expect(reviewed(rig).playedNotesKept).toBe(false)
    expect(await rig.controller.setKeepPlayedNotes(false)).toEqual({ kind: 'done' })
    expect(await rig.controller.setKeepPlayedNotes(true)).toEqual({ kind: 'done' })
    expect(rig.controller.state.keepPlayedNotes).toBe(true)
    expect(fake.calls).toEqual([])
    await expect(rig.controller.deleteEveryKeptPlayedNote()).rejects.toThrow(/saving is off/)
  })
})

// @test-link [[rule_played_notes_kept_only_after_opt_in]]
describe('session controller: a kept session read back', () => {
  it('holds whether its played notes were kept, from its summary', async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const records = encodeKeptSession(
      history,
      { pinned: false, favorites: [], comment: '', playedNotesKept: true },
      APP_VERSION,
    )
    const rig = controllerRig(undefined, undefined, {
      keptSessions: {
        summaries: [{ key: 'session-5-5', value: structuredClone(records.summary) }],
        read: () => Promise.resolve(storedRecords(records)),
      },
    })

    expect(await rig.controller.showReview()).toBe('shown')

    expect(reviewed(rig).playedNotesKept).toBe(true)
    expect(reviewed(rig).key).toBe('session-5-5')
  })
})
