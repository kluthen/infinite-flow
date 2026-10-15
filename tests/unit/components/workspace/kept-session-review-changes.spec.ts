// @vitest-environment node
/**
 * The changes a Review makes to a kept session after its save, over a real save policy and port on
 * an in-memory IndexedDB: a favorite mark, a pin or unpin, the comment and Delete session, each
 * read at the change and applied as one batch, only the player's change applied to what is stored.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  changeKeptComment,
  changeKeptFavorite,
  changeKeptPinned,
  deleteKeptSession,
} from '@/components/workspace/kept-session-review-changes'
import { keptSessionKey } from '@/components/workspace/workspace-session-save'
import type { SessionHistory } from '@/session/session-history'
import { APP_VERSION } from '@/storage/app-version'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSessionFacts,
} from '@/storage/records/kept-session-record'
import { createSavePolicy, type SavePolicy } from '@/storage/save-policy'
import { createVisitSaves, type VisitSaves } from '@/storage/settings-saver'
import type { StorageChange, StoragePort } from '@/storage/storage-port'

import { recordedKeptSession } from '../../storage/kept-session-fixtures'
import { readyPort, recordFailures, refusingPort } from '../../storage/save-policy-doubles'
import { freshFactory, sampleRecord } from '../../storage/storage-test-doubles'

/** The key a second kept session is stored under, apart from the first's. */
const OTHER_KEY = 'session-2-2'

/** The facts a session is first saved with: nothing pinned, chosen or commented. */
const FRESH: KeptSessionFacts = {
  pinned: false,
  favorites: [],
  comment: '',
  playedNotesKept: true,
}

/** Intent: the batch that stores `history` kept with `facts`, under its key or `key`. */
function keptRecords(
  history: SessionHistory,
  facts: KeptSessionFacts,
  key = keptSessionKey(history),
): StorageChange[] {
  const records = encodeKeptSession(history, facts, APP_VERSION)
  const changes: StorageChange[] = [
    { kind: 'write', store: 'sessionSummaries', key, record: records.summary },
    { kind: 'write', store: 'sessionBodies', key, record: records.body },
  ]
  if (records.playedNotes !== null) {
    changes.push({ kind: 'write', store: 'playedNotes', key, record: records.playedNotes })
  }
  return changes
}

/** A real policy and port, the visit's saves over them, and the port's batches counted. */
interface Rig {
  readonly port: StoragePort
  readonly policy: SavePolicy
  readonly saves: VisitSaves
  readonly batches: () => number
}

/** Intent: a rig over `port` with its batches counted from now on. */
function rigOver(port: StoragePort, real: StoragePort = port): Rig {
  const policy = createSavePolicy(port)
  const apply = vi.spyOn(port, 'apply')
  return {
    port: real,
    policy,
    saves: createVisitSaves(Promise.resolve(policy), APP_VERSION),
    batches: () => apply.mock.calls.length,
  }
}

/** Intent: what every store holds now, by store, each entry as `key` with its value. */
async function stored(port: StoragePort): Promise<Record<string, unknown>> {
  const stores = ['settings', 'sessionSummaries', 'sessionBodies', 'playedNotes'] as const
  const entries = await Promise.all(stores.map((store) => port.readKeyed(store)))
  return Object.fromEntries(stores.map((store, index) => [store, entries[index]]))
}

/** Intent: the session-wide record stored under `key`, as a plain object. */
async function summaryOf(port: StoragePort, key: string): Promise<Record<string, unknown>> {
  return (await port.read('sessionSummaries', key)) as Record<string, unknown>
}

/** Intent: a rig whose port stores `history` kept with `facts`, and a second session too. */
async function keptRig(
  history: SessionHistory,
  facts: KeptSessionFacts,
): Promise<Rig & { readonly key: string }> {
  const port = await readyPort(freshFactory())
  const other = recordedKeptSession('eb-alto', 2)
  await port.apply([...keptRecords(history, facts), ...keptRecords(other, FRESH, OTHER_KEY)])
  await port.write('settings', 'theme', sampleRecord('Dark'))
  return { ...rigOver(port), key: keptSessionKey(history) }
}

