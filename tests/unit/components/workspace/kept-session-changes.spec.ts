// @vitest-environment node
/**
 * The changes to kept sessions after their save, over a real save policy and port on an in-memory
 * IndexedDB: keeping one session's played notes, deleting them, deleting every kept played note,
 * and counting the sessions whose played notes are kept, each read at the change.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  countSessionsWithKeptPlayedNotes,
  deleteEveryKeptPlayedNote,
  deleteSessionPlayedNotes,
  keepSessionPlayedNotes,
} from '@/components/workspace/kept-session-changes'
import { keptSessionKey } from '@/components/workspace/workspace-session-save'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import type { SessionHistory } from '@/session/session-history'
import { APP_VERSION } from '@/storage/app-version'
import { encodeKeptSession, type KeptSessionFacts } from '@/storage/records/kept-session-record'
import { createSavePolicy, type SavePolicy } from '@/storage/save-policy'
import { createVisitSaves, type VisitSaves } from '@/storage/settings-saver'
import type { StorageChange, StoragePort } from '@/storage/storage-port'

import { recordedKeptSession } from '../../storage/kept-session-fixtures'
import { readyPort, recordFailures, refusingPort } from '../../storage/save-policy-doubles'
import { freshFactory, sampleRecord } from '../../storage/storage-test-doubles'

/** The key a second kept session is stored under, apart from the first's. */
const OTHER_KEY = 'session-2-2'

/** The key a third kept session is stored under. */
const THIRD_KEY = 'session-3-3'