afterEach(() => {
  vi.restoreAllMocks()
})

// @test-link [[module_kept_session_changes]]
// @test-link [[req_favorite_phrases]]
// @test-link [[rule_favorite_pins_session]]
describe('a favorite marked or unmarked after the save', () => {
  it('marking rewrites the body and pins the session with its count, in one batch, and nothing else', async () => {
    const history = recordedKeptSession('bb-tenor', 3)
    const rig = await keptRig(history, FRESH)
    const before = await stored(rig.port)

    expect(await changeKeptFavorite(rig.saves, rig.key, 2, true)).toEqual({ status: 'saved' })

    expect(rig.batches()).toBe(1)
    const marked = encodeKeptSession(
      history,
      { ...FRESH, pinned: true, favorites: [2] },
      APP_VERSION,
    )
    expect(await rig.port.read('sessionBodies', rig.key)).toEqual(marked.body)
    expect(await summaryOf(rig.port, rig.key)).toEqual(marked.summary)
    const after = await stored(rig.port)
    expect(after.settings).toEqual(before.settings)
    expect(after.playedNotes).toEqual(before.playedNotes)
    const reading = decodeKeptSession({
      summary: await rig.port.read('sessionSummaries', rig.key),
      body: await rig.port.read('sessionBodies', rig.key),
      playedNotes: await rig.port.read('playedNotes', rig.key),
    })
    expect(reading.reading).toBe('current')
  })

  it('removing the last favorite leaves the session pinned, its count at zero', async () => {
    const history = recordedKeptSession('bb-tenor', 3)
    const rig = await keptRig(history, { ...FRESH, pinned: true, favorites: [3] })

    await changeKeptFavorite(rig.saves, rig.key, 3, false)

    expect(await summaryOf(rig.port, rig.key)).toEqual(
      expect.objectContaining({ pinned: true, favoritesCount: 0 }),
    )
  })

  it('keeps the marks and facts another tab stored since the load', async () => {
    const history = recordedKeptSession('bb-tenor', 3)
    const rig = await keptRig(history, FRESH)
    // Another tab marked phrase 1 and commented, after the load.
    await rig.port.apply(
      keptRecords(history, { ...FRESH, pinned: true, favorites: [1], comment: 'Theirs.' }),
    )

    await changeKeptFavorite(rig.saves, rig.key, 3, true)

    const both = encodeKeptSession(
      history,
      { ...FRESH, pinned: true, favorites: [1, 3], comment: 'Theirs.' },
      APP_VERSION,
    )
    expect(await rig.port.read('sessionBodies', rig.key)).toEqual(both.body)
    expect(await summaryOf(rig.port, rig.key)).toEqual(both.summary)
  })

  it('writes nothing and recreates nothing for a session another tab deleted', async () => {
    const rig = rigOver(await readyPort(freshFactory()))

    expect(await changeKeptFavorite(rig.saves, 'session-1-1', 1, true)).toEqual({
      status: 'unchanged',
    })
    expect(rig.batches()).toBe(0)
    expect(await stored(rig.port)).toEqual(
      expect.objectContaining({ sessionSummaries: [], sessionBodies: [] }),
    )
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('refused, leaves every record as it was and is told to the notice row', async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const real = await readyPort(freshFactory())
    await real.apply(keptRecords(history, FRESH))
    const before = await stored(real)
    const { port, refuse } = refusingPort(real)
    const rig = rigOver(port, real)
    const failures = recordFailures(rig.policy)
    refuse('quota')

    expect(await changeKeptFavorite(rig.saves, keptSessionKey(history), 1, true)).toEqual({
      status: 'refused',
      kind: 'quota',
    })
    expect(await stored(real)).toEqual(before)
    expect(failures).toEqual(['quota'])
  })
})

// @test-link [[module_kept_session_changes]]
// @test-link [[rule_pinned_session_kept]]
describe('a pin or unpin after the save', () => {
  it('rewrites the session-wide record only, keeping what another tab changed', async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const rig = await keptRig(history, { ...FRESH, pinned: true, favorites: [1] })
    const before = await stored(rig.port)
    await rig.port.write('sessionSummaries', rig.key, {
      ...(await summaryOf(rig.port, rig.key)),
      comment: 'Theirs.',
    } as never)

    expect(await changeKeptPinned(rig.saves, rig.key, false)).toEqual({ status: 'saved' })

    expect(rig.batches()).toBe(1)
    expect(await summaryOf(rig.port, rig.key)).toEqual(
      expect.objectContaining({ pinned: false, favoritesCount: 1, comment: 'Theirs.' }),
    )
    const after = await stored(rig.port)
    expect(after.sessionBodies).toEqual(before.sessionBodies)
    expect(after.playedNotes).toEqual(before.playedNotes)
  })
})