/** The facts of a pinned session with a comment and a favorite. */
const FACTS: KeptSessionFacts = {
  pinned: true,
  favorites: [2],
  comment: 'Steady.',
  playedNotesKept: true,
  presets: BUILT_IN_PRESETS,
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

afterEach(() => {
  vi.restoreAllMocks()
})

// @test-link [[module_kept_session_changes]]
// @test-link [[rule_played_notes_kept_only_after_opt_in]]
describe("keeping a session's played notes after its save", () => {
  it('writes its played-notes record and its summary saying so, in one batch', async () => {
    const port = await readyPort(freshFactory())
    const history = recordedKeptSession('bb-tenor', 2)
    const key = keptSessionKey(history)
    await port.apply(keptRecords(history, { ...FACTS, playedNotesKept: false }))
    const rig = rigOver(port)

    expect(await keepSessionPlayedNotes(rig.saves, key, history)).toEqual({ status: 'saved' })

    expect(rig.batches()).toBe(1)
    const kept = keptRecords(history, FACTS)
    expect(await port.read('playedNotes', key)).toEqual(
      kept[2]!.kind === 'write' && kept[2]!.record,
    )
    expect(await summaryOf(port, key)).toEqual(
      expect.objectContaining({ playedNotesKept: true, pinned: true, comment: 'Steady.' }),
    )
  })

  it('writes nothing and recreates nothing for a session no longer stored', async () => {
    const rig = rigOver(await readyPort(freshFactory()))
    const history = recordedKeptSession('bb-tenor', 2)

    expect(await keepSessionPlayedNotes(rig.saves, keptSessionKey(history), history)).toEqual({
      status: 'unchanged',
    })
    expect(rig.batches()).toBe(0)
    expect(await rig.port.readKeys('playedNotes')).toEqual([])
  })
})

// @test-link [[module_kept_session_changes]]
// @test-link [[rule_kept_played_notes_deletable]]
describe("deleting one session's played notes", () => {
  it('deletes its played notes and nothing else, its summary saying so in the same batch', async () => {
    const port = await readyPort(freshFactory())
    const history = recordedKeptSession('bb-tenor', 2)
    const other = recordedKeptSession('eb-alto', 2)
    const key = keptSessionKey(history)
    await port.apply([...keptRecords(history, FACTS), ...keptRecords(other, FACTS, OTHER_KEY)])
    await port.write('settings', 'theme', sampleRecord('Dark'))
    const before = await stored(port)
    const rig = rigOver(port)

    expect(await deleteSessionPlayedNotes(rig.saves, key)).toEqual({ status: 'saved' })

    expect(rig.batches()).toBe(1)
    const after = await stored(port)
    expect(after.settings).toEqual(before.settings)
    expect(after.sessionBodies).toEqual(before.sessionBodies)
    expect(await port.readKeys('playedNotes')).toEqual([OTHER_KEY])
    const notKept = encodeKeptSession(history, { ...FACTS, playedNotesKept: false }, APP_VERSION)
    expect(await summaryOf(port, key)).toEqual(notKept.summary)
  })

  it('keeps what another tab changed since the load: a session pinned meanwhile stays pinned', async () => {
    const port = await readyPort(freshFactory())
    const history = recordedKeptSession('bb-tenor', 2)
    const key = keptSessionKey(history)
    await port.apply(keptRecords(history, { ...FACTS, pinned: false }))
    const rig = rigOver(port)
    await port.write('sessionSummaries', key, {
      ...(await summaryOf(port, key)),
      pinned: true,
    } as never)

    await deleteSessionPlayedNotes(rig.saves, key)

    expect(await summaryOf(port, key)).toEqual(
      expect.objectContaining({ pinned: true, playedNotesKept: false }),
    )
  })

  it('writes nothing and recreates nothing for a session another tab deleted', async () => {
    const rig = rigOver(await readyPort(freshFactory()))

    expect(await deleteSessionPlayedNotes(rig.saves, 'session-1-1')).toEqual({
      status: 'unchanged',
    })
    expect(rig.batches()).toBe(0)
    expect(await stored(rig.port)).toEqual(
      expect.objectContaining({ sessionSummaries: [], playedNotes: [] }),
    )
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('refused, leaves both records as they were and tells only its caller', async () => {
    const real = await readyPort(freshFactory())
    const history = recordedKeptSession('bb-tenor', 2)
    const key = keptSessionKey(history)
    await real.apply(keptRecords(history, FACTS))
    const before = await stored(real)
    const { port, refuse } = refusingPort(real)
    const rig = rigOver(port, real)
    const failures = recordFailures(rig.policy)
    refuse('other')

    expect(await deleteSessionPlayedNotes(rig.saves, key)).toEqual({
      status: 'refused',
      kind: 'other',
    })
    expect(await stored(real)).toEqual(before)
    expect(failures).toEqual([])
  })
})

// @test-link [[module_kept_session_changes]]
// @test-link [[rule_kept_played_notes_deletable]]
describe('deleting every kept played note', () => {
  it("deletes every played-notes record, an unreadable session's and one stored since the load included, in one batch, and nothing else", async () => {
    const port = await readyPort(freshFactory())
    const first = recordedKeptSession('bb-tenor', 2)
    const second = recordedKeptSession('eb-alto', 3)
    const without = recordedKeptSession('c-keyboard', 2)
    await port.apply([
      ...keptRecords(first, FACTS),
      ...keptRecords(without, { ...FACTS, playedNotesKept: false }, THIRD_KEY),
    ])
    await port.write('settings', 'theme', sampleRecord('Dark'))
    const rig = rigOver(port)
    // Since the load: another tab kept a second session's notes, and a damaged session is stored.
    await port.apply(keptRecords(second, FACTS, OTHER_KEY))
    const unreadable = { dataVersion: 1, appVersion: APP_VERSION, startedAt: 'not a time' }
    await port.apply([
      { kind: 'write', store: 'sessionSummaries', key: 'session-1-1', record: unreadable },
      { kind: 'write', store: 'sessionBodies', key: 'session-1-1', record: sampleRecord('body') },
      { kind: 'write', store: 'playedNotes', key: 'session-1-1', record: sampleRecord([60]) },
    ])
    const before = await stored(port)
    const batches = rig.batches()

    expect(await deleteEveryKeptPlayedNote(rig.saves)).toEqual({ status: 'saved' })

    expect(rig.batches() - batches).toBe(1)
    const after = await stored(port)
    expect(after.playedNotes).toEqual([])
    expect(after.settings).toEqual(before.settings)
    expect(after.sessionBodies).toEqual(before.sessionBodies)
    expect(await port.read('sessionSummaries', 'session-1-1')).toEqual(unreadable)
    for (const key of [keptSessionKey(first), OTHER_KEY, THIRD_KEY]) {
      const summary = await summaryOf(port, key)
      expect(summary).toEqual(
        expect.objectContaining({ playedNotesKept: false, pinned: true, comment: 'Steady.' }),
      )
    }
  })

  it('with none stored, writes nothing', async () => {
    const rig = rigOver(await readyPort(freshFactory()))

    expect(await deleteEveryKeptPlayedNote(rig.saves)).toEqual({ status: 'unchanged' })
    expect(rig.batches()).toBe(0)
  })
})

// @test-link [[module_kept_session_changes]]
// @test-link [[rule_kept_played_notes_deletable]]
describe('the sessions whose played notes are kept, counted at the switch', () => {
  it('are every stored played-notes record, whichever tab kept it', async () => {
    const port = await readyPort(freshFactory())
    const rig = rigOver(port)
    expect(await countSessionsWithKeptPlayedNotes(rig.saves)).toEqual({ status: 'read', value: 0 })

    await port.apply([
      ...keptRecords(recordedKeptSession('bb-tenor', 2), FACTS),
      ...keptRecords(recordedKeptSession('eb-alto', 2), FACTS, OTHER_KEY),
    ])

    expect(await countSessionsWithKeptPlayedNotes(rig.saves)).toEqual({ status: 'read', value: 2 })
  })
})