// @test-link [[module_kept_session_changes]]
// @test-link [[rule_session_comment]]
describe('the comment after the save', () => {
  it('rewrites the session-wide record with it, and removes it when empty', async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const rig = await keptRig(history, FRESH)

    await changeKeptComment(rig.saves, rig.key, 'Slower next time.')
    expect(await summaryOf(rig.port, rig.key)).toEqual(
      expect.objectContaining({ comment: 'Slower next time.', pinned: false }),
    )

    await changeKeptComment(rig.saves, rig.key, '')
    expect(await summaryOf(rig.port, rig.key)).toEqual(expect.objectContaining({ comment: '' }))
    expect(rig.batches()).toBe(2)
  })
})

// @test-link [[module_kept_session_changes]]
// @test-link [[req_kept_session_list]]
describe('Delete session', () => {
  it("deletes the session's summary, body and played notes in one batch, and nothing else", async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const rig = await keptRig(history, { ...FRESH, pinned: true, favorites: [1] })
    const before = await stored(rig.port)

    expect(await deleteKeptSession(rig.saves, rig.key)).toEqual({ status: 'saved' })

    expect(rig.batches()).toBe(1)
    const after = await stored(rig.port)
    expect(after.settings).toEqual(before.settings)
    expect(await rig.port.readKeys('sessionSummaries')).toEqual([OTHER_KEY])
    expect(await rig.port.readKeys('sessionBodies')).toEqual([OTHER_KEY])
    expect(await rig.port.readKeys('playedNotes')).toEqual([OTHER_KEY])
  })

  it('writes nothing for a session no longer stored, or whose summary cannot be read', async () => {
    const rig = rigOver(await readyPort(freshFactory()))
    expect(await deleteKeptSession(rig.saves, 'session-1-1')).toEqual({ status: 'unchanged' })

    const unreadable = { dataVersion: 1, appVersion: APP_VERSION, startedAt: 'not a time' }
    await rig.port.write('sessionSummaries', 'session-1-1', unreadable as never)
    expect(await deleteKeptSession(rig.saves, 'session-1-1')).toEqual({ status: 'unchanged' })
    expect(rig.batches()).toBe(0)
  })

  it('refused, deletes nothing and tells only its caller', async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const real = await readyPort(freshFactory())
    await real.apply(keptRecords(history, FRESH))
    const before = await stored(real)
    const { port, refuse } = refusingPort(real)
    const rig = rigOver(port, real)
    const failures = recordFailures(rig.policy)
    refuse('other')

    expect(await deleteKeptSession(rig.saves, keptSessionKey(history))).toEqual({
      status: 'refused',
      kind: 'other',
    })
    expect(await stored(real)).toEqual(before)
    expect(failures).toEqual([])
  })
})
